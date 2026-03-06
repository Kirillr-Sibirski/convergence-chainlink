"use client";

import { CheckCircle2, Info, AlertTriangle, X } from "lucide-react";
import { Button } from "@/components/ui/button";

export type NotificationVariant = "success" | "error" | "info";

export interface NotificationItem {
  id: string;
  title: string;
  description?: string;
  variant?: NotificationVariant;
}

interface NotificationCenterProps {
  items: NotificationItem[];
  onDismiss: (id: string) => void;
}

const variantStyles: Record<NotificationVariant, string> = {
  success: "border-green-200 bg-green-50 text-green-800",
  error: "border-red-200 bg-red-50 text-red-800",
  info: "border-gray-200 bg-white text-gray-800",
};

function VariantIcon({ variant }: { variant: NotificationVariant }) {
  if (variant === "success") return <CheckCircle2 className="h-4 w-4 text-green-600" />;
  if (variant === "error") return <AlertTriangle className="h-4 w-4 text-red-600" />;
  return <Info className="h-4 w-4 text-gray-600" />;
}

export function NotificationCenter({ items, onDismiss }: NotificationCenterProps) {
  if (items.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 z-[400] flex w-[360px] max-w-[calc(100vw-2rem)] flex-col gap-2">
      {items.map((item) => {
        const variant = item.variant ?? "info";
        return (
          <div key={item.id} className={`rounded-lg border px-3 py-2 shadow-md ${variantStyles[variant]}`}>
            <div className="flex items-start gap-2">
              <div className="pt-0.5">
                <VariantIcon variant={variant} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold leading-snug">{item.title}</p>
                {item.description && <p className="mt-0.5 text-xs opacity-90 leading-snug">{item.description}</p>}
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-6 w-6 opacity-70 hover:opacity-100"
                onClick={() => onDismiss(item.id)}
              >
                <X className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
