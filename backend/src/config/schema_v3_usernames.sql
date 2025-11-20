-- Add user profiles table for usernames
-- This extends Supabase Auth with custom user data

-- Create user_profiles table
CREATE TABLE IF NOT EXISTS user_profiles (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username VARCHAR(50) UNIQUE NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create index for fast username lookups
CREATE INDEX IF NOT EXISTS idx_user_profiles_username ON user_profiles(LOWER(username));

-- Create function to validate username format
CREATE OR REPLACE FUNCTION validate_username(username TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  -- Username must be 3-50 characters, alphanumeric + underscore/hyphen
  RETURN username ~ '^[a-zA-Z0-9_-]{3,50}$';
END;
$$ LANGUAGE plpgsql;

-- Add constraint to ensure valid usernames
ALTER TABLE user_profiles 
DROP CONSTRAINT IF EXISTS username_format_check;

ALTER TABLE user_profiles 
ADD CONSTRAINT username_format_check 
CHECK (validate_username(username));

