// @ts-nocheck
import fs from "node:fs";
import path from "node:path";
import solc from "solc";
import {
  createPublicClient,
  createWalletClient,
  defineChain,
  http,
  type Address,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";

type SolcInput = {
  language: "Solidity";
  sources: Record<string, { content: string }>;
  settings: {
    optimizer: { enabled: boolean; runs: number };
    outputSelection: Record<string, Record<string, string[]>>;
  };
};

type SolcOutput = {
  errors?: Array<{ severity: string; formattedMessage: string }>;
  contracts: Record<
    string,
    Record<string, { abi: any[]; evm: { bytecode: { object: string } } }>
  >;
};

const ROOT = path.resolve(__dirname, "../..");
const CONTRACTS_DIR = path.join(ROOT, "contracts");
const OZ_DIR = path.join(ROOT, "lib/openzeppelin-contracts/contracts");
const DEPLOYMENTS_DIR = path.join(CONTRACTS_DIR, "deployments");

function loadEnvFile(filePath: string) {
  if (!fs.existsSync(filePath)) return;
  const raw = fs.readFileSync(filePath, "utf8");
  for (const line of raw.split("\n")) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const idx = t.indexOf("=");
    if (idx < 0) continue;
    const key = t.slice(0, idx).trim();
    const value = t.slice(idx + 1).trim();
    if (!process.env[key]) process.env[key] = value;
  }
}

function listSolFiles(dir: string): string[] {
  const out: string[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      out.push(...listSolFiles(full));
    } else if (entry.isFile() && entry.name.endsWith(".sol")) {
      out.push(full);
    }
  }
  return out;
}

function buildSources(): Record<string, { content: string }> {
  const sources: Record<string, { content: string }> = {};

  for (const file of listSolFiles(CONTRACTS_DIR)) {
    if (file.includes(`${path.sep}script${path.sep}`) || file.includes(`${path.sep}test${path.sep}`)) {
      continue;
    }
    const key = path.relative(ROOT, file).replaceAll(path.sep, "/");
    sources[key] = { content: fs.readFileSync(file, "utf8") };
  }

  for (const file of listSolFiles(OZ_DIR)) {
    const rel = path.relative(OZ_DIR, file).replaceAll(path.sep, "/");
    const key = `@openzeppelin/contracts/${rel}`;
    sources[key] = { content: fs.readFileSync(file, "utf8") };
  }

  return sources;
}

function compile() {
  const input: SolcInput = {
    language: "Solidity",
    sources: buildSources(),
    settings: {
      optimizer: { enabled: true, runs: 200 },
      outputSelection: {
        "*": {
          "*": ["abi", "evm.bytecode.object"],
        },
      },
    },
  };

  const output = JSON.parse(solc.compile(JSON.stringify(input))) as SolcOutput;
  const errors = output.errors ?? [];
  const fatal = errors.filter((e) => e.severity === "error");
  for (const err of errors) {
    console.log(err.formattedMessage);
  }
  if (fatal.length > 0) {
    throw new Error("Solidity compilation failed");
  }
  return output.contracts;
}

function artifact(
  contracts: SolcOutput["contracts"],
  file: string,
  name: string
): { abi: any[]; bytecode: `0x${string}` } {
  const f = contracts[file];
  if (!f || !f[name]) throw new Error(`Missing artifact: ${file}:${name}`);
  const abi = f[name].abi;
  const bytecode = `0x${f[name].evm.bytecode.object}` as `0x${string}`;
  if (bytecode === "0x") throw new Error(`Empty bytecode: ${file}:${name}`);
  return { abi, bytecode };
}

async function deployContract(
  wallet: ReturnType<typeof createWalletClient>,
  pub: ReturnType<typeof createPublicClient>,
  abi: any[],
  bytecode: `0x${string}`,
  args: any[] = []
): Promise<Address> {
  const hash = await wallet.deployContract({ abi, bytecode, args });
  const rcpt = await pub.waitForTransactionReceipt({ hash });
  if (!rcpt.contractAddress) throw new Error(`No contractAddress in receipt ${hash}`);
  return rcpt.contractAddress;
}

function writeJson(fileName: string, data: Record<string, string>) {
  fs.mkdirSync(DEPLOYMENTS_DIR, { recursive: true });
  fs.writeFileSync(path.join(DEPLOYMENTS_DIR, fileName), `${JSON.stringify(data, null, 2)}\n`);
}

function replaceAddress(content: string, key: string, value: string): string {
  const quoted = new RegExp(`(${key}:\\s*\")0x[a-fA-F0-9]{40}(\"\\s*as\\s*const)`);
  const zeroAlias = new RegExp(`(${key}:\\s*)ZERO_ADDRESS`);
  return content.replace(quoted, `$1${value}$2`).replace(zeroAlias, `$1\"${value}\" as const`);
}

