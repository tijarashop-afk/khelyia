import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const page=readFileSync(new URL('../contact.html',import.meta.url),'utf8');
const home=readFileSync(new URL('../index.html',import.meta.url),'utf8');

test('KhelyIA rend le lien contact accessible dans le menu et le pied de page',()=>{
  assert.match(home,/class="sidebar-bottom"><a href="\/contact\.html"/);
  assert.match(home,/href="\/contact\.html"[^>]*>Nous contacter<\/a>/);
  assert.match(page,/<html lang="fr">/);
  assert.match(page,/href="\/"/);
});

test('formulaire contact : validations, notice vie privée et protection mineurs',()=>{
  for(const id of ['name','email','topic','message','privacy','turnstile','send','status']){
    assert.match(page,new RegExp('id="'+id+'"'));
  }
  assert.match(page,/name="website"/);
  assert.match(page,/note[s]?\, ni noms ou documents d'enfants/i);
  assert.match(page,/type="email"/);
  assert.match(page,/maxlength="3000"/);
  assert.match(page,/window\.turnstile\.render/);
  assert.match(page,/token/);
});

test('aucune adresse privée, clé secrète, ni faux succès local dans le HTML',()=>{
  assert.doesNotMatch(page,/CONTACT_TO_EMAIL|TURNSTILE_SECRET|secret-server-test/);
  assert.doesNotMatch(page,/mailto:/);
  assert.match(page,/if\(!response\.ok\|\|!data\.ok\)throw/);
  assert.match(page,/Le formulaire n.est pas encore activé/);
});
