import {
	bytesToHex,
	type CronPayload,
	cre,
	encodeCallMsg,
	getNetwork,
	hexToBase64,
	Runner,
	type Runtime,
	TxStatus,
} from '@chainlink/cre-sdk'
import { type Address, decodeFunctionResult, encodeFunctionData, zeroAddress, keccak256, toBytes, encodeAbiParameters, parseAbiParameters } from 'viem'
import { z } from 'zod'
import { AletheiaOracleABI } from './contracts/abi'
import { resolveWithMultiAI, validateQuestionWithMultiAI } from './sources/multi-ai-openrouter'

// Configuration schema
const configSchema = z.object({
	cronSchedule: z.string(), // e.g., "*/10 * * * *" for every 10 minutes
	oracleAddress: z.string(), // AletheiaOracle.sol contract address
	chainSelectorName: z.string(), // e.g., "ethereum-testnet-sepolia"
	isTestnet: z.boolean().default(true),
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

interface ValidationRequest {
	id: bigint
	requester: Address
	question: string
	deadline: bigint
	processed: boolean
}

// Resolution result structure
interface ResolutionResult {
	outcome: boolean
	confidence: number
	agreementLevel: number
	sources: string[]
	evidence: string[]
}

const MIN_CONFIDENCE = 80
const MIN_AGREEMENT = 75
const REPORT_TYPE_RESOLUTION = 1
const REPORT_TYPE_VALIDATION = 2
const REPORT_TYPE_QUESTION_VALIDATION = 3
const CRE_HTTP_CALL_BUDGET_PER_RUN = 5
const AI_CALLS_PER_EVALUATION = 4
let runtimeSignerContextLogged = false

interface HttpQuestionValidationPayload {
	type?: 'questionValidation'
	question?: string
	deadline?: string | number
}

const logRuntimeSignerContext = (runtime: Runtime<Config>) => {
	if (runtimeSignerContextLogged) return
	runtimeSignerContextLogged = true

	runtime.log(
		`[Config] chain=${runtime.config.chainSelectorName} testnet=${runtime.config.isTestnet} oracle=${runtime.config.oracleAddress}`,
	)

	try {
		const signerSecret = runtime.getSecret({ id: 'CRE_ETH_PRIVATE_KEY' }).result()
		const signerPk = signerSecret?.value as string | undefined
		if (!signerPk) {
			runtime.log('[Config] CRE_ETH_PRIVATE_KEY is missing/empty')
			return
		}
		const masked = signerPk.length > 12 ? `${signerPk.slice(0, 6)}...${signerPk.slice(-4)}` : signerPk
		runtime.log(
			`[Config] CRE_ETH_PRIVATE_KEY loaded (masked=${masked}). Derive signer locally with: cast wallet address --private-key \"$CRE_ETH_PRIVATE_KEY\"`,
		)
	} catch (error) {
		runtime.log(`[Config] Unable to read CRE_ETH_PRIVATE_KEY: ${error}`)
	}
}

/**
 * Fetch pending markets from the oracle contract
 * Markets that have passed their deadline but are not yet resolved
 */
const fetchPendingMarkets = (runtime: Runtime<Config>): Market[] => {
	const network = getNetwork({
		chainFamily: 'evm',
		chainSelectorName: runtime.config.chainSelectorName,
		isTestnet: runtime.config.isTestnet,
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
		})
		.result()

	// Decode result
	const markets = decodeFunctionResult({
		abi: AletheiaOracleABI,
		functionName: 'getPendingMarkets',
		data: bytesToHex(contractCall.data),
	})

	runtime.log(`Found ${markets.length} pending market(s)`)

	return markets.map((m: any) => ({
		id: m.id,
		question: m.question,
		deadline: m.deadline,
		resolved: m.resolved,
	}))
}

const fetchPendingValidationRequests = (runtime: Runtime<Config>): ValidationRequest[] => {
	const network = getNetwork({
		chainFamily: 'evm',
		chainSelectorName: runtime.config.chainSelectorName,
		isTestnet: runtime.config.isTestnet,
	})

	if (!network) {
		throw new Error(`Network not found: ${runtime.config.chainSelectorName}`)
	}

	const evmClient = new cre.capabilities.EVMClient(network.chainSelector.selector)
	const callData = encodeFunctionData({
		abi: AletheiaOracleABI,
		functionName: 'getPendingValidationRequests',
	})

	const contractCall = evmClient
		.callContract(runtime, {
			call: encodeCallMsg({
				from: zeroAddress,
				to: runtime.config.oracleAddress as Address,
				data: callData,
			}),
		})
		.result()

	const requests = decodeFunctionResult({
		abi: AletheiaOracleABI,
		functionName: 'getPendingValidationRequests',
		data: bytesToHex(contractCall.data),
	})

	return requests.map((r: any) => ({
		id: r.id,
		requester: r.requester,
		question: r.question,
		deadline: r.deadline,
		processed: r.processed,
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
 * Fetch data from multiple sources with MULTI-AI CONSENSUS
 * Queries Claude, GPT, Grok, and Gemini AI models
 * Uses weighted voting based on confidence scores
 */
const fetchMultiSourceData = (
	runtime: Runtime<Config>,
	sources: string[],
	question: string,
	category: string,
	deadline: number,
	maxModelCalls: number,
): ResolutionResult => {
	runtime.log(`Multi-AI consensus resolution starting...`)
	runtime.log(`Question type: ${category}`)
	runtime.log(`Using up to ${maxModelCalls} AI model call(s) for this market`)

	// Use multi-AI consensus for ALL questions
	const result = resolveWithMultiAI(runtime, question, deadline, maxModelCalls)

	runtime.log(`Agreement level: ${result.agreementLevel}% (${result.aiResponses.length} AI models)`)

	return {
		outcome: result.outcome,
		confidence: result.confidence,
		agreementLevel: result.agreementLevel,
		sources: result.sources,
		evidence: result.evidence,
	}
}

/**
 * Validate resolution result
 * Ensures confidence and agreement thresholds are met
 */
const validateResult = (runtime: Runtime<Config>, result: ResolutionResult): boolean => {
	if (result.confidence < MIN_CONFIDENCE) {
		runtime.log(`Confidence too low: ${result.confidence}% < ${MIN_CONFIDENCE}%`)
		return false
	}

	if (result.agreementLevel < MIN_AGREEMENT) {
		runtime.log(`Agreement too low: ${result.agreementLevel}% < ${MIN_AGREEMENT}%`)
		return false
	}

	runtime.log(`Consensus validated: confidence=${result.confidence}% agreement=${result.agreementLevel}%`)
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
		isTestnet: runtime.config.isTestnet,
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
	const proofHash = keccak256(toBytes(proofString))

	// ABI-encode report data for onReport() -> _processReport()
	// This encodes the parameters that will be passed to _processReport(bytes report)
	const reportData = encodeAbiParameters(
		parseAbiParameters('uint8 reportType, uint256 marketId, bool outcome, uint8 confidence, bytes32 proofHash'),
		[REPORT_TYPE_RESOLUTION, marketId, result.outcome, result.confidence, proofHash]
	)

	// Generate DON report with cryptographic signature
	const reportResponse = runtime
		.report({
			encodedPayload: hexToBase64(reportData),
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

const writeValidationResult = (
	runtime: Runtime<Config>,
	requestId: bigint,
	approved: boolean,
	score: number,
	checks: { legitimate: boolean; clearTimeline: boolean; resolvable: boolean; binary: boolean },
	reasons: string[]
): string => {
	const network = getNetwork({
		chainFamily: 'evm',
		chainSelectorName: runtime.config.chainSelectorName,
		isTestnet: runtime.config.isTestnet,
	})

	if (!network) {
		throw new Error(`Network not found: ${runtime.config.chainSelectorName}`)
	}

	const evmClient = new cre.capabilities.EVMClient(network.chainSelector.selector)
	const proofHash = keccak256(
		toBytes(
			JSON.stringify({
				requestId: requestId.toString(),
				approved,
				score,
				checks,
				reasons,
				timestamp: Date.now(),
			}),
		),
	)

	const reportData = encodeAbiParameters(
		parseAbiParameters(
			'uint8 reportType, uint256 requestId, bool approved, uint8 score, bool legitimate, bool clearTimeline, bool resolvable, bool binary, bytes32 proofHash',
		),
		[
			REPORT_TYPE_VALIDATION,
			requestId,
			approved,
			score,
			checks.legitimate,
			checks.clearTimeline,
			checks.resolvable,
			checks.binary,
			proofHash,
		],
	)

	const reportResponse = runtime
		.report({
			encodedPayload: hexToBase64(reportData),
			encoderName: 'evm',
			signingAlgo: 'ecdsa',
			hashingAlgo: 'keccak256',
		})
		.result()

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
		throw new Error(`Failed to write validation report: ${resp.errorMessage || resp.txStatus}`)
	}

	return bytesToHex(resp.txHash || new Uint8Array(32))
}

const writeQuestionValidationResult = (
	runtime: Runtime<Config>,
	questionDigest: `0x${string}`,
	approved: boolean,
	score: number,
	checks: { legitimate: boolean; clearTimeline: boolean; resolvable: boolean; binary: boolean },
	reasons: string[]
): string => {
	const network = getNetwork({
		chainFamily: 'evm',
		chainSelectorName: runtime.config.chainSelectorName,
		isTestnet: runtime.config.isTestnet,
	})
	if (!network) throw new Error(`Network not found: ${runtime.config.chainSelectorName}`)

	const evmClient = new cre.capabilities.EVMClient(network.chainSelector.selector)
	const proofHash = keccak256(
		toBytes(JSON.stringify({ questionDigest, approved, score, checks, reasons, timestamp: Date.now() })),
	)

	const reportData = encodeAbiParameters(
		parseAbiParameters(
			'uint8 reportType, bytes32 questionDigest, bool approved, uint8 score, bool legitimate, bool clearTimeline, bool resolvable, bool binary, bytes32 proofHash',
		),
		[
			REPORT_TYPE_QUESTION_VALIDATION,
			questionDigest,
			approved,
			score,
			checks.legitimate,
			checks.clearTimeline,
			checks.resolvable,
			checks.binary,
			proofHash,
		],
	)

	const reportResponse = runtime
		.report({
			encodedPayload: hexToBase64(reportData),
			encoderName: 'evm',
			signingAlgo: 'ecdsa',
			hashingAlgo: 'keccak256',
		})
		.result()

	const resp = evmClient
		.writeReport(runtime, {
			receiver: runtime.config.oracleAddress,
			report: reportResponse,
			gasConfig: { gasLimit: runtime.config.gasLimit },
		})
		.result()

	if (resp.txStatus !== TxStatus.SUCCESS) {
		throw new Error(`Failed to write question validation report: ${resp.errorMessage || resp.txStatus}`)
	}
	return bytesToHex(resp.txHash || new Uint8Array(32))
}

const onHttpQuestionValidationTrigger = (runtime: Runtime<Config>, parsed: HttpQuestionValidationPayload): string => {
	logRuntimeSignerContext(runtime)
	const question = parsed.question?.trim() || ''
	if (!question) throw new Error('HTTP payload missing question')

	const deadline =
		typeof parsed.deadline === 'number'
			? Math.floor(parsed.deadline)
			: Number.parseInt(String(parsed.deadline || '0'), 10)
	if (!Number.isFinite(deadline) || deadline <= 0) {
		throw new Error('HTTP payload missing valid deadline')
	}

	const digest = keccak256(
		encodeAbiParameters(parseAbiParameters('string question, uint256 deadline'), [question, BigInt(deadline)])
	)
	const validation = validateQuestionWithMultiAI(runtime, question, deadline)
	const approved =
		validation.checks.legitimate &&
		validation.checks.clearTimeline &&
		validation.checks.resolvable &&
		validation.checks.binary

	const txHash = writeQuestionValidationResult(
		runtime,
		digest,
		approved,
		validation.score,
		validation.checks,
		validation.issues
	)
	runtime.log(`Question validation written: digest=${digest}, deadline=${deadline}, approved=${approved}, tx=${txHash}`)
	return JSON.stringify({ digest, deadline, approved, score: validation.score, txHash })
}

const onHttpTrigger = (runtime: Runtime<Config>, payload: { input: Uint8Array }): string => {
	const raw = new TextDecoder().decode(payload.input)
	const parsed = JSON.parse(raw) as HttpQuestionValidationPayload
	return onHttpQuestionValidationTrigger(runtime, parsed as HttpQuestionValidationPayload)
}

/**
 * Main CRON callback - runs every 10 minutes
 * Checks for pending markets and resolves them autonomously
 */
const onCronTrigger = (runtime: Runtime<Config>, payload: CronPayload): string => {
	logRuntimeSignerContext(runtime)
	if (!payload.scheduledExecutionTime) {
		throw new Error('Scheduled execution time is required')
	}

	const execTimeMs = Number(payload.scheduledExecutionTime.seconds) * 1000
	runtime.log(`CRON triggered at ${new Date(execTimeMs).toISOString()}`)

	// 1. Process pending creation validation requests first
	const pendingValidation = fetchPendingValidationRequests(runtime)
	runtime.log(`Found ${pendingValidation.length} pending validation request(s)`)
	let remainingHttpCalls = CRE_HTTP_CALL_BUDGET_PER_RUN

	let validatedCount = 0
	for (const req of pendingValidation) {
		if (remainingHttpCalls < AI_CALLS_PER_EVALUATION) {
			runtime.log(
				`Skipping remaining validation requests due to CRE HTTP call budget: remaining=${remainingHttpCalls}/${CRE_HTTP_CALL_BUDGET_PER_RUN}`,
			)
			break
		}
		try {
			runtime.log(`Validating request ${req.id}: ${req.question}`)
			const validation = validateQuestionWithMultiAI(runtime, req.question, Number(req.deadline))

			const approved =
				validation.checks.legitimate &&
				validation.checks.clearTimeline &&
				validation.checks.resolvable &&
				validation.checks.binary

			const txHash = writeValidationResult(
				runtime,
				req.id,
				approved,
				validation.score,
				validation.checks,
				validation.issues
			)
			runtime.log(`Validation request ${req.id} processed: approved=${approved}, tx=${txHash}`)
			validatedCount++
		} catch (error) {
			runtime.log(`Validation request ${req.id} failed: ${error}`)
		} finally {
			remainingHttpCalls = Math.max(0, remainingHttpCalls - AI_CALLS_PER_EVALUATION)
		}
	}

	// 2. Fetch pending markets (past deadline, not resolved)
	const pendingMarkets = fetchPendingMarkets(runtime)

	if (pendingMarkets.length === 0) {
		runtime.log('No pending markets to resolve')
		return 'No markets resolved'
	}

	runtime.log(`Found ${pendingMarkets.length} pending market(s)`)
	if (remainingHttpCalls <= 0) {
		return `Validated ${validatedCount} request(s), resolved 0 market(s): skipped due to CRE HTTP call budget`
	}

	// 3. Process each market
	const resolved: string[] = []
	for (let i = 0; i < pendingMarkets.length; i++) {
		if (remainingHttpCalls <= 0) {
			runtime.log('No remaining CRE HTTP calls in this run; deferring remaining markets')
			break
		}
		const marketsRemaining = pendingMarkets.length - i
		const callsForThisMarket = Math.max(
			1,
			Math.min(
				AI_CALLS_PER_EVALUATION,
				Math.floor(remainingHttpCalls / Math.max(1, marketsRemaining)),
			),
		)
		const market = pendingMarkets[i]
		try {
			runtime.log(`Processing market ${market.id}: ${market.question}`)

			// 4. Determine verification strategy
			const strategy = determineVerificationStrategy(runtime, market.question)
			runtime.log(`Strategy: ${strategy.category}, sources: ${strategy.sources.length}`)

			// 5. Fetch from multiple sources with consensus
			const result = fetchMultiSourceData(
				runtime,
				strategy.sources,
				market.question,
				strategy.category,
				Number(market.deadline),
				callsForThisMarket,
			)

			// 6. Validate result (confidence + agreement thresholds)
			if (!validateResult(runtime, result)) {
				runtime.log(`Skipping market ${market.id} - insufficient consensus`)
				continue
			}

			// 7. Write resolution on-chain
			const txHash = writeResolution(runtime, market.id, result)
			resolved.push(`Market ${market.id}: ${txHash}`)

			runtime.log(`✅ Resolved market ${market.id}`)
		} catch (error) {
			runtime.log(`❌ Failed to resolve market ${market.id}: ${error}`)
		} finally {
			remainingHttpCalls = Math.max(0, remainingHttpCalls - callsForThisMarket)
		}
	}

	return `Validated ${validatedCount} request(s), resolved ${resolved.length} market(s): ${resolved.join(', ')}`
}

/**
 * Initialize workflow with CRON trigger
 * Runs every 10 minutes to check for markets to resolve
 */
const initWorkflow = (config: Config) => {
	const cronTrigger = new cre.capabilities.CronCapability()
	const httpTrigger = new cre.capabilities.HTTPCapability()

	return [
		cre.handler(
			cronTrigger.trigger({
				schedule: config.cronSchedule, // "*/10 * * * *" = every 10 minutes
			}),
			onCronTrigger,
		),
		cre.handler(
			httpTrigger.trigger({
				authorizedKeys: [],
			}),
			onHttpTrigger,
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

main().catch((error) => {
	console.error(error)
	process.exit(1)
})
