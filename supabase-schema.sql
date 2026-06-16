-- Supabase Schema for Dompetku Web App
-- Paste this script into your Supabase SQL Editor and run it.

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Profiles Table (Linked to auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nama_lengkap TEXT NOT NULL,
  username TEXT UNIQUE NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Kantong (Pockets) Table
CREATE TABLE IF NOT EXISTS public.kantong (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  nama TEXT NOT NULL,
  saldo_awal BIGINT NOT NULL DEFAULT 0,
  warna TEXT NOT NULL DEFAULT 'blue',
  target_saldo BIGINT DEFAULT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Transaksi (Transactions) Table
CREATE TABLE IF NOT EXISTS public.transaksi (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  jenis TEXT NOT NULL CHECK (jenis IN ('Pemasukan', 'Pengeluaran', 'Transfer')),
  nominal BIGINT NOT NULL CHECK (nominal >= 0),
  kantong_asal_id UUID REFERENCES public.kantong(id) ON DELETE CASCADE,
  kantong_tujuan_id UUID REFERENCES public.kantong(id) ON DELETE CASCADE,
  kategori TEXT NOT NULL,
  tanggal DATE NOT NULL,
  keterangan TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. Budget Table
CREATE TABLE IF NOT EXISTS public.budget (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  kategori TEXT NOT NULL,
  bulan INT NOT NULL CHECK (bulan >= 1 AND bulan <= 12),
  tahun INT NOT NULL,
  nominal BIGINT NOT NULL CHECK (nominal >= 0),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(user_id, kategori, bulan, tahun)
);

-- 5. Hutang (Debts & Receivables) Table
CREATE TABLE IF NOT EXISTS public.hutang (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  jenis TEXT NOT NULL CHECK (jenis IN ('Hutang', 'Piutang')),
  pihak TEXT NOT NULL,
  nominal BIGINT NOT NULL CHECK (nominal >= 0),
  jatuh_tempo DATE NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('Belum Lunas', 'Lunas')) DEFAULT 'Belum Lunas',
  terbayar BIGINT NOT NULL CHECK (terbayar >= 0) DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 6. Aset (Assets) Table
CREATE TABLE IF NOT EXISTS public.aset (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  nama TEXT NOT NULL,
  nilai BIGINT NOT NULL CHECK (nilai >= 0),
  kategori TEXT NOT NULL,
  keterangan TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable Row Level Security (RLS) on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kantong ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transaksi ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.budget ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hutang ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.aset ENABLE ROW LEVEL SECURITY;

-- Set up RLS Policies

-- Profiles Policies
CREATE POLICY "Allow select for profile owner" ON public.profiles
  FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Allow update for profile owner" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

-- Kantong Policies
CREATE POLICY "Allow all operations for pocket owner" ON public.kantong
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Transaksi Policies
CREATE POLICY "Allow all operations for transaction owner" ON public.transaksi
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Budget Policies
CREATE POLICY "Allow all operations for budget owner" ON public.budget
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Hutang Policies
CREATE POLICY "Allow all operations for debt owner" ON public.hutang
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Aset Policies
CREATE POLICY "Allow all operations for asset owner" ON public.aset
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Create trigger function to set up user profile and default pocket on auth signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  -- Insert metadata into profiles
  INSERT INTO public.profiles (id, nama_lengkap, username)
  VALUES (
    new.id,
    coalesce(new.raw_user_meta_data->>'nama_lengkap', 'User Baru'),
    coalesce(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1))
  );

  -- Create default pocket
  INSERT INTO public.kantong (user_id, nama, saldo_awal, warna)
  VALUES (new.id, 'Dompet Utama', 0, 'blue');

  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to execute on signup
CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
