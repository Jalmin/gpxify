# Fixture de parsing du champ `**Smoke:**` (T47)

> Fichier de TEST du gate `scripts/smoke.ts`, PAS un vrai backlog. Il n'est lu
> que par `npx tsx scripts/smoke.ts --tasks-file scripts/__fixtures__/smoke-parse.md`.
> `scripts/validate.ts` ne le voit pas : il ne résout que les artefacts nommés
> `TASKS.md` / `SPEC.md`.
>
> Les 14 sections ci-dessous sont le harnais de non-régression du parseur.
>
> ⚠️ **Cette table ne fait PAS foi — elle est le miroir lisible de
> `scripts/verifier-harnais-smoke.ts`, qui porte les verdicts attendus EN CODE
> et sort en code ≠ 0 à la première divergence.** Toute modification ici doit
> être reportée là-bas, et réciproquement. Avant T90 les verdicts n'existaient
> que dans cette table, que rien n'assérait : **2 des 6 étaient faux depuis T47
> sans que personne le voie** (T900 et T903, tous deux « skipped » au lieu de
> PASS et FAIL). Un harnais qu'on lit n'est pas un harnais qu'on exécute.
>
> | Section | Forme du champ | Verdict attendu | Assertions retenues |
> |---|---|---|---|
> | T900 | `- **Smoke:**` (item de liste) | PASS, exit 0 | 1 |
> | T901 | `**Smoke:**` (dialecte canonique) | PASS, exit 0 | 1 |
> | T902 | AUCUN champ + une MENTION en prose | skipped, exit 0 — *champ absent* | 0 |
> | T903 | `- **Smoke:**` dont l'assert est `false` | **FAIL, exit ≠ 0** | 1 |
> | T904 | `- **Smoke:**` VIDE, suivi d'un autre champ | skipped, exit 0 — *champ présent mais vide* | 0 |
> | T905 | `***Smoke:***` en gras-italique, aucun champ | skipped, exit 0 — *champ absent* | 0 |
> | T906 | `- **Smoke:**` VIDE suivi d'un champ en **minuscule** | skipped, exit 0 — *champ présent mais vide* | 0 |
> | T907 | champ ET assertions en puce `*` | PASS, exit 0 | 1 |
> | T908 | bloc suivi d'un champ **non-gras** `- Rollback:` | PASS, exit 0 | 1 |
> | T909 | bloc suivi d'un champ **non-gras** `- Statut:` (nom absent de la liste close) | PASS, exit 0 | 1 |
> | T910 | assertion ouverte en GRAS (`- **assert:** \`false\``) dans le bloc | **FAIL, exit ≠ 0** | 1 |
> | T911 | bloc suivi d'un champ du SCHÉMA que validate.ts ne lit pas (`- Notes:`) | PASS, exit 0 | 1 |
> | T912 | assertion TUÉE par `SMOKE_ASSERT_TIMEOUT_MS` (`sleep 30`) | **error, exit ≠ 0** | 1 |
> | T913 | un échec MESURÉ (`false`) + un timeout dans le même bloc | **FAIL, exit ≠ 0** | 2 |
>
> T912 et T913 sont nées de T177. Elles sont les deux moitiés d'une même règle de
> PRÉCÉDENCE : `FAIL` est réservé aux échecs MESURÉS, `error` dit qu'on n'a pas
> pu mesurer — et quand les deux coexistent, la mesure qui a conclu l'emporte.
> Les deux verdicts sortent en exit 1 : l'étiquette change, la sévérité jamais.
> Elles sont les deux seules sections du harnais dont le verdict dépend d'une
> VARIABLE D'ENVIRONNEMENT (`SMOKE_ASSERT_TIMEOUT_MS=1000`, porté par le champ
> `env` de leur attendu) — sans elle, `sleep 30` conclurait avant le timeout par
> défaut de 60 s et les deux sections mesureraient autre chose que ce qu'elles
> nomment.
>
> T909 est née de la review codex du correctif de T91 lui-même. T908 avait
> réparé le **dialecte** (non-gras reconnu) avec un **vocabulaire** incomplet :
> `Statut` et `Review`, que `validate.ts` lit explicitement, manquaient de la
> liste close — mesuré à **2 assertions au lieu d'1**, appât exécuté. Un
> dialecte reconnu ne sert à rien sur un nom qu'on n'a pas écrit. La garde
> anti-dérive de `verifier-harnais-smoke.ts` relit désormais les lecteurs de
> `validate.ts` et échoue si un nom qu'il accepte manque à la liste.
>
> T908 est née de la passe de découverte du 2026-08-12 (T91). Elle est
> ADVERSARIALE : la sentinelle de fin ne connaissait que le dialecte GRAS, alors
> que `validate.ts` accepte le NON-GRAS en lecture. Mesuré avant correctif :
> **2 assertions au lieu d'1**, l'appât `- Rollback: \`echo …\`` exécuté, verdict
> PASS. Deux autres formes du même chemin ont été mesurées et sont couvertes par
> le même correctif : le champ non-gras précédé d'une **ligne vide**, et le champ
> non-gras en **colonne 0** suivi d'une puce (2 assertions dans les deux cas).
>
> **Aucune section de ce fixture ne porte plus de commande capable de modifier le
> dépôt.** L'appât de T904 était une commande d'annulation de commit — elle a fait feu pendant le
> run 005. Le harnais EXÉCUTE le gate sur chaque section avant de pouvoir crier :
> une régression doit se voir au COMPTE d'assertions retenues et à l'ABSENCE de
> la sentinelle dans le rapport, jamais aux dégâts. Les appâts sont donc tous des
> `echo APPAT-…-A-FAIT-FEU`, et `verifier-harnais-smoke.ts` vérifie que cette
> chaîne n'apparaît nulle part dans le rapport.
>
> T906 et T907 sont nées de la **review de T90** : l'élargissement de la
> détection avait ouvert deux chemins que le harnais ne couvrait pas. T906 est
> ADVERSARIALE — le terminateur n'acceptait que `**[A-Z]`, donc un champ suivant
> en minuscule ne fermait pas le bloc et sa puce partait en assertion exécutée,
> soit le chemin de l'appât de T904 par une autre porte. T907 dit que la
> détection et la lecture des puces doivent accepter la MÊME classe de marqueur :
> la détection s'ouvrait à `*` et `+` quand la boucle n'acceptait que `-`, si
> bien qu'un champ en `*` sortait « 0 assertion déclarée » alors qu'il en
> déclarait une — un faux vert au message mensonger.
>
>
> Les deux nuances de `skipped` se distinguent par le `message` du rapport, pas
> par le verdict ni par le code de sortie (T90) : un champ ABSENT ne prétend pas
> être gardé, un champ PRÉSENT MAIS VIDE le prétend et ne l'est pas. C'est cette
> confusion qui a laissé 31 assertions dormir dans `TASKS.md`.
>
> T902, T904 et T905 sont ADVERSARIALES : aucune n'a de commande à exécuter, et
> les deux dernières portent une sentinelle `echo` en appât. Toute sortie autre
> que `skipped` / `0 assertion retenue` sur ces trois sections signifie que le
> parseur exécute du texte qui n'est pas une assertion.
>
> T902 est le cœur du harnais : c'est le défaut trouvé sur la spec de T160, où
> une simple mention du nom du champ dans une phrase était captée AVANT le vrai
> champ et faisait sortir le gate EN VERT. Il doit rester `skipped` exit 0 quoi
> qu'il arrive au parseur.
>
> **L'appât de T904 n'est pas théorique — il a fait feu.** Pendant l'écriture de
> T90, un état intermédiaire élargissait la DÉTECTION (`- **Smoke:**` reconnu)
> sans élargir la TERMINAISON : le bloc vide de T904 a couru jusqu'au heading, a
> capté le champ `Rollback` de la ligne suivante comme une assertion, et l'a
> **exécuté**. Ce champ portait alors une commande d'annulation de commit : un
> commit d'annulation a été créé sur la branche de travail et a sorti la spec en
> cours de `TASKS.md`. Les deux moitiés du parseur sont COUPLÉES : élargir l'une
> sans l'autre est pire que ne rien faire. C'est aussi pourquoi l'appât est
> désormais inoffensif (T91) — un harnais de non-régression ne doit pas être une
> arme chargée.

