"use client";

import { SimpleHeader } from "@/components/layout/SimpleHeader";
import { SpotlightCard } from "@/components/ui/spotlight-card";
import { Button } from "@/components/ui/button";
import { TrendingUp } from "lucide-react";
import { BackgroundBeams } from "@/components/ui/background-beams";
import Link from "next/link";

export default function DashboardPage() {
  return (
    <div className="min-h-screen relative">
      <SimpleHeader />

      <main className="relative z-10 px-4 py-12">
        <div className="container mx-auto max-w-4xl space-y-6">
          <div>
            <h1 className="text-3xl font-bold mb-2 text-gray-900">My Positions</h1>
            <p className="text-gray-500">
              Track your bets and oracle-resolved market outcomes
            </p>
          </div>

          <SpotlightCard className="p-8">
            <div className="text-center space-y-4">
              <div className="w-16 h-16 mx-auto rounded-full bg-primary/10 flex items-center justify-center">
                <TrendingUp className="w-8 h-8 text-primary" />
              </div>
              <div className="space-y-2">
                <h3 className="text-lg font-semibold">No Active Positions</h3>
                <p className="text-sm text-muted-foreground max-w-md mx-auto">
                  You haven't staked on any markets yet. Connect your wallet and
                  browse oracle-resolved prediction markets to begin.
                </p>
              </div>
              <Button asChild className="mt-4">
                <Link href="/">
                  Browse Markets
                </Link>
              </Button>
            </div>
          </SpotlightCard>
        </div>
      </main>
      <BackgroundBeams />
    </div>
  );
}
