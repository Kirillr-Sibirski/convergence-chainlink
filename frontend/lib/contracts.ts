export const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000" as const;

export const CONTRACTS = {
  ORACLE_ADDRESS: "0x7c15bd1d23630f413afbae8d5f88ea1088013bb5" as const,
  PREDICTION_MARKET_ADDRESS: "0xaacd1daf9b23cef8d37a769c5cf258aafcc13f40" as const,
  FACTORY_ADDRESS: ZERO_ADDRESS,
  AEEIA_TOKEN_ADDRESS: ZERO_ADDRESS,
  STAKING_ADDRESS: ZERO_ADDRESS,
  CHAIN_ID: 11155111,
} as const;

export const ORACLE_ABI = [
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
    inputs: [
      { internalType: "string", name: "question", type: "string" },
      { internalType: "uint256", name: "deadline", type: "uint256" },
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
    ],
    name: "placeBet",
    outputs: [],
    stateMutability: "payable",
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
] as const;
