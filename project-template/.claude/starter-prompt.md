# 🚀 STARTER PROMPT - React + FastAPI Template

Ce document est un guide pour **démarrer un nouveau projet** basé sur ce template. Utilisez-le avec Claude Code ou votre AI assistant.

---

## 📋 CHECKLIST DE DÉMARRAGE

Copiez cette checklist et suivez chaque étape :

```markdown
## Projet: [NOM DU PROJET]

### Phase 1: Configuration Initiale
- [ ] Cloner/copier le template
- [ ] Renommer le dossier du projet
- [ ] Mettre à jour .env (copier depuis .env.example)
- [ ] Générer SECRET_KEY (`openssl rand -hex 32`)
- [ ] Générer POSTGRES_PASSWORD (mot de passe fort)
- [ ] Mettre à jour APP_NAME dans .env
- [ ] Mettre à jour les noms de conteneurs Docker (docker-compose.yml)

### Phase 2: Customisation de Base
- [ ] Mettre à jour title dans frontend/index.html
- [ ] Mettre à jour APP_NAME dans backend/app/core/config.py
- [ ] Personnaliser les couleurs du thème (frontend/src/index.css)
- [ ] Supprimer le contenu exemple de App.tsx
- [ ] Supprimer l'API exemple (backend/app/api/example.py)

### Phase 3: Premier Déploiement
- [ ] Tester en local: `docker-compose up --build`
- [ ] Vérifier frontend: http://localhost
- [ ] Vérifier backend: http://localhost:8000/docs
- [ ] Vérifier health checks: http://localhost:8000/health

### Phase 4: Développement
- [ ] Créer les premiers modèles de base de données
- [ ] Créer les premières routes API
- [ ] Créer les premiers composants frontend
- [ ] Écrire les premiers tests
```

---

## 🎯 PROMPT CLAUDE POUR DÉMARRER

Utilisez ce prompt avec Claude Code pour démarrer votre projet :

```
Je vais créer une nouvelle application appelée [NOM].

Contexte:
- Type d'application: [web app / API / SaaS / etc.]
- Fonctionnalités principales: [liste des features]
- Utilisateurs cibles: [qui va utiliser l'app]

Étapes:

1. SETUP INITIAL
   - Copier le template dans un nouveau dossier
   - Configurer les variables d'environnement
   - Générer les secrets (SECRET_KEY, passwords)
   - Renommer l'application partout

2. MODÈLES DE DONNÉES
   - Définir les entités principales de mon domaine
   - Créer les modèles SQLAlchemy (backend/app/db/models.py)
   - Créer les schémas Pydantic (backend/app/models/)
   - Créer les types TypeScript correspondants (frontend/src/types/)

3. API ENDPOINTS
   - Créer les routes CRUD pour chaque entité
   - Ajouter la validation des données
   - Implémenter la logique métier dans services/
   - Documenter avec docstrings

4. FRONTEND
   - Créer les pages principales
   - Créer les composants UI nécessaires
   - Connecter aux API endpoints
   - Gérer les états de loading/error

5. TESTS
   - Écrire des tests pour les endpoints critiques
   - Écrire des tests pour les composants principaux
   - Viser 70%+ de couverture

Commence par l'étape 1. Pour chaque étape, demande-moi confirmation avant de passer à la suivante.
```

---

## 🏗️ GUIDE DE DÉVELOPPEMENT

### 1. Structure Recommandée pour un Nouveau Feature

Exemple: Ajouter un système d'authentification

**Backend:**
```
backend/app/
├── api/
│   └── auth.py              # Routes: /login, /register, /me
├── models/
│   └── auth.py              # Schémas: LoginRequest, UserResponse
├── db/
│   └── models.py            # Modèle: User (ajouté)
├── services/
│   └── auth_service.py      # Logique: hash_password, verify_token
└── middleware/
    └── auth.py              # Middleware: get_current_user
```

**Frontend:**
```
frontend/src/
├── services/
│   └── api.ts               # authApi: { login, register, getMe }
├── components/
│   ├── LoginForm.tsx
│   └── ProtectedRoute.tsx
├── types/
│   └── auth.ts              # interfaces: User, LoginRequest
└── lib/
    └── auth.ts              # utils: getToken, setToken
```

### 2. Workflow de Développement

**Développement Local:**
```bash
# Terminal 1: Backend
cd backend
source venv/bin/activate
uvicorn app.main:app --reload

# Terminal 2: Frontend
cd frontend
npm run dev

# Terminal 3: Database
docker-compose up db  # Juste PostgreSQL
```

**Avec Docker (prod-like):**
```bash
docker-compose up --build
```

### 3. Conventions de Code

**Nommage:**
- Fichiers React: `PascalCase.tsx` (ex: `UserProfile.tsx`)
- Fichiers Python: `snake_case.py` (ex: `user_service.py`)
- Routes API: `/api/v1/resource-name` (kebab-case)
- Variables: camelCase (TS), snake_case (Python)

**Commits:**
```bash
git commit -m "feat: add user authentication"
git commit -m "fix: resolve login error handling"
git commit -m "docs: update API documentation"
```

