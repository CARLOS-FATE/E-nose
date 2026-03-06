"use client"

import { useState, useEffect } from "react"
import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid, Legend, ReferenceLine } from "recharts"
import { Loader2 } from "lucide-react"

type SensorData = {
    time: string
    voc: number
    mq3: number
    mq135: number
    nir: number
}

export function WeightChart() {
    const [data, setData] = useState<SensorData[]>([])
    const [isClient, setIsClient] = useState(false)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        setIsClient(true)
        let t = 0
        const interval = setInterval(() => {
            t++
            setData((prev) => {
                const now = new Date()
                const timeStr = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}:${String(now.getSeconds()).padStart(2, "0")}`
                const vocPeak = t % 30 > 10 && t % 30 < 25 ? 0.4 : 0
                const newData: SensorData = {
                    time: timeStr,
                    voc: Math.max(0, 0.1 + Math.random() * 0.5 + vocPeak + (Math.random() - 0.5) * 0.04),
                    mq3: Math.max(0, 0.2 + Math.random() * 0.12 + (Math.random() - 0.5) * 0.02),
                    mq135: Math.max(0, 0.3 + Math.random() * 0.06 + (Math.random() - 0.5) * 0.02),
                    nir: Math.max(0, 0.15 + Math.random() * 0.1 + (Math.random() - 0.5) * 0.02),
                }
                setLoading(false)
                const nextData = [...prev, newData]
                return nextData.length > 40 ? nextData.slice(-40) : nextData
            })
        }, 1000)
        return () => clearInterval(interval)
    }, [])

    if (!isClient || loading) {
        return (
            <div className="flex h-full w-full items-center justify-center text-slate-500">
                <Loader2 className="h-8 w-8 animate-spin text-teal-500" />
            </div>
        )
    }

    return (
        <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 5, right: 30, left: 0, bottom: 5 }}>
                <defs>
                    <linearGradient id="vocLine" x1="0" y1="0" x2="1" y2="0">
                        <stop offset="0%" stopColor="#f59e0b" stopOpacity={0.6} />
                        <stop offset="100%" stopColor="#f59e0b" stopOpacity={1} />
                    </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="time" stroke="#475569" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis stroke="#475569" fontSize={11} tickLine={false} axisLine={false} domain={[0, 1]} tickFormatter={(v: number) => v.toFixed(1)} />
                <ReferenceLine y={0.7} stroke="#ef4444" strokeDasharray="8 4" strokeOpacity={0.4} label={{ value: "ALERTA", fill: "#ef444480", fontSize: 10, position: "right" }} />
                <Tooltip
                    contentStyle={{
                        backgroundColor: "#0f172a",
                        borderColor: "#334155",
                        borderRadius: "8px",
                        color: "#f8fafc",
                        fontSize: 12,
                    }}
                    itemStyle={{ color: "#f8fafc" }}
                />
                <Legend
                    wrapperStyle={{ fontSize: 11, paddingTop: 8 }}
                    iconType="circle"
                    iconSize={8}
                />
                <Line type="monotone" dataKey="voc" name="VOC (Acetona)" stroke="#f59e0b" strokeWidth={2.5} dot={false} activeDot={{ r: 5, strokeWidth: 2 }} />
                <Line type="monotone" dataKey="mq3" name="MQ3 (Alcohol)" stroke="#10b981" strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
                <Line type="monotone" dataKey="mq135" name="MQ135 (Aire)" stroke="#3b82f6" strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
                <Line type="monotone" dataKey="nir" name="NIR (Infrarrojo)" stroke="#a855f7" strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
            </LineChart>
        </ResponsiveContainer>
    )
}
