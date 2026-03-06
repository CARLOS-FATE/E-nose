"use client"

import { useState, useEffect, useCallback } from "react"
import { Activity, Wifi, WifiOff, Clock, Cpu } from "lucide-react"
import { Badge } from "@/components/ui/badge"

type ServiceStatus = "online" | "offline" | "checking"

interface StatusState {
    api: ServiceStatus
    lastDataTime: string | null
    deviceId: string
    sessionStart: Date
}

export function SystemStatusBar() {
    const [status, setStatus] = useState<StatusState>({
        api: "checking",
        lastDataTime: null,
        deviceId: "---",
        sessionStart: new Date(),
    })
    const [elapsed, setElapsed] = useState("00:00")

    const checkHealth = useCallback(async () => {
        try {
            const res = await fetch("http://localhost:8000/health", { signal: AbortSignal.timeout(3000) })
            if (res.ok) {
                setStatus((s) => ({ ...s, api: "online" }))
            } else {
                setStatus((s) => ({ ...s, api: "offline" }))
            }
        } catch {
            setStatus((s) => ({ ...s, api: "offline" }))
        }
    }, [])

    const fetchLatest = useCallback(async () => {
        try {
            const res = await fetch("http://localhost:8000/api/latest", { signal: AbortSignal.timeout(3000) })
            if (res.ok) {
                const data = await res.json()
                if (data.timestamp) {
                    setStatus((s) => ({
                        ...s,
                        lastDataTime: data.timestamp,
                        deviceId: data.device_id || "---",
                    }))
                }
            }
        } catch {
            /* silent */
        }
    }, [])

    useEffect(() => {
        checkHealth()
        fetchLatest()
        const interval = setInterval(() => {
            checkHealth()
            fetchLatest()
        }, 5000)
        return () => clearInterval(interval)
    }, [checkHealth, fetchLatest])

    useEffect(() => {
        const timer = setInterval(() => {
            const diff = Math.floor((Date.now() - status.sessionStart.getTime()) / 1000)
            const m = String(Math.floor(diff / 60)).padStart(2, "0")
            const s = String(diff % 60).padStart(2, "0")
            setElapsed(`${m}:${s}`)
        }, 1000)
        return () => clearInterval(timer)
    }, [status.sessionStart])

    const statusColor = status.api === "online" ? "bg-emerald-500" : status.api === "offline" ? "bg-red-500" : "bg-amber-500"
    const StatusIcon = status.api === "online" ? Wifi : WifiOff

    return (
        <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-slate-800/60 bg-slate-950/90 px-4 sm:px-6 backdrop-blur-xl">
            {/* Logo */}
            <div className="flex items-center gap-2.5">
                <div className="relative flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-teal-500 to-cyan-600 shadow-lg shadow-teal-500/20">
                    <Activity className="h-4 w-4 text-white" />
                </div>
                <div>
                    <h1 className="text-sm font-bold tracking-tight text-slate-100">E-NOSE</h1>
                    <p className="text-[10px] text-slate-500 leading-none">Periodontal Diagnostics</p>
                </div>
            </div>

            {/* Spacer */}
            <div className="flex-1" />

            {/* Status Pills */}
            <div className="hidden sm:flex items-center gap-2">
                <Badge variant="outline" className="gap-1.5 border-slate-700/60 text-slate-400 text-[11px] py-0.5">
                    <Cpu className="h-3 w-3" />
                    {status.deviceId}
                </Badge>
                <Badge variant="outline" className="gap-1.5 border-slate-700/60 text-slate-400 text-[11px] py-0.5">
                    <Clock className="h-3 w-3" />
                    {elapsed}
                </Badge>
            </div>

            {/* API Status */}
            <div className="flex items-center gap-1.5 rounded-full border border-slate-800/60 bg-slate-900/50 px-2.5 py-1">
                <StatusIcon className="h-3 w-3 text-slate-400" />
                <span className="text-[11px] text-slate-400">API</span>
                <div className={`h-2 w-2 rounded-full ${statusColor} ${status.api === "online" ? "animate-pulse" : ""}`} />
            </div>
        </header>
    )
}
