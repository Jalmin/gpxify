# PATTERNS RÉUTILISABLES - GPX NINJA

Ce document extrait les configurations, patterns de code et conventions validées du projet GPX Ninja qui peuvent être réutilisés dans de futurs projets.

---

## TABLE DES MATIÈRES

1. [Configurations Validées](#1-configurations-validées)
2. [Patterns de Code à Conserver](#2-patterns-de-code-à-conserver)
3. [Conventions](#3-conventions)
4. [Patterns Avancés](#4-patterns-avancés)
5. [Guide d'Adaptation](#5-guide-dadaptation)

---

## 1. CONFIGURATIONS VALIDÉES

### 1.1 Frontend (React + TypeScript + Vite)

#### **tsconfig.json - Configuration TypeScript**

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,

    /* Bundler mode - Optimisé pour Vite */
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",

    /* Strict linting - RECOMMANDÉ */
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,

    /* Path aliases - Import propres */
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"]
    }
  }
}
```

**Pourquoi ça fonctionne:**
- ✅ `moduleResolution: "bundler"` → Moderne, optimisé Vite
- ✅ Mode strict activé → Sécurité des types maximale
- ✅ Path aliases `@/*` → Imports propres (`@/components/Button`)
- ✅ `noEmit: true` → Vite gère la transpilation

**Adapter pour un nouveau projet:**
```json
// Garder ces settings essentiels:
{
  "strict": true,
  "moduleResolution": "bundler",
  "paths": { "@/*": ["./src/*"] }
}
```

#### **vite.config.ts - Build & Dev Server**

```typescript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],

  // Path aliases (correspond à tsconfig.json)
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },

  // Dev server avec proxy API
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
    },
  },

  // Optimisation build
  build: {
    rollupOptions: {
      output: {
        // Séparer les grosses libs pour meilleur caching
        manualChunks: {
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          'leaflet': ['leaflet', '@raruto/leaflet-elevation'],
          'charts': ['chart.js', 'react-chartjs-2'],
        },
      },
    },
  },

  // Pre-bundle des dépendances problématiques
  optimizeDeps: {
    include: ['@raruto/leaflet-elevation'],
  },
})
```

**Pourquoi ça fonctionne:**
- ✅ **Proxy API** → Évite CORS en dev
- ✅ **Manual chunks** → Meilleures performances (cache navigateur)
- ✅ **optimizeDeps** → Dépendances CommonJS/UMD pré-bundlées

**Adapter:**
```typescript
// Minimum pour nouveau projet:
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') }
  },
  server: {
    proxy: { '/api': 'http://localhost:8000' }  // Ton backend
  }
})
```

#### **vitest.config.ts - Tests**

```typescript
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,              // describe, it, expect globaux
    environment: 'jsdom',        // Simule le DOM
    setupFiles: ['./src/test/setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'src/test/',
        '**/*.d.ts',
        '**/*.config.ts',
        'dist/',
      ],
    },
  },
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') }
  },
});
```

**Setup file (src/test/setup.ts):**
```typescript
import '@testing-library/jest-dom';
import { afterEach, vi } from 'vitest';
import { cleanup } from '@testing-library/react';

// Cleanup après chaque test
afterEach(() => {
  cleanup();
});

