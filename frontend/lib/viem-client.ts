import { createPublicClient, createWalletClient, http, custom } from 'viem';
import { sepolia } from 'viem/chains';

// Public client for reading contract data (no auth needed)
export const publicClient = createPublicClient({
  chain: sepolia,
  transport: http('https://ethereum-sepolia-rpc.publicnode.com'),
});

// Get wallet client from browser wallet (MetaMask, etc)
export function getWalletClient() {
  if (typeof window === 'undefined' || !window.ethereum) {
    throw new Error('No wallet detected. Please install MetaMask or another Web3 wallet.');
  }

  return createWalletClient({
    chain: sepolia,
    transport: custom(window.ethereum),
  });
}

// Contract addresses
export const CONTRACTS = {
  ORACLE: '0xe7A47740Ff60146f9E3C443bf84Bd5b6d03530a4' as `0x${string}`,
  PREDICTION_MARKET: '0xf2DA89D632f9E28aF45f4F584Fb9b59F3041a10E' as `0x${string}`,
  FACTORY: '0x7e3419E3b14436336F41daFc7Fe35A822cdc78AF' as `0x${string}`,
};
