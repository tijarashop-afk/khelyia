/**
 * KhelyIA V3 — API parent (non déployée).
 * Connexion, session vérifiée et déconnexion révoquée côté serveur, sur D1.
 * L'inscription et la vérification des emails ne sont PAS encore implémentées.
 * À NE PAS rendre publique avant migration D1 et revue sécurité.
 */
import {
  normalizeEmail, verifyPassword, newSessionCredential, hashSessionToken,
  sessionCookie, clearSessionCookie
} from './parent-auth.mjs';

const COOKIE = '__Host-khelyia_parent';
const TTL_MS = 7 * 24 * 60 * 60 * 1000;
const WINDOW_MS = 15 * 60 * 1000;
const MAX_BYTES = 4096;
const enc = new TextEncoder();
// Valeur de substitution : même algorithme et coût qu'un mot de passe connu,
// pour éviter de signaler l'existence du compte par le délai de réponse.
const DUMMY_DIGEST = 'pbkdf2-sha256$310000$Cj-C7ZEaLewIjAHrwyGpPg$xnq6ps0-U5sjuRMVf38RtxIAO4sF0Vdz6jgeHCht4TM';

function json(data, status=200, headers={}) {
  return new Response(JSON.stringify(data), {
    status,headers:{
      'Content-Type':'application/json; charset=utf-8',
      'Cache-Control':'no-store',
      'Vary':'Cookie',
      'X-Content-Type-Options':'nosniff',
      'Referrer-Policy':'no-referrer',
      ...headers
    }
  });
}
function empty(status=204,headers={}) {
  return new Response(null,{status,headers:{
    'Cache-Control':'no-store','Vary':'Cookie','X-Content-Type-Options':'nosniff',
    ...headers
  }});
}
function fail(status, message) {return json({error:message},status);}

