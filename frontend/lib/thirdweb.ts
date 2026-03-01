import { createThirdwebClient } from "thirdweb";
import { sepolia } from "thirdweb/chains";

// Create thirdweb client (using a public client ID for now)
export const client = createThirdwebClient({
  clientId: process.env.NEXT_PUBLIC_THIRDWEB_CLIENT_ID || "your-client-id-here",
});

export const chain = sepolia;

export const CONTRACTS_CONFIG = {
  ORACLE_ADDRESS: "0xe7A47740Ff60146f9E3C443bf84Bd5b6d03530a4" as const,
  PREDICTION_MARKET_ADDRESS: "0xf2DA89D632f9E28aF45f4F584Fb9b59F3041a10E" as const,
  FACTORY_ADDRESS: "0x7e3419E3b14436336F41daFc7Fe35A822cdc78AF" as const,
  CHAIN_ID: 11155111,
} as const;
