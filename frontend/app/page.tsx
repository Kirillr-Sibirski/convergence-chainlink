"use client";

import Image from "next/image";
import Link from "next/link";
import { SimpleHeader } from "@/components/layout/SimpleHeader";
import { BackgroundBeams } from "@/components/ui/background-beams";
import { Button } from "@/components/ui/button";
import { BrandName } from "@/components/branding/BrandName";
import { AletheiaStlViewer } from "@/components/landing/AletheiaStlViewer";

const USP_CARDS = [
  {
    title: "AI Consensus Resolution",
    text: "Markets resolve through multi-model AI consensus, orchestrated in Chainlink CRE. Outcomes are backed by evidence, confidence, and transparent workflow logic.",
  },
  {
    title: "Permissionless Market Creation",
    text: "Anyone can propose a market. Questions are automatically validated for feasibility, timeline clarity, and binary structure before creation.",
  },
  {
    title: "Sybil-Resistant Anti-Spam",
    text: "World ID onchain verification plus a 24-hour creation limit per wallet keeps market creation open without turning the feed into spam.",
  },
];

const DIFFERENTIATORS = [
  {
    label: "vs. manual moderation markets",
    detail: "No central team deciding what can be listed. Validation is workflow-based and reproducible.",
  },
  {
    label: "vs. single-model oracle markets",
    detail: "No single AI point of failure. Resolution uses model consensus instead of one model’s opinion.",
  },
  {
    label: "vs. closed market creation systems",
    detail: "Creation is open to everyone, but guarded by feasibility checks and sybil-resistant identity verification.",
  },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen relative overflow-x-hidden">
      <SimpleHeader />
      <BackgroundBeams />

      <section className="relative z-10 px-6 pt-20 pb-16">
        <div className="mx-auto max-w-6xl grid lg:grid-cols-2 gap-10 items-center">
          <div className="space-y-6 animate-fade-up">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-black/10 bg-black/80 text-white text-xs shadow-[0_12px_30px_rgba(0,0,0,0.25)]">
              <Image src="/chainlink-symbol-white.png" alt="Chainlink" width={14} height={14} className="w-3.5 h-3.5" />
              Powered by Chainlink CRE
            </div>

            <h1 className="text-5xl md:text-6xl text-gray-900">
              <BrandName highlightVowels italic />:
              <br />
              permissionless markets with accountable AI resolution.
            </h1>

            <p className="text-base text-gray-600 max-w-xl">
              <BrandName /> is a binary prediction market protocol where anyone can create markets, traders can price outcomes in ETH, and resolution is handled by CRE-based AI consensus.
            </p>

            <div className="flex gap-3 flex-wrap">
              <Button
                asChild
                size="lg"
                className="bg-gray-900 text-white hover:bg-gray-800 shadow-[0_10px_24px_rgba(17,24,39,0.28)] border border-gray-900"
              >
                <Link href="/markets">Open Markets</Link>
              </Button>
              <Button
                asChild
                size="lg"
                variant="outline"
                className="border-gray-300 bg-gray-100/70 hover:bg-gray-200/80 shadow-[0_8px_18px_rgba(0,0,0,0.08)]"
              >
                <a href="https://docs.chain.link/cre/guides/workflow/using-http-client" target="_blank" rel="noopener noreferrer">
                  How CRE Works
                </a>
              </Button>
            </div>
          </div>

          <div className="animate-fade-up -mt-10">
            <AletheiaStlViewer className="scale-[1.06]" />
            <div className="mt-2 text-center text-gray-500">
              <p className="text-sm tracking-[0.04em] italic">
                Aletheia (ἀλήθεια), n.
              </p>
              <p className="mt-1 text-xs italic">
                Greek: truth; often personified as the goddess of truth.
              </p>
              <p className="mt-1 text-[11px] text-gray-400">
                Summer Garden, Saint Petersburg
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="relative z-10 px-6 pb-24">
        <div className="mx-auto max-w-6xl mb-8">
          <h2 className="text-3xl md:text-4xl text-gray-900">Why <BrandName /> is different</h2>
          <p className="text-sm text-gray-600 mt-2 max-w-3xl">
            Most prediction markets optimize for volume. <BrandName /> is optimized for trustworthy market lifecycle:
            valid questions in, transparent AI consensus out.
          </p>
        </div>
        <div className="mx-auto max-w-6xl grid md:grid-cols-3 gap-4">
          {USP_CARDS.map((item) => (
            <div
              key={item.title}
              className="rounded-xl border border-gray-200/80 bg-white/70 backdrop-blur-md p-5 shadow-[0_14px_34px_rgba(15,23,42,0.08)]"
            >
              <p className="text-[11px] uppercase tracking-[0.16em] text-gray-500">USP</p>
              <p className="text-xl text-gray-900 mt-2">{item.title}</p>
              <p className="text-sm text-gray-600 mt-2 leading-relaxed">{item.text}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="relative z-10 px-6 pb-24">
        <div className="mx-auto max-w-6xl rounded-2xl border border-gray-200/80 bg-white/75 backdrop-blur-xl shadow-[0_16px_40px_rgba(15,23,42,0.08)] p-6 md:p-8">
          <h3 className="text-2xl md:text-3xl text-gray-900">Positioning</h3>
          <p className="text-sm text-gray-600 mt-2 max-w-3xl">
            <BrandName /> combines open market creation with enforceable quality gates. You get permissionless listing,
            but not low-signal spam.
          </p>

          <div className="mt-6 grid md:grid-cols-3 gap-4">
            {DIFFERENTIATORS.map((item) => (
              <div key={item.label} className="rounded-xl border border-gray-200 bg-gray-50/80 p-4">
                <p className="text-xs uppercase tracking-[0.14em] text-gray-500">{item.label}</p>
                <p className="text-sm text-gray-700 mt-2 leading-relaxed">{item.detail}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
