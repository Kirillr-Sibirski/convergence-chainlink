'use client'

import { useState } from 'react'
import { DotsBackground } from '@/components/ui/dots-background'
import { GlassCard, GlassCardHeader, GlassCardTitle, GlassCardDescription, GlassCardContent, GlassCardFooter } from '@/components/ui/glass-card'
import { GlassButton } from '@/components/ui/glass-button'
import { GlassInput } from '@/components/ui/glass-input'
import { GlassTextarea } from '@/components/ui/glass-textarea'
import { GlassBadge } from '@/components/ui/glass-badge'
import QuestionValidator from '../components/QuestionValidator'

export default function Home() {
  const [question, setQuestion] = useState('')
  const [deadline, setDeadline] = useState('')

  return (
    <DotsBackground className="min-h-screen bg-gradient-to-br from-gray-50 via-gray-100 to-gray-50">
      <div className="relative z-10">
        {/* Header */}
        <header className="border-b border-gray-200/50 bg-white/40 backdrop-blur-xl sticky top-0 z-50">
          <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-8">
              <h1 className="text-2xl font-bold tracking-tight text-gray-900">
                ALETHEIA
              </h1>
              <nav className="hidden md:flex items-center gap-6 text-sm">
                <a href="#" className="text-gray-600 hover:text-gray-900 transition-colors font-medium">Markets</a>
                <a href="#" className="text-gray-600 hover:text-gray-900 transition-colors font-medium">Activity</a>
                <a href="#" className="text-gray-600 hover:text-gray-900 transition-colors font-medium">Portfolio</a>
              </nav>
            </div>
            <GlassButton variant="primary" size="default">
              Connect Wallet
            </GlassButton>
          </div>
        </header>

        {/* Main Content */}
        <div className="max-w-7xl mx-auto px-6 py-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

            {/* Markets Feed - 2/3 */}
            <div className="lg:col-span-2 space-y-6">

              {/* Stats */}
              <div className="grid grid-cols-3 gap-4">
                <GlassCard glowEffect={false}>
                  <GlassCardContent className="p-4">
                    <div className="text-xs text-gray-500 mb-1 font-medium">Total Volume</div>
                    <div className="text-2xl font-bold text-gray-900">$2.4M</div>
                  </GlassCardContent>
                </GlassCard>

                <GlassCard glowEffect={false}>
                  <GlassCardContent className="p-4">
                    <div className="text-xs text-gray-500 mb-1 font-medium">Active Markets</div>
                    <div className="text-2xl font-bold text-gray-900">247</div>
                  </GlassCardContent>
                </GlassCard>

                <GlassCard glowEffect={false}>
                  <GlassCardContent className="p-4">
                    <div className="text-xs text-gray-500 mb-1 font-medium">24h Trades</div>
                    <div className="text-2xl font-bold text-gray-900">1,832</div>
                  </GlassCardContent>
                </GlassCard>
              </div>

              {/* Filters */}
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-gray-900">Active Markets</h2>
                <div className="flex gap-2">
                  <GlassButton variant="primary" size="sm">All</GlassButton>
                  <GlassButton variant="outline" size="sm">Crypto</GlassButton>
                  <GlassButton variant="outline" size="sm">Sports</GlassButton>
                  <GlassButton variant="outline" size="sm">News</GlassButton>
                </div>
              </div>

              {/* Market Cards */}
              <div className="space-y-4">
                {MOCK_MARKETS.map((market) => (
                  <MarketCard key={market.id} market={market} />
                ))}
              </div>
            </div>

            {/* Create Market Sidebar - 1/3 */}
            <div className="lg:col-span-1">
              <div className="sticky top-24">
                <GlassCard glowEffect={false}>
                  <GlassCardHeader>
                    <GlassCardTitle>Create Market</GlassCardTitle>
                    <GlassCardDescription>Ask any verifiable question</GlassCardDescription>
                  </GlassCardHeader>

                  <GlassCardContent className="space-y-4">
                    <div>
                      <label className="block text-xs font-semibold mb-2 text-gray-700 uppercase tracking-wide">
                        Question
                      </label>
                      <GlassTextarea
                        value={question}
                        onChange={(e) => setQuestion(e.target.value)}
                        placeholder="Will Bitcoin exceed $100,000 by March 31, 2026?"
                        rows={4}
                      />
                    </div>

                    {question && <QuestionValidator question={question} />}

                    <div>
                      <label className="block text-xs font-semibold mb-2 text-gray-700 uppercase tracking-wide">
                        Deadline
                      </label>
                      <GlassInput
                        type="datetime-local"
                        value={deadline}
                        onChange={(e) => setDeadline(e.target.value)}
                      />
                    </div>
                  </GlassCardContent>

                  <GlassCardFooter className="flex-col gap-4">
                    <GlassButton
                      variant="primary"
                      className="w-full"
                      disabled={!question || !deadline}
                    >
                      Create Market
                    </GlassButton>

                    <div className="text-xs text-gray-600 space-y-2 bg-gray-50/50 p-4 rounded-lg border border-gray-200/50">
                      <p className="font-semibold text-gray-900 text-sm">How it works</p>
                      <div className="space-y-1.5">
                        <p>• Market created on-chain</p>
                        <p>• Users bet YES/NO before deadline</p>
                        <p>• AI discovers 5+ sources to verify</p>
                        <p>• CRE fetches data, DON consensus</p>
                        <p>• Auto-resolution with proof</p>
                      </div>
                    </div>
                  </GlassCardFooter>
                </GlassCard>
              </div>
            </div>

          </div>
        </div>
      </div>
    </DotsBackground>
  )
}

