// KhelyIA V3 — Cloudflare Pages Function.
// Non activée par le déploiement actuel (HTML servi par un Worker manuel).
// Exige la liaison D1 « DB » et le secret « AUTH_RATE_SECRET » côté serveur.
import {handleParentApi} from '../../../src/server/parent-api.mjs';

export async function onRequest(context) {
  return handleParentApi(context.request, context.env);
}
