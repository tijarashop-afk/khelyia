import test from 'node:test';
import assert from 'node:assert/strict';
import {hashPassword} from '../src/server/parent-auth.mjs';
import {handleParentApi} from '../src/server/parent-api.mjs';

const ORIGIN = 'https://khelyia.example';
const now = 1794300000000;
const email = 'parent@example.fr';
const password = 'Khelyia2026!Motdepasse';

class FakeD1 {
  constructor() {
    this.parents = new Map();
    this.sessions = new Map();
    this.attempts = new Map();
    this.statements = [];
  }
  prepare(sql) {
    const db = this;
    return {
      bind(...args) {
        db.statements.push({sql,args});
        return {
          async first() {
            if (sql.includes('FROM parent_auth_attempts')) {
              return db.attempts.get(args[0]) ?? null;
            }
            if (sql.includes('FROM parents')) {
              return db.parents.get(args[0]) ?? null;
            }
            if (sql.includes('FROM parent_sessions') && sql.includes('JOIN parents')) {
              const session = db.sessions.get(args[0]);
              const parent = session && [...db.parents.values()].find(p => p.id === session.parent_id);
              if (!parent || session.revoked_at !== null || session.expires_at <= args[1] || !parent.email_verified_at) return null;
              return {id: parent.id, email_normalized: parent.email_normalized};
            }
            throw Error('SQL first inattendu: ' + sql);
          },
          async run() {
            if (sql.startsWith('INSERT INTO parent_auth_attempts')) {
              const [key, stamp, resetAt, cutoff, blockedUntil] = args;
              const prev = db.attempts.get(key);
              const reset = !prev || prev.started_at <= cutoff;
              const count = reset ? 1 : prev.failed_count + 1;
              db.attempts.set(key, {started_at: reset ? stamp : prev.started_at,
                failed_count: count, blocked_until: count >= 5 ? blockedUntil : null});
              return {success:true};
            }
            if (sql.startsWith('DELETE FROM parent_auth_attempts')) {
              db.attempts.delete(args[0]); db.attempts.delete(args[1]);
              return {success:true};
            }
            if (sql.startsWith('INSERT INTO parent_sessions')) {
              const [token_hash, parent_id, created_at, expires_at] = args;
              db.sessions.set(token_hash, {token_hash,parent_id,created_at,expires_at,revoked_at:null});
              return {success:true};
            }
            if (sql.startsWith('UPDATE parent_sessions SET revoked_at')) {
              const row=db.sessions.get(args[1]);
              if (row && row.revoked_at === null) row.revoked_at=args[0];
              return {success:true};
            }
            throw Error('SQL run inattendu: ' + sql);
          },
        };
      },
    };
  }
}

function request(path, method='GET', json=null, origin=ORIGIN, cookie='') {
  const headers = {'CF-Connecting-IP':'203.0.113.4'};
  if (origin !== null) headers.Origin=origin;
  if (cookie) headers.Cookie=cookie;
  if (json !== null) headers['Content-Type']='application/json';
  return new Request(ORIGIN+path, {method,headers,body:json===null?undefined:JSON.stringify(json)});
}
async function setup(verified=true) {
  const DB = new FakeD1();
  DB.parents.set(email, {
    id:'family-1',email_normalized:email,password_digest:await hashPassword(password),
    email_verified_at:verified?now:null
  });
  return {DB, AUTH_RATE_SECRET:'a-test-only-long-secret-32-characters-or-more'};
}
async function call(req,env) {return handleParentApi(req,env,{now:()=>now});}

test('connexion validée : cookie HttpOnly et aucune donnée privée dans le JSON', async () => {
  const env=await setup();
  const res=await call(request('/api/parent/login','POST',{email,password}),env);
  assert.equal(res.status,200);
  const body=await res.json();
  assert.deepEqual(body,{ok:true,parent:{id:'family-1',email}});
  assert.match(res.headers.get('Set-Cookie'), /HttpOnly; Secure; SameSite=Strict/);
  assert.match(res.headers.get('Cache-Control'), /no-store/);
  assert.equal(env.DB.sessions.size,1);
  assert.equal(res.headers.get('Access-Control-Allow-Origin'),null);
  assert.ok(!JSON.stringify(body).includes(password));
});

test('la session est accessible uniquement avec le jeton envoyé dans le cookie', async () => {
  const env=await setup();
  const login=await call(request('/api/parent/login','POST',{email,password}),env);
  const cookie=login.headers.get('Set-Cookie').split(';')[0];
  const me=await call(request('/api/parent/me','GET',null,null,cookie),env);
  assert.equal(me.status,200);
  assert.deepEqual(await me.json(),{parent:{id:'family-1',email}});
  const other=await call(request('/api/parent/me','GET',null,null,'__Host-khelyia_parent='+'A'.repeat(43)),env);
  assert.equal(other.status,401);
});

test('déconnexion : révocation côté serveur, pas seulement suppression du cookie', async () => {
  const env=await setup();
  const login=await call(request('/api/parent/login','POST',{email,password}),env);
  const cookie=login.headers.get('Set-Cookie').split(';')[0];
  const logout=await call(request('/api/parent/logout','POST',{} ,ORIGIN,cookie),env);
  assert.equal(logout.status,204);
  assert.match(logout.headers.get('Set-Cookie'), /Max-Age=0/);
  assert.equal((await call(request('/api/parent/me','GET',null,null,cookie),env)).status,401);
});

test('sans authentification, sans email validé ou après expiration, accès refusé', async () => {
  const env=await setup(false);
  const login=await call(request('/api/parent/login','POST',{email,password}),env);
  assert.equal(login.status,403);
  assert.equal(env.DB.sessions.size,0);
  assert.equal((await call(request('/api/parent/me','GET',null,null),env)).status,401);
  const good=await setup(true);
  const ok=await call(request('/api/parent/login','POST',{email,password}),good);
  const cookie=ok.headers.get('Set-Cookie').split(';')[0];
  const expired=await handleParentApi(request('/api/parent/me','GET',null,null,cookie),good,{now:()=>now+8*86400000});
  assert.equal(expired.status,401);
});

test('lutte contre la force brute : refus après cinq échecs', async () => {
  const env=await setup();
  for(let i=0;i<5;i++) {
    const res=await call(request('/api/parent/login','POST',{email,password:'WrongPassword2026!'}),env);
    assert.equal(res.status,401);
  }
  assert.equal((await call(request('/api/parent/login','POST',{email,password}),env)).status,429);
  assert.equal(env.DB.sessions.size,0);
});

test('CSRF bloqué : origine étrangère ou absente, y compris pour la déconnexion', async () => {
  const env=await setup();
  assert.equal((await call(request('/api/parent/login','POST',{email,password},'https://attacker.invalid'),env)).status,403);
  assert.equal((await call(request('/api/parent/login','POST',{email,password},null),env)).status,403);
  assert.equal((await call(request('/api/parent/logout','POST',{},'https://attacker.invalid'),env)).status,403);
  assert.equal(env.DB.sessions.size,0);
});

test('configuration manquante, saisie trop volumineuse et route inconnue : refus contrôlé', async () => {
  const env=await setup();
  assert.equal((await call(request('/api/parent/login','POST',{email,password}),{DB:env.DB})).status,503);
  assert.equal((await call(request('/api/parent/login','POST',{email,password:'X'.repeat(5000)}),env)).status,413);
  assert.equal((await call(request('/api/parent/not-found','GET',null,null),env)).status,404);
  assert.equal((await call(request('/api/parent/login','POST',{email:'not-an-email',password}),env)).status,400);
});
