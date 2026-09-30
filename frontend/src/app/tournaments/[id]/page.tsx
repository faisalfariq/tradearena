'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '../../../context/AuthContext';
import {
  Trophy,
  Users,
  TrendingUp,
  ArrowLeft,
  Calendar,
  ShieldAlert,
  Sliders,
  Plus,
  Search,
  CheckCircle2,
  AlertCircle,
  X,
  Loader2,
  Trash2,
  ExternalLink,
  ChevronRight,
  Clock,
  Coins,
  Database,
  RefreshCw,
  BarChart3,
  Eye,
  Play,
  Award,
  Check,
  Edit3,
  ArrowDownRight,
  ArrowUpRight,
  Medal,
  Crown,
  HelpCircle,
  ChevronDown,
  ChevronUp,
  Zap,
  RotateCcw,
  UserCheck,
  UserX,
  CheckSquare,
} from 'lucide-react';

interface DailyResultItem {
  rank: number;
  participantId: string;
  participantName: string;
  stockSymbol: string;
  stockName: string;
  tradingDate: string;
  entryPrice: number | string;
  highestPrice: number | string;
  maxFloatingReturn: number | string;
  exitPrice: number | string;
  exitTimestamp: string;
  exitReason: string;
  realizedReturn: number | string;
  points: number | string;
  pointsRule: string;
  evaluationStatus: string;
}

interface DailyMetrics {
  tradingDate: string;
  totalParticipants: number;
  averageReturn: number;
  gainersCount: number;
  losersCount: number;
  topGainer: {
    participantName: string;
    stockSymbol: string;
    returnPct: number;
    points: number;
  } | null;
  topLoser: {
    participantName: string;
    stockSymbol: string;
    returnPct: number;
    points: number;
  } | null;
}

interface DailyResultsResponse {
  tournamentId: string;
  tradingDate: string;
  metrics: DailyMetrics;
  results: DailyResultItem[];
}

interface OverallResultItem {
  rank: number;
  participantId: string;
  participantName: string;
  totalPoints: number;
  picksCount: number;
  winCount: number;
  lossCount: number;
  breakevenCount: number;
  winRate: number;
  averageReturn: number;
  bestPick: { symbol: string; returnPct: number; date: string; points: number } | null;
  worstPick: { symbol: string; returnPct: number; date: string; points: number } | null;
}

interface OverallStandingsResponse {
  tournamentId: string;
  tournamentName: string;
  totalParticipants: number;
  totalEvaluatedPicks: number;
  standings: OverallResultItem[];
}

interface TournamentRule {
  id: string;
  initialStopPct: number | string;
  trailingStopPct: number | string;
  candleAmbiguityPolicy: string;
  gapPolicy: string;
  priceFractionPolicy: string;
  pointsRule: string;
  calculationRuleVersion: string;
}

interface TournamentDetail {
  id: string;
  name: string;
  description: string | null;
  startDate: string;
  endDate: string;
  timezone: string;
  status: 'UPCOMING' | 'ACTIVE' | 'COMPLETED' | 'CANCELLED';
  rules: TournamentRule | null;
}

interface EnrolledParticipant {
  membershipId: string;
  tournamentId: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'DISQUALIFIED';
  joinedAt: string;
  registeredAt?: string;
  reviewedAt?: string | null;
  reviewedBy?: string | null;
  reviewNotes?: string | null;
  participant: {
    id: string;
    name: string;
    email: string | null;
    phoneNumber: string | null;
    user?: {
      id: string;
      email: string;
      name: string;
      role: string;
      avatarUrl: string | null;
    } | null;
  };
  picksCount: number;
}

interface ConfirmDialogState {
  isOpen: boolean;
  type: 'DANGER' | 'WARNING' | 'SUCCESS' | 'INFO';
  title: string;
  description: string;
  warningNote?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  hasInput?: boolean;
  inputLabel?: string;
  inputPlaceholder?: string;
  inputValue?: string;
  isLoading?: boolean;
  onConfirm: (val?: string) => Promise<void> | void;
}

interface Stock {
  id: string;
  symbol: string;
  name: string;
  exchange: string;
  isActive: boolean;
}

interface StockPick {
  id: string;
  tournamentId: string;
  participantId: string;
  stockId: string;
  tradingDate: string;
  entryPrice: number | string;
  entrySource: string;
  status: string;
  participant: {
    id: string;
    name: string;
  };
  stock: {
    id: string;
    symbol: string;
    name: string;
  };
}

interface MarketSyncItem {
  id: string;
  symbol: string;
  candleCount?: number;
  candlesCount?: number;
  status: 'SUCCESS' | 'FAILED';
  errorMessage: string | null;
  createdAt: string;
}

interface MarketSyncRun {
  id: string;
  tournamentId: string;
  tradingDate: string;
  provider: string;
  status: 'RUNNING' | 'SUCCESS' | 'PARTIAL' | 'FAILED';
  totalSymbols: number;
  syncedSymbols?: number;
  syncedCount?: number;
  startedAt: string;
  completedAt: string | null;
  errorMessage: string | null;
  items?: MarketSyncItem[];
}

interface CandleData {
  id: string;
  symbol: string;
  tradingDate: string;
  timestamp: string;
  open: number | string;
  high: number | string;
  low: number | string;
  close: number | string;
  volume: number;
}

interface EvaluationTimelineStep {
  minute: number;
  timestamp: string;
  open: number;
  high: number;
  low: number;
  close: number;
  peak: number;
  currentThreshold: number;
}

interface EvaluationItem {
  id: string;
  pickId: string;
  status: 'PENDING_DATA' | 'COMPLETED' | 'REVIEW_REQUIRED';
  entryPrice: number | string;
  exitPrice: number | string;
  exitTimestamp: string;
  exitReason: 'INITIAL_CL' | 'TRAILING_STOP' | 'MARKET_CLOSE' | 'MANUAL_OVERRIDE';
  highestPrice: number | string;
  maxFloatingReturn: number | string;
  theoreticalThreshold: number | string;
  actualExitPrice: number | string;
  realizedReturn: number | string;
  calculationVersion: string;
  createdAt: string;
  pick: {
    id: string;
    tradingDate: string;
    entryPrice: number | string;
    entrySource: string;
    participant: { id: string; name: string; email?: string | null };
    stock: { id: string; symbol: string; name: string };
  };
  evidence?: {
    id: string;
    marketDataProvider: string;
    marketDataDate: string;
    candleCount: number;
    triggerCandleIndex: number;
    triggerCandleTimestamp: string;
    triggerCandleOpen: number | string;
    triggerCandleHigh: number | string;
    triggerCandleLow: number | string;
    triggerCandleClose: number | string;
    priceFractionVersion: string;
    gapPolicy: string;
    ambiguityPolicy: string;
    details?: {
      stepByStepTimeline?: EvaluationTimelineStep[];
      reviewNotes?: string;
    } | null;
  } | null;
  override?: {
    id: string;
    userId: string;
    originalExitPrice: number | string;
    originalReturn: number | string;
    overrideExitPrice: number | string;
    overrideReturn: number | string;
    reason: string;
    createdAt: string;
    user?: { name: string; email: string };
  } | null;
}

