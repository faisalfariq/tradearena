import type { Metadata } from 'next';
import './globals.css';
import { AuthProvider } from '../context/AuthContext';
import Sidebar from '../components/Sidebar';

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
          <div className="min-h-screen flex">
            <Sidebar />
            <main className="flex-1 w-full md:pl-64 flex flex-col min-h-screen overflow-x-hidden">
              {children}
            </main>
          </div>
        </AuthProvider>
      </body>
    </html>
  );
}
