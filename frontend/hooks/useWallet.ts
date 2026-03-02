"use client";

import { useCallback, useEffect, useState } from "react";
import { connectWallet, getConnectedAddress } from "@/lib/web3-viem";

export function useWallet() {
  const [account, setAccount] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);

  const refresh = useCallback(async () => {
    try {
      setAccount(await getConnectedAddress());
    } catch {
      setAccount(null);
    }
  }, []);

  const connect = useCallback(async () => {
    setIsConnecting(true);
    try {
      const address = await connectWallet();
      setAccount(address);
      return address;
    } finally {
      setIsConnecting(false);
    }
  }, []);

  useEffect(() => {
    refresh();

    if (typeof window === "undefined" || !window.ethereum) return;

    const handleAccountsChanged = (accounts: string[]) => {
      setAccount(accounts[0] ?? null);
    };

    const handleChainChanged = () => {
      refresh();
    };

    window.ethereum.on("accountsChanged", handleAccountsChanged);
    window.ethereum.on("chainChanged", handleChainChanged);

    return () => {
      window.ethereum?.removeListener("accountsChanged", handleAccountsChanged);
      window.ethereum?.removeListener("chainChanged", handleChainChanged);
    };
  }, [refresh]);

  return { account, isConnecting, connect, refresh };
}
