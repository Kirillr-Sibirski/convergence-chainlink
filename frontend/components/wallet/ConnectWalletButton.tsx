"use client";

import { Button } from "@/components/ui/button";
import { Wallet } from "lucide-react";

export function ConnectWalletButton() {
  return (
    <Button size="sm">
      <Wallet className="w-4 h-4 mr-2" />
      Connect Wallet
    </Button>
  );
}
