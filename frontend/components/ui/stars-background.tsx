"use client"

import React, { useEffect, useRef } from "react"
import { cn } from "@/lib/utils"

export function StarsBackground({
  children,
  className,
  starDensity = 0.0002,
}: {
  children?: React.ReactNode
  className?: string
  starDensity?: number
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    const setCanvasSize = () => {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
    }

    setCanvasSize()

    const stars: { x: number; y: number; radius: number; opacity: number }[] = []
    const numStars = Math.floor(canvas.width * canvas.height * starDensity)

    for (let i = 0; i < numStars; i++) {
      stars.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        radius: Math.random() * 1.5,
        opacity: Math.random() * 0.5 + 0.3,
      })
    }

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)

      stars.forEach((star) => {
        ctx.beginPath()
        ctx.arc(star.x, star.y, star.radius, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(0, 0, 0, ${star.opacity})`
        ctx.fill()
      })
    }

    draw()

    const handleResize = () => {
      setCanvasSize()
      draw()
    }

    window.addEventListener("resize", handleResize)

    return () => {
      window.removeEventListener("resize", handleResize)
    }
  }, [starDensity])

  return (
    <div className={cn("relative w-full h-full", className)}>
      <canvas
        ref={canvasRef}
        className="absolute inset-0 pointer-events-none"
      />
      {children}
    </div>
  )
}
