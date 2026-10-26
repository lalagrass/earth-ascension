import test from 'node:test';
import assert from 'node:assert/strict';
import { field } from '../../character-card/contract.mjs';
import { publicValueHtml } from '../values.mjs';
import { renderCard, fieldsHtml } from '../../character-card/render.mjs';
import { resourcesHtml } from '../../resource-view/render.mjs';
import { intentHtml } from '../../intent-view/render.mjs';
import { recentHtml } from '../../event-view/render.mjs';
import { previewFixtures } from '../preview-fixtures.mjs';

test('shared value markup preserves zero, availability and units, escapes source, and never titles hidden values',()=>{
 assert.match(publicValueHtml(field('n',0,{source:'native',unit:'個'})),/>0 個<\/span>/);
 for(const [availability,label] of [['unknown','未知'],['hidden','隱藏'],['unsupported','不支援']]) {
  const html = publicValueHtml({availability,source:'PRIVATE-SOURCE',value:'PRIVATE-VALUE',unit:'PRIVATE-UNIT'},{raw:true});
  assert.match(html,new RegExp(`>${label}<`)); assert.ok(!html.includes('PRIVATE-VALUE')); assert.ok(!html.includes('PRIVATE-UNIT'));
  if(availability === 'hidden') assert.ok(!html.includes('PRIVATE-SOURCE') && !html.includes('title='));
 }
 assert.ok(publicValueHtml(field('n','<script>',{source:'"<&'})).includes('&lt;script&gt;'));
});
test('production renderers use shared statuses without mutating preview data; native result text stays literal',()=>{
 const f=previewFixtures(),before=structuredClone(f);
 const markup=[renderCard(f.card),resourcesHtml(f.resources),intentHtml(f.intent,{result:'原指令拒絕 <原因>'}),recentHtml(f.events)].join('');
 for(const availability of ['known','unknown','hidden','unsupported']) assert.ok(markup.includes(`data-availability="${availability}"`));
 assert.ok(markup.includes('原指令拒絕 &lt;原因&gt;'));
 assert.ok(markup.includes('disabled')); assert.ok(markup.includes('data-view-key="intent"'));
 assert.deepEqual(f,before);
 // An accidental raw hidden object is still not serialized into the attributes tooltip.
 f.card.fields=[{semanticId:'innate',layer:'innate',availability:'hidden',source:'PRIVATE-SOURCE',value:'PRIVATE-VALUE'}];
 const card=fieldsHtml(f.card);assert.ok(!card.includes('PRIVATE-'));
});