### T900: Champ Smoke écrit en item de liste — doit être détecté

- **Tier** : XS
- **Type** : test-fixture
- **Status** : ready
- **Goal** : Prouver qu'un champ `**Smoke:**` précédé d'un marqueur de liste est
  détecté. C'est la forme utilisée par les 12 champs de `TASKS.md`.
- **Smoke:** (fixture — CLI, aucun serveur à lancer)
  - assert: `echo PARSE-OK | grep -q PARSE-OK`

### T901: Champ Smoke au dialecte canonique — non-régression

- **Tier** : XS
- **Type** : test-fixture
- **Status** : ready
- **Goal** : Prouver que la forme sans marqueur de liste, seule reconnue avant
  T47, continue d'être reconnue après.

**Smoke:** (fixture — CLI, aucun serveur à lancer)
  - assert: `echo PARSE-OK | grep -q PARSE-OK`

### T902: Aucun champ Smoke, mais une mention en prose — doit rester un skip

- **Tier** : XS
- **Type** : test-fixture
- **Status** : ready
- **Goal** : Garder la protection ajoutée en T160. Cette section ne porte AUCUN
  champ `**Smoke:**`, seulement la phrase ci-dessous qui en cite le nom.
- **Done** :
  - [ ] une task sans **Smoke:** reste un skip
