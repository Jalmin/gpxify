# React + FastAPI Production Template

Production-ready full-stack template with React, FastAPI, TypeScript, Tailwind CSS, and Docker.

## 🏗️ Architecture Overview

### Tech Stack

**Frontend:**
- ⚛️ React 18 + TypeScript
- ⚡ Vite (dev server & build tool)
- 🎨 Tailwind CSS (utility-first CSS)
- 🧪 Vitest + Testing Library (testing)
- 📦 Axios (HTTP client)

**Backend:**
- 🚀 FastAPI (async Python framework)
- 🗄️ PostgreSQL + SQLAlchemy (database)
- 🔒 Pydantic (validation & settings)
- ⚡ SlowAPI (rate limiting)
- ✅ Pytest (testing)

**Infrastructure:**
- 🐳 Docker + Docker Compose
- 🔄 Multi-stage builds
- ✅ Health checks
- 📊 Auto-documentation (Swagger/ReDoc)

## 📂 Project Structure

```
.
├── frontend/                 # React frontend
│   ├── src/
│   │   ├── components/      # React components
│   │   │   └── ui/          # Reusable UI components
│   │   ├── lib/             # Utilities (cn function, etc.)
│   │   ├── services/        # API client
│   │   ├── types/           # TypeScript types
│   │   └── test/            # Test setup
│   ├── Dockerfile           # Multi-stage build
│   ├── nginx.conf           # Production server config
│   └── package.json
│
├── backend/                  # FastAPI backend
│   ├── app/
│   │   ├── api/             # API routes
│   │   ├── core/            # Config & settings
│   │   ├── db/              # Database (models, session)
│   │   ├── models/          # Pydantic schemas
│   │   ├── services/        # Business logic
│   │   ├── middleware/      # Rate limiting, etc.
│   │   └── utils/           # Helper functions
│   ├── Dockerfile
│   └── requirements.txt
│
├── docker-compose.yml        # Orchestration
├── .env.example              # Environment template
└── README.md
```

## 🚀 Quick Start

### Prerequisites

- Docker & Docker Compose
- Node.js 20+ (for local dev)
- Python 3.11+ (for local dev)

### 1. Clone & Configure

```bash
# Copy environment template
cp .env.example .env

# Edit .env with your settings
# IMPORTANT: Change SECRET_KEY and POSTGRES_PASSWORD
```

### 2. Run with Docker

```bash
# Build and start all services
docker-compose up --build

# Access the application
Frontend: http://localhost
Backend API: http://localhost:8000
API Docs: http://localhost:8000/docs
```

### 3. Local Development (Optional)

**Frontend:**
```bash
cd frontend
npm install
npm run dev
# → http://localhost:5173
```

**Backend:**
```bash
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload
# → http://localhost:8000
```

## 🎨 Key Features

### Type Safety
- ✅ TypeScript strict mode
- ✅ Pydantic validation
- ✅ Shared type definitions (manual sync required)

### Developer Experience
- ✅ Hot reload (Vite + uvicorn --reload)
- ✅ Path aliases (`@/components/Button`)
- ✅ Auto-generated API docs
- ✅ Pre-configured testing

### Production Ready
- ✅ Multi-stage Docker builds (90% smaller images)
- ✅ Health checks for orchestration
- ✅ Nginx optimizations (gzip, caching, security headers)
- ✅ Connection pooling
- ✅ Rate limiting
- ✅ CORS configuration

### UI System
- ✅ CSS variable-based theming
- ✅ Dark mode support (class-based)
- ✅ Semantic color system (primary, secondary, destructive)
- ✅ Reusable Button component with variants

## 📖 Architectural Decisions

### 1. **Multi-Stage Docker Builds**

**Why:** Reduces production image size by ~90%

Frontend build stage installs Node.js dependencies and builds the app, but the production image only contains Nginx + static files (no Node.js).

**Files:**
- `frontend/Dockerfile` (lines 1-17: build, 19-33: production)
- `backend/Dockerfile` (single-stage, but deps cached separately)

### 2. **CSS Variable-Based Theming**

**Why:** Runtime theme switching without rebuilding

Colors defined as HSL CSS variables in `src/index.css`, referenced in Tailwind config. Change theme by updating CSS variables, not rebuilding entire app.

**Files:**
- `frontend/src/index.css` (lines 5-44: color definitions)
- `frontend/tailwind.config.js` (lines 10-40: variable references)

### 3. **Pydantic Settings for Configuration**

**Why:** Type-safe, validated, environment-based config

All configuration loaded from env variables with type validation. Supports defaults for development, overrides for production. Field validators allow complex parsing (e.g., comma-separated CORS origins).

