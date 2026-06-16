# Dompetku - Digital Wallet Web Application

Aplikasi pencatatan keuangan pribadi multi-user yang cepat, ringan, dan elegan. Proyek ini dimigrasi dari Google Apps Script ke **Next.js (App Router)** dan **Supabase** sebagai basis datanya, siap untuk dihosting di **Vercel**.

---

## 🚀 Fitur Utama
- **Autentikasi Multi-User**: Login dan register berbasis username menggunakan Supabase Auth (simulasi email virtual).
- **Dasbor Finansial Real-time**: Menampilkan total saldo gabungan seluruh kantong, pemasukan, dan pengeluaran bulan berjalan.
- **Kantong Dana (Multi-Wallet)**: Membuat beberapa saku dana (BCA, GoPay, Tunai, dll) dengan warna khusus.
- **Pencatatan Transaksi Dinamis**: Pemasukan, pengeluaran, dan transfer internal antar kantong.
- **Budgeting Kategori**: Membatasi pengeluaran bulanan per kategori dengan progress bar visual (merah/kuning/indigo).
- **Hutang & Piutang**: Mencatat tagihan aktif beserta alur cicilan dan pelunasan yang memotong/menambah saldo kantong otomatis.
- **Aset Berharga**: Pengelompokan kepemilikan aset (Emas, Investasi, Properti, dll) menggunakan layout accordion.

---

## 🛠️ Tech Stack
- **Frontend**: Next.js 15 (App Router), React 19, TypeScript
- **Styling**: Tailwind CSS
- **Icon**: Lucide React
- **Backend & Database**: Supabase (PostgreSQL, Row Level Security, Auth)
- **Hosting**: Vercel

---

## 📦 Panduan Pengaturan Lokal

### 1. Klon Repositori & Instal Dependensi
```bash
npm install
```

### 2. Pengaturan Berkas Lingkungan (Environment Variables)
Salin berkas `.env.local.example` menjadi `.env.local`:
```bash
cp .env.local.example .env.local
```
Buka `.env.local` dan masukkan kredensial API Supabase Anda:
```env
NEXT_PUBLIC_SUPABASE_URL=https://<project-id>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<kunci-anon-public-anda>
```

### 3. Migrasi Database di Supabase
1. Buka dashboard proyek **Supabase** Anda.
2. Pilih menu **SQL Editor** pada panel kiri.
3. Klik **New query** (Kueri baru) dan tempelkan seluruh isi dari berkas [`supabase-schema.sql`](./supabase-schema.sql).
4. Klik **Run** untuk membuat semua tabel, relasi, indeks, aturan RLS, dan trigger profil/kantong otomatis.

### 4. Jalankan Server Pengembangan
```bash
npm run dev
```
Buka browser dan akses [http://localhost:3000](http://localhost:3000).

---

## 🌐 Panduan Deploy ke Vercel

1. Hubungkan repositori Git Anda (GitHub/GitLab) ke akun Vercel.
2. Buat proyek baru di Vercel dan hubungkan ke repositori tersebut.
3. Di bagian **Environment Variables** proyek Vercel, tambahkan dua kunci berikut:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
4. Klik **Deploy**. Vercel akan otomatis melakukan kompilasi build production dan merilisnya secara publik.

---

## 📄 Skema Database
Database didesain dengan tingkat keamanan tinggi menggunakan **Row-Level Security (RLS)** PostgreSQL. Pengguna hanya dapat membaca dan memodifikasi data milik mereka sendiri berdasarkan kecocokan ID pengguna (`auth.uid() = user_id`).

Skema tabel selengkapnya dapat dipelajari di berkas [`supabase-schema.sql`](./supabase-schema.sql).
