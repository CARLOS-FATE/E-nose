"use client"

import { useState, useEffect, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Scan, RotateCcw } from "lucide-react"

interface SensorConfig {
    key: string
    label: string
    unit: string
    color: string
    max: number
    threshold: number
    icon: string
    thresholds: { bajo: number; medio: number; alto: number }
}

const sensors: SensorConfig[] = [
    {
        key: "VOC", label: "VOC", unit: "ppm", color: "#f59e0b", max: 1.0, threshold: 0.7, icon: "🧪",
        thresholds: { bajo: 0.25, medio: 0.50, alto: 0.70 }
    },
    {
        key: "MQ3", label: "MQ3", unit: "ppm", color: "#10b981", max: 1.0, threshold: 0.5, icon: "🍷",
        thresholds: { bajo: 0.20, medio: 0.35, alto: 0.50 }
    },
    {
        key: "MQ135", label: "MQ135", unit: "ppm", color: "#3b82f6", max: 1.0, threshold: 0.6, icon: "🌬️",
        thresholds: { bajo: 0.30, medio: 0.45, alto: 0.60 }
    },
    {
        key: "NIR", label: "NIR", unit: "nm⁻¹", color: "#a855f7", max: 1.0, threshold: 0.4, icon: "🔬",
        thresholds: { bajo: 0.15, medio: 0.30, alto: 0.45 }
    },
]

type Level = "bajo" | "medio" | "alto" | "muy alto"

const levelStyles: Record<Level, string> = {
    bajo: "bg-emerald-500/20 text-emerald-400 border-emerald-500/40",
    medio: "bg-amber-500/20 text-amber-400 border-amber-500/40",
    alto: "bg-orange-500/20 text-orange-400 border-orange-500/40",
    "muy alto": "bg-red-500/20 text-red-400 border-red-500/40",
}

function getLevel(value: number, thresholds: { bajo: number; medio: number; alto: number }): Level {
    if (value >= thresholds.alto) return "muy alto"
    if (value >= thresholds.medio) return "alto"
    if (value >= thresholds.bajo) return "medio"
    return "bajo"
}

function GaugeRing({ value, max, color, threshold }: { value: number; max: number; color: string; threshold: number }) {
    const pct = Math.min(100, (value / max) * 100)
    const threshPct = (threshold / max) * 100
    const isAlert = value > threshold
    const radius = 38
    const circumference = 2 * Math.PI * radius
    const dashoffset = circumference - (pct / 100) * circumference

    return (
        <div className="relative h-24 w-24 mx-auto">
            <svg className="-rotate-90" viewBox="0 0 96 96">
                <circle cx="48" cy="48" r={radius} fill="none" strokeWidth="6" stroke="#1e293b" />
                <circle
                    cx="48" cy="48" r={radius} fill="none" strokeWidth="6"
                    strokeDasharray={`${(threshPct / 100) * circumference} ${circumference}`}
                    stroke={color} opacity={0.15}
                />
                <circle
                    cx="48" cy="48" r={radius} fill="none" strokeWidth="6"
                    strokeDasharray={circumference}
                    strokeDashoffset={dashoffset}
                    strokeLinecap="round"
                    stroke={isAlert ? "#ef4444" : color}
                    style={{ transition: "stroke-dashoffset 0.6s ease, stroke 0.4s ease" }}
                />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-lg font-bold text-slate-100" style={{ color: isAlert ? "#ef4444" : color }}>
                    {value.toFixed(2)}
                </span>
            </div>
        </div>
    )
}

