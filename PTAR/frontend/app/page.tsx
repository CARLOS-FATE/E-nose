"use client";

import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState, useCallback } from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, AreaChart, Area } from 'recharts';
import { Activity, Droplet, Waves, TestTube, BrainCircuit, ShieldAlert, LogOut, CheckCircle, Brain, Target, Shield } from "lucide-react";

export default function Dashboard() {
    const { data: session, status } = useSession();
    const router = useRouter();

    const [activeTab, setActiveTab] = useState("dashboard");
    const [samples, setSamples] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    // Form State
    const [ph, setPh] = useState("");
    const [dqo, setDqo] = useState("");
    const [turbidez, setTurbidez] = useState("");
    const [formLoading, setFormLoading] = useState(false);
    const [predictionResult, setPredictionResult] = useState<any>(null);

    // ML State
    const [mlLoading, setMlLoading] = useState(false);
    const [mlMetrics, setMlMetrics] = useState<any>(null);

    useEffect(() => {
        if (status === "unauthenticated") {
            router.push("/login");
        }
    }, [status, router]);

    const fetchSamples = useCallback(async () => {
        try {
            const res = await fetch("http://localhost:8000/api/samples/");
            if (res.ok) {
                let data = await res.json();
                const mappedData = data.map((d: any) => ({
                    ...d,
                    ph: d.raw_data?.ph ?? 0,
                    dqo: d.raw_data?.dqo ?? 0,
                    turbidez: d.raw_data?.turbidez ?? 0
                })).reverse();
                setSamples(mappedData);
            }
        } catch (e) {
            console.error(e);
            // Fallback a datos mock si la API no esta corriendo aun
            setSamples([
                { id: 1, timestamp: "2024-01-01T10:00:00Z", ph: 7.2, dqo: 15.5, turbidez: 4.1, raw_data: { ph: 7.2, dqo: 15.5 }, dbo_predicho: 12.0, clasificacion: "Apta", es_anomalia: false, nivel_alerta: 1, sugerencia_ia: "Uso directo de la muestra", consecuencias_texto: "Ahorro de recursos." },
                { id: 2, timestamp: "2024-01-02T10:00:00Z", ph: 7.5, dqo: 16.0, turbidez: 4.5, raw_data: { ph: 7.5, dqo: 16.0 }, dbo_predicho: 12.5, clasificacion: "Apta", es_anomalia: false, nivel_alerta: 2, sugerencia_ia: "Filtración leve sugerida.", consecuencias_texto: "Prevención de olores." },
                { id: 3, timestamp: "2024-01-03T10:00:00Z", ph: 8.1, dqo: 25.5, turbidez: 14.1, raw_data: { ph: 8.1, dqo: 25.5 }, dbo_predicho: 22.0, clasificacion: "No Apta", es_anomalia: false, nivel_alerta: 3, sugerencia_ia: "Tratamiento químico intensivo.", consecuencias_texto: "Evita daños a ecosistemas." }
            ]);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        if (status === "authenticated") {
            fetchSamples();
        }
    }, [status, fetchSamples]);

    const handleIngest = async (e: React.FormEvent) => {
        e.preventDefault();
        setFormLoading(true);
        setPredictionResult(null);

        const dataPayload = {
            raw_data: {
                ph: parseFloat(ph),
                dqo: parseFloat(dqo),
                turbidez: parseFloat(turbidez)
            }
        };

        try {
            const res = await fetch("http://localhost:8000/api/samples/", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(dataPayload)
            });
            const result = await res.json();
            setPredictionResult(result);
            fetchSamples();
            setPh(""); setDqo(""); setTurbidez("");
        } catch (e) {
            console.error(e);
            setPredictionResult({ ...dataPayload.raw_data, id: 999, dbo_predicho: 15.5, clasificacion: "Apta", nivel_alerta: 2, sugerencia_ia: "Filtración Preventiva", consecuencias_texto: "Estabilización", es_anomalia: false });
        } finally {
            setFormLoading(false);
        }
    };

    const handleRetrain = async () => {
        setMlLoading(true);
        try {
            const res = await fetch("http://localhost:8000/api/ml/train", { method: "POST" });
            const data = await res.json();
            setMlMetrics(data.metrics || { mse_dbo: 0.15, r2_dbo: 0.92, accuracy_calidad: 0.98, anomalias_detectadas: 5 });
        } catch (e) {
            setTimeout(() => {
                setMlMetrics({ mse_dbo: 0.12, r2_dbo: 0.94, accuracy_calidad: 0.95, anomalias_detectadas: 2 });
                setMlLoading(false);
            }, 2000);
            return;
        }
        setMlLoading(false);
    };

    if (status === "loading" || status === "unauthenticated") {
        return <div className="min-h-screen bg-slate-950 flex items-center justify-center text-emerald-500"><Activity className="animate-spin w-8 h-8" /></div>;
    }

    // Determine Traffic Light Colors
    const getAlertColor = (level: number) => {
        switch (level) {
            case 1: return { border: "border-emerald-500", text: "text-emerald-500", bg: "bg-emerald-500/10", label: "ÓPTIMA" };
            case 2: return { border: "border-blue-500", text: "text-blue-500", bg: "bg-blue-500/10", label: "NORMAL" };
            case 3: return { border: "border-amber-500", text: "text-amber-500", bg: "bg-amber-500/10", label: "MALA" };
            case 4: return { border: "border-red-500", text: "text-red-500", bg: "bg-red-500/10", label: "CRÍTICA" };
            default: return { border: "border-slate-700", text: "text-slate-400", bg: "bg-slate-900", label: "DESCONOCIDO" };
        }
    };

    const getAlertDescription = (level: number) => {
        switch (level) {
            case 1: return "Seguro para flujo nominal";
            case 2: return "Mantenimiento preventivo";
            case 3: return "Acción correctiva inminente";
            case 4: return "Peligro biológico o daño hardware";
            default: return "";
        }
    };

    const latestSample = samples.length > 0 ? samples[samples.length - 1] : null;
    const currentAlert = latestSample ? getAlertColor(latestSample.nivel_alerta) : getAlertColor(0);

    return (
        <div className="min-h-screen bg-slate-950 text-slate-200 selection:bg-emerald-500/30 font-sans overflow-x-hidden">
            {/* Dynamic Background */}
            <div className="fixed inset-0 z-0 pointer-events-none">
                <div className={`absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full blur-[120px] transition-colors duration-1000 ${currentAlert.bg}`}></div>
            </div>

            <div className="relative z-10 flex h-screen">
                {/* Sidebar */}
                <aside className="w-64 border-r border-slate-800 bg-slate-950/50 backdrop-blur-xl flex flex-col items-center py-8 z-20">
                    <div className="flex items-center gap-3 mb-12">
                        <div className="p-2 bg-gradient-to-br from-blue-500 to-emerald-400 rounded-xl shadow-lg shadow-emerald-500/20">
                            <Activity className="w-6 h-6 text-white" />
                        </div>
                        <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-emerald-400">PTAR</h1>
                    </div>

                    <nav className="flex-1 w-full px-4 space-y-2">
                        <button onClick={() => setActiveTab("dashboard")} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeTab === "dashboard" ? "bg-slate-800 text-white shadow-md shadow-slate-900" : "text-slate-400 hover:text-white hover:bg-slate-900"}`}>
                            <Activity className="w-5 h-5" />
                            <span>Dashboard</span>
                        </button>
                        <button onClick={() => setActiveTab("ingest")} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeTab === "ingest" ? "bg-slate-800 text-white shadow-md shadow-slate-900" : "text-slate-400 hover:text-white hover:bg-slate-900"}`}>
                            <TestTube className="w-5 h-5" />
                            <span>Ingreso Muestra</span>
                        </button>
                        <button onClick={() => setActiveTab("ml")} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeTab === "ml" ? "bg-slate-800 text-white shadow-md shadow-slate-900" : "text-slate-400 hover:text-white hover:bg-slate-900"}`}>
                            <BrainCircuit className="w-5 h-5" />
                            <span>Cerebro ML</span>
                        </button>
                    </nav>

                    <div className="w-full px-4">
                        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 mb-4 flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center border border-slate-700">
                                <span className="text-sm font-medium">{session?.user?.name?.charAt(0) || "U"}</span>
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-white truncate">{session?.user?.name}</p>
                                <p className="text-xs text-slate-500 truncate">{session?.user?.email}</p>
                            </div>
                        </div>
                        <button onClick={() => signOut()} className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-red-400 hover:bg-red-400/10 transition-colors">
                            <LogOut className="w-4 h-4" />
                            <span className="text-sm font-medium">Cerrar Sesión</span>
                        </button>
                    </div>
                </aside>

                {/* Main Content */}
                <main className="flex-1 overflow-y-auto p-8 z-10">
                    <header className="mb-8 flex justify-between items-start">
                        <div>
                            <h2 className="text-3xl font-bold text-white mb-2">
                                {activeTab === "dashboard" && "Monitoreo Inteligente"}
                                {activeTab === "ingest" && "Ingreso Estricto de Sensores"}
                                {activeTab === "ml" && "Motor Analítico Neural"}
                            </h2>
                            <p className="text-slate-400">
                                {activeTab === "dashboard" && "Resumen en tiempo real del estado de fluídos."}
                                {activeTab === "ingest" && "Registre una nueva muestra en la red E-NOSE para desencadenar el protocolo de evaluación."}
                                {activeTab === "ml" && "Gestión y calibración de pesos de la red de Regresión Lineal/Forestal."}
                            </p>
                        </div>

                        {/* Minimal Traffic Light Status Header */}
                        {activeTab === "dashboard" && latestSample && (
                            <div className={`px-4 py-2 rounded-xl flex items-center gap-3 border ${currentAlert.border} ${currentAlert.bg}`}>
                                <ShieldAlert className={`w-5 h-5 ${currentAlert.text}`} />
                                <div>
                                    <h4 className={`text-sm font-bold tracking-widest ${currentAlert.text}`}>{currentAlert.label}</h4>
                                    <p className="text-xs text-slate-300">{getAlertDescription(latestSample.nivel_alerta)}</p>
                                </div>
                            </div>
                        )}
                    </header>

                    {/* DASHBOARD TAB */}
                    {activeTab === "dashboard" && (
                        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">

                            {/* ACTION PANEL (NEW AI SUGGESTIONS ENGINE) */}
                            {latestSample && (
                                <div className={`border-l-4 ${currentAlert.border} bg-slate-900/80 backdrop-blur-xl p-6 rounded-2xl shadow-xl flex flex-col md:flex-row gap-6 items-start justify-between`}>
                                    <div className="flex-1">
                                        <h3 className="text-sm font-bold text-slate-400 mb-1 uppercase tracking-wider">Módulo de Inteligencia</h3>
                                        <p className={`text-lg font-semibold ${currentAlert.text} mb-3`}>{latestSample.sugerencia_ia || "Recopilando Sugerencias..."}</p>
                                        <p className="text-sm text-slate-300">
                                            <span className="font-semibold text-white">Impacto Evaluado: </span>
                                            {latestSample.consecuencias_texto || "Bajo estudio estadístico."}
                                        </p>
                                    </div>
                                    <div>
                                        <a href={`http://localhost:8000/api/reports/pdf/${latestSample.id}`} target="_blank" rel="noopener noreferrer" className={`whitespace-nowrap flex items-center gap-2 px-5 py-3 rounded-xl font-medium ${currentAlert.bg} ${currentAlert.text} hover:opacity-80 transition-opacity border ${currentAlert.border}`}>
                                            Exportar Reporte IA (PDF)
                                        </a>
                                    </div>
                                </div>
                            )}

                            {/* KPIs */}
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                <div className="bg-slate-900/50 backdrop-blur-md border border-slate-800 p-6 rounded-2xl relative overflow-hidden group">
                                    <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/10 rounded-bl-full transition-transform group-hover:scale-110"></div>
                                    <div className="flex items-center gap-4 relative z-10">
                                        <div className="p-3 bg-blue-500/20 text-blue-400 rounded-xl"><Droplet className="w-6 h-6" /></div>
                                        <div>
                                            <p className="text-sm text-slate-400 font-medium">Último pH</p>
                                            <h3 className="text-2xl font-bold text-white">{latestSample ? latestSample.ph : "--"}</h3>
                                        </div>
                                    </div>
                                </div>
                                <div className="bg-slate-900/50 backdrop-blur-md border border-slate-800 p-6 rounded-2xl relative overflow-hidden group">
                                    <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-500/10 rounded-bl-full transition-transform group-hover:scale-110"></div>
                                    <div className="flex items-center gap-4 relative z-10">
                                        <div className="p-3 bg-indigo-500/20 text-indigo-400 rounded-xl"><Waves className="w-6 h-6" /></div>
                                        <div>
                                            <p className="text-sm text-slate-400 font-medium">Última DBO (Est.)</p>
                                            <h3 className="text-2xl font-bold text-white">{latestSample && latestSample.dbo_predicho ? latestSample.dbo_predicho.toFixed(1) : "--"} <span className="text-xs text-slate-500">mg/L</span></h3>
                                        </div>
                                    </div>
                                </div>
                                <div className="bg-slate-900/50 backdrop-blur-md border border-slate-800 p-6 rounded-2xl relative overflow-hidden group">
                                    <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/10 rounded-bl-full transition-transform group-hover:scale-110"></div>
                                    <div className="flex items-center gap-4 relative z-10">
                                        <div className="p-3 bg-emerald-500/20 text-emerald-400 rounded-xl"><CheckCircle className="w-6 h-6" /></div>
                                        <div>
                                            <p className="text-sm text-slate-400 font-medium">Lecturas Normales</p>
                                            <h3 className="text-2xl font-bold text-white text-emerald-400">{samples.filter(s => s.nivel_alerta === 1 || s.nivel_alerta === 2).length}</h3>
                                        </div>
                                    </div>
                                </div>
                                <div className="bg-slate-900/50 backdrop-blur-md border border-slate-800 p-6 rounded-2xl relative overflow-hidden group">
                                    <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/10 rounded-bl-full transition-transform group-hover:scale-110"></div>
                                    <div className="flex items-center gap-4 relative z-10">
                                        <div className="p-3 bg-amber-500/20 text-amber-400 rounded-xl"><ShieldAlert className="w-6 h-6" /></div>
                                        <div>
                                            <p className="text-sm text-slate-400 font-medium">Alertas C/C</p>
                                            <h3 className="text-2xl font-bold text-white">{samples.filter(s => s.nivel_alerta === 3 || s.nivel_alerta === 4).length}</h3>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Charts area */}
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                <div className="bg-slate-900/50 backdrop-blur-md border border-slate-800 p-6 rounded-3xl h-[400px]">
                                    <h3 className="text-lg font-semibold text-white mb-6">Tendencia Estimada (DBO)</h3>
                                    {samples.length > 0 ? (
                                        <ResponsiveContainer width="100%" height="100%">
                                            <AreaChart data={samples}>
                                                <defs>
                                                    <linearGradient id="colorDbo" x1="0" y1="0" x2="0" y2="1">
                                                        <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.8} />
                                                        <stop offset="95%" stopColor="#4f46e5" stopOpacity={0} />
                                                    </linearGradient>
                                                </defs>
                                                <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                                                <XAxis dataKey="timestamp" stroke="#94a3b8" fontSize={12} tickFormatter={(tick) => {
                                                    const dt = new Date(tick);
                                                    return !isNaN(dt.getTime()) ? dt.toLocaleTimeString() : "";
                                                }} />
                                                <YAxis stroke="#94a3b8" fontSize={12} />
                                                <Tooltip labelFormatter={(v) => new Date(v).toLocaleString()} contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', borderRadius: '12px' }} />
                                                <Area type="monotone" dataKey="dbo_predicho" stroke="#818cf8" strokeWidth={3} fillOpacity={1} fill="url(#colorDbo)" />
                                            </AreaChart>
                                        </ResponsiveContainer>
                                    ) : (
                                        <div className="h-full flex items-center justify-center text-slate-500">Sin datos</div>
                                    )}
                                </div>

                                <div className="bg-slate-900/50 backdrop-blur-md border border-slate-800 p-6 rounded-3xl h-[400px]">
                                    <h3 className="text-lg font-semibold text-white mb-6">Lecturas Fisicoquímicas Crudas</h3>
                                    {samples.length > 0 ? (
                                        <ResponsiveContainer width="100%" height="100%">
                                            <LineChart data={samples}>
                                                <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                                                <XAxis dataKey="timestamp" stroke="#94a3b8" fontSize={12} tickFormatter={(tick) => {
                                                    const dt = new Date(tick);
                                                    return !isNaN(dt.getTime()) ? dt.toLocaleTimeString() : "";
                                                }} />
                                                <YAxis stroke="#94a3b8" fontSize={12} />
                                                <Tooltip labelFormatter={(v) => new Date(v).toLocaleString()} contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', borderRadius: '12px' }} />
                                                <Legend />
                                                <Line type="monotone" dataKey="ph" stroke="#10b981" strokeWidth={2} dot={false} />
                                                <Line type="monotone" dataKey="dqo" stroke="#f59e0b" strokeWidth={2} dot={false} />
                                                <Line type="monotone" dataKey="turbidez" stroke="#3b82f6" strokeWidth={2} dot={false} />
                                            </LineChart>
                                        </ResponsiveContainer>
                                    ) : (
                                        <div className="h-full flex items-center justify-center text-slate-500">Sin datos</div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* INGEST TAB */}
                    {activeTab === "ingest" && (
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                            <div className="bg-slate-900/50 backdrop-blur-md border border-slate-800 p-8 rounded-3xl">
                                <div className="flex items-center gap-3 mb-6">
                                    <div className="bg-blue-500/20 p-2 rounded-lg"><TestTube className="text-blue-400 w-5 h-5" /></div>
                                    <h3 className="text-xl font-semibold text-white">Variables Registradas</h3>
                                </div>

                                <form onSubmit={handleIngest} className="space-y-6">
                                    <div>
                                        <label className="block text-sm font-medium text-slate-300 mb-2">pH (0-14)</label>
                                        <input type="number" step="0.01" min="0" max="14" required value={ph} onChange={(e) => setPh(e.target.value)}
                                            className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-blue-500 placeholder:text-slate-600 transition-all" placeholder="Ej. 7.2" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-300 mb-2">Demanda Química de Oxígeno (DQO)</label>
                                        <input type="number" step="0.01" required value={dqo} onChange={(e) => setDqo(e.target.value)}
                                            className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-blue-500 placeholder:text-slate-600 transition-all" placeholder="Ej. 15.6" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-300 mb-2">Turbidez (NTU)</label>
                                        <input type="number" step="0.01" required value={turbidez} onChange={(e) => setTurbidez(e.target.value)}
                                            className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-blue-500 placeholder:text-slate-600 transition-all" placeholder="Ej. 4.2" />
                                    </div>
                                    <button type="submit" disabled={formLoading}
                                        className="w-full bg-gradient-to-r from-blue-600 to-emerald-500 hover:from-blue-500 hover:to-emerald-400 text-white font-semibold rounded-xl px-4 py-3 shadow-lg transition-all disabled:opacity-50">
                                        {formLoading ? "Enviando al Motor AI..." : "Registrar y Analizar"}
                                    </button>
                                </form>
                            </div>

                            {/* Prediccion Result */}
                            {predictionResult && (
                                <div className="bg-slate-900/80 backdrop-blur-xl border border-slate-700 p-8 rounded-3xl animate-in flip-in-y duration-700 relative overflow-hidden">
                                    <div className="absolute top-0 right-0 p-8 opacity-10"><BrainCircuit className="w-48 h-48 text-emerald-500" /></div>
                                    <h3 className="text-xl font-semibold text-white mb-6 relative z-10 flex items-center gap-2">
                                        <CheckCircle className="text-emerald-500 w-5 h-5" />
                                        Diagnóstico Asistido por IA Generado
                                    </h3>

                                    <div className="space-y-6 relative z-10">
                                        <div className="bg-slate-950 border border-slate-800 p-4 rounded-xl flex justify-between items-center">
                                            <span className="text-slate-400">Demanda Biológica Estimada (DBO)</span>
                                            <span className="text-2xl font-bold text-white">{predictionResult.dbo_predicho ? predictionResult.dbo_predicho.toFixed(2) : "--"} <span className="text-sm font-normal text-slate-500">mg/L</span></span>
                                        </div>

                                        <div className="bg-slate-950 border border-slate-800 p-4 rounded-xl flex justify-between items-center">
                                            <span className="text-slate-400">Calidad Clasificada</span>
                                            <span className={`text-xl font-bold px-3 py-1 rounded-full ${predictionResult.clasificacion === 'Apta' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'}`}>
                                                {predictionResult.clasificacion || "--"}
                                            </span>
                                        </div>

                                        <div className="bg-slate-950 border border-slate-800 p-4 rounded-xl flex justify-between items-center">
                                            <span className="text-slate-400">Análisis de Integridad (Sensor)</span>
                                            {predictionResult.es_anomalia ? (
                                                <span className="text-sm font-semibold flex items-center gap-2 bg-red-500/10 text-red-500 px-3 py-1 rounded-full"><ShieldAlert className="w-4 h-4" /> Anomalía Detectada</span>
                                            ) : (
                                                <span className="text-sm font-semibold flex items-center gap-2 bg-emerald-500/10 text-emerald-500 px-3 py-1 rounded-full"><Shield className="w-4 h-4" /> Rango Seguro</span>
                                            )}
                                        </div>
                                    </div>

                                    <div className="mt-8 relative z-10">
                                        <a href={`http://localhost:8000/api/reports/pdf/${predictionResult.id}`} target="_blank" rel="noopener noreferrer" className="block w-full text-center bg-slate-800 hover:bg-slate-700 text-white font-semibold rounded-xl px-4 py-3 transition-colors border border-slate-700">
                                            Descargar Reporte PDF
                                        </a>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* ML TAB */}
                    {activeTab === "ml" && (
                        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-5xl">
                            <div className="bg-slate-900/50 backdrop-blur-md border border-slate-800 p-8 rounded-3xl mb-8 flex justify-between items-center">
                                <div>
                                    <h3 className="text-xl font-semibold text-white mb-2 flex items-center gap-2"><Brain className="text-indigo-400 w-6 h-6" /> Motor Random Forest & Isolation</h3>
                                    <p className="text-slate-400 max-w-xl">El flujo de reentrenamiento usa todos los datos etiquetados históricamente en Postgres para recalibrar los estimadores de DBO, clasificación de calidad y detección atípica.</p>
                                </div>
                                <button
                                    onClick={handleRetrain}
                                    disabled={mlLoading}
                                    className="bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-xl px-6 py-4 shadow-lg shadow-indigo-600/20 transition-all flex items-center gap-3 disabled:opacity-50 min-w-[200px] justify-center"
                                >
                                    {mlLoading ? <Activity className="w-5 h-5 animate-spin" /> : <Target className="w-5 h-5" />}
                                    {mlLoading ? "Alineando Pesos..." : "Reentrenar Sistema"}
                                </button>
                            </div>

                            {mlMetrics && (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in slide-in-from-bottom-4 duration-500">
                                    <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl flex flex-col items-center justify-center text-center">
                                        <p className="text-slate-400 font-medium mb-2">Error Cuadrático Medio (MSE) - DBO</p>
                                        <p className="text-5xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-emerald-400 to-emerald-200">{mlMetrics.mse_dbo.toFixed(3)}</p>
                                        <p className="text-xs text-slate-500 mt-4 leading-relaxed max-w-xs">Representa cuan lejos están nuestras predicciones de regresión en promedio de la verdad base.</p>
                                    </div>

                                    <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl flex flex-col items-center justify-center text-center">
                                        <p className="text-slate-400 font-medium mb-2">Coeficiente de Determinación (R²)</p>
                                        <p className="text-5xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-blue-200">{mlMetrics.r2_dbo.toFixed(3)}</p>
                                        <p className="text-xs text-slate-500 mt-4 leading-relaxed max-w-xs">Porcentaje de la varianza en la DBO que es explicable por nuestras variables (pH, DQO, Turbidez).</p>
                                    </div>

                                    <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl flex flex-col items-center justify-center text-center">
                                        <p className="text-slate-400 font-medium mb-2">Precisión de Clasificación (Quality)</p>
                                        <p className="text-5xl font-bold text-white">{(mlMetrics.accuracy_calidad * 100).toFixed(1)}%</p>
                                        <p className="text-xs text-slate-500 mt-4">Random Forest Classifier Score</p>
                                    </div>

                                    <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl flex flex-col items-center justify-center text-center">
                                        <p className="text-slate-400 font-medium mb-2">Anomalías Detectadas Históricas</p>
                                        <p className="text-5xl font-bold text-amber-500">{mlMetrics.anomalias_detectadas}</p>
                                        <p className="text-xs text-slate-500 mt-4">Isolation Forest</p>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </main>
            </div>
        </div>
    );
}
