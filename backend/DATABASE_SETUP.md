# Database Setup Guide

This guide will help you set up PostgreSQL for the chan-app backend.

## Prerequisites

- PostgreSQL 12+ installed and running
- Node.js 18+ installed

## Setup Steps

### 1. Install PostgreSQL

If you don't have PostgreSQL installed:

**macOS:**
```bash
brew install postgresql
brew services start postgresql
```

**Linux (Ubuntu/Debian):**
```bash
sudo apt-get update
sudo apt-get install postgresql postgresql-contrib
sudo systemctl start postgresql
```

**Windows:**
Download and install from [PostgreSQL official website](https://www.postgresql.org/download/windows/)

### 2. Create Database

```bash
# Connect to PostgreSQL
psql -U postgres

# Create database
CREATE DATABASE chan_app;

# Create user (optional, you can use the default postgres user)
CREATE USER chan_user WITH PASSWORD 'your_password';
GRANT ALL PRIVILEGES ON DATABASE chan_app TO chan_user;

# Exit psql
\q
```

### 3. Configure Environment Variables

Create a `.env` file in the `backend` directory:

```env
# Server Configuration
PORT=5001
NODE_ENV=development

# Frontend URL (for CORS)
FRONTEND_URL=http://localhost:3000

# Database Configuration
# Format: postgresql://username:password@host:port/database
DATABASE_URL=postgresql://postgres:password@localhost:5432/chan_app

# Run migrations on startup (set to 'false' to disable)
RUN_MIGRATIONS=true
```

**For production**, use a secure connection string:
```env
DATABASE_URL=postgresql://username:password@host:port/database?sslmode=require
```

### 4. Install Dependencies

```bash
cd backend
npm install
```

### 5. Run Migrations

The migrations will run automatically on server startup if `RUN_MIGRATIONS=true`.

Alternatively, you can run migrations manually:
```bash
npm run migrate
```

### 6. Start the Server

```bash
npm run dev
```

The server will:
- Connect to the database
- Run migrations automatically
- Start the API server on port 5001

## Database Schema

The database includes:

- **coins** table: Stores coin communities
- **messages** table: Stores messages for each coin community
- **Indexes**: Optimized for fast queries on contract_address and created_at
- **Triggers**: Automatically update coin statistics when messages are added

## Production Considerations

1. **Connection Pooling**: Already configured (max 20 connections)
2. **Indexes**: Created for optimal query performance
3. **Caching**: Popular communities are cached for 5 minutes
4. **Rate Limiting**: API endpoints are rate-limited
5. **Error Handling**: Comprehensive error handling and logging

## Health Check

Check database connectivity:
```bash
curl http://localhost:5001/api/health
```

Response:
```json
{
  "status": "ok",
  "message": "Server is running",
  "database": "connected"
}
```

## Troubleshooting

### Connection Errors

1. Check if PostgreSQL is running:
```bash
# macOS/Linux
pg_isready

# Or check service status
brew services list  # macOS
sudo systemctl status postgresql  # Linux
```

2. Verify database exists:
```bash
psql -U postgres -l
```

3. Check connection string format:
```bash
# Test connection
psql postgresql://postgres:password@localhost:5432/chan_app
```

### Migration Errors

If migrations fail:
1. Check database permissions
2. Verify DATABASE_URL is correct
3. Check if tables already exist (migrations are idempotent)

### Performance Issues

1. Check database indexes:
```sql
SELECT * FROM pg_indexes WHERE tablename IN ('coins', 'messages');
```

2. Monitor connection pool:
```sql
SELECT count(*) FROM pg_stat_activity;
```

## Backup

Regular backups are recommended:

```bash
# Backup database
pg_dump -U postgres chan_app > backup.sql

# Restore database
psql -U postgres chan_app < backup.sql
```

## Cloud Database Options

For production, consider using:
- **AWS RDS PostgreSQL**
- **Heroku Postgres**
- **Railway PostgreSQL**
- **Supabase**
- **Neon PostgreSQL**

Update `DATABASE_URL` with your cloud database connection string.


