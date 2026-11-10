# KhelyIA — Instructions permanentes des agents

## Mission et périmètre
Application d'aide aux devoirs en français, **du CP à la Terminale**. Interface violet/turquoise. Site public de démonstration : https://khelyia.pages.dev. Dépôt GitHub : tijarashop-afk/khelyia.

**Branche `main` = V2.2 stable.** Ne jamais modifier ou déployer `main` sans tests et décision de publication. Développer sur branche dédiée, puis proposer une pull request. Ne pas confondre démonstration et application utilisable avec de vraies données d'enfants.

## Méthode « spécifier → découper → tester → relire → livrer »
1. Lire `AGENTS.md`, `docs/spec.md`, `docs/log.md`, `docs/ROADMAP.md` et `memory/current.md` avant tout changement.
2. Définir le comportement attendu, les critères de réussite et les décisions ouvertes **avant** le code.
3. Découper en tâches indépendantes, avec fichiers autorisés et critères d'acceptation ; respecter l'ordre validé.
4. Écrire un test qui échoue au besoin (rouge), puis la modification minimale (vert), enfin relire.
5. Tester au minimum : ouverture, tutoriel, changement Parent/Enfant, QCM démarrage/abandon/validation, notes, profil, mobile.
6. Faire une revue sécurité + ergonomie + régression. Corriger les défauts sans toucher aux fonctions qui marchent.
7. Mettre à jour `docs/log.md` et `memory/current.md`, puis commit ; déposer une PR de revue.
8. Ne jamais présenter une fonctionnalité comme terminée ou sécurisée sans preuve de test et, pour la sécurité, contrôle côté serveur.

## Règles de sécurité
- Un PIN, mot de passe ou rôle déterminé seulement en JavaScript/localStorage **n'est pas** une authentification.
- L'accès aux notes/profils des enfants doit être filtré côté serveur, via des contrôles d'autorisation par famille.
- Pas de secrets/API keys, mots de passe, données réelles de mineurs dans GitHub, tests, journaux ou captures.
- Utiliser des jeux de données **fictifs** ; jamais de vraies identités d'élèves pour les essais.
- Ne pas déclarer le consentement parental/RGPD conforme sans revue juridique, politiques adaptées et mise en œuvre effective.
- Ne déclencher aucun service payant sans accord.
- L'IA Mistral ne sera branchée qu'en V6, via un secret serveur.

## Règles de compatibilité
- Conserver CP → Terminale, maths/français/anglais, QCM et **annulation sans note**, tutoriel, notes/20, bilan, espaces Parent/Enfant et charte V2.2.
- Une nouvelle fonctionnalité ne modifie pas l'ordre ni le contenu des évolutions validées V3–V11.
- Préserver `index.html` tant que les contrôles d'accès ne sont pas pleinement sécurisés. Ne pas remplacer une vraie vérification par un bouton caché.

## Commandes de test
- **Tests automatisés du projet :** `node --test tests/*.test.mjs`
- **Contrôle syntaxique des modules serveur :** `node --check src/server/parent-auth.mjs` et `node --check src/server/parent-api.mjs`
- **Tests de schéma SQLite :** `python3 -m unittest discover -s tests -p 'test_*.py'`
- **CI GitHub :** `.github/workflows/checks.yml` exécute les tests Node (API, page), Python/SQLite et les contrôles syntaxiques.
- **Notes V3 :** les routes `/api/parent/notes` doivent prendre le propriétaire depuis la session serveur, jamais depuis un identifiant envoyé par le client. Préserver l'isolation GET/POST/DELETE et la suppression des notes à la suppression du compte.
- La page `parent-v3.html` reste une **prévisualisation sur branche** : ne pas la brancher sur la version publique tant que les comptes parent ne sont pas opérationnels.
- **Déploiement :** Cloudflare Pages est actuellement alimenté par publication manuelle ; ne **pas** présumer que GitHub déploie automatiquement.

## Reprises et erreurs
- Après deux échecs identiques, s'arrêter, analyser la cause, noter la leçon dans `docs/log.md` et améliorer l'instruction appropriée.
- Le contexte durable du projet est **dans le dépôt**, pas uniquement dans la mémoire d'un modèle.
- Sous-agents facultatifs pour exploration, tests et revue ; éviter deux écritures simultanées sur les mêmes fichiers.
- Hooks facultatifs et spécifiques à l'outil ; ne jamais présumer qu'un fichier de hook arbitraire est automatiquement exécuté.
