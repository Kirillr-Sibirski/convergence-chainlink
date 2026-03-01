// Smart contract addresses and ABIs for AEEIA Prediction Markets

export const CONTRACTS = {
  // Sepolia testnet - Updated March 1, 2026
  ORACLE_ADDRESS: "0xe7A47740Ff60146f9E3C443bf84Bd5b6d03530a4" as const,
  PREDICTION_MARKET_ADDRESS: "0xf2DA89D632f9E28aF45f4F584Fb9b59F3041a10E" as const,
  FACTORY_ADDRESS: "0x7e3419E3b14436336F41daFc7Fe35A822cdc78AF" as const,
  CHAIN_ID: 11155111, // Sepolia
} as const;

// AletheiaOracle ABI
export const ORACLE_ABI = [
  {
    inputs: [],
    stateMutability: "nonpayable",
    type: "constructor",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "uint256",
        name: "marketId",
        type: "uint256",
      },
      {
        indexed: false,
        internalType: "string",
        name: "question",
        type: "string",
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "deadline",
        type: "uint256",
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "createdAt",
        type: "uint256",
      },
    ],
    name: "MarketCreated",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "uint256",
        name: "marketId",
        type: "uint256",
      },
      {
        indexed: false,
        internalType: "bool",
        name: "outcome",
        type: "bool",
      },
      {
        indexed: false,
        internalType: "uint8",
        name: "confidence",
        type: "uint8",
      },
      {
        indexed: false,
        internalType: "bytes32",
        name: "proofHash",
        type: "bytes32",
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "resolvedAt",
        type: "uint256",
      },
    ],
    name: "MarketResolved",
    type: "event",
  },
  {
    inputs: [
      {
        internalType: "string",
        name: "question",
        type: "string",
      },
      {
        internalType: "uint256",
        name: "deadline",
        type: "uint256",
      },
    ],
    name: "createMarket",
    outputs: [
      {
        internalType: "uint256",
        name: "marketId",
        type: "uint256",
      },
    ],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [],
    name: "marketCount",
    outputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
    ],
    name: "markets",
    outputs: [
      {
        internalType: "uint256",
        name: "id",
        type: "uint256",
      },
      {
        internalType: "string",
        name: "question",
        type: "string",
      },
      {
        internalType: "uint256",
        name: "deadline",
        type: "uint256",
      },
      {
        internalType: "bool",
        name: "resolved",
        type: "bool",
      },
      {
        internalType: "bool",
        name: "outcome",
        type: "bool",
      },
      {
        internalType: "uint8",
        name: "confidence",
        type: "uint8",
      },
      {
        internalType: "bytes32",
        name: "proofHash",
        type: "bytes32",
      },
      {
        internalType: "uint256",
        name: "createdAt",
        type: "uint256",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "uint256",
        name: "marketId",
        type: "uint256",
      },
      {
        internalType: "bool",
        name: "outcome",
        type: "bool",
      },
      {
        internalType: "uint8",
        name: "confidence",
        type: "uint8",
      },
      {
        internalType: "bytes32",
        name: "proofHash",
        type: "bytes32",
      },
    ],
    name: "resolveMarket",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
] as const;

// DemoPredictionMarket ABI
export const PREDICTION_MARKET_ABI = [
  {
    inputs: [{ internalType: "address", name: "_oracleAddress", type: "address" }],
    stateMutability: "nonpayable",
    type: "constructor",
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
  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: "uint256", name: "marketId", type: "uint256" },
      { indexed: false, internalType: "bool", name: "outcome", type: "bool" },
      { indexed: false, internalType: "uint8", name: "confidence", type: "uint8" },
      { indexed: false, internalType: "uint256", name: "totalYesStake", type: "uint256" },
      { indexed: false, internalType: "uint256", name: "totalNoStake", type: "uint256" },
    ],
    name: "MarketSettled",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: "uint256", name: "marketId", type: "uint256" },
      { indexed: true, internalType: "address", name: "user", type: "address" },
      { indexed: false, internalType: "bool", name: "prediction", type: "bool" },
      { indexed: false, internalType: "uint256", name: "amount", type: "uint256" },
    ],
    name: "StakePlaced",
    type: "event",
  },
  {
    inputs: [
      { internalType: "string", name: "question", type: "string" },
      { internalType: "uint256", name: "deadline", type: "uint256" },
    ],
    name: "createMarket",
    outputs: [{ internalType: "uint256", name: "marketId", type: "uint256" }],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      { internalType: "uint256", name: "marketId", type: "uint256" },
      { internalType: "bool", name: "predictYes", type: "bool" },
    ],
    name: "stake",
    outputs: [],
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
    name: "claimWinnings",
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
    name: "predictionMarkets",
    outputs: [
      { internalType: "uint256", name: "oracleMarketId", type: "uint256" },
      { internalType: "string", name: "question", type: "string" },
      { internalType: "uint256", name: "deadline", type: "uint256" },
      { internalType: "uint256", name: "totalYesStake", type: "uint256" },
      { internalType: "uint256", name: "totalNoStake", type: "uint256" },
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
    name: "getUserStakes",
    outputs: [
      { internalType: "uint256", name: "yesStake", type: "uint256" },
      { internalType: "uint256", name: "noStake", type: "uint256" },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      { internalType: "uint256", name: "marketId", type: "uint256" },
      { internalType: "address", name: "user", type: "address" },
    ],
    name: "calculatePotentialPayout",
    outputs: [
      { internalType: "uint256", name: "yesPayout", type: "uint256" },
      { internalType: "uint256", name: "noPayout", type: "uint256" },
    ],
    stateMutability: "view",
    type: "function",
  },
] as const;
