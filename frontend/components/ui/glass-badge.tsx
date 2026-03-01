"use client"

import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const glassBadgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-all",
  {
    variants: {
      variant: {
        default: "border-gray-200/50 bg-white/40 backdrop-blur-sm text-gray-900 shadow-sm",
        secondary: "border-gray-300/50 bg-gray-100/40 backdrop-blur-sm text-gray-700",
        outline: "border-gray-300 bg-transparent text-gray-700",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

export interface GlassBadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof glassBadgeVariants> {}

function GlassBadge({ className, variant, ...props }: GlassBadgeProps) {
  return (
    <div className={cn(glassBadgeVariants({ variant }), className)} {...props} />
  )
}

export { GlassBadge, glassBadgeVariants }
