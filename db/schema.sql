-- NOVARIA PostgreSQL foundation schema
-- Apply to a fresh PostgreSQL database. This migration creates persistence structures only;
-- it does not connect the application to a database or enable live automations.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS citizens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_provider TEXT,
  auth_subject TEXT,
  email TEXT,
  display_name TEXT NOT NULL,
  avatar_species TEXT NOT NULL DEFAULT 'otter' CHECK (avatar_species = 'otter'),
  avatar_style JSONB NOT NULL DEFAULT '{}'::jsonb,
  account_role TEXT NOT NULL DEFAULT 'citizen'
    CHECK (account_role IN ('citizen', 'moderator', 'admin', 'owner')),
  account_status TEXT NOT NULL DEFAULT 'active'
    CHECK (account_status IN ('active', 'suspended', 'deleted')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT citizens_auth_identity_unique UNIQUE (auth_provider, auth_subject)
);

CREATE INDEX IF NOT EXISTS citizens_created_at_idx ON citizens (created_at DESC);
CREATE INDEX IF NOT EXISTS citizens_status_idx ON citizens (account_status);

CREATE TABLE IF NOT EXISTS city_leaders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  leader_key TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  species TEXT NOT NULL DEFAULT 'otter' CHECK (species = 'otter'),
  title TEXT NOT NULL DEFAULT 'Mayor',
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  profile JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Only one active mayor may exist at a time.
CREATE UNIQUE INDEX IF NOT EXISTS city_one_active_mayor_idx
  ON city_leaders (is_active) WHERE is_active = TRUE;

CREATE TABLE IF NOT EXISTS districts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  district_type TEXT NOT NULL
    CHECK (district_type IN ('government', 'residential', 'commercial', 'social', 'industrial', 'entertainment', 'premium', 'harbor')),
  description TEXT NOT NULL DEFAULT '',
  map_config JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS home_plots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  district_id UUID NOT NULL REFERENCES districts(id),
  plot_key TEXT NOT NULL UNIQUE,
  position_x NUMERIC(10, 3) NOT NULL,
  position_z NUMERIC(10, 3) NOT NULL,
  rotation_y NUMERIC(10, 3) NOT NULL DEFAULT 0,
  plot_status TEXT NOT NULL DEFAULT 'available'
    CHECK (plot_status IN ('available', 'reserved', 'built', 'inactive')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS houses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plot_id UUID NOT NULL UNIQUE REFERENCES home_plots(id),
  owner_citizen_id UUID REFERENCES citizens(id) ON DELETE SET NULL,
  house_type TEXT NOT NULL
    CHECK (house_type IN ('starter', 'family', 'premium', 'patron')),
  design_key TEXT NOT NULL,
  house_status TEXT NOT NULL DEFAULT 'community'
    CHECK (house_status IN ('community', 'claimed', 'vacant', 'inactive')),
  visual_config JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS houses_owner_idx ON houses (owner_citizen_id);
CREATE INDEX IF NOT EXISTS houses_status_idx ON houses (house_status);

CREATE TABLE IF NOT EXISTS follower_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  platform TEXT NOT NULL CHECK (platform IN ('youtube', 'instagram', 'facebook', 'tiktok')),
  source_account_id TEXT NOT NULL,
  snapshot_date DATE NOT NULL,
  follower_count BIGINT NOT NULL CHECK (follower_count >= 0),
  gained BIGINT NOT NULL DEFAULT 0 CHECK (gained >= 0),
  lost BIGINT NOT NULL DEFAULT 0 CHECK (lost >= 0),
  net_change BIGINT NOT NULL DEFAULT 0,
  accuracy_note TEXT NOT NULL DEFAULT '',
  source_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT follower_snapshot_source_day_unique UNIQUE (platform, source_account_id, snapshot_date)
);

CREATE INDEX IF NOT EXISTS follower_snapshots_day_idx ON follower_snapshots (snapshot_date DESC);

