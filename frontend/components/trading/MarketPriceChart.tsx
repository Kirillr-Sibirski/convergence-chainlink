"use client";

import { useMemo } from "react";
import type { MarketPricePoint } from "@/lib/web3-viem";

interface MarketPriceChartProps {
  points: MarketPricePoint[];
}

function formatTs(ts: number) {
  return new Date(ts * 1000).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export function MarketPriceChart({ points }: MarketPriceChartProps) {
  const chart = useMemo(() => {
    const width = 640;
    const height = 220;
    const pad = 24;
    const values = points.map((p) => p.yesPercent);
    const minX = 0;
    const maxX = Math.max(1, points.length - 1);

    const toX = (i: number) => pad + ((width - pad * 2) * (i - minX)) / (maxX - minX);
    const toY = (v: number) => height - pad - ((height - pad * 2) * v) / 100;

    const line = points.map((p, i) => `${i === 0 ? "M" : "L"} ${toX(i)} ${toY(p.yesPercent)}`).join(" ");
    const area = `${line} L ${toX(points.length - 1)} ${height - pad} L ${toX(0)} ${height - pad} Z`;

    return {
      width,
      height,
      line,
      area,
      latest: values[values.length - 1] ?? 50,
      firstLabel: points[0] ? formatTs(points[0].timestamp) : "-",
      lastLabel: points[points.length - 1] ? formatTs(points[points.length - 1].timestamp) : "-",
    };
  }, [points]);

  if (points.length === 0) {
    return <p className="text-sm text-muted-foreground">No price history yet.</p>;
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between text-xs">
        <span className="text-muted-foreground">YES price history</span>
        <span className="font-semibold text-green-700">{chart.latest.toFixed(2)}%</span>
      </div>
      <div className="rounded-lg border border-gray-200 bg-white/90 p-2">
        <svg viewBox={`0 0 ${chart.width} ${chart.height}`} className="w-full h-44">
          <line x1="24" y1="24" x2="24" y2={chart.height - 24} stroke="#d1d5db" strokeWidth="1" />
          <line x1="24" y1={chart.height - 24} x2={chart.width - 24} y2={chart.height - 24} stroke="#d1d5db" strokeWidth="1" />
          <path d={chart.area} fill="rgba(34,197,94,0.12)" />
          <path d={chart.line} fill="none" stroke="#16a34a" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>{chart.firstLabel}</span>
        <span>{chart.lastLabel}</span>
      </div>
    </div>
  );
}

