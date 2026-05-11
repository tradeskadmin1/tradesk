"use client"

import { useEffect, useRef } from "react"
import { createChart, AreaSeries } from "lightweight-charts"

export interface ChartDataPoint {
    time: string
    value: number
}

const PLACEHOLDER: ChartDataPoint[] = [
    { time: '2024-05-06', value: 26480 },
    { time: '2024-05-07', value: 26900 },
    { time: '2024-05-08', value: 27200 },
    { time: '2024-05-09', value: 27050 },
    { time: '2024-05-10', value: 27800 },
    { time: '2024-05-11', value: 28300 },
    { time: '2024-05-12', value: 28940 },
]

interface ChartProps {
    data?: ChartDataPoint[]
    height?: string
    /** When true, renders an x-axis time scale so dates are visible */
    showTimeScale?: boolean
}

export default function Chart({ data, height = "h-32", showTimeScale = false }: ChartProps) {
    const containerRef = useRef<HTMLDivElement>(null)
    // Keep a stable ref so the effect doesn't re-run on every data change
    const dataRef = useRef(data)
    dataRef.current = data

    useEffect(() => {
        const el = containerRef.current
        if (!el) return

        const chart = createChart(el, {
            layout: {
                background: { color: 'transparent' },
                textColor: '#7a6a5a',
                attributionLogo: false,
            },
            grid: {
                vertLines: { visible: false },
                horzLines: { visible: false },
            },
            crosshair: {
                horzLine: { visible: false },
                vertLine: { color: '#2e2520', width: 1 },
            },
            rightPriceScale: { visible: false },
            timeScale: {
                visible: showTimeScale,
                borderVisible: false,
                tickMarkFormatter: (time: number) => {
                    const d = new Date(time * 1000)
                    return `${d.getMonth() + 1}/${d.getDate()}`
                },
            },
            handleScroll: false,
            handleScale: false,
            width:  el.clientWidth,
            height: el.clientHeight,
        })

        const series = chart.addSeries(AreaSeries, {
            lineColor:        '#FF5733',
            topColor:         'rgba(255, 87, 51, 0.25)',
            bottomColor:      'rgba(255, 87, 51, 0.00)',
            lineWidth:        2,
            priceLineVisible: false,
            lastValueVisible: false,
        })

        const points = (dataRef.current && dataRef.current.length > 0)
            ? dataRef.current
            : PLACEHOLDER

        series.setData(points as any)
        chart.timeScale().fitContent()

        const ro = new ResizeObserver(() => {
            if (containerRef.current) {
                chart.applyOptions({
                    width:  containerRef.current.clientWidth,
                    height: containerRef.current.clientHeight,
                })
            }
        })
        ro.observe(el)

        return () => {
            ro.disconnect()
            chart.remove()
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [showTimeScale])

    return <div ref={containerRef} className={`${height} w-full`} />
}