// Mock des variables d'environnement
vi.stubEnv('VITE_API_URL', 'http://localhost:8000');
```

**Pourquoi ça fonctionne:**
- ✅ Globals activés → Syntaxe Jest familière
- ✅ jsdom → Tests de composants React
- ✅ Setup centralisé → Mock d'env, cleanup auto

#### **tailwind.config.js - Design System**

```javascript
export default {
  darkMode: ['class'],
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      // Système de couleurs basé sur CSS variables
      colors: {
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
    },
  },
}
```

**CSS Variables (src/index.css):**
```css
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  :root {
    --background: 0 0% 100%;
    --foreground: 240 10% 3.9%;
    --primary: 240 5.9% 10%;
    --primary-foreground: 0 0% 98%;
    --secondary: 240 4.8% 95.9%;
    --secondary-foreground: 240 5.9% 10%;
    --muted: 240 4.8% 95.9%;
    --muted-foreground: 240 3.8% 46.1%;
    --accent: 240 4.8% 95.9%;
    --accent-foreground: 240 5.9% 10%;
    --destructive: 0 84.2% 60.2%;
    --destructive-foreground: 0 0% 98%;
    --border: 240 5.9% 90%;
    --input: 240 5.9% 90%;
    --ring: 240 5.9% 10%;
    --radius: 0.5rem;
  }

  .dark {
    --background: 240 10% 3.9%;
    --foreground: 0 0% 98%;
    --primary: 0 0% 98%;
    --primary-foreground: 240 5.9% 10%;
    /* ... autres couleurs mode sombre */
  }
}
```

**Pourquoi ce pattern fonctionne:**
- ✅ **Thème runtime:** Switcher light/dark sans rebuild
- ✅ **Nommage sémantique:** `primary`, `destructive` (pas `blue-500`)
- ✅ **HSL:** Facile de créer des variantes (lighten/darken)
- ✅ **Une source de vérité:** CSS variables

**Adapter:**
```javascript
// Garder la structure, changer les couleurs:
colors: {
  primary: 'hsl(var(--primary))',    // Ta couleur principale
  secondary: 'hsl(var(--secondary))', // Ta couleur secondaire
  // ...
}
```

#### **package.json - Scripts Essentiels**

```json
{
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",     // Type-check AVANT build
    "lint": "eslint . --ext ts,tsx --report-unused-disable-directives --max-warnings 0",
    "preview": "vite preview",
    "test": "vitest",
    "test:ui": "vitest --ui",
    "test:coverage": "vitest --coverage"
  },
  "dependencies": {
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "react-router-dom": "^7.9.5",
    "axios": "^1.7.7",
    "clsx": "^2.1.1",                 // Conditional classes
    "tailwind-merge": "^2.5.3",       // Merge Tailwind classes
    "lucide-react": "^0.454.0"        // Icons
  },
  "devDependencies": {
    "@vitejs/plugin-react": "^4.3.3",
    "typescript": "^5.6.3",
    "vite": "^5.4.10",
    "vitest": "^2.1.8",
    "@testing-library/react": "^16.1.0",
    "@testing-library/jest-dom": "^6.6.3",
    "tailwindcss": "^3.4.14",
    "autoprefixer": "^10.4.20",
    "postcss": "^8.4.49"
  }
}
```

**Pattern des scripts:**
- `build` inclut `tsc` → Erreurs TypeScript bloquent le build ✅
- `lint` avec `--max-warnings 0` → Aucun warning toléré ✅
- Scripts séparés pour tests → Flexibilité ✅

### 1.2 Backend (Python + FastAPI)

#### **Configuration avec Pydantic Settings**

**backend/app/core/config.py:**
```python
from typing import List, Union
from pydantic_settings import BaseSettings
from pydantic import field_validator

class Settings(BaseSettings):
    """Configuration de l'application depuis variables d'environnement"""

    # Application
    APP_NAME: str = "Mon API"
    ENVIRONMENT: str = "development"
    DEBUG: bool = True
    API_V1_STR: str = "/api/v1"

    # CORS - Supporte string avec virgules OU liste
    BACKEND_CORS_ORIGINS: Union[str, List[str]] = [
        "http://localhost:5173",
        "http://localhost:3000",
    ]

    @field_validator("BACKEND_CORS_ORIGINS", mode="before")
    @classmethod
    def assemble_cors_origins(cls, v):
        """Parse comma-separated string to list"""
        if isinstance(v, str):
            if not v or v.strip() == "":
                return []
            return [i.strip() for i in v.split(",") if i.strip()]
        return v

    # Database
    DATABASE_URL: str = "postgresql://user:pass@localhost:5432/dbname"

    # Upload
    MAX_UPLOAD_SIZE: int = 10 * 1024 * 1024  # 10MB
    UPLOAD_DIR: str = "./uploads"

    # Security
    SECRET_KEY: str = "CHANGE_ME_IN_PRODUCTION"

    class Config:
        env_file = ".env"
        case_sensitive = True

settings = Settings()

# Auto-création des dossiers requis
import os
os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
```

**Pourquoi ça fonctionne:**
- ✅ **Type-safe:** Pydantic valide les types
- ✅ **Defaults:** Valeurs par défaut pour dev
- ✅ **Validators:** Transformations custom (CORS)
- ✅ **Auto-init:** Dossiers créés automatiquement
- ✅ **Single import:** `from app.core.config import settings`

**Adapter:**
```python
# Minimal pour nouveau projet:
class Settings(BaseSettings):
    APP_NAME: str = "Mon App"
    DATABASE_URL: str
    SECRET_KEY: str

    class Config:
        env_file = ".env"
```

#### **requirements.txt - Dépendances Python**

```txt
# FastAPI Core
fastapi==0.115.0
uvicorn[standard]==0.32.0
python-multipart==0.0.12          # File uploads
pydantic-settings==2.5.2          # Environment config

# Database
sqlalchemy==2.0.35
psycopg2-binary==2.9.9            # PostgreSQL
alembic==1.13.1                   # Migrations

# Authentication
authlib==1.3.2
httpx==0.27.2
itsdangerous==2.2.0

# Environment
python-dotenv==1.0.1

# Rate Limiting
slowapi==0.1.9

