'use client';

import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { CheckCircle2, AlertCircle, Info, AlertTriangle, X } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface ToastItem {
  id: string;
  type: ToastType;
  title?: string;
  message: string;
  duration?: number;
}

export type ToastHelper = {
  success: (message: string, title?: string, duration?: number) => void;
  error: (message: string, title?: string, duration?: number) => void;
  info: (message: string, title?: string, duration?: number) => void;
  warning: (message: string, title?: string, duration?: number) => void;
};

export interface ToastContextValue extends ToastHelper {
  toast: ToastHelper;
  showToast: (options: { type: ToastType; message: string; title?: string; duration?: number }) => void;
  removeToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback(
    ({
      type,
      message,
      title,
      duration = 4000,
    }: {
      type: ToastType;
      message: string;
      title?: string;
      duration?: number;
    }) => {
      const id = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
      const newToast: ToastItem = { id, type, title, message, duration };

      setToasts((prev) => [...prev, newToast]);

      if (duration > 0) {
        setTimeout(() => {
          removeToast(id);
        }, duration);
      }
    },
    [removeToast],
  );

  const toast = React.useMemo(
    () => ({
      success: (message: string, title = 'Berhasil', duration?: number) =>
        showToast({ type: 'success', message, title, duration }),
      error: (message: string, title = 'Terjadi Kesalahan', duration?: number) =>
        showToast({ type: 'error', message, title, duration }),
      info: (message: string, title = 'Informasi', duration?: number) =>
        showToast({ type: 'info', message, title, duration }),
      warning: (message: string, title = 'Peringatan', duration?: number) =>
        showToast({ type: 'warning', message, title, duration }),
    }),
    [showToast],
  );

  // Monkey-patch window.alert in client environment to automatically use custom toast
  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.alert = (msg?: any) => {
        const text = typeof msg === 'string' ? msg : JSON.stringify(msg);
        showToast({
          type: 'info',
          title: 'Pemberitahuan Sistem',
          message: text || '',
          duration: 4500,
        });
      };
    }
  }, [showToast]);

  return (
    <ToastContext.Provider value={{ ...toast, toast, showToast, removeToast }}>
      {children}

      {/* Floating Toasts Container */}
      <div
        aria-live="polite"
        className="fixed top-5 right-5 z-[99999] flex flex-col gap-3 pointer-events-none max-w-sm sm:max-w-md w-full px-4 sm:px-0"
      >
        {toasts.map((t) => {
          const isSuccess = t.type === 'success';
          const isError = t.type === 'error';
          const isWarning = t.type === 'warning';
          const isInfo = t.type === 'info';

          return (
            <div
              key={t.id}
              role="alert"
              className={`pointer-events-auto flex items-start gap-3.5 p-4 rounded-2xl shadow-2xl backdrop-blur-2xl border transition-all animate-in fade-in slide-in-from-top-4 duration-300 ${
                isSuccess
                  ? 'bg-slate-900/95 border-emerald-500/40 text-slate-100 shadow-emerald-500/10'
                  : isError
                  ? 'bg-slate-900/95 border-rose-500/40 text-slate-100 shadow-rose-500/10'
                  : isWarning
                  ? 'bg-slate-900/95 border-amber-500/40 text-slate-100 shadow-amber-500/10'
                  : 'bg-slate-900/95 border-blue-500/40 text-slate-100 shadow-blue-500/10'
              }`}
            >
              {/* Icon with glowing pill */}
              <div
                className={`p-2 rounded-xl shrink-0 mt-0.5 border ${
                  isSuccess
                    ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400'
                    : isError
                    ? 'bg-rose-500/15 border-rose-500/30 text-rose-400'
                    : isWarning
                    ? 'bg-amber-500/15 border-amber-500/30 text-amber-400'
                    : 'bg-blue-500/15 border-blue-500/30 text-blue-400'
                }`}
              >
                {isSuccess && <CheckCircle2 className="w-4 h-4" />}
                {isError && <AlertCircle className="w-4 h-4" />}
                {isWarning && <AlertTriangle className="w-4 h-4" />}
                {isInfo && <Info className="w-4 h-4" />}
              </div>

              {/* Message Content */}
              <div className="flex-1 min-w-0 pr-1">
                {t.title && (
                  <h4 className="text-xs font-bold text-white mb-0.5 tracking-tight">
                    {t.title}
                  </h4>
                )}
                <p className="text-xs text-slate-300 leading-relaxed break-words font-medium">
                  {t.message}
                </p>
              </div>

              {/* Close Button */}
              <button
                onClick={() => removeToast(t.id)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors shrink-0 -mr-1 -mt-1"
                aria-label="Tutup pemberitahuan"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}
