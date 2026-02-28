// Simple deployment script for AletheiaOracle
// Run with: bun run contracts/deploy.ts

import { createPublicClient, createWalletClient, http, parseEther } from 'viem'
import { sepolia } from 'viem/chains'
import { privateKeyToAccount } from 'viem/accounts'
import { readFileSync } from 'fs'
import { join } from 'path'

// Read contract source
const contractSource = readFileSync(join(__dirname, 'AletheiaOracle.sol'), 'utf-8')

async function deployOracle() {
	// Get private key from environment
	const privateKey = process.env.DEPLOYER_PRIVATE_KEY
	if (!privateKey) {
		throw new Error('DEPLOYER_PRIVATE_KEY environment variable not set')
	}

	const account = privateKeyToAccount(privateKey as `0x${string}`)

	const walletClient = createWalletClient({
		account,
		chain: sepolia,
		transport: http(),
	})

	const publicClient = createPublicClient({
		chain: sepolia,
		transport: http(),
	})

	console.log('Deploying AletheiaOracle from:', account.address)
	console.log('Network: Sepolia')

	// Note: This is a placeholder. In production, you would:
	// 1. Compile the Solidity contract using solc or Hardhat
	// 2. Get the bytecode and ABI
	// 3. Deploy using walletClient.deployContract()

	console.log('\n⚠️  To deploy:')
	console.log('1. Install Foundry: https://getfoundry.sh')
	console.log('2. Run: forge create contracts/AletheiaOracle.sol:AletheiaOracle --rpc-url https://sepolia.infura.io/v3/YOUR_KEY --private-key $DEPLOYER_PRIVATE_KEY')
	console.log('3. Update cre-workflow/config.json with deployed address')
	console.log('4. Call setWorkflowAddress() with CRE workflow address')
}

deployOracle().catch(console.error)