function sameOrigin(request) {
  const origin=request.headers.get('Origin');
  // Les requêtes sans Origin sont refusées en écriture ; pas d'exception « curl ».
  return Boolean(origin) && origin === new URL(request.url).origin;
}
function getToken(request) {
  const cookie=request.headers.get('Cookie') || '';
  const match=cookie.match(/(?:^|;\s*)__Host-khelyia_parent=([A-Za-z0-9_-]{43})(?:;|$)/);
  return match ? match[1] : null;
}
function configured(env) {
  return env && env.DB && typeof env.DB.prepare === 'function'
    && typeof env.AUTH_RATE_SECRET === 'string'
    && env.AUTH_RATE_SECRET.length >= 32;
}
function base64url(bytes) {
  let str='';
  for(const byte of bytes) str+=String.fromCharCode(byte);
  return btoa(str).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/g,'');
}
async function hmacBucket(secret, category, value) {
  const key=await crypto.subtle.importKey('raw',enc.encode(secret),{name:'HMAC',hash:'SHA-256'},false,['sign']);
  const signature=new Uint8Array(await crypto.subtle.sign('HMAC',key,enc.encode(category+':'+value)));
  return base64url(signature);
}
async function readLimitedJson(request) {
  const ct=request.headers.get('Content-Type') || '';
  if(!/^application\/json(?:\s*;|$)/i.test(ct)) return {error:fail(415,'Contenu JSON requis')};
  const claimed=Number(request.headers.get('Content-Length')||0);
  if(claimed>MAX_BYTES) return {error:fail(413,'Contenu trop volumineux')};
  if(!request.body) return {error:fail(400,'Requête JSON vide')};
  const reader=request.body.getReader();
  const chunks=[];
  let total=0;
  while(true) {
    const {done,value}=await reader.read();
    if(done)break;
    total+=value.byteLength;
    if(total>MAX_BYTES) {
      await reader.cancel().catch(()=>{});
      return {error:fail(413,'Contenu trop volumineux')};
    }
    chunks.push(value);
  }
  const result=new Uint8Array(total);
  let cursor=0;
  for(const chunk of chunks){result.set(chunk,cursor);cursor+=chunk.byteLength;}
  try {
    const parsed=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(result));
    if(!parsed || Array.isArray(parsed) || typeof parsed!=='object') throw new Error('format');
    return {value:parsed};
  } catch {
    return {error:fail(400,'JSON invalide')};
  }
}
async function checkLocked(db,keys,at) {
  for(const key of keys) {
    const row=await db.prepare('SELECT failed_count, started_at, blocked_until FROM parent_auth_attempts WHERE opaque_bucket = ?')
      .bind(key).first();
    if(row && Number(row.blocked_until)>at) return true;
  }
  return false;
}
async function recordFailure(db,keys,at) {
  // Incrément effectué par SQL : la concurrence ne doit pas écraser le compteur.
  const sql=`INSERT INTO parent_auth_attempts(opaque_bucket,started_at,failed_count,blocked_until)
    VALUES(?,?,1,NULL)
    ON CONFLICT(opaque_bucket) DO UPDATE SET
    failed_count=CASE WHEN started_at<=? THEN 1 ELSE failed_count+1 END,
    started_at=CASE WHEN started_at<=? THEN excluded.started_at ELSE started_at END,
    blocked_until=CASE WHEN started_at<=? THEN NULL
      WHEN failed_count+1>=5 THEN ? ELSE blocked_until END`;
  const cutoff=at-WINDOW_MS;
  for(const key of keys) {
    await db.prepare(sql).bind(key,at,cutoff,cutoff,cutoff,at+WINDOW_MS).run();
  }
}
async function resetFailures(db,keys) {
  await db.prepare('DELETE FROM parent_auth_attempts WHERE opaque_bucket IN (?,?)')
    .bind(keys[0],keys[1]).run();
}
async function login(request,env,at) {
  const parsed=await readLimitedJson(request);
  if(parsed.error)return parsed.error;
  const {email:inputEmail,password}=parsed.value;
  let email;
  try {email=normalizeEmail(inputEmail);}
  catch{return fail(400,'Adresse email invalide');}
  if(typeof password!=='string' || password.length<1 || password.length>128) {
    return fail(400,'Mot de passe invalide');
  }
  const ip=(request.headers.get('CF-Connecting-IP') || 'unknown').slice(0,64);
  const keys=[
    await hmacBucket(env.AUTH_RATE_SECRET,'ip',ip),
    await hmacBucket(env.AUTH_RATE_SECRET,'email',email)
  ];
  if(await checkLocked(env.DB,keys,at))return fail(429,'Réessayez plus tard');
  const parent=await env.DB.prepare(
    'SELECT id,email_normalized,password_digest,email_verified_at FROM parents WHERE email_normalized = ? LIMIT 1'
  ).bind(email).first();
  const correct=await verifyPassword(password,parent?.password_digest || DUMMY_DIGEST);
  if(!parent || !correct) {
    await recordFailure(env.DB,keys,at);
    return fail(401,'Identifiants incorrects');
  }
  if(!parent.email_verified_at) {
    // Bloquer tout compte dont la confirmation email n'est pas effective.
    return fail(403,'Compte en attente de vérification');
  }
  await resetFailures(env.DB,keys);
  const {token,tokenHash}=await newSessionCredential();
  await env.DB.prepare(
    'INSERT INTO parent_sessions(token_hash,parent_id,created_at,expires_at,revoked_at) VALUES (?,?,?,?,NULL)'
  ).bind(tokenHash,parent.id,at,at+TTL_MS).run();
  return json({ok:true,parent:{id:parent.id,email:parent.email_normalized}},200,{
    'Set-Cookie':sessionCookie(token)
  });
}
async function me(request,env,at) {
  const token=getToken(request);
  if(!token)return fail(401,'Connexion requise');
  const hash=await hashSessionToken(token);
  const parent=await env.DB.prepare(
    'SELECT p.id,p.email_normalized FROM parent_sessions s JOIN parents p ON s.parent_id=p.id WHERE s.token_hash=? AND s.revoked_at IS NULL AND s.expires_at>? AND p.email_verified_at IS NOT NULL LIMIT 1'
  ).bind(hash,at).first();
  if(!parent)return fail(401,'Connexion requise');
  return json({parent:{id:parent.id,email:parent.email_normalized}});
}
async function logout(request,env,at) {
  const token=getToken(request);
  if(token) {
    await env.DB.prepare(
      'UPDATE parent_sessions SET revoked_at=? WHERE token_hash=? AND revoked_at IS NULL'
    ).bind(at,await hashSessionToken(token)).run();
  }
  return empty(204,{'Set-Cookie':clearSessionCookie()});
}
export async function handleParentApi(request,env,{now=Date.now}={}) {
  const path=new URL(request.url).pathname;
  const method=request.method.toUpperCase();
  const endpoints={'/api/parent/login':'POST','/api/parent/logout':'POST','/api/parent/me':'GET'};
  if(!(path in endpoints))return fail(404,'Route inconnue');
  if(method!==endpoints[path])return json({error:'Méthode non autorisée'},405,{'Allow':endpoints[path]});
  if(method!=='GET' && !sameOrigin(request))return fail(403,'Origine non autorisée');
  if(!configured(env))return fail(503,'Service parent indisponible');
  try {
    const at=now();
    if(path==='/api/parent/login')return await login(request,env,at);
    if(path==='/api/parent/logout')return await logout(request,env,at);
    return await me(request,env,at);
  }catch(error) {
    // Les erreurs détaillées ne doivent pas être exposées aux navigateurs.
    console.error('KhelyIA parent API erreur (sans identifiants ni corps de requête)',error?.name||'Error');
    return fail(503,'Service momentanément indisponible');
  }
}
