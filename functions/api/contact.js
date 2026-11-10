// Route Cloudflare Pages Functions : réception du formulaire Contact.
// Nécessite EMAIL, CONTACT_TO_EMAIL, CONTACT_FROM_EMAIL et les clés Turnstile.
// Ce fichier seul n'active rien sur le déploiement HTML manuel actuellement publié.
import {handleContactApi} from '../../src/server/contact-api.mjs';

export async function onRequest(context) {
  return handleContactApi(context.request,context.env);
}