# Data Processing (si besoin)
pandas==2.2.3
numpy==2.1.2
```

**Pattern:** Grouper par fonctionnalité avec commentaires

#### **FastAPI Main Setup**

**backend/app/main.py:**
```python
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.api import router_v1

app = FastAPI(
    title=settings.APP_NAME,
    description="API Description",
    version="1.0.0",
    docs_url="/docs",      # Swagger UI
    redoc_url="/redoc",    # ReDoc
)

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.BACKEND_CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(
    router_v1,
    prefix=settings.API_V1_STR,
)

@app.get("/health")
async def health_check():
    """Health check endpoint (requis pour Docker)"""
    return {"status": "healthy", "app": settings.APP_NAME}
```

**Pourquoi ça fonctionne:**
- ✅ **Auto-docs:** Swagger à `/docs`, ReDoc à `/redoc`
- ✅ **CORS centralisé:** Depuis config
- ✅ **Health check:** Pour monitoring/orchestration
- ✅ **Versioning:** `/api/v1` prefix

### 1.3 Docker - Multi-Stage Builds

#### **Frontend Dockerfile**

```dockerfile
# Stage 1: Build
FROM node:20-alpine AS builder

WORKDIR /app

# Install dependencies (cached layer)
COPY package*.json ./
RUN npm ci

# Copy source
COPY . .

# Build args pour env variables
ARG VITE_API_URL
ARG VITE_GOOGLE_CLIENT_ID

# Créer .env pour le build
RUN echo "VITE_API_URL=${VITE_API_URL}" > .env && \
    echo "VITE_GOOGLE_CLIENT_ID=${VITE_GOOGLE_CLIENT_ID}" >> .env

# Build
RUN npm run build

# Stage 2: Production (Nginx)
FROM nginx:alpine

# Installer curl pour health checks
RUN apk add --no-cache curl

# Copier config Nginx
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copier build depuis stage 1
COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 80

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD curl -f http://localhost/ || exit 1

CMD ["nginx", "-g", "daemon off;"]
```

**Pourquoi multi-stage:**
- ✅ Image finale 90% plus petite (seulement dist + nginx)
- ✅ Pas de Node.js en production
- ✅ Health check intégré

#### **Backend Dockerfile**

```dockerfile
FROM python:3.11-slim

WORKDIR /app

# Install system deps
RUN apt-get update && apt-get install -y \
    gcc \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Dependencies AVANT le code (cache layer)
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy app
COPY . .

# Create upload dir
RUN mkdir -p uploads

EXPOSE 8000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:8000/health || exit 1

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

**Pattern:** Dependencies layer séparé → Rebuild rapide si code change

#### **docker-compose.yml**

```yaml
version: '3.8'

services:
  db:
    image: postgres:16-alpine
    container_name: mon-app-db
    restart: unless-stopped
    environment:
      POSTGRES_DB: ${POSTGRES_DB}
      POSTGRES_USER: ${POSTGRES_USER}
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${POSTGRES_USER}"]
      interval: 10s
      timeout: 5s
      retries: 5
    networks:
      - app-network

  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile
    container_name: mon-app-backend
    restart: unless-stopped
    environment:
      DATABASE_URL: postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@db:5432/${POSTGRES_DB}
      ENVIRONMENT: ${ENVIRONMENT:-production}
    volumes:
      - uploads:/app/uploads
    expose:
      - "8000"
    depends_on:
      db:
        condition: service_healthy
    networks:
      - app-network

  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile
      args:
        VITE_API_URL: ${VITE_API_URL}
    container_name: mon-app-frontend
    restart: unless-stopped
    ports:
      - "80:80"
    depends_on:
      - backend
    networks:
      - app-network

volumes:
  postgres_data:
  uploads:

networks:
  app-network:
    driver: bridge
```

**Pourquoi ça fonctionne:**
- ✅ Health checks → `depends_on` attend que DB soit prête
- ✅ Named volumes → Données persistées
- ✅ Environment variables avec defaults
- ✅ Réseau isolé

#### **nginx.conf - Frontend Server**

```nginx
server {
    listen 80;
    server_name _;
    root /usr/share/nginx/html;
    index index.html;

    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/xml text/javascript
               application/x-javascript application/xml+rss
               application/json application/javascript;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;

    # Cache static assets (1 an)
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # React Router - serve index.html pour toutes les routes
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Health check
    location /health {
        access_log off;
        return 200 "healthy\n";
        add_header Content-Type text/plain;
    }
}
```

**Pourquoi ça fonctionne:**
- ✅ **Gzip:** -70% taille des assets
- ✅ **Cache long:** Assets avec hash changent d'URL
- ✅ **SPA routing:** `try_files` pour React Router
- ✅ **Security headers:** Protection XSS, clickjacking

---

## 2. PATTERNS DE CODE À CONSERVER

### 2.1 Helper Functions (Frontend)

