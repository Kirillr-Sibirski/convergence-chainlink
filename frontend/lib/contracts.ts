export const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000" as const;

export const CONTRACTS = {
  ORACLE_ADDRESS: "0x42c71270f53c7f2b4d9d363b033ed7738e8e860d" as const,
  PREDICTION_MARKET_ADDRESS: "0x3669e53c53b6209603e80ef02c96e7e95005376f" as const,
  FACTORY_ADDRESS: "0x9a59cd89c00dfeb2b6641dbb894e240521dd069d" as const,
  AEEIA_TOKEN_ADDRESS: "0xb38f8a149f95850cb5eff5fce5621d36b8f8bbd0" as const,
  STAKING_ADDRESS: "0x4434f99f7655f94705217601706536bd94273c2f" as const,
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
    inputs: [{ internalType: "uint256", name: "requestId", type: "uint256" }],
    name: "getValidationResult",
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
      { internalType: "uint256", name: "initialLiquidityYes", type: "uint256" },
      { internalType: "uint256", name: "initialLiquidityNo", type: "uint256" },
      { internalType: "uint256", name: "worldRoot", type: "uint256" },
      { internalType: "uint256", name: "worldNullifierHash", type: "uint256" },
      { internalType: "uint256[8]", name: "worldProof", type: "uint256[8]" },
    ],
    name: "createMarketVerified",
    outputs: [{ internalType: "uint256", name: "marketId", type: "uint256" }],
    stateMutability: "payable",
    type: "function",
  },
  {
    inputs: [
      { internalType: "string", name: "question", type: "string" },
      { internalType: "uint256", name: "deadline", type: "uint256" },
    ],
    name: "requestMarketCreation",
    outputs: [{ internalType: "uint256", name: "requestId", type: "uint256" }],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      { internalType: "uint256", name: "requestId", type: "uint256" },
      { internalType: "uint256", name: "initialLiquidityYes", type: "uint256" },
      { internalType: "uint256", name: "initialLiquidityNo", type: "uint256" },
      { internalType: "uint256", name: "worldRoot", type: "uint256" },
      { internalType: "uint256", name: "worldNullifierHash", type: "uint256" },
      { internalType: "uint256[8]", name: "worldProof", type: "uint256[8]" },
    ],
    name: "finalizeMarketCreation",
    outputs: [{ internalType: "uint256", name: "marketId", type: "uint256" }],
    stateMutability: "payable",
    type: "function",
  },
  {
    inputs: [
      { internalType: "string", name: "question", type: "string" },
      { internalType: "uint256", name: "deadline", type: "uint256" },
      { internalType: "uint256", name: "initialLiquidityYes", type: "uint256" },
      { internalType: "uint256", name: "initialLiquidityNo", type: "uint256" },
    ],
    name: "createMarket",
    outputs: [{ internalType: "uint256", name: "marketId", type: "uint256" }],
    stateMutability: "payable",
    type: "function",
  },
  {
    inputs: [{ internalType: "uint256", name: "marketId", type: "uint256" }],
    name: "mintTokens",
    outputs: [],
    stateMutability: "payable",
    type: "function",
  },
  {
    inputs: [{ internalType: "uint256", name: "marketId", type: "uint256" }],
    name: "provideLiquidity",
    outputs: [{ internalType: "uint256", name: "lpTokens", type: "uint256" }],
    stateMutability: "payable",
    type: "function",
  },
  {
    inputs: [
      { internalType: "uint256", name: "marketId", type: "uint256" },
      { internalType: "bool", name: "buyYes", type: "bool" },
      { internalType: "uint256", name: "minSwapOut", type: "uint256" },
    ],
    name: "buyOutcomeWithEth",
    outputs: [{ internalType: "uint256", name: "tokensOut", type: "uint256" }],
    stateMutability: "payable",
    type: "function",
  },
  {
    inputs: [{ internalType: "uint256", name: "marketId", type: "uint256" }],
    name: "settleMarket",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ internalType: "uint256", name: "marketId", type: "uint256" }],
    name: "redeemTokens",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [],
    name: "creationRequestCount",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    name: "creationRequests",
    outputs: [
      { internalType: "uint256", name: "id", type: "uint256" },
      { internalType: "address", name: "requester", type: "address" },
      { internalType: "string", name: "question", type: "string" },
      { internalType: "uint256", name: "deadline", type: "uint256" },
      { internalType: "uint256", name: "oracleValidationRequestId", type: "uint256" },
      { internalType: "bool", name: "finalized", type: "bool" },
      { internalType: "uint256", name: "createdAt", type: "uint256" },
    ],
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
      { internalType: "address", name: "yesToken", type: "address" },
      { internalType: "address", name: "noToken", type: "address" },
      { internalType: "address", name: "pool", type: "address" },
      { internalType: "uint256", name: "totalStaked", type: "uint256" },
      { internalType: "bool", name: "settled", type: "bool" },
      { internalType: "bool", name: "outcome", type: "bool" },
      { internalType: "uint256", name: "createdAt", type: "uint256" },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ internalType: "uint256", name: "marketId", type: "uint256" }],
    name: "getMarketPrices",
    outputs: [
      { internalType: "uint256", name: "yesPrice", type: "uint256" },
      { internalType: "uint256", name: "noPrice", type: "uint256" },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      { internalType: "uint256", name: "marketId", type: "uint256" },
      { internalType: "address", name: "user", type: "address" },
    ],
    name: "getUserBalances",
    outputs: [
      { internalType: "uint256", name: "yesBalance", type: "uint256" },
      { internalType: "uint256", name: "noBalance", type: "uint256" },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      { internalType: "uint256", name: "marketId", type: "uint256" },
      { internalType: "address", name: "user", type: "address" },
    ],
    name: "getRedemptionInfo",
    outputs: [
      { internalType: "bool", name: "canRedeem", type: "bool" },
      { internalType: "uint256", name: "potentialPayout", type: "uint256" },
    ],
    stateMutability: "view",
    type: "function",
  },
] as const;

