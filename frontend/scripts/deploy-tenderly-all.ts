import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import {
  createPublicClient,
  createWalletClient,
  defineChain,
  getAddress,
  http,
  parseUnits,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";

type Artifact = {
  abi: readonly unknown[];
  bytecode: { object: string };
};

type EnvMap = Record<string, string>;

function readEnvFile(envPath: string): EnvMap {
  const raw = readFileSync(envPath, "utf-8");
  const env: EnvMap = {};
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const idx = trimmed.indexOf("=");
    if (idx <= 0) continue;
    const key = trimmed.slice(0, idx).trim();
    const value = trimmed.slice(idx + 1).trim();
    env[key] = value;
  }
  return env;
}

function loadArtifact(path: string): Artifact {
  return JSON.parse(readFileSync(path, "utf-8")) as Artifact;
}

function ensureHexBytecode(bytecode: string): `0x${string}` {
  if (!bytecode || bytecode === "0x") {
    throw new Error("Empty bytecode in artifact.");
  }
  return (bytecode.startsWith("0x") ? bytecode : `0x${bytecode}`) as `0x${string}`;
}

function normalizeAddress(value: string, label: string): `0x${string}` {
  if (!value) throw new Error(`Missing ${label}`);
  try {
    return getAddress(value as `0x${string}`);
  } catch {
    throw new Error(`Invalid ${label}: ${value}`);
  }
}

function getArg(name: string): string | undefined {
  const idx = process.argv.findIndex((arg) => arg === name);
  if (idx === -1) return undefined;
  return process.argv[idx + 1];
}

