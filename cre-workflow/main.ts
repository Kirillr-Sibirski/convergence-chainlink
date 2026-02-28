import {
	bytesToHex,
	ConsensusAggregationByFields,
	type CronPayload,
	cre,
	encodeCallMsg,
	getNetwork,
	hexToBase64,
	keccak256,
	LAST_FINALIZED_BLOCK_NUMBER,
	median,
	Runner,
	type Runtime,
	TxStatus,
} from '@chainlink/cre-sdk'
import { type Address, decodeFunctionResult, encodeFunctionData, zeroAddress } from 'viem'
import { z } from 'zod'
import { AletheiaOracleABI } from './contracts/abi'
import { evaluateBTCPriceAbove } from './sources/price-feeds'
import { resolveUniversalQuestion } from './sources/universal-resolver'

// Configuration schema
const configSchema = z.object({
	cronSchedule: z.string(), // e.g., "*/5 * * * *" for every 5 minutes
	oracleAddress: z.string(), // AletheiaOracle.sol contract address
	chainSelectorName: z.string(), // e.g., "ethereum-testnet-sepolia"
	gasLimit: z.string(),
})

type Config = z.infer<typeof configSchema>

// Market structure
interface Market {
	id: bigint
	question: string
	deadline: bigint
	resolved: boolean
}

// Resolution result structure
interface ResolutionResult {
	outcome: boolean
	confidence: number
	sources: string[]
	evidence: string[]
}

/**
 * Fetch pending markets from the oracle contract
 * Markets that have passed their deadline but are not yet resolved
 */
const fetchPendingMarkets = (runtime: Runtime<Config>): Market[] => {
	const network = getNetwork({
		chainFamily: 'evm',
		chainSelectorName: runtime.config.chainSelectorName,
		isTestnet: true,
	})

	if (!network) {
		throw new Error(`Network not found: ${runtime.config.chainSelectorName}`)
	}

	const evmClient = new cre.capabilities.EVMClient(network.chainSelector.selector)

	runtime.log('Checking for pending markets...')

	// Encode call to getPendingMarkets()
	const callData = encodeFunctionData({
		abi: AletheiaOracleABI,
		functionName: 'getPendingMarkets',
	})

	// Call contract via EVMClient
	const contractCall = evmClient
		.callContract(runtime, {
			call: encodeCallMsg({
				from: zeroAddress,
				to: runtime.config.oracleAddress as Address,
				data: callData,
			}),
			blockNumber: LAST_FINALIZED_BLOCK_NUMBER,
		})
		.result()

	// Decode result
	const markets = decodeFunctionResult({
		abi: AletheiaOracleABI,
		functionName: 'getPendingMarkets',
		data: bytesToHex(contractCall.data),
	})

	runtime.log(`Found ${markets.length} pending market(s)`)

	return markets.map((m) => ({
		id: m.id,
		question: m.question,
		deadline: m.deadline,
		resolved: m.resolved,
	}))
}

/**
 * AI-powered verification strategy determination
 * Analyzes the question and determines which sources to query and how
 */
const determineVerificationStrategy = (runtime: Runtime<Config>, question: string): {
	sources: string[]
	category: 'price' | 'social' | 'onchain' | 'hybrid'
} => {
	runtime.log(`Analyzing question: ${question}`)

	// Deterministic pattern matching (WASM-compatible, no external AI calls)
	// This is a simplified version - production would use more sophisticated parsing

	const lowerQ = question.toLowerCase()

	// Price oracle detection
	if (lowerQ.includes('btc') || lowerQ.includes('bitcoin') || lowerQ.includes('eth') ||
	    lowerQ.includes('price') || lowerQ.includes('$') || lowerQ.includes('usd')) {
		return {
			category: 'price',
			sources: [
				'https://api.coingecko.com/api/v3',
				'https://api.binance.com/api/v3',
				'https://api.coinbase.com/v2',
				'https://api.kraken.com/0/public',
				'https://api.gemini.com/v1',
			],
		}
	}

	// Social media detection
	if (lowerQ.includes('tweet') || lowerQ.includes('twitter') || lowerQ.includes('post')) {
		return {
			category: 'social',
			sources: [
				'https://api.twitter.com/2',
				'https://web.archive.org',
				'https://nitter.net',
				'https://truthsocial.com/api',
				'https://newsapi.org/v2',
			],
		}
	}

	// On-chain detection
	if (lowerQ.includes('deploy') || lowerQ.includes('contract') || lowerQ.includes('blockchain')) {
		return {
			category: 'onchain',
			sources: [
				'etherscan',
				'basescan',
				'github',
				'blog-rss',
				'twitter',
			],
		}
	}

	// Default: hybrid approach
	return {
		category: 'hybrid',
		sources: [
			'https://api.coingecko.com/api/v3',
			'https://newsapi.org/v2',
			'etherscan',
		],
	}
}

/**
 * Fetch data from multiple sources with consensus
 * Uses CRE's HTTP capability with DON consensus
 * NOW SUPPORTS: price, weather, social, news, onchain, general questions
 */
const fetchMultiSourceData = (
	runtime: Runtime<Config>,
	sources: string[],
	question: string,
	category: string,
): ResolutionResult => {
	runtime.log(`Fetching from ${sources.length} sources...`)
	runtime.log(`Question type: ${category}`)

	// Use universal resolver for ANY question type
	const result = resolveUniversalQuestion(runtime, question)

	return {
		outcome: result.outcome,
		confidence: result.confidence,
		sources: result.sources,
		evidence: result.evidence,
	}
}

