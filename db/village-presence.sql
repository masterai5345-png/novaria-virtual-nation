-- Presence is temporary location sharing while a logged-in citizen is in the village.
-- No IP address, email, or provider token stored or returned.
CREATE TABLE IF NOT EXISTS village_presence (
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
 epoch_id UUID NOT NULL REFERENCES village_epochs(id),
 citizen_id UUID NOT NULL UNIQUE REFERENCES citizens(id) ON DELETE CASCADE,
 x DOUBLE PRECISION NOT NULL DEFAULT 0 CHECK (x BETWEEN -48 AND 48),
 z DOUBLE PRECISION NOT NULL DEFAULT 0 CHECK (z BETWEEN -48 AND 48),
 activity TEXT NOT NULL DEFAULT 'idle' CHECK(activity IN ('idle','walk','sit','wave')),
 updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS village_presence_recent_idx ON village_presence (epoch_id,updated_at DESC);