#### **Utility Functions Pattern**

**src/lib/utils.ts:**
```typescript
import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Merge Tailwind classes avec déduplication
 * Standard pour projets React + Tailwind
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Formater distance (mètres → km)
 */
export function formatDistance(meters: number): string {
  return `${(meters / 1000).toFixed(2)} km`;
}

/**
 * Formater élévation
 */
export function formatElevation(meters: number): string {
  return `${Math.round(meters)} m`;
}

/**
 * Formater durée (secondes → lisible)
 */
export function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);

  if (hours > 0) {
    return `${hours}h ${minutes}min`;
  }
  return `${minutes}min`;
}
```

**Usage:**
```typescript
import { cn, formatDistance } from '@/lib/utils';

// Conditional classes
<div className={cn(
  'base-class',
  isDragging && 'border-primary',
  isDisabled && 'opacity-50'
)} />

// Formatting
{formatDistance(5000)} // "5.00 km"
```

**Pourquoi ça fonctionne:**
- ✅ `cn()` est le standard de l'industrie (shadcn/ui)
- ✅ Fonctions pures → Faciles à tester
- ✅ Single responsibility → Une fonction, une tâche

#### **ID Generation (Backend)**

**backend/app/utils/share_id.py:**
```python
import secrets
import string

def generate_share_id(length: int = 8) -> str:
    """
    Génère un ID aléatoire court pour partage

    Utilise secrets (cryptographiquement sécurisé)
    Base62 (a-zA-Z0-9) pour URLs

    Args:
        length: Longueur de l'ID (défaut: 8)

    Returns:
        String Base62 aléatoire

    Examples:
        >>> generate_share_id(8)
        'xK9mP2vL'
    """
    alphabet = string.ascii_letters + string.digits
    return ''.join(secrets.choice(alphabet) for _ in range(length))
```

**Pourquoi ça fonctionne:**
- ✅ **secrets** (pas random) → Sécurité crypto
- ✅ **Base62** → URL-friendly (pas de caractères spéciaux)
- ✅ **Configurable** → Longueur ajustable

### 2.2 Error Handling Patterns

#### **Backend (FastAPI)**

```python
from fastapi import HTTPException, UploadFile, File
from app.core.config import settings

@router.post("/upload")
async def upload_file(file: UploadFile = File(...)):
    # 1. Valider type de fichier EN PREMIER
    if not file.filename.lower().endswith(".gpx"):
        raise HTTPException(
            status_code=400,
            detail="Type de fichier invalide. Seuls les .gpx sont acceptés"
        )

    # 2. Vérifier taille
    contents = await file.read()
    if len(contents) > settings.MAX_UPLOAD_SIZE:
        raise HTTPException(
            status_code=413,  # Payload Too Large
            detail=f"Fichier trop volumineux (max {settings.MAX_UPLOAD_SIZE / 1024 / 1024}MB)"
        )

    # 3. Try-catch pour traitement
    try:
        content_str = contents.decode("utf-8")
        result = process_file(content_str)
        return {"success": True, "data": result}

    except UnicodeDecodeError:
        raise HTTPException(400, "Fichier corrompu ou encodage invalide")

    except ValueError as e:
        raise HTTPException(400, f"Erreur de parsing: {str(e)}")

    except Exception as e:
        # Log l'erreur (Sentry, etc.)
        logger.error(f"Unexpected error: {e}")
        raise HTTPException(500, "Erreur interne du serveur")
```

**Pattern d'erreur:**
1. ✅ **Validate early** → Fail fast
2. ✅ **Status codes précis** → 400 (bad request), 413 (too large), 500 (server error)
3. ✅ **Messages clairs** → L'utilisateur sait quoi corriger
4. ✅ **Try-catch spécifique** → Catch d'abord les erreurs connues

#### **Frontend**

**services/api.ts:**
```typescript
import axios from 'axios';

export const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

const apiClient = axios.create({
  baseURL: `${API_BASE_URL}/api/v1`,
  headers: { 'Content-Type': 'application/json' },
});

export const gpxApi = {
  uploadGPX: async (file: File): Promise<GPXUploadResponse> => {
    const formData = new FormData();
    formData.append('file', file);

    const response = await apiClient.post<GPXUploadResponse>(
      '/gpx/upload',
      formData,
      { headers: { 'Content-Type': 'multipart/form-data' } }
    );

    return response.data;
  },
};
```

**Usage dans composant:**
```typescript
import { gpxApi } from '@/services/api';
import axios from 'axios';

const handleUpload = async (file: File) => {
  setIsLoading(true);
  setError(null);

  try {
    const result = await gpxApi.uploadGPX(file);
    setData(result.data);
  } catch (error) {
    if (axios.isAxiosError(error)) {
      // Erreur HTTP (400, 500, etc.)
      const message = error.response?.data?.detail || 'Échec de l\'upload';
      setError(message);
    } else {
      // Erreur inattendue
      setError('Une erreur inattendue est survenue');
    }
  } finally {
    setIsLoading(false);
  }
};
```

