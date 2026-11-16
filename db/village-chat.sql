-- Append-only: public village chat is separate from social media comments.
-- Apply with the existing additive db:migrate transaction.
CREATE TABLE IF NOT EXISTS village_chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  epoch_id UUID NOT NULL REFERENCES village_epochs(id),
  citizen_id UUID NOT NULL REFERENCES citizens(id),
  display_name TEXT NOT NULL,
  avatar_species TEXT NOT NULL,
  body TEXT NOT NULL CHECK(length(body) BETWEEN 1 AND 280),
  moderation_status TEXT NOT NULL DEFAULT 'visible' CHECK(moderation_status IN ('visible','hidden')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS village_chat_recent_idx
 ON village_chat_messages(epoch_id,created_at DESC) WHERE moderation_status='visible';
CREATE INDEX IF NOT EXISTS village_chat_rate_idx ON village_chat_messages(citizen_id,created_at DESC);
