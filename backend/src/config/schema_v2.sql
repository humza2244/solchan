-- Drop old tables and create new schema for communities
-- This is a breaking change - old data will be lost

-- Drop old tables (CASCADE will drop triggers and constraints)
DROP TABLE IF EXISTS messages CASCADE;
DROP TABLE IF EXISTS coins CASCADE;
-- Drop old function if it exists
DROP FUNCTION IF EXISTS update_coin_stats() CASCADE;

-- Create communities table (replaces coins)
CREATE TABLE IF NOT EXISTS communities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticker VARCHAR(50) NOT NULL,
  coin_name VARCHAR(255) NOT NULL,
  contract_address VARCHAR(255) NOT NULL,
  description TEXT,
  image_url VARCHAR(500),
  creator_id UUID, -- Will reference auth.users when we add Supabase Auth
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  message_count INTEGER DEFAULT 0,
  unique_users_count INTEGER DEFAULT 0,
  last_message_at TIMESTAMP
);

-- Create messages table (now references community_id)
CREATE TABLE IF NOT EXISTS messages (
  id BIGSERIAL PRIMARY KEY,
  post_number BIGINT NOT NULL,
  community_id UUID NOT NULL REFERENCES communities(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  user_id UUID, -- Will reference auth.users when we add Supabase Auth
  author VARCHAR(255) DEFAULT 'Anonymous',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_communities_ticker ON communities(LOWER(ticker));
CREATE INDEX IF NOT EXISTS idx_communities_contract_address ON communities(LOWER(contract_address));
CREATE INDEX IF NOT EXISTS idx_communities_created_at ON communities(created_at);
CREATE INDEX IF NOT EXISTS idx_communities_last_message_at ON communities(last_message_at);
CREATE INDEX IF NOT EXISTS idx_messages_community_id ON messages(community_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at);
CREATE INDEX IF NOT EXISTS idx_messages_community_created ON messages(community_id, created_at);
CREATE INDEX IF NOT EXISTS idx_messages_post_number ON messages(post_number);
CREATE INDEX IF NOT EXISTS idx_messages_user_id ON messages(user_id);

-- Create function to update community stats
CREATE OR REPLACE FUNCTION update_community_stats()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE communities
  SET 
    message_count = (SELECT COUNT(*) FROM messages WHERE community_id = NEW.community_id),
    unique_users_count = (SELECT COUNT(DISTINCT user_id) FROM messages WHERE community_id = NEW.community_id AND user_id IS NOT NULL),
    last_message_at = NEW.created_at
  WHERE id = NEW.community_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update community stats when a message is inserted
DROP TRIGGER IF EXISTS trigger_update_community_stats ON messages;
CREATE TRIGGER trigger_update_community_stats
AFTER INSERT ON messages
FOR EACH ROW
EXECUTE FUNCTION update_community_stats();

