import React, { useState } from 'react';
import { LogIn, Mail, Lock, AlertCircle, MessageSquare } from 'lucide-react';

const Login = ({ onLoginSuccess }) => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            // Importar dinámicamente para evitar problemas de carga
            const { login } = await import('../utils/authService.js');
            const result = await login(email, password);

            if (result.success) {
                onLoginSuccess(result.user);
            } else {
                setError(result.error || 'Error signing in');
            }
        } catch (err) {
            console.error('[LOGIN] Error:', err);
            setError('Unexpected error signing in');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-[#0a0e17] px-4">
            <div className="w-full max-w-md">
                <div className="glass rounded-2xl p-8 border border-white/10">
                    {/* Logo y título */}
                    <div className="text-center mb-8">
                        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-cyan-500 to-blue-600 mb-4">
                            <img src={`${import.meta.env.BASE_URL}logo.png`} alt="Logo" className="h-12 w-auto object-contain" />
                        </div>
                        <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 to-blue-500 mb-2">
                            Strata Dashboard
                        </h1>
                        <p className="text-slate-400 text-sm">Sign in to continue</p>
                    </div>

                    {/* Formulario */}
                    <form onSubmit={handleSubmit} className="space-y-6">
                        {/* Email */}
                        <div>
                            <label htmlFor="email" className="block text-sm font-medium text-slate-300 mb-2">
                                Email
                            </label>
                            <div className="relative">
                                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={20} />
                                <input
                                    id="email"
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    required
                                    className="w-full pl-10 pr-4 py-3 bg-slate-800/50 border border-white/10 rounded-xl text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500/50 transition-colors"
                                    placeholder="tu@email.com"
                                />
                            </div>
                        </div>

                        {/* Password */}
                        <div>
                            <label htmlFor="password" className="block text-sm font-medium text-slate-300 mb-2">
                                Password
                            </label>
                            <div className="relative">
                                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={20} />
                                <input
                                    id="password"
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    required
                                    className="w-full pl-10 pr-4 py-3 bg-slate-800/50 border border-white/10 rounded-xl text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500/50 transition-colors"
                                    placeholder="••••••••"
                                />
                            </div>
                        </div>

                        {/* Error message */}
                        {error && (
                            <div className="flex items-center gap-2 p-3 bg-rose-500/10 border border-rose-500/30 rounded-lg text-rose-400 text-sm">
                                <AlertCircle size={16} />
                                <span>{error}</span>
                            </div>
                        )}

                        {/* Submit button */}
                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full py-3 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white font-medium rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                            {loading ? (
                                <>
                                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                                    <span>Signing in...</span>
                                </>
                            ) : (
                                <>
                                    <LogIn size={20} />
                                    <span>Sign In</span>
                                </>
                            )}
                        </button>
                    </form>

                    {/* Link to Survey */}
                    <div className="mt-6 pt-6 border-t border-white/10">
                        <a
                            href="#enps-survey"
                            onClick={(e) => {
                                e.preventDefault();
                                // Set activeView to enps-survey via window event or parent callback
                                window.dispatchEvent(new CustomEvent('navigateToSurvey'));
                            }}
                            className="flex items-center justify-center gap-2 text-cyan-400 hover:text-cyan-300 text-sm font-medium transition-colors"
                        >
                            <MessageSquare size={16} />
                            <span>Take Team Satisfaction Survey (No login required)</span>
                        </a>
                    </div>

                    {/* Footer */}
                    <div className="mt-4 text-center text-xs text-slate-500">
                        <p>Available roles: admin, 3amigos, Stakeholder, PM, Regular</p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Login;
