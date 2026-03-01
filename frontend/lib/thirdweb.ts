import { createThirdwebClient } from "thirdweb";
import { sepolia } from "thirdweb/chains";

// Create thirdweb client (using a public client ID for now)
export const client = createThirdwebClient({
  clientId: process.env.NEXT_PUBLIC_THIRDWEB_CLIENT_ID || "your-client-id-here",
});

export const chain = sepolia;

export const CONTRACTS_CONFIG = {
  ORACLE_ADDRESS: "0xb13623f2AfB38b849d3a111ebdF08e135Ae8315e" as const,
  PREDICTION_MARKET_ADDRESS: "0x1318f4f86b878fa5263c2fbe48eb2405ea637fd4" as const,
  CHAIN_ID: 11155111,
} as const;
