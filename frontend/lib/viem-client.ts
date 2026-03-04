import { createPublicClient, createWalletClient, custom, http } from "viem";
import { sepolia } from "viem/chains";
import { CONTRACTS } from "./contracts";

export const chain = sepolia;
const SEPOLIA_RPC_URL = process.env.NEXT_PUBLIC_RPC_URL || "https://ethereum-sepolia-rpc.publicnode.com";

export const publicClient = createPublicClient({
  chain,
  transport: http(SEPOLIA_RPC_URL),
});

export function getWalletClient() {
  if (typeof window === "undefined" || !window.ethereum) {
    throw new Error("No wallet detected. Please install a wallet like MetaMask.");
  }

  return createWalletClient({
    chain,
    transport: custom(window.ethereum),
  });
}

export async function ensureSepoliaNetwork() {
  if (typeof window === "undefined" || !window.ethereum) return;

  const chainIdHex = `0x${CONTRACTS.CHAIN_ID.toString(16)}`;
  const currentChainId = (await window.ethereum.request({
    method: "eth_chainId",
  })) as string;

  if (currentChainId?.toLowerCase() === chainIdHex.toLowerCase()) {
    return;
  }

  try {
    await window.ethereum.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: chainIdHex }],
    });
  } catch (err: any) {
    if (err?.code !== 4902) throw err;

    await window.ethereum.request({
      method: "wallet_addEthereumChain",
      params: [
        {
          chainId: chainIdHex,
          chainName: "Sepolia",
          rpcUrls: [SEPOLIA_RPC_URL],
          nativeCurrency: { name: "Sepolia Ether", symbol: "SEP", decimals: 18 },
          blockExplorerUrls: ["https://sepolia.etherscan.io"],
        },
      ],
    });
  }
}

declare global {
  interface Window {
    ethereum?: {
      request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
      on: (event: string, cb: (...args: any[]) => void) => void;
      removeListener: (event: string, cb: (...args: any[]) => void) => void;
    };
  }
}