**Pattern:**
- ✅ **API client centralisé** → Single source of truth
- ✅ **Try-catch au niveau composant** → Gestion d'état local
- ✅ **axios.isAxiosError()** → Typage correct de l'erreur
- ✅ **Finally block** → Reset loading state toujours

### 2.3 Component Patterns

#### **Button avec Variants (CVA Pattern)**

**components/ui/Button.tsx:**
```typescript
import * as React from 'react';
import { cn } from '@/lib/utils';

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'secondary' | 'outline' | 'ghost' | 'destructive';
  size?: 'default' | 'sm' | 'lg';
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'default', size = 'default', ...props }, ref) => {
    return (
      <button
        className={cn(
          // Base styles
          'inline-flex items-center justify-center rounded-md font-medium',
          'transition-colors focus-visible:outline-none',
          'focus-visible:ring-2 focus-visible:ring-offset-2',
          'disabled:opacity-50 disabled:pointer-events-none',

          // Variants
          {
            'bg-primary text-primary-foreground hover:bg-primary/90':
              variant === 'default',
            'bg-secondary text-secondary-foreground hover:bg-secondary/80':
              variant === 'secondary',
            'border border-input bg-background hover:bg-accent':
              variant === 'outline',
            'hover:bg-accent hover:text-accent-foreground':
              variant === 'ghost',
            'bg-destructive text-destructive-foreground hover:bg-destructive/90':
              variant === 'destructive',
          },

          // Sizes
          {
            'h-10 px-4 py-2': size === 'default',
            'h-9 px-3 text-sm': size === 'sm',
            'h-11 px-8 text-lg': size === 'lg',
          },

          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);

Button.displayName = 'Button';

export { Button };
```

**Usage:**
```tsx
<Button>Default</Button>
<Button variant="outline" size="sm">Small Outline</Button>
<Button variant="destructive" disabled>Disabled</Button>
```

**Pourquoi ça fonctionne:**
- ✅ **forwardRef** → Parent peut accéder au DOM
- ✅ **Extends native props** → Tous les attributs HTML button
- ✅ **cn()** → Merge propre des classes
- ✅ **Object-based conditionals** → Plus lisible que ternaires imbriqués
- ✅ **Semantic colors** → `primary`, `destructive` (pas `blue-500`)

#### **Drag & Drop File Upload**

**components/FileUpload.tsx:**
```typescript
import { useState, useRef } from 'react';
import { Upload } from 'lucide-react';
import { cn } from '@/lib/utils';

interface FileUploadProps {
  onFileSelect: (file: File) => void;
  isUploading?: boolean;
  accept?: string;
  maxSizeMB?: number;
}

export function FileUpload({
  onFileSelect,
  isUploading = false,
  accept = '.gpx',
  maxSizeMB = 10
}: FileUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = Array.from(e.dataTransfer.files);
    const validFile = files.find(f =>
      f.name.toLowerCase().endsWith(accept.replace('.', ''))
    );

    if (validFile) {
      if (validFile.size <= maxSizeMB * 1024 * 1024) {
        onFileSelect(validFile);
      } else {
        alert(`Fichier trop volumineux (max ${maxSizeMB}MB)`);
      }
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      onFileSelect(files[0]);
    }
  };

  return (
    <div
      className={cn(
        'border-2 border-dashed rounded-lg p-8 text-center',
        'transition-colors cursor-pointer',
        isDragging
          ? 'border-primary bg-primary/5'
          : 'border-border bg-background',
        isUploading && 'opacity-50 pointer-events-none'
      )}
      onDragEnter={handleDragEnter}
      onDragOver={(e) => e.preventDefault()}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={() => fileInputRef.current?.click()}
    >
      <input
        ref={fileInputRef}
        type="file"
        accept={accept}
        onChange={handleFileInput}
        className="hidden"
        disabled={isUploading}
      />

      <Upload className="mx-auto h-12 w-12 text-muted-foreground" />

      <p className="mt-4 text-sm text-muted-foreground">
        {isUploading
          ? 'Upload en cours...'
          : 'Glissez-déposez un fichier ou cliquez pour sélectionner'
        }
      </p>

      <p className="mt-2 text-xs text-muted-foreground">
        {accept} (max {maxSizeMB}MB)
      </p>
    </div>
  );
}
```

**Pattern:**
- ✅ **Callback props** → Parent contrôle l'action
- ✅ **Hidden input + ref** → Trigger file dialog programmatiquement
- ✅ **Drag & drop complet** → onDragEnter/Leave/Drop
- ✅ **Validation côté client** → Taille + type avant callback
- ✅ **Loading state** → Désactive pendant upload

