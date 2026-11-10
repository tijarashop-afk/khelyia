# V3 — Découpage en tâches à critères d'acceptation

Chaque tâche doit être terminée et testée avant de passer à la suivante. Les fichiers autorisés sont des plafonds de périmètre, pas des obligations de les changer.

| ID | Tâche | Fichiers autorisés | Acceptation |
|---|---|---|---|
| V3-01 | Audit des données, surfaces et droits V2.2 | `docs/*`, `tests/*` | Inventaire et test de référence, sans changement de production |
| V3-02 | Contrats de sécurité API + modèles de données | `docs/*`, `src/server/*`, `tests/*` | AuthN/AuthZ et séparation des familles vérifiables avec fausses données |
| V3-03 | Comptes parent et sessions sécurisées | `src/server/*`, `functions/*`, `tests/*`, `migrations/*` | Inscription/connexion/déconnexion/expiration testées, mot de passe jamais en clair |
| V3-04 | Accès privé aux notes | `src/server/*`, `functions/*`, `tests/*`, `migrations/*` | API refuse une consultation non autorisée ou inter-famille |
| V3-05 | Adapter l'interface Parent | `index.html`, `src/client/*`, `tests/*` | Accès parent via session serveur ; affichages enfants/QCM inchangés |
| V3-06 | Tests d'intégration, mobile, confidentialité et RGPD | `tests/*`, `docs/*` | Revue sécurité documentée et zéro régression critique |
| V3-07 | Préparation de la PR, déploiement de prévisualisation et décision de publication | `docs/*` et config Cloudflare approuvée | Relecture + validation des dépendances et des risques |

**Règle :** tant que V3-03 à V3-06 n'ont pas été démontrées, la V2.2 publique reste une démo et aucune donnée réelle de mineur n'y est confiée.
