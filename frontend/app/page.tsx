'use client'

import { useState, useEffect } from 'react'
import QuestionValidator from '../components/QuestionValidator'

export default function Home() {
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
            resolution: 3.0,
            refraction: 0.05,
            bevelDepth: 0.2,
            bevelWidth: 0.4,
            frost: 6,
            shadow: true,
            specular: true,
            reveal: "fade",
            tilt: true,
            magnify: 1.1
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
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100">
      {/* Header with glassmorphism */}
      <div className="liquidGL">
        <header className="content border-b border-gray-200/50 backdrop-blur-xl bg-white/60 sticky top-0 z-50">
          <div className="max-w-7xl mx-auto px-6 py-5 flex items-center justify-between">
            <div className="flex items-center gap-8">
              <h1 className="text-2xl font-bold tracking-tight">
                <span className="border-b-4 border-black inline-block pb-1">ALETHEIA</span>
              </h1>
              <nav className="hidden md:flex items-center gap-6 text-sm">
                <a href="#" className="text-gray-600 hover:text-black transition-colors font-medium">Markets</a>
                <a href="#" className="text-gray-600 hover:text-black transition-colors font-medium">Activity</a>
                <a href="#" className="text-gray-600 hover:text-black transition-colors font-medium">Portfolio</a>
              </nav>
            </div>
            <div className="liquidGL">
              <button className="content px-6 py-2.5 bg-black text-white text-sm font-semibold hover:bg-gray-900 transition-all rounded-lg">
                Connect Wallet
              </button>
            </div>
          </div>
        </header>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* LEFT: Markets Feed (2/3 width) */}
          <div className="lg:col-span-2 space-y-6">
            {/* Stats Bar */}
            <div className="grid grid-cols-3 gap-4">
              <div className="liquidGL">
                <div className="content bg-white/70 backdrop-blur-xl border border-gray-200/50 p-4 rounded-xl">
                  <div className="text-xs text-gray-500 mb-1">Total Volume</div>
                  <div className="text-2xl font-bold">$2.4M</div>
                </div>
              </div>
              <div className="liquidGL">
                <div className="content bg-white/70 backdrop-blur-xl border border-gray-200/50 p-4 rounded-xl">
                  <div className="text-xs text-gray-500 mb-1">Active Markets</div>
                  <div className="text-2xl font-bold">247</div>
                </div>
              </div>
              <div className="liquidGL">
                <div className="content bg-white/70 backdrop-blur-xl border border-gray-200/50 p-4 rounded-xl">
                  <div className="text-xs text-gray-500 mb-1">24h Trades</div>
                  <div className="text-2xl font-bold">1,832</div>
                </div>
              </div>
            </div>

            {/* Markets Header */}
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold">Active Markets</h2>
              <div className="flex gap-2">
                <div className="liquidGL">
                  <button className="content px-4 py-2 text-sm bg-black text-white rounded-lg font-medium">
                    All
                  </button>
                </div>
                <div className="liquidGL">
                  <button className="content px-4 py-2 text-sm bg-white/70 backdrop-blur-sm border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                    Crypto
                  </button>
                </div>
                <div className="liquidGL">
                  <button className="content px-4 py-2 text-sm bg-white/70 backdrop-blur-sm border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                    Sports
                  </button>
                </div>
              </div>
            </div>

            {/* Market Cards */}
            <div className="space-y-4">
              {MOCK_MARKETS.map((market) => (
                <MarketCard key={market.id} market={market} />
              ))}
            </div>
          </div>

          {/* RIGHT: Create Market (1/3 width, sticky) */}
          <div className="lg:col-span-1">
            <div className="liquidGL sticky top-24">
              <div className="content bg-white/80 backdrop-blur-xl border border-gray-200/50 p-6 rounded-2xl shadow-xl">
                <h2 className="text-lg font-bold mb-1">Create Market</h2>
                <p className="text-xs text-gray-500 mb-5">Ask any verifiable question</p>

                <div className="space-y-4">
                  {/* Question Input */}
                  <div>
                    <label className="block text-xs font-semibold mb-2 text-gray-700 uppercase tracking-wide">Question</label>
                    <div className="liquidGL">
                      <textarea
                        value={question}
                        onChange={(e) => setQuestion(e.target.value)}
                        placeholder="Will Bitcoin exceed $100,000 by March 31, 2026?"
                        className="content w-full px-4 py-3 border border-gray-200/50 focus:border-gray-400 focus:outline-none text-sm resize-none bg-white/60 backdrop-blur-lg rounded-xl"
                        rows={4}
                      />
                    </div>
                  </div>

                  {/* AI Validator */}
                  {question && <QuestionValidator question={question} />}

                  {/* Deadline */}
                  <div>
                    <label className="block text-xs font-semibold mb-2 text-gray-700 uppercase tracking-wide">Deadline</label>
                    <div className="liquidGL">
                      <input
                        type="datetime-local"
                        value={deadline}
                        onChange={(e) => setDeadline(e.target.value)}
                        className="content w-full px-4 py-3 border border-gray-200/50 focus:border-gray-400 focus:outline-none text-sm bg-white/60 backdrop-blur-lg rounded-xl"
                      />
                    </div>
                  </div>

                  {/* Submit */}
                  <div className="liquidGL">
                    <button
                      disabled={!question || !deadline}
                      className="content w-full py-3.5 bg-black text-white font-semibold hover:bg-gray-900 transition-all disabled:bg-gray-300 disabled:cursor-not-allowed rounded-xl text-sm"
                    >
                      Create Market
                    </button>
                  </div>

                  {/* Info */}
                  <div className="liquidGL">
                    <div className="content text-xs text-gray-600 border-l-2 border-gray-300 pl-4 space-y-2 bg-gradient-to-br from-gray-50/80 to-white/80 p-4 backdrop-blur-sm rounded-lg">
                      <p className="font-semibold text-black text-sm mb-2">How it works</p>
                      <div className="space-y-1.5">
                        <p className="flex items-start gap-2">
                          <span className="text-gray-400">1.</span>
                          <span>Market created on-chain</span>
                        </p>
                        <p className="flex items-start gap-2">
                          <span className="text-gray-400">2.</span>
                          <span>Users bet YES/NO before deadline</span>
                        </p>
                        <p className="flex items-start gap-2">
                          <span className="text-gray-400">3.</span>
                          <span>AI discovers 5+ sources to verify</span>
                        </p>
                        <p className="flex items-start gap-2">
                          <span className="text-gray-400">4.</span>
                          <span>CRE fetches data, DON consensus</span>
                        </p>
                        <p className="flex items-start gap-2">
                          <span className="text-gray-400">5.</span>
                          <span>Auto-resolution with proof</span>
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  )
}