**Imports:**
```typescript
// TypeScript - Ordre:
// 1. External (react, axios)
// 2. Components (@/components)
// 3. Utils (@/lib, @/services)
// 4. Types (@/types)
```

```python
# Python - Ordre:
# 1. Standard library (typing, datetime)
# 2. Third-party (fastapi, sqlalchemy)
# 3. App code (app.core, app.models)
```

---

## 🗄️ MODÈLES DE DONNÉES - GUIDE

### Créer un Nouveau Modèle (Exemple: Product)

**1. Modèle SQLAlchemy (backend/app/db/models.py):**
```python
class Product(Base):
    __tablename__ = "products"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    price = Column(Float, nullable=False)
    description = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, onupdate=datetime.utcnow)

    # Relations
    # owner_id = Column(Integer, ForeignKey("users.id"))
    # owner = relationship("User", back_populates="products")
```

**2. Schémas Pydantic (backend/app/models/product.py):**
```python
from pydantic import BaseModel

class ProductBase(BaseModel):
    name: str
    price: float
    description: str | None = None

class ProductCreate(ProductBase):
    pass

class ProductUpdate(BaseModel):
    name: str | None = None
    price: float | None = None
    description: str | None = None

class ProductResponse(ProductBase):
    id: int
    created_at: datetime

    class Config:
        from_attributes = True
```

**3. Types TypeScript (frontend/src/types/product.ts):**
```typescript
export interface Product {
  id: number;
  name: string;
  price: number;
  description?: string;
  created_at: string;
}

export interface ProductCreate {
  name: string;
  price: number;
  description?: string;
}

export interface ProductUpdate {
  name?: string;
  price?: number;
  description?: string;
}
```

**4. Routes API (backend/app/api/products.py):**
```python
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.db.database import get_db
from app.db.models import Product
from app.models.product import ProductCreate, ProductResponse

router = APIRouter()

@router.get("/products", response_model=list[ProductResponse])
async def get_products(db: Session = Depends(get_db)):
    return db.query(Product).all()

@router.post("/products", response_model=ProductResponse)
async def create_product(
    product: ProductCreate,
    db: Session = Depends(get_db)
):
    db_product = Product(**product.dict())
    db.add(db_product)
    db.commit()
    db.refresh(db_product)
    return db_product

@router.get("/products/{product_id}", response_model=ProductResponse)
async def get_product(product_id: int, db: Session = Depends(get_db)):
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(404, "Product not found")
    return product
```

**5. Client API (frontend/src/services/api.ts):**
```typescript
import { Product, ProductCreate } from '@/types/product';

export const productApi = {
  getAll: async (): Promise<Product[]> => {
    const response = await apiClient.get<Product[]>('/products');
    return response.data;
  },

  getById: async (id: number): Promise<Product> => {
    const response = await apiClient.get<Product>(`/products/${id}`);
    return response.data;
  },

  create: async (data: ProductCreate): Promise<Product> => {
    const response = await apiClient.post<Product>('/products', data);
    return response.data;
  },
};
```

**6. Enregistrer le Router (backend/app/main.py):**
```python
from app.api import products

app.include_router(
    products.router,
    prefix=f"{settings.API_V1_STR}",
    tags=["products"],
)
```

---

## 🎨 CUSTOMISATION UI

### Changer les Couleurs du Thème

Éditez `frontend/src/index.css`:

```css
:root {
  /* Votre couleur principale */
  --primary: 221 83% 53%;           /* HSL: Bleu */
  --primary-foreground: 0 0% 100%;  /* Blanc sur bleu */

  /* Couleur secondaire */
  --secondary: 210 40% 96%;         /* Gris clair */

  /* Couleur destructive (rouge) */
  --destructive: 0 84% 60%;         /* Rouge */
}
```

