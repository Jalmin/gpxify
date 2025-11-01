#!/bin/bash

# Script de démarrage du frontend GPXIFY

echo "🚀 Démarrage du frontend GPXIFY..."

# Vérifier si node_modules existe
if [ ! -d "node_modules" ]; then
    echo "❌ node_modules non trouvé. Installation des dépendances..."
    npm install
fi

# Vérifier si .env existe
if [ ! -f ".env" ]; then
    echo "⚠️  Fichier .env non trouvé. Copie depuis .env.example..."
    cp .env.example .env
fi

echo "✅ Frontend démarré sur http://localhost:5173"
echo ""

# Démarrer le serveur de développement
npm run dev