export default function TournamentDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user, token } = useAuth();
  const tournamentId = params?.id as string;

  const [tournament, setTournament] = useState<TournamentDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<
    'OVERVIEW' | 'PARTICIPANTS' | 'APPLICANTS' | 'PICKS' | 'SYNC' | 'EVALUATION' | 'RESULTS' | 'AUTOMATION'
  >('PICKS');

  // Tournament Application & Applicants state (Milestone M10)
  const [myApplication, setMyApplication] = useState<{
    applied: boolean;
    status: 'PENDING' | 'APPROVED' | 'REJECTED' | null;
    reviewNotes?: string;
  } | null>(null);
  const [applyingTournament, setApplyingTournament] = useState(false);
  const [applicantsList, setApplicantsList] = useState<any[]>([]);
  const [loadingApplicants, setLoadingApplicants] = useState(false);
  const [applicantStatusFilter, setApplicantStatusFilter] = useState<'ALL' | 'PENDING' | 'APPROVED' | 'REJECTED'>('ALL');
  const [reviewingParticipantId, setReviewingParticipantId] = useState<string | null>(null);

  // Enrolled Participants state
  const [enrolled, setEnrolled] = useState<EnrolledParticipant[]>([]);
  const [loadingEnrolled, setLoadingEnrolled] = useState(false);

  // Available participants for enrollment
  const [allParticipants, setAllParticipants] = useState<{ id: string; name: string }[]>([]);
  const [isEnrollModalOpen, setIsEnrollModalOpen] = useState(false);
  const [selectedParticipantToEnroll, setSelectedParticipantToEnroll] = useState('');
  const [enrollLoading, setEnrollLoading] = useState(false);
  const [enrollError, setEnrollError] = useState('');
  const [enrolledFilter, setEnrolledFilter] = useState<'ALL' | 'APPROVED' | 'DISQUALIFIED'>('ALL');
  const [enrolledSearch, setEnrolledSearch] = useState('');
  const [enrollMode, setEnrollMode] = useState<'SELECT' | 'NEW'>('SELECT');
  const [newParticipantName, setNewParticipantName] = useState('');
  const [newParticipantEmail, setNewParticipantEmail] = useState('');
  const [newParticipantPhone, setNewParticipantPhone] = useState('');

  // Premium Custom Confirmation Modal state
  const [confirmDialog, setConfirmDialog] = useState<ConfirmDialogState | null>(null);
  const [confirmInputValue, setConfirmInputValue] = useState('');

  const showConfirmDialog = (cfg: Omit<ConfirmDialogState, 'isOpen'>) => {
    setConfirmInputValue(cfg.inputValue || '');
    setConfirmDialog({ ...cfg, isOpen: true });
  };

  const closeConfirmDialog = () => {
    setConfirmDialog(null);
    setConfirmInputValue('');
  };

  // Stock Picks state
  const [picks, setPicks] = useState<StockPick[]>([]);
  const [loadingPicks, setLoadingPicks] = useState(false);
  const [pickDateFilter, setPickDateFilter] = useState('');
  const [isPickModalOpen, setIsPickModalOpen] = useState(false);

  // Available stocks for pick creation
  const [stocksList, setStocksList] = useState<Stock[]>([]);
  const [stockSearchQuery, setStockSearchQuery] = useState('');

  // New Pick Form states
  const [pickParticipantId, setPickParticipantId] = useState('');
  const [pickStockId, setPickStockId] = useState('');
  const [pickDate, setPickDate] = useState('');
  const [pickPrice, setPickPrice] = useState<number | string>('');
  const [pickSource, setPickSource] = useState('MARKET_OPEN');
  const [pickLoading, setPickLoading] = useState(false);
  const [pickError, setPickError] = useState('');
  const [pickSuccess, setPickSuccess] = useState('');

  // Market Data Sync states
  const [syncRuns, setSyncRuns] = useState<MarketSyncRun[]>([]);
  const [loadingSyncRuns, setLoadingSyncRuns] = useState(false);
  const [syncDate, setSyncDate] = useState('');
  const [syncProvider, setSyncProvider] = useState<'mock' | 'http'>('mock');
  const [triggeringSync, setTriggeringSync] = useState(false);
  const [syncError, setSyncError] = useState('');
  const [syncSuccess, setSyncSuccess] = useState('');

  // Selected Sync Run for details modal
  const [selectedSyncRun, setSelectedSyncRun] = useState<MarketSyncRun | null>(null);
  const [loadingSyncDetail, setLoadingSyncDetail] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  // Candle preview state
  const [previewSymbol, setPreviewSymbol] = useState<string | null>(null);
  const [previewDate, setPreviewDate] = useState<string>('');
  const [previewCandles, setPreviewCandles] = useState<CandleData[]>([]);
  const [loadingCandles, setLoadingCandles] = useState(false);
  const [isCandleModalOpen, setIsCandleModalOpen] = useState(false);

  // Evaluation states
  const [evaluations, setEvaluations] = useState<EvaluationItem[]>([]);
  const [loadingEvaluations, setLoadingEvaluations] = useState(false);
  const [evalDateFilter, setEvalDateFilter] = useState('');
  const [triggeringEvaluation, setTriggeringEvaluation] = useState(false);
  const [evalError, setEvalError] = useState('');
  const [evalSuccess, setEvalSuccess] = useState('');

  // Evaluation Evidence Modal
  const [selectedEvalDetail, setSelectedEvalDetail] = useState<EvaluationItem | null>(null);
  const [isEvidenceModalOpen, setIsEvidenceModalOpen] = useState(false);
  const [loadingEvidence, setLoadingEvidence] = useState(false);

  // Evaluation Override Modal
  const [overrideTargetEval, setOverrideTargetEval] = useState<EvaluationItem | null>(null);
  const [isOverrideModalOpen, setIsOverrideModalOpen] = useState(false);
  const [overrideExitPrice, setOverrideExitPrice] = useState<string | number>('');
  const [overrideReturn, setOverrideReturn] = useState<string | number>('');
  const [overrideReason, setOverrideReason] = useState('');
  const [submittingOverride, setSubmittingOverride] = useState(false);
  const [overrideError, setOverrideError] = useState('');
  const [overrideSuccess, setOverrideSuccess] = useState('');

  // Re-evaluating pick state
  const [evaluatingPickId, setEvaluatingPickId] = useState<string | null>(null);

  // Results & Standings states (Milestone M6)
  const [resultsView, setResultsView] = useState<'DAILY' | 'OVERALL'>('DAILY');
  const [resultsDateFilter, setResultsDateFilter] = useState('');
  const [dailyResults, setDailyResults] = useState<DailyResultsResponse | null>(null);
  const [loadingDailyResults, setLoadingDailyResults] = useState(false);
  const [overallResults, setOverallResults] = useState<OverallStandingsResponse | null>(null);
  const [loadingOverallResults, setLoadingOverallResults] = useState(false);
  const [recalculatingPoints, setRecalculatingPoints] = useState(false);
  const [resultsActionError, setResultsActionError] = useState('');
  const [resultsActionSuccess, setResultsActionSuccess] = useState('');
  const [showTieBreakerGuide, setShowTieBreakerGuide] = useState(false);

  // Automation & Exception states (Milestone M8)
  const [automationDate, setAutomationDate] = useState('');
  const [runningPipeline, setRunningPipeline] = useState(false);
  const [pipelineReport, setPipelineReport] = useState<any | null>(null);
  const [pipelineError, setPipelineError] = useState('');
  const [pipelineSuccess, setPipelineSuccess] = useState('');
  const [exceptionsList, setExceptionsList] = useState<any[]>([]);
  const [loadingExceptions, setLoadingExceptions] = useState(false);
  const [retryingEvalId, setRetryingEvalId] = useState<string | null>(null);
  const [auditTrailList, setAuditTrailList] = useState<any[]>([]);
  const [loadingAuditTrail, setLoadingAuditTrail] = useState(false);

  const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3333/api/v1';

  // Fetch tournament details
  const fetchTournament = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/tournaments/${tournamentId}`);
      if (res.ok) {
        const data = await res.json();
        setTournament(data);
        if (!pickDate) {
          const today = new Date().toISOString().substring(0, 10);
          const start = data.startDate.substring(0, 10);
          const end = data.endDate.substring(0, 10);
          if (today >= start && today <= end) {
            setPickDate(today);
            setEvalDateFilter(today);
            setResultsDateFilter(today);
            setAutomationDate(today);
          } else {
            setPickDate(start);
            setEvalDateFilter(start);
            setResultsDateFilter(start);
            setAutomationDate(start);
          }
        }
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [API_BASE, tournamentId, pickDate]);

  // Fetch enrolled participants
  const fetchEnrolled = useCallback(async () => {
    setLoadingEnrolled(true);
    try {
      const res = await fetch(`${API_BASE}/tournaments/${tournamentId}/participants`);
      if (res.ok) {
        const data = await res.json();
        setEnrolled(data);
      }
    } catch {
      // ignore
    } finally {
      setLoadingEnrolled(false);
    }
  }, [API_BASE, tournamentId]);

  // Fetch all registered participants
  const fetchAllParticipants = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/participants`);
      if (res.ok) {
        const data = await res.json();
        setAllParticipants(data);
      }
    } catch {
      // ignore
    }
  }, [API_BASE]);

  // Fetch my application status (Milestone M10)
  const fetchMyApplication = useCallback(async () => {
    if (!token || !tournamentId) return;
    try {
      const res = await fetch(`${API_BASE}/tournaments/${tournamentId}/my-status`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setMyApplication(data);
      }
    } catch {
      // ignore
    }
  }, [API_BASE, token, tournamentId]);

  // Fetch tournament applicants (Milestone M10 - Admin)
  const fetchApplicants = useCallback(
    async (status?: string) => {
      if (!token || !tournamentId) return;
      setLoadingApplicants(true);
      try {
        const query = status && status !== 'ALL' ? `?status=${status}` : '';
        const res = await fetch(
          `${API_BASE}/tournaments/${tournamentId}/applicants${query}`,
          {
            headers: { Authorization: `Bearer ${token}` },
          },
        );
        if (res.ok) {
          const data = await res.json();
          setApplicantsList(data);
        }
      } catch {
        // ignore
      } finally {
        setLoadingApplicants(false);
      }
    },
    [API_BASE, token, tournamentId],
  );

  // Apply to tournament (User)
  const handleApplyTournament = async () => {
    if (!token) {
      router.push('/login');
      return;
    }
    setApplyingTournament(true);
    try {
      const res = await fetch(`${API_BASE}/tournaments/${tournamentId}/apply`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await res.json();
      if (res.ok) {
        alert(data.message || 'Pendaftaran berhasil diajukan!');
        fetchMyApplication();
        fetchApplicants();
      } else {
        alert(data.message || 'Gagal mengajukan pendaftaran turnamen');
      }
    } catch {
      alert('Gagal menghubungi server API');
    } finally {
      setApplyingTournament(false);
    }
  };

  // Review applicant (Admin)
  const handleReviewApplicant = async (
    participantId: string,
    status: 'APPROVED' | 'REJECTED' | 'DISQUALIFIED',
    reviewNotes?: string,
  ) => {
    if (!token) return;
    setReviewingParticipantId(participantId);
    try {
      const res = await fetch(
        `${API_BASE}/tournaments/${tournamentId}/applicants/${participantId}/review`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ status, reviewNotes }),
        },
      );
      if (res.ok) {
        fetchApplicants(applicantStatusFilter);
        fetchEnrolled();
      } else {
        const err = await res.json();
        alert(err.message || 'Gagal memperbarui status pendaftaran');
      }
    } catch {
      alert('Gagal menghubungi server API');
    } finally {
      setReviewingParticipantId(null);
    }
  };

  // Fetch stocks catalog
  const fetchStocks = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/stocks?isActive=true`);
      if (res.ok) {
        const data = await res.json();
        setStocksList(data);
      }
    } catch {
      // ignore
    }
  }, [API_BASE]);

  // Fetch picks for tournament
  const fetchPicks = useCallback(async () => {
    setLoadingPicks(true);
    try {
      const url = pickDateFilter
        ? `${API_BASE}/tournaments/${tournamentId}/picks?tradingDate=${pickDateFilter}`
        : `${API_BASE}/tournaments/${tournamentId}/picks`;
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setPicks(data);
      }
    } catch {
      // ignore
    } finally {
      setLoadingPicks(false);
    }
  }, [API_BASE, tournamentId, pickDateFilter]);

  // Fetch sync runs for tournament
  const fetchSyncRuns = useCallback(async () => {
    setLoadingSyncRuns(true);
    try {
      const res = await fetch(`${API_BASE}/tournaments/${tournamentId}/market-sync`);
      if (res.ok) {
        const data = await res.json();
        setSyncRuns(data);
      }
    } catch {
      // ignore
    } finally {
      setLoadingSyncRuns(false);
    }
  }, [API_BASE, tournamentId]);

  // Fetch evaluations for tournament
  const fetchEvaluations = useCallback(
    async (date?: string) => {
      setLoadingEvaluations(true);
      try {
        const queryDate = date !== undefined ? date : evalDateFilter;
        const url = queryDate
          ? `${API_BASE}/tournaments/${tournamentId}/evaluations?tradingDate=${queryDate}`
          : `${API_BASE}/tournaments/${tournamentId}/evaluations`;
        const res = await fetch(url);
        if (res.ok) {
          const data = await res.json();
          setEvaluations(data);
        }
      } catch {
        // ignore
      } finally {
        setLoadingEvaluations(false);
      }
    },
    [API_BASE, tournamentId, evalDateFilter],
  );

  // Fetch daily results
  const fetchDailyResults = useCallback(
    async (date?: string) => {
      setLoadingDailyResults(true);
      try {
        const queryDate = date !== undefined ? date : resultsDateFilter;
        const url = queryDate
          ? `${API_BASE}/tournaments/${tournamentId}/results/daily?tradingDate=${queryDate}`
          : `${API_BASE}/tournaments/${tournamentId}/results/daily`;
        const res = await fetch(url);
        if (res.ok) {
          const data = await res.json();
          setDailyResults(data);
        }
      } catch {
        // ignore
      } finally {
        setLoadingDailyResults(false);
      }
    },
    [API_BASE, tournamentId, resultsDateFilter],
  );

  // Fetch overall tournament standings
  const fetchOverallResults = useCallback(async () => {
    setLoadingOverallResults(true);
    try {
      const res = await fetch(`${API_BASE}/tournaments/${tournamentId}/results/overall`);
      if (res.ok) {
        const data = await res.json();
        setOverallResults(data);
      }
    } catch {
      // ignore
    } finally {
      setLoadingOverallResults(false);
    }
  }, [API_BASE, tournamentId]);

  // Recalculate tournament points (Admin only)
  const handleRecalculatePoints = () => {
    showConfirmDialog({
      type: 'INFO',
      title: 'Hitung Ulang Poin Turnamen',
      description:
        'Hitung ulang seluruh akumulasi poin dan klasemen peserta turnamen ini berdasarkan evaluasi trade yang telah selesai?',
      warningNote:
        'Proses ini akan mengagregasi kembali poin seluruh sesi trading harian untuk turnamen ini.',
      confirmLabel: 'Ya, Hitung Ulang',
      cancelLabel: 'Batal',
      onConfirm: async () => {
        closeConfirmDialog();
        setRecalculatingPoints(true);
        setResultsActionError('');
        setResultsActionSuccess('');

        try {
          const res = await fetch(`${API_BASE}/tournaments/${tournamentId}/results/recalculate`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              ...(token && { Authorization: `Bearer ${token}` }),
            },
          });

          const data = await res.json();
          if (!res.ok) {
            throw new Error(data.message || 'Gagal menghitung ulang poin turnamen');
          }

          setResultsActionSuccess(data.message || 'Poin turnamen berhasil dihitung ulang!');
          fetchDailyResults();
          fetchOverallResults();
          setTimeout(() => setResultsActionSuccess(''), 4000);
        } catch (err: any) {
          setResultsActionError(err.message || 'Terjadi kesalahan saat kalkulasi ulang poin');
        } finally {
          setRecalculatingPoints(false);
        }
      },
    });
  };

  useEffect(() => {
    fetchTournament();
    fetchEnrolled();
    fetchAllParticipants();
    fetchStocks();
    fetchPicks();
    fetchSyncRuns();
    fetchEvaluations();
    fetchDailyResults();
    fetchOverallResults();
    fetchMyApplication();
    fetchApplicants();
  }, [
    fetchTournament,
    fetchEnrolled,
    fetchAllParticipants,
    fetchStocks,
    fetchPicks,
    fetchSyncRuns,
    fetchEvaluations,
    fetchDailyResults,
    fetchOverallResults,
    fetchMyApplication,
    fetchApplicants,
  ]);

  // Trigger sync run handler
  const handleTriggerSync = async (e: React.FormEvent) => {
    e.preventDefault();
    setSyncError('');
    setSyncSuccess('');
    setTriggeringSync(true);

    try {
      const targetDate = syncDate || tournament?.startDate.substring(0, 10);
      const res = await fetch(`${API_BASE}/tournaments/${tournamentId}/market-sync`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { Authorization: `Bearer ${token}` }),
        },
        body: JSON.stringify({
          tradingDate: targetDate,
          provider: syncProvider,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Gagal memulai penarikan market data');
      }

      setSyncSuccess(
        `Sinkronisasi berhasil! ${data.syncedSymbols}/${data.totalSymbols} emiten berhasil diproses (${data.status}).`,
      );
      fetchSyncRuns();
    } catch (err) {
      setSyncError((err as Error).message);
    } finally {
      setTriggeringSync(false);
    }
  };

  // View detail of a sync run
  const handleViewRunDetails = async (runId: string) => {
    setLoadingSyncDetail(true);
    setIsDetailModalOpen(true);
    try {
      const res = await fetch(`${API_BASE}/tournaments/${tournamentId}/market-sync/${runId}`);
      if (res.ok) {
        const data = await res.json();
        setSelectedSyncRun(data);
      }
    } catch {
      // ignore
    } finally {
      setLoadingSyncDetail(false);
    }
  };

  // Preview candle data
  const handlePreviewCandles = async (symbol: string, tradingDate: string) => {
    setPreviewSymbol(symbol);
    setPreviewDate(tradingDate);
    setIsCandleModalOpen(true);
    setLoadingCandles(true);
    try {
      const res = await fetch(
        `${API_BASE}/market-data/candles?symbol=${symbol}&tradingDate=${tradingDate}&limit=100`,
      );
      if (res.ok) {
        const data = await res.json();
        setPreviewCandles(data);
      }
    } catch {
      // ignore
    } finally {
      setLoadingCandles(false);
    }
  };

  // Trigger evaluation for tournament day
  const handleTriggerEvaluation = async (e: React.FormEvent) => {
    e.preventDefault();
    const dateToEval = evalDateFilter || (tournament ? tournament.startDate.substring(0, 10) : '');
    if (!dateToEval) {
      setEvalError('Pilih tanggal perdagangan yang akan dievaluasi');
      return;
    }
    setEvalError('');
    setEvalSuccess('');
    setTriggeringEvaluation(true);

    try {
      const res = await fetch(`${API_BASE}/tournaments/${tournamentId}/evaluations/run`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { Authorization: `Bearer ${token}` }),
        },
        body: JSON.stringify({ tradingDate: dateToEval }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Gagal menjalankan evaluasi');
      }

      setEvalSuccess(
        `Evaluasi deterministik berhasil diproses untuk seluruh pick tanggal ${dateToEval}.`,
      );
      fetchEvaluations(dateToEval);
    } catch (err: any) {
      setEvalError(err.message || 'Terjadi kesalahan saat menjalankan evaluasi');
    } finally {
      setTriggeringEvaluation(false);
    }
  };

  // Re-evaluate a single pick
  const handleEvaluateSinglePick = async (pickId: string) => {
    setEvaluatingPickId(pickId);
    try {
      const res = await fetch(`${API_BASE}/picks/${pickId}/evaluate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { Authorization: `Bearer ${token}` }),
        },
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Gagal mengevaluasi pick');
      }
      fetchEvaluations();
    } catch (err: any) {
      alert(err.message || 'Gagal mengevaluasi pick');
    } finally {
      setEvaluatingPickId(null);
    }
  };

  // View Evidence Modal
  const handleViewEvidence = async (evalId: string) => {
    setIsEvidenceModalOpen(true);
    setLoadingEvidence(true);
    try {
      const res = await fetch(`${API_BASE}/evaluations/${evalId}`);
      if (res.ok) {
        const data = await res.json();
        setSelectedEvalDetail(data);
      }
    } catch {
      // ignore
    } finally {
      setLoadingEvidence(false);
    }
  };

  // Open Override Modal
  const handleOpenOverride = (ev: EvaluationItem) => {
    setOverrideTargetEval(ev);
    setOverrideExitPrice(ev.exitPrice);
    setOverrideReturn(ev.realizedReturn);
    setOverrideReason('');
    setOverrideError('');
    setOverrideSuccess('');
    setIsOverrideModalOpen(true);
  };

  // Submit Override
  const handleSubmitOverride = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!overrideTargetEval) return;
    if (!overrideReason.trim()) {
      setOverrideError('Alasan penyesuaian wajib diisi untuk audit log');
      return;
    }

    setSubmittingOverride(true);
    setOverrideError('');
    setOverrideSuccess('');

    try {
      const res = await fetch(`${API_BASE}/evaluations/${overrideTargetEval.id}/override`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { Authorization: `Bearer ${token}` }),
        },
        body: JSON.stringify({
          overrideExitPrice: Number(overrideExitPrice),
          overrideReturn: overrideReturn !== '' ? Number(overrideReturn) : undefined,
          reason: overrideReason,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Gagal melakukan override');
      }

      setOverrideSuccess('Penyesuaian evaluasi berhasil disimpan dan tercatat di audit log.');
      setTimeout(() => {
        setIsOverrideModalOpen(false);
        fetchEvaluations();
      }, 1000);
    } catch (err: any) {
      setOverrideError(err.message || 'Terjadi kesalahan saat submit override');
    } finally {
      setSubmittingOverride(false);
    }
  };

  // Enroll participant handler
  const handleEnroll = async (e: React.FormEvent) => {
    e.preventDefault();
    setEnrollError('');
    setEnrollLoading(true);

    try {
      let targetParticipantId = selectedParticipantToEnroll;

      if (enrollMode === 'NEW') {
        if (!newParticipantName.trim()) {
          throw new Error('Nama peserta wajib diisi');
        }
        const createRes = await fetch(`${API_BASE}/participants`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token && { Authorization: `Bearer ${token}` }),
          },
          body: JSON.stringify({
            name: newParticipantName.trim(),
            email: newParticipantEmail.trim() || undefined,
            phoneNumber: newParticipantPhone.trim() || undefined,
          }),
        });
        const createData = await createRes.json();
        if (!createRes.ok) {
          throw new Error(createData.message || 'Gagal mendaftarkan peserta baru');
        }
        targetParticipantId = createData.id;
      }

      if (!targetParticipantId) {
        throw new Error('Silakan pilih peserta yang ingin didaftarkan');
      }

      const res = await fetch(`${API_BASE}/tournaments/${tournamentId}/participants`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { Authorization: `Bearer ${token}` }),
        },
        body: JSON.stringify({ participantId: targetParticipantId }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Gagal mendaftarkan peserta ke turnamen');
      }

      setIsEnrollModalOpen(false);
      setSelectedParticipantToEnroll('');
      setNewParticipantName('');
      setNewParticipantEmail('');
      setNewParticipantPhone('');
      fetchEnrolled();
      fetchAllParticipants();
      fetchApplicants(applicantStatusFilter);
    } catch (err: any) {
      setEnrollError(err.message || 'Terjadi kesalahan saat mendaftarkan');
    } finally {
      setEnrollLoading(false);
    }
  };

  // Unenroll participant handler
  const handleUnenrollParticipant = (participantId: string, participantName: string) => {
    if (!token) return;
    showConfirmDialog({
      type: 'DANGER',
      title: 'Keluarkan Peserta Turnamen',
      description: `Apakah Anda yakin ingin mengeluarkan "${participantName}" dari turnamen ini?`,
      warningNote:
        'Data keikutsertaan dan seluruh catatan stock picks peserta ini pada turnamen ini akan dihapus secara permanen.',
      confirmLabel: 'Ya, Keluarkan Peserta',
      cancelLabel: 'Batal',
      onConfirm: async () => {
        try {
          const res = await fetch(
            `${API_BASE}/tournaments/${tournamentId}/participants/${participantId}`,
            {
              method: 'DELETE',
              headers: {
                Authorization: `Bearer ${token}`,
              },
            },
          );
          if (res.ok) {
            closeConfirmDialog();
            fetchEnrolled();
            fetchAllParticipants();
            fetchApplicants(applicantStatusFilter);
          } else {
            const err = await res.json().catch(() => ({}));
            alert(err.message || 'Gagal mengeluarkan peserta dari turnamen');
          }
        } catch {
          alert('Terjadi kesalahan koneksi server');
        }
      },
    });
  };

  // Toggle Disqualify handler
  const handleToggleDisqualify = (
    participantId: string,
    participantName: string,
    currentStatus: string,
  ) => {
    if (!token) return;
    if (currentStatus === 'DISQUALIFIED') {
      showConfirmDialog({
        type: 'SUCCESS',
        title: 'Pulihkan & Aktifkan Peserta',
        description: `Apakah Anda ingin mengaktifkan kembali status peserta "${participantName}" dalam turnamen ini?`,
        warningNote:
          'Peserta akan kembali berstatus Aktif (APPROVED) dan sah untuk mengirimkan stock pick.',
        confirmLabel: 'Ya, Pulihkan Status',
        cancelLabel: 'Batal',
        onConfirm: async () => {
          closeConfirmDialog();
          await handleReviewApplicant(participantId, 'APPROVED');
        },
      });
    } else {
      showConfirmDialog({
        type: 'WARNING',
        title: 'Diskualifikasi Peserta Turnamen',
        description: `Peserta "${participantName}" akan dinonaktifkan dari turnamen ini dan dilarang mengirim stock pick baru.`,
        warningNote:
          'Status diskualifikasi akan tercatat secara resmi dan dapat dipulihkan sewaktu-waktu oleh Admin.',
        hasInput: true,
        inputLabel: 'Alasan Diskualifikasi',
        inputPlaceholder: 'e.g. Pelanggaran aturan cut loss / multi-akun',
        inputValue: 'Pelanggaran aturan turnamen / Cut Loss',
        confirmLabel: 'Konfirmasi Diskualifikasi',
        cancelLabel: 'Batal',
        onConfirm: async (reason) => {
          closeConfirmDialog();
          await handleReviewApplicant(
            participantId,
            'DISQUALIFIED',
            reason?.trim() || 'Didiskualifikasi oleh Admin',
          );
        },
      });
    }
  };

  // Submit pick handler
  const handleCreatePick = async (e: React.FormEvent) => {
    e.preventDefault();
    setPickError('');
    setPickSuccess('');
    setPickLoading(true);

    try {
      const res = await fetch(`${API_BASE}/tournaments/${tournamentId}/picks`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { Authorization: `Bearer ${token}` }),
        },
        body: JSON.stringify({
          participantId: pickParticipantId,
          stockId: pickStockId,
          tradingDate: pickDate,
          entryPrice: Number(pickPrice),
          entrySource: pickSource,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Gagal menyimpan stock pick');
      }

      setPickSuccess('Stock pick berhasil disimpan!');
      setPickPrice('');
      fetchPicks();
      fetchEnrolled();
      setTimeout(() => {
        setIsPickModalOpen(false);
        setPickSuccess('');
      }, 1200);
    } catch (err: any) {
      setPickError(err.message || 'Terjadi kesalahan saat submit pick');
    } finally {
      setPickLoading(false);
    }
  };

  // Delete pick handler
  const handleDeletePick = (pickId: string) => {
    showConfirmDialog({
      type: 'DANGER',
      title: 'Hapus Stock Pick',
      description: 'Apakah Anda yakin ingin menghapus stock pick ini?',
      warningNote: 'Stock pick yang dihapus tidak dapat dipulihkan kembali.',
      confirmLabel: 'Ya, Hapus Pick',
      cancelLabel: 'Batal',
      onConfirm: async () => {
        try {
          const res = await fetch(`${API_BASE}/picks/${pickId}`, {
            method: 'DELETE',
            headers: {
              ...(token && { Authorization: `Bearer ${token}` }),
            },
          });
          if (res.ok) {
            closeConfirmDialog();
            fetchPicks();
            fetchEnrolled();
          }
        } catch {
          // ignore
        }
      },
    });
  };

  // Fetch Exceptions List (Milestone M8)
  const fetchExceptions = useCallback(
    async (dateStr?: string) => {
      setLoadingExceptions(true);
      try {
        const q = dateStr ? `?tradingDate=${dateStr}` : '';
        const res = await fetch(`${API_BASE}/tournaments/${tournamentId}/exceptions${q}`, {
          headers: {
            ...(token && { Authorization: `Bearer ${token}` }),
          },
        });
        if (res.ok) {
          const data = await res.json();
          setExceptionsList(data.items || []);
        }
      } catch {
        // ignore
      } finally {
        setLoadingExceptions(false);
      }
    },
    [API_BASE, tournamentId, token],
  );

  // Fetch Audit Trail (Milestone M8)
  const fetchAuditTrail = useCallback(async () => {
    setLoadingAuditTrail(true);
    try {
      const res = await fetch(`${API_BASE}/tournaments/${tournamentId}/audit-trail`, {
        headers: {
          ...(token && { Authorization: `Bearer ${token}` }),
        },
      });
      if (res.ok) {
        const data = await res.json();
        setAuditTrailList(data || []);
      }
    } catch {
      // ignore
    } finally {
      setLoadingAuditTrail(false);
    }
  }, [API_BASE, tournamentId, token]);

  // Run Daily Pipeline (Milestone M8)
  const handleRunPipeline = async () => {
    setRunningPipeline(true);
    setPipelineError('');
    setPipelineSuccess('');
    setPipelineReport(null);

    const dateStr =
      automationDate || (tournament?.startDate ? tournament.startDate.substring(0, 10) : '');

    try {
      const res = await fetch(
        `${API_BASE}/tournaments/${tournamentId}/pipeline/run?tradingDate=${dateStr}`,
        {
          method: 'POST',
          headers: {
            ...(token && { Authorization: `Bearer ${token}` }),
          },
        },
      );

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Gagal menjalankan pipeline pasca-market');
      }

      setPipelineReport(data);
      setPipelineSuccess(
        `Pipeline harian pasca-market selesai dieksekusi dengan status: ${data.overallStatus}!`,
      );
      fetchExceptions(dateStr);
      fetchAuditTrail();
      fetchEvaluations(dateStr);
    } catch (err: any) {
      setPipelineError(err.message || 'Terjadi kesalahan saat mengeksekusi pipeline');
    } finally {
      setRunningPipeline(false);
    }
  };

  // Retry Evaluation (Milestone M8)
  const handleRetryEvaluation = async (evaluationId: string) => {
    setRetryingEvalId(evaluationId);
    try {
      const res = await fetch(`${API_BASE}/evaluations/${evaluationId}/retry`, {
        method: 'POST',
        headers: {
          ...(token && { Authorization: `Bearer ${token}` }),
        },
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Gagal mencoba ulang evaluasi');
      }
      alert(data.message || 'Evaluasi berhasil dicoba ulang');
      fetchExceptions(automationDate);
      fetchAuditTrail();
      fetchEvaluations(automationDate);
    } catch (err: any) {
      alert(err.message || 'Gagal melakukan retry');
    } finally {
      setRetryingEvalId(null);
    }
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-20 flex flex-col items-center justify-center">
        <Loader2 className="w-8 h-8 text-blue-500 animate-spin mb-3" />
        <p className="text-sm text-slate-400">Memuat detail turnamen...</p>
      </div>
    );
  }

  if (!tournament) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-20 text-center">
        <AlertCircle className="w-12 h-12 text-rose-500 mx-auto mb-3" />
        <h2 className="text-xl font-bold text-white">Turnamen Tidak Ditemukan</h2>
        <p className="text-xs text-slate-400 mt-1 mb-6">ID turnamen tidak valid atau telah dihapus.</p>
        <Link
          href="/tournaments"
          className="px-4 py-2 rounded-xl bg-blue-600 text-white text-xs font-semibold"
        >
          Kembali ke Daftar Turnamen
        </Link>
      </div>
    );
  }

  const unenrolledParticipants = allParticipants.filter(
    (ap) => !enrolled.some((ep) => ep.participant.id === ap.id),
  );

  const filteredEnrolled = enrolled.filter((ep) => {
    const matchesFilter =
      enrolledFilter === 'ALL' || ep.status === enrolledFilter;
    const q = enrolledSearch.toLowerCase().trim();
    const matchesSearch =
      !q ||
      ep.participant.name.toLowerCase().includes(q) ||
      (ep.participant.email && ep.participant.email.toLowerCase().includes(q)) ||
      (ep.participant.phoneNumber && ep.participant.phoneNumber.includes(q));
    return matchesFilter && matchesSearch;
  });

  const totalEnrolledCount = enrolled.length;
  const totalApprovedCount = enrolled.filter((e) => e.status === 'APPROVED').length;
  const totalDisqualifiedCount = enrolled.filter((e) => e.status === 'DISQUALIFIED').length;

  const filteredStocks = stocksList.filter(
    (s) =>
      s.symbol.toLowerCase().includes(stockSearchQuery.toLowerCase()) ||
      s.name.toLowerCase().includes(stockSearchQuery.toLowerCase()),
  );

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      {/* Back Button */}
      <Link
        href="/tournaments"
        className="inline-flex items-center gap-2 text-xs font-medium text-slate-400 hover:text-white transition-colors mb-6"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        <span>Kembali ke Daftar Turnamen</span>
      </Link>

      {/* Header Banner */}
      <div className="glass-panel p-8 rounded-3xl border border-slate-800 shadow-xl mb-8 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-blue-600/10 blur-[100px] pointer-events-none rounded-full" />

        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6 relative z-10">
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-3">
              <span
                className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${
                  tournament.status === 'ACTIVE'
                    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                    : tournament.status === 'UPCOMING'
                    ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                    : 'bg-slate-500/10 text-slate-400 border-slate-500/20'
                }`}
              >
                {tournament.status}
              </span>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-800 text-slate-300">
                {tournament.timezone}
              </span>

              {user?.role === 'ADMIN' && (
                <Link
                  href={`/tournaments/${tournament.id}/edit`}
                  className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-blue-600/15 text-blue-400 border border-blue-500/30 hover:bg-blue-600/25 text-[10px] font-bold uppercase tracking-wider transition-colors ml-1"
                >
                  <Edit3 className="w-3 h-3" />
                  <span>Edit Turnamen</span>
                </Link>
              )}
            </div>

            <h1 className="text-3xl font-extrabold text-white tracking-tight">
              {tournament.name}
            </h1>
            <p className="text-sm text-slate-400 mt-2 max-w-2xl">
              {tournament.description || 'Tidak ada deskripsi turnamen.'}
            </p>

            <div className="flex items-center gap-4 text-xs text-slate-400 mt-4">
              <div className="flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-slate-500" />
                <span>
                  {new Date(tournament.startDate).toLocaleDateString('id-ID')} s/d{' '}
                  {new Date(tournament.endDate).toLocaleDateString('id-ID')}
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-blue-400" />
                <span>{enrolled.length} Peserta</span>
              </div>
              <div className="flex items-center gap-1.5">
                <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
                <span>{picks.length} Total Picks</span>
              </div>
            </div>
          </div>

          {/* Rules highlight card */}
          <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 flex items-center gap-5 shrink-0">
            <div className="text-center">
              <span className="text-[10px] font-medium text-slate-400 block uppercase">
                Initial CL
              </span>
              <span className="text-xl font-extrabold text-rose-400 font-mono">
                -{(Number(tournament.rules?.initialStopPct || 0.03) * 100).toFixed(0)}%
              </span>
            </div>
            <div className="w-[1px] h-8 bg-slate-800" />
            <div className="text-center">
              <span className="text-[10px] font-medium text-slate-400 block uppercase">
                Trailing Stop
              </span>
              <span className="text-xl font-extrabold text-amber-400 font-mono">
                -{(Number(tournament.rules?.trailingStopPct || 0.03) * 100).toFixed(0)}%
              </span>
              <span className="text-[9px] text-slate-500 block">dari peak</span>
            </div>
          </div>
        </div>

        {/* User Application Status / CTA (Milestone M10) */}
        <div className="mt-5 pt-4 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400">Status Keikutsertaan:</span>
            {!user ? (
              <span className="text-xs text-slate-500">Belum masuk sistem</span>
            ) : myApplication?.status === 'APPROVED' ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Peserta Sah Turnamen (Approved)
              </span>
            ) : myApplication?.status === 'PENDING' ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-500/15 text-amber-400 border border-amber-500/30 animate-pulse">
                <Clock className="w-3.5 h-3.5" />
                Menunggu Persetujuan Admin (Pending)
              </span>
            ) : myApplication?.status === 'REJECTED' ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-rose-500/15 text-rose-400 border border-rose-500/30">
                <AlertCircle className="w-3.5 h-3.5" />
                Permohonan Ditolak
              </span>
            ) : (
              <span className="text-xs text-slate-400">Belum mendaftar di turnamen ini</span>
            )}
          </div>

          <div>
            {!user ? (
              <Link
                href="/login"
                className="px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-md shadow-blue-600/20 transition-all flex items-center gap-2"
              >
                <UserCheck className="w-3.5 h-3.5" />
                <span>Masuk dengan Google / Akun untuk Mendaftar</span>
              </Link>
            ) : !myApplication?.applied ? (
              <button
                onClick={handleApplyTournament}
                disabled={applyingTournament}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white text-xs font-semibold shadow-md shadow-blue-600/25 transition-all flex items-center gap-2 disabled:opacity-50"
              >
                {applyingTournament ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Mengirim Permohonan...</span>
                  </>
                ) : (
                  <>
                    <UserCheck className="w-3.5 h-3.5" />
                    <span>Daftar Ikut Turnamen Ini (Apply as Participant)</span>
                  </>
                )}
              </button>
            ) : myApplication?.status === 'APPROVED' ? (
              <Link
                href="/my-picks"
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-semibold shadow-md shadow-emerald-600/25 transition-all flex items-center gap-2"
              >
                <CheckSquare className="w-3.5 h-3.5" />
                <span>Kirim / Cek Pick Saham Saya</span>
              </Link>
            ) : myApplication?.status === 'PENDING' ? (
              <span className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-semibold">
                <Clock className="w-3.5 h-3.5" />
                <span>Pendaftaran Menunggu Persetujuan Admin</span>
              </span>
            ) : myApplication?.status === 'REJECTED' ? (
              <button
                onClick={handleApplyTournament}
                disabled={applyingTournament}
                className="px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold transition-all"
              >
                Ajukan Ulang Permohonan
              </button>
            ) : null}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-3 mb-8 overflow-x-auto">
        <button
          onClick={() => setActiveTab('PICKS')}
          className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all shrink-0 ${
            activeTab === 'PICKS'
              ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
          }`}
        >
          <TrendingUp className="w-3.5 h-3.5" />
          <span>Stock Picks Harian ({picks.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('PARTICIPANTS')}
          className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all shrink-0 ${
            activeTab === 'PARTICIPANTS'
              ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
          }`}
        >
          <Users className="w-3.5 h-3.5" />
          <span>Peserta Terdaftar ({enrolled.length})</span>
        </button>

        {user?.role === 'ADMIN' && (
          <button
            onClick={() => {
              setActiveTab('APPLICANTS');
              fetchApplicants(applicantStatusFilter);
            }}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all shrink-0 ${
              activeTab === 'APPLICANTS'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <UserCheck className="w-3.5 h-3.5" />
            <span>
              Persetujuan Peserta ({applicantsList.filter((a) => a.status === 'PENDING').length} Baru)
            </span>
            {applicantsList.filter((a) => a.status === 'PENDING').length > 0 && (
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
            )}
          </button>
        )}

        <button
          onClick={() => setActiveTab('SYNC')}
          className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all shrink-0 ${
            activeTab === 'SYNC'
              ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
          }`}
        >
          <Database className="w-3.5 h-3.5" />
          <span>Data Pasar & Sync ({syncRuns.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('EVALUATION')}
          className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all shrink-0 ${
            activeTab === 'EVALUATION'
              ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
          }`}
        >
          <Award className="w-3.5 h-3.5" />
          <span>Evaluasi Trade ({evaluations.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('RESULTS')}
          className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all shrink-0 ${
            activeTab === 'RESULTS'
              ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
          }`}
        >
          <Trophy className="w-3.5 h-3.5" />
          <span>Hasil & Klasemen</span>
        </button>

        <button
          onClick={() => {
            setActiveTab('AUTOMATION');
            fetchExceptions(automationDate);
            fetchAuditTrail();
          }}
          className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all shrink-0 ${
            activeTab === 'AUTOMATION'
              ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
          }`}
        >
          <Zap className="w-3.5 h-3.5" />
          <span>Otomasi & Exceptions</span>
          {exceptionsList.length > 0 && (
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
          )}
        </button>

        <button
          onClick={() => setActiveTab('OVERVIEW')}
          className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all shrink-0 ${
            activeTab === 'OVERVIEW'
              ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
          }`}
        >
          <Sliders className="w-3.5 h-3.5" />
          <span>Aturan Trading & Konfigurasi</span>
        </button>
      </div>

      {/* TAB 1: STOCK PICKS */}
      {activeTab === 'PICKS' && (
        <div>
          {/* Pick actions toolbar */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 text-xs text-slate-300">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                <span>Filter Tanggal:</span>
              </div>
              <input
                type="date"
                value={pickDateFilter}
                onChange={(e) => setPickDateFilter(e.target.value)}
                className="px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-200 text-xs focus:outline-none focus:border-blue-500"
              />
              {pickDateFilter && (
                <button
                  onClick={() => setPickDateFilter('')}
                  className="text-xs text-slate-400 hover:text-white"
                >
                  Reset
                </button>
              )}
            </div>

            {user && (
              <button
                onClick={() => {
                  if (enrolled.length === 0) {
                    alert('Daftarkan minimal satu peserta terlebih dahulu di tab Peserta Terdaftar.');
                    return;
                  }
                  if (!pickParticipantId && enrolled[0]) {
                    setPickParticipantId(enrolled[0].participant.id);
                  }
                  if (!pickStockId && stocksList[0]) {
                    setPickStockId(stocksList[0].id);
                  }
                  setIsPickModalOpen(true);
                }}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white text-xs font-semibold shadow-md shadow-blue-600/20"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Submit Stock Pick</span>
              </button>
            )}
          </div>

          {/* Picks Table */}
          {loadingPicks ? (
            <div className="flex flex-col items-center justify-center py-16">
              <Loader2 className="w-8 h-8 text-blue-500 animate-spin mb-3" />
              <p className="text-sm text-slate-400">Memuat daftar picks...</p>
            </div>
          ) : picks.length === 0 ? (
            <div className="glass-panel p-12 text-center rounded-2xl border border-slate-800">
              <TrendingUp className="w-12 h-12 text-slate-600 mx-auto mb-4" />
              <h3 className="text-base font-semibold text-slate-200">Belum Ada Stock Pick</h3>
              <p className="text-xs text-slate-400 max-w-sm mx-auto mt-1 mb-6">
                {pickDateFilter
                  ? `Tidak ada stock pick pada tanggal ${pickDateFilter}.`
                  : 'Peserta belum memasukkan pilihan saham untuk turnamen ini.'}
              </p>
              {user && (
                <button
                  onClick={() => {
                    if (enrolled.length === 0) {
                      alert('Daftarkan peserta terlebih dahulu!');
                      return;
                    }
                    setIsPickModalOpen(true);
                  }}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 text-white text-xs font-semibold"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Submit Pick Pertama</span>
                </button>
              )}
            </div>
          ) : (
            <div className="glass-panel rounded-2xl border border-slate-800 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-800/80 bg-slate-900/40 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                      <th className="py-4 px-6">Peserta</th>
                      <th className="py-4 px-6">Saham (Ticker)</th>
                      <th className="py-4 px-6">Tanggal Trading</th>
                      <th className="py-4 px-6 text-right">Harga Entry</th>
                      <th className="py-4 px-6 text-center">Sumber Entry</th>
                      <th className="py-4 px-6 text-center">Status</th>
                      {user && <th className="py-4 px-6 text-center">Aksi</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 text-sm">
                    {picks.map((pick) => (
                      <tr key={pick.id} className="hover:bg-slate-800/30 transition-colors">
                        <td className="py-4 px-6">
                          <span className="font-semibold text-slate-200">
                            {pick.participant.name}
                          </span>
                        </td>
                        <td className="py-4 px-6">
                          <div className="flex items-center gap-2">
                            <span className="px-2 py-0.5 rounded bg-blue-500/10 border border-blue-500/20 text-blue-400 font-mono font-bold text-xs">
                              {pick.stock.symbol}
                            </span>
                            <span className="text-xs text-slate-400 hidden sm:inline">
                              {pick.stock.name}
                            </span>
                          </div>
                        </td>
                        <td className="py-4 px-6 text-xs text-slate-300 font-mono">
                          {new Date(pick.tradingDate).toISOString().substring(0, 10)}
                        </td>
                        <td className="py-4 px-6 text-right font-mono font-bold text-slate-100">
                          Rp {Number(pick.entryPrice).toLocaleString('id-ID')}
                        </td>
                        <td className="py-4 px-6 text-center">
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                            {pick.entrySource}
                          </span>
                        </td>
                        <td className="py-4 px-6 text-center">
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                            {pick.status}
                          </span>
                        </td>
                        {user && (
                          <td className="py-4 px-6 text-center">
                            <button
                              onClick={() => handleDeletePick(pick.id)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                              title="Hapus Pick"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: PARTICIPANTS */}
      {activeTab === 'PARTICIPANTS' && (
        <div className="space-y-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Users className="w-5 h-5 text-blue-400" />
                <span>Manajemen Peserta Turnamen</span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Kelola peserta khusus turnamen ini: tambahkan peserta, diskualifikasi pelanggar, pulihkan, atau keluarkan.
              </p>
            </div>

            {user && (
              <button
                onClick={() => {
                  if (unenrolledParticipants.length > 0) {
                    setSelectedParticipantToEnroll(unenrolledParticipants[0].id);
                  }
                  setIsEnrollModalOpen(true);
                }}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-md shadow-blue-600/20 self-start transition-all"
              >
                <Plus className="w-4 h-4" />
                <span>+ Daftarkan Peserta</span>
              </button>
            )}
          </div>

          {/* Quick Stats Banner */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="glass-panel p-4 rounded-xl border border-slate-800/80 flex items-center justify-between">
              <div>
                <span className="text-[11px] text-slate-400 font-medium block">Total Terdaftar</span>
                <span className="text-2xl font-bold text-white font-mono mt-0.5 block">{totalEnrolledCount}</span>
              </div>
              <div className="w-10 h-10 rounded-xl bg-blue-600/10 border border-blue-500/20 text-blue-400 flex items-center justify-center">
                <Users className="w-5 h-5" />
              </div>
            </div>

            <div className="glass-panel p-4 rounded-xl border border-slate-800/80 flex items-center justify-between">
              <div>
                <span className="text-[11px] text-slate-400 font-medium block">Peserta Aktif (Sah)</span>
                <span className="text-2xl font-bold text-emerald-400 font-mono mt-0.5 block">{totalApprovedCount}</span>
              </div>
              <div className="w-10 h-10 rounded-xl bg-emerald-600/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center">
                <CheckCircle2 className="w-5 h-5" />
              </div>
            </div>

            <div className="glass-panel p-4 rounded-xl border border-slate-800/80 flex items-center justify-between">
              <div>
                <span className="text-[11px] text-slate-400 font-medium block">Didiskualifikasi</span>
                <span className="text-2xl font-bold text-rose-400 font-mono mt-0.5 block">{totalDisqualifiedCount}</span>
              </div>
              <div className="w-10 h-10 rounded-xl bg-rose-600/10 border border-rose-500/20 text-rose-400 flex items-center justify-center">
                <ShieldAlert className="w-5 h-5" />
              </div>
            </div>
          </div>

          {/* Filter & Search Toolbar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
            <div className="flex items-center gap-1.5 p-1 rounded-xl bg-slate-900 border border-slate-800 self-start">
              {(['ALL', 'APPROVED', 'DISQUALIFIED'] as const).map((filterVal) => (
                <button
                  key={filterVal}
                  onClick={() => setEnrolledFilter(filterVal)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    enrolledFilter === filterVal
                      ? 'bg-blue-600 text-white shadow-sm shadow-blue-600/30'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {filterVal === 'ALL'
                    ? `Semua (${totalEnrolledCount})`
                    : filterVal === 'APPROVED'
                    ? `Aktif (${totalApprovedCount})`
                    : `Didiskualifikasi (${totalDisqualifiedCount})`}
                </button>
              ))}
            </div>

            <div className="relative w-full sm:w-72">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                placeholder="Cari nama atau email peserta..."
                value={enrolledSearch}
                onChange={(e) => setEnrolledSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2 rounded-xl bg-slate-900/90 border border-slate-800 text-slate-200 placeholder-slate-500 text-xs focus:outline-none focus:border-blue-500"
              />
              {enrolledSearch && (
                <button
                  onClick={() => setEnrolledSearch('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {loadingEnrolled ? (
            <div className="flex flex-col items-center justify-center py-16">
              <Loader2 className="w-8 h-8 text-blue-500 animate-spin mb-3" />
              <p className="text-sm text-slate-400">Memuat peserta turnamen...</p>
            </div>
          ) : filteredEnrolled.length === 0 ? (
            <div className="glass-panel p-12 text-center rounded-2xl border border-slate-800">
              <Users className="w-12 h-12 text-slate-600 mx-auto mb-4" />
              <h3 className="text-base font-semibold text-slate-200">
                {enrolledSearch || enrolledFilter !== 'ALL'
                  ? 'Tidak Ada Peserta yang Sesuai Filter'
                  : 'Belum Ada Peserta Terdaftar'}
              </h3>
              <p className="text-xs text-slate-400 max-w-sm mx-auto mt-1 mb-6">
                {enrolledSearch || enrolledFilter !== 'ALL'
                  ? 'Coba ganti kata kunci pencarian atau ubah filter status peserta.'
                  : 'Turnamen ini belum memiliki peserta terdaftar. Daftarkan trader melalui tombol di atas.'}
              </p>
            </div>
          ) : (
            <div className="glass-panel rounded-2xl border border-slate-800 overflow-hidden shadow-xl">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-800/80 bg-slate-900/60 text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                      <th className="py-3.5 px-6">Peserta Turnamen</th>
                      <th className="py-3.5 px-6 text-center">Status Kepesertaan</th>
                      <th className="py-3.5 px-6 text-center">Picks Turnamen</th>
                      <th className="py-3.5 px-6">Tanggal Bergabung</th>
                      <th className="py-3.5 px-6">Catatan / Status Review</th>
                      {user?.role === 'ADMIN' && (
                        <th className="py-3.5 px-6 text-right">Aksi Turnamen</th>
                      )}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 text-slate-300">
                    {filteredEnrolled.map((ep) => (
                      <tr
                        key={ep.membershipId}
                        className={`hover:bg-slate-800/30 transition-colors ${
                          ep.status === 'DISQUALIFIED' ? 'bg-rose-950/10' : ''
                        }`}
                      >
                        {/* Profile & Name */}
                        <td className="py-4 px-6">
                          <div className="flex items-center gap-3">
                            <div
                              className={`w-9 h-9 rounded-xl font-bold text-xs flex items-center justify-center uppercase shrink-0 border ${
                                ep.status === 'DISQUALIFIED'
                                  ? 'bg-rose-500/10 border-rose-500/30 text-rose-400'
                                  : 'bg-blue-600/10 border-blue-500/20 text-blue-400'
                              }`}
                            >
                              {ep.participant.user?.avatarUrl ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img
                                  src={ep.participant.user.avatarUrl}
                                  alt={ep.participant.name}
                                  className="w-full h-full rounded-xl object-cover"
                                />
                              ) : (
                                ep.participant.name.substring(0, 2)
                              )}
                            </div>
                            <div>
                              <div
                                className={`font-semibold ${
                                  ep.status === 'DISQUALIFIED'
                                    ? 'text-slate-400 line-through'
                                    : 'text-slate-100'
                                }`}
                              >
                                {ep.participant.name}
                              </div>
                              <div className="text-[11px] text-slate-400">
                                {ep.participant.email || ep.participant.phoneNumber || 'ID Peserta'}
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Status Badge */}
                        <td className="py-4 px-6 text-center">
                          {ep.status === 'DISQUALIFIED' ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-rose-500/15 text-rose-400 border border-rose-500/30 shadow-sm shadow-rose-500/10">
                              <ShieldAlert className="w-3.5 h-3.5" />
                              DIDISKUALIFIKASI
                            </span>
                          ) : ep.status === 'APPROVED' ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 shadow-sm shadow-emerald-500/10">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              AKTIF (APPROVED)
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-slate-800 text-slate-400 border border-slate-700">
                              {ep.status}
                            </span>
                          )}
                        </td>

                        {/* Total Picks */}
                        <td className="py-4 px-6 text-center">
                          <span className="inline-block px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-800 text-xs font-mono font-bold text-blue-400">
                            {ep.picksCount} Picks
                          </span>
                        </td>

                        {/* Joined Date */}
                        <td className="py-4 px-6 text-slate-400 text-xs font-mono">
                          {ep.joinedAt
                            ? new Date(ep.joinedAt).toLocaleDateString('id-ID', {
                                day: 'numeric',
                                month: 'short',
                                year: 'numeric',
                              })
                            : '-'}
                        </td>

                        {/* Notes / Reason */}
                        <td className="py-4 px-6 text-xs">
                          {ep.reviewNotes ? (
                            <div className="text-[11px] text-rose-300/90 italic bg-rose-500/10 border border-rose-500/20 px-2.5 py-1 rounded-lg">
                              &quot;{ep.reviewNotes}&quot;
                            </div>
                          ) : (
                            <span className="text-slate-500 text-[11px]">Normal</span>
                          )}
                        </td>

                        {/* Actions */}
                        {user?.role === 'ADMIN' && (
                          <td className="py-4 px-6 text-right">
                            <div className="flex items-center justify-end gap-2">
                              {reviewingParticipantId === ep.participant.id ? (
                                <span className="inline-flex items-center gap-1.5 text-xs text-slate-400">
                                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                  <span>Memproses...</span>
                                </span>
                              ) : (
                                <>
                                  {ep.status === 'DISQUALIFIED' ? (
                                    <button
                                      onClick={() =>
                                        handleToggleDisqualify(
                                          ep.participant.id,
                                          ep.participant.name,
                                          ep.status,
                                        )
                                      }
                                      className="px-2.5 py-1.5 rounded-lg bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 border border-emerald-500/30 text-xs font-semibold flex items-center gap-1.5 transition-all"
                                      title="Pulihkan & Aktifkan Peserta"
                                    >
                                      <RotateCcw className="w-3.5 h-3.5" />
                                      <span>Pulihkan</span>
                                    </button>
                                  ) : (
                                    <button
                                      onClick={() =>
                                        handleToggleDisqualify(
                                          ep.participant.id,
                                          ep.participant.name,
                                          ep.status,
                                        )
                                      }
                                      className="px-2.5 py-1.5 rounded-lg bg-amber-500/15 hover:bg-rose-500/25 text-amber-300 hover:text-rose-300 border border-amber-500/30 hover:border-rose-500/30 text-xs font-semibold flex items-center gap-1.5 transition-all"
                                      title="Diskualifikasi dari Turnamen Ini"
                                    >
                                      <UserX className="w-3.5 h-3.5" />
                                      <span>Diskualifikasi</span>
                                    </button>
                                  )}

                                  <button
                                    onClick={() =>
                                      handleUnenrollParticipant(
                                        ep.participant.id,
                                        ep.participant.name,
                                      )
                                    }
                                    className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 border border-transparent hover:border-rose-500/20 transition-all"
                                    title="Keluarkan dari Turnamen Ini"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </>
                              )}
                            </div>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB: APPLICANTS & APPROVAL (Milestone M10) */}
      {activeTab === 'APPLICANTS' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <UserCheck className="w-5 h-5 text-blue-400" />
                <span>Persetujuan Peserta Turnamen (Applicant Review)</span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Setujui atau tolak pelamar turnamen ini secara independen. Peserta dengan status <strong>Approved</strong> otomatis sah mengumpulkan stock picks.
              </p>
            </div>

            {/* Filter buttons */}
            <div className="flex items-center gap-1.5 p-1 rounded-xl bg-slate-900 border border-slate-800">
              {(['ALL', 'PENDING', 'APPROVED', 'REJECTED'] as const).map((st) => (
                <button
                  key={st}
                  onClick={() => {
                    setApplicantStatusFilter(st);
                    fetchApplicants(st);
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    applicantStatusFilter === st
                      ? 'bg-blue-600 text-white shadow-sm shadow-blue-600/30'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {st === 'ALL'
                    ? 'Semua Status'
                    : st === 'PENDING'
                    ? 'Menunggu'
                    : st === 'APPROVED'
                    ? 'Disetujui'
                    : 'Ditolak'}
                </button>
              ))}
            </div>
          </div>

          {loadingApplicants ? (
            <div className="flex flex-col items-center justify-center py-16">
              <Loader2 className="w-8 h-8 text-blue-500 animate-spin mb-3" />
              <p className="text-sm text-slate-400">Memuat data pelamar turnamen...</p>
            </div>
          ) : applicantsList.length === 0 ? (
            <div className="glass-panel p-12 text-center rounded-2xl border border-slate-800">
              <UserCheck className="w-12 h-12 text-slate-600 mx-auto mb-3" />
              <h3 className="text-base font-semibold text-slate-200">
                Belum Ada Pendaftar
              </h3>
              <p className="text-xs text-slate-400 max-w-sm mx-auto mt-1">
                {applicantStatusFilter !== 'ALL'
                  ? `Tidak ada pendaftar dengan status filter ${applicantStatusFilter}.`
                  : 'Belum ada pengguna yang mendaftar ke turnamen ini.'}
              </p>
            </div>
          ) : (
            <div className="glass-panel rounded-2xl border border-slate-800 overflow-hidden shadow-xl">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-800/80 bg-slate-900/60 text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                      <th className="py-3.5 px-6">Pelamar / Pengguna</th>
                      <th className="py-3.5 px-6">Metode Akun</th>
                      <th className="py-3.5 px-6">Tanggal Daftar</th>
                      <th className="py-3.5 px-6 text-center">Status Kepesertaan</th>
                      <th className="py-3.5 px-6">Catatan / Review</th>
                      <th className="py-3.5 px-6 text-right">Aksi Admin</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 text-slate-300">
                    {applicantsList.map((app) => (
                      <tr key={app.id} className="hover:bg-slate-800/30 transition-colors">
                        {/* User identity */}
                        <td className="py-4 px-6">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-xl bg-blue-600/20 border border-blue-500/30 text-blue-400 font-bold text-xs flex items-center justify-center uppercase shrink-0">
                              {app.user?.avatarUrl ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img
                                  src={app.user.avatarUrl}
                                  alt={app.participant.name}
                                  className="w-full h-full rounded-xl object-cover"
                                />
                              ) : (
                                app.participant.name.substring(0, 2)
                              )}
                            </div>
                            <div>
                              <div className="font-semibold text-slate-100">
                                {app.participant.name}
                              </div>
                              <div className="text-[11px] text-slate-400">
                                {app.participant.email || app.user?.email || '-'}
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Provider */}
                        <td className="py-4 px-6">
                          {app.user?.provider === 'GOOGLE' ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-red-500/10 text-red-400 border border-red-500/20">
                              Google SSO
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-slate-800 text-slate-400 border border-slate-700">
                              Lokal
                            </span>
                          )}
                        </td>

                        {/* Registered Date */}
                        <td className="py-4 px-6 text-slate-400 text-xs font-mono">
                          {new Date(app.registeredAt).toLocaleDateString('id-ID', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </td>

                        {/* Status */}
                        <td className="py-4 px-6 text-center">
                          {app.status === 'APPROVED' ? (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 shadow-sm shadow-emerald-500/10">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              APPROVED
                            </span>
                          ) : app.status === 'PENDING' ? (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold bg-amber-500/15 text-amber-400 border border-amber-500/30 animate-pulse">
                              <Clock className="w-3.5 h-3.5" />
                              PENDING
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold bg-rose-500/15 text-rose-400 border border-rose-500/30">
                              <AlertCircle className="w-3.5 h-3.5" />
                              REJECTED
                            </span>
                          )}
                        </td>

                        {/* Review metadata */}
                        <td className="py-4 px-6 text-slate-400 text-xs">
                          {app.reviewedAt ? (
                            <div>
                              <span className="text-[11px] text-slate-300 block">
                                Direview pada{' '}
                                {new Date(app.reviewedAt).toLocaleDateString('id-ID', {
                                  day: 'numeric',
                                  month: 'short',
                                })}
                              </span>
                              {app.reviewNotes && (
                                <span className="text-[10px] text-slate-500 italic block mt-0.5">
                                  &quot;{app.reviewNotes}&quot;
                                </span>
                              )}
                            </div>
                          ) : (
                            <span className="text-slate-500 text-[11px]">Belum direview</span>
                          )}
                        </td>

                        {/* Actions */}
                        <td className="py-4 px-6 text-right">
                          <div className="flex items-center justify-end gap-2">
                            {reviewingParticipantId === app.participantId ? (
                              <span className="inline-flex items-center gap-1.5 text-xs text-slate-400">
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                <span>Menyimpan...</span>
                              </span>
                            ) : app.status === 'PENDING' ? (
                              <>
                                <button
                                  onClick={() =>
                                    handleReviewApplicant(app.participantId, 'APPROVED')
                                  }
                                  className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-sm shadow-emerald-600/30 flex items-center gap-1.5 transition-all"
                                >
                                  <Check className="w-3.5 h-3.5" />
                                  <span>Setujui</span>
                                </button>
                                <button
                                  onClick={() =>
                                    handleReviewApplicant(app.participantId, 'REJECTED')
                                  }
                                  className="px-3 py-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 text-xs font-semibold flex items-center gap-1.5 transition-all"
                                >
                                  <UserX className="w-3.5 h-3.5" />
                                  <span>Tolak</span>
                                </button>
                              </>
                            ) : app.status === 'APPROVED' ? (
                              <button
                                onClick={() =>
                                  handleReviewApplicant(app.participantId, 'REJECTED')
                                }
                                className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-rose-500/10 text-slate-400 hover:text-rose-400 border border-slate-700 hover:border-rose-500/20 text-xs font-semibold transition-all"
                              >
                                Batalkan (Tolak)
                              </button>
                            ) : (
                              <button
                                onClick={() =>
                                  handleReviewApplicant(app.participantId, 'APPROVED')
                                }
                                className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold transition-all"
                              >
                                Setujui Ulang
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 3: OVERVIEW & RULES */}
      {activeTab === 'OVERVIEW' && tournament.rules && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="glass-panel p-6 rounded-2xl border border-slate-800">
            <div className="flex items-center gap-2 mb-4">
              <ShieldAlert className="w-5 h-5 text-rose-400" />
              <h3 className="text-base font-bold text-white">Aturan Stop Loss & Exit</h3>
            </div>
            <div className="space-y-4 text-xs">
              <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800">
                <span className="text-slate-400 block mb-1">Initial Cut Loss Policy</span>
                <span className="text-sm font-bold text-rose-400 font-mono">
                  -{(Number(tournament.rules.initialStopPct) * 100).toFixed(1)}% dari Harga Entry
                </span>
                <p className="text-[11px] text-slate-500 mt-1">
                  Threshold minimal -{(Number(tournament.rules.initialStopPct) * 100).toFixed(1)}% wajib dipatuhi. Simulated exit dieksekusi pada harga actual tick IDX.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800">
                <span className="text-slate-400 block mb-1">Trailing Stop Policy</span>
                <span className="text-sm font-bold text-amber-400 font-mono">
                  -{(Number(tournament.rules.trailingStopPct) * 100).toFixed(1)}% dari Highest Peak
                </span>
                <p className="text-[11px] text-slate-500 mt-1">
                  Trailing stop mengikuti puncak harga tertinggi (highest valid price) selama intraday.
                </p>
              </div>
            </div>
          </div>

          <div className="glass-panel p-6 rounded-2xl border border-slate-800">
            <div className="flex items-center gap-2 mb-4">
              <Sliders className="w-5 h-5 text-cyan-400" />
              <h3 className="text-base font-bold text-white">Kebijakan Eksekusi & Data</h3>
            </div>
            <div className="space-y-3 text-xs">
              <div className="flex items-center justify-between py-2 border-b border-slate-800">
                <span className="text-slate-400">Candle Ambiguity:</span>
                <span className="font-semibold text-slate-200">
                  {tournament.rules.candleAmbiguityPolicy}
                </span>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-slate-800">
                <span className="text-slate-400">Gap Execution Policy:</span>
                <span className="font-semibold text-slate-200">
                  {tournament.rules.gapPolicy}
                </span>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-slate-800">
                <span className="text-slate-400">Price Fraction (Fraksi Harga):</span>
                <span className="font-semibold text-slate-200">
                  {tournament.rules.priceFractionPolicy}
                </span>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-slate-800">
                <span className="text-slate-400">Points Calculation Rule:</span>
                <span className="font-semibold text-slate-200">
                  {tournament.rules.pointsRule}
                </span>
              </div>
              <div className="flex items-center justify-between py-2">
                <span className="text-slate-400">Rule Engine Version:</span>
                <span className="font-mono text-cyan-400">
                  {tournament.rules.calculationRuleVersion}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: MARKET DATA & SYNC */}
      {activeTab === 'SYNC' && (
        <div className="space-y-6">
          {/* Sync Trigger Card */}
          <div className="glass-panel p-6 rounded-2xl border border-slate-800 relative overflow-hidden">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <Database className="w-5 h-5 text-blue-400" />
                  <h3 className="text-base font-bold text-white">
                    Sinkronisasi Data Pasar Intraday 1-Menit
                  </h3>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-blue-600/20 text-blue-400 border border-blue-500/20">
                    IDX Canonical
                  </span>
                </div>
                <p className="text-xs text-slate-400 max-w-2xl">
                  Tarik bar candle 1-menit kanonikal untuk seluruh emiten unik yang dipilih peserta turnamen pada tanggal yang ditentukan. Menghindari duplikasi emiten dan memvalidasi geometri OHLC serta jam bursa WIB.
                </p>
              </div>

              {/* Action Form */}
              <form
                onSubmit={handleTriggerSync}
                className="flex flex-wrap items-center gap-3 bg-slate-900/90 p-3 rounded-2xl border border-slate-800"
              >
                <div>
                  <label className="block text-[10px] font-medium text-slate-400 mb-1">
                    Tanggal Perdagangan
                  </label>
                  <input
                    type="date"
                    required
                    value={syncDate || (tournament ? tournament.startDate.substring(0, 10) : '')}
                    onChange={(e) => setSyncDate(e.target.value)}
                    min={tournament?.startDate.substring(0, 10)}
                    max={tournament?.endDate.substring(0, 10)}
                    className="px-3 py-1.5 rounded-xl bg-slate-800 border border-slate-700 text-slate-100 text-xs focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-medium text-slate-400 mb-1">
                    Provider
                  </label>
                  <select
                    value={syncProvider}
                    onChange={(e) => setSyncProvider(e.target.value as 'mock' | 'http')}
                    className="px-3 py-1.5 rounded-xl bg-slate-800 border border-slate-700 text-slate-100 text-xs focus:outline-none focus:border-blue-500"
                  >
                    <option value="mock">Mock IDX (Deterministik 330 Bar)</option>
                    <option value="http">HTTP Provider (API Eksternal)</option>
                  </select>
                </div>

                <div className="flex items-end">
                  <button
                    type="submit"
                    disabled={triggeringSync}
                    className="inline-flex items-center gap-2 px-4 py-2 mt-4 md:mt-0 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-semibold shadow-md shadow-blue-600/20 transition-all disabled:opacity-50"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${triggeringSync ? 'animate-spin' : ''}`} />
                    <span>{triggeringSync ? 'Sinkronisasi...' : 'Tarik Data (Sync)'}</span>
                  </button>
                </div>
              </form>
            </div>

            {/* Notification messages */}
            {syncSuccess && (
              <div className="mt-4 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>{syncSuccess}</span>
                </div>
                <button
                  onClick={() => setSyncSuccess('')}
                  className="text-emerald-400 hover:text-emerald-300"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {syncError && (
              <div className="mt-4 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{syncError}</span>
                </div>
                <button
                  onClick={() => setSyncError('')}
                  className="text-red-400 hover:text-red-300"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>

          {/* Sync Runs History */}
          <div className="glass-panel p-6 rounded-2xl border border-slate-800">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h4 className="text-sm font-bold text-white">Riwayat Eksekusi Sinkronisasi</h4>
                <p className="text-xs text-slate-400">
                  Daftar run market data yang pernah dijalankan untuk turnamen ini
                </p>
              </div>
              <button
                onClick={fetchSyncRuns}
                disabled={loadingSyncRuns}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-800 text-slate-400 hover:text-slate-200 text-xs"
              >
                <RefreshCw className={`w-3 h-3 ${loadingSyncRuns ? 'animate-spin' : ''}`} />
                <span>Segarkan</span>
              </button>
            </div>

            {loadingSyncRuns ? (
              <div className="flex flex-col items-center justify-center py-12">
                <Loader2 className="w-6 h-6 text-blue-500 animate-spin mb-2" />
                <p className="text-xs text-slate-400">Memuat riwayat sync...</p>
              </div>
            ) : syncRuns.length === 0 ? (
              <div className="p-8 text-center border border-dashed border-slate-800 rounded-xl">
                <Database className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                <p className="text-sm font-semibold text-slate-300">Belum Ada Data Pasar yang Di-sync</p>
                <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
                  Pilih tanggal trading dan klik tombol &quot;Tarik Data (Sync)&quot; di atas untuk menarik data candle intraday 1-menit.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="text-[11px] text-slate-400 uppercase bg-slate-900/60 border-b border-slate-800">
                    <tr>
                      <th className="py-3 px-4 font-semibold">Tanggal Trading</th>
                      <th className="py-3 px-4 font-semibold">Provider</th>
                      <th className="py-3 px-4 font-semibold">Status</th>
                      <th className="py-3 px-4 font-semibold">Emiten Ter-sync</th>
                      <th className="py-3 px-4 font-semibold">Waktu Eksekusi</th>
                      <th className="py-3 px-4 font-semibold text-right">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {syncRuns.map((run) => (
                      <tr key={run.id} className="hover:bg-slate-800/30 transition-colors">
                        <td className="py-3.5 px-4 font-mono font-medium text-slate-200">
                          {run.tradingDate.substring(0, 10)}
                        </td>
                        <td className="py-3.5 px-4">
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-cyan-400 uppercase">
                            {run.provider}
                          </span>
                        </td>
                        <td className="py-3.5 px-4">
                          <span
                            className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                              run.status === 'SUCCESS'
                                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                                : run.status === 'PARTIAL'
                                ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                                : run.status === 'RUNNING'
                                ? 'bg-blue-500/10 text-blue-400 border-blue-500/20'
                                : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                            }`}
                          >
                            <span
                              className={`w-1.5 h-1.5 rounded-full ${
                                run.status === 'SUCCESS'
                                  ? 'bg-emerald-400'
                                  : run.status === 'PARTIAL'
                                  ? 'bg-amber-400'
                                  : run.status === 'RUNNING'
                                  ? 'bg-blue-400 animate-pulse'
                                  : 'bg-rose-400'
                              }`}
                            />
                            {run.status}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 font-mono">
                          <span className="text-white font-bold">
                            {run.syncedCount ?? run.syncedSymbols ?? 0}
                          </span>
                          <span className="text-slate-500"> / {run.totalSymbols} Emiten</span>
                        </td>
                        <td className="py-3.5 px-4 text-slate-400 font-mono text-[11px]">
                          {new Date(run.startedAt).toLocaleTimeString('id-ID', {
                            hour: '2-digit',
                            minute: '2-digit',
                            second: '2-digit',
                          })}{' '}
                          WIB
                          {run.completedAt && (
                            <span className="text-slate-500 ml-1">
                              (
                              {Math.max(
                                0,
                                Math.round(
                                  (new Date(run.completedAt).getTime() -
                                    new Date(run.startedAt).getTime()) /
                                    1000,
                                ),
                              )}
                              s)
                            </span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <button
                            onClick={() => handleViewRunDetails(run.id)}
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition-all border border-slate-700"
                          >
                            <Eye className="w-3.5 h-3.5 text-blue-400" />
                            <span>Lihat Rincian</span>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 5: TRADE EVALUATION & AUDIT */}
      {activeTab === 'EVALUATION' && (
        <div className="space-y-6">
          {/* Action Header Card */}
          <div className="glass-panel p-6 rounded-2xl border border-slate-800 relative overflow-hidden">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <Award className="w-5 h-5 text-blue-400" />
                  <h3 className="text-base font-bold text-white">
                    Evaluasi Trade Deterministik & Audit Evidence
                  </h3>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-600/20 text-emerald-400 border border-emerald-500/20">
                    Engine V1 (Pure Rule)
                  </span>
                </div>
                <p className="text-xs text-slate-400 max-w-2xl">
                  Evaluasi otomatis murni matematis (non-LLM) berdasarkan candle 1-menit kanonikal, fraksi harga resmi IDX, initial cut loss terkonfigurasi, trailing stop dinamis dari peak tertinggi, gap down open, dan fallback market close.
                </p>
              </div>

              {/* Action Form */}
              <form
                onSubmit={handleTriggerEvaluation}
                className="flex flex-wrap items-center gap-3 bg-slate-900/90 p-3 rounded-2xl border border-slate-800"
              >
                <div>
                  <label className="block text-[10px] font-medium text-slate-400 mb-1">
                    Tanggal Perdagangan
                  </label>
                  <input
                    type="date"
                    required
                    value={evalDateFilter || (tournament ? tournament.startDate.substring(0, 10) : '')}
                    onChange={(e) => {
                      setEvalDateFilter(e.target.value);
                      fetchEvaluations(e.target.value);
                    }}
                    min={tournament?.startDate.substring(0, 10)}
                    max={tournament?.endDate.substring(0, 10)}
                    className="px-3 py-1.5 rounded-xl bg-slate-800 border border-slate-700 text-slate-100 text-xs focus:outline-none focus:border-blue-500 font-mono"
                  />
                </div>

                <div className="flex items-end gap-2">
                  <button
                    type="submit"
                    disabled={triggeringEvaluation}
                    className="inline-flex items-center gap-2 px-4 py-2 mt-4 md:mt-0 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-semibold shadow-md shadow-blue-600/20 transition-all disabled:opacity-50"
                  >
                    <Play className={`w-3.5 h-3.5 ${triggeringEvaluation ? 'animate-spin' : ''}`} />
                    <span>{triggeringEvaluation ? 'Mengevaluasi...' : 'Jalankan Evaluasi'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => fetchEvaluations(evalDateFilter)}
                    disabled={loadingEvaluations}
                    title="Refresh Evaluasi"
                    className="p-2 mt-4 md:mt-0 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-all"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${loadingEvaluations ? 'animate-spin' : ''}`} />
                  </button>
                </div>
              </form>
            </div>

            {/* Notification messages */}
            {evalSuccess && (
              <div className="mt-4 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>{evalSuccess}</span>
                </div>
                <button
                  onClick={() => setEvalSuccess('')}
                  className="text-emerald-400 hover:text-emerald-300"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {evalError && (
              <div className="mt-4 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{evalError}</span>
                </div>
                <button
                  onClick={() => setEvalError('')}
                  className="text-red-400 hover:text-red-300"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>

          {/* Quick Metrics Summary */}
          {evaluations.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
              <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800">
                <span className="text-[10px] font-medium text-slate-400 block uppercase">
                  Total Dievaluasi
                </span>
                <span className="text-xl font-extrabold text-white font-mono mt-1 block">
                  {evaluations.length}
                </span>
                <span className="text-[10px] text-slate-500 block">Stock Picks</span>
              </div>

              <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800">
                <span className="text-[10px] font-medium text-slate-400 block uppercase">
                  Rata-rata Return
                </span>
                {(() => {
                  const completed = evaluations.filter((e) => e.status === 'COMPLETED');
                  const avg =
                    completed.length > 0
                      ? completed.reduce((acc, c) => acc + Number(c.realizedReturn), 0) /
                        completed.length
                      : 0;
                  return (
                    <span
                      className={`text-xl font-extrabold font-mono mt-1 block ${
                        avg >= 0 ? 'text-emerald-400' : 'text-rose-400'
                      }`}
                    >
                      {avg >= 0 ? `+${avg.toFixed(2)}%` : `${avg.toFixed(2)}%`}
                    </span>
                  );
                })()}
                <span className="text-[10px] text-slate-500 block">Realized Return</span>
              </div>

              <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800">
                <span className="text-[10px] font-medium text-rose-400 block uppercase">
                  Initial Cut Loss
                </span>
                <span className="text-xl font-extrabold text-rose-400 font-mono mt-1 block">
                  {evaluations.filter((e) => e.exitReason === 'INITIAL_CL').length}
                </span>
                <span className="text-[10px] text-slate-500 block">
                  Exit di -{(Number(tournament.rules?.initialStopPct || 0.03) * 100).toFixed(0)}% floor
                </span>
              </div>

              <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800">
                <span className="text-[10px] font-medium text-amber-400 block uppercase">
                  Trailing Stop
                </span>
                <span className="text-xl font-extrabold text-amber-400 font-mono mt-1 block">
                  {evaluations.filter((e) => e.exitReason === 'TRAILING_STOP').length}
                </span>
                <span className="text-[10px] text-slate-500 block">
                  Exit -{(Number(tournament.rules?.trailingStopPct || 0.03) * 100).toFixed(0)}% dari peak
                </span>
              </div>

              <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800">
                <span className="text-[10px] font-medium text-blue-400 block uppercase">
                  Market Close
                </span>
                <span className="text-xl font-extrabold text-blue-400 font-mono mt-1 block">
                  {evaluations.filter((e) => e.exitReason === 'MARKET_CLOSE').length}
                </span>
                <span className="text-[10px] text-slate-500 block">Exit pada bar terakhir</span>
              </div>
            </div>
          )}

          {/* Evaluations Table */}
          <div className="glass-panel p-6 rounded-2xl border border-slate-800">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h4 className="text-sm font-bold text-white">Daftar Hasil Evaluasi Perdagangan</h4>
                <p className="text-xs text-slate-400">
                  {evalDateFilter
                    ? `Hasil evaluasi untuk tanggal ${evalDateFilter}`
                    : 'Seluruh evaluasi pada turnamen ini'}
                </p>
              </div>
              <span className="text-xs text-slate-500 font-mono">
                {evaluations.length} data ditemukan
              </span>
            </div>

            {loadingEvaluations ? (
              <div className="py-12 flex flex-col items-center justify-center">
                <Loader2 className="w-7 h-7 text-blue-500 animate-spin mb-2" />
                <p className="text-xs text-slate-400">Memuat hasil evaluasi...</p>
              </div>
            ) : evaluations.length === 0 ? (
              <div className="text-center py-12 border border-dashed border-slate-800 rounded-2xl">
                <Award className="w-10 h-10 text-slate-600 mx-auto mb-2" />
                <p className="text-sm font-semibold text-white">Belum Ada Hasil Evaluasi</p>
                <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
                  Silakan pastikan data pasar intraday telah disinkronkan di tab &quot;Data Pasar &amp; Sync&quot;, lalu klik tombol &quot;Jalankan Evaluasi&quot; di atas.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto border border-slate-800 rounded-xl">
                <table className="w-full text-left text-xs">
                  <thead className="text-[11px] text-slate-400 uppercase bg-slate-900/90 border-b border-slate-800">
                    <tr>
                      <th className="py-3 px-4 font-semibold">Peserta</th>
                      <th className="py-3 px-4 font-semibold">Emiten</th>
                      <th className="py-3 px-4 font-semibold text-right">Entry</th>
                      <th className="py-3 px-4 font-semibold text-right">Highest Peak</th>
                      <th className="py-3 px-4 font-semibold text-right">Exit Price</th>
                      <th className="py-3 px-4 font-semibold text-center">Realized Return</th>
                      <th className="py-3 px-4 font-semibold text-center">Alasan Exit</th>
                      <th className="py-3 px-4 font-semibold text-center">Status</th>
                      <th className="py-3 px-4 font-semibold text-right">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 font-sans">
                    {evaluations.map((ev) => {
                      const realized = Number(ev.realizedReturn);
                      const maxFloat = Number(ev.maxFloatingReturn);
                      const isUp = realized >= 0;

                      return (
                        <tr key={ev.id} className="hover:bg-slate-800/30 transition-colors">
                          {/* Participant */}
                          <td className="py-3.5 px-4 font-medium text-white">
                            <div className="flex items-center gap-2">
                              <span>{ev.pick.participant.name}</span>
                              {ev.override && (
                                <span
                                  title={`Di-override oleh admin: ${ev.override.reason}`}
                                  className="text-[9px] px-1.5 py-0.2 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30 font-semibold"
                                >
                                  OVERRIDDEN
                                </span>
                              )}
                            </div>
                          </td>

                          {/* Symbol */}
                          <td className="py-3.5 px-4">
                            <span className="font-mono font-bold text-white bg-slate-800/80 px-2 py-0.5 rounded border border-slate-700">
                              {ev.pick.stock.symbol}
                            </span>
                            <span className="text-[11px] text-slate-400 block mt-0.5 truncate max-w-[140px]">
                              {ev.pick.stock.name}
                            </span>
                          </td>

                          {/* Entry */}
                          <td className="py-3.5 px-4 text-right font-mono text-slate-200">
                            Rp {Number(ev.entryPrice).toLocaleString('id-ID')}
                            <span className="text-[10px] text-slate-500 block">
                              {ev.pick.entrySource}
                            </span>
                          </td>

                          {/* Highest Peak */}
                          <td className="py-3.5 px-4 text-right font-mono">
                            <span className="text-emerald-400 font-semibold">
                              Rp {Number(ev.highestPrice).toLocaleString('id-ID')}
                            </span>
                            <span className="text-[10px] text-emerald-500/80 block">
                              +{maxFloat.toFixed(2)}%
                            </span>
                          </td>

                          {/* Exit Price */}
                          <td className="py-3.5 px-4 text-right font-mono">
                            <span className="text-white font-bold">
                              Rp {Number(ev.exitPrice).toLocaleString('id-ID')}
                            </span>
                            <span className="text-[10px] text-slate-500 block">
                              {new Date(ev.exitTimestamp).toLocaleTimeString('id-ID', {
                                hour: '2-digit',
                                minute: '2-digit',
                              })}{' '}
                              WIB
                            </span>
                          </td>

                          {/* Realized Return */}
                          <td className="py-3.5 px-4 text-center font-mono">
                            <span
                              className={`inline-flex items-center gap-0.5 px-2 py-0.5 rounded text-xs font-bold ${
                                isUp
                                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                  : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                              }`}
                            >
                              {isUp ? (
                                <ArrowUpRight className="w-3 h-3" />
                              ) : (
                                <ArrowDownRight className="w-3 h-3" />
                              )}
                              <span>{isUp ? `+${realized.toFixed(2)}%` : `${realized.toFixed(2)}%`}</span>
                            </span>
                          </td>

                          {/* Exit Reason */}
                          <td className="py-3.5 px-4 text-center">
                            <span
                              className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                                ev.exitReason === 'INITIAL_CL'
                                  ? 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                                  : ev.exitReason === 'TRAILING_STOP'
                                  ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                                  : ev.exitReason === 'MARKET_CLOSE'
                                  ? 'bg-blue-500/10 text-blue-400 border-blue-500/20'
                                  : 'bg-purple-500/10 text-purple-400 border-purple-500/20'
                              }`}
                            >
                              {ev.exitReason}
                            </span>
                          </td>

                          {/* Status */}
                          <td className="py-3.5 px-4 text-center">
                            <span
                              className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                                ev.status === 'COMPLETED'
                                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                                  : ev.status === 'PENDING_DATA'
                                  ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                                  : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                              }`}
                            >
                              <span
                                className={`w-1.5 h-1.5 rounded-full ${
                                  ev.status === 'COMPLETED'
                                    ? 'bg-emerald-400'
                                    : ev.status === 'PENDING_DATA'
                                    ? 'bg-amber-400 animate-pulse'
                                    : 'bg-rose-400'
                                }`}
                              />
                              {ev.status}
                            </span>
                          </td>

                          {/* Actions */}
                          <td className="py-3.5 px-4 text-right">
                            <div className="inline-flex items-center gap-1.5">
                              <button
                                onClick={() => handleViewEvidence(ev.id)}
                                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] font-semibold transition-all border border-slate-700"
                                title="Lihat Bukti Audit & Trigger Candle"
                              >
                                <Eye className="w-3.5 h-3.5 text-blue-400" />
                                <span>Evidence</span>
                              </button>

                              {user?.role === 'ADMIN' && (
                                <>
                                  <button
                                    onClick={() => handleOpenOverride(ev)}
                                    className="p-1.5 rounded-lg bg-slate-800 hover:bg-purple-900/30 text-slate-300 hover:text-purple-300 transition-all border border-slate-700"
                                    title="Penyesuaian Manual (Override)"
                                  >
                                    <Edit3 className="w-3.5 h-3.5" />
                                  </button>

                                  <button
                                    onClick={() => handleEvaluateSinglePick(ev.pickId)}
                                    disabled={evaluatingPickId === ev.pickId}
                                    className="p-1.5 rounded-lg bg-slate-800 hover:bg-blue-900/30 text-slate-300 hover:text-blue-300 transition-all border border-slate-700 disabled:opacity-50"
                                    title="Evaluasi Ulang Pick Ini"
                                  >
                                    <RefreshCw
                                      className={`w-3.5 h-3.5 ${
                                        evaluatingPickId === ev.pickId ? 'animate-spin' : ''
                                      }`}
                                    />
                                  </button>
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 6: RESULTS & STANDINGS (MILESTONE M6) */}
      {activeTab === 'RESULTS' && (
        <div className="space-y-6">
          {/* Header Controls Toolbar */}
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 glass-panel p-5 rounded-2xl border border-slate-800">
            <div className="flex flex-wrap items-center gap-3">
              {/* View Mode Toggle */}
              <div className="flex items-center bg-slate-900/90 p-1 rounded-xl border border-slate-800">
                <button
                  type="button"
                  onClick={() => setResultsView('DAILY')}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    resultsView === 'DAILY'
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
                  }`}
                >
                  <Calendar className="w-3.5 h-3.5" />
                  <span>Hasil Harian</span>
                </button>
                <button
                  type="button"
                  onClick={() => setResultsView('OVERALL')}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    resultsView === 'OVERALL'
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
                  }`}
                >
                  <Trophy className="w-3.5 h-3.5" />
                  <span>Klasemen Keseluruhan</span>
                </button>
              </div>

              {/* Date Filter (for Daily view) */}
              {resultsView === 'DAILY' && (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-400">Tanggal:</span>
                  <input
                    type="date"
                    value={resultsDateFilter}
                    onChange={(e) => {
                      setResultsDateFilter(e.target.value);
                      fetchDailyResults(e.target.value);
                    }}
                    min={tournament?.startDate.substring(0, 10)}
                    max={tournament?.endDate.substring(0, 10)}
                    className="px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-200 text-xs focus:outline-none focus:border-blue-500 font-mono"
                  />
                  {resultsDateFilter && (
                    <button
                      type="button"
                      onClick={() => {
                        const defaultDate = tournament?.startDate.substring(0, 10) || '';
                        setResultsDateFilter(defaultDate);
                        fetchDailyResults(defaultDate);
                      }}
                      className="text-xs text-slate-400 hover:text-white"
                    >
                      Reset
                    </button>
                  )}
                </div>
              )}
            </div>

            <div className="flex items-center gap-3">
              {/* Tie-breaker rules guide toggle */}
              <button
                type="button"
                onClick={() => setShowTieBreakerGuide(!showTieBreakerGuide)}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-900/80 hover:bg-slate-800 text-slate-300 text-xs font-medium border border-slate-800 transition-all"
              >
                <HelpCircle className="w-3.5 h-3.5 text-blue-400" />
                <span>Aturan Tie-Breaker</span>
                {showTieBreakerGuide ? (
                  <ChevronUp className="w-3.5 h-3.5 text-slate-500" />
                ) : (
                  <ChevronDown className="w-3.5 h-3.5 text-slate-500" />
                )}
              </button>

              {/* Recalculate Points Button (Admin only) */}
              {user?.role === 'ADMIN' && (
                <button
                  type="button"
                  onClick={handleRecalculatePoints}
                  disabled={recalculatingPoints}
                  className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-amber-600/20 hover:bg-amber-600/30 border border-amber-500/30 text-amber-300 text-xs font-semibold transition-all disabled:opacity-50"
                  title="Kalkulasi ulang seluruh poin peserta turnamen ini berdasarkan formula poin aktif"
                >
                  <RefreshCw
                    className={`w-3.5 h-3.5 ${recalculatingPoints ? 'animate-spin' : ''}`}
                  />
                  <span>
                    {recalculatingPoints ? 'Menghitung Ulang...' : 'Hitung Ulang Poin'}
                  </span>
                </button>
              )}
            </div>
          </div>

          {/* Action alerts */}
          {resultsActionSuccess && (
            <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>{resultsActionSuccess}</span>
              </div>
              <button
                onClick={() => setResultsActionSuccess('')}
                className="text-emerald-400 hover:text-emerald-300"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {resultsActionError && (
            <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{resultsActionError}</span>
              </div>
              <button
                onClick={() => setResultsActionError('')}
                className="text-rose-400 hover:text-rose-300"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Tie-Breaker Rules Explanation Panel */}
          {showTieBreakerGuide && (
            <div className="glass-panel p-6 rounded-2xl border border-blue-500/20 bg-blue-950/10 relative overflow-hidden">
              <div className="flex items-center gap-2 mb-3">
                <HelpCircle className="w-5 h-5 text-blue-400" />
                <h4 className="text-sm font-bold text-white">
                  Panduan Aturan Penentu Peringkat (Tie-Breaker Guide)
                </h4>
              </div>
              <p className="text-xs text-slate-400 mb-4 max-w-3xl">
                Sistem TradeArena menggunakan aturan penentu peringkat hierarkis yang deterministik
                tanpa ambiguitas jika terdapat nilai poin yang sama (PRD Section 21 &amp; 23).
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                {/* Daily Tie Breaker */}
                <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 space-y-2">
                  <div className="font-semibold text-blue-300 flex items-center gap-1.5">
                    <Calendar className="w-4 h-4" />
                    <span>4-Tier Tie-Breaker Harian (Daily Results)</span>
                  </div>
                  <ol className="list-decimal list-inside space-y-1 text-slate-300 text-[11px] leading-relaxed">
                    <li>
                      <strong className="text-white">Poin / Realized Return:</strong> Nilai return
                      aktual atau poin tertinggi berada di peringkat teratas.
                    </li>
                    <li>
                      <strong className="text-white">Max Floating Return:</strong> Jika poin sama,
                      peserta dengan puncak gain teoretis intraday tertinggi diutamakan.
                    </li>
                    <li>
                      <strong className="text-white">Chronological Survival Time:</strong> Jika
                      masih sama, peserta yang bertahan lebih lama (exit timestamp paling lambat)
                      menang.
                    </li>
                    <li>
                      <strong className="text-white">Urutan Alfabetis:</strong> Penentu akhir adalah
                      urutan alfabet nama peserta (A ke Z).
                    </li>
                  </ol>
                </div>

                {/* Overall Tie Breaker */}
                <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 space-y-2">
                  <div className="font-semibold text-amber-300 flex items-center gap-1.5">
                    <Trophy className="w-4 h-4" />
                    <span>5-Tier Tie-Breaker Klasemen (Overall Standings)</span>
                  </div>
                  <ol className="list-decimal list-inside space-y-1 text-slate-300 text-[11px] leading-relaxed">
                    <li>
                      <strong className="text-white">Total Poin Terakumulasi:</strong> Jumlah poin
                      dari seluruh trade turnamen yang telah dievaluasi.
                    </li>
                    <li>
                      <strong className="text-white">Win Count (Jumlah Menang):</strong> Total trade
                      yang menghasilkan return positif (&gt; 0%).
                    </li>
                    <li>
                      <strong className="text-white">Rata-rata Return Persentase:</strong> Rata-rata
                      seluruh realized return peserta.
                    </li>
                    <li>
                      <strong className="text-white">Best Single Pick:</strong> Nilai realized
                      return tertinggi dari satu trade tunggal.
                    </li>
                    <li>
                      <strong className="text-white">Urutan Alfabetis:</strong> Penentu akhir adalah
                      urutan alfabet nama peserta (A ke Z).
                    </li>
                  </ol>
                </div>
              </div>
            </div>
          )}

          {/* VIEW 1: DAILY RESULTS */}
          {resultsView === 'DAILY' && (
            <div className="space-y-6">
              {loadingDailyResults ? (
                <div className="flex flex-col items-center justify-center py-20">
                  <Loader2 className="w-8 h-8 text-blue-500 animate-spin mb-3" />
                  <p className="text-xs text-slate-400">Memuat peringkat hasil harian...</p>
                </div>
              ) : !dailyResults || dailyResults.results.length === 0 ? (
                <div className="glass-panel p-12 text-center rounded-2xl border border-slate-800">
                  <BarChart3 className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                  <h4 className="text-base font-bold text-slate-200">
                    Belum Ada Hasil Evaluasi untuk Tanggal Ini
                  </h4>
                  <p className="text-xs text-slate-400 mt-1 mb-5 max-w-md mx-auto">
                    Stock pick harian belum dievaluasi atau data candle bursa belum ditarik.
                    Pastikan sinkronisasi data pasar dan evaluasi trade telah dijalankan.
                  </p>
                  <div className="flex justify-center gap-3">
                    <button
                      type="button"
                      onClick={() => setActiveTab('SYNC')}
                      className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition-all"
                    >
                      Buka Tab Data Pasar &amp; Sync
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveTab('EVALUATION')}
                      className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold transition-all"
                    >
                      Jalankan Evaluasi Trade
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  {/* Daily KPI Stat Cards */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {/* Top Gainer */}
                    <div className="glass-panel p-5 rounded-2xl border border-amber-500/20 bg-gradient-to-br from-amber-500/5 to-transparent relative overflow-hidden">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[10px] uppercase tracking-wider font-semibold text-amber-400">
                          Top Gainer Harian
                        </span>
                        <div className="p-1.5 rounded-lg bg-amber-500/20 text-amber-400">
                          <Crown className="w-4 h-4" />
                        </div>
                      </div>
                      {dailyResults.metrics.topGainer ? (
                        <>
                          <h4 className="text-base font-bold text-white truncate">
                            {dailyResults.metrics.topGainer.participantName}
                          </h4>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-xs font-mono font-bold px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300">
                              {dailyResults.metrics.topGainer.stockSymbol}
                            </span>
                            <span className="text-xs font-mono font-extrabold text-emerald-400">
                              +{dailyResults.metrics.topGainer.returnPct.toFixed(2)}%
                            </span>
                          </div>
                          <span className="text-[10px] text-slate-400 mt-2 block font-mono">
                            Poin:{' '}
                            <strong className="text-white">
                              +{dailyResults.metrics.topGainer.points.toFixed(2)} pts
                            </strong>
                          </span>
                        </>
                      ) : (
                        <p className="text-xs text-slate-500">Tidak ada pemenang</p>
                      )}
                    </div>

                    {/* Average Return */}
                    <div className="glass-panel p-5 rounded-2xl border border-slate-800">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[10px] uppercase tracking-wider font-semibold text-slate-400">
                          Rata-rata Realized Return
                        </span>
                        <div className="p-1.5 rounded-lg bg-blue-500/10 text-blue-400">
                          <TrendingUp className="w-4 h-4" />
                        </div>
                      </div>
                      <h4
                        className={`text-2xl font-black font-mono tracking-tight ${
                          dailyResults.metrics.averageReturn >= 0
                            ? 'text-emerald-400'
                            : 'text-rose-400'
                        }`}
                      >
                        {dailyResults.metrics.averageReturn >= 0
                          ? `+${dailyResults.metrics.averageReturn.toFixed(2)}%`
                          : `${dailyResults.metrics.averageReturn.toFixed(2)}%`}
                      </h4>
                      <p className="text-[11px] text-slate-500 mt-1">
                        Dari {dailyResults.metrics.totalParticipants} trade terevaluasi
                      </p>
                    </div>

                    {/* Win / Loss Ratio */}
                    <div className="glass-panel p-5 rounded-2xl border border-slate-800">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[10px] uppercase tracking-wider font-semibold text-slate-400">
                          Rasio Menang / Kalah
                        </span>
                        <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400">
                          <Award className="w-4 h-4" />
                        </div>
                      </div>
                      <div className="flex items-baseline gap-2">
                        <span className="text-xl font-black text-emerald-400 font-mono">
                          {dailyResults.metrics.gainersCount}W
                        </span>
                        <span className="text-slate-500">/</span>
                        <span className="text-xl font-black text-rose-400 font-mono">
                          {dailyResults.metrics.losersCount}L
                        </span>
                      </div>
                      <div className="w-full bg-slate-800 h-1.5 rounded-full mt-2 overflow-hidden flex">
                        {dailyResults.metrics.totalParticipants > 0 && (
                          <div
                            className="bg-emerald-500 h-full"
                            style={{
                              width: `${
                                (dailyResults.metrics.gainersCount /
                                  dailyResults.metrics.totalParticipants) *
                                100
                              }%`,
                            }}
                          />
                        )}
                      </div>
                    </div>

                    {/* Total Picks / Peserta */}
                    <div className="glass-panel p-5 rounded-2xl border border-slate-800">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[10px] uppercase tracking-wider font-semibold text-slate-400">
                          Peserta &amp; Evaluasi
                        </span>
                        <div className="p-1.5 rounded-lg bg-purple-500/10 text-purple-400">
                          <Users className="w-4 h-4" />
                        </div>
                      </div>
                      <h4 className="text-2xl font-black text-white font-mono tracking-tight">
                        {dailyResults.results.length}
                      </h4>
                      <p className="text-[11px] text-slate-500 mt-1">
                        Picks terevaluasi pada tanggal ini
                      </p>
                    </div>
                  </div>

                  {/* Daily Rankings Table */}
                  <div className="glass-panel rounded-2xl border border-slate-800 overflow-hidden">
                    <div className="p-4 border-b border-slate-800 flex items-center justify-between">
                      <div>
                        <h4 className="text-sm font-bold text-white">
                          Peringkat Harian (Daily Standings)
                        </h4>
                        <p className="text-xs text-slate-400">
                          Urutan ditentukan oleh 4-tier tie-breaker otomatis TradeArena
                        </p>
                      </div>
                      <span className="text-xs font-mono text-slate-400 bg-slate-900 px-3 py-1 rounded-lg border border-slate-800">
                        Tanggal: {dailyResults.tradingDate}
                      </span>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead className="text-[11px] text-slate-400 uppercase bg-slate-900/60 border-b border-slate-800">
                          <tr>
                            <th className="py-3 px-4 font-semibold text-center w-16">Peringkat</th>
                            <th className="py-3 px-4 font-semibold">Peserta</th>
                            <th className="py-3 px-4 font-semibold">Pilihan Emiten</th>
                            <th className="py-3 px-4 font-semibold text-right">Harga Masuk</th>
                            <th className="py-3 px-4 font-semibold text-right">Peak (Tertinggi)</th>
                            <th className="py-3 px-4 font-semibold text-right">Harga Exit</th>
                            <th className="py-3 px-4 font-semibold text-center">Realized Return</th>
                            <th className="py-3 px-4 font-semibold text-center">Poin Turnamen</th>
                            <th className="py-3 px-4 font-semibold text-center">Alasan Exit</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800">
                          {dailyResults.results.map((r) => {
                            const ret = Number(r.realizedReturn);
                            const isPositive = ret >= 0;
                            const pts = Number(r.points);

                            return (
                              <tr
                                key={r.participantId + r.stockSymbol}
                                className={`hover:bg-slate-800/30 transition-colors ${
                                  r.rank === 1 ? 'bg-amber-500/5' : ''
                                }`}
                              >
                                {/* Rank badge */}
                                <td className="py-3.5 px-4 text-center">
                                  {r.rank === 1 ? (
                                    <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/40 font-black text-xs">
                                      <Crown className="w-3.5 h-3.5" />
                                    </span>
                                  ) : r.rank === 2 ? (
                                    <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-slate-400/20 text-slate-200 border border-slate-400/40 font-bold text-xs">
                                      #2
                                    </span>
                                  ) : r.rank === 3 ? (
                                    <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-orange-500/20 text-orange-300 border border-orange-500/40 font-bold text-xs">
                                      #3
                                    </span>
                                  ) : (
                                    <span className="text-slate-400 font-mono font-semibold text-xs">
                                      #{r.rank}
                                    </span>
                                  )}
                                </td>

                                {/* Participant */}
                                <td className="py-3.5 px-4 font-medium text-white">
                                  <div className="flex items-center gap-2.5">
                                    <div className="w-7 h-7 rounded-lg bg-blue-600/20 text-blue-400 font-bold text-[11px] flex items-center justify-center uppercase shrink-0">
                                      {r.participantName.substring(0, 2)}
                                    </div>
                                    <span className="truncate">{r.participantName}</span>
                                  </div>
                                </td>

                                {/* Stock */}
                                <td className="py-3.5 px-4">
                                  <div className="flex items-center gap-1.5">
                                    <span className="font-mono font-bold text-slate-100 bg-slate-800 px-2 py-0.5 rounded text-[11px] border border-slate-700">
                                      {r.stockSymbol}
                                    </span>
                                    <span className="text-slate-400 text-[11px] truncate max-w-[120px]">
                                      {r.stockName}
                                    </span>
                                  </div>
                                </td>

                                {/* Entry Price */}
                                <td className="py-3.5 px-4 text-right font-mono text-slate-200">
                                  Rp {Number(r.entryPrice).toLocaleString('id-ID')}
                                </td>

                                {/* Peak Price */}
                                <td className="py-3.5 px-4 text-right font-mono">
                                  <span className="text-emerald-400">
                                    Rp {Number(r.highestPrice).toLocaleString('id-ID')}
                                  </span>
                                  <span className="text-[10px] text-emerald-500/80 block">
                                    +{Number(r.maxFloatingReturn).toFixed(2)}%
                                  </span>
                                </td>

                                {/* Exit Price */}
                                <td className="py-3.5 px-4 text-right font-mono">
                                  <span className="text-white font-semibold">
                                    Rp {Number(r.exitPrice).toLocaleString('id-ID')}
                                  </span>
                                  <span className="text-[10px] text-slate-500 block">
                                    {new Date(r.exitTimestamp).toLocaleTimeString('id-ID', {
                                      hour: '2-digit',
                                      minute: '2-digit',
                                    })}{' '}
                                    WIB
                                  </span>
                                </td>

                                {/* Realized Return */}
                                <td className="py-3.5 px-4 text-center font-mono">
                                  <span
                                    className={`inline-flex items-center gap-0.5 px-2 py-0.5 rounded text-xs font-bold ${
                                      isPositive
                                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                        : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                                    }`}
                                  >
                                    {isPositive ? (
                                      <ArrowUpRight className="w-3 h-3" />
                                    ) : (
                                      <ArrowDownRight className="w-3 h-3" />
                                    )}
                                    <span>
                                      {isPositive ? `+${ret.toFixed(2)}%` : `${ret.toFixed(2)}%`}
                                    </span>
                                  </span>
                                </td>

                                {/* Tournament Points */}
                                <td className="py-3.5 px-4 text-center font-mono">
                                  <span
                                    className={`inline-block px-2.5 py-1 rounded-lg text-xs font-extrabold ${
                                      pts > 0
                                        ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                                        : pts < 0
                                        ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                                        : 'bg-slate-800 text-slate-300 border border-slate-700'
                                    }`}
                                  >
                                    {pts > 0 ? `+${pts.toFixed(2)} pts` : `${pts.toFixed(2)} pts`}
                                  </span>
                                </td>

                                {/* Exit Reason */}
                                <td className="py-3.5 px-4 text-center">
                                  <span
                                    className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                                      r.exitReason === 'INITIAL_CL'
                                        ? 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                                        : r.exitReason === 'TRAILING_STOP'
                                        ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                                        : r.exitReason === 'MARKET_CLOSE'
                                        ? 'bg-blue-500/10 text-blue-400 border-blue-500/20'
                                        : 'bg-purple-500/10 text-purple-400 border-purple-500/20'
                                    }`}
                                  >
                                    {r.exitReason}
                                  </span>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </>
              )}
            </div>
          )}

          {/* VIEW 2: OVERALL STANDINGS */}
          {resultsView === 'OVERALL' && (
            <div className="space-y-6">
              {loadingOverallResults ? (
                <div className="flex flex-col items-center justify-center py-20">
                  <Loader2 className="w-8 h-8 text-blue-500 animate-spin mb-3" />
                  <p className="text-xs text-slate-400">Memuat klasemen keseluruhan...</p>
                </div>
              ) : !overallResults || overallResults.standings.length === 0 ? (
                <div className="glass-panel p-12 text-center rounded-2xl border border-slate-800">
                  <Trophy className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                  <h4 className="text-base font-bold text-slate-200">
                    Klasemen Belum Dapat Dihitung
                  </h4>
                  <p className="text-xs text-slate-400 mt-1 mb-5 max-w-md mx-auto">
                    Belum ada trade yang selesai dievaluasi dalam turnamen ini. Klasemen keseluruhan
                    akan otomatis tersusun setelah trade pertama diselesaikan.
                  </p>
                </div>
              ) : (
                <>
                  {/* Podium Highlights (Top 3) */}
                  {overallResults.standings.length >= 1 && (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4">
                      {/* 2nd Place (Silver) */}
                      {overallResults.standings.length > 1 ? (
                        <div className="glass-panel p-5 rounded-2xl border border-slate-400/30 bg-gradient-to-t from-slate-400/5 to-transparent text-center relative order-2 md:order-1 self-end">
                          <div className="w-12 h-12 rounded-2xl bg-slate-400/20 border border-slate-400/40 text-slate-200 mx-auto flex items-center justify-center font-black text-lg mb-2">
                            <Medal className="w-6 h-6 text-slate-300" />
                          </div>
                          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                            Peringkat #2
                          </span>
                          <h4 className="text-base font-extrabold text-white mt-0.5 truncate">
                            {overallResults.standings[1].participantName}
                          </h4>
                          <div className="mt-3 py-2 px-3 rounded-xl bg-slate-900/80 border border-slate-800">
                            <span className="text-xl font-black font-mono text-slate-200">
                              {overallResults.standings[1].totalPoints.toFixed(2)} pts
                            </span>
                            <div className="flex items-center justify-center gap-3 text-[11px] text-slate-400 mt-1">
                              <span>
                                Win Rate:{' '}
                                <strong className="text-emerald-400">
                                  {overallResults.standings[1].winRate}%
                                </strong>
                              </span>
                              <span>•</span>
                              <span>
                                Trades:{' '}
                                <strong className="text-white">
                                  {overallResults.standings[1].picksCount}
                                </strong>
                              </span>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="hidden md:block order-1" />
                      )}

                      {/* 1st Place (Gold / Champion) */}
                      <div className="glass-panel p-6 rounded-3xl border-2 border-amber-500/50 bg-gradient-to-t from-amber-500/10 via-amber-500/5 to-transparent text-center relative order-1 md:order-2 shadow-xl shadow-amber-500/10">
                        <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gradient-to-r from-amber-500 to-yellow-400 text-slate-950 font-black text-[10px] uppercase px-3 py-0.5 rounded-full shadow-md">
                          Juara Turnamen
                        </div>
                        <div className="w-16 h-16 rounded-2xl bg-amber-500/20 border border-amber-500/50 text-amber-400 mx-auto flex items-center justify-center font-black text-2xl mb-2 mt-1 shadow-lg shadow-amber-500/20">
                          <Crown className="w-8 h-8 text-amber-300" />
                        </div>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400 block">
                          Peringkat #1
                        </span>
                        <h4 className="text-lg font-black text-white mt-0.5 truncate">
                          {overallResults.standings[0].participantName}
                        </h4>
                        <div className="mt-3 py-2.5 px-4 rounded-xl bg-slate-900/90 border border-amber-500/30">
                          <span className="text-2xl font-black font-mono text-amber-400">
                            {overallResults.standings[0].totalPoints.toFixed(2)} pts
                          </span>
                          <div className="flex items-center justify-center gap-3 text-xs text-slate-400 mt-1">
                            <span>
                              Win Rate:{' '}
                              <strong className="text-emerald-400">
                                {overallResults.standings[0].winRate}%
                              </strong>
                            </span>
                            <span>•</span>
                            <span>
                              Rata-rata:{' '}
                              <strong className="text-white">
                                {overallResults.standings[0].averageReturn >= 0
                                  ? `+${overallResults.standings[0].averageReturn.toFixed(2)}%`
                                  : `${overallResults.standings[0].averageReturn.toFixed(2)}%`}
                              </strong>
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* 3rd Place (Bronze) */}
                      {overallResults.standings.length > 2 ? (
                        <div className="glass-panel p-5 rounded-2xl border border-orange-500/30 bg-gradient-to-t from-orange-500/5 to-transparent text-center relative order-3 self-end">
                          <div className="w-12 h-12 rounded-2xl bg-orange-500/20 border border-orange-500/40 text-orange-300 mx-auto flex items-center justify-center font-black text-lg mb-2">
                            <Medal className="w-6 h-6 text-orange-300" />
                          </div>
                          <span className="text-[10px] font-bold uppercase tracking-wider text-orange-400 block">
                            Peringkat #3
                          </span>
                          <h4 className="text-base font-extrabold text-white mt-0.5 truncate">
                            {overallResults.standings[2].participantName}
                          </h4>
                          <div className="mt-3 py-2 px-3 rounded-xl bg-slate-900/80 border border-slate-800">
                            <span className="text-xl font-black font-mono text-orange-300">
                              {overallResults.standings[2].totalPoints.toFixed(2)} pts
                            </span>
                            <div className="flex items-center justify-center gap-3 text-[11px] text-slate-400 mt-1">
                              <span>
                                Win Rate:{' '}
                                <strong className="text-emerald-400">
                                  {overallResults.standings[2].winRate}%
                                </strong>
                              </span>
                              <span>•</span>
                              <span>
                                Trades:{' '}
                                <strong className="text-white">
                                  {overallResults.standings[2].picksCount}
                                </strong>
                              </span>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="hidden md:block order-3" />
                      )}
                    </div>
                  )}

                  {/* Complete Standings Table */}
                  <div className="glass-panel rounded-2xl border border-slate-800 overflow-hidden">
                    <div className="p-4 border-b border-slate-800 flex items-center justify-between">
                      <div>
                        <h4 className="text-sm font-bold text-white">
                          Tabel Klasemen Turnamen Lengkap
                        </h4>
                        <p className="text-xs text-slate-400">
                          Diperbarui otomatis berdasarkan evaluasi trade dan tie-breaker hierarkis
                        </p>
                      </div>
                      <span className="text-xs font-mono text-slate-400 bg-slate-900 px-3 py-1 rounded-lg border border-slate-800">
                        Total Peserta: {overallResults.totalParticipants} • Trades:{' '}
                        {overallResults.totalEvaluatedPicks}
                      </span>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead className="text-[11px] text-slate-400 uppercase bg-slate-900/60 border-b border-slate-800">
                          <tr>
                            <th className="py-3 px-4 font-semibold text-center w-16">Peringkat</th>
                            <th className="py-3 px-4 font-semibold">Peserta Turnamen</th>
                            <th className="py-3 px-4 font-semibold text-center">Total Poin</th>
                            <th className="py-3 px-4 font-semibold text-center">Win Rate</th>
                            <th className="py-3 px-4 font-semibold text-center">
                              Rekor (Menang / Kalah / Seri)
                            </th>
                            <th className="py-3 px-4 font-semibold text-right">
                              Rata-rata Return
                            </th>
                            <th className="py-3 px-4 font-semibold text-center">Best Pick</th>
                            <th className="py-3 px-4 font-semibold text-center">Worst Pick</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800">
                          {overallResults.standings.map((s) => (
                            <tr
                              key={s.participantId}
                              className={`hover:bg-slate-800/30 transition-colors ${
                                s.rank === 1 ? 'bg-amber-500/5' : ''
                              }`}
                            >
                              {/* Rank */}
                              <td className="py-3.5 px-4 text-center">
                                {s.rank === 1 ? (
                                  <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/40 font-black text-xs">
                                    <Crown className="w-3.5 h-3.5" />
                                  </span>
                                ) : s.rank === 2 ? (
                                  <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-slate-400/20 text-slate-200 border border-slate-400/40 font-bold text-xs">
                                    #2
                                  </span>
                                ) : s.rank === 3 ? (
                                  <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-orange-500/20 text-orange-300 border border-orange-500/40 font-bold text-xs">
                                    #3
                                  </span>
                                ) : (
                                  <span className="text-slate-400 font-mono font-semibold text-xs">
                                    #{s.rank}
                                  </span>
                                )}
                              </td>

                              {/* Participant */}
                              <td className="py-3.5 px-4 font-medium text-white">
                                <div className="flex items-center gap-2.5">
                                  <div className="w-7 h-7 rounded-lg bg-blue-600/20 text-blue-400 font-bold text-[11px] flex items-center justify-center uppercase shrink-0">
                                    {s.participantName.substring(0, 2)}
                                  </div>
                                  <span className="font-semibold">{s.participantName}</span>
                                </div>
                              </td>

                              {/* Total Points */}
                              <td className="py-3.5 px-4 text-center font-mono">
                                <span className="text-sm font-black text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2.5 py-1 rounded-lg">
                                  {s.totalPoints.toFixed(2)} pts
                                </span>
                              </td>

                              {/* Win Rate */}
                              <td className="py-3.5 px-4 text-center font-mono">
                                <div className="inline-flex flex-col items-center">
                                  <span className="font-bold text-emerald-400">
                                    {s.winRate}%
                                  </span>
                                  <div className="w-16 bg-slate-800 h-1 rounded-full mt-1 overflow-hidden">
                                    <div
                                      className="bg-emerald-500 h-full"
                                      style={{ width: `${s.winRate}%` }}
                                    />
                                  </div>
                                </div>
                              </td>

                              {/* Record */}
                              <td className="py-3.5 px-4 text-center font-mono text-[11px]">
                                <span className="text-emerald-400 font-bold">{s.winCount}W</span>{' '}
                                <span className="text-slate-500">/</span>{' '}
                                <span className="text-rose-400 font-bold">{s.lossCount}L</span>{' '}
                                <span className="text-slate-500">/</span>{' '}
                                <span className="text-slate-400 font-medium">
                                  {s.breakevenCount}B
                                </span>
                              </td>

                              {/* Average Return */}
                              <td className="py-3.5 px-4 text-right font-mono">
                                <span
                                  className={`font-semibold ${
                                    s.averageReturn >= 0 ? 'text-emerald-400' : 'text-rose-400'
                                  }`}
                                >
                                  {s.averageReturn >= 0
                                    ? `+${s.averageReturn.toFixed(2)}%`
                                    : `${s.averageReturn.toFixed(2)}%`}
                                </span>
                              </td>

                              {/* Best Pick */}
                              <td className="py-3.5 px-4 text-center font-mono text-[11px]">
                                {s.bestPick ? (
                                  <span className="inline-flex items-center gap-1 text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                                    <span>{s.bestPick.symbol}</span>
                                    <span className="font-bold">
                                      (+{s.bestPick.returnPct.toFixed(2)}%)
                                    </span>
                                  </span>
                                ) : (
                                  <span className="text-slate-500">-</span>
                                )}
                              </td>

                              {/* Worst Pick */}
                              <td className="py-3.5 px-4 text-center font-mono text-[11px]">
                                {s.worstPick ? (
                                  <span className="inline-flex items-center gap-1 text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded border border-rose-500/20">
                                    <span>{s.worstPick.symbol}</span>
                                    <span className="font-bold">
                                      ({s.worstPick.returnPct.toFixed(2)}%)
                                    </span>
                                  </span>
                                ) : (
                                  <span className="text-slate-500">-</span>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      )}

      {/* TAB 7: AUTOMATION & EXCEPTION HANDLING (Milestone M8) */}
      {activeTab === 'AUTOMATION' && (
        <div className="space-y-8">
          {/* Header Action Toolbar */}
          <div className="p-6 rounded-2xl glass-panel border border-slate-800 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Zap className="w-4 h-4 text-amber-400" />
                <span className="text-xs font-bold text-amber-400 uppercase tracking-wider">
                  Post-Market Automation & Exceptions • Milestone M8
                </span>
              </div>
              <h2 className="text-lg font-bold text-white">
                Orkestrasi Otomasi Pasca-Market & Penanganan Exception
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Jalankan seluruh rangkaian pasca-market (Sync Data $\rightarrow$ Validasi $\rightarrow$ Evaluasi CL/TS $\rightarrow$ Kalkulasi Poin) dalam 1 klik terorkestrasi.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2 bg-slate-900 border border-slate-700/80 rounded-xl px-3 py-1.5">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                <input
                  type="date"
                  value={automationDate}
                  onChange={(e) => {
                    setAutomationDate(e.target.value);
                    fetchExceptions(e.target.value);
                  }}
                  className="bg-transparent text-xs text-white focus:outline-none font-mono"
                />
              </div>

              <button
                onClick={() => {
                  fetchExceptions(automationDate);
                  fetchAuditTrail();
                }}
                disabled={loadingExceptions || loadingAuditTrail}
                className="p-2.5 rounded-xl bg-slate-900 border border-slate-700/80 hover:bg-slate-800 text-slate-200 transition-colors"
                title="Segarkan Data"
              >
                <RefreshCw
                  className={`w-4 h-4 ${
                    loadingExceptions || loadingAuditTrail ? 'animate-spin text-blue-400' : ''
                  }`}
                />
              </button>

              <button
                onClick={handleRunPipeline}
                disabled={runningPipeline}
                className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 text-xs font-bold flex items-center gap-2 shadow-lg shadow-amber-500/20 transition-all disabled:opacity-50"
              >
                {runningPipeline ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-slate-950" />
                    <span>Mengeksekusi Pipeline...</span>
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4 fill-current text-slate-950" />
                    <span>Jalankan Pipeline Harian</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Feedback Messages */}
          {pipelineError && (
            <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-400 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{pipelineError}</span>
            </div>
          )}

          {pipelineSuccess && (
            <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-400 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{pipelineSuccess}</span>
            </div>
          )}

          {/* Stepper Report when Pipeline Executed */}
          {pipelineReport && (
            <div className="p-6 rounded-2xl glass-panel border border-amber-500/30 space-y-6 bg-slate-900/40">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-4 border-b border-slate-800">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Laporan Eksekusi Pipeline #{pipelineReport.pipelineId}
                  </span>
                  <h3 className="text-base font-bold text-white flex items-center gap-2 mt-0.5">
                    <span>Hasil Orkestrasi Sesi: {pipelineReport.tradingDate}</span>
                    <span
                      className={`text-xs px-2.5 py-0.5 rounded-full font-extrabold ${
                        pipelineReport.overallStatus === 'SUCCESS'
                          ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                          : pipelineReport.overallStatus === 'PARTIAL'
                          ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                          : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                      }`}
                    >
                      {pipelineReport.overallStatus}
                    </span>
                  </h3>
                </div>

                <div className="flex flex-wrap items-center gap-3 text-xs">
                  <span className="px-2.5 py-1 rounded-lg bg-slate-800 text-slate-300 font-mono">
                    Emiten: <strong>{pipelineReport.uniqueSymbolsCount}</strong>
                  </span>
                  <span className="px-2.5 py-1 rounded-lg bg-slate-800 text-slate-300 font-mono">
                    Total Pick: <strong>{pipelineReport.picksCount}</strong>
                  </span>
                  <span className="px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-mono">
                    Selesai: <strong>{pipelineReport.completedCount}</strong>
                  </span>
                  <span className="px-2.5 py-1 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20 font-mono">
                    Exceptions: <strong>{pipelineReport.exceptionsCount}</strong>
                  </span>
                  <span className="px-2.5 py-1 rounded-lg bg-blue-500/10 text-blue-400 border border-blue-500/20 font-mono">
                    Poin Terkalkulasi: <strong>{pipelineReport.recalculatedPointsCount}</strong>
                  </span>
                </div>
              </div>

              {/* 4 Steps Stepper */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {pipelineReport.steps.map((stepItem: any, idx: number) => (
                  <div
                    key={idx}
                    className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-2 relative"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                        Langkah {idx + 1}
                      </span>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                          stepItem.status === 'SUCCESS'
                            ? 'bg-emerald-500/10 text-emerald-400'
                            : stepItem.status === 'WARNING'
                            ? 'bg-amber-500/10 text-amber-400'
                            : stepItem.status === 'SKIPPED'
                            ? 'bg-slate-800 text-slate-400'
                            : 'bg-rose-500/10 text-rose-400'
                        }`}
                      >
                        {stepItem.status}
                      </span>
                    </div>
                    <div className="text-xs font-bold text-white">{stepItem.step}</div>
                    <p className="text-[11px] text-slate-400 leading-relaxed">{stepItem.message}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Exception Management Center */}
          <div className="p-6 rounded-2xl glass-panel border border-slate-800 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4 text-amber-400" />
                  <span>Pusat Penanganan Exception ({exceptionsList.length} Kasus Perlu Ditinjau)</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Daftar trade yang berstatus REVIEW_REQUIRED atau PENDING_DATA yang membutuhkan perhatian admin.
                </p>
              </div>

              <span className="text-xs text-slate-500">
                Pengecualian diisolasi tanpa memblokir peserta lain
              </span>
            </div>

            {loadingExceptions ? (
              <div className="py-12 text-center text-slate-400 text-xs flex items-center justify-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin text-blue-400" />
                <span>Memuat daftar exception...</span>
              </div>
            ) : exceptionsList.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-300">
                  <thead className="bg-slate-900/80 text-[11px] uppercase tracking-wider text-slate-400 border-b border-slate-800">
                    <tr>
                      <th className="py-2.5 px-3">Peserta</th>
                      <th className="py-2.5 px-3">Emiten</th>
                      <th className="py-2.5 px-3">Tanggal Sesi</th>
                      <th className="py-2.5 px-3">Entry Price</th>
                      <th className="py-2.5 px-3">Status Exception</th>
                      <th className="py-2.5 px-3">Keterangan / Anomali</th>
                      <th className="py-2.5 px-3 text-right">Tindakan</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {exceptionsList.map((ex) => (
                      <tr key={ex.id} className="hover:bg-slate-800/30 transition-colors">
                        <td className="py-3 px-3 font-semibold text-white">{ex.participantName}</td>
                        <td className="py-3 px-3">
                          <span className="font-mono font-bold text-blue-400 px-2 py-0.5 rounded bg-blue-500/10 border border-blue-500/20">
                            {ex.stockSymbol}
                          </span>
                        </td>
                        <td className="py-3 px-3 font-mono text-slate-400">{ex.tradingDate}</td>
                        <td className="py-3 px-3 font-mono">
                          Rp {ex.entryPrice.toLocaleString('id-ID')}
                        </td>
                        <td className="py-3 px-3">
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                              ex.status === 'REVIEW_REQUIRED'
                                ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                                : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                            }`}
                          >
                            {ex.status}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-slate-400 max-w-xs truncate">{ex.notes}</td>
                        <td className="py-3 px-3 text-right space-x-2">
                          <button
                            onClick={() => handleRetryEvaluation(ex.id)}
                            disabled={retryingEvalId === ex.id}
                            className="px-2.5 py-1 rounded-lg bg-blue-600/10 hover:bg-blue-600/20 text-blue-400 border border-blue-500/20 text-[11px] font-semibold inline-flex items-center gap-1 transition-colors disabled:opacity-50"
                          >
                            <RotateCcw
                              className={`w-3 h-3 ${
                                retryingEvalId === ex.id ? 'animate-spin' : ''
                              }`}
                            />
                            <span>Retry</span>
                          </button>
                          <button
                            onClick={() => handleOpenOverride(ex as any)}
                            className="px-2.5 py-1 rounded-lg bg-purple-600/10 hover:bg-purple-600/20 text-purple-400 border border-purple-500/20 text-[11px] font-semibold inline-flex items-center gap-1 transition-colors"
                          >
                            <Edit3 className="w-3 h-3" />
                            <span>Override</span>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="p-8 rounded-xl bg-slate-900/50 border border-slate-800 text-center space-y-2">
                <div className="w-10 h-10 rounded-full bg-emerald-500/10 text-emerald-400 flex items-center justify-center mx-auto">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <div className="text-xs font-bold text-white">
                  Semua Trade Berhasil Dievaluasi Tanpa Exception!
                </div>
                <p className="text-[11px] text-slate-400 max-w-md mx-auto">
                  Tidak ada trade berstatus REVIEW_REQUIRED atau PENDING_DATA pada tanggal yang dipilih. Seluruh evaluasi telah memenuhi aturan bursa IDX dan PRD.
                </p>
              </div>
            )}
          </div>

          {/* Audit Trail History Log */}
          <div className="p-6 rounded-2xl glass-panel border border-slate-800 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Clock className="w-4 h-4 text-blue-400" />
                <span>Audit Trail Riwayat Operasional Turnamen</span>
              </h3>
              <span className="text-xs text-slate-500">Pencatatan Permanen & Imutable</span>
            </div>

            {loadingAuditTrail ? (
              <div className="py-8 text-center text-slate-400 text-xs flex items-center justify-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin text-blue-400" />
                <span>Memuat audit trail...</span>
              </div>
            ) : auditTrailList.length > 0 ? (
              <div className="overflow-x-auto border border-slate-800 rounded-xl">
                <table className="w-full text-left text-xs text-slate-300">
                  <thead className="bg-slate-900/90 text-[11px] uppercase tracking-wider text-slate-400 border-b border-slate-800">
                    <tr>
                      <th className="py-2.5 px-3">Waktu WIB</th>
                      <th className="py-2.5 px-3">Aksi / Operasi</th>
                      <th className="py-2.5 px-3">Entitas</th>
                      <th className="py-2.5 px-3">Rincian Perubahan (Audit Payload)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 font-mono text-[11px]">
                    {auditTrailList.map((log) => (
                      <tr key={log.id} className="hover:bg-slate-800/30 transition-colors">
                        <td className="py-2.5 px-3 text-slate-400">
                          {new Date(log.createdAt).toLocaleString('id-ID', {
                            dateStyle: 'short',
                            timeStyle: 'medium',
                          })}
                        </td>
                        <td className="py-2.5 px-3">
                          <span className="font-bold text-amber-400 px-2 py-0.5 rounded bg-amber-500/10 border border-amber-500/20">
                            {log.action}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-slate-300">{log.entityType}</td>
                        <td className="py-2.5 px-3 text-slate-400 max-w-md truncate">
                          {JSON.stringify(log.newValues || log.oldValues || {})}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="py-8 text-center text-slate-500 text-xs">
                Belum ada catatan audit trail operasional untuk turnamen ini.
              </div>
            )}
          </div>
        </div>
      )}

      {/* GLOBAL CUSTOM CONFIRMATION MODAL */}
      {confirmDialog && confirmDialog.isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-150">
          <div className="w-full max-w-md rounded-3xl bg-slate-900/95 border border-slate-700/80 shadow-2xl shadow-black/80 p-6 sm:p-7 relative overflow-hidden animate-in zoom-in-95 duration-150">
            {/* Top glowing aura stripe */}
            <div
              className={`absolute top-0 left-0 right-0 h-1.5 ${
                confirmDialog.type === 'DANGER'
                  ? 'bg-gradient-to-r from-rose-500 via-red-500 to-rose-600 shadow-md shadow-rose-500/50'
                  : confirmDialog.type === 'WARNING'
                  ? 'bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 shadow-md shadow-amber-500/50'
                  : confirmDialog.type === 'SUCCESS'
                  ? 'bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-600 shadow-md shadow-emerald-500/50'
                  : 'bg-gradient-to-r from-blue-500 via-indigo-500 to-cyan-500 shadow-md shadow-blue-500/50'
              }`}
            />

            <button
              onClick={closeConfirmDialog}
              className="absolute top-5 right-5 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-start gap-4 mb-4">
              <div
                className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 border shadow-lg ${
                  confirmDialog.type === 'DANGER'
                    ? 'bg-rose-500/15 border-rose-500/30 text-rose-400 shadow-rose-500/20'
                    : confirmDialog.type === 'WARNING'
                    ? 'bg-amber-500/15 border-amber-500/30 text-amber-400 shadow-amber-500/20'
                    : confirmDialog.type === 'SUCCESS'
                    ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400 shadow-emerald-500/20'
                    : 'bg-blue-500/15 border-blue-500/30 text-blue-400 shadow-blue-500/20'
                }`}
              >
                {confirmDialog.type === 'DANGER' ? (
                  <Trash2 className="w-6 h-6" />
                ) : confirmDialog.type === 'WARNING' ? (
                  <ShieldAlert className="w-6 h-6" />
                ) : confirmDialog.type === 'SUCCESS' ? (
                  <CheckCircle2 className="w-6 h-6" />
                ) : (
                  <HelpCircle className="w-6 h-6" />
                )}
              </div>

              <div className="pr-6">
                <h3 className="text-base sm:text-lg font-bold text-white tracking-tight leading-snug">
                  {confirmDialog.title}
                </h3>
                <p className="text-xs sm:text-sm text-slate-300 mt-1.5 leading-relaxed">
                  {confirmDialog.description}
                </p>
              </div>
            </div>

            {/* Warning / Note Box */}
            {confirmDialog.warningNote && (
              <div
                className={`p-3.5 rounded-xl border text-xs flex items-start gap-2.5 mb-4 ${
                  confirmDialog.type === 'DANGER'
                    ? 'bg-rose-950/40 border-rose-500/30 text-rose-300'
                    : confirmDialog.type === 'WARNING'
                    ? 'bg-amber-950/40 border-amber-500/30 text-amber-300'
                    : 'bg-slate-800/80 border-slate-700 text-slate-300'
                }`}
              >
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span className="leading-relaxed">{confirmDialog.warningNote}</span>
              </div>
            )}

            {/* Optional Input Prompt */}
            {confirmDialog.hasInput && (
              <div className="mb-5 space-y-1.5">
                <label className="block text-xs font-semibold text-slate-200">
                  {confirmDialog.inputLabel || 'Keterangan'}
                </label>
                <input
                  type="text"
                  placeholder={confirmDialog.inputPlaceholder || 'Ketik di sini...'}
                  value={confirmInputValue}
                  onChange={(e) => setConfirmInputValue(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-slate-100 text-xs focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
                  autoFocus
                />
              </div>
            )}

            {/* Action buttons */}
            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
              <button
                type="button"
                onClick={closeConfirmDialog}
                className="px-4 py-2.5 rounded-xl border border-slate-700 hover:border-slate-600 bg-slate-800/60 hover:bg-slate-800 text-slate-300 text-xs font-semibold transition-all"
              >
                {confirmDialog.cancelLabel || 'Batal'}
              </button>

              <button
                type="button"
                onClick={() => confirmDialog.onConfirm(confirmInputValue)}
                className={`px-5 py-2.5 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all shadow-lg ${
                  confirmDialog.type === 'DANGER'
                    ? 'bg-rose-600 hover:bg-rose-500 text-white shadow-rose-600/30'
                    : confirmDialog.type === 'WARNING'
                    ? 'bg-amber-600 hover:bg-amber-500 text-white shadow-amber-600/30'
                    : confirmDialog.type === 'SUCCESS'
                    ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-600/30'
                    : 'bg-blue-600 hover:bg-blue-500 text-white shadow-blue-600/30'
                }`}
              >
                <span>{confirmDialog.confirmLabel || 'Konfirmasi'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL ENROLL PARTICIPANT */}
      {isEnrollModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="glass-panel w-full max-w-md p-6 rounded-2xl border border-slate-700 shadow-2xl relative">
            <button
              onClick={() => setIsEnrollModalOpen(false)}
              className="absolute top-5 right-5 text-slate-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-lg font-bold text-white mb-1">Daftarkan Peserta ke Turnamen</h3>
            <p className="text-xs text-slate-400 mb-5">
              Kelola keikutsertaan peserta secara mandiri pada turnamen ini
            </p>

            {/* Mode Switcher */}
            <div className="flex rounded-xl bg-slate-900 border border-slate-800 p-1 mb-5">
              <button
                type="button"
                onClick={() => setEnrollMode('SELECT')}
                className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                  enrollMode === 'SELECT'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Pilih User / Trader
              </button>
              <button
                type="button"
                onClick={() => setEnrollMode('NEW')}
                className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                  enrollMode === 'NEW'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Input Peserta Baru
              </button>
            </div>

            {enrollError && (
              <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs mb-4 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{enrollError}</span>
              </div>
            )}

            <form onSubmit={handleEnroll} className="space-y-4">
              {enrollMode === 'SELECT' ? (
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Pilih Peserta yang Belum Terdaftar
                  </label>
                  {unenrolledParticipants.length === 0 ? (
                    <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 text-xs text-slate-400 text-center">
                      Semua trader terdaftar sudah mengikuti turnamen ini. Gunakan tab <strong>Input Peserta Baru</strong> jika ingin mendaftarkan peserta tambahan.
                    </div>
                  ) : (
                    <select
                      value={selectedParticipantToEnroll}
                      onChange={(e) => setSelectedParticipantToEnroll(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-100 text-sm focus:outline-none focus:border-blue-500"
                    >
                      <option value="">-- Pilih Trader --</option>
                      {unenrolledParticipants.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              ) : (
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Nama Lengkap Peserta <span className="text-red-400">*</span>
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. John Doe"
                      value={newParticipantName}
                      onChange={(e) => setNewParticipantName(e.target.value)}
                      className="w-full px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-100 text-xs focus:outline-none focus:border-blue-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Email (Opsional)
                    </label>
                    <input
                      type="email"
                      placeholder="e.g. john@example.com"
                      value={newParticipantEmail}
                      onChange={(e) => setNewParticipantEmail(e.target.value)}
                      className="w-full px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-100 text-xs focus:outline-none focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Nomor Telepon / WA (Opsional)
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. 08123456789"
                      value={newParticipantPhone}
                      onChange={(e) => setNewParticipantPhone(e.target.value)}
                      className="w-full px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-100 text-xs focus:outline-none focus:border-blue-500"
                    />
                  </div>
                </div>
              )}

              <div className="flex gap-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsEnrollModalOpen(false)}
                  className="flex-1 py-2 rounded-xl border border-slate-700 text-slate-300 text-xs font-semibold"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={
                    enrollLoading ||
                    (enrollMode === 'SELECT' && (!selectedParticipantToEnroll || unenrolledParticipants.length === 0))
                  }
                  className="flex-1 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold disabled:opacity-50 transition-all shadow-md shadow-blue-600/20"
                >
                  {enrollLoading ? 'Mendaftarkan...' : 'Daftarkan ke Turnamen'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL SUBMIT STOCK PICK */}
      {isPickModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="glass-panel w-full max-w-lg p-6 rounded-2xl border border-slate-700 shadow-2xl relative max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setIsPickModalOpen(false)}
              className="absolute top-5 right-5 text-slate-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-lg font-bold text-white mb-1">Submit Stock Pick Peserta</h3>
            <p className="text-xs text-slate-400 mb-6">
              Pilihan emiten harian untuk dievaluasi otomatis saat market close
            </p>

            {pickError && (
              <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs mb-4 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{pickError}</span>
              </div>
            )}

            {pickSuccess && (
              <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs mb-4 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>{pickSuccess}</span>
              </div>
            )}

            <form onSubmit={handleCreatePick} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Peserta Turnamen *
                </label>
                <select
                  required
                  value={pickParticipantId}
                  onChange={(e) => setPickParticipantId(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-100 text-sm focus:outline-none focus:border-blue-500"
                >
                  {enrolled.map((ep) => (
                    <option key={ep.participant.id} value={ep.participant.id}>
                      {ep.participant.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Pilih Emiten Saham IDX *
                </label>
                <div className="mb-2">
                  <input
                    type="text"
                    placeholder="Filter ticker atau nama (misal: BBCA)..."
                    value={stockSearchQuery}
                    onChange={(e) => setStockSearchQuery(e.target.value)}
                    className="w-full px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-slate-300 text-xs placeholder:text-slate-600 focus:outline-none focus:border-blue-500"
                  />
                </div>
                <select
                  required
                  value={pickStockId}
                  onChange={(e) => setPickStockId(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-100 text-sm focus:outline-none focus:border-blue-500 font-mono"
                >
                  {filteredStocks.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.symbol} — {s.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Tanggal Perdagangan *
                  </label>
                  <input
                    type="date"
                    required
                    value={pickDate}
                    onChange={(e) => setPickDate(e.target.value)}
                    min={tournament.startDate.substring(0, 10)}
                    max={tournament.endDate.substring(0, 10)}
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-100 text-sm focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Harga Entry (Rp) *
                  </label>
                  <input
                    type="number"
                    required
                    min={1}
                    value={pickPrice}
                    onChange={(e) => setPickPrice(e.target.value)}
                    placeholder="Contoh: 9200"
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-100 text-sm font-mono focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Sumber Harga Entry
                </label>
                <select
                  value={pickSource}
                  onChange={(e) => setPickSource(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-100 text-sm focus:outline-none focus:border-blue-500"
                >
                  <option value="MARKET_OPEN">Market Open (Pembukaan Jam 09:00 WIB)</option>
                  <option value="MANUAL_PRICE">Manual Price (Harga Manual)</option>
                  <option value="CUSTOM_TIMESTAMP">Custom Timestamp</option>
                </select>
              </div>

              <div className="flex gap-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsPickModalOpen(false)}
                  className="flex-1 py-2.5 rounded-xl border border-slate-700 text-slate-300 text-xs font-semibold"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={pickLoading}
                  className="flex-1 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold transition-all shadow-md shadow-blue-600/20 disabled:opacity-50"
                >
                  {pickLoading ? 'Menyimpan Pick...' : 'Simpan Stock Pick'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL SYNC RUN INGESTION DETAILS */}
      {isDetailModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="glass-panel w-full max-w-3xl p-6 rounded-2xl border border-slate-700 shadow-2xl relative max-h-[90vh] flex flex-col">
            <button
              onClick={() => setIsDetailModalOpen(false)}
              className="absolute top-5 right-5 text-slate-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="mb-4">
              <div className="flex items-center gap-2 mb-1">
                <Database className="w-5 h-5 text-blue-400" />
                <h3 className="text-lg font-bold text-white">
                  Rincian Ingestion Market Data
                </h3>
              </div>
              {selectedSyncRun && (
                <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400 mt-1">
                  <span>
                    Tanggal:{' '}
                    <strong className="text-white font-mono">{selectedSyncRun.tradingDate}</strong>
                  </span>
                  <span>•</span>
                  <span>
                    Provider:{' '}
                    <strong className="text-cyan-400 font-mono uppercase">
                      {selectedSyncRun.provider}
                    </strong>
                  </span>
                  <span>•</span>
                  <span>
                    Status:{' '}
                    <strong
                      className={
                        selectedSyncRun.status === 'SUCCESS' ? 'text-emerald-400' : 'text-amber-400'
                      }
                    >
                      {selectedSyncRun.status}
                    </strong>
                  </span>
                  <span>•</span>
                  <span>
                    Total:{' '}
                    <strong className="text-white">
                      {selectedSyncRun.syncedCount ?? selectedSyncRun.syncedSymbols ?? 0}/
                      {selectedSyncRun.totalSymbols} Emiten
                    </strong>
                  </span>
                </div>
              )}
            </div>

            {loadingSyncDetail ? (
              <div className="flex flex-col items-center justify-center py-16">
                <Loader2 className="w-8 h-8 text-blue-500 animate-spin mb-3" />
                <p className="text-xs text-slate-400">Memuat rincian emiten...</p>
              </div>
            ) : !selectedSyncRun?.items || selectedSyncRun.items.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-xs border border-dashed border-slate-800 rounded-xl">
                Tidak ada item emiten dalam run ini.
              </div>
            ) : (
              <div className="overflow-y-auto flex-1 border border-slate-800 rounded-xl">
                <table className="w-full text-left text-xs">
                  <thead className="text-[11px] text-slate-400 uppercase bg-slate-900/80 sticky top-0 border-b border-slate-800">
                    <tr>
                      <th className="py-3 px-4 font-semibold">Simbol Emiten</th>
                      <th className="py-3 px-4 font-semibold">Status Sync</th>
                      <th className="py-3 px-4 font-semibold">Bar 1-Menit</th>
                      <th className="py-3 px-4 font-semibold">Keterangan</th>
                      <th className="py-3 px-4 font-semibold text-right">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {selectedSyncRun.items.map((item) => (
                      <tr key={item.id} className="hover:bg-slate-800/30">
                        <td className="py-3 px-4 font-mono font-bold text-white text-sm">
                          {item.symbol}
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                              item.status === 'SUCCESS'
                                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                                : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                            }`}
                          >
                            {item.status}
                          </span>
                        </td>
                        <td className="py-3 px-4 font-mono text-slate-300">
                          {item.candlesCount ?? item.candleCount ?? 0} bar
                        </td>
                        <td className="py-3 px-4 text-slate-400 text-[11px]">
                          {item.errorMessage || 'Data tersinkronisasi dan lolos validasi'}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <button
                            onClick={() =>
                              handlePreviewCandles(item.symbol, selectedSyncRun.tradingDate)
                            }
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 text-xs font-semibold border border-blue-500/30 transition-all"
                          >
                            <BarChart3 className="w-3.5 h-3.5" />
                            <span>Preview Candle</span>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <div className="pt-4 mt-4 border-t border-slate-800 flex justify-end">
              <button
                type="button"
                onClick={() => setIsDetailModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 1-MINUTE CANDLE INSPECTOR */}
      {isCandleModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
          <div className="glass-panel w-full max-w-4xl p-6 rounded-2xl border border-slate-700 shadow-2xl relative max-h-[90vh] flex flex-col">
            <button
              onClick={() => setIsCandleModalOpen(false)}
              className="absolute top-5 right-5 text-slate-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="mb-4">
              <div className="flex items-center gap-2 mb-1">
                <BarChart3 className="w-5 h-5 text-emerald-400" />
                <h3 className="text-lg font-bold text-white">
                  Inspeksi Candle Intraday 1-Menit ({previewSymbol})
                </h3>
              </div>
              <p className="text-xs text-slate-400">
                Tanggal: <span className="text-white font-mono">{previewDate}</span> • Total Dimuat:{' '}
                <span className="text-white font-mono">{previewCandles.length} bar</span> (Kanonikal
                IDX)
              </p>
            </div>

            {loadingCandles ? (
              <div className="flex flex-col items-center justify-center py-20">
                <Loader2 className="w-8 h-8 text-emerald-500 animate-spin mb-3" />
                <p className="text-xs text-slate-400">Memuat bar candle 1-menit...</p>
              </div>
            ) : previewCandles.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-xs border border-dashed border-slate-800 rounded-xl">
                Tidak ada data candle tersimpan untuk emiten dan tanggal ini.
              </div>
            ) : (
              <div className="overflow-y-auto flex-1 border border-slate-800 rounded-xl">
                <table className="w-full text-left text-xs">
                  <thead className="text-[11px] text-slate-400 uppercase bg-slate-900/90 sticky top-0 border-b border-slate-800">
                    <tr>
                      <th className="py-2.5 px-3 font-semibold">Waktu (WIB)</th>
                      <th className="py-2.5 px-3 font-semibold text-right">Open</th>
                      <th className="py-2.5 px-3 font-semibold text-right">High</th>
                      <th className="py-2.5 px-3 font-semibold text-right">Low</th>
                      <th className="py-2.5 px-3 font-semibold text-right">Close</th>
                      <th className="py-2.5 px-3 font-semibold text-center">Return</th>
                      <th className="py-2.5 px-3 font-semibold text-right">Volume</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 font-mono">
                    {previewCandles.map((c) => {
                      const o = Number(c.open);
                      const cl = Number(c.close);
                      const ret = ((cl - o) / o) * 100;
                      const isUp = cl >= o;

                      return (
                        <tr key={c.id} className="hover:bg-slate-800/30">
                          <td className="py-2 px-3 text-slate-300">
                            {new Date(c.timestamp).toLocaleTimeString('id-ID', {
                              hour: '2-digit',
                              minute: '2-digit',
                              second: '2-digit',
                            })}
                          </td>
                          <td className="py-2 px-3 text-right text-slate-200">
                            Rp {Number(c.open).toLocaleString('id-ID')}
                          </td>
                          <td className="py-2 px-3 text-right text-emerald-400">
                            Rp {Number(c.high).toLocaleString('id-ID')}
                          </td>
                          <td className="py-2 px-3 text-right text-rose-400">
                            Rp {Number(c.low).toLocaleString('id-ID')}
                          </td>
                          <td className="py-2 px-3 text-right font-bold text-white">
                            Rp {Number(c.close).toLocaleString('id-ID')}
                          </td>
                          <td className="py-2 px-3 text-center">
                            <span
                              className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                                isUp
                                  ? 'bg-emerald-500/10 text-emerald-400'
                                  : 'bg-rose-500/10 text-rose-400'
                              }`}
                            >
                              {ret > 0 ? `+${ret.toFixed(2)}%` : `${ret.toFixed(2)}%`}
                            </span>
                          </td>
                          <td className="py-2 px-3 text-right text-slate-400">
                            {Number(c.volume).toLocaleString('id-ID')}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            <div className="pt-4 mt-4 border-t border-slate-800 flex justify-end">
              <button
                type="button"
                onClick={() => setIsCandleModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold"
              >
                Tutup Preview
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL BUKTI AUDIT (EVALUATION EVIDENCE) */}
      {isEvidenceModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
          <div className="glass-panel w-full max-w-3xl p-6 rounded-3xl border border-slate-700 shadow-2xl relative max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-blue-600/20 border border-blue-500/30 text-blue-400">
                  <Award className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    <span>Bukti Audit Evaluasi Trade</span>
                    {selectedEvalDetail && (
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                        {selectedEvalDetail.calculationVersion}
                      </span>
                    )}
                  </h3>
                  <p className="text-xs text-slate-400">
                    Rekam jejak deterministik perhitungan matematika per menit intraday
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsEvidenceModalOpen(false)}
                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {loadingEvidence ? (
              <div className="py-20 flex flex-col items-center justify-center">
                <Loader2 className="w-8 h-8 text-blue-500 animate-spin mb-3" />
                <p className="text-xs text-slate-400">Mengambil rekaman audit bukti evaluasi...</p>
              </div>
            ) : !selectedEvalDetail ? (
              <div className="py-16 text-center text-xs text-slate-400">
                Detail evaluasi tidak ditemukan.
              </div>
            ) : (
              <div className="overflow-y-auto flex-1 py-4 space-y-5 pr-1">
                {/* Override alert if exists */}
                {selectedEvalDetail.override && (
                  <div className="p-4 rounded-2xl bg-purple-500/10 border border-purple-500/20 text-xs">
                    <div className="flex items-center justify-between font-bold text-purple-300 mb-1">
                      <span>Evaluasi Ini Telah Disesuaikan Secara Manual (Override)</span>
                      <span className="font-mono text-[10px]">
                        {new Date(selectedEvalDetail.override.createdAt).toLocaleString('id-ID')}
                      </span>
                    </div>
                    <p className="text-slate-300">
                      Oleh:{' '}
                      <span className="font-semibold text-white">
                        {selectedEvalDetail.override.user?.name || 'Administrator'}
                      </span>
                    </p>
                    <p className="text-slate-300 mt-1">
                      Alasan:{' '}
                      <span className="italic text-purple-200">
                        &quot;{selectedEvalDetail.override.reason}&quot;
                      </span>
                    </p>
                    <div className="grid grid-cols-2 gap-2 mt-2 pt-2 border-t border-purple-500/20 font-mono text-[11px]">
                      <div>
                        <span className="text-slate-400">Original: </span>
                        <span>
                          Rp{' '}
                          {Number(selectedEvalDetail.override.originalExitPrice).toLocaleString(
                            'id-ID',
                          )}{' '}
                          ({Number(selectedEvalDetail.override.originalReturn).toFixed(2)}%)
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-400">Penyesuaian: </span>
                        <span className="text-purple-300 font-bold">
                          Rp{' '}
                          {Number(selectedEvalDetail.override.overrideExitPrice).toLocaleString(
                            'id-ID',
                          )}{' '}
                          ({Number(selectedEvalDetail.override.overrideReturn).toFixed(2)}%)
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Trade Summary Cards */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  <div className="p-3.5 rounded-xl bg-slate-900/90 border border-slate-800">
                    <span className="text-slate-400 block text-[10px] uppercase font-semibold">
                      Peserta &amp; Emiten
                    </span>
                    <span className="font-bold text-white block mt-0.5">
                      {selectedEvalDetail.pick.participant.name}
                    </span>
                    <span className="font-mono text-cyan-400 font-bold text-[11px]">
                      {selectedEvalDetail.pick.stock.symbol}
                    </span>
                  </div>

                  <div className="p-3.5 rounded-xl bg-slate-900/90 border border-slate-800">
                    <span className="text-slate-400 block text-[10px] uppercase font-semibold">
                      Harga Entry
                    </span>
                    <span className="font-mono font-bold text-white block mt-0.5">
                      Rp {Number(selectedEvalDetail.entryPrice).toLocaleString('id-ID')}
                    </span>
                    <span className="text-[10px] text-slate-500 block">
                      {selectedEvalDetail.pick.entrySource}
                    </span>
                  </div>

                  <div className="p-3.5 rounded-xl bg-slate-900/90 border border-slate-800">
                    <span className="text-slate-400 block text-[10px] uppercase font-semibold">
                      Highest Peak
                    </span>
                    <span className="font-mono font-bold text-emerald-400 block mt-0.5">
                      Rp {Number(selectedEvalDetail.highestPrice).toLocaleString('id-ID')}
                    </span>
                    <span className="text-[10px] text-emerald-500 font-mono block">
                      +{Number(selectedEvalDetail.maxFloatingReturn).toFixed(2)}%
                    </span>
                  </div>

                  <div className="p-3.5 rounded-xl bg-slate-900/90 border border-slate-800">
                    <span className="text-slate-400 block text-[10px] uppercase font-semibold">
                      Exit &amp; Return
                    </span>
                    <span className="font-mono font-bold text-white block mt-0.5">
                      Rp {Number(selectedEvalDetail.exitPrice).toLocaleString('id-ID')}
                    </span>
                    <span
                      className={`text-[10px] font-mono font-bold block ${
                        Number(selectedEvalDetail.realizedReturn) >= 0
                          ? 'text-emerald-400'
                          : 'text-rose-400'
                      }`}
                    >
                      {Number(selectedEvalDetail.realizedReturn) >= 0
                        ? `+${Number(selectedEvalDetail.realizedReturn).toFixed(2)}%`
                        : `${Number(selectedEvalDetail.realizedReturn).toFixed(2)}%`}
                    </span>
                  </div>
                </div>

                {/* Evidence Details & Trigger Candle */}
                {selectedEvalDetail.evidence && (() => {
                  const ev = selectedEvalDetail.evidence;
                  const details = ((ev as any).detailsJson || (ev as any).details || {}) as any;
                  const triggerCandle = details.triggerCandle || {};
                  const triggerTimestamp = details.triggerCandleTimestamp || selectedEvalDetail.exitTimestamp;
                  const triggerIndex = details.triggerCandleIndex ?? -1;
                  const triggerOpen = triggerCandle.open ?? (ev as any).triggerCandleOpen ?? 0;
                  const triggerHigh = triggerCandle.high ?? (ev as any).triggerCandleHigh ?? 0;
                  const triggerLow = triggerCandle.low ?? (ev as any).triggerCandleLow ?? 0;
                  const triggerClose = triggerCandle.close ?? (ev as any).triggerCandleClose ?? 0;
                  const timeline = (details.stepByStepTimeline || []) as EvaluationTimelineStep[];
                  const gapPolicy = details.gapPolicy || (ev as any).gapPolicy || 'ACTUAL_FIRST_VALID_LEVEL';

                  return (
                    <>
                      <div className="glass-panel p-4 rounded-2xl border border-slate-800 space-y-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                            <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                              Bukti Pemicu Exit (Trigger Candle)
                            </h4>
                          </div>
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                            Provider: {ev.marketDataProvider} ({ev.candleCount} candle)
                          </span>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          {/* Trigger candle box */}
                          <div className="p-3.5 rounded-xl bg-slate-900/90 border border-slate-800 space-y-2">
                            <div className="flex items-center justify-between text-xs">
                              <span className="text-slate-400">Waktu Trigger:</span>
                              <span className="font-mono font-semibold text-white">
                                {triggerTimestamp ? new Date(triggerTimestamp).toLocaleTimeString('id-ID', {
                                  hour: '2-digit',
                                  minute: '2-digit',
                                  second: '2-digit',
                                }) : '-'} WIB {triggerIndex >= 0 ? `(Candle #${triggerIndex + 1})` : ''}
                              </span>
                            </div>

                            <div className="grid grid-cols-4 gap-2 pt-2 border-t border-slate-800 font-mono text-center text-xs">
                              <div className="bg-slate-800/60 p-2 rounded-lg">
                                <span className="text-[9px] text-slate-400 block">Open</span>
                                <span className="text-white font-bold text-[11px]">
                                  Rp {Number(triggerOpen).toLocaleString('id-ID')}
                                </span>
                              </div>
                              <div className="bg-slate-800/60 p-2 rounded-lg">
                                <span className="text-[9px] text-emerald-400 block">High</span>
                                <span className="text-emerald-400 font-bold text-[11px]">
                                  Rp {Number(triggerHigh).toLocaleString('id-ID')}
                                </span>
                              </div>
                              <div className="bg-slate-800/60 p-2 rounded-lg">
                                <span className="text-[9px] text-rose-400 block">Low</span>
                                <span className="text-rose-400 font-bold text-[11px]">
                                  Rp {Number(triggerLow).toLocaleString('id-ID')}
                                </span>
                              </div>
                              <div className="bg-slate-800/60 p-2 rounded-lg">
                                <span className="text-[9px] text-slate-400 block">Close</span>
                                <span className="text-white font-bold text-[11px]">
                                  Rp {Number(triggerClose).toLocaleString('id-ID')}
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* Threshold vs Exit math box */}
                          <div className="p-3.5 rounded-xl bg-slate-900/90 border border-slate-800 space-y-2 text-xs">
                            <div className="flex items-center justify-between">
                              <span className="text-slate-400">Alasan Exit:</span>
                              <span className="font-bold text-white">
                                {selectedEvalDetail.exitReason}
                              </span>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-slate-400">Threshold Teoretis:</span>
                              <span className="font-mono text-amber-400">
                                Rp {Number(selectedEvalDetail.theoreticalThreshold).toFixed(2)}
                              </span>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-slate-400">Harga Exit Aktual (IDX Tick):</span>
                              <span className="font-mono font-bold text-white">
                                Rp {Number(selectedEvalDetail.actualExitPrice).toLocaleString('id-ID')}
                              </span>
                            </div>
                            <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-[11px]">
                              <span className="text-slate-400">Fraksi / Aturan:</span>
                              <span className="text-slate-300 font-mono">
                                {ev.priceFractionVersion} | {gapPolicy}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Step-by-Step Intraday Timeline */}
                      {timeline.length > 0 && (
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                              Kronologi Candle Intraday Hingga Titik Exit ({timeline.length} Bar)
                            </h4>
                            <span className="text-[10px] text-slate-500">
                              Candle setelah titik exit otomatis diabaikan (chronological cutoff)
                            </span>
                          </div>
                          <div className="overflow-x-auto border border-slate-800 rounded-xl max-h-56">
                            <table className="w-full text-left text-[11px] font-mono">
                              <thead className="text-[10px] text-slate-400 uppercase bg-slate-900/90 sticky top-0 border-b border-slate-800">
                                <tr>
                                  <th className="py-2 px-3">Menit</th>
                                  <th className="py-2 px-3">Waktu WIB</th>
                                  <th className="py-2 px-3 text-right">Open</th>
                                  <th className="py-2 px-3 text-right">High</th>
                                  <th className="py-2 px-3 text-right">Low</th>
                                  <th className="py-2 px-3 text-right">Close</th>
                                  <th className="py-2 px-3 text-right">Peak</th>
                                  <th className="py-2 px-3 text-right">Stop Threshold</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-800/60">
                                {timeline.map((step) => {
                                  const isTrigger = step.minute === triggerIndex + 1;
                                  return (
                                    <tr
                                      key={step.minute}
                                      className={
                                        isTrigger ? 'bg-rose-500/10 font-bold' : 'hover:bg-slate-800/30'
                                      }
                                    >
                                      <td className="py-1.5 px-3 text-slate-300">
                                        #{step.minute}{' '}
                                        {isTrigger && <span className="text-rose-400 ml-1">EXIT</span>}
                                      </td>
                                      <td className="py-1.5 px-3 text-slate-300">
                                        {new Date(step.timestamp).toLocaleTimeString('id-ID', {
                                          hour: '2-digit',
                                          minute: '2-digit',
                                        })}
                                      </td>
                                      <td className="py-1.5 px-3 text-right text-slate-200">
                                        {step.open}
                                      </td>
                                      <td className="py-1.5 px-3 text-right text-emerald-400">
                                        {step.high}
                                      </td>
                                      <td className="py-1.5 px-3 text-right text-rose-400">
                                        {step.low}
                                      </td>
                                      <td className="py-1.5 px-3 text-right text-white">
                                        {step.close}
                                      </td>
                                      <td className="py-1.5 px-3 text-right text-emerald-400">
                                        {step.peak}
                                      </td>
                                      <td className="py-1.5 px-3 text-right text-amber-400">
                                        {step.currentThreshold.toFixed(1)}
                                      </td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      )}
                    </>
                  );
                })()}
              </div>
            )}

            <div className="pt-4 border-t border-slate-800 flex justify-end shrink-0">
              <button
                type="button"
                onClick={() => setIsEvidenceModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition-all"
              >
                Tutup Bukti Audit
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL MANUAL OVERRIDE EVALUATION (ADMIN ONLY) */}
      {isOverrideModalOpen && overrideTargetEval && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
          <div className="glass-panel w-full max-w-lg p-6 rounded-3xl border border-slate-700 shadow-2xl relative">
            <button
              onClick={() => setIsOverrideModalOpen(false)}
              className="absolute top-5 right-5 text-slate-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2.5 mb-1">
              <div className="p-2 rounded-xl bg-purple-600/20 border border-purple-500/30 text-purple-400">
                <Edit3 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">
                  Penyesuaian Manual (Override) Evaluasi
                </h3>
                <p className="text-xs text-slate-400">
                  Koreksi nilai exit untuk {overrideTargetEval.pick.participant.name} (
                  {overrideTargetEval.pick.stock.symbol})
                </p>
              </div>
            </div>

            {overrideSuccess && (
              <div className="mt-4 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>{overrideSuccess}</span>
              </div>
            )}

            {overrideError && (
              <div className="mt-4 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{overrideError}</span>
              </div>
            )}

            {/* Current Values Display */}
            <div className="grid grid-cols-3 gap-2 my-4 p-3 rounded-xl bg-slate-900/90 border border-slate-800 text-xs font-mono text-center">
              <div>
                <span className="text-[10px] text-slate-400 block font-sans">Harga Entry</span>
                <span className="text-white font-bold">
                  Rp {Number(overrideTargetEval.entryPrice).toLocaleString('id-ID')}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 block font-sans">Exit Original</span>
                <span className="text-amber-400 font-bold">
                  Rp {Number(overrideTargetEval.exitPrice).toLocaleString('id-ID')}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 block font-sans">Return Original</span>
                <span className="text-white font-bold">
                  {Number(overrideTargetEval.realizedReturn).toFixed(2)}%
                </span>
              </div>
            </div>

            <form onSubmit={handleSubmitOverride} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Harga Exit Baru (Rp) *
                </label>
                <input
                  type="number"
                  required
                  min={1}
                  value={overrideExitPrice}
                  onChange={(e) => {
                    const newPrice = Number(e.target.value);
                    setOverrideExitPrice(e.target.value);
                    const entry = Number(overrideTargetEval.entryPrice);
                    if (entry > 0 && newPrice > 0) {
                      setOverrideReturn((((newPrice - entry) / entry) * 100).toFixed(2));
                    }
                  }}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-100 text-sm font-mono focus:outline-none focus:border-purple-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Realized Return Baru (%)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={overrideReturn}
                  onChange={(e) => setOverrideReturn(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-100 text-sm font-mono focus:outline-none focus:border-purple-500"
                />
                <span className="text-[10px] text-slate-500 mt-1 block">
                  Dihitung otomatis dari selisih harga entry dan exit baru, dapat disesuaikan jika
                  perlu.
                </span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Alasan Penyesuaian (Audit Log Reason) *
                </label>
                <textarea
                  required
                  rows={3}
                  value={overrideReason}
                  onChange={(e) => setOverrideReason(e.target.value)}
                  placeholder="Contoh: Terjadi suspensi bursa pada emiten ini di sesi 2; diputuskan memakai harga close pre-closing."
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-100 text-xs focus:outline-none focus:border-purple-500"
                />
              </div>

              <div className="flex gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsOverrideModalOpen(false)}
                  className="flex-1 py-2.5 rounded-xl border border-slate-700 text-slate-300 text-xs font-semibold hover:bg-slate-800 transition-all"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submittingOverride}
                  className="flex-1 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold transition-all disabled:opacity-50"
                >
                  {submittingOverride ? 'Menyimpan...' : 'Simpan Override'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
