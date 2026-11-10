import test from 'node:test';
import assert from 'node:assert/strict';
import {handleContactApi} from '../src/server/contact-api.mjs';

const origin='https://khelyia.pages.dev';
const validForm={
  name:'Parent fictif',
  email:'parent@example.invalid',
  topic:'question',
  message:'Bonjour, je souhaiterais obtenir une information sur KhelyIA.',
  acceptedPrivacy:true,
  website:'',
  turnstileToken:'token-test-valide'
};
function makeEnv(overrides={}){
  const sent=[];
  return {
    env:{
      EMAIL:{send:async message=>{sent.push(message);return {messageId:'fake-message'};}},
      CONTACT_TO_EMAIL:'reception@example.invalid',
      CONTACT_FROM_EMAIL:'notification@site.example.invalid',
      TURNSTILE_SITE_KEY:'test-sitekey-public',
      TURNSTILE_SECRET:'secret-server-test',
      ...overrides
    },
    sent
  };
}
const verified=async()=>({success:true,hostname:'khelyia.pages.dev',action:'khelyia_contact'});
function req(method='POST',data=validForm,originHeader=origin){
  const headers={Origin:originHeader};
  if(method==='POST')headers['Content-Type']='application/json';
  return new Request(origin+'/api/contact',{method,headers,body:method==='POST'?JSON.stringify(data):undefined});
}

test('config publique : donne la clé du widget mais jamais la clé serveur ni l’adresse privée', async()=>{
  const {env}=makeEnv();
  const result=await handleContactApi(req('GET'),env);
  assert.equal(result.status,200);
  const body=await result.json();
  assert.deepEqual(body,{enabled:true,siteKey:'test-sitekey-public'});
  assert.ok(!JSON.stringify(body).includes('secret-server-test'));
  assert.ok(!JSON.stringify(body).includes('reception@example.invalid'));
});

test('sans configuration email ou Turnstile, formulaire désactivé et aucune tentative d’envoi',async()=>{
  const {env,sent}=makeEnv({EMAIL:null});
  const config=await handleContactApi(req('GET'),env);
  assert.deepEqual(await config.json(),{enabled:false});
  assert.equal((await handleContactApi(req(),env,{verifyTurnstile:verified})).status,503);
  assert.equal(sent.length,0);
});

test('message valide : email expédié avec adresse fixe, destinataire serveur, replyTo du contact',async()=>{
  const {env,sent}=makeEnv();
  const result=await handleContactApi(req(),env,{verifyTurnstile:verified});
  assert.equal(result.status,200);
  assert.deepEqual(await result.json(),{ok:true});
  assert.equal(sent.length,1);
  const mail=sent[0];
  assert.equal(mail.to,'reception@example.invalid');
  assert.equal(mail.from,'notification@site.example.invalid');
  assert.equal(mail.replyTo,'parent@example.invalid');
  assert.match(mail.subject,/\[KhelyIA\]/);
  assert.match(mail.text,/Parent fictif/);
  assert.match(mail.text,/question/i);
  assert.ok(!mail.text.includes('token-test-valide'));
  assert.equal(result.headers.get('Access-Control-Allow-Origin'),null);
  assert.equal(result.headers.get('Cache-Control'),'no-store');
});

test('validation : messages ou adresses malformés refusés avant appel email',async()=>{
  const invalid=[
    {...validForm,name:'A'},
    {...validForm,name:'Pierre\nBcc: x@evil.invalid'},
    {...validForm,email:'evil@example.invalid\nBcc: x@evil.invalid'},
    {...validForm,email:'invalid'},
    {...validForm,topic:'secret'},
    {...validForm,message:'trop court'},
    {...validForm,message:'x'.repeat(3100)},
    {...validForm,acceptedPrivacy:false},
    {...validForm,turnstileToken:''}
  ];
  const {env,sent}=makeEnv();
  for(const item of invalid){
    const response=await handleContactApi(req('POST',item),env,{verifyTurnstile:verified});
    assert.equal(response.status,400);
  }
  assert.equal(sent.length,0);
});

test('Turnstile invalide, action ou domaine incorrect : aucun message',async()=>{
  const {env,sent}=makeEnv();
  const results=[
    {success:false,hostname:'khelyia.pages.dev',action:'khelyia_contact'},
    {success:true,hostname:'attacker.invalid',action:'khelyia_contact'},
    {success:true,hostname:'khelyia.pages.dev',action:'unexpected'}
  ];
  for(const verification of results){
    const response=await handleContactApi(req(),env,{verifyTurnstile:async()=>verification});
    assert.equal(response.status,403);
  }
  assert.equal(sent.length,0);
});

test('origine intersite interdite ; bot honeypot écarté sans envoyer',async()=>{
  const {env,sent}=makeEnv();
  assert.equal((await handleContactApi(req('POST',validForm,'https://attacker.invalid'),env,{verifyTurnstile:verified})).status,403);
  assert.equal((await handleContactApi(req('POST',{...validForm,website:'spam.example'}),env,{verifyTurnstile:verified})).status,202);
  assert.equal(sent.length,0);
});

test('erreur email : échec signalé sans prétendre que le message a été envoyé',async()=>{
  const {env}=makeEnv({EMAIL:{send:async()=>{throw Error('private SMTP error')}}});
  const response=await handleContactApi(req(),env,{verifyTurnstile:verified});
  assert.equal(response.status,503);
  const body=await response.json();
  assert.ok(!JSON.stringify(body).includes('private SMTP error'));
});

test('rejet du JSON invalide, de la charge trop grande et des méthodes non autorisées',async()=>{
  const {env,sent}=makeEnv();
  const malformed=new Request(origin+'/api/contact',{method:'POST',headers:{Origin:origin,'Content-Type':'application/json'},body:'{"broken":'});
  assert.equal((await handleContactApi(malformed,env,{verifyTurnstile:verified})).status,400);
  assert.equal((await handleContactApi(req('POST',{...validForm,message:'x'.repeat(19000)}),env,{verifyTurnstile:verified})).status,413);
  const patch=new Request(origin+'/api/contact',{method:'PATCH'});
  assert.equal((await handleContactApi(patch,env,{verifyTurnstile:verified})).status,405);
  assert.equal(sent.length,0);
});
