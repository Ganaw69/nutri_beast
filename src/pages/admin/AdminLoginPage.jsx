import React, { useState } from 'react';
import { Shield, Dumbbell, Eye, EyeOff, Lock, User, AlertCircle, ArrowRight } from 'lucide-react';
import { authService } from '../../services/api';
import { useAdmin } from '../../context/AdminContext';

export const AdminLoginPage = ({ onLoginSuccess }) => {
  const { login } = useAdmin();
  const [email, setEmail] = useState(() => localStorage.getItem('admin_email') || '');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(() => localStorage.getItem('admin_remember_me') === 'true');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [shake, setShake] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const token = await authService.login(email.trim(), password);
      login(token, { rememberMe, email: email.trim() });
      onLoginSuccess?.();
    } catch (err) {
      setError(err.message || 'Identifiants invalides. Accès refusé.');
      setShake(true);
      setTimeout(() => setShake(false), 600);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center relative overflow-hidden">
      {/* Animated background grid */}
      <div className="absolute inset-0 opacity-10"
        style={{
          backgroundImage: `linear-gradient(#d90429 1px, transparent 1px), linear-gradient(90deg, #d90429 1px, transparent 1px)`,
          backgroundSize: '60px 60px',
        }}
      />

      {/* Radial glow center */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="w-[600px] h-[600px] rounded-full bg-[#d90429]/10 blur-[120px]" />
      </div>

      {/* Corner glows */}
      <div className="absolute top-0 left-0 w-[300px] h-[300px] bg-[#d90429]/5 blur-[80px] rounded-full pointer-events-none" />
      <div className="absolute bottom-0 right-0 w-[300px] h-[300px] bg-[#d90429]/5 blur-[80px] rounded-full pointer-events-none" />

      {/* Animated corner lines */}
      <div className="absolute top-6 left-6 w-12 h-12 border-t-2 border-l-2 border-[#d90429]/60 pointer-events-none" />
      <div className="absolute top-6 right-6 w-12 h-12 border-t-2 border-r-2 border-[#d90429]/60 pointer-events-none" />
      <div className="absolute bottom-6 left-6 w-12 h-12 border-b-2 border-l-2 border-[#d90429]/60 pointer-events-none" />
      <div className="absolute bottom-6 right-6 w-12 h-12 border-b-2 border-r-2 border-[#d90429]/60 pointer-events-none" />

      {/* Login Card */}
      <div
        className={`relative z-10 w-full max-w-md mx-4`}
        style={{ animation: shake ? 'shake 0.5s ease-in-out' : 'none' }}
      >
        {/* Glass card */}
        <div className="bg-[#111111]/90 backdrop-blur-xl border border-white/8 rounded-2xl p-8 shadow-2xl"
          style={{ boxShadow: '0 0 60px rgba(217, 4, 41, 0.08), 0 25px 50px rgba(0,0,0,0.6)' }}
        >
          {/* Logo / Brand */}
          <div className="flex flex-col items-center mb-8">
            <div className="relative w-16 h-16 bg-gradient-to-br from-[#d90429] to-[#8b0000] rounded-xl flex items-center justify-center shadow-lg mb-4"
              style={{ boxShadow: '0 0 30px rgba(217, 4, 41, 0.4)' }}
            >
              <Shield className="w-9 h-9 text-white fill-white/20 absolute" />
              <Dumbbell className="w-5 h-5 text-white absolute transform -rotate-45" />
            </div>
            <div className="text-center">
              <h1 className="text-white font-black text-2xl tracking-widest uppercase mb-1"
                style={{ fontFamily: 'Montserrat, sans-serif', letterSpacing: '0.2em' }}
              >
                NutriBeast
              </h1>
              <p className="text-[#d90429] text-xs font-bold tracking-[0.3em] uppercase">Admin Portal</p>
            </div>
          </div>

          {/* Divider */}
          <div className="flex items-center gap-3 mb-8">
            <div className="flex-1 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
            <Lock className="w-3.5 h-3.5 text-white/20" />
            <div className="flex-1 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Email */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-400 tracking-widest uppercase">Email</label>
              <div className="relative">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); setError(''); }}
                  placeholder="admin@nutribeast.tn"
                  required
                  autoComplete="email"
                  className="w-full bg-[#1a1a1a] border border-white/8 rounded-xl pl-11 pr-4 py-3.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-[#d90429]/60 focus:ring-1 focus:ring-[#d90429]/20 transition-all"
                />
              </div>
            </div>

            {/* Password */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-400 tracking-widest uppercase">Password</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); setError(''); }}
                  placeholder="••••••••••"
                  required
                  autoComplete="current-password"
                  className="w-full bg-[#1a1a1a] border border-white/8 rounded-xl pl-11 pr-12 py-3.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-[#d90429]/60 focus:ring-1 focus:ring-[#d90429]/20 transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <label className="flex items-center gap-3 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="h-4 w-4 accent-[#d90429]"
              />
              <span className="text-xs font-semibold text-gray-300">Se souvenir de moi sur cet appareil</span>
            </label>

            {/* Error Message */}
            {error && (
              <div className="flex items-center gap-2.5 bg-[#d90429]/10 border border-[#d90429]/30 rounded-xl px-4 py-3 text-sm text-[#ff4d66] font-medium">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                {error}
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full relative overflow-hidden bg-gradient-to-r from-[#d90429] to-[#b50020] text-white font-black text-sm tracking-widest uppercase py-4 rounded-xl transition-all duration-300 hover:shadow-lg hover:scale-[1.01] disabled:opacity-60 disabled:cursor-not-allowed disabled:scale-100 flex items-center justify-center gap-3 mt-2"
              style={{ boxShadow: '0 0 20px rgba(217,4,41,0.3)' }}
            >
              {loading ? (
                <>
                  <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Authentification...
                </>
              ) : (
                <>
                  Accéder au Dashboard
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Footer note */}
          <p className="text-center text-xs text-gray-600 mt-6">
            Accès restreint. Toute entrée non autorisée est interdite.
          </p>
        </div>

        {/* Back to store link */}
        <div className="text-center mt-6">
          <a
            href="/"
            className="text-xs text-gray-500 hover:text-[#d90429] transition-colors tracking-widest uppercase font-bold"
          >
            ← Retour à la Boutique
          </a>
        </div>
      </div>

      <style>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          10%, 50%, 90% { transform: translateX(-8px); }
          30%, 70% { transform: translateX(8px); }
        }
      `}</style>
    </div>
  );
};
