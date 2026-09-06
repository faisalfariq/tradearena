'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '../../context/AuthContext';
import { 
  Trophy, 
  Plus, 
  Calendar, 
  Clock, 
  ShieldAlert, 
  TrendingDown, 
  Layers, 
  Users, 
  CheckCircle2, 
  AlertCircle,
  ArrowRight,
  Filter
} from 'lucide-react';

interface TournamentRule {
  id: string;
  initialStopPct: number;
  trailingStopPct: number;
  candleAmbiguityPolicy: string;
  gapPolicy: string;
  priceFractionPolicy: string;
  pointsRule: string;
}

interface Tournament {
  id: string;
  name: string;
  description?: string;
  startDate: string;
  endDate: string;
  timezone: string;
  status: 'DRAFT' | 'UPCOMING' | 'ACTIVE' | 'COMPLETED' | 'CANCELLED';
  rules?: TournamentRule;
  _count?: {
    participants: number;
    picks: number;
  };
}

export default function TournamentsPage() {
  const { user } = useAuth();
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  const fetchTournaments = React.useCallback(() => {
    setIsLoading(true);
    const apiBase =
      process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3333/api/v1';
    const url =
      statusFilter === 'ALL'
        ? `${apiBase}/tournaments`
        : `${apiBase}/tournaments?status=${statusFilter}`;

    fetch(url)
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setTournaments(data);
        } else {
          setTournaments([]);
        }
      })
      .catch(() => setTournaments([]))
      .finally(() => setIsLoading(false));
  }, [statusFilter]);

  useEffect(() => {
    fetchTournaments();
  }, [fetchTournaments]);

  const getStatusBadge = (status: Tournament['status']) => {
    switch (status) {
      case 'ACTIVE':
        return (
          <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            ACTIVE
          </span>
        );
      case 'UPCOMING':
        return (
          <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-blue-500/15 text-blue-400 border border-blue-500/30">
            UPCOMING
          </span>
        );
      case 'COMPLETED':
        return (
          <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-slate-500/15 text-slate-400 border border-slate-700">
            COMPLETED
          </span>
        );
      case 'CANCELLED':
        return (
          <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-red-500/15 text-red-400 border border-red-500/30">
            CANCELLED
          </span>
        );
      default:
        return (
          <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-500/15 text-amber-400 border border-amber-500/30">
            DRAFT
          </span>
        );
    }
  };

  const formatDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 flex-1">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <div className="inline-flex items-center gap-2 text-xs font-semibold text-blue-400 mb-2">
            <Trophy className="w-4 h-4" />
            <span>Turnamen Saham IDX</span>
          </div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight">
            Manajemen Turnamen
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Kelola turnamen dan konfigurasi parameter evaluasi trading (Initial Cut Loss & Trailing Stop terkonfigurasi).
          </p>
        </div>

        {user && user.role === 'ADMIN' && (
          <Link
            href="/tournaments/new"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold shadow-lg shadow-blue-600/25 transition-all w-fit"
          >
            <Plus className="w-4 h-4" />
            <span>Buat Turnamen Baru</span>
          </Link>
        )}
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-4 mb-8 overflow-x-auto">
        <Filter className="w-4 h-4 text-slate-500 mr-2 shrink-0" />
        {['ALL', 'UPCOMING', 'ACTIVE', 'COMPLETED'].map((filter) => (
          <button
            key={filter}
            onClick={() => setStatusFilter(filter)}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              statusFilter === filter
                ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30'
                : 'text-slate-400 hover:text-white hover:bg-slate-900 border border-transparent'
            }`}
          >
            {filter}
          </button>
        ))}
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="py-20 text-center text-slate-400 text-sm">
          <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          Memuat daftar turnamen...
        </div>
      ) : tournaments.length === 0 ? (
        <div className="py-16 text-center glass-panel rounded-2xl border border-slate-800/80">
          <Trophy className="w-12 h-12 text-slate-600 mx-auto mb-3" />
          <h3 className="text-base font-bold text-white mb-1">Belum Ada Turnamen</h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto mb-6">
            Belum ada turnamen yang sesuai dengan filter. Buat turnamen baru dengan parameter evaluasi yang dapat disesuaikan.
          </p>
          {user?.role === 'ADMIN' && (
            <Link
              href="/tournaments/new"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-md transition-all"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Buat Turnamen Pertama</span>
            </Link>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {tournaments.map((t) => (
            <div
              key={t.id}
              className="glass-panel p-6 rounded-2xl border border-slate-800/80 hover:border-blue-500/30 transition-all flex flex-col justify-between group"
            >
              <div>
                <div className="flex items-center justify-between mb-4">
                  {getStatusBadge(t.status)}
                  <span className="text-[11px] text-slate-500 font-mono">
                    {t.timezone}
                  </span>
                </div>

                <h3 className="text-lg font-bold text-white mb-1.5 group-hover:text-blue-400 transition-colors">
                  {t.name}
                </h3>
                {t.description && (
                  <p className="text-xs text-slate-400 line-clamp-2 mb-4 leading-relaxed">
                    {t.description}
                  </p>
                )}

                <div className="flex items-center gap-2 text-xs text-slate-300 mb-4 bg-slate-900/60 p-2.5 rounded-xl border border-slate-800">
                  <Calendar className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                  <span>
                    {formatDate(t.startDate)} — {formatDate(t.endDate)}
                  </span>
                </div>

                {/* Explicit Rules Pill Box */}
                {t.rules && (
                  <div className="grid grid-cols-2 gap-2 mb-4">
                    <div className="bg-slate-950/60 p-2 rounded-lg border border-slate-800/80">
                      <div className="text-[10px] font-semibold text-slate-400 flex items-center gap-1">
                        <TrendingDown className="w-3 h-3 text-red-400" />
                        <span>Initial CL</span>
                      </div>
                      <div className="text-xs font-bold text-red-400 mt-0.5">
                        -{(Number(t.rules.initialStopPct) * 100).toFixed(0)}% Min
                      </div>
                    </div>

                    <div className="bg-slate-950/60 p-2 rounded-lg border border-slate-800/80">
                      <div className="text-[10px] font-semibold text-slate-400 flex items-center gap-1">
                        <ShieldAlert className="w-3 h-3 text-amber-400" />
                        <span>Trailing Stop</span>
                      </div>
                      <div className="text-xs font-bold text-amber-400 mt-0.5">
                        -{(Number(t.rules.trailingStopPct) * 100).toFixed(0)}% Peak
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="pt-4 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1">
                    <Users className="w-3.5 h-3.5 text-slate-500" />
                    <span>{t._count?.participants || 0} Peserta</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Layers className="w-3.5 h-3.5 text-slate-500" />
                    <span>{t._count?.picks || 0} Picks</span>
                  </div>
                </div>

                <Link
                  href={`/tournaments/${t.id}`}
                  className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-400 hover:text-blue-300 transition-colors"
                >
                  <span>Detail & Picks</span>
                  <span>→</span>
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
