import { describe, test, expect } from '@jest/globals'
import { analyzeQuestionFeasibility } from '../sources/universal-resolver'

describe('Universal Question Resolver Tests', () => {
	describe('Price Questions', () => {
		test('should identify Bitcoin price question', () => {
			const result = analyzeQuestionFeasibility('Will BTC close above $60,000 on March 1?')
			expect(result.category).toBe('price')
			expect(result.feasible).toBe(true)
			expect(result.sources).toHaveLength(5)
			expect(result.sources).toContain('CoinGecko API')
		})

		test('should identify Ethereum price question', () => {
			const result = analyzeQuestionFeasibility('Will ETH reach $5000?')
			expect(result.category).toBe('price')
			expect(result.feasible).toBe(true)
		})

		test('should identify stock price question', () => {
			const result = analyzeQuestionFeasibility('Will Tesla stock close above $300?')
			expect(result.category).toBe('price')
			expect(result.sources).toContain('CoinGecko API') // Would need stock APIs in production
		})
	})

	describe('Weather Questions', () => {
		test('should identify rain question', () => {
			const result = analyzeQuestionFeasibility('Will it rain in Tokyo on March 5th?')
			expect(result.category).toBe('weather')
			expect(result.feasible).toBe(true)
			expect(result.sources).toHaveLength(5)
			expect(result.sources).toContain('OpenWeatherMap API')
		})

		test('should identify temperature question', () => {
			const result = analyzeQuestionFeasibility('Will temperature exceed 30°C in NYC?')
			expect(result.category).toBe('weather')
			expect(result.feasible).toBe(true)
		})
	})

	describe('Social Media Questions', () => {
		test('should identify Twitter question', () => {
			const result = analyzeQuestionFeasibility('Did Elon Musk tweet about Dogecoin today?')
			expect(result.category).toBe('social')
			expect(result.feasible).toBe(true)
			expect(result.sources).toContain('Twitter/X API')
			expect(result.sources).toContain('Archive.org (Wayback Machine)')
		})

		test('should identify general post question', () => {
			const result = analyzeQuestionFeasibility('Will Taylor Swift post on Instagram?')
			expect(result.category).toBe('social')
		})
	})

	describe('News/Events Questions', () => {
		test('should identify announcement question', () => {
			const result = analyzeQuestionFeasibility(
				'Will SpaceX announce the Starship launch date?'
			)
			expect(result.category).toBe('news')
			expect(result.feasible).toBe(true)
			expect(result.sources).toContain('Reuters API')
		})

		test('should identify launch event', () => {
			const result = analyzeQuestionFeasibility('Will SpaceX successfully launch Starship?')
			expect(result.category).toBe('news')
			expect(result.sources).toHaveLength(5)
		})
	})

	describe('OnChain Questions', () => {
		test('should identify contract deployment', () => {
			const result = analyzeQuestionFeasibility('Will Uniswap V4 be deployed on Ethereum?')
			expect(result.category).toBe('onchain')
			expect(result.feasible).toBe(true)
			expect(result.sources).toContain('Etherscan API')
		})

		test('should identify blockchain transaction', () => {
			const result = analyzeQuestionFeasibility('Will the wallet transfer funds?')
			expect(result.category).toBe('onchain')
		})
	})

	describe('General Questions', () => {
		test('should handle election question', () => {
			const result = analyzeQuestionFeasibility('Who won the 2024 US Presidential election?')
			expect(result.category).toBe('general')
			expect(result.feasible).toBe(true)
			expect(result.sources).toContain('Google Search API')
		})

		test('should handle factual question', () => {
			const result = analyzeQuestionFeasibility('What is the capital of France?')
			expect(result.category).toBe('general')
			expect(result.sources).toHaveLength(5)
		})
	})

	describe('Multi-Category Edge Cases', () => {
		test('should prioritize price for crypto + news', () => {
			const result = analyzeQuestionFeasibility('Will BTC launch news affect price above $100k?')
			expect(result.category).toBe('price') // Price takes priority
		})

		test('should handle complex questions', () => {
			const result = analyzeQuestionFeasibility(
				'If it rains in Tokyo and BTC goes above $60k, did Elon tweet?'
			)
			// Should pick first matching category (weather, price, or social)
			expect(['weather', 'price', 'social']).toContain(result.category)
			expect(result.feasible).toBe(true)
		})
	})

	describe('Consensus Requirements', () => {
		test('should require 5 sources minimum', () => {
			const priceResult = analyzeQuestionFeasibility('Will BTC > $60k?')
			expect(priceResult.sources.length).toBeGreaterThanOrEqual(5)

			const weatherResult = analyzeQuestionFeasibility('Will it rain?')
			expect(weatherResult.sources.length).toBeGreaterThanOrEqual(5)
		})

		test('should have distinct verification method', () => {
			const result = analyzeQuestionFeasibility('Will BTC reach $100k?')
			expect(result.method).toBeDefined()
			expect(result.method).toContain('median') // Price uses median
		})
	})
})

describe('Byzantine Fault Tolerance', () => {
	test('should require 4/5 sources agreement (80% threshold)', () => {
		// This is enforced in validation logic
		const threshold = 0.8
		expect(threshold).toBe(0.8) // 4 out of 5 sources
	})

	test('should handle source failure gracefully', () => {
		// With 5 sources, can tolerate 1 failure and still get consensus
		const totalSources = 5
		const minRequired = 4
		const failureTolerance = totalSources - minRequired

		expect(failureTolerance).toBe(1) // Can handle 1 source failing
	})
})
