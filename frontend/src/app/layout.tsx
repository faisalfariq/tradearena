import type { Metadata } from 'next';
import './globals.css';
import { AuthProvider } from '../context/AuthContext';
import { ToastProvider } from '../context/ToastContext';
import AppShell from '../components/AppShell';

export const metadata: Metadata = {
  title: 'TradeArena — Stock-Picking Tournament Evaluation Platform',
  description: 'Automated, auditable, and deterministic IDX stock-picking tournament evaluation.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="id" className="dark">
      <body className="antialiased selection:bg-blue-600 selection:text-white bg-slate-950 text-slate-100">
        <AuthProvider>
          <ToastProvider>
            <AppShell>
              {children}
            </AppShell>
          </ToastProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