export const STAKING_ABI = [
  {
    inputs: [],
    name: "poolCount",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    name: "pools",
    outputs: [
      { internalType: "address", name: "stakingToken", type: "address" },
      { internalType: "string", name: "label", type: "string" },
      { internalType: "uint256", name: "marketId", type: "uint256" },
      { internalType: "bool", name: "isYes", type: "bool" },
      { internalType: "uint256", name: "totalStaked", type: "uint256" },
      { internalType: "uint256", name: "accRewardPerShare", type: "uint256" },
      { internalType: "uint256", name: "lastRewardTime", type: "uint256" },
      { internalType: "uint256", name: "rewardRate", type: "uint256" },
      { internalType: "uint256", name: "periodFinish", type: "uint256" },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      { internalType: "uint256", name: "poolId", type: "uint256" },
      { internalType: "address", name: "user", type: "address" },
    ],
    name: "userStaked",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      { internalType: "uint256", name: "poolId", type: "uint256" },
      { internalType: "address", name: "user", type: "address" },
    ],
    name: "pendingRewards",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      { internalType: "uint256", name: "poolId", type: "uint256" },
      { internalType: "uint256", name: "amount", type: "uint256" },
    ],
    name: "stake",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      { internalType: "uint256", name: "poolId", type: "uint256" },
      { internalType: "uint256", name: "amount", type: "uint256" },
    ],
    name: "withdraw",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ internalType: "uint256", name: "poolId", type: "uint256" }],
    name: "claim",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
] as const;

export const POOL_ABI = [
  {
    inputs: [],
    name: "InsufficientLiquidity",
    type: "error",
  },
  {
    inputs: [],
    name: "InsufficientAmount",
    type: "error",
  },
  {
    inputs: [],
    name: "InsufficientOutputAmount",
    type: "error",
  },
  {
    inputs: [],
    name: "InvalidK",
    type: "error",
  },
  {
    inputs: [
      { internalType: "uint256", name: "amountYes", type: "uint256" },
      { internalType: "uint256", name: "amountNo", type: "uint256" },
    ],
    name: "addLiquidity",
    outputs: [{ internalType: "uint256", name: "liquidity", type: "uint256" }],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ internalType: "uint256", name: "liquidity", type: "uint256" }],
    name: "removeLiquidity",
    outputs: [
      { internalType: "uint256", name: "amountYes", type: "uint256" },
      { internalType: "uint256", name: "amountNo", type: "uint256" },
    ],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      { internalType: "bool", name: "buyYes", type: "bool" },
      { internalType: "uint256", name: "amountIn", type: "uint256" },
      { internalType: "uint256", name: "minAmountOut", type: "uint256" },
    ],
    name: "swap",
    outputs: [{ internalType: "uint256", name: "amountOut", type: "uint256" }],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      { internalType: "bool", name: "buyYes", type: "bool" },
      { internalType: "uint256", name: "amountIn", type: "uint256" },
    ],
    name: "getAmountOut",
    outputs: [{ internalType: "uint256", name: "amountOut", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "reserveYes",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "reserveNo",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
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
    name: "totalSupply",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
] as const;
