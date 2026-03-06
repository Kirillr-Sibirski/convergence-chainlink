"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { X, Wallet } from "lucide-react";
import { useWallet } from "@/hooks/useWallet";

interface WalletRequiredDialogProps {
  onClose: () => void;
}

export function WalletRequiredDialog({ onClose }: WalletRequiredDialogProps) {
  const [mounted, setMounted] = useState(false);
  const { connect, isConnecting } = useWallet();

  const handleConnect = async () => {
    try {
      await connect();
      onClose();
    } catch (err) {
      console.error("Wallet connection failed", err);
    }
  };

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  if (!mounted) return null;

  return createPortal(
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[200] p-4">
      <Card className="w-full max-w-sm bg-white border shadow-xl rounded-xl">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4 border-b border-gray-200">
          <div className="flex items-center gap-2.5">
            <Wallet className="w-5 h-5 text-gray-700" />
            <CardTitle className="text-2xl leading-none">Connect Wallet</CardTitle>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </CardHeader>

        <CardContent className="space-y-5">
          <p className="text-sm text-muted-foreground">
            You need a connected wallet to create and trade markets.
          </p>

          <div className="flex justify-center">
            <Button onClick={() => void handleConnect()} disabled={isConnecting}>
              {isConnecting ? "Connecting..." : "Connect Wallet"}
            </Button>
          </div>

          <p className="text-xs text-center text-muted-foreground">
            Make sure your wallet is on Sepolia testnet.
          </p>
        </CardContent>
      </Card>
    </div>,
    document.body
  );
}
