'use client'

import { useState, useEffect } from 'react'
import QuestionValidator from '../components/QuestionValidator'

export default function Home() {
  const [activeTab, setActiveTab] = useState<'markets' | 'create'>('markets')
  const [question, setQuestion] = useState('')
  const [deadline, setDeadline] = useState('')

  useEffect(() => {
    // Initialize liquid glass after liquidGL loads
    const initGlass = () => {
      if (typeof window !== 'undefined' && (window as any).liquidGL) {
        try {
          (window as any).liquidGL({
            target: ".liquidGL",
            snapshot: "body",
            resolution: 2.5,
            refraction: 0.02,
            bevelDepth: 0.12,
            bevelWidth: 0.25,
            frost: 3,
            shadow: true,
            specular: true,
            reveal: "fade",
            tilt: true,
            magnify: 1.05
          })
        } catch (err) {
          console.error('LiquidGL failed:', err)
        }
      }
    }

    // Wait for scripts to load
    setTimeout(initGlass, 1500)
  }, [])

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Compact Header */}
      <header className="border-b-2 border-black bg-white">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <h1 className="text-2xl font-bold border-b-4 border-black inline-block pb-1">ALETHEIA</h1>
          <button className="px-5 py-2 bg-black text-white text-sm font-medium hover:bg-gray-800 transition-colors">
            Connect Wallet
          </button>
        </div>
      </header>

      {/* Main Content - No tabs, side-by-side */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">

          {/* LEFT: Create Market (Prominent) */}
          <div className="lg:col-span-2">
            <div className="liquidGL sticky top-8">
              <div className="content bg-white border-2 border-black p-6">
                <h2 className="text-xl font-bold mb-1">Create Market</h2>
                <p className="text-xs text-gray-600 mb-6">Ask any verifiable question</p>

                <div className="space-y-4">
                  {/* Question Input */}
                  <div>
                    <label className="block text-sm font-medium mb-2">Question</label>
                    <textarea
                      value={question}
                      onChange={(e) => setQuestion(e.target.value)}
                      placeholder="Will Bitcoin exceed $100,000 by March 31, 2026?"
                      className="w-full px-3 py-2 border-2 border-gray-300 focus:border-black focus:outline-none text-sm resize-none"
                      rows={3}
                    />
                  </div>

                  {/* AI Validator */}
                  {question && <QuestionValidator question={question} />}

                  {/* Deadline */}
                  <div>
                    <label className="block text-sm font-medium mb-2">Deadline</label>
                    <input
                      type="datetime-local"
                      value={deadline}
                      onChange={(e) => setDeadline(e.target.value)}
                      className="w-full px-3 py-2 border-2 border-gray-300 focus:border-black focus:outline-none text-sm"
                    />
                  </div>

                  {/* Submit */}
                  <button
                    disabled={!question || !deadline}
                    className="w-full py-3 bg-black text-white font-medium hover:bg-gray-800 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
                  >
                    Create Market
                  </button>

                  {/* Info */}
                  <div className="text-xs text-gray-600 border-l-2 border-gray-300 pl-3 space-y-1">
                    <p className="font-medium text-black">How it works:</p>
                    <p>1. Market created on-chain</p>
                    <p>2. Users bet YES/NO before deadline</p>
                    <p>3. AI discovers 5+ sources to verify</p>
                    <p>4. CRE fetches data, DON consensus</p>
                    <p>5. Auto-resolution with proof</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* RIGHT: Active Markets (Feed) */}
          <div className="lg:col-span-3">
            <div className="mb-6">
              <h2 className="text-xl font-bold mb-1">Active Markets</h2>
              <p className="text-xs text-gray-600">Live prediction markets powered by CRE</p>
            </div>

            <div className="space-y-4">
              {MOCK_MARKETS.map((market) => (
                <MarketCard key={market.id} market={market} />
              ))}
            </div>
          </div>

        </div>
      </div>
    </div>
  )
}

// Market Card Component
function MarketCard({ market }: { market: typeof MOCK_MARKETS[0] }) {
  return (
    <div className="liquidGL">
      <div className="content bg-white border-2 border-gray-200 hover:border-black transition-colors cursor-pointer">
        <div className="p-5">

          {/* Question */}
          <div className="flex items-start justify-between gap-4 mb-4">
            <h3 className="text-base font-medium flex-1">{market.question}</h3>
            {market.resolved && (
              <div className="text-right">
                <div className="inline-block px-2 py-1 bg-black text-white text-xs font-medium">
                  {market.outcome ? 'YES' : 'NO'}
                </div>
                <div className="text-xs text-gray-500 mt-1">{market.confidence}% confidence</div>
              </div>
            )}
          </div>

          {/* Meta */}
          <div className="flex items-center gap-3 text-xs text-gray-600 mb-3">
            <span>Deadline: {new Date(market.deadline).toLocaleDateString()}</span>
            <span>·</span>
            <span>Pool: {market.totalStake}</span>
          </div>

          {/* Betting Bar */}
          <div className="h-6 flex border-2 border-gray-300 mb-3">
            <div
              className="bg-black flex items-center justify-center text-white text-xs font-medium"
              style={{ width: `${(parseFloat(market.yesStake) / parseFloat(market.totalStake)) * 100}%` }}
            >
              YES {market.yesStake}
            </div>
            <div
              className="bg-gray-200 flex items-center justify-center text-black text-xs font-medium"
              style={{ width: `${(parseFloat(market.noStake) / parseFloat(market.totalStake)) * 100}%` }}
            >
              NO {market.noStake}
            </div>
          </div>

          {/* Actions */}
          {!market.resolved && (
            <div className="flex gap-2">
              <button className="flex-1 py-2 bg-black text-white text-xs font-medium hover:bg-gray-800 transition-colors">
                Bet YES
              </button>
              <button className="flex-1 py-2 border-2 border-black text-black text-xs font-medium hover:bg-gray-100 transition-colors">
                Bet NO
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
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
