# Quick Setup Guide - KrishiFlow

## Step 1: Install MongoDB (Windows)

### Option A: MongoDB Community Server (Recommended for local dev)

1. **Download MongoDB**:
   - Go to: https://www.mongodb.com/try/download/community
   - Select: Windows, MSI package
   - Download and run the installer

2. **Install**:
   - Choose "Complete" installation
   - Install MongoDB as a Service (check the box)
   - Install MongoDB Compass (optional GUI tool)

3. **Verify Installation**:
   ```cmd
   mongod --version
   ```
   Should show version info if installed correctly.

4. **Start MongoDB Service** (if not auto-started):
   ```cmd
   net start MongoDB
   ```

### Option B: MongoDB Atlas (Cloud - Free Tier, No Installation)

1. Go to: https://www.mongodb.com/cloud/atlas
2. Create free account
3. Create a free cluster (M0 tier)
4. Get connection string: `mongodb+srv://username:password@cluster.xxxxx.mongodb.net/`

---

## Step 2: Configure Environment Variables

### Backend `.env` file

Create/edit `backend/.env`:

```env
# Server
PORT=5000
NODE_ENV=development

# Database - Choose ONE option:
# Option A: Local MongoDB
MONGODB_URI=mongodb://localhost:27017/krishiflow

# Option B: MongoDB Atlas (Cloud)
# MONGODB_URI=mongodb+srv://<username>:<password>@cluster0.xxxxx.mongodb.net/krishiflow

# Security
JWT_SECRET=your_super_secret_jwt_key_change_this_in_production

# AI Engine
PYTHON_ENGINE_URL=http://localhost:8000

# Optional API Keys (app works without these, but with limited features)
AGMARKNET_API_KEY=
GEMINI_API_KEY=
OPENWEATHER_API_KEY=
OSRM_URL=https://router.project-osrm.org
EMBEDDING_MODEL=embedding-001
RAG_RELEVANCE_THRESHOLD=0.42
RAG_TOP_K=5
RESILIENCE_DRILL_TOKEN=
```

### AI Engine `.env` (optional)

Create/edit `ai-engine/.env`:

```env
OPENWEATHER_API_KEY=
```

---

## Step 3: Install Dependencies & Seed Database

```cmd
# Backend
cd backend
npm install
node scripts/seedAccounts.js
```

This creates demo accounts:
- **Farmers**: ramesh.farmer@krishiflow.ai, kiran.farmer@krishiflow.ai, etc.
- **Fleet Owners**: vikram.fleet@krishiflow.ai, farida.fleet@krishiflow.ai
- **Buyers**: rajesh.buyer@krishiflow.ai
- **Password for all**: `krishi@2026`

```cmd
# AI Engine
cd ..\ai-engine
pip install -r requirements.txt

# Frontend
cd ..\frontend
npm install
```

---

## Step 4: Run the Application

Open **3 separate terminal windows**:

### Terminal 1: Backend
```cmd
cd backend
npm run dev
```
✓ Should see: "KrishiFlow Production Backend Core running on http://localhost:5000"
✓ Should see: "MongoDB Atlas Connected Successfully"

### Terminal 2: AI Engine
```cmd
cd ai-engine
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```
✓ Should see: "Application startup complete" on port 8000

### Terminal 3: Frontend
```cmd
cd frontend
npm run dev
```
✓ Should see: "Local: http://localhost:3000"

---

## Step 5: Access the Application

1. Open browser: **http://localhost:3000**
2. Click "Sign In"
3. Try a farmer account:
   - Email: `kiran.farmer@krishiflow.ai`
   - Password: `krishi@2026`
4. Explore the features!

---

## Troubleshooting

### "MongoDB connection failed"
```cmd
# Check if MongoDB service is running
net start MongoDB

# Or check status
sc query MongoDB
```

### "Cannot find module" errors
```cmd
# Re-install dependencies
cd backend
rmdir /s /q node_modules
npm install

cd ..\frontend
rmdir /s /q node_modules
npm install
```

### "Port 5000 already in use"
```cmd
# Find and kill the process
netstat -ano | findstr :5000
taskkill /PID <process_id> /F
```

### Python package errors
```cmd
# Upgrade pip first
python -m pip install --upgrade pip

# Then install requirements
cd ai-engine
pip install -r requirements.txt
```

---

## Quick Test Checklist

After starting all services:

- [ ] Backend responds: http://localhost:5000/health
- [ ] AI Engine responds: http://localhost:8000/health
- [ ] Frontend loads: http://localhost:3000
- [ ] Can login with demo account
- [ ] MongoDB connected (check backend console logs)

---

## Need Help?

- Check `PROJECT_STATUS.md` for detailed information
- Check `SAMPLE_USERS.md` for all demo accounts
- Check `PROJECT_OVERVIEW.md` for technical details
- Backend logs: Look in the backend terminal for errors
- MongoDB logs: Check Windows Event Viewer or MongoDB logs folder

---

## That's it! 🚀

You now have:
✅ MongoDB running locally
✅ Backend connected to database
✅ AI Engine ready
✅ Frontend serving
✅ Demo accounts seeded

**Start exploring KrishiFlow!**