**Files:**
- `backend/app/core/config.py` (complete settings class)

### 4. **Dependency Injection (FastAPI)**

**Why:** Testable, reusable, clean separation

Database sessions, auth, etc. injected via `Depends()`. Makes testing easy (mock dependencies) and keeps route handlers clean.

**Files:**
- `backend/app/db/database.py` (lines 24-35: `get_db()` generator)
- `backend/app/api/example.py` (line 28: usage example)

### 5. **Path Aliases (`@/*`)**

**Why:** Clean imports, easy refactoring

Instead of `../../../components/Button`, use `@/components/Button`. Configured in both tsconfig.json and vite.config.ts.

**Files:**
- `frontend/tsconfig.json` (lines 24-26)
- `frontend/vite.config.ts` (lines 9-11)

### 6. **API Client with Interceptors**

**Why:** Centralized error handling, auth injection

Single axios instance with request/response interceptors. Add auth tokens globally, handle 401 redirects, etc.

**Files:**
- `frontend/src/services/api.ts` (lines 18-42: interceptors)

### 7. **Rate Limiting by IP**

**Why:** Protect against abuse, DoS

SlowAPI middleware limits requests per IP. Configured with decorators (`@limiter.limit("30/minute")`).

**Files:**
- `backend/app/middleware/rate_limit.py`
- `backend/app/main.py` (lines 30-31: setup)

## 🔧 Customization Guide

### 1. Update Application Name

```bash
# .env
APP_NAME=My Awesome App

# frontend/index.html
<title>My Awesome App</title>

# docker-compose.yml
container_name: myapp-backend
```

### 2. Add New API Endpoint

```python
# backend/app/api/users.py
from fastapi import APIRouter

router = APIRouter()

@router.get("/users")
async def get_users():
    return [{"id": 1, "name": "Alice"}]
```

```python
# backend/app/main.py
from app.api import users

app.include_router(
    users.router,
    prefix=f"{settings.API_V1_STR}/users",
    tags=["users"],
)
```

### 3. Add New Database Model

```python
# backend/app/db/models.py
class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True)
    created_at = Column(DateTime, default=datetime.utcnow)
```

### 4. Customize Theme Colors

Edit `frontend/src/index.css`:

```css
:root {
  /* Change primary color (HSL format) */
  --primary: 221 83% 53%;  /* Blue */
  --primary-foreground: 0 0% 100%;  /* White text */
}
```

### 5. Add Frontend Route

```tsx
// Install react-router-dom first
import { BrowserRouter, Routes, Route } from 'react-router-dom';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/about" element={<About />} />
      </Routes>
    </BrowserRouter>
  );
}
```

## 🧪 Testing

### Frontend (Vitest)

```bash
cd frontend

# Run tests
npm test

# Run with UI
npm run test:ui

# Coverage report
npm run test:coverage
```

### Backend (Pytest)

```bash
cd backend

# Install dev dependencies
pip install -r requirements-dev.txt

# Run tests
pytest

# With coverage
pytest --cov=app --cov-report=html
```

## 🚀 Deployment

### Using Docker Compose (Recommended)

```bash
# Production build
docker-compose up --build -d

# View logs
docker-compose logs -f

# Stop
docker-compose down
```

### Environment Variables for Production

```env
# .env
ENVIRONMENT=production
DEBUG=False
SECRET_KEY=<generate with: openssl rand -hex 32>
POSTGRES_PASSWORD=<strong password>
VITE_API_URL=https://api.yourdomain.com
BACKEND_CORS_ORIGINS=https://yourdomain.com,https://www.yourdomain.com
```

### Platform-Specific Guides

- **Coolify:** See `.claude/starter-prompt.md` (section "Deploy to Coolify")
- **Railway:** Connect GitHub repo, set env variables, deploy
- **Heroku:** Use Heroku Postgres addon, set buildpacks for frontend/backend
- **DigitalOcean:** Use App Platform with Docker Compose

## 📚 Additional Resources

- **Starter Guide:** `.claude/starter-prompt.md` - Step-by-step setup instructions
- **Reusable Patterns:** `.claude/reusable-patterns.md` - Code patterns & conventions
- **API Docs:** `/docs` (Swagger UI) or `/redoc` (ReDoc) when app is running

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run tests (`npm test` + `pytest`)
5. Submit a pull request

## 📝 License

MIT License - feel free to use this template for any project.

---

**Built with ❤️ using patterns from production apps**

For detailed setup instructions, see [.claude/starter-prompt.md](./.claude/starter-prompt.md)
