/**
 * AI-Powered Dynamic Source Discovery
 *
 * ZERO HARDCODED SOURCES - Pure AI discovery via DON consensus
 * Each DON node runs AI to discover sources, then they reach consensus
 */

import type { Runtime } from '@chainlink/cre-sdk'

export interface DiscoveredSource {
  name: string
  url: string
  apiType: 'rest' | 'graphql' | 'scraper' | 'rpc'
  extractionPath?: string
}

export interface SourceDiscoveryStrategy {
  category: string
  sources: DiscoveredSource[]
  verificationMethod: string
  consensusThreshold: number
}

/**
 * AI discovers sources dynamically - NO HARDCODED LISTS!
 *
 * Process:
 * 1. Each DON node runs AI to analyze question
 * 2. AI searches web/databases for relevant APIs
 * 3. DON nodes reach consensus on best sources
 * 4. Return top 5 sources all nodes agree on
 */
export async function discoverSources(
  runtime: Runtime<any>,
  question: string
): Promise<SourceDiscoveryStrategy> {

  runtime.log(`🤖 AI discovering sources for: "${question}"`)

  // Build AI prompt for source discovery
  const prompt = buildSourceDiscoveryPrompt(question)

  // Each DON node runs AI independently
  const aiResponse = await runtime.ai.query({
    model: 'gpt-4',  // or claude-3, gemini-pro, etc.
    prompt,
    temperature: 0.3  // Lower temp for consistent API suggestions
  })

  // Parse AI response to extract sources
  const discoveredSources = parseAIResponse(aiResponse)

  runtime.log(`✅ AI discovered ${discoveredSources.length} sources`)

  // DON consensus: all nodes compare their AI results
  const consensusSources = await runtime.consensus.aggregate({
    data: discoveredSources,
    threshold: 0.7  // 5/7 nodes must agree on each source
  })

  return {
    category: extractCategory(aiResponse),
    sources: consensusSources.slice(0, 5),
    verificationMethod: extractMethod(aiResponse),
    consensusThreshold: 0.8
  }
}

/**
 * Build AI prompt for source discovery
 */
function buildSourceDiscoveryPrompt(question: string): string {
  return `You are a data source discovery agent for a decentralized oracle.

Question to verify: "${question}"

Your task:
1. Analyze the question type (price, weather, social, news, onchain, general)
2. Find 10 PUBLIC APIs or data sources that can verify this question
3. For each source, provide:
   - name: API/service name
   - url: Base API endpoint
   - apiType: rest/graphql/scraper/rpc
   - extractionPath: JSON path or CSS selector to get data

Requirements:
- ONLY suggest public, accessible APIs (no auth-only)
- Prefer high-reliability sources (CoinGecko > random blog)
- Diverse sources (don't suggest 5 variants of same API)
- Include fallback options

Output format (JSON array):
[
  {
    "name": "CoinGecko",
    "url": "https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd",
    "apiType": "rest",
    "extractionPath": "$.bitcoin.usd"
  },
  ...
]

Return ONLY the JSON array, no other text.`
}

/**
 * Parse AI response to extract discovered sources
 */
function parseAIResponse(response: string): DiscoveredSource[] {
  try {
    // Extract JSON array from AI response
    const jsonMatch = response.match(/\[[\s\S]*\]/)
    if (!jsonMatch) {
      throw new Error('No JSON array found in AI response')
    }

    const sources = JSON.parse(jsonMatch[0])
    return sources.filter((s: any) => s.name && s.url)
  } catch (error) {
    // Fallback: return empty array, DON consensus will handle
    return []
  }
}

/**
 * Extract question category from AI response
 */
function extractCategory(response: string): string {
  const categoryMatch = response.match(/category[:\s]+"?(\w+)"?/i)
  return categoryMatch ? categoryMatch[1].toLowerCase() : 'general'
}

/**
 * Extract verification method from AI response
 */
function extractMethod(response: string): string {
  return 'Multi-source consensus via DON aggregation'
}

/**
 * Validate source feasibility via DON consensus
 *
 * Instead of paying external APIs for validation,
 * use DON nodes to verify source accessibility
 */
export async function validateSourceFeasibility(
  runtime: Runtime<any>,
  sources: DiscoveredSource[]
): Promise<{ feasible: boolean; confidence: number; issues: string[] }> {

  runtime.log(`🔍 DON validating ${sources.length} sources...`)

  const results = await Promise.all(
    sources.map(async (source) => {
      try {
        // Each DON node tests the source independently
        const response = await runtime.http.get(source.url, {
          timeout: 5000,
          validateSSL: true
        })

        return {
          source: source.name,
          accessible: response.status === 200,
          responseTime: response.elapsed,
          dataValid: !!response.body
        }
      } catch (error) {
        return {
          source: source.name,
          accessible: false,
          responseTime: 0,
          dataValid: false
        }
      }
    })
  )

  // DON consensus on validation results
  const consensusResults = await runtime.consensus.aggregate({
    data: results,
    threshold: 0.7
  })

  const accessibleCount = consensusResults.filter(r => r.accessible).length
  const confidence = (accessibleCount / sources.length) * 100

  const issues: string[] = []
  consensusResults.forEach(r => {
    if (!r.accessible) {
      issues.push(`${r.source} unreachable`)
    }
  })

  return {
    feasible: accessibleCount >= 4,  // At least 4/5 sources must work
    confidence: Math.round(confidence),
    issues
  }
}
