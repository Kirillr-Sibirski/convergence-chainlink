// AletheiaOracle.sol ABI (CRE workflow-relevant subset)
export const AletheiaOracleABI = [
  {
    type: 'function',
    name: 'getPendingMarkets',
    inputs: [],
    outputs: [
      {
        name: 'pendingMarkets',
        type: 'tuple[]',
        internalType: 'struct AletheiaOracle.Market[]',
        components: [
          { name: 'id', type: 'uint256', internalType: 'uint256' },
          { name: 'question', type: 'string', internalType: 'string' },
          { name: 'deadline', type: 'uint256', internalType: 'uint256' },
          { name: 'resolved', type: 'bool', internalType: 'bool' },
          { name: 'outcome', type: 'bool', internalType: 'bool' },
          { name: 'confidence', type: 'uint8', internalType: 'uint8' },
          { name: 'proofHash', type: 'bytes32', internalType: 'bytes32' },
          { name: 'createdAt', type: 'uint256', internalType: 'uint256' },
        ],
      },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'getResolution',
    inputs: [{ name: 'marketId', type: 'uint256', internalType: 'uint256' }],
    outputs: [
      { name: 'resolved', type: 'bool', internalType: 'bool' },
      { name: 'outcome', type: 'bool', internalType: 'bool' },
      { name: 'confidence', type: 'uint8', internalType: 'uint8' },
      { name: 'proofHash', type: 'bytes32', internalType: 'bytes32' },
    ],
    stateMutability: 'view',
  },
  {
    type: 'event',
    name: 'MarketResolved',
    inputs: [
      { name: 'marketId', type: 'uint256', indexed: true, internalType: 'uint256' },
      { name: 'outcome', type: 'bool', indexed: false, internalType: 'bool' },
      { name: 'confidence', type: 'uint8', indexed: false, internalType: 'uint8' },
      { name: 'proofHash', type: 'bytes32', indexed: false, internalType: 'bytes32' },
      { name: 'resolvedAt', type: 'uint256', indexed: false, internalType: 'uint256' },
    ],
    anonymous: false,
  },
] as const
