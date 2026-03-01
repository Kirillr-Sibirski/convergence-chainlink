'use client'

import { useState, useEffect } from 'react'

interface ValidationResult {
  feasible: boolean
  category: string
  sources: string[]
  confidence: number
  suggestions: string[]
  estimatedCost: string
  estimatedTime: string
}

interface Props {
  question: string
}

export default function QuestionValidator({ question }: Props) {
  const [result, setResult] = useState<ValidationResult | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!question || question.length < 10) {
      setResult(null)
      return
    }

    setLoading(true)

    // Simulate AI analysis (in production, this would call the AI source discovery API)
    const analyze = async () => {
      await new Promise(resolve => setTimeout(resolve, 500))

      const analyzed = analyzeQuestion(question)
      setResult(analyzed)
      setLoading(false)
    }

    analyze()
  }, [question])

  if (!question || question.length < 10) return null

  return (
    <div className={`border p-4 rounded-lg ${
      result?.feasible ? 'border-green-500 bg-green-50' : 'border-yellow-500 bg-yellow-50'
    }`}>
      {loading ? (
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <div className="animate-spin h-4 w-4 border-2 border-gray-400 border-t-transparent rounded-full" />
          <span>AI analyzing question...</span>
        </div>
      ) : result ? (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {result.feasible ? (
                <span className="text-green-600 text-xl">✓</span>
              ) : (
                <span className="text-yellow-600 text-xl">⚠</span>
              )}
              <span className="font-medium text-sm">
                {result.feasible ? 'Question is verifiable' : 'Question may need refinement'}
              </span>
            </div>
            <span className="text-xs text-gray-500">
              {result.confidence}% confidence
            </span>
          </div>

          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-gray-600 text-xs uppercase mb-1">Category</p>
              <p className="font-medium">{result.category}</p>
            </div>
            <div>
              <p className="text-gray-600 text-xs uppercase mb-1">Sources</p>
              <p className="font-medium">{result.sources.length} discovered</p>
            </div>
            <div>
              <p className="text-gray-600 text-xs uppercase mb-1">Est. Cost</p>
              <p className="font-medium">{result.estimatedCost}</p>
            </div>
            <div>
              <p className="text-gray-600 text-xs uppercase mb-1">Est. Time</p>
              <p className="font-medium">{result.estimatedTime}</p>
            </div>
          </div>

          <details className="text-sm">
            <summary className="cursor-pointer text-gray-700 font-medium mb-2">
              AI-Selected Sources ({result.sources.length})
            </summary>
            <ul className="list-disc list-inside space-y-1 text-gray-600 ml-2">
              {result.sources.map((source, i) => (
                <li key={i}>{source}</li>
              ))}
            </ul>
          </details>

          {result.suggestions.length > 0 && (
            <div className="border-t pt-3">
              <p className="text-xs font-medium text-gray-700 mb-2">Suggestions:</p>
              <ul className="list-disc list-inside space-y-1 text-xs text-gray-600 ml-2">
                {result.suggestions.map((suggestion, i) => (
                  <li key={i}>{suggestion}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      ) : null}
    </div>
  )
}

/**
 * AI Question Analyzer (Client-side simulation)
 * In production, this would call the backend AI source discovery API
 */
function analyzeQuestion(question: string): ValidationResult {
  const q = question.toLowerCase()

  // Detect category
  let category = 'general'
  let sources: string[] = []
  let feasible = true
  let confidence = 85
  let suggestions: string[] = []

  if (q.match(/(btc|eth|price|stock|\$|usd)/i)) {
    category = 'PRICE'
    sources = ['CoinGecko', 'Binance', 'Coinbase', 'Kraken', 'CoinCap']
    confidence = 95
  } else if (q.match(/(rain|snow|temperature|weather)/i)) {
    category = 'WEATHER'
    sources = ['OpenWeatherMap', 'WeatherAPI', 'AccuWeather', 'NOAA', 'Tomorrow.io']
    confidence = 90
  } else if (q.match(/(tweet|twitter|post|social)/i)) {
    category = 'SOCIAL'
    sources = ['Twitter API', 'Nitter', 'Archive.org', 'NewsAPI', 'Google Search']
    confidence = 80
    if (!q.includes('on ') && !q.includes('before')) {
      suggestions.push('Add specific date/time (e.g., "on March 5th")')
      confidence -= 10
    }
  } else if (q.match(/(announce|launch|release|elect)/i)) {
    category = 'NEWS'
    sources = ['Reuters', 'AP', 'BBC', 'NewsAPI', 'Google News']
    confidence = 88
  } else if (q.match(/(gas|gwei|block|contract|ethereum)/i)) {
    category = 'ONCHAIN'
    sources = ['Etherscan', 'Infura', 'Alchemy', 'QuickNode', 'Chainstack']
    confidence = 92
  } else {
    category = 'GENERAL'
    sources = ['Google', 'Bing', 'DuckDuckGo', 'Brave', 'Wikipedia']
    confidence = 75
    suggestions.push('Consider making question more specific for better accuracy')
  }

  // Check for clear threshold/criteria
  if (!q.match(/(above|below|exceed|reach|over|under|\d+)/i)) {
    suggestions.push('Add clear threshold (e.g., "above $60,000")')
    confidence -= 10
    feasible = confidence > 60
  }

  // Check for specific date
  if (!q.match(/(on|before|after|by) \w+ \d+/i) && !q.match(/\d{4}/)) {
    suggestions.push('Specify exact date/time for verification')
    confidence -= 5
  }

  // Check if too vague
  if (q.length < 20) {
    suggestions.push('Add more details for reliable verification')
    feasible = false
  }

  return {
    feasible,
    category,
    sources,
    confidence,
    suggestions,
    estimatedCost: '$0.10 - $0.50',
    estimatedTime: '2-5 minutes after deadline'
  }
}