function updateFrontendAddresses(
  oracle: Address,
  market: Address,
  factory: Address,
  token: Address,
  staking: Address
) {
  const file = path.join(ROOT, "frontend/lib/contracts.ts");
  let content = fs.readFileSync(file, "utf8");
  content = replaceAddress(content, "ORACLE_ADDRESS", oracle);
  content = replaceAddress(content, "PREDICTION_MARKET_ADDRESS", market);
  content = replaceAddress(content, "FACTORY_ADDRESS", factory);
  content = replaceAddress(content, "AEEIA_TOKEN_ADDRESS", token);
  content = replaceAddress(content, "STAKING_ADDRESS", staking);
  fs.writeFileSync(file, content);
}

function updateCreOracleAddress(oracle: Address) {
  const file = path.join(ROOT, "cre-workflow/config.json");
  const cfg = JSON.parse(fs.readFileSync(file, "utf8"));
  cfg.oracleAddress = oracle;
  fs.writeFileSync(file, `${JSON.stringify(cfg, null, 2)}\n`);
}

async function main() {
  loadEnvFile(path.join(ROOT, ".env"));
  loadEnvFile(path.join(CONTRACTS_DIR, ".env"));

  const pk = process.env.PRIVATE_KEY ?? process.env.DEPLOYER_PRIVATE_KEY;
  const rpcUrl = process.env.RPC_URL ?? "https://ethereum-sepolia-rpc.publicnode.com";
  const forwarder = (process.env.FORWARDER_ADDRESS ??
    "0x2000f57be293734aeD2Ca9d629080A21E782FCAb") as Address;

  if (!pk) throw new Error("Missing PRIVATE_KEY (or DEPLOYER_PRIVATE_KEY) in env");
  const normalizedPk = pk.startsWith("0x") ? pk : `0x${pk}`;
  if (normalizedPk.length !== 66) throw new Error("PRIVATE_KEY must be 32-byte hex");

  const chain = defineChain({
    id: 11155111,
    name: "Sepolia",
    network: "sepolia",
    nativeCurrency: { name: "Sepolia ETH", symbol: "ETH", decimals: 18 },
    rpcUrls: { default: { http: [rpcUrl] } },
  });

  const account = privateKeyToAccount(normalizedPk as `0x${string}`);
  const wallet = createWalletClient({ account, chain, transport: http(rpcUrl) });
  const pub = createPublicClient({ chain, transport: http(rpcUrl) });

  console.log(`Deployer: ${account.address}`);
  console.log(`RPC: ${rpcUrl}`);
  console.log(`Forwarder: ${forwarder}`);

  const contracts = compile();

  const eotFactoryArt = artifact(contracts, "contracts/EOTFactory.sol", "EOTFactory");
  const oracleArt = artifact(contracts, "contracts/AletheiaOracle.sol", "AletheiaOracle");
  const marketArt = artifact(contracts, "contracts/AletheiaMarket.sol", "AletheiaMarket");
  const tokenArt = artifact(contracts, "contracts/AEEIAToken.sol", "AEEIAToken");
  const stakingArt = artifact(contracts, "contracts/OutcomeStaking.sol", "OutcomeStaking");

  console.log("Deploying EOTFactory...");
  const factory = await deployContract(wallet, pub, eotFactoryArt.abi, eotFactoryArt.bytecode);
  console.log(`EOTFactory: ${factory}`);

  console.log("Deploying AletheiaOracle...");
  const oracle = await deployContract(wallet, pub, oracleArt.abi, oracleArt.bytecode, [forwarder]);
  console.log(`AletheiaOracle: ${oracle}`);

  console.log("Deploying AletheiaMarket...");
  const market = await deployContract(wallet, pub, marketArt.abi, marketArt.bytecode, [oracle, factory]);
  console.log(`AletheiaMarket: ${market}`);

  console.log("Wiring oracle -> market callback...");
  const wireHash = await wallet.writeContract({
    address: oracle,
    abi: oracleArt.abi,
    functionName: "setPredictionMarket",
    args: [market],
  });
  await pub.waitForTransactionReceipt({ hash: wireHash });

  console.log("Deploying AEEIAToken...");
  const token = await deployContract(wallet, pub, tokenArt.abi, tokenArt.bytecode);
  console.log(`AEEIAToken: ${token}`);

  console.log("Deploying OutcomeStaking...");
  const staking = await deployContract(wallet, pub, stakingArt.abi, stakingArt.bytecode, [token]);
  console.log(`OutcomeStaking: ${staking}`);

  writeJson("sepolia-factory.json", {
    factory,
    network: "sepolia",
    deployer: account.address,
  });
  writeJson("sepolia-oracle.json", {
    oracle,
    forwarder,
    network: "sepolia",
  });
  writeJson("sepolia-market.json", {
    market,
    oracle,
    factory,
    network: "sepolia",
  });
  writeJson("sepolia-staking.json", {
    aeeiaToken: token,
    staking,
    network: "sepolia",
  });

  updateFrontendAddresses(oracle, market, factory, token, staking);
  updateCreOracleAddress(oracle);

  console.log("\n=== DEPLOYMENT COMPLETE ===");
  console.log(`Factory: ${factory}`);
  console.log(`Oracle: ${oracle}`);
  console.log(`Market: ${market}`);
  console.log(`AEEIA Token: ${token}`);
  console.log(`Staking: ${staking}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
