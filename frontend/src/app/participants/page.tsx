'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useAuth } from '../../context/AuthContext';
import {
  Users,
  UserPlus,
  Search,
  Mail,
  Phone,
  Trophy,
  TrendingUp,
  AlertCircle,
  CheckCircle2,
  X,
  Loader2,
  Calendar,
} from 'lucide-react';

interface Participant {
  id: string;
  name: string;
  email: string | null;
  phoneNumber: string | null;
  createdAt: string;
  _count: {
    tournaments: number;
    picks: number;
  };
}

export default function ParticipantsPage() {
  const { user, token } = useAuth();
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Form states
  const [formName, setFormName] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState('');
  const [formSuccess, setFormSuccess] = useState('');

  const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3333/api/v1';

  const fetchParticipants = useCallback(async () => {
    setLoading(true);
    try {
      const url = search.trim()
        ? `${API_BASE}/participants?search=${encodeURIComponent(search.trim())}`
        : `${API_BASE}/participants`;
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setParticipants(data);
      }
    } catch {
      // offline fallback
    } finally {
      setLoading(false);
    }
  }, [API_BASE, search]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchParticipants();
    }, 300);
    return () => clearTimeout(timer);
  }, [fetchParticipants]);

  const handleCreateParticipant = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    setFormSuccess('');
    setFormLoading(true);

    try {
      const res = await fetch(`${API_BASE}/participants`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { Authorization: `Bearer ${token}` }),
        },
        body: JSON.stringify({
          name: formName.trim(),
          ...(formEmail.trim() && { email: formEmail.trim() }),
          ...(formPhone.trim() && { phoneNumber: formPhone.trim() }),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || 'Gagal menambahkan peserta');
      }

      setFormSuccess(`Peserta '${data.name}' berhasil didaftarkan!`);
      setFormName('');
      setFormEmail('');
      setFormPhone('');
      fetchParticipants();
      setTimeout(() => {
        setIsModalOpen(false);
        setFormSuccess('');
      }, 1500);
    } catch (err: any) {
      setFormError(err.message || 'Terjadi kesalahan saat menyimpan peserta');
    } finally {
      setFormLoading(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-semibold mb-3">
            <Users className="w-3.5 h-3.5" />
            <span>Milestone M3 — Tournament Participants</span>
          </div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight">
            Manajemen Peserta Turnamen
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Kelola data peserta, status pendaftaran turnamen, dan histori stock picks
          </p>
        </div>

        {user && (
          <button
            onClick={() => setIsModalOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white text-sm font-semibold transition-all shadow-lg shadow-blue-600/20"
          >
            <UserPlus className="w-4 h-4" />
            <span>Tambah Peserta Baru</span>
          </button>
        )}
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <div className="glass-panel p-5 rounded-2xl border border-slate-800">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Total Peserta Terdaftar</span>
            <Users className="w-4 h-4 text-blue-400" />
          </div>
          <p className="text-2xl font-bold text-white mt-2">{participants.length}</p>
        </div>
        <div className="glass-panel p-5 rounded-2xl border border-slate-800">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Total Enrollment Turnamen</span>
            <Trophy className="w-4 h-4 text-amber-400" />
          </div>
          <p className="text-2xl font-bold text-white mt-2">
            {participants.reduce((acc, p) => acc + (p._count?.tournaments || 0), 0)}
          </p>
        </div>
        <div className="glass-panel p-5 rounded-2xl border border-slate-800">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Total Stock Picks Disubmit</span>
            <TrendingUp className="w-4 h-4 text-emerald-400" />
          </div>
          <p className="text-2xl font-bold text-white mt-2">
            {participants.reduce((acc, p) => acc + (p._count?.picks || 0), 0)}
          </p>
        </div>
      </div>

      {/* Search Bar */}
      <div className="relative mb-6">
        <Search className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Cari peserta berdasarkan nama atau email..."
          className="w-full pl-11 pr-4 py-3 rounded-xl bg-slate-900/80 border border-slate-800 text-slate-100 text-sm placeholder:text-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
        />
      </div>

      {/* Participants List */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-16">
          <Loader2 className="w-8 h-8 text-blue-500 animate-spin mb-3" />
          <p className="text-sm text-slate-400">Memuat data peserta...</p>
        </div>
      ) : participants.length === 0 ? (
        <div className="glass-panel p-12 text-center rounded-2xl border border-slate-800">
          <Users className="w-12 h-12 text-slate-600 mx-auto mb-4" />
          <h3 className="text-base font-semibold text-slate-200">Belum Ada Peserta</h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto mt-1 mb-6">
            {search
              ? 'Tidak ditemukan peserta dengan kata kunci tersebut.'
              : 'Daftarkan peserta pertama untuk mulai mengikuti turnamen stock picking.'}
          </p>
          {user && !search && (
            <button
              onClick={() => setIsModalOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>Tambah Peserta Sekarang</span>
            </button>
          )}
        </div>
      ) : (
        <div className="glass-panel rounded-2xl border border-slate-800 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-800/80 bg-slate-900/40 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                  <th className="py-4 px-6">Nama Peserta</th>
                  <th className="py-4 px-6">Kontak (Email / Telp)</th>
                  <th className="py-4 px-6 text-center">Turnamen</th>
                  <th className="py-4 px-6 text-center">Total Picks</th>
                  <th className="py-4 px-6">Terdaftar Sejak</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-sm">
                {participants.map((p) => (
                  <tr
                    key={p.id}
                    className="hover:bg-slate-800/30 transition-colors group"
                  >
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-blue-600/10 border border-blue-500/20 text-blue-400 flex items-center justify-center font-bold text-xs uppercase">
                          {p.name.substring(0, 2)}
                        </div>
                        <div>
                          <span className="font-semibold text-slate-100 group-hover:text-blue-400 transition-colors">
                            {p.name}
                          </span>
                          <span className="block text-[10px] text-slate-500 font-mono">
                            ID: {p.id.substring(0, 8)}...
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <div className="space-y-1">
                        {p.email ? (
                          <div className="flex items-center gap-1.5 text-xs text-slate-300">
                            <Mail className="w-3.5 h-3.5 text-slate-400" />
                            <span>{p.email}</span>
                          </div>
                        ) : (
                          <span className="text-xs text-slate-500 italic">Tanpa email</span>
                        )}
                        {p.phoneNumber && (
                          <div className="flex items-center gap-1.5 text-xs text-slate-400">
                            <Phone className="w-3.5 h-3.5 text-slate-500" />
                            <span>{p.phoneNumber}</span>
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="py-4 px-6 text-center">
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                        <Trophy className="w-3 h-3" />
                        {p._count?.tournaments || 0}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-center">
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        <TrendingUp className="w-3 h-3" />
                        {p._count?.picks || 0}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-xs text-slate-400">
                      <div className="flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-slate-500" />
                        <span>{new Date(p.createdAt).toLocaleDateString('id-ID')}</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal Tambah Peserta */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="glass-panel w-full max-w-md p-6 rounded-2xl border border-slate-700 shadow-2xl relative">
            <button
              onClick={() => setIsModalOpen(false)}
              className="absolute top-5 right-5 text-slate-400 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-blue-600/15 border border-blue-500/20 flex items-center justify-center text-blue-400">
                <UserPlus className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">Tambah Peserta Baru</h3>
                <p className="text-xs text-slate-400">Daftarkan trader ke dalam sistem TradeArena</p>
              </div>
            </div>

            {formError && (
              <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-medium flex items-center gap-2 mb-4">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            {formSuccess && (
              <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-medium flex items-center gap-2 mb-4">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>{formSuccess}</span>
              </div>
            )}

            <form onSubmit={handleCreateParticipant} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Nama Lengkap / Trading Handle *
                </label>
                <input
                  type="text"
                  required
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="Contoh: Budi Santoso"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-100 text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Email (Opsional)
                </label>
                <input
                  type="email"
                  value={formEmail}
                  onChange={(e) => setFormEmail(e.target.value)}
                  placeholder="budi@example.com"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-100 text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Nomor Telepon / WhatsApp (Opsional)
                </label>
                <input
                  type="tel"
                  value={formPhone}
                  onChange={(e) => setFormPhone(e.target.value)}
                  placeholder="081234567890"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-100 text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div className="flex gap-3 pt-4 border-t border-slate-800/80">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 py-2.5 rounded-xl border border-slate-700 text-slate-300 hover:bg-slate-800 text-xs font-semibold transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={formLoading}
                  className="flex-1 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold transition-all shadow-md shadow-blue-600/20 flex items-center justify-center gap-1.5 disabled:opacity-50"
                >
                  {formLoading ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Menyimpan...</span>
                    </>
                  ) : (
                    <span>Simpan Peserta</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
