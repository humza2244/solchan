-- Add became_koth_at timestamp to track when a community was crowned KOTH
ALTER TABLE communities 
ADD COLUMN IF NOT EXISTS became_koth_at TIMESTAMP DEFAULT NULL;

-- For communities that are already KOTH, set became_koth_at to their created_at
UPDATE communities 
SET became_koth_at = created_at 
WHERE has_been_koth = TRUE AND became_koth_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_communities_became_koth ON communities(became_koth_at) WHERE became_koth_at IS NOT NULL;

