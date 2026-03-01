// Smart contract addresses and ABIs for AEEIA Prediction Markets

export const CONTRACTS = {
  // Sepolia testnet
  ORACLE_ADDRESS: "0xb13623f2AfB38b849d3a111ebdF08e135Ae8315e" as const,
  PREDICTION_MARKET_ADDRESS: "" as const, // TODO: Deploy DemoPredictionMarket
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
