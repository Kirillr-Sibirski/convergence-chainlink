import { createPublicClient, http } from 'viem';
import { sepolia } from 'viem/chains';

// Deployed contract addresses
const ORACLE_ADDRESS = '0xe7A47740Ff60146f9E3C443bf84Bd5b6d03530a4';

// Oracle ABI
const ORACLE_ABI = [
  {
    inputs: [],
    name: 'marketCount',
    outputs: [{ type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ type: 'uint256' }],
    name: 'markets',
    outputs: [
      { name: 'id', type: 'uint256' },
      { name: 'question', type: 'string' },
      { name: 'deadline', type: 'uint256' },
      { name: 'resolved', type: 'bool' },
      { name: 'outcome', type: 'bool' },
      { name: 'confidence', type: 'uint8' },
      { name: 'proofHash', type: 'bytes32' },
      { name: 'createdAt', type: 'uint256' },
    ],
    stateMutability: 'view',
    type: 'function',
  },
] as const;

async function fetchMarkets() {
  const publicClient = createPublicClient({
    chain: sepolia,
    transport: http('https://ethereum-sepolia-rpc.publicnode.com'),
  });

  console.log('📋 Fetching markets from Oracle contract...\n');

  try {
    const marketCount = await publicClient.readContract({
      address: ORACLE_ADDRESS as `0x${string}`,
      abi: ORACLE_ABI,
      functionName: 'marketCount',
    });

    const count = Number(marketCount);
    console.log(`Found ${count} market(s)\n`);

    if (count === 0) return [];

    const markets = [];
    for (let i = 1; i <= count; i++) {
      const market = await publicClient.readContract({
        address: ORACLE_ADDRESS as `0x${string}`,
        abi: ORACLE_ABI,
        functionName: 'markets',
        args: [BigInt(i)],
      });

      const marketData = {
        id: Number(market[0]),
        question: market[1] as string,
        deadline: Number(market[2]),
        resolved: market[3] as boolean,
        outcome: market[4] as boolean,
        confidence: Number(market[5]),
        proofHash: market[6] as string,
        createdAt: Number(market[7]),
        category: 'Crypto', // Default category
        volumeUsdc: 0,
        yesPercent: 50,
      };

      markets.push(marketData);

      console.log(`Market ${i}:`);
      console.log(`  ID: ${marketData.id}`);
      console.log(`  Question: ${marketData.question}`);
      console.log(`  Deadline: ${new Date(marketData.deadline * 1000).toLocaleString()}`);
      console.log(`  Resolved: ${marketData.resolved}`);
      console.log(`  Created: ${new Date(marketData.createdAt * 1000).toLocaleString()}`);
      console.log('');
    }

    console.log('✅ Frontend market fetching works correctly!');
    return markets;
  } catch (error) {
    console.error('❌ Error fetching markets:', error);
    return [];
  }
}

fetchMarkets().catch(console.error);
