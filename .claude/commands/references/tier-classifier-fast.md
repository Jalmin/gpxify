# Tier Classifier Fast — Pre-classification hybride

*Heuristique regex en première passe (gratuit), sub-agent light en fallback (~300 tokens). Appelé par l'étape 0bis du Speccer pour décider le tier avant chargement des refs lourdes.*

**Contrat de sortie :** `XS | S | M | null` (jamais autre valeur).

---

## Section 1 — Heuristique regex (passe déterministe)

Appliquer dans cet ordre **strict** (premier match gagne). Inspecter `titre + description` user (case-insensitive).

### 1.1 Signaux M force (return "M")

Si UN de ces patterns matche → return `"M"` immédiatement :

```
\b(auth|oauth|sso|jwt|session|cookie)\b
\b(migration|schema|rls|rbac|permissions?)\b
\b(refactor|refactoring|refonte)\b    # refonte, quelle que soit sa portée
\b(architecture|archi)\b
\b(syst[èe]me)\b                       # "système"
\bapi\s+(complete|enti[èe]re)\b
plus de \d+ fichiers
\b\d+\s+fichiers? .*(touch|modif|impact)\b
```

### 1.2 Signaux XS (return "XS")

Si AUCUN signal M et UN de ces patterns matche → return `"XS"` :

```
\b(typo|fote|coquille|accent)\b
\b(label|copy|libell[ée]|wording)\b
\b(rename|renommer|renomme)\b
\b(date|version|num[ée]ro)\b
\b(update|mettre? [àa] jour) .*\b(date|version|valeur|constante)\b
\b1 ligne\b
\b1 mot\b
```

**Note (suppression du pattern `dans le fichier X`) :** historiquement on classait XS dès qu'un seul fichier était mentionné. Mais "implémenter le parser complet dans le fichier parser.ts" est 1 fichier ET clairement M. Ce signal seul ne suffit donc plus — il faut un autre signal trivial (typo/label/rename/date/etc.). Si seul "dans le fichier X" matche → fall through vers section 1.3 puis 1.4 puis sub-agent.

### 1.3 Signaux S (return "S")

Si AUCUN signal M/XS et UN de ces patterns matche → return `"S"` :

```
\b(fix|fixe|corrige|corriger) .*\b(bug|erreur|problem)\b
\b(ajouter?|add) .*\b(champ|field|input|param|param[èe]tre)\b
\b(refacto|refactoriser) .*\b(fichier|function|method)\b
\b(helper|util|utility)\b
\bvalid(?:e|es|é|és|ée|ées|ation|ations)?\b   # valid/valide(s)/validé(e)(s)/validation(s) — PAS invalide, PAS validateur
\bsanitiz(?:e|ed)?\b
\bsanitis(?:e|er|ation|ations)?\b
\b(remove|supprimer|enlever) .*\b(unused|legacy|obsolet)\b
```

### 1.4 Fallback

Si AUCUN pattern ne matche → return `null` → déclenche le sub-agent light (section 2).

---

## Section 2 — Sub-agent light (passe LLM, fallback)

Appelé UNIQUEMENT si la regex retourne `null`. Prompt court (~300 tokens).

### 2.1 Prompt à passer au sub-agent

```
Tu es un classifier de complexité de tasks. Lis ce titre + description, réponds en JSON strict.

INPUT:
{titre_et_description}

RÈGLES — réponds à 3 questions binaires, DANS CET ORDRE :
Q1: La modif introduit-elle une nouvelle abstraction, ou est-ce une refonte ?
Q2: La modif touche-t-elle au plus 2 fichiers ET au plus 60 lignes ?
Q3: La modif touche-t-elle au plus 3 fichiers ET au plus 200 lignes ?

MAPPING (premier cas vrai gagne, on s'arrête) :
- Q1=oui → "M"
- Q2=oui → "XS"
- Q3=oui → "S"
- sinon  → "M"

OUTPUT (JSON strict, rien d'autre):
{
  "tier": "XS" | "S" | "M",
  "rationale": "1 phrase courte expliquant les réponses Q1/Q2/Q3",
  "junior_needs_how": true | false
}
```

