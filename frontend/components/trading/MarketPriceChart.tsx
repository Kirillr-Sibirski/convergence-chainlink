"use client";

import { useEffect, useRef } from "react";
import { AreaSeries, createChart, type IChartApi, type ISeriesApi, type Time, type UTCTimestamp } from "lightweight-charts";
import type { MarketPricePoint } from "@/lib/web3-viem";

interface MarketPriceChartProps {
  points: MarketPricePoint[];
}

function toUtc(ts: number): UTCTimestamp {
  return Math.floor(ts) as UTCTimestamp;
}

export function MarketPriceChart({ points }: MarketPriceChartProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<"Area", Time> | null>(null);
  const latest = points.length > 0 ? points[points.length - 1].yesPercent : 50;

  useEffect(() => {
    if (!containerRef.current) return;

    if (!chartRef.current) {
      const initialWidth = Math.max(1, containerRef.current.clientWidth);
      const chart = createChart(containerRef.current, {
        width: initialWidth,
        height: 300,
        layout: {
          background: { color: "transparent" },
          textColor: "#6b7280",
          fontFamily: "var(--font-geist-sans, sans-serif)",
        },
        rightPriceScale: {
          borderColor: "#e5e7eb",
        },
        timeScale: {
          borderColor: "#e5e7eb",
          timeVisible: true,
          secondsVisible: false,
        },
        grid: {
          vertLines: { color: "#f3f4f6" },
          horzLines: { color: "#f3f4f6" },
        },
        localization: {
          priceFormatter: (v: number) => `${v.toFixed(2)}%`,
        },
        handleScroll: {
          mouseWheel: true,
          pressedMouseMove: true,
          horzTouchDrag: true,
          vertTouchDrag: false,
        },
        handleScale: {
          axisPressedMouseMove: true,
          mouseWheel: true,
          pinch: true,
        },
      });
      const areaSeries = chart.addSeries(AreaSeries, {
        lineColor: "#16a34a",
        lineWidth: 2,
        topColor: "rgba(34, 197, 94, 0.35)",
        bottomColor: "rgba(34, 197, 94, 0.04)",
      });

      chartRef.current = chart;
      seriesRef.current = areaSeries;
    }

    const chart = chartRef.current;
    const series = seriesRef.current;
    if (!chart || !series) return;

    const formatted = points.map((p) => ({
      time: toUtc(p.timestamp),
      value: p.yesPercent,
    }));
    series.setData(formatted);
    chart.timeScale().fitContent();

    const resize = () => {
      if (!containerRef.current || !chartRef.current) return;
      const width = Math.max(1, containerRef.current.clientWidth);
      chartRef.current.applyOptions({ width, height: 300 });
    };

    resize();
    const observer = new ResizeObserver(() => resize());
    observer.observe(containerRef.current);

    return () => {
      observer.disconnect();
    };
  }, [points]);

  useEffect(() => {
    return () => {
      if (chartRef.current) {
        chartRef.current.remove();
        chartRef.current = null;
      }
      seriesRef.current = null;
    };
  }, []);

  return (
    <div className="space-y-3">
      {points.length === 0 ? (
        <p className="text-sm text-muted-foreground">No price history yet.</p>
      ) : (
        <>
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">YES price history</span>
            <span className="font-semibold text-green-700">{latest.toFixed(2)}%</span>
          </div>
          <div className="w-full min-w-0 overflow-hidden rounded-lg border border-gray-200 bg-white/90 p-2">
            <div ref={containerRef} className="w-full min-w-0 h-[300px]" />
          </div>
        </>
      )}
    </div>
  );
}
