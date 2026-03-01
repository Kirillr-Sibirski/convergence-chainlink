'use client'

import { useState } from 'react'
import { GlassCard, GlassCardHeader, GlassCardTitle, GlassCardDescription, GlassCardContent, GlassCardFooter } from './ui/glass-card'
import { GlassButton } from './ui/glass-button'
import { GlassInput } from './ui/glass-input'
import { GlassTextarea } from './ui/glass-textarea'
import QuestionValidator from './QuestionValidator'

interface CreateMarketModalProps {
  onClose: () => void
}

export default function CreateMarketModal({ onClose }: CreateMarketModalProps) {
  const [question, setQuestion] = useState('')
  const [deadline, setDeadline] = useState('')
  const [creating, setCreating] = useState(false)

  const handleCreate = async () => {
    if (!question || !deadline) return

    setCreating(true)
    try {
      // TODO: Connect to smart contract
      console.log('Creating market:', { question, deadline })
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 2000))
      onClose()
    } catch (error) {
      console.error('Failed to create market:', error)
    } finally {
      setCreating(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="w-full max-w-2xl">
        <GlassCard glowEffect={false}>
          <GlassCardHeader>
            <div className="flex items-center justify-between">
              <div>
                <GlassCardTitle>Create Market</GlassCardTitle>
                <GlassCardDescription>Ask any verifiable question</GlassCardDescription>
              </div>
              <button
                onClick={onClose}
                className="text-gray-500 hover:text-gray-900 transition-colors"
              >
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
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
            <div className="flex gap-3 w-full">
              <GlassButton
                variant="outline"
                className="flex-1"
                onClick={onClose}
                disabled={creating}
              >
                Cancel
              </GlassButton>
              <GlassButton
                variant="primary"
                className="flex-1"
                onClick={handleCreate}
                disabled={!question || !deadline || creating}
              >
                {creating ? 'Creating...' : 'Create Market'}
              </GlassButton>
            </div>

            <div className="text-xs text-gray-600 space-y-2 bg-gray-50/50 p-4 rounded-lg border border-gray-200/50 w-full">
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
  )
}
