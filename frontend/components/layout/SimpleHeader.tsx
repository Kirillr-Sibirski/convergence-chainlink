"use client";

import { Button } from "@/components/ui/button";
import { LayoutDashboard, TrendingUp } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useWallet } from "@/hooks/useWallet";

function shortAddress(address: string) {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

export function SimpleHeader() {
  const pathname = usePathname();
  const { account, connect, isConnecting } = useWallet();

  return (
    <header className="relative z-20 px-6 pt-4">
      <div className="mx-auto max-w-6xl rounded-xl border border-gray-200/70 bg-white/35 backdrop-blur-xl shadow-[0_12px_28px_rgba(15,23,42,0.08)] px-4 py-3">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Link href="/" className="group">
              <div className="leading-tight">
                <p className="text-lg font-semibold tracking-tight text-gray-900">AEEIA</p>
                <p className="text-[10px] uppercase tracking-[0.16em] text-gray-500 group-hover:text-gray-700 transition-colors">
                  AI-Resolved Markets
                </p>
              </div>
            </Link>
            <nav className="flex items-center gap-1 rounded-lg border border-gray-200/80 bg-white/60 px-1.5 py-1">
              <Button
                variant={pathname === "/markets" ? "secondary" : "ghost"}
                size="sm"
                className={pathname === "/markets" ? "bg-gray-100 border-gray-300" : ""}
                asChild
              >
                <Link href="/markets" className="flex flex-row items-center gap-1.5">
                  <TrendingUp className="w-4 h-4" />
                  Markets
                </Link>
              </Button>
              <Button
                variant={pathname === "/dashboard" ? "secondary" : "ghost"}
                size="sm"
                className={pathname === "/dashboard" ? "bg-gray-100 border-gray-300" : ""}
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
              <Button variant="outline" size="sm" disabled className="bg-white/70 border-gray-300">
                {shortAddress(account)}
              </Button>
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
