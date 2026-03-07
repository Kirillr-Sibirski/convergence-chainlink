function envAddress(name: string, fallback: `0x${string}`): `0x${string}` {
  const value = process.env[name]?.trim();
  if (value && /^0x[a-fA-F0-9]{40}$/.test(value)) {
    return value as `0x${string}`;
  }
  return fallback;
}

function envNumber(name: string, fallback: number): number {
  const raw = process.env[name];
  if (!raw) return fallback;
  const parsed = Number.parseInt(raw, 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export const CONTRACTS = {
  ORACLE_ADDRESS: envAddress("NEXT_PUBLIC_ORACLE_ADDRESS", "0x2b98834f00052759a65c0a113bf494c767d2bceb"),
  PREDICTION_MARKET_ADDRESS: envAddress(
    "NEXT_PUBLIC_PREDICTION_MARKET_ADDRESS",
    "0x330dce67febd8c7ee88fd5e203ef15d414f742f8"
  ),
  COLLATERAL_TOKEN_ADDRESS: envAddress(
    "NEXT_PUBLIC_COLLATERAL_TOKEN_ADDRESS",
    "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48"
  ),
  COLLATERAL_SYMBOL: process.env.NEXT_PUBLIC_COLLATERAL_SYMBOL?.trim() || "USDC",
  COLLATERAL_DECIMALS: envNumber("NEXT_PUBLIC_COLLATERAL_DECIMALS", 6),
  NETWORK_NAME: process.env.NEXT_PUBLIC_NETWORK_NAME?.trim() || "Tenderly Virtual TestNet",
  CHAIN_ID: envNumber("NEXT_PUBLIC_CHAIN_ID", 9993),
} as const;

export const ORACLE_ABI = [
  {
    inputs: [],
    name: "getPendingMarkets",
    outputs: [
      {
        components: [
          { internalType: "uint256", name: "id", type: "uint256" },
          { internalType: "string", name: "question", type: "string" },
          { internalType: "uint256", name: "deadline", type: "uint256" },
          { internalType: "bool", name: "resolved", type: "bool" },
        ],
        internalType: "struct AletheiaOracle.Market[]",
        name: "",
        type: "tuple[]",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ internalType: "bytes32", name: "questionDigest", type: "bytes32" }],
    name: "getQuestionValidation",
    outputs: [
      { internalType: "bool", name: "processed", type: "bool" },
      { internalType: "bool", name: "approved", type: "bool" },
      { internalType: "uint8", name: "score", type: "uint8" },
      { internalType: "bool", name: "legitimate", type: "bool" },
      { internalType: "bool", name: "clearTimeline", type: "bool" },
      { internalType: "bool", name: "resolvable", type: "bool" },
      { internalType: "bool", name: "binary", type: "bool" },
      { internalType: "bytes32", name: "proofHash", type: "bytes32" },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ internalType: "uint256", name: "marketId", type: "uint256" }],
    name: "getResolution",
    outputs: [
      { internalType: "bool", name: "resolved", type: "bool" },
      { internalType: "bool", name: "outcome", type: "bool" },
      { internalType: "uint8", name: "confidence", type: "uint8" },
      { internalType: "bytes32", name: "proofHash", type: "bytes32" },
    ],
    stateMutability: "view",
    type: "function",
  },
] as const;

export const ALETHEIA_MARKET_ABI = [
  {
    inputs: [],
    name: "InvalidNullifier",
    type: "error",
  },
  {
    inputs: [{ internalType: "uint256", name: "nextAllowedAt", type: "uint256" }],
    name: "MarketCreationCooldown",
    type: "error",
  },
  {
    inputs: [
      { internalType: "string", name: "question", type: "string" },
      { internalType: "uint256", name: "deadline", type: "uint256" },
      { internalType: "uint256", name: "root", type: "uint256" },
      { internalType: "uint256", name: "signalHash", type: "uint256" },
      { internalType: "uint256", name: "nullifierHash", type: "uint256" },
      { internalType: "uint256[8]", name: "proof", type: "uint256[8]" },
    ],
    name: "createMarketVerified",
    outputs: [{ internalType: "uint256", name: "marketId", type: "uint256" }],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ internalType: "uint256", name: "marketId", type: "uint256" }],
    name: "claimWinnings",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      { internalType: "uint256", name: "marketId", type: "uint256" },
      { internalType: "bool", name: "onYes", type: "bool" },
      { internalType: "uint256", name: "amount", type: "uint256" },
    ],
    name: "placeBet",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      { internalType: "uint256", name: "marketId", type: "uint256" },
      { internalType: "bool", name: "onYes", type: "bool" },
      { internalType: "uint256", name: "shareAmount", type: "uint256" },
    ],
    name: "sellShares",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [],
    name: "collateralToken",
    outputs: [{ internalType: "contract IERC20", name: "", type: "address" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "marketCount",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    name: "markets",
    outputs: [
      { internalType: "uint256", name: "oracleMarketId", type: "uint256" },
      { internalType: "string", name: "question", type: "string" },
      { internalType: "uint256", name: "deadline", type: "uint256" },
      { internalType: "uint256", name: "totalYes", type: "uint256" },
      { internalType: "uint256", name: "totalNo", type: "uint256" },
      { internalType: "bool", name: "settled", type: "bool" },
      { internalType: "bool", name: "outcome", type: "bool" },
      { internalType: "uint256", name: "createdAt", type: "uint256" },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      { internalType: "uint256", name: "marketId", type: "uint256" },
      { internalType: "address", name: "user", type: "address" },
    ],
    name: "getUserBet",
    outputs: [
      { internalType: "uint256", name: "yesAmount", type: "uint256" },
      { internalType: "uint256", name: "noAmount", type: "uint256" },
      { internalType: "bool", name: "claimed", type: "bool" },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ internalType: "uint256", name: "marketId", type: "uint256" }],
    name: "getMarketOdds",
    outputs: [
      { internalType: "uint256", name: "yesBps", type: "uint256" },
      { internalType: "uint256", name: "noBps", type: "uint256" },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      { internalType: "uint256", name: "marketId", type: "uint256" },
      { internalType: "address", name: "user", type: "address" },
    ],
    name: "getUserClaimablePayout",
    outputs: [
      { internalType: "bool", name: "canClaim", type: "bool" },
      { internalType: "uint256", name: "payout", type: "uint256" },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: "uint256", name: "marketId", type: "uint256" },
      { indexed: true, internalType: "address", name: "user", type: "address" },
      { indexed: false, internalType: "bool", name: "onYes", type: "bool" },
      { indexed: false, internalType: "uint256", name: "amount", type: "uint256" },
    ],
    name: "BetPlaced",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: "uint256", name: "marketId", type: "uint256" },
      { indexed: true, internalType: "address", name: "user", type: "address" },
      { indexed: false, internalType: "bool", name: "onYes", type: "bool" },
      { indexed: false, internalType: "uint256", name: "amount", type: "uint256" },
    ],
    name: "SharesSold",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: "uint256", name: "marketId", type: "uint256" },
      { indexed: true, internalType: "uint256", name: "oracleMarketId", type: "uint256" },
      { indexed: false, internalType: "string", name: "question", type: "string" },
      { indexed: false, internalType: "uint256", name: "deadline", type: "uint256" },
    ],
    name: "MarketCreated",
    type: "event",
  },
] as const;

export const ERC20_ABI = [
  {
    inputs: [
      { internalType: "address", name: "owner", type: "address" },
      { internalType: "address", name: "spender", type: "address" },
    ],
    name: "allowance",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
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
  {
    inputs: [{ internalType: "address", name: "account", type: "address" }],
    name: "balanceOf",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "decimals",
    outputs: [{ internalType: "uint8", name: "", type: "uint8" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "symbol",
    outputs: [{ internalType: "string", name: "", type: "string" }],
    stateMutability: "view",
    type: "function",
  },
] as const;
