# KhelyIA — Page Contact et réception des messages par email

## Configuration de réception effectuée (10 novembre 2026)
- Adresse destinée à KhelyIA **fournie par le propriétaire**, stockée uniquement dans Cloudflare, pas dans GitHub.
- Cloudflare Email Routing : destination **créée et indiquée vérifiée par l'API**.
- Cloudflare Pages projet `khelyia` : variable serveur `CONTACT_TO_EMAIL` configurée comme `secret_text` en production.
- **Envoi réel toujours inactif :** le compte Cloudflare ne dispose d'aucune zone/domaine expéditeur et les variables `CONTACT_FROM_EMAIL`, `EMAIL`, `TURNSTILE_SITE_KEY`, `TURNSTILE_SECRET` manquent.
- Aucune modification de la version publique V2.2 ; aucun email de formulaire envoyé ou reçu pendant cette intervention.
- Pour avancer sans frais, prévoir un domaine expéditeur utilisable par Cloudflare ou sélectionner une autre solution de réception qui protège les données des visiteurs.

## Livrables en branche V3 (pas encore publiés)
- \`contact.html\` : page responsive violette/turquoise, accessible depuis deux liens de \`index.html\`.
- \`src/server/contact-api.mjs\` et \`functions/api/contact.js\` : API qui transmet par email le message du visiteur à la réception KhelyIA.
- \`tests/contact-api.test.mjs\` / \`tests/contact-page.test.mjs\` : tests automatiques du formulaire, de la validation serveur et de l'envoi simulé.

## Circuit de réception
Visiteur adulte → formulaire KhelyIA → Turnstile (preuve anti-spam vérifiée côté serveur) → serveur Cloudflare → liaison EMAIL → adresse email privée du propriétaire de KhelyIA.

Le formulaire ne stocke pas les messages dans D1. L'email transmis contient : nom, email de réponse, thème et message ; le navigateur ne reçoit jamais l'adresse email privée de réception. Le champ \`Reply-To\` est celui indiqué par le visiteur afin de faciliter la réponse.

## Paramètres nécessaires (côté Cloudflare seulement)
- **\`CONTACT_TO_EMAIL\`** : adresse à laquelle le propriétaire souhaite recevoir les messages, à renseigner et vérifier.
- **\`CONTACT_FROM_EMAIL\`** : adresse d'expédition appartenant à un domaine autorisé par le service Cloudflare Email.
- **\`EMAIL\`** : binding Cloudflare Email Service, avec restrictions d'expéditeur/destinataire si possible.
- **\`TURNSTILE_SITE_KEY\`** : clé publique du widget (le navigateur récupère seulement cette clé via \`GET /api/contact\`).
- **\`TURNSTILE_SECRET\`** : clé secrète conservée uniquement côté serveur.

**Pas de valeurs d'email ou clés de production dans les fichiers du dépôt GitHub.**

### Coût potentiel
Cloudflare Email Service permet l'envoi **gratuit vers des adresses de destination vérifiées** depuis une configuration Email Routing applicable, même avec Workers Free. L'envoi vers n'importe quelle adresse non vérifiée nécessite Workers Paid. Il faut vérifier que le domaine expéditeur est autorisé et que la liaison Email fonctionne sur le compte actuel. Ne pas déclencher une offre payante.

Documentation :
- https://developers.cloudflare.com/email-service/
- https://developers.cloudflare.com/email-service/api/send-emails/workers-api/
- https://developers.cloudflare.com/turnstile/get-started/server-side-validation/

## Conditions avant publication
1. Choisir avec le propriétaire l'adresse email de réception réellement destinée à KhelyIA.
2. Vérifier une destination email autorisée et un domaine expéditeur ; créer la liaison \`EMAIL\` selon l'offre réellement disponible.
3. Créer le widget Turnstile sur le nom de domaine de test et de production.
4. Configurer les variables et le secret sur un environnement Cloudflare distinct. Le déploiement actuel en mode Worker manuel qui ne sert que \`index.html\` **n'active pas automatiquement** \`contact.html\` ni les Functions du dépôt.
5. Tester la réception réelle d'un message **fictif** et le classement éventuel en spam, ainsi que l'échec d'envoi.
6. Vérifier les mentions légales, l'identité du responsable de traitement, les durées de conservation et la politique de confidentialité applicables.
7. Envisager une règle supplémentaire de limitation des envois si l'usage augmente ; Turnstile ne garantit pas à lui seul l'absence d'abus.
8. Une fois validé, publier les fichiers statiques et l'API dans un même déploiement compatible (Pages Functions ou Worker équivalent).

## Comportement prévu si la configuration manque
- \`GET /api/contact\` : \`{"enabled":false}\`.
- \`POST /api/contact\` : statut **503**, aucun message prétendument envoyé.
- La page Contact affiche « Le formulaire n'est pas encore activé » et garde le bouton d'envoi désactivé.
- Aucun mail n'est actuellement attesté comme envoyé ou reçu.

## Protection des mineurs
Le formulaire est destiné aux adultes, rappelle de ne transmettre aucune donnée sensible d'enfant et demande un accord explicite pour être recontacté. Les messages passent par l'Email Service et la messagerie de réception ; ils ne sont **pas stockés par l'application** dans une base. Cela ne suffit pas, en soi, à garantir la conformité RGPD de l'ensemble de KhelyIA.


## Solution sans nom de domaine : Formspree Free (recommandée provisoirement)

**Pourquoi :** le compte Cloudflare actuel n'a aucun domaine expéditeur. Cloudflare Email Service exige un domaine configuré, même si l'adresse de destination Gmail est vérifiée. Formspree reçoit le formulaire depuis le navigateur et envoie les notifications à une adresse email choisie dans son tableau de bord. Aucun domaine KhelyIA n'est nécessaire.

- Offre Formspree Free actuelle : **50 soumissions par mois**, sans carte bancaire ; archives conservées **30 jours**. Limite et conditions susceptibles d'évoluer : https://formspree.io/plans/
- Le propriétaire crée un compte sur https://formspree.io/ avec son adresse de réception, puis un formulaire « KhelyIA — Contact » et confirme l'adresse email.
- Formspree fournit un identifiant public de formulaire, par exemple `abcdefgh` (fictif). **L'identifiant réel n'a pas encore été communiqué.**
- Insérer cet identifiant dans `contact.html`, balise `<meta name="khelyia-formspree-id" content="">`. Ne saisir ni adresse email privée, ni mot de passe, ni clé de compte.
- Lorsque l'identifiant est valide, `contact.html` active **uniquement** le chemin Formspree, sans Turnstile Cloudflare, et conserve les contrôles HTML et le champ anti-bot `_gotcha`. La protection anti-spam et les paramètres de domaine autorisé se configurent dans Formspree.
- Tant qu'aucun identifiant n'a été saisi, la page garde le circuit Cloudflare précédent, actuellement désactivé (pas d'expéditeur). Elle ne prétend pas envoyer de message.
- Tester un message fictif depuis le site puis vérifier sa présence dans la boîte de réception Gmail et, au besoin, le dossier spam.
- Mise à jour confidentialité obligatoire avant mise en production : Formspree traite les messages et peut en conserver l'historique **30 jours** en offre gratuite. Les visiteurs doivent être informés de ce prestataire et de la politique de conservation.

Ce changement est isolé sur la branche de développement ; il n'affecte pas la V2.2 en ligne.

