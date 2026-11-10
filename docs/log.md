# KhelyIA — Journal de travail durable

## 2026-11-10 — Reprise du développement
- Demande utilisateur : adopter la démarche *affiner → spécifier → tâches courtes → tests → relecture → livraison* et la structuration `AGENTS.md` / `spec.md` / `log.md` / mémoire de projet.
- Branche de travail : `feat/v3-secure-parent-foundations`. La branche `main` et la V2.2 publique doivent rester inchangées pendant la préparation.
- Le dépôt reste la source de vérité. Aucune garantie d'exécution asynchrone ou de hooks automatiques en chat classique.
- Priorité : V3-01 audit de la V2.2 puis V3-02. **V3 non terminée et non déployée**.
- À chaque nouvelle session : lire `AGENTS.md`, `docs/spec.md`, `docs/TASKS_V3.md` et `memory/current.md`. Actualiser ce journal après chaque étape effective.

## 2026-11-10 — Audit V3-01 et fondations V3-02
- Audit de `index.html` : rôle et notes sont dans `localStorage` ; absence de verrou parent authentifié. Rapport : `docs/AUDIT_V2_2.md`.
- Tests *test-first* établis puis code ajouté : `tests/parent-auth.test.mjs` et `src/server/parent-auth.mjs`.
- **7 tests réussis localement** avec Node 22 (mots de passe, sessions, cookie, contrôle de propriétaire, invariants V2.2). Les tests devront aussi réussir en CI sur la branche.
- Ébauche du schéma D1 dans `migrations/0001_auth_v3.sql`. Migration **non appliquée**, aucune base de production créée.
- Fichier `package.json` avec `npm test` et contrôle de syntaxe ; workflow GitHub Actions créé.
- **Statut sécurité : V3 non terminée**, absence de routes API sécurisées, d'email validé, de protection anti-abus et de contrôle parent/élève côté serveur.
- Prochaine tâche : V3-03, concevoir et tester inscription, connexion et déconnexion avec sessions persistées, puis vérification d'autorisation sur des données fictives.