CREATE TABLE IF NOT EXISTS construction_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  idempotency_key TEXT NOT NULL UNIQUE,
  platform TEXT NOT NULL,
  source_account_id TEXT NOT NULL,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  follower_delta INTEGER NOT NULL CHECK (follower_delta >= 0),
  houses_requested INTEGER NOT NULL CHECK (houses_requested >= 0),
  houses_created INTEGER NOT NULL DEFAULT 0 CHECK (houses_created >= 0),
  event_status TEXT NOT NULL DEFAULT 'pending'
    CHECK (event_status IN ('pending', 'planned', 'completed', 'partially_completed', 'failed', 'cancelled')),
  details JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS construction_events_status_idx ON construction_events (event_status, created_at DESC);

CREATE TABLE IF NOT EXISTS city_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_key TEXT NOT NULL UNIQUE,
  event_type TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  source_construction_event_id UUID REFERENCES construction_events(id),
  public_facts JSONB NOT NULL DEFAULT '{}'::jsonb,
  visibility TEXT NOT NULL DEFAULT 'public' CHECK (visibility IN ('public', 'private', 'draft')),
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS city_events_occurred_idx ON city_events (occurred_at DESC);

CREATE TABLE IF NOT EXISTS agent_definitions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_key TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  department TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  enabled BOOLEAN NOT NULL DEFAULT FALSE,
  configuration JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS agent_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_key TEXT NOT NULL UNIQUE,
  agent_key TEXT NOT NULL REFERENCES agent_definitions(agent_key),
  job_type TEXT NOT NULL,
  priority SMALLINT NOT NULL DEFAULT 5 CHECK (priority BETWEEN 1 AND 10),
  job_status TEXT NOT NULL DEFAULT 'queued'
    CHECK (job_status IN ('queued', 'running', 'awaiting_approval', 'completed', 'failed', 'cancelled')),
  input_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  result_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  attempts INTEGER NOT NULL DEFAULT 0 CHECK (attempts >= 0),
  max_attempts INTEGER NOT NULL DEFAULT 3 CHECK (max_attempts BETWEEN 1 AND 10),
  scheduled_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  started_at TIMESTAMPTZ,
  finished_at TIMESTAMPTZ,
  last_error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS agent_jobs_queue_idx ON agent_jobs (job_status, priority DESC, scheduled_at ASC);

CREATE TABLE IF NOT EXISTS agent_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES agent_jobs(id) ON DELETE CASCADE,
  agent_key TEXT NOT NULL,
  model_name TEXT,
  run_status TEXT NOT NULL CHECK (run_status IN ('running', 'completed', 'failed', 'cancelled')),
  input_summary TEXT NOT NULL DEFAULT '',
  output_summary TEXT NOT NULL DEFAULT '',
  token_usage JSONB NOT NULL DEFAULT '{}'::jsonb,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  finished_at TIMESTAMPTZ,
  error_message TEXT
);

CREATE INDEX IF NOT EXISTS agent_runs_job_idx ON agent_runs (job_id, started_at DESC);

CREATE TABLE IF NOT EXISTS approval_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID REFERENCES agent_jobs(id) ON DELETE SET NULL,
  action_type TEXT NOT NULL,
  requested_by TEXT NOT NULL,
  approval_status TEXT NOT NULL DEFAULT 'pending'
    CHECK (approval_status IN ('pending', 'approved', 'rejected', 'expired')),
  action_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  reviewed_by TEXT,
  review_note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  reviewed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS approval_requests_pending_idx ON approval_requests (approval_status, created_at DESC);

CREATE TABLE IF NOT EXISTS media_drafts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content_key TEXT NOT NULL UNIQUE,
  platform TEXT NOT NULL,
  format TEXT NOT NULL,
  title TEXT NOT NULL,
  script TEXT NOT NULL DEFAULT '',
  description TEXT NOT NULL DEFAULT '',
  source_city_event_ids UUID[] NOT NULL DEFAULT ARRAY[]::UUID[],
  factual_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  media_asset_url TEXT,
  draft_status TEXT NOT NULL DEFAULT 'draft'
    CHECK (draft_status IN ('draft', 'fact_check', 'awaiting_approval', 'approved', 'scheduled', 'published', 'rejected')),
  scheduled_at TIMESTAMPTZ,
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS media_drafts_status_idx ON media_drafts (draft_status, created_at DESC);

