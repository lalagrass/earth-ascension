/* loop191 v3.0：武學／門派／特質的結構不變量。載入即驗，不跑對局。 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { ARTS, MOVES, SECTS, TRAITS, OPPOSE, OPPOSE24, LIKES, LIKES24, RECRUIT29, WUMING_KIT24 } from '../src/data.mjs';
import { ART_CAT, PUBLIC28, TEMPER29, attrOf, artById, artTier, isInner, normalizeArts, sectClasses24, gainArt, lockedArt24, yunvOpen24 } from '../src/arts.mjs';


const moveIds = new Set(MOVES.map((m) => m.id));
const artIds = new Set(ARTS.map((a) => a.id));
const ordinaryInner = (a) => !!(a && isInner(a) && !a.chiefOnly24 && !a.secret && !a.signature);

test('loop191 normalizeArts：isInner／kind／isPublic／cats 補在原物件上', () => {
  normalizeArts();
  for (const a of ARTS) {
    assert.equal(a.isInner, a.school === 'inner' || !!ART_CAT[a.id]?.neigong, a.id);
    assert.equal(a.kind, a.isInner ? 'inner' : a.school === 'step' ? 'step' : 'outer', a.id);
    assert.equal(a.isPublic, PUBLIC28.includes(a.id), a.id);
    assert.ok(a.cats && a.cats === (ART_CAT[a.id] || a.cats), a.id);
  }
  const y = artById('yunv');
  assert.equal(y.isInner, true); assert.equal(y.kind, 'inner'); assert.equal(y.school, 'palm');
  assert.equal(attrOf(artById('breath')), 'he');
});

test('loop191 每派（無名除外）都有普通弟子學得會的內功', () => {
  for (const [id, S] of Object.entries(SECTS)) {
    if (id === 'wuming') continue;
    const ids = [...new Set([...(S.tree || []), ...(S.tree24 || [])])];
    const ok = ids.map(artById).filter(ordinaryInner);
    assert.ok(ok.length, `${id} 沒有普通弟子可學的內功`);
  }
  assert.ok(WUMING_KIT24.wu.includes('breath'));
});

test('loop191 練滿本門樹可成三才（無名派無本門專屬，除外）', () => {
  for (const [id, S] of Object.entries(SECTS)) {
    if (id === 'wuming') continue;
    const ids = [...new Set([...(S.tree || []), ...(S.tree24 || [])])];
    const d = { v24: true, sectId: id, stree: ids, arts: {} };
    for (const artId of ids) d.arts[artId] = { xp: 60, last: 0 };
    assert.equal(sectClasses24(d), 3, id);
  }
});

test('loop191 非魁首武學的前置不可是魁首限定或秘密，且前置都存在', () => {
  for (const a of ARTS) for (const r of a.req || []) {
    assert.ok(artIds.has(r.art), `${a.id} 前置 ${r.art} 不在 ARTS`);
    const p = artById(r.art);
    if (!a.chiefOnly24) assert.ok(!p.chiefOnly24 && !p.secret, `${a.id} 前置了 ${r.art}`);
  }
});

test('loop191 每門武學都有 ART_CAT、合法屬性，招式不是懸空 id', () => {
  for (const a of ARTS) {
    assert.ok(ART_CAT[a.id], `${a.id} 缺 ART_CAT`);
    const at = attrOf(a);
    assert.ok(at === 'yin' || at === 'yang' || at === 'he' || at == null, `${a.id} attr ${at}`);
    if (at == null) assert.ok(!a.attr && !(a.tags || []).includes('剛') && !(a.tags || []).includes('柔'), `${a.id} 有陰陽標籤卻沒屬性`);
    if (a.tech) assert.ok(moveIds.has(a.tech), `${a.id} tech ${a.tech}`);
    for (const t of a.techs || []) if (!moveIds.has(t)) assert.ok(a.effect, `${a.id} 的「${t}」不在 MOVES，也不是內功／身法名目`);
  }
});

test('loop191 特質引用都在 TRAITS', () => {
  const ids = new Set();
  for (const [p, q] of [...OPPOSE, ...OPPOSE24, ...LIKES24]) { ids.add(p); ids.add(q); }
  for (const [k, vs] of Object.entries(LIKES)) { ids.add(k); for (const v of vs) ids.add(v); }
  for (const t of RECRUIT29.pool) ids.add(t);
  for (const t of TEMPER29.zheng) ids.add(t);
  for (const t of ids) assert.ok(TRAITS[t], t);
});

test('loop191 古墓弟子可排上玉女心經，不必是小龍女', () => {
  const ids = SECTS.gumu.tree.filter((id) => id !== 'yunv');
  const d = { id: 'disc', v24: true, sectId: 'gumu', stree: [...SECTS.gumu.tree], style: 'leg', wu: 4, personality: [], moves: ['fist'], arts: {}, focus: null, pendingArt: null };
  for (const id of ids) d.arts[id] = { xp: 100, last: 0, bt1: true, bt2: true };
  assert.equal(lockedArt24(d, artById('yunv')), false);
  assert.equal(yunvOpen24(d, artById('yunv')), true);
  assert.equal(artTier(d, 'tianluoPalm'), 4);
  gainArt(d, 1, 1, 0);
  assert.equal(d.pendingArt, 'yunv');
});
