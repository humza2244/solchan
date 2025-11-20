-- Safe migration - Only creates tables if they don't exist
-- Does NOT drop existing data

-- Create communities table if it doesn't exist
CREATE TABLE IF NOT EXISTS communities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticker VARCHAR(50) NOT NULL,
  coin_name VARCHAR(255) NOT NULL,
  contract_address VARCHAR(255) NOT NULL,
  description TEXT,
  image_url VARCHAR(500),
  creator_id UUID,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  message_count INTEGER DEFAULT 0,
  unique_users_count INTEGER DEFAULT 0,
  last_message_at TIMESTAMP
);

-- Create messages table if it doesn't exist
CREATE TABLE IF NOT EXISTS messages (
  id BIGSERIAL PRIMARY KEY,
  post_number BIGINT NOT NULL,
  community_id UUID NOT NULL REFERENCES communities(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  user_id UUID,
  author VARCHAR(255) DEFAULT 'Anonymous',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create user_profiles table if it doesn't exist
CREATE TABLE IF NOT EXISTS user_profiles (
  user_id UUID PRIMARY KEY,
  username VARCHAR(50) UNIQUE NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes (IF NOT EXISTS)
CREATE INDEX IF NOT EXISTS idx_communities_ticker ON communities(LOWER(ticker));
CREATE INDEX IF NOT EXISTS idx_communities_contract_address ON communities(LOWER(contract_address));
CREATE INDEX IF NOT EXISTS idx_communities_created_at ON communities(created_at);
CREATE INDEX IF NOT EXISTS idx_communities_last_message_at ON communities(last_message_at);
CREATE INDEX IF NOT EXISTS idx_messages_community_id ON messages(community_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at);
CREATE INDEX IF NOT EXISTS idx_messages_community_created ON messages(community_id, created_at);
CREATE INDEX IF NOT EXISTS idx_messages_post_number ON messages(post_number);
CREATE INDEX IF NOT EXISTS idx_messages_user_id ON messages(user_id);
CREATE INDEX IF NOT EXISTS idx_user_profiles_username ON user_profiles(LOWER(username));

-- Create or replace the community stats function
CREATE OR REPLACE FUNCTION update_community_stats()
RETURNS TRIGGER AS $$
BEGIN
  -- Update the community's stats
  UPDATE communities
  SET 
    message_count = (
      SELECT COUNT(*) 
      FROM messages 
      WHERE community_id = NEW.community_id
    ),
    unique_users_count = (
      SELECT COUNT(DISTINCT author) 
      FROM messages 
      WHERE community_id = NEW.community_id
    ),
    last_message_at = NEW.created_at
  WHERE id = NEW.community_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger if it doesn't exist
DROP TRIGGER IF EXISTS trigger_update_community_stats ON messages;
CREATE TRIGGER trigger_update_community_stats
AFTER INSERT ON messages
FOR EACH ROW
EXECUTE FUNCTION update_community_stats();

-- Create username validation function
CREATE OR REPLACE FUNCTION validate_username(username TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN username ~ '^[a-zA-Z0-9_-]{3,50}$';
END;
$$ LANGUAGE plpgsql;

-- Add constraints only if they don't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'username_format_check'
  ) THEN
    ALTER TABLE user_profiles 
    ADD CONSTRAINT username_format_check 
    CHECK (validate_username(username));
  END IF;
END $$;