> **Réordonnancement T213 (2026-09-15) — la taille décide XS et S, le *how* ne décide plus rien.** L'ancienne `Q1` (« un dev junior aurait-il besoin d'instructions step-by-step ? ») court-circuitait tout le mapping vers `M`. Sur Ziggy elle a rendu **27 M pour 2 S et 2 XS**, parce qu'une description un peu écrite y répond toujours `oui`. Les deux questions de taille reprennent désormais les bornes conjonctives de `task-schema.md` (`≤2 fichiers ET ≤60 lignes` pour XS, `≤3 fichiers ET ≤200 lignes` pour S) au lieu de deux questions séparées combinées par `OU`.
> Le champ `junior_needs_how` **entre dans l'output** et y reste : il sert à juger la profondeur du Prompt à écrire, **jamais** à choisir un tier. Seul `tier` est contractuel au sens de §2.2 — un `junior_needs_how` absent ou non booléen n'invalide pas la réponse.
>
> **`Q1` reste en tête** : une abstraction ou une refonte prend une review `opus` (M), quelle que soit sa taille. Plus aucun tier `L` ni rejet par la taille depuis T233-T234 (2026-10-04).
>
> **Recalibrage T207 (2026-09-14), conservé.** Les bornes de taille (2 fichiers, 60 lignes) viennent des bornes XS de `task-schema.md` ; T213 leur ajoute celles de S (3 fichiers, 200 lignes). Ce qui a bougé depuis l'arbitrage du 2026-08-02, c'est le **mapping** lui-même : il ne fait plus foi contre l'arbre de `task-schema.md`, il en est la transcription. En cas de désaccord, c'est l'arbre qui gagne.
> Conséquence connue, héritée de T207 et **non refermée ici** : plus aucun cas ne couvre la branche « >2 fichiers mais peu de lignes » seule (l'ancien B4 de `tier-classifier.test.md` en dépendait). Trou documenté là-bas.

### 2.2 Validation de la sortie

- Si JSON invalide ou tier hors enum → return `null` → demander au user de trancher manuellement
- Si timeout > 10s → return `null` + log warning

---

## Section 3 — Override user

Si le user passe explicitement un tier en argument (`/shika-speccer tier=M`) :
- Bypass totalement les sections 1 et 2
- Logger un warning : *"⚠ Override user : tier={X} forcé, classifier sauté"*

---

## Section 4 — Logging

Chaque appel au pre-classifier loggue dans `.shikamaru/speccer-log.json` (append) :

```json
{
  "timestamp": "2026-06-08T09:00:00Z",
  "input_preview": "Fix typo dans README.md",
  "method": "regex" | "sub-agent" | "override",
  "tier": "XS" | "S" | "M" | null,
  "tokens_estimated": 0 | 300 | 0,
  "rationale": "..."
}
```

Le fichier `.shikamaru/speccer-log.json` est créé au premier appel s'il n'existe pas (array vide initial). Pas de rotation automatique — c'est à un autre skill (`/shika-improve` ?) de l'analyser.

---

## Section 5 — Exemples canoniques (validation manuelle)

| # | Input | Méthode | Tier attendu | Rationale |
|---|-------|---------|--------------|-----------|
| 1 | "Fix typo dans README.md" | regex | XS | match `\btypo\b` |
| 2 | "Refactor auth middleware OAuth2" | regex | M | match `\brefactor\b` + `\bauth\b` |
| 3 | "Migration schema Postgres v2" | regex | M | match `\bmigration\b` + `\bschema\b` |
| 4 | "Ajouter champ téléphone au formulaire contact" | regex | S | match `ajouter .* champ` |
| 5 | "Update date dans footer.html" | regex | XS | match `update .* date` |
| 6 | "Update parser logic for new format" | sub-agent | S | Q1=non (pas d'abstraction), Q2=non (probable >60 lignes), Q3=oui |
| 7 | "Implement caching layer for API responses" | sub-agent | M | Q1=oui (nouvelle abstraction) — inchangé par T213, mais c'est désormais la PREMIÈRE question |
| 8 | "Améliorer la validation du formulaire" | **regex** | S | match `\bvalidation\b` via le signal 1.3 élargi (2026-08-02) — ne passe plus par le sub-agent |
| 10 | "Rename const FOO en BAR dans utils.ts" | regex | XS | match `\brename\b` (signal trivial, pas seulement "dans le fichier") |

> **Le mapping §2.1 fait foi sur cette table.** Arbitrage du 2026-08-02 : la Section 5 est une illustration, §2.1 est l'algorithme réellement exécuté. En cas de désaccord, c'est l'illustration qu'on corrige, jamais le mapping. Le cas 8 a été le premier désaccord constaté : il s'est résolu en sortant du chemin du sub-agent (regex élargie), pas par arbitrage.
> **Amendement T213 (2026-09-15) :** §2.1 ne fait plus foi *contre l'arbre* de `task-schema.md` — il en est la transcription pour le sous-agent léger. La chaîne d'autorité est désormais : arbre de `task-schema.md` → mapping §2.1 → cette table.

---

## Section 6 — Anti-patterns à refuser

- ❌ Mélanger plusieurs listes de mots-clés entre tiers (chaque mot-clé n'appartient qu'à UN tier)
- ❌ Appeler le sub-agent si la regex a déjà tranché un tier non-null
- ❌ Logger des inputs > 200 char dans speccer-log (tronquer à 200 char pour `input_preview`)