### 2.4 API Client Pattern

#### **Axios Instance Configuration**

**services/api.ts:**
```typescript
import axios, { AxiosInstance } from 'axios';

// Base URL depuis env avec fallback
export const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';
const API_V1 = `${API_BASE_URL}/api/v1`;

// Instance Axios centralisée
const apiClient: AxiosInstance = axios.create({
  baseURL: API_V1,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000, // 30 secondes
});

// Request interceptor (ajouter auth token si besoin)
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('auth_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor (gestion globale d'erreurs)
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Rediriger vers login
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// API endpoints organisés par feature
export const gpxApi = {
  upload: async (file: File): Promise<GPXUploadResponse> => {
    const formData = new FormData();
    formData.append('file', file);

    const response = await apiClient.post<GPXUploadResponse>(
      '/gpx/upload',
      formData,
      { headers: { 'Content-Type': 'multipart/form-data' } }
    );

    return response.data;
  },

  exportSegment: async (request: ExportRequest): Promise<Blob> => {
    const response = await apiClient.post('/gpx/export-segment', request, {
      responseType: 'blob', // Pour téléchargements
    });
    return response.data;
  },
};

export const shareApi = {
  createShare: async (state: any): Promise<ShareResponse> => {
    const response = await apiClient.post<ShareResponse>('/share/create', state);
    return response.data;
  },

  getShare: async (shareId: string): Promise<ShareResponse> => {
    const response = await apiClient.get<ShareResponse>(`/share/${shareId}`);
    return response.data;
  },
};
```

**Pourquoi ça fonctionne:**
- ✅ **Instance centralisée** → Config une fois
- ✅ **Interceptors** → Auth, error handling global
- ✅ **Namespaces** → `gpxApi`, `shareApi` (organisation)
- ✅ **TypeScript generics** → Type-safe responses
- ✅ **responseType: blob** → Downloads de fichiers

### 2.5 Database Pattern (SQLAlchemy)

#### **Models avec Relations**

**backend/app/db/models.py:**
```python
from sqlalchemy import Column, String, DateTime, Integer, Text, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime, timedelta
from app.db.database import Base

class User(Base):
    """Modèle utilisateur"""
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    # Relation
    shared_states = relationship("SharedState", back_populates="owner")

class SharedState(Base):
    """État partagé avec expiration"""
    __tablename__ = "shared_states"

    id = Column(Integer, primary_key=True, index=True)
    share_id = Column(String(12), unique=True, index=True, nullable=False)
    state_data = Column(Text, nullable=False)

    # Dates
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False, index=True)
    expires_at = Column(
        DateTime,
        default=lambda: datetime.utcnow() + timedelta(days=30),
        nullable=False,
        index=True
    )

    # Relation (optionnel)
    owner_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    owner = relationship("User", back_populates="shared_states")

    # Stats
    view_count = Column(Integer, default=0, nullable=False)

    # Methods
    def is_expired(self) -> bool:
        """Vérifie si expiré"""
        return datetime.utcnow() > self.expires_at

    def increment_views(self):
        """Incrémente compteur de vues"""
        self.view_count += 1
```

**Database Setup:**

**backend/app/db/database.py:**
```python
from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from app.core.config import settings

# Engine avec connection pooling
engine = create_engine(
    settings.DATABASE_URL,
    pool_pre_ping=True,  # Vérifie connexion avant utilisation
    pool_size=5,
    max_overflow=10,
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

def get_db():
    """
    Dependency pour FastAPI
    Crée une session DB et la ferme automatiquement
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def init_db():
    """Initialise la DB (crée les tables)"""
    Base.metadata.create_all(bind=engine)
```

**Usage dans API:**
```python
from fastapi import Depends
from sqlalchemy.orm import Session
from app.db.database import get_db
from app.db.models import SharedState

@router.post("/share/create")
async def create_share(
    state: ShareRequest,
    db: Session = Depends(get_db)
):
    # Créer objet
    shared_state = SharedState(
        share_id=generate_share_id(),
        state_data=state.json(),
    )

    # Sauvegarder
    db.add(shared_state)
    db.commit()
    db.refresh(shared_state)  # Get DB-generated values

    return {"share_id": shared_state.share_id}
```

**Pattern:**
- ✅ **Index** sur colonnes fréquemment recherchées
- ✅ **Default factories** → `lambda: datetime.utcnow() + timedelta(days=30)`
- ✅ **Relationships** → ORM joins automatiques
- ✅ **Methods sur models** → Business logic (is_expired)
- ✅ **Dependency injection** → `Depends(get_db)`

### 2.6 Rate Limiting Pattern

