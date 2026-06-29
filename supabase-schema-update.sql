-- 1. Create Kategori Table
CREATE TABLE IF NOT EXISTS public.kategori (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  jenis TEXT NOT NULL CHECK (jenis IN ('Pemasukan', 'Pengeluaran')),
  nama_kategori TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(user_id, jenis, nama_kategori)
);

ALTER TABLE public.kategori ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all operations for category owner" ON public.kategori
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- 2. Add urutan field to Kantong Table
ALTER TABLE public.kantong ADD COLUMN IF NOT EXISTS urutan INT NOT NULL DEFAULT 0;
