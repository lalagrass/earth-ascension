import test from 'node:test';
import assert from 'node:assert/strict';
import { createState, canRecruit, canFoundHermitageSect, queueHermitageFounding, foundHermitageSect, setOrder, emergency, foodLow, scoreActs, skipsChores, tick } from '../../../src/sim.mjs';
import { artById, ownLineageArt, resolveSwing } from '../../../src/arts.mjs';
import { sectBiasMul, DAY } from '../../../src/data.mjs';
import { E as econOf, UPKEEP } from '../../../src/economy.mjs';
import { assignDiscipleHall, sectRecruit, pairedSwordPartner, pairedSwordArrival } from '../../../src/sect.mjs';
import { startMapBout, stepMapBout } from '../../../src/exp-map-combat.mjs';
import { affKey } from '../../../src/util.mjs';

const hermit = (partner = 'xiaolongnv', starterArt = 'chunyangFist') => createState(42, { kind: 'custom', answers: Array(9).fill(0), askMajor: true, hermitage: true, partner, starterArt });
const mapSwordDamage = (gap, partnerFights = true) => {
  const s = hermit(); s.ds[1].arts.tianluoPalm = { xp: 25 }; foundHermitageSect(s, 'dualHall'); s.t = 10;
  const h = s.ds.find(d => d.id === 'hero'), p = s.ds.find(d => d.id === 'xiaolongnv');
  h.arts.quanzhenSword = { xp: 25 }; p.arts.yunvSword = { xp: 25 };
  const owner = s.exp = { team: [h.id, p.id], n: 0, encN: 0 };
  const B = startMapBout(s, owner, 'bandit', { id: 'foot', from: 0, scale: 1 }, [h, p], [150, 100], [0, 100]);
  p.pos = [h.pos[0] + gap, h.pos[1]];
  if (!partnerFights) B.team = [h.id]; // 遠征名冊仍有伴侶，這一場實際交手沒有。
  B.foes[0].pos = [h.pos[0] + 25, h.pos[1]];
  h.swing = { move: 'qz1', target: B.foes[0].uid, at: s.t, wind: .4, range: 56, damage: 20, opening: null };
  h.cool = p.cool = B.foes[0].cool = s.t + 20;
  const before = B.foes[0].hp;
  stepMapBout(s, owner, .25, { rand: () => .5, guardOf: () => 1 });
  assert.equal(B.strikes[0]?.reaction, 'hit');
  return before - B.foes[0].hp;
};

