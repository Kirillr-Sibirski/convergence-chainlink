"use client"

import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const glassButtonVariants = cva(
  cn(
    "relative inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl cursor-pointer",
    "text-sm font-medium transition-all duration-300 ease-out",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-400/50 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent",
    "disabled:pointer-events-none disabled:opacity-50",
    "hover:scale-[1.02] active:scale-[0.98]",
    "[&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  ),
  {
    variants: {
      variant: {
        default: cn(
          "bg-white/30 backdrop-blur-xl border border-gray-200/50 text-gray-900",
          "shadow-[0_4px_16px_rgba(0,0,0,0.08)]",
          "hover:bg-white/40 hover:border-gray-300/50",
          "before:absolute before:inset-0 before:rounded-xl",
          "before:bg-gradient-to-b before:from-white/30 before:to-transparent before:pointer-events-none",
        ),
        primary: cn(
          "bg-gray-900 backdrop-blur-xl border border-gray-700/50 text-white",
          "shadow-[0_4px_20px_rgba(0,0,0,0.15)]",
          "hover:bg-gray-800 hover:shadow-[0_4px_30px_rgba(0,0,0,0.2)]",
          "before:absolute before:inset-0 before:rounded-xl",
          "before:bg-gradient-to-b before:from-white/10 before:to-transparent before:pointer-events-none",
        ),
        outline: cn(
          "bg-transparent backdrop-blur-sm border-2 border-gray-300/60 text-gray-900",
          "hover:bg-white/20 hover:border-gray-400/60",
        ),
        ghost: cn("bg-transparent text-gray-700", "hover:bg-gray-100/50 hover:text-gray-900"),
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-8 px-3 text-xs",
        lg: "h-12 px-6 text-base",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
)

export interface GlassButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof glassButtonVariants> {
  glowEffect?: boolean
}

const GlassButton = React.forwardRef<HTMLButtonElement, GlassButtonProps>(
  ({ className, variant, size, glowEffect = false, children, ...props }, ref) => {
    return (
      <div className="relative inline-block">
        {glowEffect && (
          <div className="absolute -inset-1 rounded-xl bg-gradient-to-r from-gray-400/30 via-gray-500/30 to-gray-600/30 blur-lg opacity-50 transition-opacity hover:opacity-70" />
        )}
        <button className={cn(glassButtonVariants({ variant, size, className }))} ref={ref} {...props}>
          <span className="relative z-10 flex items-center gap-2">{children}</span>
        </button>
      </div>
    )
  },
)
GlassButton.displayName = "GlassButton"

export { GlassButton, glassButtonVariants }
