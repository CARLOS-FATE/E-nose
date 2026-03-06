"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { Activity } from "lucide-react";

export default function LoginPage() {
    const [username, setUsername] = useState("admin@enose.com");
    const [password, setPassword] = useState("admin");
    const [error, setError] = useState("");

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const result = await signIn("credentials", {
            username,
            password,
            redirect: true,
            callbackUrl: "/",
        });
        if (result?.error) {
            setError("Credenciales inválidas");
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-slate-950 p-4">
            <div className="max-w-md w-full backdrop-blur-xl bg-white/5 border border-white/10 rounded-3xl shadow-2xl p-8 relative overflow-hidden">
                {/* Decorative elements */}
                <div className="absolute top-0 right-0 -mt-16 -mr-16 w-48 h-48 bg-blue-500/20 rounded-full blur-3xl"></div>
                <div className="absolute bottom-0 left-0 -mb-16 -ml-16 w-48 h-48 bg-emerald-500/20 rounded-full blur-3xl"></div>

                <div className="relative">
                    <div className="flex justify-center mb-6">
                        <div className="bg-gradient-to-tr from-blue-500 to-emerald-400 p-3 rounded-2xl shadow-lg">
                            <Activity className="text-white w-8 h-8" />
                        </div>
                    </div>

                    <h2 className="text-3xl font-bold text-center text-white mb-2">E-NOSE AI Platform</h2>
                    <p className="text-slate-400 text-center mb-8">Gestión de Calidad de Agua basada en Machine Learning</p>

                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-2">Usuario</label>
                            <input
                                type="text"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                className="w-full bg-slate-900/50 border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all placeholder:text-slate-600"
                                placeholder="admin@enose.com"
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-2">Contraseña</label>
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full bg-slate-900/50 border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all placeholder:text-slate-600"
                                placeholder="••••••••"
                                required
                            />
                        </div>

                        {error && <p className="text-red-400 text-sm text-center font-medium bg-red-400/10 py-2 rounded-lg">{error}</p>}

                        <button
                            type="submit"
                            className="w-full bg-gradient-to-r from-blue-600 to-emerald-500 hover:from-blue-500 hover:to-emerald-400 text-white font-semibold rounded-xl px-4 py-3 shadow-lg shadow-blue-500/25 transition-all active:scale-[0.98]"
                        >
                            Ingresar al Sistema
                        </button>
                    </form>

                    <div className="mt-6 text-center text-xs text-slate-500">
                        Pista: admin@enose.com / admin
                    </div>
                </div>
            </div>
        </div>
    );
}