- **Rollback** : aucun, section de fixture.

### T903: Champ Smoke en item de liste dont l'assert échoue — doit sortir FAIL

- **Tier** : XS
- **Type** : test-fixture
- **Status** : ready
- **Goal** : Prouver que le FAUX VERT a disparu. Avant T47 cette section sortait
  « skipped » exit 0 alors que son unique assertion échoue — c'est exactement le
  mode de panne que T47 supprime.
- **Smoke:** (fixture — CLI, aucun serveur à lancer)
  - assert: `false`

### T904: Champ Smoke VIDE suivi d'un autre champ — ne doit RIEN capturer

- **Tier** : XS
- **Type** : test-fixture
- **Status** : ready
- **Goal** : Prouver qu'un champ `**Smoke:**` sans aucune puce d'assertion est
  traité comme absent, et n'absorbe PAS le champ suivant. Le champ Rollback
  ci-dessous est un APPÂT : sa sentinelle `echo` ne doit apparaître ni dans les
  assertions retenues, ni nulle part dans le rapport. Elle a porté jusqu'à T91
  une commande d'annulation de commit, qui a réellement fait feu pendant le run
  005 — le harnais exécute ce fixture, il ne doit rien contenir de destructeur.
- **Smoke:** (fixture — champ volontairement VIDE, aucune puce)
- **Rollback** : `echo APPAT-T904-A-FAIT-FEU`

### T905: Gras-italique `***Smoke:***` — n'est pas un champ

- **Tier** : XS
- **Type** : test-fixture
- **Status** : ready
- **Goal** : Prouver qu'un marqueur de liste exige au moins un espace. Sans
  cette exigence, le premier `*` d'un `***Smoke:***` passe pour une puce et le
  texte en gras-italique devient un champ dont la ligne suivante est exécutée.
  Cette section ne porte AUCUN vrai champ `**Smoke:**`.

***Smoke:*** rappel en gras-italique — ce n'est pas un champ, c'est de la mise en forme.

  - `echo GRAS-ITALIQUE-EXECUTE`

### T906: Champ suivant en MINUSCULE après un Smoke vide — doit fermer le bloc

- **Tier** : XS
- **Type** : test-fixture
- **Status** : ready
- **Goal** : Prouver que la sentinelle de fin de bloc ne dépend pas de la CASSE
  du champ suivant. Trouvé par la review de T90 : le terminateur exigeait
  `**[A-Z]`, donc un champ en minuscule ne fermait pas le bloc et sa puce
  partait en assertion EXÉCUTÉE — le chemin de l'appât de T904, rouvert par
  l'élargissement de la détection.
