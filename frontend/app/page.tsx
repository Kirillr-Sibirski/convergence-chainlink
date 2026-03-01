'use client'

import { useState, useEffect } from 'react'
import QuestionValidator from '../components/QuestionValidator'

export default function Home() {
  const [activeTab, setActiveTab] = useState<'create' | 'markets'>('markets')

  return (
    <main className="min-h-screen bg-white">
      {/* Header */}
      <header className="border-b border-black">
        <div className="max-w-6xl mx-auto px-6 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <img src="/logo.png" alt="Aletheia" className="h-12 w-12" />
              <div>
                <h1 className="text-3xl font-bold tracking-tight">ALETHEIA</h1>
                <p className="text-sm text-gray-600 mt-1">Truth Oracle · Powered by Chainlink CRE</p>
              </div>
            </div>
            <button className="px-6 py-2 bg-black text-white text-sm font-medium hover:bg-gray-800 transition-colors">
              Connect Wallet
            </button>
          </div>
        </div>
      </header>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-6">
          <div className="flex gap-8">
            <button
              onClick={() => setActiveTab('markets')}
              className={`py-4 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'markets'
                  ? 'border-black text-black'
                  : 'border-transparent text-gray-500 hover:text-black'
              }`}
            >
              Markets
            </button>
            <button
              onClick={() => setActiveTab('create')}
              className={`py-4 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'create'
                  ? 'border-black text-black'
                  : 'border-transparent text-gray-500 hover:text-black'
              }`}
            >
              Create Market
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-6xl mx-auto px-6 py-12">
        {activeTab === 'markets' ? <MarketsView /> : <CreateMarketView />}
      </div>
    </main>
  )
}

function MarketsView() {
  const markets = [
    {
      id: 1,
      question: 'Will BTC close above $60,000 on March 1, 2026?',
      deadline: '2026-03-01T23:59:00Z',
      resolved: true,
      outcome: true,
      confidence: 95,
      totalStake: '12.5 ETH',
      yesStake: '8.2 ETH',
      noStake: '4.3 ETH',
    },
    {
      id: 2,
      question: 'Will it rain in Tokyo on March 5, 2026?',
      deadline: '2026-03-05T23:59:00Z',
      resolved: false,
      totalStake: '5.8 ETH',
      yesStake: '3.1 ETH',
      noStake: '2.7 ETH',
    },
  ]

  return (
    <div className="space-y-6">
      {markets.map((market) => (
        <div
          key={market.id}
          className="border border-gray-200 hover:border-black transition-colors cursor-pointer"
        >
          <div className="p-6">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <h3 className="text-lg font-medium mb-2">{market.question}</h3>
                <div className="flex items-center gap-4 text-sm text-gray-600">
                  <span>Deadline: {new Date(market.deadline).toLocaleDateString()}</span>
                  <span>·</span>
                  <span>Total: {market.totalStake}</span>
                </div>
              </div>
              {market.resolved && (
                <div className="text-right">
                  <div className="inline-flex items-center gap-2 px-3 py-1 bg-black text-white text-xs font-medium">
                    RESOLVED: {market.outcome ? 'YES' : 'NO'}
                  </div>
                  <div className="text-xs text-gray-600 mt-1">{market.confidence}% confidence</div>
                </div>
              )}
            </div>

            {/* Betting Bar */}
            <div className="mt-4">
              <div className="flex h-8 overflow-hidden border border-gray-300">
                <div
                  className="bg-black flex items-center justify-center text-white text-xs font-medium"
                  style={{
                    width: `${(parseFloat(market.yesStake) / parseFloat(market.totalStake)) * 100}%`,
                  }}
                >
                  YES {market.yesStake}
                </div>
                <div
                  className="bg-gray-200 flex items-center justify-center text-black text-xs font-medium"
                  style={{
                    width: `${(parseFloat(market.noStake) / parseFloat(market.totalStake)) * 100}%`,
                  }}
                >
                  NO {market.noStake}
                </div>
              </div>
            </div>

            {!market.resolved && (
              <div className="mt-4 flex gap-3">
                <button className="flex-1 py-2 bg-black text-white text-sm font-medium hover:bg-gray-800 transition-colors">
                  Bet YES
                </button>
                <button className="flex-1 py-2 border border-black text-black text-sm font-medium hover:bg-gray-100 transition-colors">
                  Bet NO
                </button>
              </div>
            )}
          </div>
        </div>
      ))}

      {markets.length === 0 && (
        <div className="text-center py-16 border border-dashed border-gray-300">
          <p className="text-gray-500">No markets yet. Create one to get started.</p>
        </div>
      )}
    </div>
  )
}

function CreateMarketView() {
  const [question, setQuestion] = useState('')
  const [deadline, setDeadline] = useState('')
  const [category, setCategory] = useState<string>('auto')

  return (
    <div className="max-w-2xl">
      <h2 className="text-2xl font-bold mb-6">Create Prediction Market</h2>

      <div className="space-y-6">
        {/* Question */}
        <div>
          <label className="block text-sm font-medium mb-2">Question</label>
          <input
            type="text"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="Will Bitcoin close above $60,000 on March 1, 2026?"
            className="w-full px-4 py-3 border border-gray-300 focus:border-black focus:outline-none text-sm"
          />
          <p className="text-xs text-gray-500 mt-1">
            Ask any verifiable question. AI will automatically determine how to verify it.
          </p>
        </div>

        {/* AI Question Validator */}
        {question && <QuestionValidator question={question} />}

        {/* Deadline */}
        <div>
          <label className="block text-sm font-medium mb-2">Deadline</label>
          <input
            type="datetime-local"
            value={deadline}
            onChange={(e) => setDeadline(e.target.value)}
            className="w-full px-4 py-3 border border-gray-300 focus:border-black focus:outline-none text-sm"
          />
          <p className="text-xs text-gray-500 mt-1">
            Market will auto-resolve 5 minutes after this deadline via CRON trigger
          </p>
        </div>

        {/* Submit */}
        <button className="w-full py-3 bg-black text-white font-medium hover:bg-gray-800 transition-colors">
          Create Market
        </button>

        {/* Info */}
        <div className="border-l-2 border-gray-300 pl-4 text-sm text-gray-600">
          <p className="font-medium text-black mb-1">How it works:</p>
          <ol className="list-decimal list-inside space-y-1">
            <li>Market is created on-chain</li>
            <li>Users can bet YES or NO before deadline</li>
            <li>After deadline, CRE CRON checks every 5 minutes</li>
            <li>AI selects 5 sources based on question type</li>
            <li>CRE fetches data, calculates consensus (4/5 sources must agree)</li>
            <li>Resolution written on-chain with confidence score</li>
            <li>Winners can claim payouts automatically</li>
          </ol>
        </div>
      </div>
    </div>
  )
}
