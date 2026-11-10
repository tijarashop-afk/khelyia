# État de reprise — KhelyIA

**Version publiée :** V2.2 — https://khelyia.pages.dev

**Dépôt :** https://github.com/tijarashop-afk/khelyia

**Branche de développement :** `feat/v3-secure-parent-foundations`.

**Travail en cours :** V3 sécurisation réelle de l'espace parent. Les accès parent dans la V2.2 ne sont pas sécurisés côté serveur.

**Décisions permanentes :**
- CP à Terminale ; en V2.2 maths, français et anglais ; interface violet/turquoise.
- Tout conserver : QCM annulable sans note, tutoriel de première ouverture, espaces Enfant/Parent, notes et bilan.
- Feuille de route V3 → V11 intacte ; ne pas intégrer des évolutions non validées.
- Développer par petites tâches spécifiées et testées, sur branche, avec revue de sécurité.
- Enfants : pas de données personnelles réelles dans une démonstration ou les fichiers GitHub.
- Services gratuits uniquement sans nouvelle dépense autorisée.
- Déploiement actuel Cloudflare Pages manuel : GitHub n'est pas branché en publication automatique.
- Fichiers de référence : `AGENTS.md`, `docs/spec.md`, `docs/TASKS_V3.md`, `docs/log.md`, `docs/ROADMAP.md`.

**Étapes réalisées :** audit V3-01 (`docs/AUDIT_V2_2.md`), primitives et 7 tests locaux V3-02 (`src/server/parent-auth.mjs`, `tests/parent-auth.test.mjs`), ébauche de schéma serveur (`migrations/0001_auth_v3.sql`). `npm test` est la commande de vérification.

**Prochaine étape :** V3-03 inscription/connexion/déconnexion avec compte parent validé, sessions persistantes, protection anti-bruteforce, API avec autorisations, sans mise en production prématurée.

**Sécurité actuelle :** l'application en ligne V2.2 demeure une **démo**. Aucune protection parent effective n'est activée, aucun élève réel ne doit être enregistré.
