'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Script from 'next/script';
import { useAuth } from '../../context/AuthContext';
import {
  TrendingUp,
  Lock,
  Mail,
  ArrowLeft,
  Loader2,
  AlertCircle,
  ShieldCheck,
  User,
  X,
} from 'lucide-react';

declare global {
  interface Window {
    google?: any;
  }
}

const GOOGLE_CLIENT_ID =
  process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ||
  '150588342868-o5u59b23eth5mhi6rj8tn0r18ajoq7q9.apps.googleusercontent.com';

export default function LoginPage() {
  const router = useRouter();
  const { login, loginWithGoogle, user } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Google SSO Modal State
  const [showGoogleModal, setShowGoogleModal] = useState(false);
  const [googleName, setGoogleName] = useState('Budi Investor');
  const [googleEmail, setGoogleEmail] = useState('budi.investor@gmail.com');
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);

  const initGoogleSignIn = () => {
    if (typeof window !== 'undefined' && window.google?.accounts?.id) {
      window.google.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        callback: async (response: any) => {
          if (response?.credential) {
            setIsGoogleLoading(true);
            setErrorMsg('');
            const result = await loginWithGoogle({
              credential: response.credential,
            });
            setIsGoogleLoading(false);
            if (result.success) {
              router.push('/');
            } else {
              setErrorMsg(result.message || 'Gagal autentikasi dengan akun Google.');
            }
          }
        },
      });

      const btnContainer = document.getElementById('googleOfficialBtn');
      if (btnContainer) {
        btnContainer.innerHTML = '';
        window.google.accounts.id.renderButton(btnContainer, {
          theme: 'outline',
          size: 'large',
          text: 'continue_with',
          shape: 'rectangular',
          logo_alignment: 'left',
          width: 380,
        });
      }
    }
  };

  useEffect(() => {
    initGoogleSignIn();
  }, []);

  // If already logged in, redirect home
  if (user) {
    router.push('/');
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setIsLoading(true);

    const result = await login(email, password);
    setIsLoading(false);

    if (result.success) {
      router.push('/');
    } else {
      setErrorMsg(result.message || 'Login gagal. Periksa kembali email dan password.');
    }
  };

  const handleGoogleSignIn = async (name: string, mail: string) => {
    setErrorMsg('');
    setIsGoogleLoading(true);

    const result = await loginWithGoogle({
      name,
      email: mail,
      googleId: `goog_${mail.replace(/[^a-zA-Z0-9]/g, '_')}`,
      avatarUrl: `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(mail)}`,
    });

    setIsGoogleLoading(false);

    if (result.success) {
      setShowGoogleModal(false);
      router.push('/');
    } else {
      setErrorMsg(result.message || 'Gagal masuk dengan Akun Google.');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 py-12 relative">
      <Script
        src="https://accounts.google.com/gsi/client"
        strategy="afterInteractive"
        onLoad={initGoogleSignIn}
      />

      {/* Dynamic Background Glows */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-blue-600/15 blur-[120px] rounded-full pointer-events-none -z-10" />

      <div className="w-full max-w-md">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-xs font-medium text-slate-400 hover:text-white transition-colors mb-6"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Kembali ke Beranda</span>
        </Link>

        <div className="glass-panel p-8 rounded-2xl border border-slate-800 shadow-2xl relative">
          <div className="text-center mb-6">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-blue-600 to-cyan-500 mx-auto flex items-center justify-center shadow-lg shadow-blue-500/25 mb-4">
              <TrendingUp className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-white tracking-tight">
              TradeArena Login & Masuk
            </h1>
            <p className="text-xs text-slate-400 mt-1.5">
              Masuk dengan Google (Peserta/User) atau Kredensial Pengelola Admin
            </p>
          </div>

          {errorMsg && (
            <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-medium flex items-center gap-2.5 mb-6">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* 1. Primary: Official Google SSO Button */}
          <div className="space-y-3 mb-6">
            <div
              id="googleOfficialBtn"
              className="w-full flex justify-center min-h-[44px]"
            />
            {isGoogleLoading && (
              <div className="flex items-center justify-center gap-2 text-xs text-blue-400">
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Memproses autentikasi Google...</span>
              </div>
            )}
          </div>

          {/* Divider */}
          <div className="relative flex py-3 items-center mb-6">
            <div className="flex-grow border-t border-slate-800" />
            <span className="flex-shrink mx-4 text-[10px] uppercase font-bold tracking-wider text-slate-500">
              atau masuk sebagai Admin
            </span>
            <div className="flex-grow border-t border-slate-800" />
          </div>

          {/* 2. Admin Form Login */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Email Admin
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@tradearena.local"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-900/90 border border-slate-800 text-slate-100 text-sm placeholder:text-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-900/90 border border-slate-800 text-slate-100 text-sm placeholder:text-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white font-semibold text-sm transition-all shadow-lg shadow-blue-600/25 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed mt-6"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Mengautentikasi...</span>
                </>
              ) : (
                <>
                  <ShieldCheck className="w-4 h-4" />
                  <span>Masuk sebagai Admin</span>
                </>
              )}
            </button>
          </form>
        </div>
      </div>

      {/* Google SSO Interactive Modal */}
      {showGoogleModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-sm rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl p-6 relative">
            <button
              onClick={() => setShowGoogleModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white p-1"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="text-center mb-6">
              <div className="w-12 h-12 rounded-full bg-white flex items-center justify-center mx-auto mb-3 shadow-md">
                <svg className="w-6 h-6" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                  />
                </svg>
              </div>
              <h3 className="text-base font-bold text-white">
                Masuk dengan Akun Google
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                Pilih akun Google simulasi atau masukkan akun Anda:
              </p>
            </div>

            {/* Preset quick accounts */}
            <div className="space-y-2 mb-4">
              <button
                type="button"
                onClick={() => handleGoogleSignIn('Budi Trader', 'budi.trader@gmail.com')}
                disabled={isGoogleLoading}
                className="w-full p-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-800 border border-slate-700 flex items-center gap-3 text-left transition-all"
              >
                <div className="w-8 h-8 rounded-full bg-blue-600/30 text-blue-400 flex items-center justify-center font-bold text-xs">
                  BT
                </div>
                <div>
                  <div className="text-xs font-semibold text-slate-100">Budi Trader</div>
                  <div className="text-[10px] text-slate-400">budi.trader@gmail.com</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => handleGoogleSignIn('Siti Scalper', 'siti.scalper@gmail.com')}
                disabled={isGoogleLoading}
                className="w-full p-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-800 border border-slate-700 flex items-center gap-3 text-left transition-all"
              >
                <div className="w-8 h-8 rounded-full bg-emerald-600/30 text-emerald-400 flex items-center justify-center font-bold text-xs">
                  SS
                </div>
                <div>
                  <div className="text-xs font-semibold text-slate-100">Siti Scalper</div>
                  <div className="text-[10px] text-slate-400">siti.scalper@gmail.com</div>
                </div>
              </button>
            </div>

            {/* Custom Google account inputs */}
            <div className="border-t border-slate-800 pt-3 space-y-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                  Nama Lengkap
                </label>
                <div className="relative">
                  <User className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="text"
                    value={googleName}
                    onChange={(e) => setGoogleName(e.target.value)}
                    placeholder="Nama Anda"
                    className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-slate-100 text-xs focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                  Email Gmail
                </label>
                <div className="relative">
                  <Mail className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="email"
                    value={googleEmail}
                    onChange={(e) => setGoogleEmail(e.target.value)}
                    placeholder="nama@gmail.com"
                    className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-slate-100 text-xs focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <button
                type="button"
                onClick={() => handleGoogleSignIn(googleName, googleEmail)}
                disabled={isGoogleLoading || !googleEmail}
                className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs transition-all shadow-md shadow-blue-600/30 flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isGoogleLoading ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Menghubungkan Akun...</span>
                  </>
                ) : (
                  <span>Lanjutkan dengan Akun Ini</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
