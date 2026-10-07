import type { Metadata, Viewport } from 'next';
import './globals.css';
import { AuthProvider } from '../context/AuthContext';
import { ToastProvider } from '../context/ToastContext';
import AppShell from '../components/AppShell';
import PwaRegister from '../components/PwaRegister';

export const viewport: Viewport = {
  themeColor: '#0f172a',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export const metadata: Metadata = {
  title: 'TradeArena — Stock-Picking Tournament Evaluation Platform',
  description: 'Automated, auditable, and deterministic IDX stock-picking tournament evaluation.',
  manifest: '/manifest.webmanifest',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'TradeArena',
  },
  icons: {
    icon: [
      { url: '/icons/icon.svg', type: 'image/svg+xml' },
      { url: '/icons/icon-192x192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icons/icon-512x512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: [
      { url: '/icons/apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
    ],
  },
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
            <PwaRegister />
          </ToastProvider>
        </AuthProvider>
      </body>
    </html>
  );
}

