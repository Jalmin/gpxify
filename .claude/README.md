# Structure .claude/ - Guide d'Utilisation

Ce dossier configure **Claude Code** pour maintenir le contexte du projet GPXIFY.

---

## Pour les Développeurs

Avant d'utiliser Claude Code sur ce projet :

1. **Lire** [CLAUDE.md](CLAUDE.md) pour le contexte global
2. **Consulter** les fichiers `rules/` pertinents pour votre tâche
3. **Utiliser** les commandes custom (`/doc`, `/deploy`, etc.) pour workflows structurés

---

## Pour Claude Code

### Fichiers Automatiquement Lus
- **CLAUDE.md** : Lu automatiquement au démarrage de chaque session

### Fichiers à Charger à la Demande
- **rules/*.md** : Conventions spécifiques selon la tâche
- **commands/*.md** : Instructions pour commandes custom
- **context/*.md** : Contexte "stateful" (sprint, blockers)
- **templates/*.md** : Modèles de documents réutilisables

---

## Arborescence

```
.claude/
├── CLAUDE.md                    # 🔴 CORE - Contexte global (lu automatiquement)
├── README.md                    # 📖 Ce guide
│
├── rules/                       # 📋 Règles & Conventions
│   ├── code-style.md            # Style de code, formatting
│   ├── testing.md               # Stratégie de tests
│   ├── security.md              # Exigences sécurité & GDPR
│   ├── api-design.md            # Design API REST
│   ├── database.md              # Patterns DB & migrations
│   └── git-workflow.md          # Workflow Git
│
├── commands/                    # 🤖 Commandes Custom
│   ├── doc.md                   # /doc - Documentation
│   ├── deploy.md                # /deploy - Déploiement
│   ├── audit.md                 # /audit - Audit sécurité
│   ├── test.md                  # /test - Tests
│   ├── refactor.md              # /refactor - Refactoring
│   └── debug.md                 # /debug - Debugging
│
├── context/                     # 💾 Contexte Stateful
│   ├── current-sprint.md        # Sprint actuel
│   ├── blockers.md              # Problèmes bloquants
│   └── learning-log.md          # Découvertes récentes
│
└── templates/                   # 📝 Templates
    ├── decision-record.md       # Template ADR
    ├── incident-report.md       # Template incident
    └── api-endpoint.md          # Template endpoint
```

---

## Maintenance

### Fréquence de Mise à Jour

| Fichier | Fréquence | Responsable |
|---------|-----------|-------------|
| CLAUDE.md | Mensuelle ou changement majeur | Lead dev |
| rules/*.md | Quand patterns émergent | Équipe |
| context/*.md | Chaque sprint | PM / Lead |
| templates/*.md | Ad-hoc | Équipe |

### Checklist de Review

```markdown
- [ ] CLAUDE.md reflète l'état actuel du projet
- [ ] Points d'attention actuels sont à jour
- [ ] Décisions architecturales documentées
- [ ] Problèmes connus listés
```

---

## Bonnes Pratiques

### Quand Modifier ces Fichiers

✅ **Faire**
- Ajouter une décision architecturale importante dans CLAUDE.md
- Créer une règle dans `rules/` si un pattern devient récurrent
- Mettre à jour `context/` après chaque sprint
- Documenter un incident dans `context/learning-log.md`

❌ **Éviter**
- Documenter des détails temporaires dans CLAUDE.md
- Créer des règles pour des cas isolés
- Laisser `context/` obsolète pendant plusieurs sprints
- Dupliquer la documentation existante (README.md, ARCHITECTURE.md)

---

## Commandes Claude Code Utiles

```bash
# Charger un fichier de règles spécifique
@.claude/rules/testing.md

# Voir le contexte actuel
@.claude/context/current-sprint.md

# Utiliser un template
@.claude/templates/api-endpoint.md
```

---

**Note** : Ce dossier est versionné dans Git. Toute modification doit passer par un commit.
