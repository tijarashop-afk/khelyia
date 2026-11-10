# Architecture prévue — authentification parent V3

## Principe
- On conserve le site statique existant `index.html` et son comportement pour la démonstration.
- Les nouvelles API parent devront s'exécuter **côté serveur** (Pages Functions ou Worker compatible), via un déploiement maîtrisé.
- Les comptes, sessions et données parent/élève iront dans une base Cloudflare D1 séparée des données publiques.
- Aucune véritable donnée d'élève dans les environnements de test.

## Éléments déjà codés
- `src/server/parent-auth.mjs` : normalisation email, hachage PBKDF2-SHA256 avec sel propre et itérations, vérification, jeton de session aléatoire, stockage par haché, cookie protégé, contrôle de propriétaire.
- `tests/parent-auth.test.mjs` : tests automatisés. Attention : contrôles de **primitives**, non d'une application sécurisée.
- `migrations/0001_auth_v3.sql` : ébauche du schéma D1. Elle n'a pas été appliquée.

## API V3 en cours — non déployée
- `src/server/parent-api.mjs` : routes `/api/parent/login`, `/api/parent/me`, `/api/parent/logout` avec vérification d'Origin, HMAC pour les compteurs de tentatives, blocage anti-bruteforce, sessions D1, révocation lors de la déconnexion et de la reconnexion.
- `functions/api/parent/[[path]].js` : point d'entrée Pages Functions ; **inactif sur le déploiement manuel actuel**.
- `tests/parent-api.test.mjs` : tests avec un faux D1, sans données personnelles réelles.
- `tests/test_schema.py` : vérification du schéma sur SQLite en mémoire.
- Cloudflare Free peut limiter le CPU à **10 ms par requête** : mesurer sur environnement isolé la faisabilité de PBKDF2 avec 310 000 itérations avant déploiement. Aucun achat ne doit être déclenché automatiquement.

## Notes privées V3-04 — travaux déjà effectués
- `migrations/0002_parent_notes.sql` : notes rattachées uniquement à un parent, matière, classe et note /20 ; pas d'identité d'enfant ; contraintes SQL.
- `GET /api/parent/notes` : sélection limitée à l'identité du parent lue depuis la session.
- `POST /api/parent/notes` : création limitée à la session parent ; `parent_id` fourni par le navigateur est ignoré.
- `DELETE /api/parent/notes` : suppression limitée au parent authentifié et à l'identifiant UUID choisi.
- `parent-v3.html` : page séparée de prévisualisation (connexion, lecture, création et suppression), sans secret et sans usage de `localStorage`. **Pas encore déployée**.
- Attention : `index.html` V2.2 utilise toujours le stockage local ; donc la V3 n'est **pas sécurisée de bout en bout**.
- Confirmation email : le Cloudflare Email Service n'autorise l'envoi arbitraire à tous les destinataires que via Workers Paid ; ne pas déclencher un service payant sans accord.

## À coder avant de qualifier V3 de sécurisée
- Comptes parent : inscription avec vérification de l'adresse, connexion, réinitialisation.
- Routes API, limitation anti-bruteforce / abus, revocation et expiration serveur des sessions.
- Contrôles d'accès à chaque donnée et lien parent/enfant.
- Formulaire d'authentification et séparation des données de démo / données serveur.
- Politique de conservation/suppression et vérification des règles de protection des mineurs.
- Tests end-to-end sur HTTPS et plusieurs navigateurs réels.

## Limite du déploiement actuel
Cloudflare Pages est publié **manuellement** avec un Worker avancé qui sert le HTML. Un fichier `src/server/*` ajouté à GitHub n'active aucune route serveur automatiquement, et la liaison GitHub ↔ Cloudflare n'est pas en place. La version publique doit rester en V2.2 jusqu'à une migration testée.
