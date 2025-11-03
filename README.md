# GPXIFY

**L'outil tout-en-un pour analyser, fusionner et optimiser vos traces GPX de trail**

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.115-green.svg)](https://fastapi.tiangolo.com)
[![React](https://img.shields.io/badge/React-18-blue.svg)](https://reactjs.org)

🌐 **[www.gpx.ninja](https://www.gpx.ninja)**

---

## ✨ Fonctionnalités

### 📊 Analyse complète de traces GPX
- **Profil d'altitude** interactif avec carte synchronisée
- **Statistiques détaillées** : distance, D+, D-, pente moyenne, altitude min/max
- **Visualisation cartographique** avec Leaflet et profils d'élévation
- **Support multi-traces** : chargez et comparez plusieurs fichiers GPX

### 🔀 Fusion de fichiers GPX
- **Drag & drop** pour réorganiser l'ordre de fusion
- **Détection automatique** des trous et chevauchements
- **Interpolation intelligente** entre segments discontinus
- **Options avancées** : tri temporel, seuil de détection personnalisable
- **Aperçu et téléchargement** du fichier fusionné

### 📋 Tableaux de ravitaillement
- **Calcul automatique** des statistiques entre ravitaillements
- **Formule de Naismith** pour estimer les temps (ou allure personnalisée)
- **Export CSV** pour impression ou partage
- **Statistiques par segment** : distance, D+/D-, pente, temps estimé et cumulé

### 🔗 Partage anonyme
- **Liens partageables** sans inscription requise
- **Expiration automatique** après 30 jours
- **Partage sécurisé** de vos analyses complètes

---

## 🛠️ Stack technique

### Frontend
- **React 18** avec TypeScript
- **Vite** pour le build ultra-rapide
- **TailwindCSS** pour le design
- **React Router v7** pour la navigation
- **Leaflet** pour les cartes interactives
- **Leaflet Elevation** pour les profils d'altitude

### Backend
- **FastAPI** (Python) pour l'API REST
- **GPXpy** pour le parsing de fichiers GPX
- **PostgreSQL** pour le stockage des partages
- **SQLAlchemy** comme ORM
- **Pandas & NumPy** pour les calculs statistiques
- **SlowAPI** pour le rate limiting

### Infrastructure
- **Docker** multi-stage builds
- **Nginx** pour le reverse proxy
- **Coolify** pour le déploiement
- **Fathom Analytics** (RGPD compliant, sans cookies)

---

## 🚀 Démarrage rapide

### Option 1 : Utilisation en ligne

Visitez [gpxify.carapacebleue.com](https://gpxify.carapacebleue.com) - aucune installation nécessaire !

### Option 2 : Installation locale avec Docker

```bash
# Cloner le repository
git clone https://github.com/Jalmin/gpxify.git
cd gpxify

# Lancer avec Docker Compose
docker-compose up
```

L'application sera accessible sur :
- Frontend : [http://localhost](http://localhost)
- Backend API : [http://localhost:8000](http://localhost:8000)
- Documentation API : [http://localhost:8000/docs](http://localhost:8000/docs)

---

## 📖 Documentation

### API Endpoints

#### GPX Analysis
```bash
# Upload et analyse d'un fichier GPX
POST /api/v1/gpx/upload
Content-Type: multipart/form-data

# Fusionner plusieurs fichiers GPX
POST /api/v1/gpx/merge
Content-Type: application/json

# Générer un tableau de ravitaillement
POST /api/v1/gpx/aid-station-table
Content-Type: application/json
```

#### Partage
```bash
# Créer un lien de partage
POST /api/v1/share/save

# Récupérer un état partagé
GET /api/v1/share/{share_id}
```

Documentation complète : [API Documentation](https://gpxify.carapacebleue.com/api/docs)

---

## 🔒 Confidentialité & Sécurité

- ✅ **Aucun cookie** : Analytics via Fathom (conforme RGPD)
- ✅ **Données temporaires** : fichiers GPX supprimés immédiatement après analyse
- ✅ **Partages éphémères** : expiration automatique après 30 jours
- ✅ **Rate limiting** : protection contre les abus
- ✅ **HTTPS** : communications chiffrées
- ✅ **Open source** : code auditable publiquement

---

## 📝 Formats supportés

- **GPX** (GPS Exchange Format) - `.gpx`
- Taille maximale : **10 MB** par fichier
- Compatible avec toutes les montres GPS et applications (Garmin, Suunto, Strava, Komoot, etc.)

---

## 🤝 Contribution

Les contributions sont les bienvenues !

1. Fork le projet
2. Créez votre branche (`git checkout -b feature/AmazingFeature`)
3. Committez vos changements (`git commit -m 'Add some AmazingFeature'`)
4. Poussez vers la branche (`git push origin feature/AmazingFeature`)
5. Ouvrez une Pull Request

---

## 📜 Licence

Ce projet est sous licence MIT. Voir le fichier [LICENSE](LICENSE) pour plus de détails.

---

## 💬 Support & Contact

- 🐛 **Issues** : [GitHub Issues](https://github.com/Jalmin/gpxify/issues)
- ❓ **FAQ** : [gpxify.carapacebleue.com/faq](https://gpxify.carapacebleue.com/faq)
- 📧 **Email** : Via GitHub

---

## 🙏 Remerciements

- Créé avec ❤️ pour la communauté trail et outdoor
- Propulsé par [Claude Code](https://claude.com/claude-code)
- Merci à tous les contributeurs et utilisateurs !

---

**⭐ Si vous aimez ce projet, n'hésitez pas à lui donner une étoile sur GitHub !**
