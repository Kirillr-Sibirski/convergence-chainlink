"use client";

import { SimpleHeader } from "@/components/layout/SimpleHeader";
import { SpotlightCard } from "@/components/ui/spotlight-card";

export default function DashboardPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <SimpleHeader />
      <main className="flex-1 bg-gradient-radial from-primary/5 via-background to-background">
        <div className="container mx-auto px-6 py-12">
          <div className="max-w-4xl mx-auto space-y-6">
            <div>
              <h1 className="text-3xl font-bold mb-2">My Bets</h1>
              <p className="text-muted-foreground">
                View and manage your prediction market positions
              </p>
            </div>

            <SpotlightCard className="p-8">
              <div className="text-center space-y-3">
                <h3 className="text-lg font-semibold">No Active Bets</h3>
                <p className="text-sm text-muted-foreground max-w-md mx-auto">
                  You haven't placed any bets yet. Connect your wallet and visit
                  the Markets page to get started.
                </p>
              </div>
            </SpotlightCard>
          </div>
        </div>
      </main>
    </div>
  );
}