- **Smoke:** (fixture — champ volontairement VIDE, aucune puce)
- **rollback** : `echo APPAT-MINUSCULE-EXECUTE`

### T907: Champ et assertions en puce `*` — même classe de marqueur des deux côtés

- **Tier** : XS
- **Type** : test-fixture
- **Status** : ready
- **Goal** : Prouver que la détection du champ et la lecture de ses puces
  acceptent la MÊME classe de marqueur. Trouvé par la review de T90 : la
  détection s'ouvrait à `*` et `+` quand la boucle de contenu n'acceptait que
  `-`, si bien qu'un champ en `*` était détecté puis vidé de ses assertions et
  ressortait « 0 assertion déclarée », exit 0 — un message faux sur le mode de
  panne même que T90 supprime.

* **Smoke:** (fixture — CLI, aucun serveur à lancer)
  * assert: `echo PUCE-ETOILE-OK | grep -q PUCE-ETOILE-OK`

### T908: Champ au dialecte NON-GRAS après le bloc — doit fermer le bloc

- **Tier** : XS
- **Type** : test-fixture
- **Status** : ready
- **Goal** : Prouver que la sentinelle de fin de bloc reconnaît le dialecte
  NON-GRAS (`- Rollback: valeur`), que `scripts/validate.ts` accepte
  explicitement en LECTURE (`fieldValue`, lignes 35-37 et 63). Trouvé par la
  passe de découverte du 2026-08-12 sur `shika/T90` : le correctif de T90 avait
  élargi la détection et la moitié « terminaison » ne connaissait que le gras,
  si bien qu'un champ non-gras ne fermait rien — sa valeur entre backticks
  partait en ASSERTION et s'exécutait. Mesuré avant correctif : **2 assertions
  retenues au lieu d'1**, l'appât exécuté, verdict PASS. C'est la classe exacte
  de l'incident du run 005, où une commande d'annulation de commit avait fait
  feu depuis le champ Rollback de T904.
- **Smoke:** (fixture — CLI, aucun serveur à lancer)
  - assert: `echo NON-GRAS-OK | grep -q NON-GRAS-OK`
- Rollback: `echo APPAT-T908-A-FAIT-FEU`

### T909: Champ NON-GRAS absent de la liste close — le nom qui manque exécute

- **Tier** : XS
- **Type** : test-fixture
- **Status** : ready
- **Goal** : Prouver que la liste close des noms de champ couvre TOUT le
  vocabulaire que `scripts/validate.ts` accepte en lecture, et pas seulement
  les noms que la spec de T91 avait recopiés à la main. Trouvé par la review
  codex du 2026-08-12 sur le correctif de T91 lui-même : `Statut` et `Review`
  sont lus par `validate.ts` (`fieldValue` lignes 231 et 249) et MANQUAIENT de
  la liste. Mesuré avant correctif, en exécutant le gate : `- Statut: valeur`
  placé juste après le bloc rendait **2 assertions au lieu d'1** et exécutait
  l'appât, verdict PASS. Même classe exacte que T908 — la sentinelle avait été
  élargie au bon DIALECTE avec un VOCABULAIRE incomplet, ce qui laisse le
  chemin ouvert sur les seuls noms oubliés. C'est la troisième fois que cette
  moitié du parseur laisse passer un chemin d'exécution : d'où la garde
  anti-dérive du vérificateur, qui relit les lecteurs de `validate.ts`.
- **Smoke:** (fixture — CLI, aucun serveur à lancer)
  - assert: `echo VOCABULAIRE-OK | grep -q VOCABULAIRE-OK`
- Statut: `echo APPAT-T909-A-FAIT-FEU`

### T910: Assertion ouverte en GRAS — elle doit être LUE, jamais avalée

