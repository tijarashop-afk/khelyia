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
    this.notes = [];
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
          async all() {
            if(sql.includes('FROM parent_notes')) {
              const notes=db.notes.filter(n=>n.parent_id===args[0]);
              notes.sort((a,b)=>b.recorded_at-a.recorded_at || b.id.localeCompare(a.id));
              return {success:true,results:notes.slice(0,100).map(({parent_id,...rest})=>rest)};
            }
            throw Error('SQL all inattendu: '+sql);
          },
          async run() {
            if (sql.startsWith('INSERT INTO parent_auth_attempts')) {
              const [key, stamp, cutoff1, cutoff2, cutoff3, blockedUntil] = args;
              const cutoff = cutoff1;
              if(cutoff2!==cutoff || cutoff3!==cutoff) throw Error('SQL throttle parameter mismatch');
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
            if (sql.startsWith('DELETE FROM parent_notes')) {
              const [id,parentId]=args;
              db.notes=db.notes.filter(n=>!(n.id===id && n.parent_id===parentId));
              return {success:true};
            }
            if (sql.startsWith('INSERT INTO parent_notes')) {
              const [id,parent_id,subject,level,score,max_score,recorded_at]=args;
              db.notes.push({id,parent_id,subject,level,score,max_score,recorded_at});
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


test('une nouvelle connexion révoque une ancienne session du même navigateur', async () => {
  const env=await setup();
  const first=await call(request('/api/parent/login','POST',{email,password}),env);
  const oldCookie=first.headers.get('Set-Cookie').split(';')[0];
  const second=await call(request('/api/parent/login','POST',{email,password},ORIGIN,oldCookie),env);
  assert.equal(second.status,200);
  const newCookie=second.headers.get('Set-Cookie').split(';')[0];
  assert.notEqual(newCookie,oldCookie);
  assert.equal((await call(request('/api/parent/me','GET',null,null,oldCookie),env)).status,401);
  assert.equal((await call(request('/api/parent/me','GET',null,null,newCookie),env)).status,200);
});


test('compte inexistant : aucune information de compte ne fuit', async () => {
  const env=await setup();
  const result=await call(request('/api/parent/login','POST',{
    email:'inconnu@example.invalid',password
  }),env);
  assert.equal(result.status,401);
  assert.deepEqual(await result.json(),{error:'Identifiants incorrects'});
  assert.equal(env.DB.sessions.size,0);
});

test('les requêtes incorrectes sont filtrées avant accès aux identifiants', async () => {
  const env=await setup();
  const plain=new Request(ORIGIN+'/api/parent/login',{
    method:'POST',headers:{Origin:ORIGIN,'Content-Type':'text/plain'},body:'hello'
  });
  assert.equal((await call(plain,env)).status,415);
  const invalid=new Request(ORIGIN+'/api/parent/login',{
    method:'POST',headers:{Origin:ORIGIN,'Content-Type':'application/json'},body:'{not-json'
  });
  assert.equal((await call(invalid,env)).status,400);
  assert.equal((await call(request('/api/parent/login','GET',null,null),env)).status,405);
  assert.equal(env.DB.sessions.size,0);
});

test('les tentatives de connexion expirent après la fenêtre de blocage', async () => {
  const env=await setup();
  for(let i=0;i<5;i++) {
    await call(request('/api/parent/login','POST',{email,password:'WrongPassword2026!'}),env);
  }
  const after=await handleParentApi(request('/api/parent/login','POST',{email,password}),env,{
    now:()=>now+16*60*1000
  });
  assert.equal(after.status,200);
  assert.equal(env.DB.sessions.size,1);
});

test('les valeurs envoyées par les clients restent hors des chaînes SQL', async () => {
  const env=await setup();
  await call(request('/api/parent/login','POST',{email,password}),env);
  assert.ok(env.DB.statements.length>0);
  for(const row of env.DB.statements) {
    assert.ok(!row.sql.includes(email),'donnée privée insérée dans SQL');
    assert.ok(row.sql.includes('?'),'requête non paramétrée');
  }
});


test('lecture des notes : uniquement celles du parent authentifié', async () => {
  const env=await setup();
  env.DB.notes.push(
    {id:'n1',parent_id:'family-1',subject:'math',level:'CM1',score:17,max_score:20,recorded_at:now},
    {id:'n2',parent_id:'family-2',subject:'en',level:'6e',score:4,max_score:20,recorded_at:now}
  );
  assert.equal((await call(request('/api/parent/notes','GET',null,null),env)).status,401);
  const login=await call(request('/api/parent/login','POST',{email,password}),env);
  const cookie=login.headers.get('Set-Cookie').split(';')[0];
  const result=await call(request('/api/parent/notes?parent_id=family-2','GET',null,null,cookie),env);
  assert.equal(result.status,200);
  const body=await result.json();
  assert.equal(body.notes.length,1);
  assert.equal(body.notes[0].id,'n1');
  assert.ok(!JSON.stringify(body).includes('family-2'));
  assert.equal(env.DB.statements.at(-1).args[0],'family-1');
});

test('enregistrement des notes : propriétaire déterminé depuis la session, jamais depuis le client', async () => {
  const env=await setup();
  const login=await call(request('/api/parent/login','POST',{email,password}),env);
  const cookie=login.headers.get('Set-Cookie').split(';')[0];
  const res=await call(request('/api/parent/notes','POST',{
    subject:'fr',level:'CM1',score:16,parent_id:'family-2',child_name:'do not store'
  },ORIGIN,cookie),env);
  assert.equal(res.status,201);
  const body=await res.json();
  assert.match(body.id,/^[0-9a-f-]{36}$/i);
  assert.equal(env.DB.notes.length,1);
  assert.equal(env.DB.notes[0].parent_id,'family-1');
  assert.equal(env.DB.notes[0].score,16);
  assert.ok(!JSON.stringify(env.DB.notes).includes('do not store'));
  assert.equal((await call(request('/api/parent/notes','GET',null,null,cookie),env)).status,200);
});

test('enregistrement des notes : requêtes non authentifiées ou hors origine bloquées', async () => {
  const env=await setup();
  assert.equal((await call(request('/api/parent/notes','POST',{
    subject:'math',level:'CP',score:15
  }),env)).status,401);
  const login=await call(request('/api/parent/login','POST',{email,password}),env);
  const cookie=login.headers.get('Set-Cookie').split(';')[0];
  assert.equal((await call(request('/api/parent/notes','POST',{
    subject:'math',level:'CP',score:15
  },'https://evil.invalid',cookie),env)).status,403);
  assert.equal(env.DB.notes.length,0);
});

test('les notes invalides sont rejetées sans écrire dans D1', async () => {
  const env=await setup();
  const login=await call(request('/api/parent/login','POST',{email,password}),env);
  const cookie=login.headers.get('Set-Cookie').split(';')[0];
  const invalid=[
    {subject:'éducation',level:'CP',score:14},
    {subject:'math',level:'niveau-malformé',score:10},
    {subject:'math',level:'CP',score:-1},
    {subject:'math',level:'CP',score:21},
    {subject:'math',level:'CP',score:'18'},
    {subject:'math',level:'CP',score:12.5}
  ];
  for(const data of invalid) {
    const res=await call(request('/api/parent/notes','POST',data,ORIGIN,cookie),env);
    assert.equal(res.status,400);
  }
  assert.equal(env.DB.notes.length,0);
});


test('effacement : un parent peut supprimer sa note mais aucune note étrangère', async () => {
  const env=await setup();
  const login=await call(request('/api/parent/login','POST',{email,password}),env);
  const cookie=login.headers.get('Set-Cookie').split(';')[0];
  const created=await call(request('/api/parent/notes','POST',{
    subject:'math',level:'CM2',score:14
  },ORIGIN,cookie),env);
  const ownId=(await created.json()).id;
  const otherId=crypto.randomUUID();
  env.DB.notes.push({id:otherId,parent_id:'family-2',subject:'en',level:'3e',score:10,max_score:20,recorded_at:now});
  assert.equal((await call(request('/api/parent/notes','DELETE',{id:otherId},ORIGIN,cookie),env)).status,204);
  assert.equal(env.DB.notes.length,2);
  assert.equal((await call(request('/api/parent/notes','DELETE',{id:ownId},ORIGIN,cookie),env)).status,204);
  assert.equal(env.DB.notes.length,1);
  assert.equal(env.DB.notes[0].id,otherId);
});

test('effacement : sans session, sans origine valide ou avec ID incorrect, refus', async () => {
  const env=await setup();
  const id=crypto.randomUUID();
  assert.equal((await call(request('/api/parent/notes','DELETE',{id}),env)).status,401);
  const login=await call(request('/api/parent/login','POST',{email,password}),env);
  const cookie=login.headers.get('Set-Cookie').split(';')[0];
  assert.equal((await call(request('/api/parent/notes','DELETE',{id},'https://evil.invalid',cookie),env)).status,403);
  assert.equal((await call(request('/api/parent/notes','DELETE',{id:'not-a-uuid'},ORIGIN,cookie),env)).status,400);
});
