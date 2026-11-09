# KhelyIA — version V2.2 (démo)

**KhelyIA** est un prototype d'aide aux devoirs en français, pour les élèves du **CP à la Terminale**.

**Site de test :** https://khelyia.pages.dev

## Fonctionnalités actuelles
- Assistant pédagogique à réponses préparées (pas encore une vraie IA Mistral).
- Entraînements QCM en mathématiques, français et anglais.
- Difficultés facile, moyen, difficile ; 5 ou 10 questions.
- Abandon d'un QCM sans noter l'élève ; corrections et notes /20.
- Tableau de bord, progression et bilan mensuel.
- Espaces Enfant / Parent distincts, mais **non sécurisés**.
- Tutoriel dès la première utilisation et aide réouvrable.
- Notes conservées dans le navigateur avec export JSON.

## Améliorations V2.2
- Charte visuelle avec violet principal et turquoise de soutien.
- Hiérarchie typographique, contrastes et espacement homogénéisés.
- Boutons, cartes, formulaires, navigation mobile, états vides et messages affinés.
- Respect des préférences de réduction des animations.
- Fonctionnalités précédentes conservées.

La charte et le compte rendu des tests sont documentés dans [docs/DESIGN_SYSTEM_V2_2.md](docs/DESIGN_SYSTEM_V2_2.md).

## Essai local
Télécharger `index.html` et l'ouvrir dans un navigateur récent. Le logo distant peut nécessiter Internet.

## Important — protection des enfants
La V2.2 est une **démonstration publique**. Ne pas y saisir de données personnelles réelles d'enfants. Les profils/notes restent uniquement sur l'appareil et peuvent disparaître si les données du navigateur sont effacées. Aucun contrôle parent sécurisé ou stockage central n'est actuellement en place.

## Feuille de route validée (inchangée)
1. V3 — Espace parent sécurisé.
2. V4 — Plusieurs enfants par famille.
3. V5 — Mode spécial CP–CE2.
4. V6 — IA Mistral, clé conservée côté serveur.
5. V7 — Photo de devoir.
6. V8 — Parcours adaptatif et récompenses.
7. V9 — Bouton « Je n'ai pas compris ».
8. V10 — Révisions avant les contrôles.

## Hébergement
La source se trouve sur la branche `main` de GitHub. Cloudflare Pages publie la démo via un déploiement direct. **La synchronisation automatique GitHub → Cloudflare n'est pas encore active** : ne pas supposer qu'un commit déploie automatiquement une mise à jour.