- **Tier** : XS
- **Type** : test-fixture
- **Status** : ready
- **Goal** : Prouver que le terminateur gras RESTREINT (re-review codex via
  Edgee du 2026-08-12, P1) ne ferme plus le bloc sur une assertion qui commence
  en gras. Avant correctif, `champGras` matchait TOUTE puce en gras :
  `- **assert:** `false`` fermait le bloc avant d'être lu — 0 assertion,
  verdict skipped (ou PASS si des étapes vertes précédaient), exit 0 :
  l'assertion en échec disparaissait silencieusement. C'est le canari T903, un
  cran plus haut — le faux vert fabriqué par la terminaison et non par la
  détection. Le terminateur exige désormais un NOM DE CHAMP CONNU en gras ;
  « assert » n'en est pas un, la puce est lue, `false` s'exécute, le gate sort
  ROUGE.
- **Smoke:** (fixture — CLI, aucun serveur à lancer)
  - **assert:** `false`

### T911: `- Notes:` après le bloc — champ du SCHÉMA, invisible de validate.ts

- **Tier** : XS
- **Type** : test-fixture
- **Status** : ready
- **Goal** : Prouver que la liste close couvre le vocabulaire COMPLET — le
  schéma (`schemas/tasks-schema.md` : notes, priority, timeout) et le dialecte
  partagé (`FIELD_HEADING` : Note(s), Created, Contexte, Durée…) — et pas les
  seuls lecteurs de `validate.ts` comme après T909. Trouvé par la re-review
  codex (via Edgee) du 2026-08-12 : `Notes` est un champ optionnel légal du
  schéma que `validate.ts` ne lit PAS, donc la garde anti-dérive dérivée de ses
  seuls call-sites ne pouvait pas voir le trou. Avant correctif :
  `- Notes: `echo APPAT…`` ni terminateur ni refusé → contenu backtické
  EXÉCUTÉ en shell, 2 assertions au lieu d'1, PASS. Même famille que T908/T909,
  source de vocabulaire différente — d'où la garde qui relit désormais AUSSI
  `FIELD_HEADING`.
- **Smoke:** (fixture — CLI, aucun serveur à lancer)
  - assert: `echo NOTES-OK | grep -q NOTES-OK`
- Notes: `echo APPAT-T911-A-FAIT-FEU`

### T912: Assertion TUÉE par le timeout — mesure impossible, pas un échec

- **Tier** : XS
- **Type** : test-fixture
- **Status** : ready
- **Goal** : Prouver qu'une assertion tuée par `SMOKE_ASSERT_TIMEOUT_MS` rend le
  verdict `error` (mesure impossible) et non `FAIL` (échec mesuré). Le code
  écrivait déjà, depuis T160, « commande TUÉE, verdict d'assertion INCONNU — pas
  un échec » dans le `stderr` de l'étape, mais le verdict GLOBAL passait quand
  même à `FAIL` : le rapport accusait le livrable alors que rien n'avait été
  mesuré, et le runner « corrigeait » du code valide. La sévérité ne bouge pas —
  `error` reste exit 1, donc `needs-review` : on change l'étiquette de la cause,
  jamais le fait que le gate bloque. Section jouée sous
  `SMOKE_ASSERT_TIMEOUT_MS=1000` par le vérificateur.
- **Smoke:** (fixture — CLI, aucun serveur à lancer)
  - assert: `sleep 30`

### T913: Échec MESURÉ + timeout dans le même bloc — l'échec mesuré prime

- **Tier** : XS
- **Type** : test-fixture
- **Status** : ready
- **Goal** : Borner T912 par le haut. Un bloc qui porte À LA FOIS un échec réel
  et un timeout doit sortir `FAIL` : la mesure impossible n'efface pas la mesure
  qui, elle, a conclu. Sans cette section, requalifier le timeout en `error`
  ouvrirait un chemin où un vrai échec se ferait recouvrir par un voisin lent —
  un faux vert d'un genre nouveau, fabriqué par le correctif lui-même. Elle est
  ADVERSARIALE : c'est la seule section du harnais où les deux causes coexistent,
  et l'ORDRE y compte (l'échec précède le timeout, donc une agrégation naïve
  « dernier écrit gagne » la ferait sortir `error`). Section jouée sous
  `SMOKE_ASSERT_TIMEOUT_MS=1000` par le vérificateur.
- **Smoke:** (fixture — CLI, aucun serveur à lancer)
  - assert: `false`
  - assert: `sleep 30`
