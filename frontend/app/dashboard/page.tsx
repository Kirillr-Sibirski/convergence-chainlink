"use client";

import { SimpleHeader } from "@/components/layout/SimpleHeader";
import { SpotlightCard } from "@/components/ui/spotlight-card";
import { Button } from "@/components/ui/button";
import { BackgroundBeams } from "@/components/ui/background-beams";
import { TrendingUp } from "lucide-react";
import Link from "next/link";

const MOCK_POSITIONS = [
  {
    id: 1,
    question: "Will AI surpass human-level reasoning on all benchmarks by 2027?",
    side: "NO" as const,
    betUsdc: "120",
    deadline: 1830384000, // Dec 31, 2027
  },
  {
    id: 2,
    question: "Will ETH reach $10,000 by end of Q3 2026?",
    side: "YES" as const,
    betUsdc: "300",
    deadline: 1759276800, // Sep 30 2026
  },
  {
    id: 3,
    question: "Will Bitcoin ETF inflows exceed $5B in March 2026?",
    side: "YES" as const,
    betUsdc: "75",
    deadline: 1743379200, // Mar 31 2026
  },
];

const now = Math.floor(Date.now() / 1000);
const activePositions = MOCK_POSITIONS.filter((p) => p.deadline > now);

export default function DashboardPage() {
  return (
    <div className="min-h-screen relative">
      <SimpleHeader />

      <main className="relative z-10 px-4 py-12">
        <div className="container mx-auto max-w-4xl space-y-6">
          <div>
            <h1 className="text-3xl font-bold mb-1 text-gray-900">My Bets</h1>
            <p className="text-gray-500 text-sm">
              Active bets on oracle-resolved prediction markets
            </p>
          </div>

          {activePositions.length === 0 ? (
            <SpotlightCard className="p-8">
              <div className="text-center space-y-4">
                <div className="w-16 h-16 mx-auto rounded-full bg-primary/10 flex items-center justify-center">
                  <TrendingUp className="w-8 h-8 text-primary" />
                </div>
                <div className="space-y-2">
                  <h3 className="text-lg font-semibold">No Active Bets</h3>
                  <p className="text-sm text-muted-foreground max-w-md mx-auto">
                    You haven't bet on any markets yet. Connect your wallet and
                    browse oracle-resolved prediction markets to begin.
                  </p>
                </div>
                <Button asChild className="mt-4">
                  <Link href="/markets">Browse Markets</Link>
                </Button>
              </div>
            </SpotlightCard>
          ) : (
            <div className="space-y-3">
              {activePositions.map((position) => {
                const daysLeft = Math.ceil((position.deadline - now) / 86400);
                return (
                  <SpotlightCard key={position.id}>
                    <div className="p-5 flex items-center justify-between gap-4">
                      <div className="flex-1 min-w-0 space-y-1">
                        <p className="font-medium text-sm leading-snug">
                          {position.question}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Expires {new Date(position.deadline * 1000).toLocaleDateString()} · {daysLeft}d left
                        </p>
                      </div>

                      <div className="flex items-center gap-4 shrink-0">
                        <div className="text-right space-y-0.5">
                          <p className="text-xs text-muted-foreground">Bet</p>
                          <p className="text-sm font-semibold tabular-nums">${position.betUsdc} USDC</p>
                        </div>
                        <span
                          className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${
                            position.side === "YES"
                              ? "bg-green-50 text-green-700 border-green-200"
                              : "bg-red-50 text-red-700 border-red-200"
                          }`}
                        >
                          {position.side}
                        </span>
                      </div>
                    </div>
                  </SpotlightCard>
                );
              })}

              <p className="text-xs text-muted-foreground px-1">
                {activePositions.length} active bet{activePositions.length !== 1 ? "s" : ""}.
                Expired bets are hidden. Payouts claimed automatically on resolution.
              </p>
            </div>
          )}
        </div>
      </main>
      <BackgroundBeams />
    </div>
  );
}
