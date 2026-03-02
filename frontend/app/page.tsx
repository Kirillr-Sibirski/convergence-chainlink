"use client";

import Image from "next/image";
import Link from "next/link";
import { Sparkles } from "lucide-react";
import { SimpleHeader } from "@/components/layout/SimpleHeader";
import { SpotlightCard } from "@/components/ui/spotlight-card";
import { PulseDot } from "@/components/ui/pulse-dot";
import { BackgroundBeams } from "@/components/ui/background-beams";
import { Button } from "@/components/ui/button";

const HOW_IT_WORKS = [
  {
    title: "Clear Outcome Rules",
    description:
      "Each market is written as a clear yes/no question with a concrete outcome rule.",
  },
  {
    title: "Automated Results",
    description:
      "After a market expires, the result is processed automatically through the workflow.",
  },
  {
    title: "Trade And Earn",
    description:
      "Buy and sell outcome tokens, or provide liquidity and earn from market activity.",
  },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen relative overflow-x-hidden">
      <SimpleHeader />
      <BackgroundBeams />

      <section className="relative z-10 px-6 pt-20 pb-14">
        <div className="mx-auto max-w-6xl grid lg:grid-cols-[1.2fr_0.8fr] gap-8 items-center">
          <div className="space-y-7 animate-fade-up">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-gray-300/70 bg-white/75 backdrop-blur-md text-xs text-gray-600 shadow-[0_8px_30px_rgba(0,0,0,0.06)]">
              <Sparkles className="w-3.5 h-3.5 text-gray-500" />
              Autonomous Prediction Infrastructure
            </div>

            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-black/10 bg-black/80 text-white text-xs shadow-[0_12px_30px_rgba(0,0,0,0.25)]">
              <Image
                src="/chainlink-symbol-white.png"
                alt="Chainlink"
                width={14}
                height={14}
                className="w-3.5 h-3.5"
              />
              <PulseDot />
              Powered by Chainlink Runtime Environment
            </div>

            <div className="space-y-4">
              <h1 className="text-5xl md:text-6xl font-bold tracking-tight text-gray-900 leading-[1.02]">
                Trade Truth.
                <br />
                Not Noise.
              </h1>
              <p className="text-lg text-gray-600 max-w-2xl">
                AEEIA is a prediction market for clear yes/no questions, with AI-assisted result processing.
              </p>
            </div>

            <div className="flex gap-3 flex-wrap">
              <Button
                asChild
                size="lg"
                className="bg-gray-900 hover:bg-gray-800 shadow-[0_10px_24px_rgba(17,24,39,0.28)] border border-gray-900"
              >
                <Link href="/markets">Start Trading</Link>
              </Button>
              <Button
                asChild
                size="lg"
                variant="outline"
                className="border-gray-300 bg-gray-100/70 hover:bg-gray-200/80 shadow-[0_8px_18px_rgba(0,0,0,0.08)]"
              >
                <a href="https://chain.link/cre" target="_blank" rel="noopener noreferrer">
                  Read CRE Docs
                </a>
              </Button>
            </div>
          </div>

          <SpotlightCard className="p-6 bg-white/70 border-gray-200/80 backdrop-blur-xl shadow-[0_20px_50px_rgba(17,24,39,0.08)] animate-fade-up-delay">
            <div className="space-y-4">
              <p className="text-xs uppercase tracking-[0.16em] text-gray-500">Live Market Primitive</p>
              <p className="text-xl font-semibold text-gray-900 leading-snug">
                One place to trade outcomes, add liquidity, and track results.
              </p>
              <div className="space-y-2">
                <div className="rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-800">
                  YES side momentum and buy pressure visible in real time
                </div>
                <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
                  NO side liquidity and hedge exposure priced continuously
                </div>
                <div className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-700">
                  For demo mode, expired markets show the simulation command to run
                </div>
              </div>
              <Button asChild variant="outline" className="w-full border-gray-300 bg-white/80 hover:bg-gray-100">
                <Link href="/markets">Open Markets</Link>
              </Button>
            </div>
          </SpotlightCard>
        </div>
      </section>

      <section className="relative z-10 px-6 pb-24 max-w-6xl mx-auto space-y-10">
        <div className="text-center space-y-3 animate-fade-up">
          <h2 className="text-3xl font-bold tracking-tight text-gray-900">Built For Credible Resolution</h2>
          <p className="text-sm text-gray-600 max-w-2xl mx-auto">
            Users should be able to understand what happened, why it resolved that way, and what they can do next.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {HOW_IT_WORKS.map((item, idx) => (
            <SpotlightCard
              key={item.title}
              className={`p-6 space-y-3 bg-white/75 border-gray-200/80 backdrop-blur-md shadow-[0_16px_40px_rgba(17,24,39,0.06)] animate-fade-up ${
                idx === 1 ? "animate-delay-1" : idx === 2 ? "animate-delay-2" : ""
              }`}
            >
              <h3 className="font-semibold text-lg text-gray-900">{item.title}</h3>
              <p className="text-sm text-gray-600 leading-relaxed">{item.description}</p>
            </SpotlightCard>
          ))}
        </div>
      </section>
    </div>
  );
}
