import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {
  normalizeEmail,
  hashPassword,
  verifyPassword,
  newSessionCredential,
  sessionCookie,
  clearSessionCookie,
  requireOwner,
  AuthError,
} from '../src/server/parent-auth.mjs';

const samplePassword = 'ProjetKhelyIA2026!';

test('les courriels parent sont normalisés et validés', () => {
  assert.equal(normalizeEmail('  PARENT@Exemple.FR  '), 'parent@exemple.fr');
  assert.throws(() => normalizeEmail('not-an-email'), /adresse/i);
});

test('un mot de passe est dérivé avec sel, et jamais enregistré en clair', async () => {
  const digest1 = await hashPassword(samplePassword);
  const digest2 = await hashPassword(samplePassword);
  assert.match(digest1, /^pbkdf2-sha256\$310000\$[A-Za-z0-9_-]+\$[A-Za-z0-9_-]+$/);
  assert.notEqual(digest1, digest2);
  assert.ok(!digest1.includes(samplePassword));
  assert.equal(await verifyPassword(samplePassword, digest1), true);
  assert.equal(await verifyPassword('WrongPassword2026!', digest1), false);
  assert.equal(await verifyPassword(samplePassword, 'untrusted'), false);
});

test('les mots de passe faibles sont refusés', async () => {
  await assert.rejects(() => hashPassword('short'), /12/);
});

test('un jeton de session est aléatoire et seul son haché va en base', async () => {
  const a = await newSessionCredential();
  const b = await newSessionCredential();
  assert.notEqual(a.token, b.token);
  assert.match(a.token, /^[A-Za-z0-9_-]{43}$/);
  assert.match(a.tokenHash, /^[A-Za-z0-9_-]{43}$/);
  assert.notEqual(a.token, a.tokenHash);
});

test('cookie de session impossible à lire par JavaScript', () => {
  const cookie = sessionCookie('A'.repeat(43));
  assert.match(cookie, /^__Host-khelyia_parent=/);
  assert.match(cookie, /; HttpOnly;/);
  assert.match(cookie, /; Secure;/);
  assert.match(cookie, /; SameSite=Strict;/);
  assert.match(cookie, /; Path=\//);
  assert.doesNotMatch(cookie, /Domain=/i);
  assert.match(clearSessionCookie(), /Max-Age=0/);
  assert.throws(() => sessionCookie('invalid; cookie'), /session/i);
});

test('un parent ne peut pas consulter une ressource appartenant à une autre famille', () => {
  assert.equal(requireOwner('parent-1', 'parent-1'), true);
  assert.throws(() => requireOwner('parent-1', 'parent-2'), e => e instanceof AuthError && e.status === 403);
  assert.throws(() => requireOwner(null, 'parent-1'), e => e instanceof AuthError && e.status === 401);
});

test('la V2.2 de référence garde QCM annulable, classes et assistant', () => {
  const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
  assert.match(html, /'CP','CE1','CE2'/);
  assert.match(html, /'Seconde','Première','Terminale'/);
  assert.match(html, /id="qcm-cancel-dialog"/);
  assert.match(html, /function abandonQuiz\(\)/);
  assert.match(html, /function renderParent\(\)/);
  assert.match(html, /function renderChat\(\)/);
});
