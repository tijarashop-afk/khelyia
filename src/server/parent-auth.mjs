/**
 * KhelyIA V3 — primitives serveur pour l'authentification parent.
 * Ne constitue pas à lui seul un contrôle d'accès : les routes, une base D1,
 * les limites anti-bruteforce et la vérification des autorisations sont nécessaires.
 * Aucune clé ni identité d'enfant n'est enregistrée ici.
 */
const ITERATIONS = 310_000;
const enc = new TextEncoder();
const COOKIE = '__Host-khelyia_parent';

export class AuthError extends Error {
  constructor(status, message = 'Accès non autorisé') {
    super(message);
    this.name = 'AuthError';
    this.status = status;
  }
}

function toBase64url(bytes) {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}
function fromBase64url(value) {
  if (typeof value !== 'string' || !/^[A-Za-z0-9_-]+$/.test(value)) throw new Error('Format invalide');
  const base64 = value.replace(/-/g, '+').replace(/_/g, '/');
  const binary = atob(base64 + '='.repeat((4 - base64.length % 4) % 4));
  return Uint8Array.from(binary, c => c.charCodeAt(0));
}
function fixedTimeEquals(a, b) {
  if (a.byteLength !== b.byteLength) return false;
  let difference = 0;
  for (let i = 0; i < a.length; i++) difference |= a[i] ^ b[i];
  return difference === 0;
}

export function normalizeEmail(value) {
  if (typeof value !== 'string') throw new Error('Adresse email invalide');
  const email = value.trim().toLowerCase();
  if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new Error('Adresse email invalide');
  }
  return email;
}

export async function hashPassword(password) {
  if (typeof password !== 'string' || password.length < 12 || password.length > 128) {
    throw new Error('Mot de passe requis : de 12 à 128 caractères');
  }
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const material = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits({name:'PBKDF2', salt, iterations:ITERATIONS, hash:'SHA-256'}, material, 256);
  return 'pbkdf2-sha256$' + ITERATIONS + '$' + toBase64url(salt) + '$' + toBase64url(new Uint8Array(bits));
}

export async function verifyPassword(password, record) {
  if (typeof password !== 'string' || typeof record !== 'string') return false;
  try {
    const [method, count, s, digest, extra] = record.split('$');
    const iterations = Number(count);
    if (extra || method !== 'pbkdf2-sha256' || iterations !== ITERATIONS) return false;
    const salt = fromBase64url(s);
    const expected = fromBase64url(digest);
    if (salt.length !== 16 || expected.length !== 32) return false;
    const material = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveBits']);
    const computed = new Uint8Array(await crypto.subtle.deriveBits({name:'PBKDF2', salt, iterations, hash:'SHA-256'}, material, 256));
    return fixedTimeEquals(expected, computed);
  } catch {
    return false;
  }
}

export async function hashSessionToken(token) {
  const bytes = enc.encode(token);
  return toBase64url(new Uint8Array(await crypto.subtle.digest('SHA-256', bytes)));
}

export async function newSessionCredential() {
  const token = toBase64url(crypto.getRandomValues(new Uint8Array(32)));
  return { token, tokenHash: await hashSessionToken(token) };
}

export function sessionCookie(token, maxAge = 60 * 60 * 24 * 7) {
  if (typeof token !== 'string' || !/^[A-Za-z0-9_-]{43}$/.test(token)) {
    throw new Error('Jeton de session invalide');
  }
  if (!Number.isSafeInteger(maxAge) || maxAge < 1 || maxAge > 60 * 60 * 24 * 7) {
    throw new Error('Durée de session invalide');
  }
  return COOKIE + '=' + token + '; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=' + maxAge;
}

export function clearSessionCookie() {
  return COOKIE + '=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0';
}

export function requireOwner(requesterParentId, resourceParentId) {
  if (!requesterParentId) throw new AuthError(401, 'Connexion requise');
  if (!resourceParentId || requesterParentId !== resourceParentId) throw new AuthError(403);
  return true;
}
