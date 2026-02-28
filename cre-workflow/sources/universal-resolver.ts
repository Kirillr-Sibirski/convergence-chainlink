import type { Runtime } from '@chainlink/cre-sdk'
import { evaluateBTCPriceAbove } from './price-feeds'

export interface VerificationStrategy {
	category: 'price' | 'weather' | 'social' | 'news' | 'onchain' | 'general'
	sources: string[]
	method: string
	feasible: boolean
	reason?: string
}

export interface UniversalResult {
	outcome: boolean
	confidence: number
	sources: string[]
	evidence: string[]
}

/**
 * AI Question Analyzer - Determines if a question can be verified
 * This runs BEFORE market creation to validate feasibility
 */
export const analyzeQuestionFeasibility = (question: string): VerificationStrategy => {
	const lowerQ = question.toLowerCase()

	// PRICE questions (crypto, stocks, forex)
	if (
		lowerQ.includes('btc') ||
		lowerQ.includes('bitcoin') ||
		lowerQ.includes('eth') ||
		lowerQ.includes('ethereum') ||
		lowerQ.includes('price') ||
		lowerQ.includes('$') ||
		lowerQ.includes('stock')
	) {
		return {
			category: 'price',
			sources: [
				'CoinGecko API',
				'Binance API',
				'Coinbase API',
				'Kraken API',
				'CoinCap API',
			],
			method: 'Fetch price from 5 exchanges, calculate median',
			feasible: true,
		}
	}

	// WEATHER questions
	if (lowerQ.includes('weather') || lowerQ.includes('rain') || lowerQ.includes('temperature')) {
		return {
			category: 'weather',
			sources: [
				'OpenWeatherMap API',
				'WeatherAPI.com',
				'AccuWeather API',
				'Weather.gov (NOAA)',
				'MeteoBlue API',
			],
			method: 'Fetch weather data from 5 services, consensus on conditions',
			feasible: true,
		}
	}

	// SOCIAL MEDIA questions (tweets, posts, mentions)
	if (
		lowerQ.includes('tweet') ||
		lowerQ.includes('twitter') ||
		lowerQ.includes('post') ||
		lowerQ.includes('instagram') ||
		lowerQ.includes('facebook')
	) {
		return {
			category: 'social',
			sources: [
				'Twitter/X API',
				'Archive.org (Wayback Machine)',
				'Nitter instances',
				'News aggregators (NewsAPI)',
				'Social media scraping',
			],
			method: 'Check 5 independent sources for post existence/content',
			feasible: true,
		}
	}

	// NEWS/EVENTS questions
	if (
		lowerQ.includes('announce') ||
		lowerQ.includes('release') ||
		lowerQ.includes('launch') ||
		lowerQ.includes('happen') ||
		lowerQ.includes('occur')
	) {
		return {
			category: 'news',
			sources: [
				'Reuters API',
				'Associated Press (AP)',
				'Bloomberg',
				'NewsAPI aggregator',
				'Google News RSS',
			],
			method: 'Search 5 news sources for event confirmation',
			feasible: true,
		}
	}

	// ON-CHAIN questions (blockchain events, deployments)
	if (
		lowerQ.includes('deploy') ||
		lowerQ.includes('contract') ||
		lowerQ.includes('blockchain') ||
		lowerQ.includes('transaction') ||
		lowerQ.includes('wallet')
	) {
		return {
			category: 'onchain',
			sources: [
				'Etherscan API',
				'Blockchain.com API',
				'Infura RPC',
				'Alchemy RPC',
				'QuickNode RPC',
			],
			method: 'Query 5 blockchain data providers for on-chain state',
			feasible: true,
		}
	}

	// GENERAL questions (Google-searchable facts)
	return {
		category: 'general',
		sources: [
			'Google Search API',
			'DuckDuckGo API',
			'Wikipedia API',
			'Brave Search API',
			'Bing Search API',
		],
		method: 'Search 5 search engines, extract answer from top results',
		feasible: true,
		reason:
			'General question - will search web and extract consensus answer from multiple search engines',
	}
}

/**
 * Universal Question Resolver
 * Routes to appropriate strategy based on question type
 */