export function SensorGauges() {
    const [values, setValues] = useState<Record<string, number>>({ VOC: 0, MQ3: 0, MQ135: 0, NIR: 0 })
    const [scanned, setScanned] = useState(false)
    const [scanValues, setScanValues] = useState<Record<string, number>>({ VOC: 0, MQ3: 0, MQ135: 0, NIR: 0 })
    const [scanning, setScanning] = useState(false)

    const fetchLatest = useCallback(async () => {
        try {
            const res = await fetch("http://localhost:8000/api/latest", { signal: AbortSignal.timeout(3000) })
            if (res.ok) {
                const data = await res.json()
                if (data.sensors) {
                    setValues({
                        VOC: data.sensors.VOC || 0,
                        MQ3: data.sensors.MQ3 || 0,
                        MQ135: data.sensors.MQ135 || 0,
                        NIR: data.sensors.NIR || 0,
                    })
                }
            }
        } catch {
            setValues({
                VOC: 0.1 + Math.random() * 0.5,
                MQ3: 0.2 + Math.random() * 0.15,
                MQ135: 0.3 + Math.random() * 0.08,
                NIR: 0.15 + Math.random() * 0.1,
            })
        }
    }, [])

    useEffect(() => {
        fetchLatest()
        const interval = setInterval(fetchLatest, 2000)
        return () => clearInterval(interval)
    }, [fetchLatest])

    const handleScan = () => {
        setScanning(true)
        setTimeout(() => {
            setScanValues({ ...values })
            setScanned(true)
            setScanning(false)
        }, 800)
    }

    const handleReset = () => {
        setScanned(false)
        setScanValues({ VOC: 0, MQ3: 0, MQ135: 0, NIR: 0 })
    }

    return (
        <div className="space-y-3">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                {sensors.map((sensor) => {
                    const val = scanned ? scanValues[sensor.key] : values[sensor.key]
                    const level = getLevel(val || 0, sensor.thresholds)

                    return (
                        <Card key={sensor.key} className={`bg-slate-900/60 border-slate-800/60 backdrop-blur-sm transition-all duration-300 ${scanned ? "ring-1 ring-slate-700/50" : ""}`}>
                            <CardHeader className="pb-1 pt-3 px-3">
                                <CardTitle className="text-xs font-medium text-slate-400 flex items-center gap-1.5">
                                    <span>{sensor.icon}</span>
                                    {sensor.label}
                                    <span className="ml-auto text-[10px] text-slate-600">{sensor.unit}</span>
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="pb-3 px-3">
                                <GaugeRing
                                    value={val || 0}
                                    max={sensor.max}
                                    color={sensor.color}
                                    threshold={sensor.threshold}
                                />

                                {/* Level badge — visible after scan */}
                                {scanned ? (
                                    <div className="flex justify-center mt-2">
                                        <Badge variant="outline" className={`text-xs px-3 py-0.5 font-semibold uppercase tracking-wide ${levelStyles[level]}`}>
                                            {level}
                                        </Badge>
                                    </div>
                                ) : (
                                    <div className="flex justify-between mt-1.5 text-[10px] text-slate-600 px-2">
                                        <span>0</span>
                                        <span className="text-amber-500/60">⚡{sensor.threshold}</span>
                                        <span>{sensor.max}</span>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    )
                })}
            </div>

            {/* Scan / Reset Button */}
            <div className="flex justify-center">
                {!scanned ? (
                    <button
                        onClick={handleScan}
                        disabled={scanning}
                        className={`
              flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-semibold
              bg-gradient-to-r from-teal-600 to-cyan-600 text-white
              shadow-lg shadow-teal-500/20
              hover:from-teal-500 hover:to-cyan-500 hover:shadow-teal-500/30
              active:scale-95
              disabled:opacity-60 disabled:cursor-not-allowed
              transition-all duration-200
              ${scanning ? "animate-pulse" : ""}
            `}
                    >
                        <Scan className={`h-4 w-4 ${scanning ? "animate-spin" : ""}`} />
                        {scanning ? "Escaneando..." : "Escanear Niveles"}
                    </button>
                ) : (
                    <div className="flex items-center gap-3">
                        <div className="flex items-center gap-2 text-xs text-slate-500">
                            <span className="inline-block h-2 w-2 rounded-full bg-teal-500 animate-pulse" />
                            Escaneo capturado
                        </div>
                        <button
                            onClick={handleReset}
                            className="
                flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-medium
                border border-slate-700/60 text-slate-400
                hover:bg-slate-800/50 hover:text-slate-300
                active:scale-95
                transition-all duration-200
              "
                        >
                            <RotateCcw className="h-3.5 w-3.5" />
                            Nuevo Escaneo
                        </button>
                    </div>
                )}
            </div>
        </div>
    )
}
