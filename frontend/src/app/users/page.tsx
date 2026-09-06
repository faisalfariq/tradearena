'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../context/AuthContext';
import {
  Users,
  Shield,
  ShieldAlert,
  Search,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  UserCheck,
  UserX,
  Mail,
  Calendar,
  Trophy,
  Loader2,
} from 'lucide-react';

interface UserItem {
  id: string;
  email: string;
  name: string;
  role: 'ADMIN' | 'USER';
  provider: 'LOCAL' | 'GOOGLE';
  avatarUrl?: string;
  createdAt: string;
  updatedAt: string;
  tournamentCount: number;
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3333/api/v1';

export default function UserManagementPage() {
  const router = useRouter();
  const { user, token } = useAuth();

  const [users, setUsers] = useState<UserItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<'ALL' | 'ADMIN' | 'USER'>('ALL');
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Guard: Admin only
  useEffect(() => {
    if (user && user.role !== 'ADMIN') {
      router.push('/');
    }
  }, [user, router]);

  const showToast = (type: 'success' | 'error', text: string) => {
    setToastMessage({ type, text });
    setTimeout(() => setToastMessage(null), 4000);
  };

  const fetchUsers = useCallback(async () => {
    if (!token) return;
    setIsLoading(true);
    try {
      const query = new URLSearchParams();
      if (searchTerm) query.append('search', searchTerm);
      if (roleFilter !== 'ALL') query.append('role', roleFilter);

      const res = await fetch(`${API_BASE}/users?${query.toString()}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (res.ok) {
        const data = await res.json();
        setUsers(data);
      } else {
        showToast('error', 'Gagal memuat daftar pengguna');
      }
    } catch {
      showToast('error', 'Gagal terhubung ke backend API');
    } finally {
      setIsLoading(false);
    }
  }, [token, searchTerm, roleFilter]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleRoleChange = async (targetUser: UserItem, newRole: 'ADMIN' | 'USER') => {
    if (!token) return;

    if (targetUser.id === user?.id && newRole === 'USER') {
      const confirmSelf = confirm(
        'PERINGATAN: Anda akan menurunkan akun Anda sendiri menjadi USER biasa. Anda akan kehilangan akses ke menu admin. Lanjutkan?',
      );
      if (!confirmSelf) return;
    }

    setUpdatingId(targetUser.id);
    try {
      const res = await fetch(`${API_BASE}/users/${targetUser.id}/role`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ role: newRole }),
      });

      if (res.ok) {
        showToast(
          'success',
          `Role ${targetUser.name} berhasil diubah menjadi ${newRole}`,
        );
        fetchUsers();
      } else {
        const err = await res.json();
        showToast('error', err.message || 'Gagal mengubah role');
      }
    } catch {
      showToast('error', 'Gagal menghubungi server');
    } finally {
      setUpdatingId(null);
    }
  };

  const totalUsers = users.length;
  const adminCount = users.filter((u) => u.role === 'ADMIN').length;
  const regularCount = users.filter((u) => u.role === 'USER').length;
  const googleCount = users.filter((u) => u.provider === 'GOOGLE').length;

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-6">
      {/* Toast Notification */}
      {toastMessage && (
        <div
          className={`fixed top-6 right-6 z-50 p-4 rounded-xl shadow-xl flex items-center gap-3 border text-sm font-medium transition-all ${
            toastMessage.type === 'success'
              ? 'bg-emerald-950/90 border-emerald-500/30 text-emerald-300'
              : 'bg-rose-950/90 border-rose-500/30 text-rose-300'
          }`}
        >
          {toastMessage.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          ) : (
            <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
          )}
          <span>{toastMessage.text}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800/80 pb-6">
        <div>
          <div className="flex items-center gap-2.5 text-xs font-semibold uppercase tracking-wider text-blue-400 mb-1">
            <Users className="w-4 h-4" />
            <span>Manajemen Sistem & Otorisasi</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight">
            Kelola Pengguna & Role
          </h1>
          <p className="text-xs md:text-sm text-slate-400 mt-1 max-w-2xl">
            Kelola seluruh akun terdaftar, pantau metode login (Google SSO atau Akun Lokal), dan tetapkan peran (Admin atau Pengguna biasa).
          </p>
        </div>

        <button
          onClick={fetchUsers}
          disabled={isLoading}
          className="self-start md:self-auto px-4 py-2 rounded-xl bg-slate-900 border border-slate-700 text-slate-200 text-xs font-semibold hover:bg-slate-800 transition-all flex items-center gap-2"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          <span>Refresh Data</span>
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl glass-panel border border-slate-800">
          <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
            <span>Total Pengguna</span>
            <Users className="w-4 h-4 text-blue-400" />
          </div>
          <div className="text-2xl font-extrabold text-white mt-2 font-mono">
            {totalUsers}
          </div>
          <span className="text-[10px] text-slate-500 mt-1 block">Akun terdaftar</span>
        </div>

        <div className="p-4 rounded-2xl glass-panel border border-slate-800">
          <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
            <span>Pengguna Biasa (User)</span>
            <UserCheck className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="text-2xl font-extrabold text-cyan-400 mt-2 font-mono">
            {regularCount}
          </div>
          <span className="text-[10px] text-slate-500 mt-1 block">Peserta potensial</span>
        </div>

        <div className="p-4 rounded-2xl glass-panel border border-slate-800">
          <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
            <span>Administrator</span>
            <Shield className="w-4 h-4 text-purple-400" />
          </div>
          <div className="text-2xl font-extrabold text-purple-400 mt-2 font-mono">
            {adminCount}
          </div>
          <span className="text-[10px] text-slate-500 mt-1 block">Akses penuh</span>
        </div>

        <div className="p-4 rounded-2xl glass-panel border border-slate-800">
          <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
            <span>Google SSO</span>
            <div className="w-4 h-4 rounded-full bg-white/10 flex items-center justify-center text-[10px] font-bold text-white">
              G
            </div>
          </div>
          <div className="text-2xl font-extrabold text-amber-400 mt-2 font-mono">
            {googleCount}
          </div>
          <span className="text-[10px] text-slate-500 mt-1 block">Login dengan Google</span>
        </div>
      </div>

      {/* Filter & Search Toolbar */}
      <div className="p-4 rounded-2xl glass-panel border border-slate-800 flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Cari nama atau email pengguna..."
            className="w-full pl-10 pr-4 py-2 rounded-xl bg-slate-900 border border-slate-700 text-slate-100 text-xs focus:outline-none focus:border-blue-500 transition-all placeholder:text-slate-500"
          />
        </div>

        {/* Role Segmented Filter */}
        <div className="flex items-center gap-1.5 p-1 rounded-xl bg-slate-900 border border-slate-800 self-stretch md:self-auto">
          {(['ALL', 'USER', 'ADMIN'] as const).map((r) => (
            <button
              key={r}
              onClick={() => setRoleFilter(r)}
              className={`flex-1 md:flex-initial px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                roleFilter === r
                  ? 'bg-blue-600 text-white shadow-sm shadow-blue-600/30'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {r === 'ALL' ? 'Semua Role' : r}
            </button>
          ))}
        </div>
      </div>

      {/* Users Data Table */}
      <div className="glass-panel rounded-2xl border border-slate-800 overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-900/80 text-slate-400 font-semibold border-b border-slate-800 uppercase tracking-wider text-[10px]">
              <tr>
                <th className="py-3.5 px-4">Pengguna</th>
                <th className="py-3.5 px-4">Metode Login</th>
                <th className="py-3.5 px-4">Role Sistem</th>
                <th className="py-3.5 px-4">Turnamen Diikuti</th>
                <th className="py-3.5 px-4">Tanggal Daftar</th>
                <th className="py-3.5 px-4 text-right">Tindakan Otorisasi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-300">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-500">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-blue-500" />
                    <span>Memuat daftar pengguna...</span>
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-500">
                    <Users className="w-8 h-8 mx-auto mb-2 opacity-40" />
                    <span>Tidak ada pengguna yang cocok dengan pencarian.</span>
                  </td>
                </tr>
              ) : (
                users.map((u) => (
                  <tr
                    key={u.id}
                    className="hover:bg-slate-900/40 transition-colors"
                  >
                    {/* User Profile */}
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600/30 to-cyan-500/30 border border-blue-500/30 flex items-center justify-center font-bold text-xs text-blue-400 shrink-0 uppercase">
                          {u.avatarUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={u.avatarUrl}
                              alt={u.name}
                              className="w-full h-full rounded-xl object-cover"
                            />
                          ) : (
                            u.name.substring(0, 2)
                          )}
                        </div>
                        <div className="overflow-hidden">
                          <div className="font-semibold text-slate-100 truncate">
                            {u.name}
                          </div>
                          <div className="flex items-center gap-1.5 text-slate-400 text-[11px]">
                            <Mail className="w-3 h-3 text-slate-500" />
                            <span className="truncate">{u.email}</span>
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Auth Provider */}
                    <td className="py-3.5 px-4">
                      {u.provider === 'GOOGLE' ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-red-500/10 text-red-400 border border-red-500/20">
                          <span className="w-2 h-2 rounded-full bg-red-500" />
                          Google SSO
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-slate-800 text-slate-300 border border-slate-700">
                          <span className="w-2 h-2 rounded-full bg-slate-400" />
                          Email / Sandi
                        </span>
                      )}
                    </td>

                    {/* Role Badge */}
                    <td className="py-3.5 px-4">
                      {u.role === 'ADMIN' ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-purple-500/15 text-purple-400 border border-purple-500/30 shadow-sm shadow-purple-500/10">
                          <Shield className="w-3 h-3" />
                          ADMIN
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/20">
                          <UserCheck className="w-3 h-3" />
                          USER
                        </span>
                      )}
                    </td>