async function main() {
  const repoRoot = resolve(__dirname, "../..");
  const contractsDir = join(repoRoot, "contracts");
  const envPath = join(contractsDir, ".env");
  const env = readEnvFile(envPath);

  const rpcUrl =
    getArg("--rpc-url") ??
    process.env.RPC_URL ??
    "https://virtual.mainnet.eu.rpc.tenderly.co/7ab2ac7f-6262-4a2d-9271-11cb2f95b651";
  const chainId = Number.parseInt(getArg("--chain-id") ?? "9993", 10);
  const networkName = getArg("--network-name") ?? "Tenderly Virtual TestNet";
  const existingCollateralArg = getArg("--collateral-token");
  const disableSafetyArg = (getArg("--disable-safety-for-testing") ?? "").trim().toLowerCase();

  const privateKey = (env.PRIVATE_KEY || process.env.PRIVATE_KEY || "").trim();
  const forwarderAddress = normalizeAddress(
    (env.FORWARDER_ADDRESS || process.env.FORWARDER_ADDRESS || "").trim(),
    "FORWARDER_ADDRESS"
  );
  const worldIdRouterAddress = normalizeAddress(
    (env.WORLD_ID_ROUTER_ADDRESS || process.env.WORLD_ID_ROUTER_ADDRESS || "").trim(),
    "WORLD_ID_ROUTER_ADDRESS"
  );
  const worldIdAppId = (env.WORLD_ID_APP_ID || process.env.WORLD_ID_APP_ID || "").trim();
  const worldIdAction = (env.WORLD_ID_ACTION || process.env.WORLD_ID_ACTION || "create-new-market").trim();
  const existingCollateralEnv = (env.COLLATERAL_TOKEN_ADDRESS || process.env.COLLATERAL_TOKEN_ADDRESS || "").trim();
  const existingCollateralTokenRaw = (existingCollateralArg || existingCollateralEnv || "").trim();
  const disableSafetyForTesting =
    disableSafetyArg === "1" ||
    disableSafetyArg === "true" ||
    (process.env.DISABLE_SAFETY_FOR_TESTING || "").trim().toLowerCase() === "true";

  if (!privateKey || !privateKey.startsWith("0x")) {
    throw new Error("Missing PRIVATE_KEY in contracts/.env");
  }
  if (!worldIdAppId) {
    throw new Error("Missing WORLD_ID_APP_ID in contracts/.env");
  }

  const chain = defineChain({
    id: chainId,
    name: networkName,
    nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
    rpcUrls: {
      default: { http: [rpcUrl] },
      public: { http: [rpcUrl] },
    },
  });

  const account = privateKeyToAccount(privateKey as `0x${string}`);
  const publicClient = createPublicClient({ chain, transport: http(rpcUrl) });
  const walletClient = createWalletClient({ chain, account, transport: http(rpcUrl) });

  const mockUsdcArtifact = loadArtifact(join(contractsDir, "out/MockUSDC.sol/MockUSDC.json"));
  const oracleArtifact = loadArtifact(join(contractsDir, "out/AletheiaOracle.sol/AletheiaOracle.json"));
  const marketArtifact = loadArtifact(join(contractsDir, "out/AletheiaMarket.sol/AletheiaMarket.json"));

  console.log(`Deployer: ${account.address}`);
  console.log(`RPC: ${rpcUrl}`);
  console.log(`Chain ID: ${chainId}`);
  let collateralTokenAddress: `0x${string}`;
  let mockUsdcHash: `0x${string}` | null = null;
  let mintHash: `0x${string}` | null = null;

  if (existingCollateralTokenRaw) {
    collateralTokenAddress = normalizeAddress(existingCollateralTokenRaw, "COLLATERAL_TOKEN_ADDRESS");
    console.log(`Using existing collateral token: ${collateralTokenAddress}`);
  } else {
    console.log("Deploying MockUSDC...");
    mockUsdcHash = await walletClient.deployContract({
      abi: mockUsdcArtifact.abi as any,
      bytecode: ensureHexBytecode(mockUsdcArtifact.bytecode.object),
      args: [account.address],
    });
    const mockUsdcReceipt = await publicClient.waitForTransactionReceipt({ hash: mockUsdcHash });
    collateralTokenAddress = mockUsdcReceipt.contractAddress as `0x${string}`;
    if (!collateralTokenAddress) throw new Error("MockUSDC deployment missing contractAddress");
    console.log(`MockUSDC: ${collateralTokenAddress}`);

    console.log("Minting MockUSDC to deployer...");
    mintHash = await walletClient.writeContract({
      address: collateralTokenAddress,
      abi: mockUsdcArtifact.abi as any,
      functionName: "mint",
      args: [account.address, parseUnits("1000000", 18)],
    });
    await publicClient.waitForTransactionReceipt({ hash: mintHash });
  }

  console.log("Deploying AletheiaOracle...");
  const oracleHash = await walletClient.deployContract({
    abi: oracleArtifact.abi as any,
    bytecode: ensureHexBytecode(oracleArtifact.bytecode.object),
    args: [forwarderAddress],
  });
  const oracleReceipt = await publicClient.waitForTransactionReceipt({ hash: oracleHash });
  const oracleAddress = oracleReceipt.contractAddress as `0x${string}`;
  if (!oracleAddress) throw new Error("Oracle deployment missing contractAddress");
  console.log(`Oracle: ${oracleAddress}`);

  console.log("Deploying AletheiaMarket...");
  const marketHash = await walletClient.deployContract({
    abi: marketArtifact.abi as any,
    bytecode: ensureHexBytecode(marketArtifact.bytecode.object),
    args: [oracleAddress, collateralTokenAddress, worldIdRouterAddress, worldIdAppId, worldIdAction],
  });
  const marketReceipt = await publicClient.waitForTransactionReceipt({ hash: marketHash });
  const marketAddress = marketReceipt.contractAddress as `0x${string}`;
  if (!marketAddress) throw new Error("Market deployment missing contractAddress");
  console.log(`Market: ${marketAddress}`);

  let disableCooldownHash: `0x${string}` | null = null;
  let disableNullifierUniquenessHash: `0x${string}` | null = null;
  if (disableSafetyForTesting) {
    console.log("Disabling market creation cooldown for testing...");
    disableCooldownHash = await walletClient.writeContract({
      address: marketAddress,
      abi: marketArtifact.abi as any,
      functionName: "setDailyMarketCreationLimitEnabled",
      args: [false],
    });
    await publicClient.waitForTransactionReceipt({ hash: disableCooldownHash });

    console.log("Disabling World ID nullifier uniqueness for testing...");
    disableNullifierUniquenessHash = await walletClient.writeContract({
      address: marketAddress,
      abi: marketArtifact.abi as any,
      functionName: "setWorldIdNullifierUniquenessEnabled",
      args: [false],
    });
    await publicClient.waitForTransactionReceipt({ hash: disableNullifierUniquenessHash });
  } else {
    console.log("Enabling 24h market-creation cooldown...");
    disableCooldownHash = await walletClient.writeContract({
      address: marketAddress,
      abi: marketArtifact.abi as any,
      functionName: "setDailyMarketCreationLimitEnabled",
      args: [true],
    });
    await publicClient.waitForTransactionReceipt({ hash: disableCooldownHash });
    console.log("Safety checks enabled (24h limit + World ID nullifier uniqueness).");
  }

  console.log("Wiring oracle.setPredictionMarket...");
  const setMarketHash = await walletClient.writeContract({
    address: oracleAddress,
    abi: oracleArtifact.abi as any,
    functionName: "setPredictionMarket",
    args: [marketAddress],
  });
  await publicClient.waitForTransactionReceipt({ hash: setMarketHash });

  const deployment = {
    network: networkName,
    chainId,
    rpcUrl,
    deployer: account.address,
    forwarderAddress,
    worldIdRouterAddress,
    worldIdAppId,
    worldIdAction,
    oracleAddress,
    predictionMarketAddress: marketAddress,
    collateralTokenAddress,
    txs: {
      mockUsdcDeploy: mockUsdcHash,
      mockUsdcMint: mintHash,
      oracleDeploy: oracleHash,
      marketDeploy: marketHash,
      disableCooldown: disableCooldownHash,
      disableWorldIdNullifierUniqueness: disableNullifierUniquenessHash,
      wirePredictionMarket: setMarketHash,
    },
    deployedAt: new Date().toISOString(),
  };

  const outPath = join(contractsDir, "deployments", `tenderly-${chainId}.json`);
  mkdirSync(dirname(outPath), { recursive: true });
  writeFileSync(outPath, `${JSON.stringify(deployment, null, 2)}\n`, "utf-8");
  console.log(`Saved deployment file: ${outPath}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
