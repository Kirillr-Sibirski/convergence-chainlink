"use client";

import { Button } from "@/components/ui/button";
import { LayoutDashboard, TrendingUp } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ConnectButton } from "thirdweb/react";
import { client, chain } from "@/lib/thirdweb";
import { createWallet } from "thirdweb/wallets";

const wallets = [
  createWallet("io.metamask"),
  createWallet("com.coinbase.wallet"),
  createWallet("me.rainbow"),
];

export function SimpleHeader() {
  const pathname = usePathname();

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
            variant={pathname === "/" ? "secondary" : "ghost"}
            size="sm"
            asChild
          >
            <Link href="/" className="flex flex-row items-center gap-1.5">
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
        </nav>
      </div>

      <div className="flex items-center gap-3">
        <ConnectButton
          client={client}
          wallets={wallets}
          chain={chain}
          connectButton={{
            label: "Connect Wallet",
            style: {
              fontSize: "14px",
              height: "36px",
            },
          }}
          switchButton={{
            label: "Wrong Network",
            style: {
              fontSize: "14px",
              height: "36px",
            },
          }}
          detailsButton={{
            style: {
              fontSize: "14px",
              height: "36px",
            },
          }}
          autoConnect={true}
          theme="light"
        />
      </div>
    </header>
  );
}
