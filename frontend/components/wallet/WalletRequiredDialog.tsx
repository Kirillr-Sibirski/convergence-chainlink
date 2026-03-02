"use client";

import { Button } from "@/components/ui/button";
import { X, Wallet } from "lucide-react";
import { useWallet } from "@/hooks/useWallet";

interface WalletRequiredDialogProps {
  onClose: () => void;
}

export function WalletRequiredDialog({ onClose }: WalletRequiredDialogProps) {
  const { connect, isConnecting } = useWallet();

  const handleConnect = async () => {
    try {
      await connect();
      onClose();
    } catch (err) {
      console.error("Wallet connection failed", err);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl border border-gray-200 w-full max-w-sm p-6 space-y-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Wallet className="w-4 h-4 text-gray-700" />
            <h2 className="text-base font-semibold">Connect Wallet</h2>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} className="h-7 w-7">
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>

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
      </div>
    </div>
  );
}