// Market Card Component
function MarketCard({ market }: { market: typeof MOCK_MARKETS[0] }) {
  const yesPercent = (parseFloat(market.yesStake) / parseFloat(market.totalStake)) * 100
  const noPercent = (parseFloat(market.noStake) / parseFloat(market.totalStake)) * 100

  return (
    <GlassCard glowEffect={false} className="hover:shadow-xl transition-shadow cursor-pointer group">
      <GlassCardContent className="p-6">

        {/* Header */}
        <div className="flex items-start justify-between gap-4 mb-4">
          <div className="flex-1">
            <GlassBadge variant="secondary" className="mb-3">
              {market.id % 2 === 0 ? 'CRYPTO' : 'GENERAL'}
            </GlassBadge>
            <h3 className="text-base font-semibold text-gray-900 leading-snug group-hover:text-black transition-colors">
              {market.question}
            </h3>
          </div>
          {market.resolved && (
            <div className="text-right flex-shrink-0">
              <GlassBadge variant="default" className="bg-gray-900 text-white border-gray-800">
                {market.outcome ? 'YES' : 'NO'}
              </GlassBadge>
              <div className="text-xs text-gray-500 mt-2 font-medium">{market.confidence}%</div>
            </div>
          )}
        </div>

        {/* Meta */}
        <div className="flex items-center gap-4 text-xs text-gray-500 mb-4 font-medium">
          <span>📅 {new Date(market.deadline).toLocaleDateString()}</span>
          <span>💰 {market.totalStake}</span>
        </div>

        {/* Probabilities */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="bg-gray-900 text-white p-4 rounded-xl text-center backdrop-blur-sm">
            <div className="text-2xl font-bold">{Math.round(yesPercent)}%</div>
            <div className="text-xs opacity-80 mt-1">YES</div>
          </div>
          <div className="bg-gray-100 border border-gray-200 p-4 rounded-xl text-center backdrop-blur-sm">
            <div className="text-2xl font-bold text-gray-900">{Math.round(noPercent)}%</div>
            <div className="text-xs text-gray-600 mt-1">NO</div>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="h-2 flex rounded-full overflow-hidden border border-gray-200 mb-4 shadow-inner">
          <div className="bg-gray-900" style={{ width: `${yesPercent}%` }} />
          <div className="bg-gray-200" style={{ width: `${noPercent}%` }} />
        </div>

        {/* Actions */}
        {!market.resolved && (
          <div className="flex gap-3">
            <GlassButton variant="primary" className="flex-1">
              Buy YES
            </GlassButton>
            <GlassButton variant="outline" className="flex-1">
              Buy NO
            </GlassButton>
          </div>
        )}

        {market.resolved && (
          <div className="bg-gray-50 border border-gray-200 rounded-xl p-3 text-center backdrop-blur-sm">
            <div className="text-sm font-semibold text-gray-900">Market Resolved</div>
            <div className="text-xs text-gray-500 mt-1">Payouts distributed</div>
          </div>
        )}

      </GlassCardContent>
    </GlassCard>
  )
}

// Mock Data
const MOCK_MARKETS = [
  {
    id: 1,
    question: 'Will Bitcoin exceed $100,000 before April 1, 2026?',
    deadline: '2026-04-01T00:00:00Z',
    resolved: false,
    outcome: false,
    confidence: 0,
    totalStake: '15.2 ETH',
    yesStake: '9.8 ETH',
    noStake: '5.4 ETH',
  },
  {
    id: 2,
    question: 'Will it rain in Tokyo on March 10, 2026?',
    deadline: '2026-03-10T23:59:00Z',
    resolved: true,
    outcome: true,
    confidence: 92,
    totalStake: '8.5 ETH',
    yesStake: '5.1 ETH',
    noStake: '3.4 ETH',
  },
  {
    id: 3,
    question: 'Will Ethereum gas fees stay below 50 gwei on average during March 2026?',
    deadline: '2026-03-31T23:59:00Z',
    resolved: false,
    outcome: false,
    confidence: 0,
    totalStake: '22.7 ETH',
    yesStake: '11.2 ETH',
    noStake: '11.5 ETH',
  },
  {
    id: 4,
    question: 'Will SpaceX successfully launch Starship before March 15, 2026?',
    deadline: '2026-03-15T23:59:00Z',
    resolved: true,
    outcome: true,
    confidence: 88,
    totalStake: '31.4 ETH',
    yesStake: '24.1 ETH',
    noStake: '7.3 ETH',
  },
]
