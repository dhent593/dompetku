export interface Profile {
  id: string;
  nama_lengkap: string;
  username: string;
  updated_at: string;
}

export interface Kantong {
  id: string;
  user_id: string;
  nama: string;
  saldo_awal: number;
  warna: string;
  created_at: string;
}

export interface Transaksi {
  id: string;
  user_id: string;
  jenis: 'Pemasukan' | 'Pengeluaran' | 'Transfer';
  nominal: number;
  kantong_asal_id: string | null;
  kantong_tujuan_id: string | null;
  kategori: string;
  tanggal: string; // YYYY-MM-DD
  keterangan: string | null;
  created_at: string;
}

export interface Budget {
  id: string;
  user_id: string;
  kategori: string;
  bulan: number;
  tahun: number;
  nominal: number;
  created_at: string;
}

export interface Hutang {
  id: string;
  user_id: string;
  jenis: 'Hutang' | 'Piutang';
  pihak: string;
  nominal: number;
  jatuh_tempo: string; // YYYY-MM-DD
  status: 'Belum Lunas' | 'Lunas';
  terbayar: number;
  created_at: string;
}

export interface Aset {
  id: string;
  user_id: string;
  nama: string;
  nilai: number;
  kategori: string;
  keterangan: string | null;
  created_at: string;
}