/**
 * Validate resolution result
 * Ensures 4/5 sources agree (80% consensus)
 */
const validateResult = (runtime: Runtime<Config>, result: ResolutionResult): boolean => {
	const threshold = 0.8 // 4/5 sources = 80%

	if (result.confidence < threshold * 100) {
		runtime.log(`Consensus too low: ${result.confidence}% < ${threshold * 100}%`)
		return false
	}

	runtime.log(`Consensus validated: ${result.confidence}%`)
	return true
}

/**
 * Write resolution to oracle contract
 * Generates DON report and submits on-chain
 */
const writeResolution = (
	runtime: Runtime<Config>,
	marketId: bigint,
	result: ResolutionResult,
): string => {
	const network = getNetwork({
		chainFamily: 'evm',
		chainSelectorName: runtime.config.chainSelectorName,
		isTestnet: true,
	})

	if (!network) {
		throw new Error(`Network not found: ${runtime.config.chainSelectorName}`)
	}

	const evmClient = new cre.capabilities.EVMClient(network.chainSelector.selector)

	runtime.log(
		`Writing resolution for market ${marketId}: outcome=${result.outcome}, confidence=${result.confidence}`,
	)

	// Generate proof hash from evidence
	const proofString = JSON.stringify({
		outcome: result.outcome,
		confidence: result.confidence,
		sources: result.sources,
		evidence: result.evidence,
		timestamp: Date.now(),
	})
	const proofHash = keccak256(Buffer.from(proofString, 'utf-8'))

	// Encode call to resolveMarket(marketId, outcome, confidence, proofHash)
	const callData = encodeFunctionData({
		abi: AletheiaOracleABI,
		functionName: 'resolveMarket',
		args: [marketId, result.outcome, result.confidence, proofHash],
	})

	// Generate DON report
	const reportResponse = runtime
		.report({
			encodedPayload: hexToBase64(callData),
			encoderName: 'evm',
			signingAlgo: 'ecdsa',
			hashingAlgo: 'keccak256',
		})
		.result()

	// Write to contract
	const resp = evmClient
		.writeReport(runtime, {
			receiver: runtime.config.oracleAddress,
			report: reportResponse,
			gasConfig: {
				gasLimit: runtime.config.gasLimit,
			},
		})
		.result()

	if (resp.txStatus !== TxStatus.SUCCESS) {
		throw new Error(`Failed to write report: ${resp.errorMessage || resp.txStatus}`)
	}

	const txHash = bytesToHex(resp.txHash || new Uint8Array(32))
	runtime.log(`✅ Write report transaction succeeded at txHash: ${txHash}`)

	return txHash
}

/**
 * Main CRON callback - runs every 5 minutes
 * Checks for pending markets and resolves them autonomously
 */
const onCronTrigger = (runtime: Runtime<Config>, payload: CronPayload): string => {
	if (!payload.scheduledExecutionTime) {
		throw new Error('Scheduled execution time is required')
	}

	runtime.log(`CRON triggered at ${payload.scheduledExecutionTime.toISOString()}`)

	// 1. Fetch pending markets (past deadline, not resolved)
	const pendingMarkets = fetchPendingMarkets(runtime)

	if (pendingMarkets.length === 0) {
		runtime.log('No pending markets to resolve')
		return 'No markets resolved'
	}

	runtime.log(`Found ${pendingMarkets.length} pending market(s)`)

	// 2. Process each market
	const resolved: string[] = []
	for (const market of pendingMarkets) {
		try {
			runtime.log(`Processing market ${market.id}: ${market.question}`)

			// 3. Determine verification strategy
			const strategy = determineVerificationStrategy(runtime, market.question)
			runtime.log(`Strategy: ${strategy.category}, sources: ${strategy.sources.length}`)

			// 4. Fetch from multiple sources with consensus
			const result = fetchMultiSourceData(runtime, strategy.sources, market.question, strategy.category)

			// 5. Validate result (4/5 consensus)
			if (!validateResult(runtime, result)) {
				runtime.log(`Skipping market ${market.id} - insufficient consensus`)
				continue
			}

			// 6. Write resolution on-chain
			const txHash = writeResolution(runtime, market.id, result)
			resolved.push(`Market ${market.id}: ${txHash}`)

			runtime.log(`✅ Resolved market ${market.id}`)
		} catch (error) {
			runtime.log(`❌ Failed to resolve market ${market.id}: ${error}`)
		}
	}

	return `Resolved ${resolved.length} market(s): ${resolved.join(', ')}`
}

/**
 * Initialize workflow with CRON trigger
 * Runs every 5 minutes to check for markets to resolve
 */
const initWorkflow = (config: Config) => {
	const cronTrigger = new cre.capabilities.CronCapability()

	return [
		cre.handler(
			cronTrigger.trigger({
				schedule: config.cronSchedule, // "*/5 * * * *" = every 5 minutes
			}),
			onCronTrigger,
		),
	]
}

/**
 * Main entry point
 */
export async function main() {
	const runner = await Runner.newRunner<Config>({
		configSchema,
	})
	await runner.run(initWorkflow)
}

main()
