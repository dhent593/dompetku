'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Kantong, Transaksi, Budget, Hutang, Aset, Profile } from '../lib/types';
import FormModal from './FormModal';
import {
  Home,
  List,
  PieChart,
  MoreHorizontal,
  Plus,
  ArrowDown,
  ArrowUp,
  ArrowRightLeft,
  ArrowRight,
  Clock,
  Edit2,
  Trash2,
  PiggyBank,
  TrendingUp,
  Gem,
  Building,
  Box,
  ChevronDown,
  LogOut,
  User,
  Eye,
  EyeOff,
  Settings,
  Loader2,
  X,
} from 'lucide-react';

interface DashboardProps {
  session: any;
  onLogout: () => void;
}

export default function Dashboard({ session, onLogout }: DashboardProps) {
  const userId = session.user.id;
  const userEmail = session.user.email;

  // App Data State
  const [profile, setProfile] = useState<Profile | null>(null);
  const [pockets, setPockets] = useState<Kantong[]>([]);
  const [transactions, setTransactions] = useState<Transaksi[]>([]);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [debts, setDebts] = useState<Hutang[]>([]);
  const [assets, setAssets] = useState<Aset[]>([]);

  // UI State
  const [activeTab, setActiveTab] = useState<'beranda' | 'transaksi' | 'budget' | 'lainnya'>('beranda');
  const [loading, setLoading] = useState(true);
  const [updatingProfile, setUpdatingProfile] = useState(false);
  const [submittingCicilan, setSubmittingCicilan] = useState(false);

  // Filter States (History Tab)
  const [timeFilter, setTimeFilter] = useState<'Bulan Ini' | 'Minggu Ini' | 'Semua'>('Bulan Ini');
  const [filterBulan, setFilterBulan] = useState('');
  const [filterTahun, setFilterTahun] = useState('');
  const [filterJenis, setFilterJenis] = useState('');

  // Balance States
  const [pocketBalances, setPocketBalances] = useState<{ [key: string]: number }>({});
  const [totalBalance, setTotalBalance] = useState(0);
  const [monthlyIn, setMonthlyIn] = useState(0);
  const [monthlyOut, setMonthlyOut] = useState(0);

  // Asset Accordion States
  const [openAssetAccordion, setOpenAssetAccordion] = useState<{ [key: string]: boolean }>({
    'emas': false,
    'tabungan': false,
    'investasi': false,
    'properti': false,
    'lainnya': false,
  });

  // Modal States
  const [bottomSheetOpen, setBottomSheetOpen] = useState(false);
  const [formModalOpen, setFormModalOpen] = useState(false);
  const [formType, setFormType] = useState('Pemasukan');
  const [editItem, setEditItem] = useState<any>(null);

  // Profile Modal State
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [profileNama, setProfileNama] = useState('');
  const [profilePass, setProfilePass] = useState('');
  const [profileRepass, setProfileRepass] = useState('');
  const [showP1, setShowP1] = useState(false);
  const [showP2, setShowP2] = useState(false);
  const [profileError, setProfileError] = useState('');

  // Installment (Cicilan) Modal State
  const [cicilanModalOpen, setCicilanModalOpen] = useState(false);
  const [activeDebt, setActiveDebt] = useState<Hutang | null>(null);
  const [cicilNominal, setCicilNominal] = useState('');
  const [cicilPocket, setCicilPocket] = useState('');
  const [cicilTanggal, setCicilTanggal] = useState('');

  // Fetch all app data
  const fetchData = async () => {
    setLoading(true);
    try {
      // 1. Fetch Profile
      const { data: profData } = await supabase.from('profiles').select('*').eq('id', userId).single();
      if (profData) {
        setProfile(profData);
        setProfileNama(profData.nama_lengkap);
      }

      // 2. Fetch Pockets
      const { data: pData } = await supabase.from('kantong').select('*').eq('user_id', userId).order('created_at', { ascending: true });
      setPockets(pData || []);

      // 3. Fetch Transactions
      const { data: tData } = await supabase.from('transaksi').select('*').eq('user_id', userId).order('tanggal', { ascending: false }).order('created_at', { ascending: false });
      setTransactions(tData || []);

      // 4. Fetch Budgets
      const { data: bData } = await supabase.from('budget').select('*').eq('user_id', userId);
      setBudgets(bData || []);

      // 5. Fetch Debts
      const { data: dData } = await supabase.from('hutang').select('*').eq('user_id', userId).order('created_at', { ascending: false });
      setDebts(dData || []);

      // 6. Fetch Assets
      const { data: aData } = await supabase.from('aset').select('*').eq('user_id', userId).order('created_at', { ascending: false });
      setAssets(aData || []);
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [userId]);

  // Recalculate pocket balances whenever pockets or transactions change
  useEffect(() => {
    const balances: { [key: string]: number } = {};

    // 1. Initialize with starting balances
    pockets.forEach((p) => {
      balances[p.id] = p.saldo_awal;
    });

    // 2. Adjust with transaction entries
    // Since transactions are ordered descending, we must process them in chronological order (or reverse)
    const chronoTransactions = [...transactions].reverse();
    chronoTransactions.forEach((t) => {
      const nom = Number(t.nominal);
      if (t.jenis === 'Pemasukan' && t.kantong_tujuan_id && balances[t.kantong_tujuan_id] !== undefined) {
        balances[t.kantong_tujuan_id] += nom;
      } else if (t.jenis === 'Pengeluaran' && t.kantong_asal_id && balances[t.kantong_asal_id] !== undefined) {
        balances[t.kantong_asal_id] -= nom;
      } else if (t.jenis === 'Transfer') {
        if (t.kantong_asal_id && balances[t.kantong_asal_id] !== undefined) {
          balances[t.kantong_asal_id] -= nom;
        }
        if (t.kantong_tujuan_id && balances[t.kantong_tujuan_id] !== undefined) {
          balances[t.kantong_tujuan_id] += nom;
        }
      }
    });

    setPocketBalances(balances);

    // Calculate total balance
    const total = Object.values(balances).reduce((sum, bal) => sum + bal, 0);
    setTotalBalance(total);

    // Calculate monthly income / expenses
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    let inc = 0;
    let exp = 0;

    transactions.forEach((t) => {
      const tDate = new Date(t.tanggal);
      if (tDate.getMonth() === currentMonth && tDate.getFullYear() === currentYear) {
        if (t.jenis === 'Pemasukan') inc += Number(t.nominal);
        if (t.jenis === 'Pengeluaran') exp += Number(t.nominal);
      }
    });

    setMonthlyIn(inc);
    setMonthlyOut(exp);
  }, [pockets, transactions]);

  // Helper formats
  const formatRp = (num: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(num);
  };

  const pocketColorMap: { [key: string]: string } = {
    blue: 'bg-indigo-600',
    green: 'bg-emerald-600',
    red: 'bg-rose-600',
    dark: 'bg-slate-900',
    purple: 'bg-purple-600',
    orange: 'bg-orange-500',
    yellow: 'bg-amber-500',
    gray: 'bg-slate-500',
  };

  // Open forms
  const handleOpenForm = (type: string, item: any = null) => {
    setFormType(type);
    setEditItem(item);
    setBottomSheetOpen(false);
    setFormModalOpen(true);
  };

  const triggerProfileSettings = () => {
    setProfileError('');
    setProfilePass('');
    setProfileRepass('');
    setShowP1(false);
    setShowP2(false);
    setProfileModalOpen(true);
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileError('');

    if (profilePass || profileRepass) {
      if (profilePass !== profileRepass) {
        setProfileError('Password baru tidak cocok!');
        return;
      }
      if (profilePass.length < 6) {
        setProfileError('Password minimal terdiri dari 6 karakter!');
        return;
      }
    }

    setUpdatingProfile(true);

    try {
      // 1. Update Profile Nama
      const { error: profileErr } = await supabase
        .from('profiles')
        .update({ nama_lengkap: profileNama })
        .eq('id', userId);

      if (profileErr) throw profileErr;

      // 2. Update Auth password if entered
      if (profilePass) {
        const { error: authErr } = await supabase.auth.updateUser({ password: profilePass });
        if (authErr) throw authErr;
      }

      // Refresh Profile State
      const { data: profData } = await supabase.from('profiles').select('*').eq('id', userId).single();
      if (profData) setProfile(profData);

      alert('Profil berhasil diperbarui!');
      setProfileModalOpen(false);
    } catch (err: any) {
      console.error(err);
      setProfileError(err.message || 'Gagal memperbarui profil.');
    } finally {
      setUpdatingProfile(false);
    }
  };

  // Debt/Piutang installment handles
  const triggerCicilan = (debt: Hutang) => {
    const sisa = debt.nominal - debt.terbayar;
    setActiveDebt(debt);
    setCicilNominal(new Intl.NumberFormat('id-ID').format(sisa));
    setCicilPocket('');
    setCicilTanggal(new Date().toISOString().split('T')[0]);
    setCicilanModalOpen(true);
  };

  const handleDebtLunas = async (debt: Hutang) => {
    if (!confirm('Tandai tagihan ini sebagai lunas?')) return;
    setLoading(true);
    try {
      const { error } = await supabase
        .from('hutang')
        .update({ status: 'Lunas', terbayar: debt.nominal })
        .eq('id', debt.id);
      if (error) throw error;
      fetchData();
    } catch (e) {
      console.error(e);
      alert('Gagal melunasi tagihan.');
    } finally {
      setLoading(false);
    }
  };

  const handleDebtDelete = async (debt: Hutang) => {
    if (!confirm('Hapus catatan ini?')) return;
    setLoading(true);
    try {
      const { error } = await supabase.from('hutang').delete().eq('id', debt.id);
      if (error) throw error;
      fetchData();
    } catch (e) {
      console.error(e);
      alert('Gagal menghapus tagihan.');
    } finally {
      setLoading(false);
    }
  };

  const submitCicilan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeDebt) return;

    const nominalValue = parseInt(cicilNominal.replace(/\D/g, '')) || 0;
    const sisa = activeDebt.nominal - activeDebt.terbayar;

    if (nominalValue <= 0) {
      alert('Nominal harus di atas 0!');
      return;
    }
    if (nominalValue > sisa) {
      alert(`Nominal cicilan tidak boleh melebihi sisa kewajiban (${formatRp(sisa)})!`);
      return;
    }

    setSubmittingCicilan(true);

    try {
      const newTerbayar = activeDebt.terbayar + nominalValue;
      const newStatus = newTerbayar >= activeDebt.nominal ? 'Lunas' : 'Belum Lunas';

      // 1. Update Hutang
      const { error: debtErr } = await supabase
        .from('hutang')
        .update({ terbayar: newTerbayar, status: newStatus })
        .eq('id', activeDebt.id);

      if (debtErr) throw debtErr;

      // 2. Record Transaction if pocket is selected
      if (cicilPocket && cicilPocket !== 'none') {
        const transJenis = activeDebt.jenis === 'Hutang' ? 'Pengeluaran' : 'Pemasukan';
        const transPayload = {
          user_id: userId,
          jenis: transJenis,
          nominal: nominalValue,
          kantong_asal_id: transJenis === 'Pengeluaran' ? cicilPocket : null,
          kantong_tujuan_id: transJenis === 'Pemasukan' ? cicilPocket : null,
          kategori: 'Lainnya',
          tanggal: cicilTanggal,
          keterangan: `Cicilan ${activeDebt.jenis} ke ${activeDebt.pihak} (${newTerbayar}/${activeDebt.nominal})`,
        };
        const { error: transErr } = await supabase.from('transaksi').insert([transPayload]);
        if (transErr) throw transErr;
      }

      setCicilanModalOpen(false);
      fetchData();
    } catch (err: any) {
      console.error(err);
      alert(err.message || 'Gagal memproses cicilan.');
    } finally {
      setSubmittingCicilan(false);
    }
  };

  // Asset group formatting
  const getGroupedAssets = () => {
    const categories = [
      { id: 'emas', name: 'Emas & Perhiasan', icon: Gem, color: 'amber' },
      { id: 'tabungan', name: 'Tabungan & Simpanan', icon: PiggyBank, color: 'blue' },
      { id: 'investasi', name: 'Investasi (Saham/Reksa Dana)', icon: TrendingUp, color: 'emerald' },
      { id: 'properti', name: 'Properti & Tanah', icon: Building, color: 'purple' },
      { id: 'lainnya', name: 'Barang Berharga Lainnya', icon: Box, color: 'slate' },
    ];

    return categories.map((cat) => {
      const list = assets.filter((a) => a.kategori === cat.name);
      const totalVal = list.reduce((sum, item) => sum + item.nilai, 0);
      return {
        ...cat,
        list,
        totalVal,
      };
    });
  };

  // Transaction mapping helpers for render
  const getRecentTransactions = () => {
    return transactions.slice(0, 4);
  };

  const getFilteredTransactions = () => {
    const now = new Date();
    return transactions.filter((t) => {
      const tDate = new Date(t.tanggal);

      let matchesTab = true;
      if (timeFilter === 'Bulan Ini') {
        matchesTab = tDate.getMonth() === now.getMonth() && tDate.getFullYear() === now.getFullYear();
      } else if (timeFilter === 'Minggu Ini') {
        const diffTime = Math.abs(now.getTime() - tDate.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        matchesTab = diffDays <= 7;
      }

      const matchesBulan = filterBulan === '' || tDate.getMonth() === parseInt(filterBulan);
      const matchesTahun = filterTahun === '' || tDate.getFullYear() === parseInt(filterTahun);
      const matchesJenis = filterJenis === '' || t.jenis === filterJenis;

      return matchesTab && matchesBulan && matchesTahun && matchesJenis;
    });
  };

  // Budget summaries
  const getCategorySpend = (category: string) => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    return transactions
      .filter((t) => {
        const tDate = new Date(t.tanggal);
        return (
          t.jenis === 'Pengeluaran' &&
          t.kategori === category &&
          tDate.getMonth() === currentMonth &&
          tDate.getFullYear() === currentYear
        );
      })
      .reduce((sum, t) => sum + Number(t.nominal), 0);
  };

  // Debt/Piutang calculations
  const totalActiveDebt = debts
    .filter((d) => d.status === 'Belum Lunas' && d.jenis === 'Hutang')
    .reduce((sum, d) => sum + (d.nominal - d.terbayar), 0);

  const totalActivePiutang = debts
    .filter((d) => d.status === 'Belum Lunas' && d.jenis === 'Piutang')
    .reduce((sum, d) => sum + (d.nominal - d.terbayar), 0);

  const totalAssetValue = assets.reduce((sum, a) => sum + a.nilai, 0);

  const handleLogoutClick = async () => {
    if (!confirm('Apakah Anda yakin ingin keluar dari aplikasi?')) return;
    await supabase.auth.signOut();
    onLogout();
  };

  return (
    <div className="flex flex-col h-full overflow-hidden select-none bg-slate-50 relative">
      {/* LOADING LOADER */}
      {loading && (
        <div className="absolute inset-0 bg-white/95 z-200 flex flex-col justify-center items-center">
          <Loader2 className="w-10 h-10 animate-spin text-indigo-600" />
          <p className="mt-4 text-sm text-gray-500 font-semibold animate-pulse">Memuat Data...</p>
        </div>
      )}

      {/* HEADER */}
      <div className="bg-slate-50 px-6 pt-6 pb-4 flex justify-between items-center z-10">
        <div
          className="flex items-center gap-3 cursor-pointer group active:scale-95 transition-transform"
          onClick={triggerProfileSettings}
        >
          <div className="w-12 h-12 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold text-lg border-2 border-white shadow-sm group-hover:bg-indigo-200 transition-colors">
            {profile ? profile.nama_lengkap.charAt(0).toUpperCase() : 'U'}
          </div>
          <div>
            <p className="text-[11px] text-gray-500 font-semibold uppercase tracking-wider">
              Selamat Datang,
            </p>
            <h1 className="text-lg font-bold text-gray-900 leading-tight group-hover:text-indigo-600 transition-colors">
              {profile ? profile.nama_lengkap : 'User'}
            </h1>
          </div>
        </div>
        <button
          onClick={handleLogoutClick}
          className="w-10 h-10 rounded-full bg-rose-50 text-rose-500 hover:bg-rose-100 shadow-sm flex items-center justify-center transition active:scale-95"
        >
          <LogOut className="w-5 h-5" />
        </button>
      </div>

      {/* SCROLLABLE PAGE CONTAINER */}
      <div className="flex-grow overflow-y-auto hide-scrollbar pb-24">
        {/* TABS 1: HOME (BERANDA) */}
        {activeTab === 'beranda' && (
          <div className="px-6 pt-2 animate-[slideUp_0.22s_cubic-bezier(0.16,1,0.3,1)_forwards]">
            {/* Wallet Balance Card */}
            <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-3xl p-6 text-white shadow-xl shadow-slate-900/20 mb-6 relative overflow-hidden">
              <div className="absolute -right-12 -top-12 w-48 h-48 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none"></div>
              <p className="text-indigo-200 text-xs font-medium mb-1 tracking-wide uppercase">
                Total Saldo Tersedia
              </p>
              <h2 className="text-3xl font-extrabold tracking-tight mb-6">
                {formatRp(totalBalance)}
              </h2>

              <div className="flex justify-between items-center bg-white/10 rounded-2xl p-4 backdrop-blur-md">
                <div>
                  <p className="text-[10px] text-indigo-200 mb-1 flex items-center gap-1">
                    <ArrowDown className="w-3 h-3" /> Pemasukan Bulan Ini
                  </p>
                  <p className="text-sm font-bold text-white">{formatRp(monthlyIn)}</p>
                </div>
                <div className="w-px h-8 bg-white/20"></div>
                <div className="text-right">
                  <p className="text-[10px] text-indigo-200 mb-1 flex items-center gap-1 justify-end">
                    <ArrowUp className="w-3 h-3" /> Pengeluaran Bulan Ini
                  </p>
                  <p className="text-sm font-bold text-white">{formatRp(monthlyOut)}</p>
                </div>
              </div>
            </div>

            {/* Kantong Dana Header */}
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold text-gray-900 text-sm">Kantong Dana</h3>
              <button
                onClick={() => handleOpenForm('Kantong')}
                className="text-indigo-600 text-xs font-bold bg-indigo-50 px-3 py-1.5 rounded-full hover:bg-indigo-100 transition"
              >
                + Kantong
              </button>
            </div>

            {/* Kantong Scroll Cards */}
            <div className="flex gap-4 overflow-x-auto hide-scrollbar pb-4 -mx-6 px-6">
              {pockets.length > 0 ? (
                pockets.map((p) => {
                  const balance = pocketBalances[p.id] || 0;
                  const bgClass = pocketColorMap[p.warna] || 'bg-slate-800';
                  return (
                    <div
                      key={p.id}
                      onClick={() => handleOpenForm('Kantong', p)}
                      className={`${bgClass} min-w-[140px] p-4 rounded-3xl text-white shadow-md relative overflow-hidden flex-shrink-0 cursor-pointer active:scale-95 transition hover:shadow-lg`}
                    >
                      <div className="absolute -right-4 -top-4 w-16 h-16 bg-white/20 rounded-full blur-xl pointer-events-none"></div>
                      <p className="text-[10px] font-medium opacity-80 mb-1 truncate max-w-[100px]">
                        {p.nama}
                      </p>
                      <p className="text-sm font-bold">{formatRp(balance)}</p>
                    </div>
                  );
                })
              ) : (
                <p className="text-xs text-gray-400 py-2">Belum ada kantong</p>
              )}
            </div>

            {/* Transaksi Terakhir Header */}
            <div className="flex justify-between items-center mb-4 mt-2">
              <h3 className="font-bold text-gray-900 text-sm">Transaksi Terakhir</h3>
              <span
                className="text-indigo-600 text-xs font-bold cursor-pointer hover:underline"
                onClick={() => setActiveTab('transaksi')}
              >
                Lihat Semua
              </span>
            </div>

            {/* Recent Transactions List */}
            <div className="space-y-3">
              {getRecentTransactions().length > 0 ? (
                getRecentTransactions().map((t) => {
                  const isMasuk = t.jenis === 'Pemasukan';
                  const isTrans = t.jenis === 'Transfer';
                  const color = isMasuk ? 'emerald' : isTrans ? 'blue' : 'rose';
                  const sign = isMasuk ? '+' : isTrans ? '' : '-';

                  const sourcePocket = pockets.find((p) => p.id === t.kantong_asal_id)?.nama || '';
                  const targetPocket = pockets.find((p) => p.id === t.kantong_tujuan_id)?.nama || '';

                  let pocketInfo = isTrans ? (
                    <span className="flex items-center gap-1">
                      {sourcePocket} <ArrowRight className="w-2.5 h-2.5 text-gray-400" /> {targetPocket}
                    </span>
                  ) : isMasuk ? (
                    targetPocket
                  ) : (
                    sourcePocket
                  );

                  return (
                    <div
                      key={t.id}
                      className="bg-white p-4 rounded-2xl flex items-center justify-between shadow-sm border border-gray-100 hover:shadow transition"
                    >
                      <div className="flex items-center gap-4">
                        <div
                          className={`w-12 h-12 rounded-2xl flex items-center justify-center text-lg ${
                            isMasuk
                              ? 'bg-emerald-50 text-emerald-500'
                              : isTrans
                              ? 'bg-blue-50 text-blue-500'
                              : 'bg-rose-50 text-rose-500'
                          }`}
                        >
                          {isMasuk ? (
                            <ArrowDown className="w-5 h-5" />
                          ) : isTrans ? (
                            <ArrowRightLeft className="w-5 h-5" />
                          ) : (
                            <ArrowUp className="w-5 h-5 animate-bounce-short" />
                          )}
                        </div>
                        <div>
                          <p className="text-sm font-bold text-gray-900">
                            {t.kategori}{' '}
                            <span className="text-[10px] font-normal text-gray-500">
                              ({t.keterangan})
                            </span>
                          </p>
                          <p className="text-[10px] text-gray-500 font-medium flex items-center gap-1.5 mt-0.5">
                            <span>{t.tanggal}</span>
                            <span>•</span>
                            <span className="max-w-[120px] truncate">{pocketInfo}</span>
                          </p>
                        </div>
                      </div>
                      <div className="text-right flex flex-col items-end">
                        <p
                          className={`font-bold text-sm ${
                            isMasuk
                              ? 'text-emerald-500'
                              : isTrans
                              ? 'text-blue-500'
                              : 'text-rose-500'
                          }`}
                        >
                          {sign}
                          {formatRp(t.nominal)}
                        </p>
                        <div className="flex items-center gap-2.5 mt-2">
                          <button
                            className="text-gray-300 hover:text-indigo-600 transition"
                            onClick={() => handleOpenForm(t.jenis, t)}
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })
              ) : (
                <p className="text-xs text-gray-400 text-center py-8">Belum ada transaksi</p>
              )}
            </div>
          </div>
        )}

        {/* TABS 2: HISTORY (RIWAYAT) */}
        {activeTab === 'transaksi' && (
          <div className="px-6 pt-2 animate-[slideUp_0.22s_cubic-bezier(0.16,1,0.3,1)_forwards]">
            <h2 className="text-2xl font-extrabold text-gray-900 mb-6">Riwayat Transaksi</h2>

            {/* Filter slider */}
            <div className="relative flex bg-gray-200 p-1 rounded-xl mb-6 select-none">
              <div
                className="absolute top-0 bottom-0 left-0 w-1/3 p-1 transition-all duration-300 ease-out z-0"
                style={{
                  transform: `translateX(${
                    timeFilter === 'Bulan Ini' ? '0%' : timeFilter === 'Minggu Ini' ? '100%' : '200%'
                  })`,
                }}
              >
                <div className="w-full h-full bg-white rounded-lg shadow-sm"></div>
              </div>
              <button
                className={`relative flex-1 py-2 text-xs font-bold rounded-lg transition-all duration-300 z-10 ${
                  timeFilter === 'Bulan Ini' ? 'text-gray-900' : 'text-gray-500 hover:text-gray-900'
                }`}
                onClick={() => setTimeFilter('Bulan Ini')}
              >
                Bulan Ini
              </button>
              <button
                className={`relative flex-1 py-2 text-xs font-bold rounded-lg transition-all duration-300 z-10 ${
                  timeFilter === 'Minggu Ini' ? 'text-gray-900' : 'text-gray-500 hover:text-gray-900'
                }`}
                onClick={() => setTimeFilter('Minggu Ini')}
              >
                Minggu Ini
              </button>
              <button
                className={`relative flex-1 py-2 text-xs font-bold rounded-lg transition-all duration-300 z-10 ${
                  timeFilter === 'Semua' ? 'text-gray-900' : 'text-gray-500 hover:text-gray-900'
                }`}
                onClick={() => setTimeFilter('Semua')}
              >
                Semua
              </button>
            </div>

            {/* Custom filters */}
            <div className="bg-white p-4 rounded-3xl shadow-sm border border-gray-100 mb-6 space-y-3">
              <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider px-1">
                Filter Kustom
              </p>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="text-[9px] font-bold text-gray-400 uppercase px-1">Bulan</label>
                  <select
                    value={filterBulan}
                    onChange={(e) => setFilterBulan(e.target.value)}
                    className="w-full p-2.5 mt-1 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold focus:bg-white focus:border-indigo-600 outline-none"
                  >
                    <option value="">Semua</option>
                    <option value="0">Januari</option>
                    <option value="1">Februari</option>
                    <option value="2">Maret</option>
                    <option value="3">April</option>
                    <option value="4">Mei</option>
                    <option value="5">Juni</option>
                    <option value="6">Juli</option>
                    <option value="7">Agustus</option>
                    <option value="8">September</option>
                    <option value="9">Oktober</option>
                    <option value="10">November</option>
                    <option value="11">Desember</option>
                  </select>
                </div>
                <div>
                  <label className="text-[9px] font-bold text-gray-400 uppercase px-1">Tahun</label>
                  <select
                    value={filterTahun}
                    onChange={(e) => setFilterTahun(e.target.value)}
                    className="w-full p-2.5 mt-1 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold focus:bg-white focus:border-indigo-600 outline-none"
                  >
                    <option value="">Semua</option>
                    <option value="2025">2025</option>
                    <option value="2026">2026</option>
                    <option value="2027">2027</option>
                    <option value="2028">2028</option>
                  </select>
                </div>
                <div>
                  <label className="text-[9px] font-bold text-gray-400 uppercase px-1">Jenis</label>
                  <select
                    value={filterJenis}
                    onChange={(e) => setFilterJenis(e.target.value)}
                    className="w-full p-2.5 mt-1 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold focus:bg-white focus:border-indigo-600 outline-none"
                  >
                    <option value="">Semua</option>
                    <option value="Pemasukan">Pemasukan</option>
                    <option value="Pengeluaran">Pengeluaran</option>
                    <option value="Transfer">Pindah Dana</option>
                  </select>
                </div>
              </div>
              <div className="flex justify-end pt-1">
                <button
                  onClick={() => {
                    setFilterBulan('');
                    setFilterTahun('');
                    setFilterJenis('');
                  }}
                  className="text-[10px] text-indigo-600 font-extrabold hover:text-indigo-800 transition px-1"
                >
                  Reset Filter
                </button>
              </div>
            </div>

            {/* Full transactions list */}
            <div className="space-y-3">
              {getFilteredTransactions().length > 0 ? (
                getFilteredTransactions().map((t) => {
                  const isMasuk = t.jenis === 'Pemasukan';
                  const isTrans = t.jenis === 'Transfer';
                  const color = isMasuk ? 'emerald' : isTrans ? 'blue' : 'rose';
                  const sign = isMasuk ? '+' : isTrans ? '' : '-';

                  const sourcePocket = pockets.find((p) => p.id === t.kantong_asal_id)?.nama || '';
                  const targetPocket = pockets.find((p) => p.id === t.kantong_tujuan_id)?.nama || '';

                  let pocketInfo = isTrans ? (
                    <span className="flex items-center gap-1">
                      {sourcePocket} <ArrowRight className="w-2.5 h-2.5 text-gray-400" /> {targetPocket}
                    </span>
                  ) : isMasuk ? (
                    targetPocket
                  ) : (
                    sourcePocket
                  );

                  return (
                    <div
                      key={t.id}
                      className="bg-white p-4 rounded-2xl flex items-center justify-between shadow-sm border border-gray-100 hover:shadow transition"
                    >
                      <div className="flex items-center gap-4">
                        <div
                          className={`w-12 h-12 rounded-2xl flex items-center justify-center text-lg ${
                            isMasuk
                              ? 'bg-emerald-50 text-emerald-500'
                              : isTrans
                              ? 'bg-blue-50 text-blue-500'
                              : 'bg-rose-50 text-rose-500'
                          }`}
                        >
                          {isMasuk ? (
                            <ArrowDown className="w-5 h-5" />
                          ) : isTrans ? (
                            <ArrowRightLeft className="w-5 h-5" />
                          ) : (
                            <ArrowUp className="w-5 h-5" />
                          )}
                        </div>
                        <div>
                          <p className="text-sm font-bold text-gray-900">
                            {t.kategori}{' '}
                            <span className="text-[10px] font-normal text-gray-500">
                              ({t.keterangan})
                            </span>
                          </p>
                          <p className="text-[10px] text-gray-500 font-medium flex items-center gap-1.5 mt-0.5">
                            <span>{t.tanggal}</span>
                            <span>•</span>
                            <span className="max-w-[120px] truncate">{pocketInfo}</span>
                          </p>
                        </div>
                      </div>
                      <div className="text-right flex flex-col items-end">
                        <p
                          className={`font-bold text-sm ${
                            isMasuk
                              ? 'text-emerald-500'
                              : isTrans
                              ? 'text-blue-500'
                              : 'text-rose-500'
                          }`}
                        >
                          {sign}
                          {formatRp(t.nominal)}
                        </p>
                        <div className="flex items-center gap-2.5 mt-2">
                          <button
                            className="text-gray-300 hover:text-indigo-600 transition"
                            onClick={() => handleOpenForm(t.jenis, t)}
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })
              ) : (
                <p className="text-xs text-gray-400 text-center py-12">
                  Tidak ada transaksi pada periode ini.
                </p>
              )}
            </div>
          </div>
        )}

        {/* TABS 3: BUDGETING */}
        {activeTab === 'budget' && (
          <div className="px-6 pt-2 animate-[slideUp_0.22s_cubic-bezier(0.16,1,0.3,1)_forwards]">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-extrabold text-gray-900">Budgeting</h2>
              <button
                onClick={() => handleOpenForm('Budget')}
                className="bg-indigo-600 text-white w-8 h-8 rounded-full flex items-center justify-center shadow-md hover:bg-indigo-700 transition"
              >
                <Plus className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-5">
              {budgets.length > 0 ? (
                budgets.map((b) => {
                  const spend = getCategorySpend(b.kategori);
                  const target = b.nominal;
                  const persen = Math.min((spend / target) * 100, 100);

                  const progressBarColor =
                    persen > 90
                      ? 'bg-rose-500'
                      : persen > 70
                      ? 'bg-amber-500'
                      : 'bg-indigo-600';

                  return (
                    <div
                      key={b.id}
                      className="bg-white p-5 rounded-3xl shadow-sm border border-gray-100 hover:shadow transition"
                    >
                      <div className="flex justify-between items-center mb-2">
                        <h4 className="font-bold text-gray-900 text-sm">{b.kategori}</h4>
                        <div className="flex items-center gap-2">
                          <button
                            className="text-gray-300 hover:text-indigo-600 transition"
                            onClick={() => handleOpenForm('Budget', b)}
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      <div className="flex justify-between text-[10px] text-gray-500 mb-2 font-semibold">
                        <span>Terpakai: {formatRp(spend)}</span>
                        <span>
                          Sisa:{' '}
                          <strong
                            className={persen > 90 ? 'text-rose-500' : 'text-emerald-500'}
                          >
                            {formatRp(target - spend)}
                          </strong>
                        </span>
                      </div>

                      <div className="w-full bg-gray-100 rounded-full h-2.5 overflow-hidden">
                        <div
                          className={`${progressBarColor} h-2.5 rounded-full transition-all duration-500`}
                          style={{ width: `${persen}%` }}
                        ></div>
                      </div>
                      <p className="text-[9px] text-right text-gray-400 mt-1">
                        Dari Budget: {formatRp(target)} (Bulan: {b.bulan}/{b.tahun})
                      </p>
                    </div>
                  );
                })
              ) : (
                <p className="text-xs text-gray-400 text-center py-12">
                  Belum ada budget untuk bulan ini.
                </p>
              )}
            </div>
          </div>
        )}

        {/* TABS 4: FINANSIAL LAINNYA (HUTANG & ASET) */}
        {activeTab === 'lainnya' && (
          <div className="px-6 pt-2 animate-[slideUp_0.22s_cubic-bezier(0.16,1,0.3,1)_forwards]">
            <h2 className="text-2xl font-extrabold text-gray-900 mb-6">Finansial Lainnya</h2>

            {/* Small summary boxes */}
            <div className="grid grid-cols-3 gap-2.5 mb-6 select-none">
              <div className="bg-rose-50 border border-rose-100 p-3 rounded-2xl text-center shadow-sm">
                <p className="text-[9px] text-rose-500 font-bold uppercase tracking-wider">
                  Hutang Aktif
                </p>
                <p className="text-xs font-extrabold text-rose-600 mt-1 truncate">
                  {formatRp(totalActiveDebt)}
                </p>
              </div>
              <div className="bg-emerald-50 border border-emerald-100 p-3 rounded-2xl text-center shadow-sm">
                <p className="text-[9px] text-emerald-500 font-bold uppercase tracking-wider">
                  Piutang Aktif
                </p>
                <p className="text-xs font-extrabold text-emerald-600 mt-1 truncate">
                  {formatRp(totalActivePiutang)}
                </p>
              </div>
              <div className="bg-blue-50 border border-blue-100 p-3 rounded-2xl text-center shadow-sm">
                <p className="text-[9px] text-blue-500 font-bold uppercase tracking-wider">
                  Total Aset
                </p>
                <p className="text-xs font-extrabold text-blue-600 mt-1 truncate">
                  {formatRp(totalAssetValue)}
                </p>
              </div>
            </div>

            {/* Hutang/Piutang Catatan Header */}
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold text-gray-800 text-sm">Catatan Hutang / Piutang</h3>
              <button
                onClick={() => handleOpenForm('Hutang')}
                className="text-indigo-600 text-xs font-bold bg-indigo-50 px-3 py-1.5 rounded-full hover:bg-indigo-100 transition"
              >
                + Catat
              </button>
            </div>

            {/* Catatan Hutang/Piutang List */}
            <div className="space-y-3 mb-8">
              {debts.length > 0 ? (
                debts.map((d) => {
                  const sisa = d.nominal - d.terbayar;
                  const persen = Math.min((d.terbayar / d.nominal) * 100, 100);
                  const isLunas = d.status === 'Lunas';
                  const warna = d.jenis === 'Hutang' ? 'rose' : 'emerald';

                  return (
                    <div
                      key={d.id}
                      className={`bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex flex-col gap-2 transition hover:shadow ${
                        isLunas ? 'opacity-60' : ''
                      }`}
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <p
                            className={`text-[10px] text-${
                              warna === 'rose' ? 'rose-500' : 'emerald-500'
                            } font-bold uppercase tracking-wider`}
                          >
                            {d.jenis}
                          </p>
                          <p className="text-sm font-bold text-gray-900">{d.pihak}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-gray-900 text-sm">{formatRp(d.nominal)}</p>
                          <div className="flex items-center justify-end gap-2.5 mt-1.5">
                            <button
                              className="text-gray-300 hover:text-indigo-600 transition"
                              onClick={() => handleOpenForm('Hutang', d)}
                            >
                              <Edit2 className="w-3 h-3" />
                            </button>
                            <button
                              className="text-gray-300 hover:text-rose-500 transition"
                              onClick={() => handleDebtDelete(d)}
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* Progress bar */}
                      <div className="mt-2">
                        <div className="flex justify-between text-[10px] text-gray-500 mb-1 font-semibold">
                          <span>
                            Terbayar: {formatRp(d.terbayar)} ({persen.toFixed(0)}%)
                          </span>
                          <span>Sisa: {formatRp(sisa)}</span>
                        </div>
                        <div className="w-full bg-gray-100 rounded-full h-1.5 overflow-hidden">
                          <div
                            className={`h-1.5 rounded-full ${
                              warna === 'rose' ? 'bg-rose-500' : 'bg-emerald-500'
                            }`}
                            style={{ width: `${persen}%` }}
                          ></div>
                        </div>
                      </div>

                      {/* Actions footer */}
                      <div className="flex justify-between items-center mt-1 pt-1.5 border-t border-gray-50">
                        <p className="text-[10px] text-gray-500 flex items-center gap-1">
                          <Clock className="w-3 h-3" /> Jatuh Tempo: {d.jatuh_tempo}
                        </p>
                        <div className="flex items-center gap-2">
                          {isLunas ? (
                            <span className="text-[10px] bg-emerald-50 text-emerald-600 px-2 py-1 rounded-md font-bold">
                              Lunas
                            </span>
                          ) : (
                            <div className="flex gap-1.5">
                              <button
                                onClick={() => triggerCicilan(d)}
                                className={`text-[10px] bg-${
                                  warna === 'rose' ? 'rose' : 'emerald'
                                }-50 text-${
                                  warna === 'rose' ? 'rose' : 'emerald'
                                }-600 px-2.5 py-1 rounded-lg font-bold border border-${
                                  warna === 'rose' ? 'rose-200' : 'emerald-200'
                                } hover:bg-${warna}-100 transition`}
                              >
                                Cicil
                              </button>
                              <button
                                onClick={() => handleDebtLunas(d)}
                                className="text-[10px] bg-gray-50 text-gray-600 px-2 py-1 rounded-lg font-bold border border-gray-200 hover:bg-gray-100 transition"
                              >
                                Lunas
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              ) : (
                <p className="text-xs text-gray-400 text-center py-6">
                  Tidak ada catatan hutang/piutang.
                </p>
              )}
            </div>

            {/* Aset Berharga Header */}
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold text-gray-800 text-sm">Aset Berharga</h3>
              <button
                onClick={() => handleOpenForm('Aset')}
                className="text-indigo-600 text-xs font-bold bg-indigo-50 px-3 py-1.5 rounded-full hover:bg-indigo-100 transition"
              >
                + Aset
              </button>
            </div>

            {/* Asset Accordions */}
            <div className="space-y-4">
              {getGroupedAssets().some((g) => g.list.length > 0) ? (
                getGroupedAssets().map((group) => {
                  if (group.list.length === 0) return null;
                  const IconComp = group.icon;
                  const colorClass =
                    group.color === 'amber'
                      ? 'bg-amber-50 text-amber-500'
                      : group.color === 'blue'
                      ? 'bg-blue-50 text-blue-500'
                      : group.color === 'emerald'
                      ? 'bg-emerald-50 text-emerald-500'
                      : group.color === 'purple'
                      ? 'bg-purple-50 text-purple-500'
                      : 'bg-slate-50 text-slate-500';

                  const isOpen = openAssetAccordion[group.id] || false;

                  const toggleAccordion = () => {
                    setOpenAssetAccordion({
                      ...openAssetAccordion,
                      [group.id]: !isOpen,
                    });
                  };

                  return (
                    <div
                      key={group.id}
                      className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden"
                    >
                      <button
                        onClick={toggleAccordion}
                        className="w-full flex items-center justify-between p-4 focus:outline-none hover:bg-gray-50/50 transition"
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-9 h-9 rounded-xl flex items-center justify-center text-sm ${colorClass}`}
                          >
                            <IconComp className="w-5 h-5" />
                          </div>
                          <div className="text-left">
                            <h4 className="font-bold text-gray-900 text-xs">
                              {group.name}{' '}
                              <span className="text-[10px] font-normal text-gray-400">
                                ({group.list.length})
                              </span>
                            </h4>
                            <p className="text-[10px] font-semibold text-gray-600">
                              {formatRp(group.totalVal)}
                            </p>
                          </div>
                        </div>
                        <ChevronDown
                          className={`w-4 h-4 text-gray-400 transition-transform duration-300 ${
                            isOpen ? 'rotate-180' : ''
                          }`}
                        />
                      </button>

                      {isOpen && (
                        <div className="grid grid-cols-2 gap-3 p-4 pt-0 bg-white border-t border-gray-50 animate-[slideDown_0.2s_ease-out_forwards]">
                          {group.list.map((item) => (
                            <div
                              key={item.id}
                              className="bg-gray-50 p-4 rounded-2xl border border-gray-100 relative shadow-sm"
                            >
                              <div className="absolute top-3 right-3 flex gap-1.5">
                                <button
                                  className="text-gray-300 hover:text-indigo-600 transition"
                                  onClick={() => handleOpenForm('Aset', item)}
                                >
                                  <Edit2 className="w-3 h-3" />
                                </button>
                              </div>
                              <p className="text-xs font-bold text-gray-900 truncate pr-6">
                                {item.nama}
                              </p>
                              <p className="text-xs font-bold text-emerald-600 mt-1">
                                {formatRp(item.nilai)}
                              </p>
                              <p className="text-[9px] text-gray-400 mt-1.5 truncate">
                                {item.keterangan || '-'}
                              </p>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })
              ) : (
                <p className="text-xs text-gray-400 text-center py-6">
                  Belum ada aset terdaftar.
                </p>
              )}
            </div>
          </div>
        )}
      </div>

      {/* FLOAT BOTTOM SHEET POPUP FOR TRANSACTION TYPE */}
      {bottomSheetOpen && (
        <div className="absolute inset-0 z-100 flex items-end justify-center">
          <div
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm animate-fade-in"
            onClick={() => setBottomSheetOpen(false)}
          />
          <div className="relative w-full max-w-[480px] bg-white rounded-t-[30px] p-6 shadow-2xl z-110 animate-bottom-sheet-up">
            <div className="w-16 h-1.5 bg-gray-200 rounded-full mx-auto mb-6"></div>
            <div className="grid grid-cols-3 gap-4 mb-4 select-none">
              <div
                className="flex flex-col items-center cursor-pointer group"
                onClick={() => handleOpenForm('Pemasukan')}
              >
                <div className="w-16 h-16 bg-emerald-50 text-emerald-500 rounded-3xl flex items-center justify-center text-2xl mb-2 group-active:scale-95 transition-transform shadow-sm hover:bg-emerald-100">
                  <ArrowDown className="w-6 h-6" />
                </div>
                <p className="text-xs font-bold text-gray-700">Pemasukan</p>
              </div>

              <div
                className="flex flex-col items-center cursor-pointer group"
                onClick={() => handleOpenForm('Pengeluaran')}
              >
                <div className="w-16 h-16 bg-rose-50 text-rose-500 rounded-3xl flex items-center justify-center text-2xl mb-2 group-active:scale-95 transition-transform shadow-sm hover:bg-rose-100">
                  <ArrowUp className="w-6 h-6" />
                </div>
                <p className="text-xs font-bold text-gray-700">Pengeluaran</p>
              </div>

              <div
                className="flex flex-col items-center cursor-pointer group"
                onClick={() => handleOpenForm('Transfer')}
              >
                <div className="w-16 h-16 bg-blue-50 text-blue-500 rounded-3xl flex items-center justify-center text-2xl mb-2 group-active:scale-95 transition-transform shadow-sm hover:bg-blue-100">
                  <ArrowRightLeft className="w-6 h-6" />
                </div>
                <p className="text-xs font-bold text-gray-700">Pindah Dana</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* DYNAMIC FORM MODAL COMPONENT */}
      <FormModal
        isOpen={formModalOpen}
        onClose={() => setFormModalOpen(false)}
        type={formType}
        pockets={pockets}
        editItem={editItem}
        userId={userId}
        onSaveSuccess={fetchData}
      />

      {/* POCKET CICILAN MODAL */}
      {cicilanModalOpen && activeDebt && (
        <div className="absolute inset-0 z-100 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm animate-fade-in"
            onClick={() => setCicilanModalOpen(false)}
          />
          <div className="relative w-full max-w-[480px] sm:max-w-[400px] bg-white rounded-t-[30px] sm:rounded-[24px] p-6 shadow-2xl z-110 flex flex-col animate-modal-scale-up">
            <div className="flex justify-between items-center mb-6">
              <h3 className="font-extrabold text-xl text-gray-900">Bayar Cicilan</h3>
              <button
                onClick={() => setCicilanModalOpen(false)}
                className="w-8 h-8 rounded-full bg-gray-50 hover:bg-gray-100 flex items-center justify-center text-gray-400 hover:text-gray-600 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={submitCicilan} className="space-y-4">
              <div>
                <p className="text-xs text-gray-500 mb-1 px-1">Sisa Kewajiban</p>
                <input
                  type="text"
                  value={formatRp(activeDebt.nominal - activeDebt.terbayar)}
                  className="w-full p-4 bg-gray-100 border border-gray-200 rounded-2xl text-sm font-bold text-gray-700 outline-none"
                  readOnly
                />
              </div>

              <div>
                <p className="text-xs text-gray-500 mb-1 px-1">Nominal Cicilan</p>
                <input
                  type="text"
                  placeholder="Nominal"
                  value={cicilNominal}
                  onChange={(e) =>
                    setCicilNominal(
                      e.target.value
                        .replace(/\D/g, '')
                        .replace(/\B(?=(\d{3})+(?!\d))/g, '.')
                    )
                  }
                  className="w-full p-4 bg-gray-50 border border-gray-200 rounded-2xl text-sm font-medium outline-none focus:border-indigo-600 focus:bg-white focus:ring-2 focus:ring-indigo-100 transition-all"
                  required
                />
              </div>

              <div>
                <p className="text-xs text-gray-500 mb-1 px-1">Sumber/Tujuan Kantong</p>
                <select
                  value={cicilPocket}
                  onChange={(e) => setCicilPocket(e.target.value)}
                  className="w-full p-4 bg-gray-50 border border-gray-200 rounded-2xl text-sm font-medium outline-none focus:border-indigo-600 focus:bg-white focus:ring-2 focus:ring-indigo-100 transition-all"
                  required
                >
                  <option value="" disabled>
                    Pilih Kantong
                  </option>
                  <option value="none">
                    Tanpa Saku (Jangan Potong/Tambah Saldo)
                  </option>
                  {pockets.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.nama}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <p className="text-xs text-gray-500 mb-1 px-1">Tanggal</p>
                <input
                  type="date"
                  value={cicilTanggal}
                  onChange={(e) => setCicilTanggal(e.target.value)}
                  className="w-full p-4 bg-gray-50 border border-gray-200 rounded-2xl text-sm font-medium outline-none focus:border-indigo-600 focus:bg-white focus:ring-2 focus:ring-indigo-100 transition-all"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={submittingCicilan}
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white p-4 rounded-2xl font-bold shadow-lg active:scale-95 transition-transform flex items-center justify-center gap-2"
              >
                {submittingCicilan ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  'Simpan Cicilan'
                )}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* PROFILE SETTINGS MODAL */}
      {profileModalOpen && (
        <div className="absolute inset-0 z-100 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm animate-fade-in"
            onClick={() => setProfileModalOpen(false)}
          />
          <div className="relative w-full max-w-[480px] sm:max-w-[400px] bg-white rounded-t-[30px] sm:rounded-[24px] p-6 shadow-2xl z-110 flex flex-col max-h-[85vh] overflow-y-auto hide-scrollbar animate-modal-scale-up">
            <div className="flex justify-between items-center mb-6">
              <h3 className="font-extrabold text-xl text-gray-900">Pengaturan Profil</h3>
              <button
                onClick={() => setProfileModalOpen(false)}
                className="w-8 h-8 rounded-full bg-gray-50 hover:bg-gray-100 flex items-center justify-center text-gray-400 hover:text-gray-600 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUpdateProfile} className="space-y-4">
              <div className="flex flex-col items-center mb-4">
                <div className="w-20 h-20 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center font-extrabold text-3xl border-4 border-white shadow-md mb-2">
                  {profile ? profile.nama_lengkap.charAt(0).toUpperCase() : 'U'}
                </div>
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                  {profile ? `@${profile.username}` : '@username'}
                </p>
                <p className="text-[10px] text-gray-400">{userEmail}</p>
              </div>

              <div>
                <p className="text-xs text-gray-500 mb-1 px-1">Nama Lengkap</p>
                <input
                  type="text"
                  placeholder="Nama Lengkap"
                  value={profileNama}
                  onChange={(e) => setProfileNama(e.target.value)}
                  className="w-full p-4 bg-gray-50 border border-gray-200 rounded-2xl text-sm font-medium outline-none focus:border-indigo-600 focus:bg-white focus:ring-2 focus:ring-indigo-100 transition-all"
                  required
                />
              </div>

              <div>
                <p className="text-xs text-gray-500 mb-1 px-1">
                  Password Baru (Kosongkan jika tidak diubah)
                </p>
                <div className="relative">
                  <input
                    type={showP1 ? 'text' : 'password'}
                    placeholder="Password Baru"
                    value={profilePass}
                    onChange={(e) => setProfilePass(e.target.value)}
                    className="w-full p-4 bg-gray-50 border border-gray-200 rounded-2xl text-sm font-medium outline-none focus:border-indigo-600 focus:bg-white focus:ring-2 focus:ring-indigo-100 transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowP1(!showP1)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 focus:outline-none"
                  >
                    {showP1 ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              <div>
                <p className="text-xs text-gray-500 mb-1 px-1">Ulangi Password Baru</p>
                <div className="relative">
                  <input
                    type={showP2 ? 'text' : 'password'}
                    placeholder="Ulangi Password Baru"
                    value={profileRepass}
                    onChange={(e) => setProfileRepass(e.target.value)}
                    className="w-full p-4 bg-gray-50 border border-gray-200 rounded-2xl text-sm font-medium outline-none focus:border-indigo-600 focus:bg-white focus:ring-2 focus:ring-indigo-100 transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowP2(!showP2)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 focus:outline-none"
                  >
                    {showP2 ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              {profileError && (
                <p className="text-rose-500 text-xs font-semibold px-2 animate-pulse">
                  {profileError}
                </p>
              )}

              <div className="flex gap-3 pt-4 border-t border-gray-50">
                <button
                  type="button"
                  onClick={() => setProfileModalOpen(false)}
                  className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 p-4 rounded-2xl font-bold transition active:scale-95 text-center text-sm"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={updatingProfile}
                  className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white p-4 rounded-2xl font-bold shadow-lg active:scale-95 transition flex items-center justify-center gap-2 text-sm"
                >
                  {updatingProfile ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    'Simpan'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* BOTTOM NAVIGATION BAR */}
      <div className="absolute bottom-0 w-full bg-white/95 backdrop-blur-md bottom-nav-safe flex justify-between items-center px-6 shadow-lg border-t border-gray-100 z-50 select-none">
        <button
          onClick={() => setActiveTab('beranda')}
          className={`flex flex-col items-center justify-center flex-1 py-2 outline-none transition ${
            activeTab === 'beranda' ? 'text-indigo-600' : 'text-gray-400'
          }`}
        >
          <Home className={`w-5 h-5 mb-1 ${activeTab === 'beranda' ? 'scale-110' : ''}`} />
          <span className="text-[10px] font-bold">Beranda</span>
        </button>

        <button
          onClick={() => setActiveTab('transaksi')}
          className={`flex flex-col items-center justify-center flex-1 py-2 outline-none transition mr-8 ${
            activeTab === 'transaksi' ? 'text-indigo-600' : 'text-gray-400'
          }`}
        >
          <List className={`w-5 h-5 mb-1 ${activeTab === 'transaksi' ? 'scale-110' : ''}`} />
          <span className="text-[10px] font-bold">Riwayat</span>
        </button>

        {/* FAB Plus Button */}
        <div className="absolute left-1/2 -translate-x-1/2 -top-6 z-60">
          <button
            onClick={() => setBottomSheetOpen(true)}
            className="w-14 h-14 bg-gradient-to-br from-indigo-600 to-indigo-500 text-white rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-500/30 transform rotate-45 active:scale-95 transition-all duration-200 hover:shadow-indigo-500/50"
          >
            <Plus className="w-6 h-6 -rotate-45" />
          </button>
        </div>

        <button
          onClick={() => setActiveTab('budget')}
          className={`flex flex-col items-center justify-center flex-1 py-2 outline-none transition ml-8 ${
            activeTab === 'budget' ? 'text-indigo-600' : 'text-gray-400'
          }`}
        >
          <PieChart className={`w-5 h-5 mb-1 ${activeTab === 'budget' ? 'scale-110' : ''}`} />
          <span className="text-[10px] font-bold">Budget</span>
        </button>

        <button
          onClick={() => setActiveTab('lainnya')}
          className={`flex flex-col items-center justify-center flex-1 py-2 outline-none transition ${
            activeTab === 'lainnya' ? 'text-indigo-600' : 'text-gray-400'
          }`}
        >
          <MoreHorizontal className={`w-5 h-5 mb-1 ${activeTab === 'lainnya' ? 'scale-110' : ''}`} />
          <span className="text-[10px] font-bold">Lainnya</span>
        </button>
      </div>
    </div>
  );
}
