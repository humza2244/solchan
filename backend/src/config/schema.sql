-- Create coins table
CREATE TABLE IF NOT EXISTS coins (
  contract_address VARCHAR(255) PRIMARY KEY,
  name VARCHAR(255),
  symbol VARCHAR(50),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  message_count INTEGER DEFAULT 0,
  last_message_at TIMESTAMP
);

-- Create messages table
CREATE TABLE IF NOT EXISTS messages (
  id BIGSERIAL PRIMARY KEY,
  post_number BIGINT NOT NULL,
  contract_address VARCHAR(255) NOT NULL REFERENCES coins(contract_address) ON DELETE CASCADE,
  content TEXT NOT NULL,
  author VARCHAR(255) DEFAULT 'Anonymous',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_messages_contract_address ON messages(contract_address);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at);
CREATE INDEX IF NOT EXISTS idx_messages_contract_created ON messages(contract_address, created_at);
CREATE INDEX IF NOT EXISTS idx_coins_last_message_at ON coins(last_message_at);
CREATE INDEX IF NOT EXISTS idx_messages_post_number ON messages(post_number);

-- Create function to update coin message count and last_message_at
CREATE OR REPLACE FUNCTION update_coin_stats()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE coins
  SET 
    message_count = (SELECT COUNT(*) FROM messages WHERE contract_address = NEW.contract_address),
    last_message_at = NEW.created_at
  WHERE contract_address = NEW.contract_address;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update coin stats when a message is inserted
-- Drop trigger if it exists first (for idempotent migrations)
DROP TRIGGER IF EXISTS trigger_update_coin_stats ON messages;
CREATE TRIGGER trigger_update_coin_stats
AFTER INSERT ON messages
FOR EACH ROW
EXECUTE FUNCTION update_coin_stats();


