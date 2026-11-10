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

## À coder avant de qualifier V3 de sécurisée
- Comptes parent : inscription avec vérification de l'adresse, connexion, réinitialisation.
- Routes API, limitation anti-bruteforce / abus, revocation et expiration serveur des sessions.
- Contrôles d'accès à chaque donnée et lien parent/enfant.
- Formulaire d'authentification et séparation des données de démo / données serveur.
- Politique de conservation/suppression et vérification des règles de protection des mineurs.
- Tests end-to-end sur HTTPS et plusieurs navigateurs réels.

## Limite du déploiement actuel
Cloudflare Pages est publié **manuellement** avec un Worker avancé qui sert le HTML. Un fichier `src/server/*` ajouté à GitHub n'active aucune route serveur automatiquement, et la liaison GitHub ↔ Cloudflare n'est pas en place. La version publique doit rester en V2.2 jusqu'à une migration testée.
