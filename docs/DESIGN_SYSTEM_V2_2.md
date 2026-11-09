# KhelyIA — guide visuel V2.2

Version du 9 novembre 2026. Cette charte documente la **version de démonstration**, sans modifier les évolutions fonctionnelles validées V3 à V10.

## Identité
- **Style :** éducatif, rassurant, moderne, facile à lire sur mobile.
- **Couleur d'action primaire :** violet `#5541DB` (appels à l'action, éléments actifs).
- **Couleur pédagogique secondaire :** turquoise `#13B7AC` (signaux de progression et repères uniquement, ne concurrence pas les boutons primaires).
- **Texte :** `#20233D` ; texte secondaire `#656B82` ; fond `#F7F8FD` ; séparateurs `#E8EAF2`.
- **Logo :** utiliser l'image fournie par le projet lorsqu'elle fonctionne, avec la lettre « K » en secours.
- **Typographie :** Inter puis polices système de remplacement, sans police décorative.
- **Hiérarchie :** titres de page 28–36 px ; titres de sections ~20 px ; contenu ~13–15 px ; jamais du texte trop clair sur fond blanc.
- **Grille :** espacements dominants de 8, 16, 24, 32 px ; angles adoucis (~12–24 px) ; ombres très légères.
- **Mouvements :** micro-transitions seulement ; neutralisées pour `prefers-reduced-motion`.
- **Retour d'action :** écran de confirmation clair avant abandon d'un QCM, aucun résultat enregistré après l'abandon.
- **États vides :** présentation explicite, compréhensible, non culpabilisante.
- **Mobile :** navigation basse avec zone de sécurité, texte lisible, cibles tactiles élargies.
- **Accessibilité :** contours de focus, contrastes renforcés, messages non transmis uniquement par la couleur.

## Parcours conservés
- CP à Terminale ; maths, français, anglais.
- Premier lancement : tutoriel à étapes, consultable ensuite par « Aide ».
- Espace Enfant : assistant local à réponses préparées, QCM, notes, profil.
- Espace Parent : suivi de notes et assistant distinct, **non sécurisé** dans la V2.2.
- QCM : sélectionner le niveau et la difficulté, répondre, voir la correction, abandonner sans note, recommencer.
- Historique et notes enregistrés dans le navigateur ; export manuel existant.

## Contrôle qualité effectué pour la V2.2
- Tests dans Chromium automatisé avec affichages simulés de **360, 390, 768, 1 440 pixels**.
- Vérification du tutoriel, du lancement du QCM, de « Continuer » et « Abandonner », du résultat et de son enregistrement unique, de la page Notes, du passage Parent/Enfant, de la conversation et du profil.
- Contrôle d'absence de débordement horizontal et d'erreur JavaScript dans les scénarios testés.
- **À compléter :** tests manuels sur de vrais téléphones Android et iOS, navigateurs Safari/Firefox, comportement hors ligne et lecteurs d'écran.

## Sécurité / données personnelles
- Il s'agit d'une **démonstration** ; l'IA Mistral n'est pas branchée.
- Ne pas saisir de données personnelles réelles concernant un mineur.
- Aucun code parental sécurisé ni base de données distante à ce stade.
- Protéger la clé d'API Mistral côté serveur lors de la V6.

## Publication
- Source : `index.html` dans GitHub `tijarashop-afk/khelyia`.
- Production : `https://khelyia.pages.dev` sur Cloudflare Pages.
- Déploiement **manuel** : la liaison automatique GitHub vers Cloudflare renvoie actuellement une erreur d'intégration et n'est pas déclarée fonctionnelle.
