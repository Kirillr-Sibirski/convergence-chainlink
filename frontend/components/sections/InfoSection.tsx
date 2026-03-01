"use client";

import { SpotlightCard } from "@/components/ui/spotlight-card";
import { PulseDot } from "@/components/ui/pulse-dot";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";

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
            Oracle-First
            <br />
            Market Resolution.
          </h2>
          <p className="text-lg text-muted-foreground leading-relaxed">
            AEEIA is an autonomous oracle that resolves prediction markets through
            AI reasoning. No manual data feeds. No trusted intermediaries.
          </p>
          <p className="text-lg text-muted-foreground leading-relaxed">
            Powered by Chainlink Runtime Environment, the oracle dynamically sources
            information, cross-verifies facts, and generates cryptographic proofs.
          </p>
          <div className="flex flex-wrap gap-3">
            <Button variant="outline" className="group" asChild>
              <a href="https://chain.link/cre" target="_blank" rel="noopener noreferrer">
                Learn more about Chainlink CRE
                <ArrowRight className="ml-2 w-4 h-4 transition-transform group-hover:translate-x-1" />
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
            <h4 className="font-semibold text-lg">Zero Hardcoded Sources</h4>
            <p className="text-sm text-muted-foreground">
              AI dynamically discovers and verifies sources for each query.
              No manual API configuration required.
            </p>
          </SpotlightCard>
          <SpotlightCard className="p-6 space-y-3">
            <h4 className="font-semibold text-lg">Multi-Source Verification</h4>
            <p className="text-sm text-muted-foreground">
              Cross-references multiple independent sources to ensure accuracy
              and generate confidence scores.
            </p>
          </SpotlightCard>
          <SpotlightCard className="p-6 space-y-3">
            <h4 className="font-semibold text-lg">Transparent Proofs</h4>
            <p className="text-sm text-muted-foreground">
              Every resolution includes cryptographic proof of sources used,
              making verification fully auditable.
            </p>
          </SpotlightCard>
        </div>
        <div className="flex justify-center pt-4">
          <Button variant="outline" className="group" asChild>
            <a href="https://chain.link/" target="_blank" rel="noopener noreferrer">
              Learn more about Chainlink
              <ArrowRight className="ml-2 w-4 h-4 transition-transform group-hover:translate-x-1" />
            </a>
          </Button>
        </div>
      </div>
    </section>
  );
}
