import { createPublicClient, createWalletClient, custom, defineChain, http } from "viem";
import { CONTRACTS } from "./contracts";

const RPC_URL =
  process.env.NEXT_PUBLIC_RPC_URL ||
  "https://virtual.mainnet.eu.rpc.tenderly.co/4dedea98-8407-4410-99fe-c06968afe6d1";
const EXPLORER_URL =
  process.env.NEXT_PUBLIC_BLOCK_EXPLORER_URL ||
  "https://dashboard.tenderly.co/";

export const chain = defineChain({
  id: CONTRACTS.CHAIN_ID,
  name: CONTRACTS.NETWORK_NAME,
  nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
  rpcUrls: {
    default: { http: [RPC_URL] },
    public: { http: [RPC_URL] },
  },
  blockExplorers: {
    default: {
      name: "Tenderly Explorer",
      url: EXPLORER_URL,
    },
  },
});

export const publicClient = createPublicClient({
  chain,
  transport: http(RPC_URL),
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

export async function ensureSupportedNetwork() {
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
          chainName: CONTRACTS.NETWORK_NAME,
          rpcUrls: [RPC_URL],
          nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
          blockExplorerUrls: [EXPLORER_URL],
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
