-- Add has_been_koth column to track communities that have achieved KOTH status
ALTER TABLE communities 
ADD COLUMN IF NOT EXISTS has_been_koth BOOLEAN DEFAULT FALSE;

CREATE INDEX IF NOT EXISTS idx_communities_koth ON communities(has_been_koth) WHERE has_been_koth = FALSE;

