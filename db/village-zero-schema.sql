-- SKEMA EKSPERIMEN DESA NOL
-- TIDAK dimasukkan ke db/schema.sql agar migrasi produksi tidak berubah.
-- Hanya terapkan setelah review dan persetujuan pemilik. Tidak mengubah tabel rumah NOVARIA lama.
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS village_epochs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  nama TEXT NOT NULL DEFAULT 'Desa Nol',
  status TEXT NOT NULL DEFAULT 'rancangan' CHECK (status IN ('rancangan','berjalan','arsip')),
  started_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS village_votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  epoch_id UUID NOT NULL REFERENCES village_epochs(id),
  platform TEXT NOT NULL DEFAULT 'instagram' CHECK (platform IN ('instagram')),
  source_account_id TEXT NOT NULL,
  media_id TEXT NOT NULL,
  comment_id TEXT NOT NULL,
  voter_id TEXT NOT NULL,
  vote_day DATE NOT NULL,
  option_key TEXT NOT NULL CHECK (option_key IN ('BUILD HOUSE','BUILD ROAD','PLANT TREE','BUILD PARK','BUILD SHOP')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (platform, source_account_id, comment_id),
  UNIQUE (epoch_id, vote_day, voter_id)
);

CREATE INDEX IF NOT EXISTS village_votes_daily_idx ON village_votes(epoch_id,vote_day,option_key);

CREATE TABLE IF NOT EXISTS village_vote_results (
  epoch_id UUID NOT NULL REFERENCES village_epochs(id),
  vote_day DATE NOT NULL,
  winning_option TEXT NOT NULL CHECK(winning_option IN ('BUILD HOUSE','BUILD ROAD','PLANT TREE','BUILD PARK','BUILD SHOP')),
  winning_votes INTEGER NOT NULL CHECK(winning_votes>0),
  total_votes INTEGER NOT NULL CHECK(total_votes>=winning_votes),
  approved_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY(epoch_id,vote_day)
);

CREATE TABLE IF NOT EXISTS village_objects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  epoch_id UUID NOT NULL REFERENCES village_epochs(id),
  result_day DATE NOT NULL,
  action_key TEXT NOT NULL CHECK(action_key IN ('BUILD HOUSE','BUILD ROAD','PLANT TREE','BUILD PARK','BUILD SHOP')),
  grid_x INTEGER NOT NULL,
  grid_z INTEGER NOT NULL,
  config JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(epoch_id,grid_x,grid_z),
  UNIQUE(epoch_id,result_day)
);

-- Desa dimulai tanpa objek dan rumah; jangan seed bangunan saat Day 0.
CREATE TABLE IF NOT EXISTS village_homes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  epoch_id UUID NOT NULL REFERENCES village_epochs(id),
  village_object_id UUID NOT NULL UNIQUE REFERENCES village_objects(id),
  citizen_id UUID UNIQUE REFERENCES citizens(id),
  status TEXT NOT NULL DEFAULT 'tersedia' CHECK(status IN ('tersedia','diklaim','ditutup')),
  claimed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Tidak ada kewajiban subscribe YouTube untuk memiliki rumah:
-- YouTube melarang memberikan hadiah sebagai imbalan atas subscribe.
-- Identitas warga menggunakan login Google yang sudah ada.