**backend/app/middleware/rate_limit.py:**
```python
from slowapi import Limiter
from slowapi.util import get_remote_address

# Limiter basé sur IP
limiter = Limiter(key_func=get_remote_address)
```

**Setup dans main.py:**
```python
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from app.middleware.rate_limit import limiter

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)
```

**Usage dans routes:**
```python
from fastapi import Request
from app.middleware.rate_limit import limiter

@router.post("/upload")
@limiter.limit("30/minute")  # 30 uploads par minute par IP
async def upload_file(request: Request, file: UploadFile):
    # ...
```

**Pattern:**
- ✅ **Decorator simple** → `@limiter.limit("30/minute")`
- ✅ **Per-IP** → Utilise `get_remote_address`
- ✅ **Global exception handler** → Retourne 429 automatiquement

---

## 3. CONVENTIONS

### 3.1 Naming Conventions

#### **Fichiers**

**Frontend:**
- Composants: `PascalCase` → `FileUpload.tsx`, `GPXMap.tsx`
- Utils/Services: `camelCase` → `utils.ts`, `api.ts`
- Config: `kebab-case` → `vite.config.ts`, `tailwind.config.js`
- Types: `camelCase.ts` → `gpx.ts`

**Backend:**
- Modules Python: `snake_case` → `gpx_parser.py`, `share_id.py`
- Config: `snake_case` → `config.py`, `database.py`

#### **Variables**

**TypeScript:**
```typescript
// camelCase pour variables/functions
const userProfile = getUserProfile();
const isLoading = true;

// PascalCase pour composants/types
interface UserProfile { }
const MyComponent = () => { };

// UPPER_SNAKE_CASE pour constantes
const API_BASE_URL = 'https://api.example.com';
const MAX_FILE_SIZE = 10 * 1024 * 1024;
```

**Python:**
```python
# snake_case pour variables/functions
user_profile = get_user_profile()
is_loading = True

# PascalCase pour classes
class GPXParser:
    pass

# UPPER_SNAKE_CASE pour constantes
MAX_UPLOAD_SIZE = 10485760
API_V1_STR = "/api/v1"
```

#### **Fonctions**

**TypeScript:**
```typescript
// Event handlers: handle + Event
const handleClick = () => { };
const handleFileChange = (e: ChangeEvent) => { };

// Boolean getters: is/has/can
const isValid = () => true;
const hasPermission = () => false;

// Format functions: format + Type
const formatDistance = (meters: number) => { };
```

**Python:**
```python
# CRUD: verb + noun
def get_user(user_id: int):
    pass

def create_share(state: dict):
    pass

# Boolean: is/has/can
def is_expired(self) -> bool:
    pass
```

### 3.2 Import Organization

#### **TypeScript**

```typescript
// 1. External libraries
import { useState, useRef } from 'react';
import { Upload } from 'lucide-react';
import axios from 'axios';

// 2. Internal components
import { Button } from './ui/Button';
import { Modal } from './ui/Modal';

// 3. Utils (avec alias @)
import { cn } from '@/lib/utils';
import { gpxApi } from '@/services/api';

// 4. Types
import type { GPXData, TrackPoint } from '@/types/gpx';

// 5. Styles (si nécessaire)
import './styles.css';
```

#### **Python**

```python
# 1. Standard library
from typing import List, Optional
from datetime import datetime
import os

# 2. Third-party
from fastapi import APIRouter, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel

# 3. Application (relative imports)
from app.core.config import settings
from app.db.database import get_db
from app.models.gpx import GPXData
```

### 3.3 Documentation Style

#### **TypeScript (JSDoc)**

```typescript
/**
 * Format distance from meters to km
 *
 * @param meters - Distance in meters
 * @returns Formatted string with km suffix
 *
 * @example
 * formatDistance(5000) // "5.00 km"
 */
export function formatDistance(meters: number): string {
  return `${(meters / 1000).toFixed(2)} km`;
}
```

#### **Python (Google Style)**

```python
def generate_share_id(length: int = 8) -> str:
    """
    Generate a random short ID for sharing

    Args:
        length: Length of the ID (default: 8 characters)

    Returns:
        Random Base62-encoded string

    Examples:
        >>> generate_share_id(8)
        'xK9mP2vL'
    """
    pass
```

---

## 4. PATTERNS AVANCÉS

### 4.1 Testing Pattern

**Vitest Test Structure:**

```typescript
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Button } from './Button';

describe('Button Component', () => {
  it('should render with text', () => {
    render(<Button>Click me</Button>);
    expect(screen.getByRole('button', { name: /click me/i }))
      .toBeInTheDocument();
  });

  it('should call onClick when clicked', () => {
    const handleClick = vi.fn();
    render(<Button onClick={handleClick}>Click</Button>);

    fireEvent.click(screen.getByRole('button'));

    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('should be disabled when disabled prop is true', () => {
    render(<Button disabled>Click</Button>);
    expect(screen.getByRole('button')).toBeDisabled();
  });
});
```

