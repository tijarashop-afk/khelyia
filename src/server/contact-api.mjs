/**
 * KhelyIA — API Contact ; pour Cloudflare Pages Functions.
 * Aucun service email ne fonctionne sans une liaison EMAIL autorisée,
 * une destination vérifiée et les clés Turnstile configurées.
 * Le formulaire ne stocke pas les messages en base.
 */
const TOPICS=Object.freeze({
  question:'Question générale',
  support:'Support technique',
  partenariat:'Partenariat',
  autre:'Autre demande'
});
const MAX_BODY_BYTES=12_000;
function respond(body,status=200,headers={}){
  return new Response(JSON.stringify(body),{
    status,
    headers:{
      'Content-Type':'application/json; charset=utf-8',
      'Cache-Control':'no-store',
      'X-Content-Type-Options':'nosniff',
      'Referrer-Policy':'no-referrer',
      ...headers
    }
  });
}
function fail(status,error){return respond({error},status);}
function isEmail(value){
  return typeof value==='string' && value.length<=254 &&
    /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(value) &&
    !/[\x00-\x1f\x7f]/.test(value);
}
function configured(env){
  return Boolean(env && typeof env.EMAIL?.send==='function' &&
    isEmail(env.CONTACT_TO_EMAIL) && isEmail(env.CONTACT_FROM_EMAIL) &&
    typeof env.TURNSTILE_SITE_KEY==='string' && env.TURNSTILE_SITE_KEY.length>=3 &&
    typeof env.TURNSTILE_SECRET==='string' && env.TURNSTILE_SECRET.length>=8);
}
async function readSmallJson(request){
  if(!/^application\/json(?:\s*;|$)/i.test(request.headers.get('Content-Type')||'')){
    return {error:fail(415,'Un message JSON est requis.')};
  }
  const declared=Number(request.headers.get('Content-Length')||0);
  if(declared>MAX_BODY_BYTES)return {error:fail(413,'Message trop volumineux.')};
  if(!request.body)return {error:fail(400,'Formulaire vide.')};
  const reader=request.body.getReader();
  let bytes=0;
  const chunks=[];
  for(;;){
    const {done,value}=await reader.read();
    if(done)break;
    bytes+=value.byteLength;
    if(bytes>MAX_BODY_BYTES){
      await reader.cancel().catch(()=>{});
      return {error:fail(413,'Message trop volumineux.')};
    }
    chunks.push(value);
  }
  const all=new Uint8Array(bytes);
  let offset=0;
  for(const chunk of chunks){all.set(chunk,offset);offset+=chunk.byteLength;}
  try{
    const value=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(all));
    if(!value || Array.isArray(value) || typeof value!=='object')throw Error('invalid');
    return {value};
  }catch{return {error:fail(400,'Format du formulaire invalide.')};}
}
function validateData(form){
  const name=typeof form.name==='string'?form.name.trim():'';
  const email=typeof form.email==='string'?form.email.trim():'';
  const message=typeof form.message==='string'?form.message.trim():'';
  const topic=typeof form.topic==='string'?form.topic:'';
  const token=typeof form.turnstileToken==='string'?form.turnstileToken:'';
  if(name.length<2 || name.length>80 || /[\r\n\x00-\x1f\x7f]/.test(name))return null;
  if(!isEmail(email))return null;
  if(!Object.hasOwn(TOPICS,topic))return null;
  if(message.length<15 || message.length>3000 || /[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]/.test(message))return null;
  if(form.acceptedPrivacy!==true)return null;
  if(token.length<3 || token.length>2048)return null;
  return {name,email,message,topic,turnstileToken:token};
}
async function verifyWithCloudflare(token,ip,secret){
  const form=new URLSearchParams({secret,response:token});
  if(ip)form.set('remoteip',ip);
  const response=await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify',{
    method:'POST',body:form,signal:AbortSignal.timeout(8000)
  });
  if(!response.ok)throw new Error('turnstile-network');
  return response.json();
}
export async function handleContactApi(request,env,{verifyTurnstile=verifyWithCloudflare}={}){
  const method=request.method.toUpperCase();
  if(method==='GET'){
    if(!configured(env))return respond({enabled:false});
    return respond({enabled:true,siteKey:env.TURNSTILE_SITE_KEY});
  }
  if(method!=='POST')return respond({error:'Méthode non autorisée.'},405,{Allow:'GET, POST'});
  const origin=request.headers.get('Origin');
  if(!origin || origin!==new URL(request.url).origin)return fail(403,'Origine non autorisée.');
  if(!configured(env))return fail(503,'Formulaire temporairement indisponible.');
  try{
    const parsed=await readSmallJson(request);
    if(parsed.error)return parsed.error;
    const form=parsed.value;
    // Champ masqué : ne pas signaler au bot que son message a été rejeté.
    if(typeof form.website==='string' && form.website.trim())return respond({ok:true},202);
    const data=validateData(form);
    if(!data)return fail(400,'Veuillez vérifier les informations du formulaire.');
    const ip=request.headers.get('CF-Connecting-IP') || '';
    let verification;
    try{
      verification=await verifyTurnstile(data.turnstileToken,ip,env.TURNSTILE_SECRET);
    }catch{return fail(503,'Vérification anti-spam indisponible.');}
    if(!verification?.success ||
       verification.hostname!==new URL(request.url).hostname ||
       verification.action!=='khelyia_contact'){
      return fail(403,'Vérification anti-spam refusée. Rechargez la page.');
    }
    const subject='[KhelyIA] '+TOPICS[data.topic];
    const text=[
      'Nouveau message du formulaire KhelyIA',
      '',
      'Nom : '+data.name,
      'Email de réponse : '+data.email,
      'Objet : '+TOPICS[data.topic],
      '',
      'Message :',
      data.message,
      '',
      '--',
      'Envoyé par le formulaire de contact KhelyIA.',
      'Ce formulaire ne demande aucune information concernant un enfant.'
    ].join('\n');
    try{
      await env.EMAIL.send({
        from:env.CONTACT_FROM_EMAIL,
        to:env.CONTACT_TO_EMAIL,
        replyTo:data.email,
        subject,text
      });
    }catch{
      return fail(503,"L'envoi a échoué. Veuillez réessayer plus tard.");
    }
    return respond({ok:true});
  }catch{
    return fail(503,'Service momentanément indisponible.');
  }
}
