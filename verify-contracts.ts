import { createPublicClient, http } from 'viem';
import { sepolia } from 'viem/chains';

const client = createPublicClient({
  chain: sepolia,
  transport: http('https://ethereum-sepolia-rpc.publicnode.com'),
});

const CONTRACTS = {
  FACTORY: '0x7e3419E3b14436336F41daFc7Fe35A822cdc78AF',
  ORACLE: '0xe7A47740Ff60146f9E3C443bf84Bd5b6d03530a4',
  MARKET: '0xf2DA89D632f9E28aF45f4F584Fb9b59F3041a10E',
};

console.log('🔍 Verifying Sepolia Contracts...\n');

// Check if contracts exist (have bytecode)
for (const [name, address] of Object.entries(CONTRACTS)) {
  const code = await client.getBytecode({ address: address as `0x${string}` });
  const exists = code && code !== '0x';
  console.log(`${exists ? '✅' : '❌'} ${name}: ${address}`);
  if (!exists) {
    console.log(`   ⚠️  No bytecode found - contract not deployed\n`);
  } else {
    console.log(`   ✓ Bytecode length: ${code.length} chars\n`);
  }
}

// Try to fetch market count from Oracle
const ORACLE_ABI = [
  {
    inputs: [],
    name: 'marketCount',
    outputs: [{ type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ name: '', type: 'uint256' }],
    name: 'markets',
    outputs: [
      { name: 'id', type: 'uint256' },
      { name: 'question', type: 'string' },
      { name: 'deadline', type: 'uint256' },
      { name: 'resolved', type: 'bool' },
      { name: 'isPending', type: 'bool' },
      { name: 'outcome', type: 'uint8' },
      { name: 'confidence', type: 'bytes32' },
      { name: 'createdAt', type: 'uint256' },
    ],
    stateMutability: 'view',
    type: 'function',
  },
];

try {
  const marketCount = await client.readContract({
    address: CONTRACTS.ORACLE as `0x${string}`,
    abi: ORACLE_ABI,
    functionName: 'marketCount',
  });
  
  console.log(`\n📊 Oracle State:`);
  console.log(`   Total Markets: ${marketCount}`);
  
  if (marketCount > 0n) {
    console.log(`\n📋 Markets:`);
    for (let i = 1n; i <= marketCount; i++) {
      const market = await client.readContract({
        address: CONTRACTS.ORACLE as `0x${string}`,
        abi: ORACLE_ABI,
        functionName: 'markets',
        args: [i],
      });
      
      console.log(`\n   Market ${i}:`);
      console.log(`     Question: ${market[1]}`);
      console.log(`     Deadline: ${new Date(Number(market[2]) * 1000).toLocaleString()}`);
      console.log(`     Resolved: ${market[3]}`);
      console.log(`     Pending: ${market[4]}`);
    }
  }
  
  console.log('\n✅ All contracts verified successfully!');
} catch (error: any) {
  console.log('\n❌ Error reading Oracle contract:');
  console.log(`   ${error.message}`);
}
