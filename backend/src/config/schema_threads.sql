-- Threads Schema - 4chan-style threading system
-- This replaces the flat message system with organized threads

-- Create threads table
CREATE TABLE IF NOT EXISTS threads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  community_id UUID NOT NULL REFERENCES communities(id) ON DELETE CASCADE,
  subject VARCHAR(255) NOT NULL,
  content TEXT NOT NULL,
  image_url VARCHAR(500),
  author VARCHAR(255) DEFAULT 'Anonymous',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_bump_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  reply_count INTEGER DEFAULT 0,
  post_number BIGINT NOT NULL,
  is_pinned BOOLEAN DEFAULT FALSE
);

-- Create replies table (replaces messages for thread replies)
CREATE TABLE IF NOT EXISTS replies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id UUID NOT NULL REFERENCES threads(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  image_url VARCHAR(500),
  author VARCHAR(255) DEFAULT 'Anonymous',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  post_number BIGINT NOT NULL
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_threads_community_id ON threads(community_id);
CREATE INDEX IF NOT EXISTS idx_threads_last_bump ON threads(last_bump_at DESC);
CREATE INDEX IF NOT EXISTS idx_threads_community_bump ON threads(community_id, last_bump_at DESC);
CREATE INDEX IF NOT EXISTS idx_replies_thread_id ON replies(thread_id);
CREATE INDEX IF NOT EXISTS idx_replies_created_at ON replies(created_at);

-- Function to update thread stats when a reply is added
CREATE OR REPLACE FUNCTION update_thread_stats()
RETURNS TRIGGER AS $$
BEGIN
  -- Update thread reply count and last_bump_at
  UPDATE threads
  SET 
    reply_count = reply_count + 1,
    last_bump_at = NEW.created_at
  WHERE id = NEW.thread_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update thread stats on reply insert
DROP TRIGGER IF EXISTS trigger_update_thread_stats ON replies;
CREATE TRIGGER trigger_update_thread_stats
AFTER INSERT ON replies
FOR EACH ROW
EXECUTE FUNCTION update_thread_stats();

-- Function to update community stats for threads
CREATE OR REPLACE FUNCTION update_community_thread_stats()
RETURNS TRIGGER AS $$
BEGIN
  -- Update community message_count (threads + replies)
  UPDATE communities
  SET 
    message_count = (
      SELECT COUNT(*) FROM threads WHERE community_id = NEW.community_id
    ) + (
      SELECT COUNT(*) FROM replies r
      JOIN threads t ON r.thread_id = t.id
      WHERE t.community_id = NEW.community_id
    ),
    last_message_at = NEW.created_at
  WHERE id = NEW.community_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for thread creation
DROP TRIGGER IF EXISTS trigger_update_community_on_thread ON threads;
CREATE TRIGGER trigger_update_community_on_thread
AFTER INSERT ON threads
FOR EACH ROW
EXECUTE FUNCTION update_community_thread_stats();

-- Function to update community stats when a reply is added
CREATE OR REPLACE FUNCTION update_community_on_reply()
RETURNS TRIGGER AS $$
DECLARE
  v_community_id UUID;
BEGIN
  -- Get community_id from thread
  SELECT community_id INTO v_community_id
  FROM threads
  WHERE id = NEW.thread_id;
  
  -- Update community message_count and last_message_at
  UPDATE communities
  SET 
    message_count = (
      SELECT COUNT(*) FROM threads WHERE community_id = v_community_id
    ) + (
      SELECT COUNT(*) FROM replies r
      JOIN threads t ON r.thread_id = t.id
      WHERE t.community_id = v_community_id
    ),
    last_message_at = NEW.created_at
  WHERE id = v_community_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for reply creation
DROP TRIGGER IF EXISTS trigger_update_community_on_reply ON replies;
CREATE TRIGGER trigger_update_community_on_reply
AFTER INSERT ON replies
FOR EACH ROW
EXECUTE FUNCTION update_community_on_reply();

