"use client"

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Copy, Delete, Calculator, Terminal, Save } from 'lucide-react';
import { cn } from "@/lib/utils";

interface FormulaBuilderProps {
    onSave?: (formula: { name: string; display: string; code: string }) => void;
    className?: string;
}

const FormulaBuilder: React.FC<FormulaBuilderProps> = ({ onSave, className }) => {
    const [displayValue, setDisplayValue] = useState("");
    const [codeValue, setCodeValue] = useState("");
    const [formulaName, setFormulaName] = useState("");

    const handleInput = (label: string, code: string) => {
        setDisplayValue(prev => prev + label);
        setCodeValue(prev => prev + code);
    };

    const handleClear = () => {
        setDisplayValue("");
        setCodeValue("");
    };

    const handleBackspace = () => {
        // This is a naive backspace that works well enough for single-char inputs,
        // but might need more complex logic if we treat tokens (like "VOC") as atomic units.
        // For now, we'll just clear everything if it's complex, or implement a simple char removal.
        // Better UX: Split by tokens. For MVP, Clear is safer.
        if (displayValue.length > 0) {
            // Simple character removal for display (Improvement: use token history)
            setDisplayValue(prev => prev.slice(0, -1));
            // Code value sync is tricky without history stack. 
            // Let's implement a history stack for robust undo/backspace in v2.
            // For now, "Clear" is the robust reset.
        }
    };

    const handleSave = () => {
        if (onSave && codeValue && formulaName) {
            onSave({
                name: formulaName,
                display: displayValue,
                code: codeValue
            });
            // Optional: Clear after save
            // setFormulaName("");
            // handleClear();
        }
    };

    // Custom backspace connecting to a token history would be ideal, 
    // but for this MVP we'll stick to a "Clear" or just allow string slicing 
    // if we assume 1-to-1 mapping for most, but here we have "VOC" (3 chars) -> "VOC" (3 chars).
    // A simple robust approach for MVP is just appending.

    const buttons = [
        { label: "VOC", code: "VOC", type: "variable", color: "bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300" },
        { label: "MQ3", code: "MQ3", type: "variable", color: "bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300" },
        { label: "MQ135", code: "MQ135", type: "variable", color: "bg-yellow-100 dark:bg-yellow-900 text-yellow-700 dark:text-yellow-300" },
        { label: "TEMP", code: "TEMP", type: "variable", color: "bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300" },
        { label: "7", code: "7", type: "number" },
        { label: "8", code: "8", type: "number" },
        { label: "9", code: "9", type: "number" },
        { label: "÷", code: "/", type: "operator" },
        { label: "4", code: "4", type: "number" },
        { label: "5", code: "5", type: "number" },
        { label: "6", code: "6", type: "number" },
        { label: "×", code: "*", type: "operator" },
        { label: "1", code: "1", type: "number" },
        { label: "2", code: "2", type: "number" },
        { label: "3", code: "3", type: "number" },
        { label: "-", code: "-", type: "operator" },
        { label: "0", code: "0", type: "number" },
        { label: ".", code: ".", type: "number" },
        { label: "(", code: "(", type: "operator" },
        { label: "+", code: "+", type: "operator" },
        { label: ")", code: ")", type: "operator" },
        { label: "^", code: "**", type: "operator" }, // Power
        { label: "ln", code: "math.log", type: "function" },
        { label: "sqrt", code: "math.sqrt", type: "function" },
    ];

    return (
        <Card className={cn("w-full shadow-lg border-slate-200 dark:border-slate-800", className)}>
            <CardHeader>
                <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                        <Calculator className="w-5 h-5 text-indigo-500" />
                        <CardTitle>Editor de Fórmulas Químicas</CardTitle>
                    </div>
                </div>
                <CardDescription>Cree algoritmos personalizados usando el teclado virtual.</CardDescription>
            </CardHeader>

            <CardContent className="space-y-4">
                {/* Name Input */}
                <div className="flex gap-2">
                    <Input
                        placeholder="Nombre de la fórmula (ej. Detector de Diabetes)"
                        value={formulaName}
                        onChange={(e) => setFormulaName(e.target.value)}
                        className="bg-white dark:bg-slate-900"
                    />
                </div>

                {/* Display Screen */}
                <div className="relative">
                    <div className="h-24 w-full bg-slate-100 dark:bg-slate-950 rounded-lg border border-slate-300 dark:border-slate-700 p-4 text-2xl font-mono overflow-x-auto flex items-center">
                        {displayValue || <span className="text-slate-400 opacity-50">Ingrese fórmula...</span>}
                    </div>
                    {/* Clear Button */}
                    {displayValue && (
                        <Button
                            variant="ghost"
                            size="icon"
                            className="absolute top-2 right-2 hover:bg-red-100 hover:text-red-600"
                            onClick={handleClear}
                        >
                            <Delete className="w-4 h-4" />
                        </Button>
                    )}
                </div>

                {/* Debug / Code View (Optional - mostly for transparency) */}
                <div className="text-xs font-mono text-slate-500 bg-slate-50 dark:bg-slate-900/50 p-2 rounded flex items-center space-x-2">
                    <Terminal className="w-3 h-3" />
                    <span className="truncate">Código Generado: {codeValue || "Waiting for input..."}</span>
                </div>

                {/* Keyboard Grid */}
                <div className="grid grid-cols-4 gap-2">
                    {buttons.map((btn, idx) => (
                        <Button
                            key={idx}
                            variant={btn.type === 'variable' ? 'outline' : btn.type === 'operator' ? 'secondary' : 'ghost'}
                            className={cn(
                                "h-12 text-lg font-medium transition-all hover:scale-105 active:scale-95",
                                btn.color,
                                btn.type === 'number' && "bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm",
                                btn.type === 'operator' && "bg-slate-200 dark:bg-slate-700 text-slate-900 dark:text-slate-100"
                            )}
                            onClick={() => handleInput(btn.label, btn.code)}
                        >
                            {btn.label}
                        </Button>
                    ))}
                </div>
            </CardContent>

            <CardFooter className="justify-between border-t bg-slate-50 dark:bg-slate-900/50 p-4">
                <p className="text-xs text-muted-foreground">
                    Variables disponibles: VOC, MQ3, MQ135, TEMP
                </p>
                <Button
                    className="bg-indigo-600 hover:bg-indigo-700 text-white gap-2"
                    onClick={handleSave}
                    disabled={!codeValue || !formulaName}
                >
                    <Save className="w-4 h-4" />
                    Guardar Fórmula
                </Button>
            </CardFooter>
        </Card>
    );
};

export default FormulaBuilder;
