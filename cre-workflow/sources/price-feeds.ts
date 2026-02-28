import type { Runtime } from '@chainlink/cre-sdk'

export interface PriceData {
	source: string
	price: number
	timestamp: number
}

export interface PriceResult {
	price: number
	confidence: number
	sources: PriceData[]
	median: number
	spread: number
}

/**
 * Fetch BTC price from CoinGecko
 */
export const fetchCoinGecko = (sendRequester: any): PriceData => {
	const response = sendRequester
		.sendRequest({
			method: 'GET',
			url: 'https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd',
		})
		.result()

	if (response.statusCode !== 200) {
		throw new Error(`CoinGecko failed: ${response.statusCode}`)
	}

	const data = JSON.parse(Buffer.from(response.body).toString('utf-8'))
	return {
		source: 'coingecko',
		price: data.bitcoin.usd,
		timestamp: Date.now(),
	}
}

/**
 * Fetch BTC price from Binance
 */
export const fetchBinance = (sendRequester: any): PriceData => {
	const response = sendRequester
		.sendRequest({
			method: 'GET',
			url: 'https://api.binance.com/api/v3/ticker/price?symbol=BTCUSDT',
		})
		.result()

	if (response.statusCode !== 200) {
		throw new Error(`Binance failed: ${response.statusCode}`)
	}

	const data = JSON.parse(Buffer.from(response.body).toString('utf-8'))
	return {
		source: 'binance',
		price: parseFloat(data.price),
		timestamp: Date.now(),
	}
}

/**
 * Fetch BTC price from Coinbase
 */
export const fetchCoinbase = (sendRequester: any): PriceData => {
	const response = sendRequester
		.sendRequest({
			method: 'GET',
			url: 'https://api.coinbase.com/v2/prices/BTC-USD/spot',
		})
		.result()

	if (response.statusCode !== 200) {
		throw new Error(`Coinbase failed: ${response.statusCode}`)
	}

	const data = JSON.parse(Buffer.from(response.body).toString('utf-8'))
	return {
		source: 'coinbase',
		price: parseFloat(data.data.amount),
		timestamp: Date.now(),
	}
}

/**
 * Fetch BTC price from Kraken
 */
export const fetchKraken = (sendRequester: any): PriceData => {
	const response = sendRequester
		.sendRequest({
			method: 'GET',
			url: 'https://api.kraken.com/0/public/Ticker?pair=XBTUSD',
		})
		.result()

	if (response.statusCode !== 200) {
		throw new Error(`Kraken failed: ${response.statusCode}`)
	}

	const data = JSON.parse(Buffer.from(response.body).toString('utf-8'))
	return {
		source: 'kraken',
		price: parseFloat(data.result.XXBTZUSD.c[0]),
		timestamp: Date.now(),
	}
}

/**
 * Fetch BTC price from CoinCap
 */
export const fetchCoinCap = (sendRequester: any): PriceData => {
	const response = sendRequester
		.sendRequest({
			method: 'GET',
			url: 'https://api.coincap.io/v2/assets/bitcoin',
		})
		.result()

	if (response.statusCode !== 200) {
		throw new Error(`CoinCap failed: ${response.statusCode}`)
	}

	const data = JSON.parse(Buffer.from(response.body).toString('utf-8'))
	return {
		source: 'coincap',
		price: parseFloat(data.data.priceUsd),
		timestamp: Date.now(),
	}
}

/**
 * Calculate median of an array of numbers
 */
const calculateMedian = (numbers: number[]): number => {
	const sorted = [...numbers].sort((a, b) => a - b)
	const mid = Math.floor(sorted.length / 2)
	return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid]
}

/**
 * Calculate percentage spread (max - min) / median
 */
const calculateSpread = (numbers: number[]): number => {
	const max = Math.max(...numbers)
	const min = Math.min(...numbers)
	const median = calculateMedian(numbers)
	return median > 0 ? ((max - min) / median) * 100 : 0
}

/**
 * Calculate confidence based on agreement
 * If spread < 1% → 95% confidence
 * If spread < 2% → 85% confidence
 * If spread < 5% → 75% confidence
 * Otherwise → 50% confidence
 */
const calculateConfidence = (spread: number): number => {
	if (spread < 1) return 95
	if (spread < 2) return 85
	if (spread < 5) return 75
	return 50
}

/**
 * Fetch BTC price from all 5 sources and calculate consensus
 */
export const fetchBTCPriceMultiSource = (runtime: Runtime<any>): PriceResult => {
	const sources: PriceData[] = []
	const fetchers = [fetchCoinGecko, fetchBinance, fetchCoinbase, fetchKraken, fetchCoinCap]

	runtime.log('Fetching BTC price from 5 sources...')

	// Fetch from all sources, continue even if some fail
	for (const fetcher of fetchers) {
		try {
			const httpClient = new (require('@chainlink/cre-sdk').cre.capabilities.HTTPClient)()
			const priceData = httpClient
				.sendRequest(runtime, fetcher, (results: PriceData[]) => results[0])({})
				.result()
			sources.push(priceData)
			runtime.log(`✓ ${priceData.source}: $${priceData.price.toFixed(2)}`)
		} catch (error) {
			runtime.log(`✗ Source failed: ${error}`)
		}
	}

	if (sources.length < 3) {
		throw new Error(`Insufficient sources: only ${sources.length}/5 responded`)
	}

	const prices = sources.map((s) => s.price)
	const median = calculateMedian(prices)
	const spread = calculateSpread(prices)
	const confidence = calculateConfidence(spread)

	runtime.log(`Median price: $${median.toFixed(2)}`)
	runtime.log(`Spread: ${spread.toFixed(2)}%`)
	runtime.log(`Confidence: ${confidence}%`)

	return {
		price: median,
		confidence,
		sources,
		median,
		spread,
	}
}

/**
 * Evaluate if BTC price is above a threshold
 */
export const evaluateBTCPriceAbove = (
	runtime: Runtime<any>,
	threshold: number
): { outcome: boolean; confidence: number; evidence: string[] } => {
	const result = fetchBTCPriceMultiSource(runtime)

	const outcome = result.median > threshold
	const evidence = result.sources.map(
		(s) => `${s.source}: $${s.price.toFixed(2)} (${outcome ? '✓' : '✗'})`
	)

	runtime.log(`Evaluating: BTC > $${threshold}?`)
	runtime.log(`Result: ${outcome ? 'TRUE' : 'FALSE'} (${result.confidence}% confidence)`)

	return {
		outcome,
		confidence: result.confidence,
		evidence,
	}
}