// Market Card Component
function MarketCard({ market }: { market: typeof MOCK_MARKETS[0] }) {
  const yesPercent = (parseFloat(market.yesStake) / parseFloat(market.totalStake)) * 100
  const noPercent = (parseFloat(market.noStake) / parseFloat(market.totalStake)) * 100

  return (
    <div className="liquidGL group">
      <div className="content bg-white/70 backdrop-blur-xl border border-gray-200/50 hover:border-gray-300 hover:shadow-2xl transition-all cursor-pointer rounded-2xl overflow-hidden">
        <div className="p-6">

          {/* Header with category badge */}
          <div className="flex items-start justify-between gap-4 mb-3">
            <div className="flex-1">
              <div className="liquidGL inline-block mb-3">
                <div className="content px-3 py-1 bg-gradient-to-r from-gray-100 to-gray-50 border border-gray-200 rounded-full text-xs font-semibold text-gray-700">
                  {market.id % 2 === 0 ? 'CRYPTO' : 'GENERAL'}
                </div>
              </div>
              <h3 className="text-base font-semibold text-gray-900 leading-snug group-hover:text-black transition-colors">
                {market.question}
              </h3>
            </div>
            {market.resolved && (
              <div className="text-right flex-shrink-0">
                <div className="liquidGL inline-block">
                  <div className="content px-3 py-1.5 bg-black text-white text-xs font-bold rounded-lg">
                    {market.outcome ? 'YES' : 'NO'}
                  </div>
                </div>
                <div className="text-xs text-gray-500 mt-2 font-medium">{market.confidence}% confidence</div>
              </div>
            )}
          </div>

          {/* Meta */}
          <div className="flex items-center gap-4 text-xs text-gray-500 mb-4 font-medium">
            <span className="flex items-center gap-1.5">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {new Date(market.deadline).toLocaleDateString()}
            </span>
            <span className="flex items-center gap-1.5">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {market.totalStake}
            </span>
          </div>

          {/* Probability Display */}
          <div className="grid grid-cols-2 gap-3 mb-4">
            <div className="liquidGL">
              <div className="content bg-gradient-to-br from-gray-900 to-black text-white p-4 rounded-xl text-center">
                <div className="text-2xl font-bold">{Math.round(yesPercent)}%</div>
                <div className="text-xs opacity-80 mt-1">YES</div>
              </div>
            </div>
            <div className="liquidGL">
              <div className="content bg-gradient-to-br from-gray-100 to-gray-50 border border-gray-200 p-4 rounded-xl text-center">
                <div className="text-2xl font-bold text-gray-900">{Math.round(noPercent)}%</div>
                <div className="text-xs text-gray-600 mt-1">NO</div>
              </div>
            </div>
          </div>

          {/* Betting Bar */}
          <div className="liquidGL mb-4">
            <div className="content h-2 flex rounded-full overflow-hidden border border-gray-200/50">
              <div
                className="bg-gradient-to-r from-gray-900 to-black"
                style={{ width: `${yesPercent}%` }}
              />
              <div
                className="bg-gradient-to-r from-gray-200 to-gray-100"
                style={{ width: `${noPercent}%` }}
              />
            </div>
          </div>

          {/* Actions */}
          {!market.resolved && (
            <div className="flex gap-3">
              <div className="liquidGL flex-1">
                <button className="content w-full py-3 bg-black text-white text-sm font-semibold hover:bg-gray-900 transition-all rounded-xl">
                  Buy YES
                </button>
              </div>
              <div className="liquidGL flex-1">
                <button className="content w-full py-3 border border-gray-300 text-gray-900 text-sm font-semibold hover:bg-gray-50 transition-all bg-white/60 backdrop-blur-sm rounded-xl">
                  Buy NO
                </button>
              </div>
            </div>
          )}

          {market.resolved && (
            <div className="liquidGL">
              <div className="content bg-gradient-to-r from-gray-50 to-white border border-gray-200 rounded-xl p-3 text-center">
                <div className="text-sm font-semibold text-gray-700">Market Resolved</div>
                <div className="text-xs text-gray-500 mt-1">Payouts distributed</div>
              </div>
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
