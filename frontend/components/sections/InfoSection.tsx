"use client";

import { SpotlightCard } from "@/components/ui/spotlight-card";
import { PulseDot } from "@/components/ui/pulse-dot";
import { Button } from "@/components/ui/button";

const stats = [
  { label: "Total Markets", value: "12+", highlight: false },
  { label: "Avg Confidence", value: "94%", highlight: true },
  { label: "Resolution Time", value: "<1min", highlight: false },
  { label: "Total Volume", value: "$2.4M", highlight: false },
];

export function InfoSection() {
  return (
    <section className="w-full max-w-5xl mx-auto px-6 py-24">
      <div className="grid md:grid-cols-2 gap-12 items-start">
        <div className="space-y-6">
          <h2 className="text-4xl md:text-5xl font-bold tracking-tight">
            AI-Fetched Sources.
            <br />
            CRE-Verified Truth.
          </h2>
          <p className="text-lg text-muted-foreground leading-relaxed">
            AEEIA doesn't blindly trust AI answers. Instead, it fetches real sources,
            cross-verifies information, and uses AI to process evidence — all verified
            through Chainlink Runtime Environment.
          </p>
          <p className="text-lg text-muted-foreground leading-relaxed">
            Markets resolve based on cryptographic proofs of source verification,
            not just AI opinions. Questions embed deadlines: "Will ETH reach $5k by tomorrow?"
          </p>
          <div className="flex flex-wrap gap-3">
            <Button variant="outline" asChild>
              <a href="https://chain.link/cre" target="_blank" rel="noopener noreferrer">
                Learn more about Chainlink CRE
              </a>
            </Button>
          </div>
        </div>

        <SpotlightCard className="p-6">
          <div className="flex items-center gap-2 mb-6">
            <PulseDot />
            <span className="text-sm text-primary font-medium">
              Platform Stats
            </span>
          </div>
          <div className="grid grid-cols-2 gap-4">
            {stats.map((stat) => (
              <div key={stat.label} className="space-y-2">
                <p className="text-sm text-muted-foreground">{stat.label}</p>
                <p
                  className={`text-2xl font-bold ${
                    stat.highlight ? "text-primary" : ""
                  }`}
                >
                  {stat.value}
                </p>
              </div>
            ))}
          </div>
        </SpotlightCard>
      </div>

      <div className="mt-24 space-y-12">
        <h3 className="text-3xl font-bold tracking-tight text-center">
          Why Chainlink CRE?
        </h3>
        <div className="grid md:grid-cols-3 gap-6">
          <SpotlightCard className="p-6 space-y-3">
            <h4 className="font-semibold text-lg">AI Fetches Real Sources</h4>
            <p className="text-sm text-muted-foreground">
              Instead of trusting AI opinions, the oracle fetches actual data sources,
              news articles, and APIs to gather evidence.
            </p>
          </SpotlightCard>
          <SpotlightCard className="p-6 space-y-3">
            <h4 className="font-semibold text-lg">CRE Verifies Everything</h4>
            <p className="text-sm text-muted-foreground">
              Chainlink Runtime Environment cryptographically proves which sources were
              accessed and validates the integrity of fetched data.
            </p>
          </SpotlightCard>
          <SpotlightCard className="p-6 space-y-3">
            <h4 className="font-semibold text-lg">AI Processes Evidence</h4>
            <p className="text-sm text-muted-foreground">
              AI analyzes verified sources to reach conclusions with confidence scores,
              not arbitrary answers. Evidence-based, not hallucination-based.
            </p>
          </SpotlightCard>
        </div>
        <div className="flex justify-center pt-4">
          <Button variant="outline" asChild>
            <a href="https://chain.link/" target="_blank" rel="noopener noreferrer">
              Learn more about Chainlink
            </a>
          </Button>
        </div>
      </div>
    </section>
  );
}
