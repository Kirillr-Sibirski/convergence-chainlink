"use client";

import { SimpleHeader } from "@/components/layout/SimpleHeader";
import { SpotlightCard } from "@/components/ui/spotlight-card";
import { PulseDot } from "@/components/ui/pulse-dot";
import { BackgroundBeams } from "@/components/ui/background-beams";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

const STATS = [
  { label: "Total Markets", value: "12+", highlight: false },
  { label: "Avg Confidence", value: "94%", highlight: true },
  { label: "Resolution Time", value: "<1min", highlight: false },
  { label: "Total Volume", value: "$2.4M", highlight: false },
];

<<<<<<< HEAD
  const handleCreateMarket = async (question: string) => {
    if (!account) {
      throw new Error("Please connect your wallet first");
    }
    const deadline = Math.floor(Date.now() / 1000) + 24 * 3600;
    await createMarket(account, question, deadline);
  };
=======
const HOW_IT_WORKS = [
  {
    title: "AI Fetches Real Sources",
    description:
      "Instead of trusting AI opinions, the oracle fetches actual data sources, news articles, and APIs to gather verifiable evidence.",
  },
  {
    title: "CRE Verifies Everything",
    description:
      "Chainlink Runtime Environment cryptographically proves which sources were accessed and validates the integrity of fetched data.",
  },
  {
    title: "AI Processes Evidence",
    description:
      "AI analyzes verified sources to reach conclusions with confidence scores — evidence-based, never hallucination-based.",
  },
];
>>>>>>> 87e8e39 (Separate landign page, proper markets page, adjust the UI)

export default function LandingPage() {
  return (
    <div className="min-h-screen relative overflow-x-hidden">
      <SimpleHeader />
      <BackgroundBeams />

      {/* Hero */}
      <section className="relative z-10 flex flex-col items-center text-center px-6 pt-24 pb-16 gap-8">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-gray-200 bg-white/60 backdrop-blur-sm text-xs text-gray-500">
          <PulseDot />
          Powered by Chainlink Runtime Environment
        </div>

        <div className="space-y-4 max-w-3xl">
          <h1 className="text-5xl md:text-6xl font-bold tracking-tight text-gray-900 leading-tight">
            AI-Fetched Sources.
            <br />
            CRE-Verified Truth.
          </h1>
          <p className="text-lg text-gray-500 max-w-lg mx-auto">
            Prediction markets resolved by processing real evidence, not AI
            hallucinations. Every outcome is cryptographically verified.
          </p>
        </div>

        <div className="flex gap-3 flex-wrap justify-center">
          <Button asChild size="lg" className="gap-2">
            <Link href="/markets">
              Browse Markets <ArrowRight className="w-4 h-4" />
            </Link>
          </Button>
          <Button asChild size="lg" variant="outline">
            <a
              href="https://chain.link/cre"
              target="_blank"
              rel="noopener noreferrer"
            >
              Learn about CRE
            </a>
          </Button>
        </div>
      </section>

      {/* Platform stats card */}
      <section className="relative z-10 flex justify-center px-6 pb-20">
        <SpotlightCard className="p-6 w-full max-w-sm">
          <div className="flex items-center gap-2 mb-6">
            <PulseDot />
            <span className="text-sm text-primary font-medium">
              Platform Stats
            </span>
          </div>
          <div className="grid grid-cols-2 gap-6">
            {STATS.map((stat) => (
              <div key={stat.label} className="space-y-1">
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
      </section>

      {/* Why Chainlink CRE */}
      <section className="relative z-10 px-6 pb-28 max-w-5xl mx-auto space-y-10">
        <h2 className="text-3xl font-bold tracking-tight text-center">
          Why Chainlink CRE?
        </h2>

        <div className="grid md:grid-cols-3 gap-6">
          {HOW_IT_WORKS.map((item) => (
            <SpotlightCard key={item.title} className="p-6 space-y-3">
              <h3 className="font-semibold text-lg">{item.title}</h3>
              <p className="text-sm text-muted-foreground">
                {item.description}
              </p>
            </SpotlightCard>
          ))}
        </div>

        <div className="flex justify-center pt-2">
          <Button asChild size="lg" className="gap-2">
            <Link href="/markets">
              Start Betting <ArrowRight className="w-4 h-4" />
            </Link>
          </Button>
        </div>
      </section>
    </div>
  );
}
