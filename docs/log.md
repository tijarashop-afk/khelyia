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

## 2026-11-10 — Vérification automatisée GitHub
- Pull request en brouillon : https://github.com/tijarashop-afk/khelyia/pull/1 ; elle ne doit pas être fusionnée tant que la V3 n'est pas sécurisée et testée en bout en bout.
- **GitHub Actions** : exécution « KhelyIA — vérifications » **terminée avec succès** sur la branche. Les tests automatisés fournissent un contrôle répétable, même sans hooks natifs dans le chat.
- La publication Cloudflare V2.2 et la branche principale `main` restent inchangées.


## 2026-11-10 — Continuation V3-03 : premières routes parent
- Création de \`src/server/parent-api.mjs\` (authentification, session, déconnexion) et de \`functions/api/parent/[[path]].js\` (point d'entrée Cloudflare Pages, **pas déployé**).
- Sécurité défensive : vérification stricte de l'Origin pour les requêtes mutantes, JSON limité à 4 Kio, cookies HttpOnly/Secure/SameSite, sessions hachées côté D1, expiration, révocation et rotation à la reconnexion, protection anti-bruteforce par catégories HMAC.
- Les nouveaux tests Node testent connexion, session, refus non autorisé, déconnexion, expiration, CSRF, limitation des tentatives, requêtes paramétrées et rotation de session.
- Tests de schéma D1/SQLite ajoutés en Python ; intégration à GitHub Actions.
- **Intégration et qualification non terminées :** aucun système d'inscription/confirmation email, aucune création de compte réel, pas de contrôle d'accès aux notes côté serveur, pas de D1 de production, pas de test de performance Cloudflare Free.
- Limite identifiée : requêtes Workers Free à 10 ms CPU ; vérifier le coût PBKDF2 avant déploiement.
- Reprise : développer un flux d'inscription avec vérification d'email sans dépense puis migrer les données privées derrière API sécurisée ; conserver l'application V2.2 publique inchangée.


## 2026-11-10 — Demande de page Contact avec réception par email
- Formulaire `contact.html` créé, dans la charte violet/turquoise, accessible depuis le menu et le pied de page de `index.html`.
- API `src/server/contact-api.mjs` et route Pages Function `functions/api/contact.js`. Transmission vers `CONTACT_TO_EMAIL` (paramètre serveur), par `env.EMAIL.send`, avec `Reply-To` du visiteur.
- Protections : validation de taille et des valeurs, champ anti-bot caché, contrôle d'origine, token Turnstile vérifié côté serveur, contrôle du domaine et de l'action, aucun message conservé dans une base.
- Ajout des tests `tests/contact-api.test.mjs` et `tests/contact-page.test.mjs`. Total désormais **44 tests** dans la suite Node + SQLite.
- Conditions d'activation documentées dans `docs/CONTACT.md` : adresse de réception spécifique KhelyIA, expéditeur sur domaine autorisé, configuration Email Service et Turnstile, test de réception réelle.
- **Aucun destinataire ni service email effectif configuré.** Formulaire non publié ; la V2.2 publique reste inchangée. Ne pas déclarer de messages réels envoyés ou reçus.
- Des emails vers une destination vérifiée peuvent être gratuits sur Cloudflare Workers Free, selon la configuration, mais les envois à des adresses arbitraires relèvent de Workers Paid. **Ne pas souscrire à une offre payante sans accord.**
