# KhelyIA — Spécification V3 : espace parent réellement sécurisé

## Contexte
KhelyIA V2.2 est un fichier HTML autonome avec données dans le navigateur et un commutateur Parent/Enfant **non protégé**. Ce comportement est acceptable pour une démo à fausses données uniquement. Objectif V3 : préparer un véritable espace parent authentifié côté serveur sans casser les parcours existants.

## Objectifs vérifiables
1. L'accès aux pages/données parent privées et aux données d'enfants **ne dépend pas d'un simple rôle JavaScript**.
2. Un utilisateur non authentifié ne peut pas récupérer les données parent ou les résultats privés d'un autre compte, même en appelant directement l'API.
3. Authentification avec stockage serveur des comptes et sessions, cookie `HttpOnly`, `Secure`, `SameSite`, contrôle d'autorisation sur chaque endpoint.
4. Mots de passe jamais enregistrés en clair ; dérivation de clé forte avec sel individuel ; comparaison sécurisée ; limites anti-bruteforce.
5. Déconnexion invalide réellement la session serveur ; expiration des sessions ; aucun secret exposé dans le HTML, GitHub ou les logs.
6. Tous les parcours V2.2 demeurent testables avec des données fictives, surtout l'annulation de QCM sans note.
7. L'interface indique explicitement la différence entre le mode démonstration et un véritable compte parent.
8. Publication publique seulement après tests fonctionnels, revue sécurité et configuration des services réels.

## Choix de structure proposés
- **Hébergement existant :** conserver Cloudflare Pages ; ajouter une API serveur via Pages Functions / Worker, avec séparation des accès.
- **Données :** base serveur par famille (Cloudflare D1 envisagée) ; droits vérifiés pour chaque relation parent/enfant.
- **Auth :** compte parent avec email/pseudonyme et mot de passe, puis session serveur ; modèle de données et récupération de compte à définir.
- **Migration :** aucune migration implicite du localStorage vers serveur. On utilisera d'abord des données fictives.

## Critères de non-régression
CP–Terminale ; français/mathématiques/anglais ; QCM facile/moyen/difficile ; notes /20 ; tutoriel ; bilan ; abandon QCM sans enregistrement ; design mobile violet/turquoise.

## Questions ouvertes à traiter avant mise en service
- Politique de création/validation d'un compte parent et confirmation de l'email.
- Récupération des accès (fournisseur email, envoi sans coût non autorisé).
- Choix des données minimales à collecter et durée de conservation.
- Vérification juridique RGPD / consentements applicables, modalités d'effacement/export.
- Infrastructure D1 et protections anti-abus réellement configurées sur Cloudflare.

## Exclusions V3
Ne pas intégrer l'IA Mistral, la photographie, les profils multiples, la progression adaptative ou les cours structurés : ces fonctions ont des versions ultérieures. Ne pas annoncer « sécurisé » si les données restent accessibles côté client sans autorisation serveur.