CREATE TABLE IF NOT EXISTS social_comment_inbox (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  platform TEXT NOT NULL,
  source_account_id TEXT NOT NULL,
  external_comment_id TEXT NOT NULL,
  author_display_name TEXT NOT NULL DEFAULT '',
  comment_text TEXT NOT NULL,
  classification TEXT NOT NULL DEFAULT 'unclassified',
  moderation_status TEXT NOT NULL DEFAULT 'pending'
    CHECK (moderation_status IN ('pending', 'safe', 'flagged', 'hidden', 'escalated')),
  reply_draft TEXT,
  external_reply_id TEXT,
  received_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  reviewed_at TIMESTAMPTZ,
  CONSTRAINT social_comment_unique UNIQUE (platform, source_account_id, external_comment_id)
);

CREATE INDEX IF NOT EXISTS social_comment_inbox_pending_idx ON social_comment_inbox (moderation_status, received_at DESC);

CREATE TABLE IF NOT EXISTS audit_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_type TEXT NOT NULL CHECK (actor_type IN ('owner', 'admin', 'agent', 'system', 'citizen')),
  actor_id TEXT NOT NULL,
  action TEXT NOT NULL,
  resource_type TEXT NOT NULL,
  resource_id TEXT NOT NULL,
  outcome TEXT NOT NULL CHECK (outcome IN ('success', 'rejected', 'failed', 'pending')),
  detail JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS audit_events_created_idx ON audit_events (created_at DESC);
CREATE INDEX IF NOT EXISTS audit_events_resource_idx ON audit_events (resource_type, resource_id, created_at DESC);


-- Non-cash gameplay economy. NOVA Coin cannot be withdrawn or converted to money.
CREATE TABLE IF NOT EXISTS mission_definitions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mission_key TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  detail TEXT NOT NULL,
  reward_nvc INTEGER NOT NULL DEFAULT 0 CHECK (reward_nvc BETWEEN 0 AND 100000),
  enabled BOOLEAN NOT NULL DEFAULT TRUE,
  requirement JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS citizen_missions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  citizen_id UUID NOT NULL REFERENCES citizens(id) ON DELETE CASCADE,
  mission_id UUID NOT NULL REFERENCES mission_definitions(id),
  mission_status TEXT NOT NULL DEFAULT 'available'
    CHECK (mission_status IN ('started', 'completed')),
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  CONSTRAINT citizen_mission_unique UNIQUE (citizen_id, mission_id)
);

CREATE INDEX IF NOT EXISTS citizen_missions_citizen_idx
  ON citizen_missions (citizen_id, mission_status);

