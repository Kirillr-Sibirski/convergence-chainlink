"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

interface GlassCardProps extends React.HTMLAttributes<HTMLDivElement> {
  glowEffect?: boolean
  children: React.ReactNode
}

const GlassCard = React.forwardRef<HTMLDivElement, GlassCardProps>(
  ({ className, glowEffect = false, children, ...props }, ref) => {
    return (
      <div className="relative">
        {glowEffect && (
          <div className="absolute -inset-1 rounded-2xl bg-gradient-to-r from-gray-400/20 via-gray-500/20 to-gray-600/20 blur-xl opacity-50" />
        )}
        <div
          ref={ref}
          className={cn(
            "relative rounded-2xl border border-gray-200/50",
            "bg-white/60 backdrop-blur-xl",
            "shadow-[0_8px_32px_rgba(0,0,0,0.08)]",
            "before:absolute before:inset-0 before:rounded-2xl",
            "before:bg-gradient-to-b before:from-white/40 before:to-transparent before:pointer-events-none",
            "after:absolute after:inset-px after:rounded-[calc(1rem-1px)]",
            "after:shadow-[inset_0_1px_1px_rgba(255,255,255,0.2)] after:pointer-events-none",
            className,
          )}
          {...props}
        >
          <div className="relative z-10">{children}</div>
        </div>
      </div>
    )
  },
)
GlassCard.displayName = "GlassCard"

const GlassCardHeader = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => <div ref={ref} className={cn("flex flex-col gap-1.5 p-6", className)} {...props} />,
)
GlassCardHeader.displayName = "GlassCardHeader"

const GlassCardTitle = React.forwardRef<HTMLHeadingElement, React.HTMLAttributes<HTMLHeadingElement>>(
  ({ className, ...props }, ref) => (
    <h3
      ref={ref}
      className={cn("text-xl font-semibold text-gray-900 leading-none tracking-tight", className)}
      {...props}
    />
  ),
)
GlassCardTitle.displayName = "GlassCardTitle"

const GlassCardDescription = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLParagraphElement>>(
  ({ className, ...props }, ref) => <p ref={ref} className={cn("text-sm text-gray-600", className)} {...props} />,
)
GlassCardDescription.displayName = "GlassCardDescription"

const GlassCardContent = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => <div ref={ref} className={cn("p-6 pt-0", className)} {...props} />,
)
GlassCardContent.displayName = "GlassCardContent"

const GlassCardFooter = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("flex items-center p-6 pt-0", className)} {...props} />
  ),
)
GlassCardFooter.displayName = "GlassCardFooter"

export { GlassCard, GlassCardHeader, GlassCardTitle, GlassCardDescription, GlassCardContent, GlassCardFooter }
