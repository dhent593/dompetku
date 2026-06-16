'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Kantong } from '../lib/types';
import { X, Trash2, Loader2 } from 'lucide-react';

interface FormModalProps {
  isOpen: boolean;
  onClose: () => void;
  type: string; // Pemasukan, Pengeluaran, Transfer, Kantong, Budget, Hutang, Aset
  pockets: Kantong[];
  editItem?: any;
  userId: string;
  onSaveSuccess: () => void;
}

export default function FormModal({
  isOpen,
  onClose,
  type,
  pockets,
  editItem,
  userId,
  onSaveSuccess,
}: FormModalProps) {
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Form Fields State
  const [kantong, setKantong] = useState('');
  const [kantongTujuan, setKantongTujuan] = useState('');
  const [nominal, setNominal] = useState('');
  const [kategori, setKategori] = useState('');
  const [tanggal, setTanggal] = useState('');
  const [keterangan, setKeterangan] = useState('');

  // Pocket form states
  const [warna, setWarna] = useState('blue');

  // Budget form states
  const [bulan, setBulan] = useState('');
  const [tahun, setTahun] = useState('');

  // Debt/Asset custom options
  const [pihak, setPihak] = useState('');
  const [potongKantong, setPotongKantong] = useState(false);
  const [kantongAsalId, setKantongAsalId] = useState('');

  useEffect(() => {
    setErrorMsg('');
    setLoading(false);

    if (isOpen) {
      const today = new Date().toISOString().split('T')[0];
      setTanggal(today);

      if (editItem) {
        // Populate edit values
        if (type === 'Pemasukan') {
          setKantong(editItem.kantong_tujuan_id || '');
          setNominal(formatNumberWithDots(editItem.nominal));
          setKategori(editItem.kategori || '');
          setTanggal(editItem.tanggal);
          setKeterangan(editItem.keterangan || '');
        } else if (type === 'Pengeluaran') {
          setKantong(editItem.kantong_asal_id || '');
          setNominal(formatNumberWithDots(editItem.nominal));
          setKategori(editItem.kategori || '');
          setTanggal(editItem.tanggal);
          setKeterangan(editItem.keterangan || '');
        } else if (type === 'Transfer') {
          setKantong(editItem.kantong_asal_id || '');
          setKantongTujuan(editItem.kantong_tujuan_id || '');
          setNominal(formatNumberWithDots(editItem.nominal));
          setTanggal(editItem.tanggal);
          setKeterangan(editItem.keterangan || '');
        } else if (type === 'Kantong') {
          setKategori(editItem.nama || ''); // Name stored in kategori state for convenience or separately
          setNominal(formatNumberWithDots(editItem.saldo_awal));
          setWarna(editItem.warna || 'blue');
        } else if (type === 'Budget') {
          setKategori(editItem.kategori || '');
          setNominal(formatNumberWithDots(editItem.nominal));
          setBulan(String(editItem.bulan).padStart(2, '0'));
          setTahun(String(editItem.tahun));
        } else if (type === 'Hutang') {
          setWarna(editItem.jenis || 'Hutang'); // Reuse warna state for debt type
          setPihak(editItem.pihak || '');
          setNominal(formatNumberWithDots(editItem.nominal));
          setTanggal(editItem.jatuh_tempo);
        } else if (type === 'Aset') {
          setKategori(editItem.kategori || '');
          setKeterangan(editItem.nama || ''); // asset name
          setNominal(formatNumberWithDots(editItem.nilai));
          setTanggal(editItem.keterangan || ''); // custom notes
        }
      } else {
        // Reset states for adding
        setKantong('');
        setKantongTujuan('');
        setNominal('');
        setKategori('');
        setKeterangan('');
        setWarna(type === 'Hutang' ? 'Hutang' : 'blue');
        setBulan(String(new Date().getMonth() + 1).padStart(2, '0'));
        setTahun(String(new Date().getFullYear()));
        setPihak('');
        setPotongKantong(false);
        setKantongAsalId('');
      }
    }
  }, [isOpen, editItem, type]);

  if (!isOpen) return null;

  const formatNumberWithDots = (val: number | string) => {
    if (val === undefined || val === null) return '';
    let clean = val.toString().replace(/\D/g, '');
    if (!clean) return '';
    return clean.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  };

  const getRawNumber = (val: string) => {
    if (!val) return 0;
    return parseInt(val.replace(/\./g, '')) || 0;
  };

  const handleNominalInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatNumberWithDots(e.target.value);
    setNominal(formatted);
  };

  const handleDelete = async () => {
    if (!editItem) return;
    if (!confirm('Apakah Anda yakin ingin menghapus data ini?')) return;

    setLoading(true);
    setErrorMsg('');

    try {
      let tbl = '';
      if (type === 'Pemasukan' || type === 'Pengeluaran' || type === 'Transfer') {
        tbl = 'transaksi';
      } else if (type === 'Kantong') {
        tbl = 'kantong';
      } else if (type === 'Budget') {
        tbl = 'budget';
      } else if (type === 'Hutang') {
        tbl = 'hutang';
      } else if (type === 'Aset') {
        tbl = 'aset';
      }

      const { error } = await supabase.from(tbl).delete().eq('id', editItem.id);
      if (error) throw error;

      onSaveSuccess();
      onClose();
    } catch (e: any) {
      console.error(e);
      setErrorMsg(e.message || 'Gagal menghapus data.');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    const rawNominal = getRawNumber(nominal);
    if (rawNominal <= 0 && type !== 'Transfer') {
      setErrorMsg('Nominal harus lebih besar dari 0!');
      return;
    }

    setLoading(true);

    try {
      if (type === 'Pemasukan' || type === 'Pengeluaran') {
        const pocketId = kantong;
        if (!pocketId) throw new Error('Silakan pilih kantong!');

        const payload: any = {
          user_id: userId,
          jenis: type,
          nominal: rawNominal,
          kategori,
          tanggal,
          keterangan: keterangan || '-',
          kantong_asal_id: type === 'Pengeluaran' ? pocketId : null,
          kantong_tujuan_id: type === 'Pemasukan' ? pocketId : null,
        };

        if (editItem) {
          const { error } = await supabase.from('transaksi').update(payload).eq('id', editItem.id);
          if (error) throw error;
        } else {
          const { error } = await supabase.from('transaksi').insert([payload]);
          if (error) throw error;
        }
      } else if (type === 'Transfer') {
        if (!kantong || !kantongTujuan) throw new Error('Pockets asal dan tujuan harus diisi!');
        if (kantong === kantongTujuan) throw new Error('Kantong asal dan tujuan tidak boleh sama!');

        const payload: any = {
          user_id: userId,
          jenis: 'Transfer',
          nominal: rawNominal,
          kategori: 'Transfer Internal',
          tanggal,
          keterangan: keterangan || '-',
          kantong_asal_id: kantong,
          kantong_tujuan_id: kantongTujuan,
        };

        if (editItem) {
          const { error } = await supabase.from('transaksi').update(payload).eq('id', editItem.id);
          if (error) throw error;
        } else {
          const { error } = await supabase.from('transaksi').insert([payload]);
          if (error) throw error;
        }
      } else if (type === 'Kantong') {
        const payload: any = {
          user_id: userId,
          nama: kategori, // Name stored in kategori state
          saldo_awal: rawNominal,
          warna,
        };

        if (editItem) {
          const { error } = await supabase.from('kantong').update(payload).eq('id', editItem.id);
          if (error) throw error;
        } else {
          const { error } = await supabase.from('kantong').insert([payload]);
          if (error) throw error;
        }
      } else if (type === 'Budget') {
        const payload: any = {
          user_id: userId,
          kategori,
          bulan: parseInt(bulan),
          tahun: parseInt(tahun),
          nominal: rawNominal,
        };

        if (editItem) {
          const { error } = await supabase.from('budget').update(payload).eq('id', editItem.id);
          if (error) throw error;
        } else {
          const { error } = await supabase.from('budget').insert([payload]);
          if (error) {
            if (error.code === '23505') {
              throw new Error('Budget untuk kategori dan bulan ini sudah diatur!');
            }
            throw error;
          }
        }
      } else if (type === 'Hutang') {
        // warna state holds Hutang/Piutang choice
        const statusVal = editItem ? editItem.status : 'Belum Lunas';
        const terbayarVal = editItem ? editItem.terbayar : 0;

        const payload: any = {
          user_id: userId,
          jenis: warna,
          pihak,
          nominal: rawNominal,
          jatuh_tempo: tanggal,
          status: statusVal,
          terbayar: terbayarVal,
        };

        if (editItem) {
          if (terbayarVal >= rawNominal) payload.status = 'Lunas';
          else payload.status = 'Belum Lunas';

          const { error } = await supabase.from('hutang').update(payload).eq('id', editItem.id);
          if (error) throw error;
        } else {
          // Insert Debt
          const { data, error } = await supabase.from('hutang').insert([payload]).select();
          if (error) throw error;

          // If Piutang and deduct pocket is selected
          if (warna === 'Piutang' && potongKantong && kantongAsalId) {
            const transPayload = {
              user_id: userId,
              jenis: 'Pengeluaran',
              nominal: rawNominal,
              kantong_asal_id: kantongAsalId,
              kategori: 'Lainnya',
              tanggal: new Date().toISOString().split('T')[0],
              keterangan: `Pemberian Piutang ke: ${pihak}`,
            };
            const { error: transErr } = await supabase.from('transaksi').insert([transPayload]);
            if (transErr) throw transErr;
          }
        }
      } else if (type === 'Aset') {
        const payload: any = {
          user_id: userId,
          kategori,
          nama: keterangan, // Name stored in keterangan
          nilai: rawNominal,
          keterangan: tanggal, // Custom notes in tanggal field for Aset
        };

        if (editItem) {
          const { error } = await supabase.from('aset').update(payload).eq('id', editItem.id);
          if (error) throw error;
        } else {
          // Insert Asset
          const { error } = await supabase.from('aset').insert([payload]);
          if (error) throw error;

          // Deduct from pocket if selected
          if (potongKantong && kantongAsalId) {
            const transPayload = {
              user_id: userId,
              jenis: 'Pengeluaran',
              nominal: rawNominal,
              kantong_asal_id: kantongAsalId,
              kategori: 'Lainnya',
              tanggal: new Date().toISOString().split('T')[0],
              keterangan: `Pembelian Aset: ${keterangan}`,
            };
            const { error: transErr } = await supabase.from('transaksi').insert([transPayload]);
            if (transErr) throw transErr;
          }
        }
      }

      onSaveSuccess();
      onClose();
    } catch (e: any) {
      console.error(e);
      setErrorMsg(e.message || 'Gagal menyimpan data.');
    } finally {
      setLoading(false);
    }
  };

  const inputClass =
    'w-full p-4 bg-gray-50 border border-gray-200 rounded-2xl text-sm font-medium outline-none focus:border-indigo-600 focus:bg-white focus:ring-2 focus:ring-indigo-100 transition-all duration-200';

  return (
    <div className="absolute inset-0 z-100 flex items-end sm:items-center justify-center p-0 sm:p-4 select-none">
      {/* Overlay backdrop */}
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm animate-fade-in" onClick={onClose} />

      {/* Modal Content */}
      <div className="relative w-full max-w-[480px] sm:max-w-[400px] bg-white rounded-t-[30px] sm:rounded-[24px] p-6 shadow-2xl flex flex-col max-h-[85vh] overflow-y-auto hide-scrollbar z-110 animate-modal-scale-up">
        <div className="flex justify-between items-center mb-6">
          <h3 className="font-extrabold text-xl text-gray-900">
            {editItem ? 'Edit' : 'Catat'} {type === 'Transfer' ? 'Pindah Dana' : type}
          </h3>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-gray-50 hover:bg-gray-100 flex items-center justify-center text-gray-400 hover:text-gray-600 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 flex-grow">
          {/* 1. Transaction form: Pemasukan / Pengeluaran */}
          {(type === 'Pemasukan' || type === 'Pengeluaran') && (
            <>
              <div>
                <select
                  value={kantong}
                  onChange={(e) => setKantong(e.target.value)}
                  className={inputClass}
                  required
                >
                  <option value="" disabled>
                    {type === 'Pemasukan' ? 'Pilih Kantong Tujuan' : 'Pilih Kantong Asal'}
                  </option>
                  {pockets.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.nama}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <input
                  type="text"
                  placeholder="Nominal"
                  value={nominal}
                  onChange={handleNominalInput}
                  className={inputClass}
                  required
                />
              </div>

              <div>
                <select
                  value={kategori}
                  onChange={(e) => setKategori(e.target.value)}
                  className={inputClass}
                  required
                >
                  <option value="" disabled>
                    Pilih Kategori
                  </option>
                  {type === 'Pemasukan' ? (
                    <>
                      <option value="Gaji">Gaji</option>
                      <option value="Investasi">Investasi</option>
                      <option value="Freelance">Freelance</option>
                      <option value="Hadiah">Hadiah</option>
                      <option value="Lainnya">Lainnya</option>
                    </>
                  ) : (
                    <>
                      <option value="Makan">Makan</option>
                      <option value="Jajan">Jajan</option>
                      <option value="Self Reward">Self Reward</option>
                      <option value="Beli Barang">Beli Barang</option>
                      <option value="Hiburan">Hiburan</option>
                      <option value="Transport">Transport</option>
                      <option value="Lainnya">Lainnya</option>
                    </>
                  )}
                </select>
              </div>

              <div>
                <input
                  type="date"
                  value={tanggal}
                  onChange={(e) => setTanggal(e.target.value)}
                  className={inputClass}
                  required
                />
              </div>

              <div>
                <input
                  type="text"
                  placeholder="Keterangan"
                  value={keterangan}
                  onChange={(e) => setKeterangan(e.target.value)}
                  className={inputClass}
                />
              </div>
            </>
          )}

          {/* 2. Transfer form */}
          {type === 'Transfer' && (
            <>
              <div>
                <select
                  value={kantong}
                  onChange={(e) => setKantong(e.target.value)}
                  className={inputClass}
                  required
                >
                  <option value="" disabled>
                    Dari Kantong
                  </option>
                  {pockets.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.nama}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <select
                  value={kantongTujuan}
                  onChange={(e) => setKantongTujuan(e.target.value)}
                  className={inputClass}
                  required
                >
                  <option value="" disabled>
                    Ke Kantong
                  </option>
                  {pockets.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.nama}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <input
                  type="text"
                  placeholder="Nominal Transfer"
                  value={nominal}
                  onChange={handleNominalInput}
                  className={inputClass}
                  required
                />
              </div>

              <div>
                <input
                  type="date"
                  value={tanggal}
                  onChange={(e) => setTanggal(e.target.value)}
                  className={inputClass}
                  required
                />
              </div>

              <div>
                <input
                  type="text"
                  placeholder="Keterangan (Opsional)"
                  value={keterangan}
                  onChange={(e) => setKeterangan(e.target.value)}
                  className={inputClass}
                />
              </div>
            </>
          )}

          {/* 3. Pocket form */}
          {type === 'Kantong' && (
            <>
              <div>
                <input
                  type="text"
                  placeholder="Nama Kantong (BCA, Gopay, dll)"
                  value={kategori} // map name to kategori
                  onChange={(e) => setKategori(e.target.value)}
                  className={inputClass}
                  required
                />
              </div>

              <div>
                <input
                  type="text"
                  placeholder="Saldo Awal"
                  value={nominal}
                  onChange={handleNominalInput}
                  className={inputClass}
                  required
                />
              </div>

              <div>
                <select
                  value={warna}
                  onChange={(e) => setWarna(e.target.value)}
                  className={inputClass}
                  required
                >
                  <option value="blue">Biru (Default)</option>
                  <option value="green">Hijau</option>
                  <option value="red">Merah</option>
                  <option value="dark">Hitam</option>
                  <option value="purple">Ungu</option>
                  <option value="orange">Oranye</option>
                  <option value="yellow">Kuning</option>
                  <option value="gray">Abu-Abu</option>
                </select>
              </div>
            </>
          )}

          {/* 4. Budget form */}
          {type === 'Budget' && (
            <>
              <div>
                <select
                  value={kategori}
                  onChange={(e) => setKategori(e.target.value)}
                  className={inputClass}
                  required
                >
                  <option value="" disabled>
                    Pilih Kategori Budget
                  </option>
                  <option value="Makan">Makan</option>
                  <option value="Jajan">Jajan</option>
                  <option value="Self Reward">Self Reward</option>
                  <option value="Beli Barang">Beli Barang</option>
                  <option value="Hiburan">Hiburan</option>
                  <option value="Transport">Transport</option>
                  <option value="Lainnya">Lainnya</option>
                </select>
              </div>

              <div>
                <input
                  type="text"
                  placeholder="Nominal Budget"
                  value={nominal}
                  onChange={handleNominalInput}
                  className={inputClass}
                  required
                />
              </div>

              <div className="flex gap-2">
                <input
                  type="number"
                  placeholder="Bulan (01-12)"
                  value={bulan}
                  onChange={(e) => setBulan(e.target.value)}
                  className={`${inputClass} w-1/3`}
                  required
                  min="1"
                  max="12"
                />
                <input
                  type="number"
                  placeholder="Tahun"
                  value={tahun}
                  onChange={(e) => setTahun(e.target.value)}
                  className={`${inputClass} w-2/3`}
                  required
                />
              </div>
            </>
          )}

          {/* 5. Debt / Receivables form */}
          {type === 'Hutang' && (
            <>
              <div>
                <select
                  value={warna} // using warna to save Hutang vs Piutang choice
                  onChange={(e) => setWarna(e.target.value)}
                  className={inputClass}
                  required
                >
                  <option value="Hutang">Saya Berhutang</option>
                  <option value="Piutang">Orang Berhutang Ke Saya (Piutang)</option>
                </select>
              </div>

              <div>
                <input
                  type="text"
                  placeholder="Nama Orang/Pihak"
                  value={pihak}
                  onChange={(e) => setPihak(e.target.value)}
                  className={inputClass}
                  required
                />
              </div>

              <div>
                <input
                  type="text"
                  placeholder="Nominal"
                  value={nominal}
                  onChange={handleNominalInput}
                  className={inputClass}
                  required
                />
              </div>

              <div>
                <p className="text-xs text-gray-500 mb-1 px-1">Jatuh Tempo</p>
                <input
                  type="date"
                  value={tanggal}
                  onChange={(e) => setTanggal(e.target.value)}
                  className={inputClass}
                  required
                />
              </div>

              {!editItem && warna === 'Piutang' && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 mt-2 px-1">
                    <input
                      type="checkbox"
                      id="f-potong-kantong"
                      checked={potongKantong}
                      onChange={(e) => setPotongKantong(e.target.checked)}
                      className="w-4 h-4 text-indigo-600 rounded border-gray-300 focus:ring-indigo-500"
                    />
                    <label htmlFor="f-potong-kantong" className="text-xs font-semibold text-gray-700">
                      Potong dari Saldo Kantong
                    </label>
                  </div>
                  {potongKantong && (
                    <div className="animate-[slideDown_0.2s_ease-out_forwards]">
                      <select
                        value={kantongAsalId}
                        onChange={(e) => setKantongAsalId(e.target.value)}
                        className={inputClass}
                        required
                      >
                        <option value="" disabled>
                          Pilih Kantong untuk Dipotong
                        </option>
                        {pockets.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.nama}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>
              )}
            </>
          )}

          {/* 6. Asset form */}
          {type === 'Aset' && (
            <>
              <div>
                <select
                  value={kategori}
                  onChange={(e) => setKategori(e.target.value)}
                  className={inputClass}
                  required
                >
                  <option value="" disabled>
                    Pilih Kategori Aset
                  </option>
                  <option value="Emas & Perhiasan">Emas & Perhiasan</option>
                  <option value="Tabungan & Simpanan">Tabungan & Simpanan</option>
                  <option value="Investasi (Saham/Reksa Dana)">Investasi (Saham/Reksa Dana)</option>
                  <option value="Properti & Tanah">Properti & Tanah</option>
                  <option value="Barang Berharga Lainnya">Barang Berharga Lainnya</option>
                </select>
              </div>

              <div>
                <input
                  type="text"
                  placeholder="Nama Aset (Emas, Saham, dll)"
                  value={keterangan} // mapped to keterangan
                  onChange={(e) => setKeterangan(e.target.value)}
                  className={inputClass}
                  required
                />
              </div>

              <div>
                <input
                  type="text"
                  placeholder="Estimasi Nilai (Rp)"
                  value={nominal}
                  onChange={handleNominalInput}
                  className={inputClass}
                  required
                />
              </div>

              <div>
                <input
                  type="text"
                  placeholder="Keterangan Tambahan"
                  value={tanggal} // mapped to tanggal state
                  onChange={(e) => setTanggal(e.target.value)}
                  className={inputClass}
                />
              </div>

              {!editItem && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 mt-2 px-1">
                    <input
                      type="checkbox"
                      id="f-potong-kantong"
                      checked={potongKantong}
                      onChange={(e) => setPotongKantong(e.target.checked)}
                      className="w-4 h-4 text-indigo-600 rounded border-gray-300 focus:ring-indigo-500"
                    />
                    <label htmlFor="f-potong-kantong" className="text-xs font-semibold text-gray-700">
                      Potong dari Saldo Kantong
                    </label>
                  </div>
                  {potongKantong && (
                    <div className="animate-[slideDown_0.2s_ease-out_forwards]">
                      <select
                        value={kantongAsalId}
                        onChange={(e) => setKantongAsalId(e.target.value)}
                        className={inputClass}
                        required
                      >
                        <option value="" disabled>
                          Pilih Kantong untuk Dipotong
                        </option>
                        {pockets.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.nama}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>
              )}
            </>
          )}

          {errorMsg && (
            <p className="text-rose-500 text-xs font-semibold px-2 animate-pulse">{errorMsg}</p>
          )}

          <div className="flex gap-3 pt-4 border-t border-gray-100">
            {editItem && (
              <button
                type="button"
                onClick={handleDelete}
                disabled={loading}
                className="flex-shrink-0 bg-rose-50 hover:bg-rose-100 text-rose-600 p-4 rounded-2xl font-bold flex items-center justify-center transition active:scale-95"
              >
                <Trash2 className="w-5 h-5" />
              </button>
            )}

            <button
              type="submit"
              disabled={loading}
              className="flex-grow bg-indigo-600 hover:bg-indigo-700 text-white p-4 rounded-2xl font-bold shadow-lg transition-all active:scale-95 flex items-center justify-center gap-2"
            >
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : editItem ? (
                'Perbarui Data'
              ) : (
                'Simpan Data'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
