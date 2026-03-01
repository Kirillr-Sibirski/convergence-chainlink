"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { LayoutDashboard, TrendingUp, Wallet, LogOut, RefreshCw, Copy, Check } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

export function SimpleHeader() {
  const pathname = usePathname();
  const [address, setAddress] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined" && window.ethereum) {
      window.ethereum.request({ method: "eth_accounts" }).then((accounts: string[]) => {
        if (accounts.length > 0) setAddress(accounts[0]);
      });

      const handleAccountsChanged = (accounts: string[]) => {
        setAddress(accounts.length > 0 ? accounts[0] : null);
      };
      window.ethereum.on("accountsChanged", handleAccountsChanged);
      return () => window.ethereum.removeListener("accountsChanged", handleAccountsChanged);
    }
  }, []);

  const connectWallet = async () => {
    if (typeof window === "undefined" || !window.ethereum) {
      alert("Please install MetaMask to use this app");
      return;
    }
    setIsConnecting(true);
    try {
      const accounts = await window.ethereum.request({ method: "eth_requestAccounts" });
      setAddress(accounts[0]);
      try {
        await window.ethereum.request({
          method: "wallet_switchEthereumChain",
          params: [{ chainId: "0xaa36a7" }],
        });
      } catch (switchError: any) {
        if (switchError.code === 4902) {
          await window.ethereum.request({
            method: "wallet_addEthereumChain",
            params: [{
              chainId: "0xaa36a7",
              chainName: "Sepolia Testnet",
              nativeCurrency: { name: "Sepolia ETH", symbol: "ETH", decimals: 18 },
              rpcUrls: ["https://rpc.sepolia.org"],
              blockExplorerUrls: ["https://sepolia.etherscan.io"],
            }],
          });
        }
      }
    } catch (error) {
      console.error("Failed to connect wallet:", error);
    } finally {
      setIsConnecting(false);
    }
  };

  const disconnectWallet = () => {
    setAddress(null);
  };

  const switchWallet = async () => {
    if (!window.ethereum) return;
    try {
      const accounts = await window.ethereum.request({
        method: "wallet_requestPermissions",
        params: [{ eth_accounts: {} }],
      });
      const newAccounts = await window.ethereum.request({ method: "eth_accounts" });
      if (newAccounts.length > 0) setAddress(newAccounts[0]);
    } catch (error) {
      console.error("Failed to switch wallet:", error);
    }
  };

  const copyAddress = () => {
    if (!address) return;
    navigator.clipboard.writeText(address);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

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
        {address ? (
          <Popover>
            <PopoverTrigger asChild>
              <Button size="sm" variant="outline" className="flex flex-row items-center gap-2">
                <Wallet className="w-4 h-4" />
                {address.slice(0, 6)}...{address.slice(-4)}
              </Button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-64 p-0 bg-white border shadow-lg rounded-xl overflow-hidden">
              <div className="px-4 py-3 border-b bg-gray-50">
                <p className="text-xs text-gray-500 mb-1">Connected wallet</p>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-mono font-medium text-gray-800 truncate">
                    {address.slice(0, 10)}...{address.slice(-6)}
                  </span>
                  <button
                    onClick={copyAddress}
                    className="text-gray-400 hover:text-gray-700 transition-colors flex-shrink-0"
                    title="Copy address"
                  >
                    {copied ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
                <p className="text-xs text-gray-400 mt-1">Sepolia Testnet</p>
              </div>
              <div className="p-2 space-y-1">
                <button
                  onClick={switchWallet}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <RefreshCw className="w-4 h-4 text-gray-400" />
                  Switch wallet
                </button>
                <button
                  onClick={disconnectWallet}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                  Disconnect
                </button>
              </div>
            </PopoverContent>
          </Popover>
        ) : (
          <Button size="sm" onClick={connectWallet} disabled={isConnecting}>
            {isConnecting ? "Connecting..." : "Connect Wallet"}
          </Button>
        )}
      </div>
    </header>
  );
}