**Trouver les valeurs HSL:**
1. Choisir une couleur sur [coolors.co](https://coolors.co)
2. Convertir en HSL: [couleur] → HSL(221, 83%, 53%)
3. Format Tailwind: `221 83% 53%` (pas de "hsl()" ni virgules)

### Ajouter un Nouveau Composant UI

**Exemple: Card Component**

```tsx
// frontend/src/components/ui/Card.tsx
import { cn } from '@/lib/utils';
import { ReactNode } from 'react';

interface CardProps {
  children: ReactNode;
  className?: string;
}

export function Card({ children, className }: CardProps) {
  return (
    <div
      className={cn(
        'rounded-lg border bg-card p-6 shadow-sm',
        className
      )}
    >
      {children}
    </div>
  );
}

export function CardHeader({ children, className }: CardProps) {
  return (
    <div className={cn('mb-4', className)}>
      {children}
    </div>
  );
}

export function CardTitle({ children, className }: CardProps) {
  return (
    <h3 className={cn('text-2xl font-semibold', className)}>
      {children}
    </h3>
  );
}

export function CardContent({ children, className }: CardProps) {
  return (
    <div className={cn('text-muted-foreground', className)}>
      {children}
    </div>
  );
}
```

**Usage:**
```tsx
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';

<Card>
  <CardHeader>
    <CardTitle>Mon Titre</CardTitle>
  </CardHeader>
  <CardContent>
    Contenu de la carte
  </CardContent>
</Card>
```

---

## 🚀 DÉPLOIEMENT

### Déployer sur Coolify

1. **Pousser sur Git:**
```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/user/repo.git
git push -u origin main
```

2. **Dans Coolify:**
- New Project → Docker Compose
- Repository: votre repo GitHub
- Branch: `main`
- Compose File Path: `docker-compose.yml`

3. **Variables d'Environnement:**
Copier toutes les variables de `.env.example` dans Coolify

4. **Domaine:**
- Ajouter votre domaine (ex: `app.example.com`)
- Coolify génère automatiquement le certificat SSL

5. **Deploy:**
- Cliquer "Deploy"
- Suivre les logs

### Déployer sur Railway

1. **Connecter GitHub:**
- New Project → Deploy from GitHub
- Sélectionner votre repo

2. **Configuration:**
Railway détecte automatiquement Docker Compose

3. **Variables d'Environnement:**
Settings → Variables → Coller depuis .env.example

4. **Domaine:**
Settings → Generate Domain ou ajouter custom domain

### Déployer sur DigitalOcean App Platform

1. **Créer App:**
- Create → Apps → From GitHub

2. **Configuration:**
- Type: Docker Compose
- Plan: Choisir selon besoins

3. **Variables:**
App Settings → Environment Variables

---

## 🧪 TESTER L'APPLICATION

### Tests Backend

```bash
cd backend

# Installer dépendances de test
pip install -r requirements-dev.txt

# Créer un test
cat > tests/test_products.py << 'EOF'
def test_create_product(client):
    response = client.post(
        "/api/v1/products",
        json={"name": "Test Product", "price": 19.99}
    )
    assert response.status_code == 200
    assert response.json()["name"] == "Test Product"
EOF

# Lancer les tests
pytest
```

### Tests Frontend

```bash
cd frontend

# Créer un test
cat > src/test/components/Card.test.tsx << 'EOF'
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Card, CardTitle } from '@/components/ui/Card';

describe('Card', () => {
  it('renders children', () => {
    render(
      <Card>
        <CardTitle>Test Title</CardTitle>
      </Card>
    );
    expect(screen.getByText('Test Title')).toBeInTheDocument();
  });
});
EOF

# Lancer les tests
npm test
```

---

## 🔍 DEBUGGING

### Backend Debug

```python
# Ajouter dans app/main.py
import logging
logging.basicConfig(level=logging.DEBUG)

# Dans vos fonctions:
import logging
logger = logging.getLogger(__name__)
logger.debug(f"User data: {user}")
```

### Frontend Debug

```typescript
// Dans vos composants:
console.log('State:', state);

// Avec React DevTools:
// Install: https://react.dev/learn/react-developer-tools
```

### Docker Debug

```bash
# Voir les logs d'un service
docker-compose logs -f backend

# Entrer dans un conteneur
docker-compose exec backend bash

# Redémarrer un service
docker-compose restart backend
```

---

## 📚 RESSOURCES

### Documentation Officielle
- **FastAPI:** https://fastapi.tiangolo.com
- **React:** https://react.dev
- **Vite:** https://vitejs.dev
- **Tailwind CSS:** https://tailwindcss.com
- **SQLAlchemy:** https://docs.sqlalchemy.org

### Patterns Réutilisables
Voir `.claude/reusable-patterns.md` pour:
- Configurations validées
- Patterns de code
- Conventions de nommage
- Exemples complets

---

## 🆘 TROUBLESHOOTING

### "Module not found" (Frontend)

```bash
# Vérifier que les aliases sont configurés
cat frontend/tsconfig.json | grep "@/"
cat frontend/vite.config.ts | grep "@"

# Redémarrer le serveur Vite
npm run dev
```

### "Cannot connect to database" (Backend)

```bash
# Vérifier que PostgreSQL est démarré
docker-compose ps

# Vérifier DATABASE_URL dans .env
# Format: postgresql://user:password@host:port/dbname
```

### "CORS error"

```bash
# Backend: Vérifier BACKEND_CORS_ORIGINS dans .env
# Doit inclure l'URL du frontend
BACKEND_CORS_ORIGINS=http://localhost:5173,http://localhost

# Redémarrer le backend
docker-compose restart backend
```

---

## ✅ CHECKLIST PRÉ-PRODUCTION

Avant de déployer en production:

- [ ] SECRET_KEY généré et sécurisé
- [ ] POSTGRES_PASSWORD fort et sécurisé
- [ ] DEBUG=False en production
- [ ] CORS configuré pour domaines de production seulement
- [ ] SSL activé (HTTPS)
- [ ] Tests passent (backend + frontend)
- [ ] Build Docker réussit
- [ ] Health checks fonctionnent
- [ ] Backups base de données configurés
- [ ] Monitoring configuré (Sentry, Uptime Robot, etc.)
- [ ] Variables d'environnement documentées

---

**Bonne chance avec votre projet ! 🚀**

*Pour des questions spécifiques, consultez le README.md ou les docs officielles.*
