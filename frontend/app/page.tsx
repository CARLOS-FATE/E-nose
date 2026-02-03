"use client"

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Activity, Wind, Thermometer, FlaskConical, Calculator, Play, Trash2, CheckCircle2 } from 'lucide-react';
import FormulaBuilder from '@/components/FormulaBuilder';

// Mock data generator (since we don't have the live API connected yet in the frontend)
const generateMockData = () => {
    const data = [];
    for (let i = 0; i < 20; i++) {
        data.push({
            time: new Date(Date.now() - (20 - i) * 1000).toLocaleTimeString([], { hour12: false }),
            VOC: Math.random() * 0.5 + 0.2,
            MQ3: Math.random() * 0.3 + 0.1,
            MQ135: Math.random() * 0.4 + 0.1,
            TEMP: 20 + Math.random() * 5
        });
    }
    return data;
};

interface SavedFormula {
    id: string;
    name: string;
    display: string;
    code: string;
}

export default function Home() {
    const [sensorData, setSensorData] = useState(generateMockData());
    const [prediction, setPrediction] = useState<string>("Analyzing...");

    // Formula State
    const [savedFormulas, setSavedFormulas] = useState<SavedFormula[]>([]);
    const [activeFormula, setActiveFormula] = useState<SavedFormula | null>(null);
    const [executionResult, setExecutionResult] = useState<number | string | null>(null);

    // Initial dummy formula
    useEffect(() => {
        setSavedFormulas([
            { id: "1", name: "Diabetes Check (Acetona)", display: "VOC * 1.5", code: "VOC * 1.5" },
            { id: "2", name: "Alcohol Alert", display: "MQ3 > 0.4", code: "MQ3 > 0.4 ? 1 : 0" }
        ]);
    }, []);

    // Safe Execution Engine
    const executeFormula = useCallback((code: string, dataPoint: any) => {
        try {
            // Create a safe function scope
            // Note: In a real production app, consider using a sandboxed parser like 'mathjs' 
            // instead of new Function for better security, although we strictly control inputs via UI.
            const func = new Function("VOC", "MQ3", "MQ135", "TEMP", "math", `
                try { 
                    return ${code}; 
                } catch(e) { return null; }
            `);

            const result = func(
                dataPoint.VOC || 0,
                dataPoint.MQ3 || 0,
                dataPoint.MQ135 || 0,
                dataPoint.TEMP || 0,
                Math // Pass Math object for advanced functions
            );

            return typeof result === 'number' ? result.toFixed(4) : result;
        } catch (e) {
            console.error("Execution Error:", e);
            return "Error";
        }
    }, []);

    useEffect(() => {
        // Simulate real-time updates
        const interval = setInterval(() => {
            setSensorData(prev => {
                const newData = [...prev.slice(1)];
                const newPoint = {
                    time: new Date().toLocaleTimeString([], { hour12: false }),
                    VOC: Math.random() * 0.5 + 0.2,
                    MQ3: Math.random() * 0.3 + 0.1,
                    MQ135: Math.random() * 0.4 + 0.1,
                    TEMP: 20 + Math.random() * 5
                };
                newData.push(newPoint);

                // Execute active formula on new data!
                if (activeFormula) {
                    const res = executeFormula(activeFormula.code, newPoint);
                    setExecutionResult(res);
                }

                return newData;
            });

            // Randomly update prediction
            if (Math.random() > 0.8) {
                setPrediction(["Healthy", "Gingivitis", "Periodontitis"][Math.floor(Math.random() * 3)]);
            }
        }, 2000);

        return () => clearInterval(interval);
    }, [activeFormula, executeFormula]);

    const handleFormulaSave = (formula: { name: string; display: string; code: string }) => {
        const newFormula: SavedFormula = {
            id: Date.now().toString(),
            ...formula
        };
        setSavedFormulas(prev => [...prev, newFormula]);
        setActiveFormula(newFormula); // Auto-activate on save
    };

    const deleteFormula = (id: string) => {
        setSavedFormulas(prev => prev.filter(f => f.id !== id));
        if (activeFormula?.id === id) {
            setActiveFormula(null);
            setExecutionResult(null);
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-900 p-8">
            <div className="max-w-7xl mx-auto space-y-8">

                {/* Header */}
                <div className="flex justify-between items-center">
                    <div>
                        <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100">E-NOSE Dashboard</h1>
                        <p className="text-slate-500 dark:text-slate-400">Real-time Breath Analysis & Periodontal Diagnosis</p>
                    </div>
                    <div className="flex items-center space-x-2 bg-white dark:bg-slate-800 p-2 rounded-lg shadow-sm border">
                        <div className={`h-3 w-3 rounded-full ${prediction === "Healthy" ? "bg-green-500" : prediction === "Gingivitis" ? "bg-yellow-500" : "bg-red-500"}`}></div>
                        <span className="font-semibold text-slate-700 dark:text-slate-200">{prediction}</span>
                    </div>
                </div>

                {/* Key Metrics */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">VOC Levels</CardTitle>
                            <Wind className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{sensorData[sensorData.length - 1].VOC.toFixed(2)} ppm</div>
                            <p className="text-xs text-muted-foreground">+2.1% from last minute</p>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">MQ3 (Alcohol)</CardTitle>
                            <FlaskConical className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{sensorData[sensorData.length - 1].MQ3.toFixed(2)} mg/L</div>
                            <p className="text-xs text-muted-foreground">Stable</p>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">MQ135 (Air Quality)</CardTitle>
                            <Activity className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{sensorData[sensorData.length - 1].MQ135.toFixed(2)} ppm</div>
                            <p className="text-xs text-muted-foreground">Within normal range</p>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Temperature</CardTitle>
                            <Thermometer className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{sensorData[sensorData.length - 1].TEMP.toFixed(1)} °C</div>
                            <p className="text-xs text-muted-foreground">Sensor optimal</p>
                        </CardContent>
                    </Card>
                </div>

                {/* Main Content Grid: Formula Builder + Library/Result */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Left: Builder */}
                    <div className="lg:col-span-2">
                        <FormulaBuilder onSave={handleFormulaSave} />
                    </div>

                    {/* Right: Library & Active Result */}
                    <div className="lg:col-span-1 space-y-6">

                        {/* Active Result Card */}
                        <Card className="bg-slate-900 text-white border-none shadow-xl">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2 text-emerald-400">
                                    <Activity className="w-5 h-5" />
                                    Live Analysis
                                </CardTitle>
                                <CardDescription className="text-slate-400">
                                    {activeFormula ? activeFormula.name : "No algorithm active"}
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="text-4xl font-mono font-bold tracking-tighter">
                                    {activeFormula ? (executionResult ?? "Calculating...") : "--"}
                                </div>
                                {activeFormula && (
                                    <div className="mt-2 text-xs text-slate-500 font-mono">
                                        Logic: {activeFormula.display}
                                    </div>
                                )}
                            </CardContent>
                        </Card>

                        {/* Library Card */}
                        <Card className="h-[400px] flex flex-col">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Calculator className="w-5 h-5" />
                                    Algorithm Library
                                </CardTitle>
                                <CardDescription>Select a formula to apply it.</CardDescription>
                            </CardHeader>
                            <CardContent className="flex-1 overflow-y-auto space-y-2 pr-2">
                                {savedFormulas.length === 0 ? (
                                    <p className="text-sm text-center text-muted-foreground py-8">
                                        No saved formulas yet. Create one!
                                    </p>
                                ) : (
                                    savedFormulas.map((formula) => (
                                        <div
                                            key={formula.id}
                                            className={`p-3 rounded-lg border flex items-center justify-between transition-colors ${activeFormula?.id === formula.id
                                                    ? "bg-indigo-50 border-indigo-200 dark:bg-indigo-900/20 dark:border-indigo-800"
                                                    : "hover:bg-slate-50 dark:hover:bg-slate-800"
                                                }`}
                                        >
                                            <div className="flex-1 min-w-0">
                                                <div className="font-medium text-sm truncate">{formula.name}</div>
                                                <div className="text-xs text-muted-foreground font-mono truncate">{formula.display}</div>
                                            </div>
                                            <div className="flex items-center gap-1 ml-2">
                                                <Button
                                                    size="icon"
                                                    variant={activeFormula?.id === formula.id ? "default" : "ghost"}
                                                    className={`h-8 w-8 ${activeFormula?.id === formula.id ? "bg-emerald-500 hover:bg-emerald-600" : ""}`}
                                                    onClick={() => setActiveFormula(formula)}
                                                    title="Activate"
                                                >
                                                    {activeFormula?.id === formula.id ? <CheckCircle2 className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                                                </Button>
                                                <Button
                                                    size="icon"
                                                    variant="ghost"
                                                    className="h-8 w-8 text-red-400 hover:text-red-500 hover:bg-red-50"
                                                    onClick={() => deleteFormula(formula.id)}
                                                    title="Delete"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </Button>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </CardContent>
                        </Card>
                    </div>
                </div>

                {/* Charts */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <Card className="col-span-2">
                        <CardHeader>
                            <CardTitle>Real-Time Sensor Values</CardTitle>
                            <CardDescription>Live data stream from E-Nose sensors.</CardDescription>
                        </CardHeader>
                        <CardContent className="h-[400px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={sensorData}>
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis dataKey="time" />
                                    <YAxis />
                                    <Tooltip />
                                    <Legend />
                                    <Line type="monotone" dataKey="VOC" stroke="#8884d8" name="VOC (Volatile Organic Compounds)" strokeWidth={2} />
                                    <Line type="monotone" dataKey="MQ3" stroke="#82ca9d" name="MQ3 (Alcohol)" strokeWidth={2} />
                                    <Line type="monotone" dataKey="MQ135" stroke="#ffc658" name="MQ135 (Air Quality)" strokeWidth={2} />
                                </LineChart>
                            </ResponsiveContainer>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