**Pattern AAA:**
1. **Arrange** → Setup (render, variables)
2. **Act** → Action (fireEvent.click)
3. **Assert** → Vérification (expect)

### 4.2 Environment Variables Pattern

**.env.example:**
```env
# APPLICATION
APP_NAME=Mon Application
ENVIRONMENT=production
DEBUG=False

# API
VITE_API_URL=https://api.example.com
API_V1_STR=/api/v1

# DATABASE
DATABASE_URL=postgresql://user:password@localhost:5432/dbname

# SECURITY (générer avec: openssl rand -hex 32)
SECRET_KEY=CHANGE_ME_USE_OPENSSL_RAND_HEX_32

# GOOGLE OAUTH
GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-your-secret
```

**Pattern:**
- ✅ Grouper par catégorie
- ✅ Commenter les secrets avec commande de génération
- ✅ Valeurs d'exemple (pas de secrets réels)

---

## 5. GUIDE D'ADAPTATION

### 5.1 Checklist Nouveau Projet

#### **Frontend**

```bash
# 1. Init Vite
npm create vite@latest my-app -- --template react-ts

# 2. Install essentials
npm install axios react-router-dom
npm install clsx tailwind-merge lucide-react
npm install -D tailwindcss postcss autoprefixer
npm install -D vitest @testing-library/react @testing-library/jest-dom

# 3. Copy configs
# - tsconfig.json (path aliases)
# - vite.config.ts (proxy API)
# - vitest.config.ts
# - tailwind.config.js (CSS variables)

# 4. Create structure
mkdir -p src/{components/ui,lib,services,types,test}

# 5. Copy utils
# - src/lib/utils.ts (cn function)
# - src/test/setup.ts
```

#### **Backend**

```bash
# 1. Create venv
python -m venv venv
source venv/bin/activate  # ou venv\Scripts\activate sur Windows

# 2. Install FastAPI
pip install fastapi uvicorn[standard] python-multipart
pip install pydantic-settings python-dotenv
pip install sqlalchemy psycopg2-binary alembic
pip install slowapi

# 3. Create structure
mkdir -p app/{api,core,db,models,services,utils}

# 4. Copy configs
# - app/core/config.py
# - app/db/database.py
# - app/main.py (FastAPI setup)

# 5. Create .env
cp .env.example .env
```

### 5.2 À Copier Tel Quel

**Ces patterns peuvent être copiés sans modification:**

1. ✅ `tsconfig.json` complet
2. ✅ `tailwind.config.js` avec CSS variables
3. ✅ `src/lib/utils.ts` (cn function)
4. ✅ `app/core/config.py` (Settings pattern)
5. ✅ `app/db/database.py` (SQLAlchemy setup)
6. ✅ Dockerfiles (multi-stage)
7. ✅ `nginx.conf`
8. ✅ Rate limiting setup

### 5.3 À Adapter

**Ces patterns nécessitent customization:**

1. 🔧 `vite.config.ts` → Changer proxy API URL
2. 🔧 `docker-compose.yml` → Noms de services, ports
3. 🔧 `.env` → Toutes les valeurs
4. 🔧 `package.json` scripts → Selon besoins
5. 🔧 API routes → Selon domaine métier

### 5.4 Quick Start Template

**Minimal viable setup:**

```typescript
// vite.config.ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') }
  },
  server: {
    proxy: { '/api': 'http://localhost:8000' }
  }
})
```

```python
# app/core/config.py
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    APP_NAME: str = "Mon API"
    DATABASE_URL: str
    SECRET_KEY: str

    class Config:
        env_file = ".env"

settings = Settings()
```

```python
# app/main.py
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings

app = FastAPI(title=settings.APP_NAME)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/health")
async def health():
    return {"status": "healthy"}
```

---

## CONCLUSION

Ces patterns ont été validés en production sur GPX Ninja et peuvent être réutilisés avec confiance.

**Points clés:**
1. ✅ Toujours utiliser TypeScript strict mode
2. ✅ Path aliases `@/*` pour imports propres
3. ✅ Pydantic Settings pour config backend
4. ✅ Multi-stage Docker builds
5. ✅ CSS variables pour theming
6. ✅ Rate limiting sur APIs publiques
7. ✅ Health checks dans tous les conteneurs
8. ✅ Centralized API client avec interceptors

**Next steps:**
- Copier les configs de base
- Adapter les valeurs d'environnement
- Garder la structure de dossiers
- Réutiliser les utility functions
- Suivre les conventions de nommage

**Ressources:**
- [Audit complet](./.claude/project-audit.md)
- [Documentation](../README.md)
