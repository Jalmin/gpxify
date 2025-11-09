# ⚡ QUICK START - 5 Minutes to Running App

## 🎯 Goal
Get a working React + FastAPI app running in under 5 minutes.

## 📋 Prerequisites Check

```bash
# Check Docker
docker --version
docker-compose --version

# Check Node.js (optional, for local dev)
node --version  # Should be 20+

# Check Python (optional, for local dev)
python --version  # Should be 3.11+
```

## 🚀 Steps

### 1. Setup (30 seconds)

```bash
# Copy template to new project
cp -r project-template my-app
cd my-app

# Create environment file
cp .env.example .env
```

### 2. Configure Secrets (1 minute)

**Edit `.env` file:**

```bash
# Generate SECRET_KEY
openssl rand -hex 32

# Generate POSTGRES_PASSWORD
openssl rand -base64 24
```

**Update `.env`:**
```env
SECRET_KEY=<output from first command>
POSTGRES_PASSWORD=<output from second command>
APP_NAME=My Awesome App
```

### 3. Start Everything (2 minutes)

```bash
# Build and start all services
docker-compose up --build

# Wait for build... (first time takes ~2 minutes)
```

**You'll see:**
```
✅ Database ready
✅ Backend started
✅ Frontend built
```

### 4. Verify It Works (1 minute)

Open in browser:

1. **Frontend:** http://localhost
   - Should see "React + FastAPI Template"
   - Click "Fetch from API" button
   - Should see "Hello from FastAPI! 🚀"

2. **Backend API Docs:** http://localhost:8000/docs
   - Interactive Swagger UI
   - Try the `/api/v1/example` endpoint

3. **Health Check:** http://localhost:8000/health
   - Should return `{"status":"healthy"}`

## ✅ Success!

If all 3 URLs work, your template is ready! 🎉

## 🎨 Next Steps (Choose One)

### Option A: Learn the Template
```bash
# Read architecture decisions
cat README.md

# See all available patterns
cat .claude/starter-prompt.md
```

### Option B: Start Building
```bash
# 1. Remove example code
rm backend/app/api/example.py

# 2. Create your first model
# See .claude/starter-prompt.md → "Modèles de Données"

# 3. Create your first API endpoint
# See .claude/starter-prompt.md → "API Endpoints"
```

### Option C: Customize UI
```bash
# Change theme colors
nano frontend/src/index.css
# Edit the :root CSS variables

# Restart frontend to see changes
docker-compose restart frontend
```

## 🛑 Troubleshooting

### Port Already in Use

```bash
# Change ports in docker-compose.yml
ports:
  - "8080:80"  # Instead of 80:80
```

### Can't Connect to Database

```bash
# Check database is running
docker-compose ps

# Should see db with status "Up (healthy)"
# If not, check .env POSTGRES_* variables match
```

### Build Errors

```bash
# Clean everything and rebuild
docker-compose down -v
docker-compose up --build
```

## 📚 Full Documentation

- **README.md** - Complete documentation
- **.claude/starter-prompt.md** - Detailed setup guide
- **TEMPLATE.md** - What's included/excluded

## 💡 Quick Tips

1. **Local Development:**
   ```bash
   # Frontend only (faster hot reload)
   cd frontend && npm install && npm run dev
   # → http://localhost:5173
   ```

2. **View Logs:**
   ```bash
   docker-compose logs -f backend
   docker-compose logs -f frontend
   ```

3. **Restart Service:**
   ```bash
   docker-compose restart backend
   ```

4. **Stop Everything:**
   ```bash
   docker-compose down
   ```

---

**That's it! You have a production-ready template running. 🚀**

**Time taken:** < 5 minutes
**Next:** Read `.claude/starter-prompt.md` for full development guide
