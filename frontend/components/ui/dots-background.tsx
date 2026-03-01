"use client"

import React from "react"
import { cn } from "@/lib/utils"

export function DotsBackground({
  children,
  className,
  dotSize = 1,
  dotColor = "rgba(0, 0, 0, 0.15)",
  backgroundColor = "transparent",
}: {
  children?: React.ReactNode
  className?: string
  dotSize?: number
  dotColor?: string
  backgroundColor?: string
}) {
  return (
    <div
      className={cn("relative w-full h-full", className)}
      style={{
        background: backgroundColor,
        backgroundImage: `radial-gradient(circle, ${dotColor} ${dotSize}px, transparent ${dotSize}px)`,
        backgroundSize: "30px 30px",
      }}
    >
      {children}
    </div>
  )
}
