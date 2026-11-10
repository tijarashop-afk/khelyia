import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const html=readFileSync(new URL('../parent-v3.html',import.meta.url),'utf8');

test('l\'interface V3 utilise une API parent serveur, jamais un rôle local',()=>{
  assert.match(html,/<html lang="fr">/);
  assert.match(html,/name="viewport"/);
  assert.match(html,/credentials:'same-origin'/);
  assert.match(html,/\/api\/parent\//);
  assert.match(html,/api\('login'/);
  assert.match(html,/api\('logout'/);
  assert.match(html,/api\('me'/);
  assert.match(html,/api\('notes'/);
  assert.doesNotMatch(html,/localStorage|sessionStorage/);
});

test('l\'interface ne rend pas les données provenant du serveur en HTML brut',()=>{
  assert.match(html,/title\.textContent=/);
  assert.match(html,/sub\.textContent=/);
  assert.match(html,/replaceChildren\(\)/);
  assert.doesNotMatch(html,/innerHTML|document\.write|eval\(/);
  assert.match(html,/Donn[ée]es? fictiv/i);
});