test('R3 承接 Phase 7：第 1 日玩家可主動立匾，雙堂仍保留雙脈與十日俸期', () => {
  const s = hermit(), h = s.ds.find(d => d.id === 'hero'), p = s.ds.find(d => d.id === 'xiaolongnv');
  assert.equal(canRecruit(s).ok, false);
  assert.equal(canFoundHermitageSect(s).ok, true);
  assert.equal(s.choices.some(c => c.sect === 'hermitageFounding'), false, '未點擊前不自動跳出立匾卡');
  h.arts.quanzhenXinfa = { xp: 25 }; h.arts.jinyanStep = { xp: 25 }; p.awakeningStage = 2; p.arts.tianluoPalm = { xp: 25 };
  assert.equal(canFoundHermitageSect(s).ok, true);
  assert.equal(queueHermitageFounding(s).ok, true);
  assert.deepEqual(s.choices.find(c => c.sect === 'hermitageFounding').opts.length, 3);
  assert.equal(s.choices.find(c => c.sect === 'hermitageFounding').forcePrompt, true);
  s.day = 17; s.t = 16 * DAY;
  const rep = s.rep, result = foundHermitageSect(s, 'dualHall');
  assert.equal(result.ok, true); assert.equal(s.hermitage.active, false); assert.equal(s.hermitage.foundedDay, 17);
  assert.equal(s.sect.id, 'zhongnan'); assert.equal(s.sect.plaque, '終南山・雙劍山莊');
  assert.equal(econOf(s).graceUntil, 17 + UPKEEP.graceDay); assert.equal(s.rep, rep + 10);
  assert.equal(s.herbalDiet, true); assert.equal(s.choices.some(c => c.sect === 'hermitageFounding'), false);
  for (const id of ['chunyangFist', 'quanzhenXinfa', 'quanzhenSword', 'tianluoPalm', 'yunvJian', 'yunv']) {
    const a = artById(id); assert.equal(ownLineageArt(h, a), true, id); assert.equal(ownLineageArt(p, a), true, id);
    assert.equal(sectBiasMul(h, a)[1], 1, id);
  }
  const yin = { ...structuredClone(h), id: 'new-yin', wu: 5, root: 2, personality: ['gentle'], arts: {}, role: 'outer' };
  const yang = { ...structuredClone(h), id: 'new-yang', wu: 2, root: 5, personality: ['honest'], arts: {}, role: 'outer' };
  for (const [pupil, teacher] of [[yin, p], [yang, h]]) {
    s.aff[affKey(pupil.id, teacher.id)] = 30; s.aff[affKey(teacher.id, pupil.id)] = 30;
  }
  s.ds.push(yin, yang); sectRecruit(s, yin); sectRecruit(s, yang);
  assert.equal(yin.hall, 'yin'); assert.equal(yin.master, p.id); assert.equal(yang.hall, 'yang'); assert.equal(yang.master, h.id);
  assert.equal(s.sect.firstDiscipleId, yin.id);
  h.arts.quanzhenSword = { xp: 25 }; p.arts.yunvSword = { xp: 25 };
  h.pos = [100, 100]; p.pos = [124, 100];
  const target = { uid: 'foe', pos: [120, 100] };
  p.swing = { mv: 'ys1', tgt: target.uid, at: s.t + .4 };
  assert.equal(pairedSwordPartner(s, h, 'qz1', target, [h, p]), p);
  assert.equal(pairedSwordPartner(s, h, 'fist', target, [h, p]), null);
  p.pos = [110, 100]; assert.equal(pairedSwordPartner(s, h, 'qz1', target, [h, p]), null, '同一正面沒有夾角');
  p.pos = [124, 100];
  p.pos = [1100, 100]; assert.equal(pairedSwordPartner(s, h, 'qz1', target, [h, p]), null, '同隊但遠距不算並肩');
  p.pos = [124, 100]; assert.equal(pairedSwordPartner(s, h, 'qz1', target, [h]), null, '同隊名冊尚在但未實際參戰不合擊');
  p.downUntil = s.t + 1; assert.equal(pairedSwordPartner(s, h, 'qz1', target, [h, p]), null, '倒地者不能合擊');
  p.downUntil = 0;
  assert.equal(pairedSwordArrival(s, h, 'qz1', target, [h, p], s.t + .3) > s.t + .4, true, '第二劍等到同伴起手後的空檔');
  const soloDamage = mapSwordDamage(24, false);
  assert.ok(Math.abs(mapSwordDamage(24) - soloDamage) < 1e-9, '近身同場不再乘傷害倍率');
  assert.ok(Math.abs(mapSwordDamage(1000) - soloDamage) < 1e-9, '同隊遠距真傷害不變');
  h.skills.agility = 16; assert.equal(setOrder(s, h.id, 'cliffForage1'), true);
});

