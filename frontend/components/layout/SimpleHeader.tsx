"use client";

import { Button } from "@/components/ui/button";
import { Coins, LayoutDashboard, TrendingUp } from "lucide-react";
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
    <header className="relative z-20 flex items-center justify-between px-6 py-4 border-b bg-white/70 backdrop-blur-sm">
      <div className="flex items-center gap-6">
        <Link href="/">
          <h1 className="text-xl font-semibold underline decoration-primary decoration-2 underline-offset-4">
            AEEIA
          </h1>
        </Link>
        <nav className="flex items-center gap-1">
          <Button
            variant={pathname === "/markets" ? "secondary" : "ghost"}
            size="sm"
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
            asChild
          >
            <Link href="/dashboard" className="flex flex-row items-center gap-1.5">
              <LayoutDashboard className="w-4 h-4" />
              My Bets
            </Link>
          </Button>
          <Button
            variant={pathname === "/stake" ? "secondary" : "ghost"}
            size="sm"
            asChild
          >
            <Link href="/stake" className="flex flex-row items-center gap-1.5">
              <Coins className="w-4 h-4" />
              Stake
            </Link>
          </Button>
        </nav>
      </div>

      <div className="flex items-center gap-3">
        {account ? (
          <Button variant="outline" size="sm" disabled>
            {shortAddress(account)}
          </Button>
        ) : (
          <Button variant="outline" size="sm" onClick={() => void connect()} disabled={isConnecting}>
            {isConnecting ? "Connecting..." : "Connect Wallet"}
          </Button>
        )}
      </div>
    </header>
  );
}
