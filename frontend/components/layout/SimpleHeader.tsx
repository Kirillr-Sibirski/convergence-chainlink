"use client";

import { Button } from "@/components/ui/button";
import { LayoutDashboard, TrendingUp } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { formatEther } from "viem";
import { useWallet } from "@/hooks/useWallet";
import { BrandName } from "@/components/branding/BrandName";
import { EthIcon } from "@/components/ui/eth-icon";
import { publicClient } from "@/lib/viem-client";

function shortAddress(address: string) {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

export function SimpleHeader() {
  const pathname = usePathname();
  const { account, connect, isConnecting } = useWallet();
  const [balanceEth, setBalanceEth] = useState<string | null>(null);
  const isMarkets = pathname?.startsWith("/markets");
  const isDashboard = pathname?.startsWith("/dashboard");

  useEffect(() => {
    let cancelled = false;

    const loadBalance = async () => {
      if (!account) {
        setBalanceEth(null);
        return;
      }
      try {
        const balance = await publicClient.getBalance({ address: account as `0x${string}` });
        if (!cancelled) {
          setBalanceEth(Number(formatEther(balance)).toFixed(4));
        }
      } catch {
        if (!cancelled) setBalanceEth(null);
      }
    };

    void loadBalance();
    return () => {
      cancelled = true;
    };
  }, [account]);

  return (
    <header className="relative z-20 px-6 pt-4">
      <div className="mx-auto max-w-6xl rounded-xl border border-gray-200/70 bg-white/35 backdrop-blur-xl shadow-[0_12px_28px_rgba(15,23,42,0.08)] px-4 py-3">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Link href="/" className="group">
              <div className="leading-tight">
                <p className="text-lg font-semibold tracking-tight text-gray-900"><BrandName highlightVowels /></p>
                <p className="text-[10px] uppercase tracking-[0.16em] text-gray-500 group-hover:text-gray-700 transition-colors">
                  AI-Resolved Markets
                </p>
              </div>
            </Link>
            <nav className="flex items-center gap-1 rounded-lg border border-gray-200/80 bg-white/60 px-1.5 py-1">
              <Button
                variant={isMarkets ? "secondary" : "ghost"}
                size="sm"
                className={isMarkets ? "bg-gray-900 text-white hover:bg-gray-800 border-gray-900" : ""}
                asChild
              >
                <Link href="/markets" className="flex flex-row items-center gap-1.5">
                  <TrendingUp className="w-4 h-4" />
                  Markets
                </Link>
              </Button>
              <Button
                variant={isDashboard ? "secondary" : "ghost"}
                size="sm"
                className={isDashboard ? "bg-gray-900 text-white hover:bg-gray-800 border-gray-900" : ""}
                asChild
              >
                <Link href="/dashboard" className="flex flex-row items-center gap-1.5">
                  <LayoutDashboard className="w-4 h-4" />
                  My Bets
                </Link>
              </Button>
            </nav>
          </div>

          <div className="flex items-center gap-3">
            {account ? (
              <>
                <div className="inline-flex items-center gap-1.5 rounded-md border border-gray-300 bg-white/75 px-2.5 py-1.5 text-xs text-gray-700">
                  <EthIcon className="h-3.5 w-3.5" />
                  <span>{balanceEth ?? "…"} ETH</span>
                </div>
                <Button variant="outline" size="sm" disabled className="bg-white/70 border-gray-300">
                  {shortAddress(account)}
                </Button>
              </>
            ) : (
              <Button
                variant="outline"
                size="sm"
                className="bg-white/70 border-gray-300 hover:bg-white"
                onClick={() => void connect()}
                disabled={isConnecting}
              >
                {isConnecting ? "Connecting..." : "Connect Wallet"}
              </Button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
