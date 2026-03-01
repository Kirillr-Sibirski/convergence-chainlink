import { createWalletClient, http, createPublicClient } from 'viem';
import { sepolia } from 'viem/chains';
import { privateKeyToAccount } from 'viem/accounts';
import solc from 'solc';
import fs from 'fs';
import path from 'path';

const PRIVATE_KEY = '0xd753c130f8fe3559e37b969c58e580333e284bb4f192c02ff41d4f2675411cec';
const ORACLE_ADDRESS = '0xb13623f2AfB38b849d3a111ebdF08e135Ae8315e';
const RPC_URL = 'https://ethereum-sepolia-rpc.publicnode.com';

// Read contract sources
const demoPMSource = fs.readFileSync('contracts/DemoPredictionMarket.sol', 'utf8');
const oracleSource = fs.readFileSync('contracts/AletheiaOracle.sol', 'utf8');

// Prepare input for solc
const input = {
  language: 'Solidity',
  sources: {
    'DemoPredictionMarket.sol': { content: demoPMSource },
    'AletheiaOracle.sol': { content: oracleSource }
  },
  settings: {
    optimizer: { enabled: true, runs: 200 },
    outputSelection: {
      '*': {
        '*': ['abi', 'evm.bytecode']
      }
    }
  }
};

console.log('Compiling contracts...');
const output = JSON.parse(solc.compile(JSON.stringify(input)));

if (output.errors) {
  output.errors.forEach(err => {
    if (err.severity === 'error') {
      console.error('Compilation error:', err.formattedMessage);
    }
  });
  if (output.errors.some(e => e.severity === 'error')) {
    process.exit(1);
  }
}

const contract = output.contracts['DemoPredictionMarket.sol']['DemoPredictionMarket'];
const abi = contract.abi;
const bytecode = '0x' + contract.evm.bytecode.object;

console.log('✓ Compiled successfully');
console.log('Bytecode length:', bytecode.length);

// Deploy
const account = privateKeyToAccount(PRIVATE_KEY);

const publicClient = createPublicClient({
  chain: sepolia,
  transport: http(RPC_URL),
});

const walletClient = createWalletClient({
  account,
  chain: sepolia,
  transport: http(RPC_URL),
});

console.log('\nDeploying from:', account.address);

const balance = await publicClient.getBalance({ address: account.address });
console.log('Balance:', balance.toString(), 'wei (', (Number(balance) / 1e18).toFixed(4), 'ETH )');

if (balance === 0n) {
  console.error('\n❌ No balance! Get Sepolia ETH from https://sepoliafaucet.com');
  process.exit(1);
}

console.log('\nDeploying DemoPredictionMarket...');

const hash = await walletClient.deployContract({
  abi,
  bytecode,
  args: [ORACLE_ADDRESS],
});

console.log('Transaction hash:', hash);
console.log('Waiting for confirmation...');

const receipt = await publicClient.waitForTransactionReceipt({ hash });

console.log('\n✅ Contract deployed!');
console.log('Address:', receipt.contractAddress);
console.log('Block:', receipt.blockNumber);
console.log('Gas used:', receipt.gasUsed.toString());

console.log('\n📝 Update frontend/lib/contracts.ts:');
console.log(`PREDICTION_MARKET_ADDRESS: "${receipt.contractAddress}"`);
