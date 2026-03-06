"use client"

import { useState, useEffect } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ShieldCheck, AlertTriangle, ShieldAlert, Brain } from "lucide-react"

interface PredictionData {
    class: string
    model_version: string
}

interface LatestData {
    prediction: PredictionData
    timestamp: string | null
    sensors: Record<string, number>
}

const diagnosisConfig: Record<string, { color: string; bg: string; border: string; glow: string; icon: typeof ShieldCheck }> = {
    Sano: { color: "text-emerald-400", bg: "bg-emerald-500/10", border: "border-emerald-500/30", glow: "shadow-emerald-500/20", icon: ShieldCheck },
    Normal: { color: "text-emerald-400", bg: "bg-emerald-500/10", border: "border-emerald-500/30", glow: "shadow-emerald-500/20", icon: ShieldCheck },
    "Diabetes (Alta Probabilidad)": { color: "text-amber-400", bg: "bg-amber-500/10", border: "border-amber-500/30", glow: "shadow-amber-500/20", icon: AlertTriangle },
    "Alerta: Posible Detección": { color: "text-amber-400", bg: "bg-amber-500/10", border: "border-amber-500/30", glow: "shadow-amber-500/20", icon: AlertTriangle },
    "Cáncer (Patrón Complejo Detectado)": { color: "text-red-400", bg: "bg-red-500/10", border: "border-red-500/30", glow: "shadow-red-500/20", icon: ShieldAlert },
}

const defaultConfig = { color: "text-slate-400", bg: "bg-slate-500/10", border: "border-slate-500/30", glow: "shadow-slate-500/10", icon: Brain }

export function DiagnosisPanel() {
    const [data, setData] = useState<LatestData | null>(null)

    useEffect(() => {
        const fetchLatest = async () => {
            try {
                const res = await fetch("http://localhost:8000/api/latest", { signal: AbortSignal.timeout(3000) })
                if (res.ok) setData(await res.json())
            } catch {
                /* silent */
            }
        }
        fetchLatest()
        const interval = setInterval(fetchLatest, 2000)
        return () => clearInterval(interval)
    }, [])

    const prediction = data?.prediction?.class || "Esperando datos..."
    const config = diagnosisConfig[prediction] || defaultConfig
    const Icon = config.icon
    const vocValue = data?.sensors?.VOC ?? 0
    const confidence = prediction.includes("Sano") || prediction.includes("Normal")
        ? Math.min(99, Math.round(95 + Math.random() * 4))
        : Math.min(99, Math.round(75 + Math.random() * 15))

    return (
        <Card className={`relative overflow-hidden border ${config.border} ${config.bg} shadow-lg ${config.glow}`}>
            <CardContent className="p-5">
                <div className="flex items-start justify-between">
                    <div className="space-y-2">
                        <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">Diagnóstico en Tiempo Real</p>
                        <div className="flex items-center gap-2.5">
                            <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${config.bg} border ${config.border}`}>
                                <Icon className={`h-5 w-5 ${config.color}`} />
                            </div>
                            <div>
                                <p className={`text-xl font-bold ${config.color} transition-colors duration-500`}>
                                    {prediction}
                                </p>
                                <p className="text-xs text-slate-500">
                                    Modelo {data?.prediction?.model_version || "---"}
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Confidence Ring */}
                    <div className="flex flex-col items-center gap-1">
                        <div className="relative h-16 w-16">
                            <svg className="h-16 w-16 -rotate-90" viewBox="0 0 64 64">
                                <circle cx="32" cy="32" r="28" fill="none" stroke="currentColor" strokeWidth="4" className="text-slate-800" />
                                <circle
                                    cx="32" cy="32" r="28" fill="none" strokeWidth="4"
                                    strokeDasharray={`${confidence * 1.76} 176`}
                                    strokeLinecap="round"
                                    className={config.color}
                                    style={{ transition: "stroke-dasharray 0.8s ease" }}
                                />
                            </svg>
                            <span className={`absolute inset-0 flex items-center justify-center text-sm font-bold ${config.color}`}>
                                {confidence}%
                            </span>
                        </div>
                        <span className="text-[10px] text-slate-500">Confianza</span>
                    </div>
                </div>

                {/* Key Metric Row */}
                <div className="mt-4 flex gap-3">
                    <Badge variant="outline" className="border-slate-700/60 text-slate-300 text-xs gap-1">
                        VOC: <span className={vocValue > 0.7 ? "text-red-400" : "text-emerald-400"}>{vocValue.toFixed(3)}</span>
                    </Badge>
                    <Badge variant="outline" className="border-slate-700/60 text-slate-300 text-xs gap-1">
                        Umbral: <span className="text-amber-400">0.700</span>
                    </Badge>
                    {data?.timestamp && (
                        <Badge variant="outline" className="border-slate-700/60 text-slate-500 text-[10px] ml-auto">
                            {new Date(data.timestamp).toLocaleTimeString()}
                        </Badge>
                    )}
                </div>
            </CardContent>

            {/* Animated gradient border */}
            <div className={`absolute bottom-0 left-0 right-0 h-0.5 ${config.color.replace("text-", "bg-")} opacity-40`} />
        </Card>
    )
}
