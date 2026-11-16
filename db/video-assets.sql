-- Deterministic native-rendered NOVARIA 30-second video files.
-- Short retention to protect the existing small Postgres plan.
CREATE TABLE IF NOT EXISTS novaria_video_assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content_key TEXT NOT NULL UNIQUE,
  video_bytes BYTEA NOT NULL,
  bytes INTEGER NOT NULL CHECK(bytes BETWEEN 5000 AND 3000000),
  duration_seconds INTEGER NOT NULL DEFAULT 30 CHECK(duration_seconds=30),
  render_mode TEXT NOT NULL DEFAULT 'native-ffmpeg-no-ai',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS novaria_video_assets_created_idx ON novaria_video_assets(created_at DESC);
