# Audit de référence V2.2 — accès Parent / Enfant

## Diagnostic confirmé sur `index.html`
- La constante `KEY='khelyia_v1_data'` conserve **profil, notes, chat enfant et chat parent** dans `localStorage` sur le même appareil.
- `ROLE_KEY='khelyia_v2_espace'` garde seulement le choix visuel du rôle Parent/Enfant dans `localStorage`.
- `setRole(role)` change `activeRole` **sans validation serveur ni mot de passe**.
- `showPage(name)` contrôle la navigation dans le navigateur ; ce filtrage n'est **pas une autorisation**.
- `renderParent()` affiche directement `state.profile` et `state.notes`, accessibles au code exécuté sur la page.
- `renderNotes()` expose aussi les résultats en espace Enfant ; il faut décider quelles données personnelles sont visibles pour chaque rôle.
- Le contenu de `state.parentChat` reste dans le stockage local et n'est pas privé vis-à-vis d'un utilisateur du même navigateur.
- Les exercices et l'annulation de QCM sont gérés côté client ; ils doivent continuer à fonctionner pendant la transition.

## Impact
Dans la version publique, il n'existe **pas de véritable espace parent sécurisé**. N'utiliser que des profils et notes fictifs. Un « mot de passe » ajouté dans le JavaScript ou le localStorage ne résoudrait pas la fuite des données.

## Séparation des responsabilités pour V3
1. **Serveur** : identité parent, vérification du mot de passe, session, autorisation, données privées. Le parent ne reçoit que les données de sa famille.
2. **Navigateur** : formulaire de connexion, vue Parent après vérification serveur ; aucune clé secrète.
3. **Migration** : aucune donnée locale migrée automatiquement. Tester d'abord avec des comptes fictifs.
4. **Protection** : tokens de session aléatoires stockés uniquement sous forme de haché serveur et envoyés en cookie HttpOnly/Secure/SameSite ; protection anti-bruteforce, journaux sans secrets.
5. **Déploiement** : ne pas modifier le site public tant que l'API et la protection des notes ne sont pas validées.

## État des validations
- V3-01 : audit initial terminé, tests de compatibilité établis.
- V3-02 : primitives de sécurité créées et testées localement (tests de base uniquement).
- V3-03 à V3-07 : encore à faire. **Aucune sécurité parent effective en production à ce stade.**
