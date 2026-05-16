"use client"

import { useEffect, useRef, useState } from "react"
import { createChart, CandlestickSeries, type IChartApi, type UTCTimestamp } from "lightweight-charts"
import { SPOT_INTERVALS, type SpotInterval } from "@/config/spot"

interface Candle {
  time:  UTCTimestamp
  open:  number
  high:  number
  low:   number
  close: number
}

interface Props {
  pair:             string
  interval:         SpotInterval
  onIntervalChange: (i: SpotInterval) => void
}

export default function SpotChart({ pair, interval, onIntervalChange }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const chartRef     = useRef<IChartApi | null>(null)
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState<string | null>(null)

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    // Destroy any previous chart instance
    chartRef.current?.remove()
    chartRef.current = null
    setLoading(true)
    setError(null)

    const chart = createChart(container, {
      layout: {
        background: { color: "#0d0a07" },
        textColor:  "#7a6a5a",
      },
      grid: {
        vertLines: { color: "#1e1510" },
        horzLines: { color: "#1e1510" },
      },
      crosshair: {
        vertLine: { color: "#FF5733", style: 1, labelBackgroundColor: "#FF5733" },
        horzLine: { color: "#FF5733", style: 1, labelBackgroundColor: "#FF5733" },
      },
      rightPriceScale: { borderColor: "#2e2520" },
      timeScale: {
        borderColor:    "#2e2520",
        timeVisible:    true,
        secondsVisible: false,
      },
      width:  container.clientWidth,
      height: container.clientHeight || 400,
    })

    chartRef.current = chart

    const candleSeries = chart.addSeries(CandlestickSeries, {
      upColor:       "#22c55e",
      downColor:     "#ef4444",
      borderVisible: false,
      wickUpColor:   "#22c55e",
      wickDownColor: "#ef4444",
    })

    // Fetch klines
    fetch(`/api/spot/klines?pair=${encodeURIComponent(pair)}&interval=${interval}&limit=500`)
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`)
        return r.json()
      })
      .then((data) => {
        if (!data.candles?.length) throw new Error("No candle data returned")
        const candles: Candle[] = data.candles.map((c: any) => ({
          time:  c.time as UTCTimestamp,
          open:  c.open,
          high:  c.high,
          low:   c.low,
          close: c.close,
        }))
        candleSeries.setData(candles)
        chart.timeScale().fitContent()
        setLoading(false)
      })
      .catch((err) => {
        console.error("[SpotChart] klines fetch failed:", err)
        setError("Chart data unavailable")
        setLoading(false)
      })

    // Resize observer
    const observer = new ResizeObserver(() => {
      if (container && chartRef.current) {
        chartRef.current.applyOptions({
          width:  container.clientWidth,
          height: container.clientHeight || 400,
        })
      }
    })
    observer.observe(container)

    return () => {
      observer.disconnect()
      chart.remove()
      chartRef.current = null
    }
  }, [pair, interval])

  return (
    <div className="flex flex-col h-full bg-[#0d0a07]">
      {/* Interval selector */}
      <div className="flex items-center gap-0.5 px-4 py-2 border-b border-[#2e2520] shrink-0">
        {SPOT_INTERVALS.map((i) => (
          <button
            key={i}
            onClick={() => onIntervalChange(i)}
            className={`px-2.5 py-1 rounded font-mono text-[11px] font-bold transition-all cursor-pointer ${
              interval === i
                ? "bg-[#FF5733]/10 text-[#FF5733]"
                : "text-[#7a6a5a] hover:text-white hover:bg-white/5"
            }`}
          >
            {i.toUpperCase()}
          </button>
        ))}
      </div>

      {/* Chart canvas area */}
      <div className="relative flex-1 min-h-0">
        {/* Canvas */}
        <div ref={containerRef} className="absolute inset-0" />

        {/* Loading skeleton */}
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-[#0d0a07]">
            <div className="flex flex-col items-center gap-3">
              <span className="flex gap-1.5">
                {[0, 1, 2].map((i) => (
                  <span
                    key={i}
                    className="w-2 h-2 rounded-full bg-[#FF5733] animate-bounce"
                    style={{ animationDelay: `${i * 0.15}s` }}
                  />
                ))}
              </span>
              <span className="font-mono text-[11px] text-[#7a6a5a]">Loading chart…</span>
            </div>
          </div>
        )}

        {/* Error state */}
        {!loading && error && (
          <div className="absolute inset-0 flex items-center justify-center bg-[#0d0a07]">
            <div className="flex flex-col items-center gap-2 text-center px-8">
              <span className="text-2xl">📡</span>
              <span className="font-mono text-[12px] text-[#FF5733]">{error}</span>
              <span className="font-mono text-[10px] text-[#7a6a5a]">Price data may still be available in the order form</span>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
