// @ts-nocheck
import fs from "node:fs";
import path from "node:path";
import {
  createPublicClient,
  createWalletClient,
  defineChain,
  formatEther,
  http,
  parseEther,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";

const ROOT = path.resolve(__dirname, "../..");
const ENV_FILE = path.join(ROOT, "contracts/.env");

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

const STAKING_ABI = [
  {
    inputs: [],
    name: "poolCount",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      { internalType: "address", name: "stakingToken", type: "address" },
      { internalType: "string", name: "label", type: "string" },
      { internalType: "uint256", name: "marketId", type: "uint256" },
      { internalType: "bool", name: "isYes", type: "bool" },
    ],
    name: "createPool",
    outputs: [{ internalType: "uint256", name: "poolId", type: "uint256" }],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      { internalType: "uint256", name: "poolId", type: "uint256" },
      { internalType: "uint256", name: "amount", type: "uint256" },
      { internalType: "uint256", name: "duration", type: "uint256" },
    ],
    name: "notifyRewardAmount",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
] as const;

const AEEIA_ABI = [
  {
    inputs: [
      { internalType: "address", name: "to", type: "address" },
      { internalType: "uint256", name: "amount", type: "uint256" },
    ],
    name: "mint",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      { internalType: "address", name: "spender", type: "address" },
      { internalType: "uint256", name: "amount", type: "uint256" },
    ],
    name: "approve",
    outputs: [{ internalType: "bool", name: "", type: "bool" }],
    stateMutability: "nonpayable",
    type: "function",
  },
] as const;

async function main() {
  loadEnvFile(ENV_FILE);

  const privateKey = process.env.PRIVATE_KEY ?? process.env.DEPLOYER_PRIVATE_KEY;
  const rpcUrl = process.env.RPC_URL ?? "https://ethereum-sepolia-rpc.publicnode.com";
  if (!privateKey) throw new Error("Missing PRIVATE_KEY");

  const normalizedPk = privateKey.startsWith("0x") ? privateKey : `0x${privateKey}`;
  const account = privateKeyToAccount(normalizedPk as `0x${string}`);

  const chain = defineChain({
    id: 11155111,
    name: "Sepolia",
    network: "sepolia",
    nativeCurrency: { name: "Sepolia ETH", symbol: "ETH", decimals: 18 },
    rpcUrls: { default: { http: [rpcUrl] } },
  });

  const wallet = createWalletClient({ account, chain, transport: http(rpcUrl) });
  const pub = createPublicClient({ chain, transport: http(rpcUrl) });

  const staking = "0x4434f99f7655f94705217601706536bd94273c2f" as const;
  const aeeia = "0xb38f8a149f95850cb5eff5fce5621d36b8f8bbd0" as const;

  const before = (await pub.readContract({
    address: staking,
    abi: STAKING_ABI,
    functionName: "poolCount",
  })) as bigint;

  const label = "AEEIA Simple Pool";
  const createHash = await wallet.writeContract({
    address: staking,
    abi: STAKING_ABI,
    functionName: "createPool",
    args: [aeeia, label, BigInt(0), true],
  });
  await pub.waitForTransactionReceipt({ hash: createHash });

  const poolId = before + BigInt(1);

  // Optional rewards so UI APY isn't flat zero.
  const rewardAmount = parseEther("1000");
  const duration = BigInt(30 * 24 * 60 * 60);

  const mintHash = await wallet.writeContract({
    address: aeeia,
    abi: AEEIA_ABI,
    functionName: "mint",
    args: [account.address, rewardAmount],
  });
  await pub.waitForTransactionReceipt({ hash: mintHash });

  const approveHash = await wallet.writeContract({
    address: aeeia,
    abi: AEEIA_ABI,
    functionName: "approve",
    args: [staking, rewardAmount],
  });
  await pub.waitForTransactionReceipt({ hash: approveHash });

  const notifyHash = await wallet.writeContract({
    address: staking,
    abi: STAKING_ABI,
    functionName: "notifyRewardAmount",
    args: [poolId, rewardAmount, duration],
  });
  await pub.waitForTransactionReceipt({ hash: notifyHash });

  console.log("Created pool:", poolId.toString());
  console.log("Label:", label);
  console.log("Reward amount:", formatEther(rewardAmount), "AEEIA");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