CREATE TABLE IF NOT EXISTS citizen_wallets (
  citizen_id UUID PRIMARY KEY REFERENCES citizens(id) ON DELETE CASCADE,
  balance_nvc BIGINT NOT NULL DEFAULT 0 CHECK (balance_nvc >= 0),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS wallet_ledger (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  citizen_id UUID NOT NULL REFERENCES citizens(id) ON DELETE CASCADE,
  idempotency_key TEXT NOT NULL UNIQUE,
  entry_type TEXT NOT NULL CHECK (entry_type IN ('mission_reward', 'admin_adjustment', 'reversal')),
  amount_delta BIGINT NOT NULL CHECK (amount_delta <> 0),
  balance_after BIGINT NOT NULL CHECK (balance_after >= 0),
  reference_type TEXT NOT NULL,
  reference_id TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS wallet_ledger_citizen_idx
  ON wallet_ledger (citizen_id, created_at DESC);


-- A citizen may own only one claimed community home at a time.
CREATE UNIQUE INDEX IF NOT EXISTS houses_one_claimed_home_per_citizen_idx
  ON houses (owner_citizen_id)
  WHERE owner_citizen_id IS NOT NULL AND house_status = 'claimed';


-- Review state for AI-drafted community replies. Approval does not publish externally.
ALTER TABLE social_comment_inbox
  ADD COLUMN IF NOT EXISTS reply_status TEXT NOT NULL DEFAULT 'not_drafted';

CREATE INDEX IF NOT EXISTS social_comment_reply_status_idx
  ON social_comment_inbox (reply_status, received_at DESC);


-- Heartbeat records let the admin dashboard distinguish configured credentials
-- from a worker process that is actually alive.
CREATE TABLE IF NOT EXISTS worker_heartbeats (
  worker_key TEXT PRIMARY KEY,
  worker_type TEXT NOT NULL,
  worker_status TEXT NOT NULL
    CHECK (worker_status IN ('running', 'stopping', 'stopped', 'error')),
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  details JSONB NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS worker_heartbeats_last_seen_idx
  ON worker_heartbeats (last_seen_at DESC);


-- Citizen mascot species are assigned once at registration and remain permanent.
-- Reassign old single-otter accounts before applying the new multi-species constraint.
ALTER TABLE citizens DROP CONSTRAINT IF EXISTS citizens_avatar_species_check;
UPDATE citizens
SET avatar_species = (ARRAY[
  'fox', 'cat', 'panda', 'rabbit', 'wolf', 'bear', 'raccoon',
  'capybara', 'penguin', 'deer', 'lion', 'tiger', 'red-panda',
  'koala', 'frog', 'duck', 'dog', 'cow', 'hamster', 'hedgehog',
  'elephant', 'monkey', 'sloth', 'owl', 'horse', 'squirrel', 'beaver'
]::text[])[1 + (get_byte(decode(md5(id::text), 'hex'), 0) % 27)]
WHERE avatar_species = 'otter';
ALTER TABLE citizens
  ADD CONSTRAINT citizens_avatar_species_check
  CHECK (avatar_species IN (
    'fox', 'cat', 'panda', 'rabbit', 'wolf', 'bear', 'raccoon',
    'capybara', 'penguin', 'deer', 'lion', 'tiger', 'red-panda', 'koala',
    'frog', 'duck', 'dog', 'cow', 'hamster', 'hedgehog', 'elephant',
    'monkey', 'sloth', 'owl', 'horse', 'squirrel', 'beaver'
  ));
ALTER TABLE citizens ALTER COLUMN avatar_species SET DEFAULT 'fox';

-- The city leader is a separate civic character, not a citizen species lock.
-- Convert the former otter leader before constraining the leader species.
ALTER TABLE city_leaders DROP CONSTRAINT IF EXISTS city_leaders_species_check;
UPDATE city_leaders
SET leader_key = 'mayor-bear',
    display_name = 'Pak Wali Kota Beruang',
    species = 'bear',
    title = 'Mayor',
    profile = '{"role":"official in-world city leader","visual_identity":"friendly bear mayor in a tailored navy civic jacket, warm red tie and gold city badge"}'::jsonb
WHERE leader_key = 'mayor-otti';
ALTER TABLE city_leaders
  ADD CONSTRAINT city_leaders_species_check
  CHECK (species IN (
    'fox', 'cat', 'panda', 'rabbit', 'wolf', 'bear', 'raccoon',
    'capybara', 'penguin', 'deer', 'lion', 'tiger', 'red-panda',
    'koala', 'frog', 'duck', 'dog', 'cow', 'hamster', 'hedgehog',
    'elephant', 'monkey', 'sloth', 'owl', 'horse', 'squirrel', 'beaver'
  ));
ALTER TABLE city_leaders ALTER COLUMN species SET DEFAULT 'bear';

-- Optional public Instagram username used by the city mascot finder.
-- A citizen appears in public resident search only after choosing a handle.
ALTER TABLE citizens ADD COLUMN IF NOT EXISTS social_handle TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS citizens_social_handle_unique_idx
  ON citizens (LOWER(social_handle))
  WHERE social_handle IS NOT NULL AND social_handle <> '';