                    {/* Tournament Count */}
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-1.5 text-slate-300 font-mono text-xs">
                        <Trophy className="w-3.5 h-3.5 text-amber-400" />
                        <span>{u.tournamentCount || 0} turnamen</span>
                      </div>
                    </td>

                    {/* Created Date */}
                    <td className="py-3.5 px-4 text-slate-400 text-[11px]">
                      <div className="flex items-center gap-1.5">
                        <Calendar className="w-3 h-3 text-slate-500" />
                        <span>
                          {new Date(u.createdAt).toLocaleDateString('id-ID', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                          })}
                        </span>
                      </div>
                    </td>

                    {/* Role Action Button */}
                    <td className="py-3.5 px-4 text-right">
                      {updatingId === u.id ? (
                        <span className="inline-flex items-center gap-1 text-[11px] text-slate-400">
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          <span>Mengubah...</span>
                        </span>
                      ) : u.role === 'ADMIN' ? (
                        <button
                          onClick={() => handleRoleChange(u, 'USER')}
                          className="px-3 py-1.5 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 hover:bg-rose-500/20 hover:border-rose-500/40 text-[11px] font-semibold transition-all flex items-center gap-1.5 ml-auto"
                          title="Turunkan role menjadi USER biasa"
                        >
                          <UserX className="w-3 h-3" />
                          <span>Jadikan User</span>
                        </button>
                      ) : (
                        <button
                          onClick={() => handleRoleChange(u, 'ADMIN')}
                          className="px-3 py-1.5 rounded-lg bg-purple-500/15 border border-purple-500/30 text-purple-300 hover:bg-purple-600 hover:text-white text-[11px] font-semibold transition-all flex items-center gap-1.5 ml-auto shadow-sm shadow-purple-500/10"
                          title="Promosikan pengguna ini menjadi Administrator"
                        >
                          <ShieldAlert className="w-3 h-3" />
                          <span>Jadikan Admin</span>
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