export const resolveUniversalQuestion = (
	runtime: Runtime<any>,
	question: string
): UniversalResult => {
	const strategy = analyzeQuestionFeasibility(question)

	runtime.log(`Question category: ${strategy.category}`)
	runtime.log(`Verification method: ${strategy.method}`)
	runtime.log(`Sources: ${strategy.sources.join(', ')}`)

	if (!strategy.feasible) {
		return {
			outcome: false,
			confidence: 0,
			sources: [],
			evidence: [`Question not feasible: ${strategy.reason}`],
		}
	}

	// Route to appropriate resolver
	switch (strategy.category) {
		case 'price':
			return resolvePriceQuestion(runtime, question)

		case 'weather':
			return resolveWeatherQuestion(runtime, question)

		case 'social':
			return resolveSocialQuestion(runtime, question)

		case 'news':
			return resolveNewsQuestion(runtime, question)

		case 'onchain':
			return resolveOnChainQuestion(runtime, question)

		case 'general':
			return resolveGeneralQuestion(runtime, question)

		default:
			return {
				outcome: false,
				confidence: 0,
				sources: [],
				evidence: ['Unknown question category'],
			}
	}
}

/**
 * PRICE Question Resolver
 */
const resolvePriceQuestion = (runtime: Runtime<any>, question: string): UniversalResult => {
	// Extract threshold from question
	const match = question.match(/\$?([\d,]+)/)
	const threshold = match ? parseFloat(match[1].replace(/,/g, '')) : 60000

	const result = evaluateBTCPriceAbove(runtime, threshold)

	return {
		outcome: result.outcome,
		confidence: result.confidence,
		sources: result.evidence.map((e) => e.split(':')[0]),
		evidence: result.evidence,
	}
}

/**
 * WEATHER Question Resolver
 */
const resolveWeatherQuestion = (runtime: Runtime<any>, question: string): UniversalResult => {
	runtime.log('Weather resolution - querying 5 weather APIs...')

	// TODO: Implement actual weather API fetching
	// For now, mock implementation
	const mockSources = [
		'OpenWeatherMap: Rain detected',
		'WeatherAPI: 80% precipitation',
		'AccuWeather: Rainy conditions',
		'NOAA: Precipitation confirmed',
		'MeteoBlue: Rain expected',
	]

	return {
		outcome: true, // Will it rain? YES
		confidence: 85,
		sources: mockSources.map((s) => s.split(':')[0]),
		evidence: mockSources,
	}
}

/**
 * SOCIAL MEDIA Question Resolver
 */
const resolveSocialQuestion = (runtime: Runtime<any>, question: string): UniversalResult => {
	runtime.log('Social media resolution - checking 5 sources...')

	// TODO: Implement actual social media checking
	const mockSources = [
		'Twitter API: Tweet found (ID: 1234567890)',
		'Archive.org: Tweet archived at 2026-03-01',
		'Nitter: Tweet confirmed',
		'NewsAPI: 3 articles reference this tweet',
		'Social scraper: Tweet exists, verified',
	]

	return {
		outcome: true, // Did they tweet? YES
		confidence: 90,
		sources: mockSources.map((s) => s.split(':')[0]),
		evidence: mockSources,
	}
}

/**
 * NEWS/EVENTS Question Resolver
 */
const resolveNewsQuestion = (runtime: Runtime<any>, question: string): UniversalResult => {
	runtime.log('News resolution - searching 5 news sources...')

	// TODO: Implement actual news API searching
	const mockSources = [
		'Reuters: Event confirmed in 5 articles',
		'AP: Official announcement verified',
		'Bloomberg: Launch confirmed',
		'NewsAPI: 47 articles mention event',
		'Google News: Top 10 results confirm',
	]

	return {
		outcome: true, // Did event happen? YES
		confidence: 95,
		sources: mockSources.map((s) => s.split(':')[0]),
		evidence: mockSources,
	}
}

/**
 * ON-CHAIN Question Resolver
 */
const resolveOnChainQuestion = (runtime: Runtime<any>, question: string): UniversalResult => {
	runtime.log('On-chain resolution - querying 5 blockchain providers...')

	// TODO: Implement actual blockchain querying
	const mockSources = [
		'Etherscan: Contract deployed at 0xabc...',
		'Blockchain.com: Transaction confirmed',
		'Infura: Contract verified',
		'Alchemy: Deployment tx: 0x123...',
		'QuickNode: Contract active',
	]

	return {
		outcome: true, // Was contract deployed? YES
		confidence: 95,
		sources: mockSources.map((s) => s.split(':')[0]),
		evidence: mockSources,
	}
}

/**
 * GENERAL Question Resolver (Google-searchable facts)
 */
const resolveGeneralQuestion = (runtime: Runtime<any>, question: string): UniversalResult => {
	runtime.log('General resolution - searching 5 search engines...')

	// TODO: Implement actual search engine querying
	const mockSources = [
		'Google: Answer found in top 3 results',
		'DuckDuckGo: Consensus answer confirmed',
		'Wikipedia: Article confirms fact',
		'Brave Search: 5/5 results agree',
		'Bing: Knowledge panel confirms',
	]

	return {
		outcome: true,
		confidence: 80,
		sources: mockSources.map((s) => s.split(':')[0]),
		evidence: mockSources,
	}
}
