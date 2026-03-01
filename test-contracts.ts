import { createPublicClient, createWalletClient, http, parseEther } from 'viem';
import { sepolia } from 'viem/chains';
import { privateKeyToAccount } from 'viem/accounts';

// Private key from user
const PRIVATE_KEY = '0xd753c130f8fe3559e37b969c58e580333e284bb4f192c02ff41d4f2675411cec';

// Deployed contract addresses
const ORACLE_ADDRESS = '0xe7A47740Ff60146f9E3C443bf84Bd5b6d03530a4';
const PREDICTION_MARKET_ADDRESS = '0xf2DA89D632f9E28aF45f4F584Fb9b59F3041a10E';
const FACTORY_ADDRESS = '0x7e3419E3b14436336F41daFc7Fe35A822cdc78AF';

// Oracle ABI (minimal needed for testing)
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
  {
    inputs: [
      { name: 'question', type: 'string' },
      { name: 'deadline', type: 'uint256' },
    ],
    name: 'createMarket',
    outputs: [{ name: 'marketId', type: 'uint256' }],
    stateMutability: 'nonpayable',
    type: 'function',
  },
] as const;

const PREDICTION_MARKET_ABI = [
  {
    inputs: [],
    name: 'marketCount',
    outputs: [{ type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      { name: 'question', type: 'string' },
      { name: 'deadline', type: 'uint256' },
    ],
    name: 'createMarket',
    outputs: [{ name: 'marketId', type: 'uint256' }],
    stateMutability: 'nonpayable',
    type: 'function',
  },
] as const;

async function main() {
  console.log('🔍 Testing AEEIA Prediction Market Contracts on Sepolia...\n');

  // Create clients
  const publicClient = createPublicClient({
    chain: sepolia,
    transport: http('https://ethereum-sepolia-rpc.publicnode.com'),
  });

  const account = privateKeyToAccount(PRIVATE_KEY as `0x${string}`);

  const walletClient = createWalletClient({
    account,
    chain: sepolia,
    transport: http('https://ethereum-sepolia-rpc.publicnode.com'),
  });

  console.log(`📍 Testing with account: ${account.address}\n`);

  // Check balance
  const balance = await publicClient.getBalance({ address: account.address });
  console.log(`💰 Account balance: ${(Number(balance) / 1e18).toFixed(4)} ETH\n`);

  if (balance === 0n) {
    console.log('⚠️  WARNING: Account has no ETH. Get testnet ETH from https://sepoliafaucet.com/\n');
  }

  // Check Oracle contract
  console.log('📋 Oracle Contract:', ORACLE_ADDRESS);
  try {
    const marketCount = await publicClient.readContract({
      address: ORACLE_ADDRESS as `0x${string}`,
      abi: ORACLE_ABI,
      functionName: 'marketCount',
    });
    console.log(`   Markets count: ${marketCount}\n`);

    // Read all markets
    if (Number(marketCount) > 0) {
      console.log('📊 Existing Markets:');
      for (let i = 1; i <= Number(marketCount); i++) {
        const market = await publicClient.readContract({
          address: ORACLE_ADDRESS as `0x${string}`,
          abi: ORACLE_ABI,
          functionName: 'markets',
          args: [BigInt(i)],
        });
        console.log(`   Market ${i}:`);
        console.log(`     Question: ${market[1]}`);
        console.log(`     Deadline: ${new Date(Number(market[2]) * 1000).toISOString()}`);
        console.log(`     Resolved: ${market[3]}`);
        if (market[3]) {
          console.log(`     Outcome: ${market[4] ? 'YES' : 'NO'}`);
          console.log(`     Confidence: ${market[5]}%`);
        }
        console.log('');
      }
    }
  } catch (error: any) {
    console.log(`   ❌ Error reading oracle: ${error.message}\n`);
  }

  // Check Prediction Market contract
  console.log('🎲 Prediction Market Contract:', PREDICTION_MARKET_ADDRESS);
  try {
    const pmMarketCount = await publicClient.readContract({
      address: PREDICTION_MARKET_ADDRESS as `0x${string}`,
      abi: PREDICTION_MARKET_ABI,
      functionName: 'marketCount',
    });
    console.log(`   Markets count: ${pmMarketCount}\n`);
  } catch (error: any) {
    console.log(`   ❌ Error reading prediction market: ${error.message}\n`);
  }

  // Create a test market if account has balance
  if (balance > 0n) {
    console.log('🚀 Creating test market...');

    const deadline = Math.floor(Date.now() / 1000) + 300; // 5 minutes from now
    const question = `Will BTC be above $100,000 on ${new Date(deadline * 1000).toLocaleString()}?`;

    console.log(`   Question: ${question}`);
    console.log(`   Deadline: ${new Date(deadline * 1000).toISOString()}`);

    try {
      const { request } = await publicClient.simulateContract({
        account,
        address: ORACLE_ADDRESS as `0x${string}`,
        abi: ORACLE_ABI,
        functionName: 'createMarket',
        args: [question, BigInt(deadline)],
      });

      const hash = await walletClient.writeContract(request);
      console.log(`   ✅ Transaction hash: ${hash}`);
      console.log(`   🔗 View on Etherscan: https://sepolia.etherscan.io/tx/${hash}`);

      console.log('\n⏳ Waiting for transaction confirmation...');
      const receipt = await publicClient.waitForTransactionReceipt({ hash });
      console.log(`   ✅ Transaction confirmed in block ${receipt.blockNumber}`);

      // Read updated market count
      const newMarketCount = await publicClient.readContract({
        address: ORACLE_ADDRESS as `0x${string}`,
        abi: ORACLE_ABI,
        functionName: 'marketCount',
      });
      console.log(`   📊 New market count: ${newMarketCount}`);

    } catch (error: any) {
      console.log(`   ❌ Error creating market: ${error.message}`);
      if (error.message.includes('insufficient funds')) {
        console.log('   ℹ️  Get testnet ETH from https://sepoliafaucet.com/');
      }
    }
  }

  console.log('\n✅ Contract testing complete!');
}

main().catch(console.error);
