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

**Étapes réalisées :** V3-01 audit ; V3-02 primitives et 7 tests ; V3-03 partielle : routes serveur login/me/logout, contrôle Origin, anti-bruteforce, sessions D1 hachées et invalidées ; tests supplémentaires Node + 4 tests SQL SQLite. GitHub Actions validé. Aucune connexion parent de production activée.

**Prochaine étape :** achever V3-03 (inscription, email vérifié, récupération d'accès), configurer D1 en test et mesurer le coût du PBKDF2 ; intégrer ensuite les notes V3-04 dans l'app principale. **Demande complémentaire Contact :** obtenir une adresse de réception expressément choisie pour KhelyIA, vérifier une destination email gratuite, configurer Turnstile et tester l'envoi avant de publier la page.

**Nouvelle page Contact :** `contact.html`, API `src/server/contact-api.mjs`, route `functions/api/contact.js`, tests et `docs/CONTACT.md` créés sur branche V3. Adresse de réception non définie, email non activé et page non publiée ; aucun message réel n'a été envoyé.

**Sécurité actuelle :** site V2.2 non sécurisé côté parent. Notes privées V3-04 et prévisualisation parent codées sur la branche mais non activées en production. N'utiliser que des données fictives. Code V3 uniquement dans une pull request en brouillon, non fusionnée, non déployée.