test('R5 第二劍只借收招時間窗，對練縮短跟進間隔，超出空檔仍可格擋', () => {
  const s = hermit(); s.ds[1].arts.tianluoPalm = { xp: 25 }; foundHermitageSect(s, 'dualHall'); s.t = 10;
  const [h, p] = s.ds, owner = { team: [h.id, p.id], n: 0, encN: 0 };
  const bout = startMapBout(s, owner, 'bandit', { id: 'foot', from: 0, scale: 1 }, [h, p], [150, 100], [0, 100]);
  const foe = bout.foes[0]; h.pos = [100, 100]; p.pos = [124, 100]; foe.pos = [120, 100];
  p.swing = { mv: 'ys1', tgt: foe.uid, at: s.t + .2 };
  const arrival = pairedSwordArrival(s, h, 'qz1', foe, [h, p], s.t + .1);
  assert.ok(arrival > p.swing.at, '第二劍須等第一劍落下');
  s.mem = [{ k: 'spar', a: h.id, b: p.id }];
  const practiced = pairedSwordArrival(s, h, 'qz1', foe, [h, p], s.t + .1);
  assert.ok(practiced > p.swing.at && practiced < arrival, '真對練縮短跟進延遲');
  const blocked = structuredClone(foe), inGap = structuredClone(foe);
  blocked.busyUntil = s.t; inGap.busyUntil = s.t + .2;
  assert.equal(resolveSwing(s, h, blocked, () => .01, { move: 'qz1', wind: .4, map: true }).kind, 'parry');
  assert.equal(resolveSwing(s, h, inGap, () => .01, { move: 'qz1', wind: .4, map: true }).kind, 'hit');
});

test('Phase 7：正宗立匾只讓掌門、伴侶、首徒使用秘傳；無名派可自訂匾', () => {
  const s = hermit(); const h = s.ds.find(d => d.id === 'hero'), p = s.ds.find(d => d.id === 'xiaolongnv');
  p.arts.tianluoPalm = { xp: 25 };
  assert.equal(foundHermitageSect(s, 'orthodox', { banner: 'partner', plaque: '古墓新脈' }).ok, true);
  assert.equal(s.sect.id, 'gumu'); assert.equal(s.sect.plaque, '古墓新脈');
  assert.ok(s.sect.secretLineage.includes('quanzhenXinfa'));
  assert.equal(ownLineageArt(h, artById('quanzhenXinfa')), true);
  const first = { ...structuredClone(h), id: 'first', arts: {}, role: 'outer', personality: [] };
  const later = { ...structuredClone(h), id: 'later', arts: {}, role: 'outer', personality: [] };
  s.ds.push(first, later); sectRecruit(s, first); sectRecruit(s, later);
  assert.equal(ownLineageArt(first, artById('quanzhenXinfa')), true);
  assert.equal(ownLineageArt(later, artById('quanzhenXinfa')), false);
  assert.equal(sectBiasMul(later, artById('quanzhenXinfa'))[1] < 1, true);
  assert.equal(ownLineageArt(later, artById('yunvJian')), true);
  assert.equal(p.hall, 'yin');
  const w = hermit('huangrong', 'luohanHands'); w.ds[1].arts.luoyingPalm = { xp: 25 };
  assert.equal(foundHermitageSect(w, 'dualHall').sect.id, 'longrong');
  const n = hermit(); assert.equal(foundHermitageSect(n, 'wuming', '山林自創派').sect.plaque, '山林自創派');
  assert.equal(n.sect.id, 'wuming');
  const post = hermit(); assert.equal(foundHermitageSect(post).ok, true);
  const hero = post.ds[0], outer = { ...structuredClone(hero), id: 'outer-a', role: 'outer', task: null, order: null, path: [], needs: { ...hero.needs, hunger: 95 } };
  post.ds.push(outer, { ...structuredClone(outer), id: 'outer-b' });
  post.res.food = 0; post.res.veg = 0; post.res.medFood = 8; post.mons = []; post.emergency = false;
  assert.equal(post.hermitage.active, false); assert.equal(post.herbalDiet, true);
  assert.equal(emergency(post), false); assert.equal(foodLow(post), false); assert.equal(skipsChores(post, hero), true);
  assert.notEqual(scoreActs(post, hero).find((a) => a.act === 'farm')?.why, '存糧見底，先顧菜畦');
  tick(post); assert.equal(post.emergency, false); assert.equal(post.log.some((entry) => entry.msg.includes('斷糧了')), false);
});
