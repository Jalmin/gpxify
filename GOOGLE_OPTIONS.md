# Google Cloud - Choix de Configuration

Vous avez 2 options pour configurer Google OAuth pour GPXIFY.

---

## 🎯 Option 1 : Nouveau Projet (RECOMMANDÉ)

**Avantages** :
- ✅ Séparation claire PennylaneProject ↔ GPXIFY
- ✅ Quotas API indépendants
- ✅ Meilleure sécurité (isolation)
- ✅ Facturation séparée (suivi des coûts)
- ✅ Gestion d'équipe facilitée
- ✅ Professionnalisme

**Inconvénients** :
- ⏱️ 15 minutes de configuration
- 📝 Nouveau projet à gérer

**👉 Guide complet** : [GOOGLE_CLOUD_SETUP.md](./GOOGLE_CLOUD_SETUP.md)

### Résumé rapide

1. Créer projet "GPXIFY" sur Google Cloud
2. Configurer OAuth consent screen
3. Créer OAuth client ID
4. Activer Google Drive API
5. Copier Client ID et Secret

**Temps** : 15 minutes

---

## 🔄 Option 2 : Réutiliser PennylaneProject

**Avantages** :
- ⏱️ Rapide (5 minutes)
- ✅ Credentials déjà trouvés
- ✅ Pas de nouveau projet à créer

**Inconvénients** :
- ⚠️ Mélange de projets différents
- ⚠️ Quotas API partagés
- ⚠️ Moins professionnel
- ⚠️ Risque de conflits futurs

### Ce qu'il faut faire

1. Aller sur https://console.cloud.google.com/
2. Sélectionner projet **pennylanneanalytics**
3. APIs & Services → Credentials
4. Cliquer sur le client OAuth existant
5. Ajouter les URIs de redirection GPXIFY :
   ```
   https://gpxify.carapacebleue.com/api/v1/auth/google/callback
   https://gpxify.carapacebleue.com/auth/callback
   ```
6. Activer Google Drive API si pas déjà fait

### Credentials à utiliser

```env
GOOGLE_CLIENT_ID=646813821201-le0dqlhd1qr7r3v93rn4ni101ce9ltku.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=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
```

**Temps** : 5 minutes

---

## 🤔 Comparaison

| Critère | Option 1 (Nouveau) | Option 2 (Réutiliser) |
|---------|-------------------|----------------------|
| **Temps setup** | 15 min | 5 min |
| **Séparation** | ✅ Totale | ❌ Partagé |
| **Sécurité** | ✅ Meilleure | ⚠️ Moyenne |
| **Quotas API** | ✅ Dédiés | ⚠️ Partagés |
| **Facturation** | ✅ Séparée | ⚠️ Groupée |
| **Professionnalisme** | ✅ Élevé | ⚠️ Moyen |
| **Maintenance** | ✅ Simple | ⚠️ Complexe |
| **Recommandé pour** | Production | Prototype rapide |

---

## 💡 Notre Recommandation

### Pour GPXIFY en Production : **Option 1**

Créer un nouveau projet Google Cloud dédié à GPXIFY.

**Pourquoi** :
- Vous allez avoir des utilisateurs réels
- Vous voulez suivre les quotas API de GPXIFY
- Vous voulez une architecture propre et maintenable
- C'est une bonne pratique professionnelle

**10 minutes supplémentaires maintenant = beaucoup de temps économisé plus tard**

### Si vous testez juste : Option 2

Si vous voulez juste tester rapidement Coolify et voir si tout fonctionne, Option 2 est acceptable.

**Mais** : Il faudra migrer vers Option 1 avant de mettre réellement en production.

---

## 📝 Votre Choix

### J'ai choisi Option 1 (Nouveau Projet)

➡️ **Checklist pas-à-pas** : [GOOGLE_CLOUD_CHECKLIST.md](./GOOGLE_CLOUD_CHECKLIST.md) ⭐ **RECOMMANDÉ**

➡️ **Guide détaillé** : [GOOGLE_CLOUD_SETUP.md](./GOOGLE_CLOUD_SETUP.md)

### J'ai choisi Option 2 (Réutiliser PennylaneProject)

➡️ Suivre les étapes ci-dessus puis retourner à [DEPLOY_START.md](./DEPLOY_START.md)

Utiliser ces credentials dans Coolify :
```env
GOOGLE_CLIENT_ID=646813821201-le0dqlhd1qr7r3v93rn4ni101ce9ltku.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=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
```

---

## 🔄 Peut-on changer plus tard ?

**Oui !** Vous pouvez commencer avec Option 2 puis migrer vers Option 1.

### Migration

1. Créer le nouveau projet GPXIFY (suivre GOOGLE_CLOUD_SETUP.md)
2. Mettre à jour les variables d'env dans Coolify
3. Redéployer

**Temps de migration** : 20 minutes
**Downtime** : ~2 minutes pendant le redéploiement

---

## ✅ Checklist Finale

**Option 1 (Nouveau Projet)** :
- [ ] Projet Google Cloud "GPXIFY" créé
- [ ] OAuth consent screen configuré
- [ ] Client ID créé avec bonnes URIs
- [ ] Google Drive API activée
- [ ] Client ID et Secret copiés
- [ ] Variables mises à jour dans Coolify

**Option 2 (Réutiliser)** :
- [ ] Accès au projet pennylanneanalytics
- [ ] URIs GPXIFY ajoutées au client OAuth existant
- [ ] Google Drive API activée (si pas déjà)
- [ ] Credentials notés
- [ ] Variables configurées dans Coolify

---

**Bon choix ! 🚀**

Quelle que soit votre option, tout est documenté et fonctionnera parfaitement.
