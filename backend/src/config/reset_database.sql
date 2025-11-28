-- Reset database for testing (keeps schema, deletes all data)

-- Disable triggers temporarily to avoid cascading issues
SET session_replication_role = 'replica';

-- Delete data in correct order (respecting foreign keys)
TRUNCATE TABLE replies CASCADE;
TRUNCATE TABLE threads CASCADE;
TRUNCATE TABLE messages CASCADE;
TRUNCATE TABLE communities CASCADE;
TRUNCATE TABLE user_profiles CASCADE;

-- Re-enable triggers
SET session_replication_role = 'origin';

-- Verify clean state
SELECT 'Communities:' as table_name, COUNT(*) as count FROM communities
UNION ALL
SELECT 'Threads:', COUNT(*) FROM threads
UNION ALL
SELECT 'Replies:', COUNT(*) FROM replies
UNION ALL
SELECT 'Messages:', COUNT(*) FROM messages
UNION ALL
SELECT 'User Profiles:', COUNT(*) FROM user_profiles;

