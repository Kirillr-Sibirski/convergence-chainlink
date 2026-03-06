"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { SimpleHeader } from "@/components/layout/SimpleHeader";
import { BackgroundBeams } from "@/components/ui/background-beams";
import { Button } from "@/components/ui/button";
import { BrandName } from "@/components/branding/BrandName";
import { AletheiaStlViewer } from "@/components/landing/AletheiaStlViewer";

export default function LandingPage() {
  return (
    <div className="relative overflow-x-hidden">
      <SimpleHeader />
      <BackgroundBeams />

      <section className="relative z-10 min-h-[100svh] px-6 pt-24 pb-12 flex items-center">
        <div className="mx-auto w-full max-w-6xl grid lg:grid-cols-2 gap-10 items-center">
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
              <BrandName /> is a binary prediction market protocol with open market creation, AI-based validity checks,
              and CRE consensus resolution that is difficult to tamper with.
            </p>

            <Button
              asChild
              size="lg"
              className="bg-gray-900 text-white hover:bg-gray-800 shadow-[0_10px_24px_rgba(17,24,39,0.28)] border border-gray-900"
            >
              <Link href="/markets" className="inline-flex items-center gap-2">
                Try Now
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>

          <div className="animate-fade-up -mt-10">
            <AletheiaStlViewer className="scale-[1.06]" />
            <div className="mt-2 text-center text-gray-500">
              <p className="text-sm tracking-[0.04em] italic">Aletheia (ἀλήθεια), n.</p>
              <p className="mt-1 text-xs italic">Greek: truth; often personified as the goddess of truth.</p>
              <p className="mt-1 text-[11px] text-gray-400">Summer Garden, Saint Petersburg</p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
