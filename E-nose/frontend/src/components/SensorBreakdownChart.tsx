"use client"

import { useState, useEffect } from "react"
import { Area, AreaChart, ResponsiveContainer, XAxis, YAxis, CartesianGrid, ReferenceLine, Tooltip } from "recharts"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

type SensorPoint = {
    time: string
    value: number
}

interface SensorChartConfig {
    key: string
    label: string
    color: string
    gradientId: string
    threshold: number
    description: string
}

const chartConfigs: SensorChartConfig[] = [
    { key: "VOC", label: "VOC — Compuestos Orgánicos Volátiles", color: "#f59e0b", gradientId: "vocGrad", threshold: 0.7, description: "Acetona, marcador de cetoacidosis diabética" },
    { key: "MQ3", label: "MQ3 — Sensor de Alcohol", color: "#10b981", gradientId: "mq3Grad", threshold: 0.5, description: "Detección de etanol y alcoholes volátiles" },
    { key: "MQ135", label: "MQ135 — Calidad del Aire", color: "#3b82f6", gradientId: "mq135Grad", threshold: 0.6, description: "NH₃, NOₓ, CO₂ — gases de calidad ambiental" },
    { key: "NIR", label: "NIR — Infrarrojo Cercano", color: "#a855f7", gradientId: "nirGrad", threshold: 0.4, description: "Espectroscopía de absorción molecular" },
]

function IndividualChart({ config, data }: { config: SensorChartConfig; data: SensorPoint[] }) {
    const latestVal = data.length > 0 ? data[data.length - 1].value : 0
    const isAlert = latestVal > config.threshold

    return (
        <Card className="bg-slate-900/60 border-slate-800/60">
            <CardHeader className="pb-2 pt-4 px-4">
                <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-medium text-slate-300">{config.label}</CardTitle>
                    <span className={`text-sm font-bold ${isAlert ? "text-red-400" : "text-slate-300"}`}>
                        {latestVal.toFixed(3)}
                    </span>
                </div>
                <p className="text-[11px] text-slate-500">{config.description}</p>
            </CardHeader>
            <CardContent className="h-[180px] px-2 pb-3">
                <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={data} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                        <defs>
                            <linearGradient id={config.gradientId} x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor={config.color} stopOpacity={0.3} />
                                <stop offset="95%" stopColor={config.color} stopOpacity={0} />
                            </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                        <XAxis dataKey="time" stroke="#334155" fontSize={10} tickLine={false} axisLine={false} />
                        <YAxis stroke="#334155" fontSize={10} tickLine={false} axisLine={false} domain={[0, 1]} />
                        <ReferenceLine y={config.threshold} stroke="#ef4444" strokeDasharray="5 5" strokeOpacity={0.5} />
                        <Tooltip
                            contentStyle={{ backgroundColor: "#0f172a", borderColor: "#1e293b", color: "#f8fafc", fontSize: 12 }}
                        />
                        <Area
                            type="monotone"
                            dataKey="value"
                            stroke={config.color}
                            fill={`url(#${config.gradientId})`}
                            strokeWidth={2}
                            dot={false}
                            animationDuration={300}
                        />
                    </AreaChart>
                </ResponsiveContainer>
            </CardContent>
        </Card>
    )
}

export function SensorBreakdownChart() {
    const [sensorData, setSensorData] = useState<Record<string, SensorPoint[]>>({
        VOC: [], MQ3: [], MQ135: [], NIR: [],
    })

    useEffect(() => {
        let t = 0
        const interval = setInterval(() => {
            t++
            const now = new Date()
            const timeStr = `${now.getMinutes()}:${String(now.getSeconds()).padStart(2, "0")}`

            const vocPeak = t % 30 > 10 && t % 30 < 25 ? 0.4 : 0

            setSensorData((prev) => {
                const newData: Record<string, SensorPoint[]> = {
                    VOC: [...prev.VOC, { time: timeStr, value: 0.1 + Math.random() * 0.5 + vocPeak }],
                    MQ3: [...prev.MQ3, { time: timeStr, value: 0.2 + Math.random() * 0.15 }],
                    MQ135: [...prev.MQ135, { time: timeStr, value: 0.3 + Math.random() * 0.08 }],
                    NIR: [...prev.NIR, { time: timeStr, value: 0.15 + Math.random() * 0.12 }],
                }
                // Keep last 40 points
                for (const key of Object.keys(newData)) {
                    if (newData[key].length > 40) newData[key] = newData[key].slice(-40)
                }
                return newData
            })
        }, 1000)

        return () => clearInterval(interval)
    }, [])

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {chartConfigs.map((config) => (
                <IndividualChart key={config.key} config={config} data={sensorData[config.key] || []} />
            ))}
        </div>
    )
}
