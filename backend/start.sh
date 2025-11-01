#!/bin/bash

# Script de démarrage du backend GPXIFY

echo "🚀 Démarrage du backend GPXIFY..."

# Vérifier si l'environnement virtuel existe
if [ ! -d "venv" ]; then
    echo "❌ Environnement virtuel non trouvé. Veuillez exécuter:"
    echo "   python3 -m venv venv"
    echo "   source venv/bin/activate"
    echo "   pip install -r requirements.txt"
    exit 1
fi

# Activer l'environnement virtuel
source venv/bin/activate

# Vérifier si .env existe
if [ ! -f ".env" ]; then
    echo "⚠️  Fichier .env non trouvé. Copie depuis .env.example..."
    cp .env.example .env
fi

# Créer le dossier uploads
mkdir -p uploads

echo "✅ Backend démarré sur http://localhost:8000"
echo "📚 Documentation API: http://localhost:8000/docs"
echo ""

# Démarrer le serveur
python -m app.main
