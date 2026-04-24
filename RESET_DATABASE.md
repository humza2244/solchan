# Database Reset Instructions

## ✅ Database Successfully Reset!

All data has been cleared from the database. The schema (tables, columns, triggers) remains intact.

---

## Current Database Status:

```
Communities:     0
Threads:         0
Replies:         0
Messages:        0
User Profiles:   0
```

---

## Available Commands:

### Reset Database (Delete All Data)
```bash
cd backend
npm run reset
```
⚠️ **WARNING:** This deletes ALL data but keeps the schema intact.

### Check Database Status
```bash
cd backend
npm run check-db
```
Shows row counts for all tables.

### Run Migrations (Add/Update Schema)
```bash
cd backend
npm run migrate
```
Creates tables, triggers, and schema updates. Safe to run multiple times (idempotent).

---

## Fresh Start Testing Flow:

1. **Reset database:**
   ```bash
   cd backend
   npm run reset
   ```

2. **Check it's clean:**
   ```bash
   npm run check-db
   ```

3. **Start testing:**
   - Create a community
   - Start a thread
   - Add replies with images
   - Test KOTH functionality

---

## Notes:

- **Supabase Database** is used for storing data (text, IDs, timestamps)
- **Cloudflare R2** is used for storing images (files)
- Resetting the database does NOT delete images from R2
- If you want to clean R2 images too, manually delete them from Cloudflare Dashboard → R2 → cointalk-images

---

## What Gets Reset:

✅ Communities  
✅ Threads  
✅ Replies  
✅ Messages (old flat message system)  
✅ User Profiles  
✅ KOTH achievements (all communities can be KOTH again)  

## What Stays:

✅ Database schema (tables, columns, constraints)  
✅ Triggers and functions  
✅ Images in R2 bucket (these are not deleted)  

