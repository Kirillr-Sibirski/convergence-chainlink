"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

export interface GlassTextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {}

const GlassTextarea = React.forwardRef<HTMLTextAreaElement, GlassTextareaProps>(
  ({ className, ...props }, ref) => {
    return (
      <textarea
        className={cn(
          "flex min-h-[80px] w-full rounded-xl border border-gray-200/50 bg-white/40 backdrop-blur-xl px-4 py-3 text-sm text-gray-900",
          "shadow-[0_2px_8px_rgba(0,0,0,0.04)]",
          "placeholder:text-gray-500",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-400/50 focus-visible:ring-offset-0",
          "disabled:cursor-not-allowed disabled:opacity-50",
          "transition-all duration-200",
          "resize-none",
          className
        )}
        ref={ref}
        {...props}
      />
    )
  }
)
GlassTextarea.displayName = "GlassTextarea"

export { GlassTextarea }
