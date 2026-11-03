/* #403 武學卡：同火候名功更強、悟性不改出手、前置比例、舊檔讀入現行規則、絕招按火候開。
   #404 六門絕活：打中、讓過、挨打各走武學上的 on，不靠武學 id。
   #408 扇形曲線：入門與小成先收斂，化境才拉開。 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { ARTS, MOVES, RULES_VERSION, DUGU } from '../src/data.mjs';
import { artById, artTier, moveMul, gainArt, learnArt, openSpecials, unlockTechs, applyArtOn, artNoParry, qiOf, qiMax, ART_ON_EVENTS, restQi, jiuyangEase, innerOnHit, innerOnGetHit, preferInner29, blowWhy, boutWhy, expCause, expectOf, EXPECT_SWINGS, reqMissing, zhuangOpen, ponderLuoying, practiceLuoying, YUNV_PAIR } from '../src/arts.mjs';
import { powerHtml } from '../src/panel-ui.mjs';
import { curveMulOf } from '../src/artcard.mjs';
import { createState, load } from '../src/sim.mjs';
import { points, T, raidResolve, threatDaily, threatBreakdown } from '../src/threat.mjs';
import { teach, TEACH, formReady } from '../src/wuxia.mjs';
import { CARDS, jhStep } from '../src/jianghu.mjs';

const hero = () => createState(3).ds.find((d) => d.id === 'hero');

test('每門都有五檔曲線；沒點名的武學與風雷掌腿同一條', () => {
  for (const a of ARTS) {
    assert.equal(a.curve?.length, 5, a.id);
    assert.equal(typeof a.growCap, 'number', a.id);
    assert.ok(Array.isArray(a.learn?.req), a.id);
  }
  assert.equal(artById('rulai').fanTier, '絕頂');
  assert.equal(artById('bagua').fanTier, '名門');
  assert.equal(artById('tiexian').fanTier, '名門');
  assert.equal(artById('tantui').fanTier, '常見');
  assert.ok(curveMulOf(artById('xianglong').curve, 4) > curveMulOf(artById('rulai').curve, 4));
  assert.equal(artById('dagou').fanTier, '一流');
  assert.equal(artById('qiankun').fanTier, '名門');
  assert.ok(curveMulOf(artById('xianglong').curve, 2) > curveMulOf(artById('fengLei').curve, 2));
});

test('常見段化境倍率落在 1.4–1.8', () => {
  const common = ARTS.filter((a) => a.fanTier === '常見' && a.bestDps > 0);
  const mid = common.find((a) => Math.abs(a.bestDps - 9.0) < 0.01);
  assert.ok(mid, '需有中位數武學');
  const mul = curveMulOf(mid.curve, 4) / mid.bestDps;
  assert.ok(mul >= 1.4 && mul <= 1.8, `化境倍率 ${mul} 應落在 1.4–1.8`);
});

test('同段入門、小成倍率相同；化境絕頂對入門在四到五倍', () => {
  const live = ARTS.filter((a) => !a.deprecated);
  const c0 = live[0].curve[0], c1 = live[0].curve[1];
  for (const a of live) {
    assert.ok(Math.abs(a.curve[0] - c0) < 1e-6, a.id);
    assert.ok(Math.abs(a.curve[1] - c1) < 1e-6, a.id);
  }
  const top = artById('bixie'), ru = artById('basicFist');
  assert.ok(Math.abs(top.curve[0] - ru.curve[0]) < 1e-6);
  assert.ok(Math.abs(top.curve[1] - ru.curve[1]) < 1e-6);
  const base = 3.5 / 0.8;
  assert.ok(base >= 4 && base <= 5, base);
  const mid = artById('xianglong').curve[4] / ru.curve[4];
  assert.ok(mid >= 4 && mid <= 5, mid);
});

test('同火候，降龍十八掌比同品的風雷掌腿更痛；改悟性或初學標記不改出手', () => {
  const d = hero();
  d.qi = 0;
  d.arts.xianglong = { xp: 55, last: 0, bt1: true };
  d.arts.fengLei = { xp: 55, last: 0, bt1: true };
  assert.equal(artById('xianglong').grade, artById('fengLei').grade);
  const bite = (id) => { const mv = MOVES.find((m) => m.id === id); return (mv.dmg / mv.cd) * moveMul(d, id); };
  assert.ok(bite('jianlong') > bite('storm'));
  d.wu = 1;
  const low = moveMul(d, 'jianlong');
  d.wu = 5;
  const high = moveMul(d, 'jianlong');
  assert.equal(low, high);
  d.early = { art: 'xianglong', mul: 1.35 };
  assert.equal(moveMul(d, 'jianlong'), high);
});

test('太極劍練功不得高過太極拳；沒有太極拳就不漲；劇情給更高的熟練不會被砍掉', () => {
  const d = hero();
  d.arts.taiji = { xp: 40, last: 0 };
  d.arts.taijiSword = { xp: 10, last: 0 };
  d.focus = 'taijiSword';
  for (let i = 0; i < 40; i++) gainArt(d, 40, 1, 0, { raw: 40, src: 'train' });
  assert.ok(d.arts.taijiSword.xp > 10);
  assert.ok(d.arts.taijiSword.xp <= 40);

  d.arts.taijiSword.xp = 10;
  delete d.arts.taiji;
  const before = d.arts.taijiSword.xp;
  gainArt(d, 40, 1, 0, { raw: 40, src: 'train' });
  assert.equal(d.arts.taijiSword.xp, before);

  d.arts.taiji = { xp: 0, last: 0 };
  d.arts.taijiSword = { xp: 56, last: 0, bt1: true };
  gainArt(d, 40, 1, 0, { raw: 40, src: 'train' });
  assert.equal(d.arts.taijiSword.xp, 56);
});

test('大成開第一招，化境招還沒開', () => {
  const d = hero();
  d.moves = d.moves.filter((m) => !['jianlong', 'feilong', 'kanglong'].includes(m));
  d.arts.xianglong = { xp: 55, last: 0, bt1: true };
  const open = openSpecials(d, 'xianglong').map((sp) => sp.tier);
  assert.deepEqual(open, [2]);
  const got = unlockTechs(d, artById('xianglong'));
  assert.deepEqual(got, ['jianlong']);
  assert.ok(!d.moves.includes('kanglong'));
});

test('洪七公三段傳功給三招，已傳的招不受火候限制', () => {
  const s = createState(3);
  const d = s.ds.find((x) => x.id === 'hero');
  d.moves = d.moves.filter((m) => !['jianlong', 'feilong', 'kanglong'].includes(m));
  teach(s, d, 'xianglong', TEACH.xp[2], artById('xianglong').techs.slice(0, 3));
  assert.ok(artTier(d, 'xianglong') < 4);
  assert.ok(d.moves.includes('jianlong'));
  assert.ok(d.moves.includes('feilong'));
  assert.ok(d.moves.includes('kanglong'));
});

test('六門絕活各自觸發；內力不夠就不發動；沒看破的獨孤仍然格擋', () => {
  const s = createState(3);
  const d = s.ds.find((x) => x.id === 'hero');
  d.arts.breath = { xp: 85, last: 0, bt1: true };
  d.arts.xianglong = { xp: 55, last: 0, bt1: true };
  d.qi = 80;
  const qi0 = qiOf(d);
  assert.ok(qi0 >= 16, qi0);
  assert.equal(artById('xianglong').on.hit.qi, 16);
  assert.ok(artById('rulai').on?.hit);
  assert.equal(artById('rulai').on.hit.qi, 20);
  assert.deepEqual(ART_ON_EVENTS, ['hit', 'block', 'dodge', 'crit', 'gethit', 'kill']);

  const near = (a, b) => Math.abs(a - b) < 1e-6;
  const foe = () => ({ hp: 40, pos: [10, 0], cool: 0 });
  const xl = applyArtOn(s, 'hit', d, foe(), { power: 10, move: 'jianlong' });
  assert.equal(xl.fired.art, 'xianglong');
  assert.ok(near(xl.power, 14), xl.power);
  assert.equal(xl.knock, 22);
  assert.ok(near(qi0 - qiOf(d), 16), qiOf(d));
  assert.match(s.log[0].msg, /震得對手退了一步/);
  assert.equal(s.log[0].tier, 'mid');
  d.qi = 0;
  const dry = applyArtOn(s, 'hit', d, foe(), { power: 10, move: 'jianlong' });
  assert.equal(dry.fired, null);
  assert.equal(dry.power, 10);
  assert.equal(dry.dry, true);

  d.qi = 80;
  d.dugu = ['dg0'];
  d.arts.dugu = { xp: 12, last: 0 };
  const seen = applyArtOn(s, 'dodge', d, null, {});
  assert.equal(seen.fired.art, 'dugu');
  assert.equal(seen.see, true);
  assert.equal(artNoParry(d), true);
  assert.match(seen.line, /自己不擋/);
  const br = applyArtOn(s, 'hit', d, foe(), { power: 10, move: 'dg0' });
  assert.equal(br.fired.art, 'dugu');
  assert.ok(near(br.power, 12), br.power);
  d.dugu = [];
  assert.equal(artNoParry(d), false);
  assert.equal(applyArtOn(s, 'dodge', d, null, {}).fired, null);

  d.arts.bixie = { xp: 55, last: 0, bt1: true };
  const mob = foe();
  const bx = applyArtOn(s, 'hit', d, mob, { power: 10, move: 'bx1' });
  assert.equal(bx.fired.art, 'bixie');
  assert.ok(near(bx.power, 20), bx.power);
  assert.match(bx.line, /連刺/);
  const bx2 = applyArtOn(s, 'hit', d, mob, { power: 10, move: 'bx1' });
  assert.equal(bx2.fired, null);
  assert.equal(bx2.power, 10);

  d.arts.taijiSword = { xp: 55, last: 0, bt1: true };
  const tj = applyArtOn(s, 'gethit', d, foe(), { dmg: 10 });
  assert.equal(tj.fired.art, 'taijiSword');
  assert.equal(tj.reflect, 0.45);
  assert.match(tj.line, /反震/);

  d.hp = 80;
  d.arts.qishangFist = { xp: 55, last: 0, bt1: true };
  const qs = applyArtOn(s, 'hit', d, foe(), { power: 10, move: 'qs1' });
  assert.equal(qs.fired.art, 'qishangFist');
  assert.ok(near(qs.power, 12), qs.power);
  assert.equal(d.hp, 74);
  assert.match(qs.line, /內腑/);

  const qiDog = qiOf(d);
  d.arts.dagou = { xp: 55, last: 0, bt1: true };
  const dg = applyArtOn(s, 'hit', d, foe(), { power: 10, move: 'banzi' });
  assert.equal(dg.fired.art, 'dagou');
  assert.equal(dg.trip, 1.2);
  assert.ok(qiOf(d) <= qiDog - 4);
  assert.match(dg.line, /絆/);

  const quiet = applyArtOn(s, 'crit', d, foe(), { power: 10, move: 'fist' });
  assert.equal(quiet.fired, null);
  assert.equal(applyArtOn(s, 'block', d, foe(), { dmg: 4 }).fired, null);
  assert.equal(applyArtOn(s, 'kill', d, foe(), { move: 'fist' }).fired, null);
  assert.equal(applyArtOn(s, 'hit', d, foe(), { power: 10, move: 'fist' }).fired, null);
});

test('六門內功被動各自生效；性格挑不同的內功', () => {
  const plain = { ng: 1, arts: {}, personality: [], wu: 3 };
  const breath = { ng: 1, arts: { breath: { xp: 1, last: 0 } }, personality: [], wu: 3 };
  assert.ok(Math.abs(restQi(breath) / restQi(plain) - 1.5) < 1e-9);

  const s = createState(3);
  const d = s.ds.find((x) => x.id === 'hero');
  d.qiInjury = 10;
  d.arts.jiuyang = { xp: 30, last: 0 };
  assert.equal(jiuyangEase(d, 10), 0);
  d.arts.jiuyang.xp = 55; d.arts.jiuyang.bt1 = true;
  assert.ok(Math.abs(jiuyangEase(d, 10) - 0.2) < 1e-9);

  d.hp = 40; d.qi = 10;
  d.arts.wudangJiuyang = { xp: 55, last: 0, bt1: true };
  assert.equal(innerOnGetHit(s, d).hp, 0);
  d.arts.wudangJiuyang.xp = 85;
  const back = innerOnGetHit(s, d);
  assert.equal(back.hp, 1);
  assert.equal(d.hp, 41);
  assert.ok(qiOf(d) >= 12);

  d.hp = 50; d.qi = 40;
  d.arts.zixia = { xp: 55, last: 0, bt1: true };
  const zx = innerOnHit(s, d, { qi: 0 }, { power: 10, move: 'tjs1' });
  assert.ok(Math.abs(zx.power - 10.5) < 1e-6);
  assert.equal(zx.heal, 2);
  assert.equal(d.hp, 52);
  assert.match(zx.line, /補了一口氣/);

  d.arts.huagongDafa = { xp: 25, last: 0 };
  const foe = { qi: 10 };
  const hg = innerOnHit(s, d, foe, { power: 10, move: 'tjs1' });
  assert.equal(hg.steal, 3);
  assert.equal(foe.qi, 7);
  assert.equal(hg.power, 10);
  assert.equal(hg.heal, 0);
  assert.match(hg.line, /吸走一點內力/);

  delete d.arts.huagongDafa;
  d.qi = 80;
  d.arts.xianglong = { xp: 55, last: 0, bt1: true };
  d.arts.huntianGong = { xp: 25, last: 0 };
  const palm = applyArtOn(s, 'hit', d, { hp: 20 }, { power: 10, move: 'jianlong' });
  const ht = innerOnHit(s, d, { qi: 0 }, { power: palm.power, move: 'jianlong', fired: palm.fired });
  assert.equal(ht.huntian, true);
  assert.match(ht.line, /仍震得開/);
  delete d.arts.huntianGong;
  const bare = innerOnHit(s, d, { qi: 0 }, { power: palm.power, move: 'jianlong', fired: palm.fired });
  assert.equal(bare.huntian, false);

  const mind = {
    v24: true, wu: 3, sectId: 'wudang', stree: ['breath'], values: {}, pairMul: 0, small29: false,
    arts: {
      breath: { xp: 10, last: 0 }, zixia: { xp: 10, last: 0 },
      jiuyang: { xp: 40, last: 0 }, huagongDafa: { xp: 10, last: 0 },
    },
  };
  mind.personality = ['honest']; assert.equal(preferInner29(mind), 'breath');
  mind.personality = ['bold']; assert.equal(preferInner29(mind), 'huagongDafa');
  mind.personality = ['clever']; assert.equal(preferInner29(mind), 'jiuyang');
  mind.personality = ['quiet']; mind.small29 = true; assert.equal(preferInner29(mind), 'zixia');
});

test('戰報與人物面板用一句話說主因，不列係數', () => {
  const d = hero();
  d.ng = 1;
  d.arts.breath = { xp: 85, last: 0, bt1: true };
  d.qi = 80;
  d.arts.xianglong = { xp: 55, last: 0, bt1: true };
  const palm = blowWhy(d);
  assert.match(palm, /降龍/);
  assert.match(palm, /震退/);
  assert.doesNotMatch(palm, /×|\d/);
  d.qi = 0;
  assert.match(blowWhy(d), /內力見底/);
  const mul = moveMul(d, 'jianlong');
  d.wu = 1;
  assert.equal(moveMul(d, 'jianlong'), mul);
  d.qi = 80;
  delete d.arts.xianglong;
  d.dugu = ['dg0'];
  d.arts.dugu = { xp: 12, last: 0 };
  const seen = blowWhy(d);
  assert.match(seen, /看破/);
  assert.match(seen, /不擋/);
  assert.doesNotMatch(seen, /×|\d|辟邪|破招/);
  const html = powerHtml(d, {}, 1, 0);
  const line = html.match(/data-blow-why="1">([^<]*)</)[1];
  assert.equal(line, seen);
  assert.match(boutWhy(['xianglong']), /降龍震退/);
  assert.match(boutWhy(['bixie']), /快劍/);
  assert.doesNotMatch(boutWhy(['bixie', 'dry']), /辟邪|破招|×|\d/);
  assert.match(boutWhy(['dry']), /內力見底/);
  assert.match(boutWhy([]), /沒有絕活/);
  assert.match(expCause([{ hp: 20, qi: 0, ng: 1, arts: {} }], '某人氣血低於 40%'), /內力見底/);
  assert.match(expCause([], '走完山門'), /沒有打出絕活/);
  assert.doesNotMatch(expCause([], '被守關擋在山腳'), /×|\d/);
});

test('絕活期望進每秒傷害：降龍有內力才加重，辟邪先手攤進數下，七傷扣自己的氣血', () => {
  const d = hero();
  d.ng = 1;
  d.arts.breath = { xp: 85, last: 0, bt1: true };
  d.qi = 80;
  d.arts.xianglong = { xp: 55, last: 0, bt1: true };
  const wet = expectOf(d, MOVES.find((m) => m.id === 'jianlong'), 0);
  assert.ok(Math.abs(wet.mul - 1.4) < 1e-9, wet.mul);
  d.qi = 0;
  assert.equal(expectOf(d, MOVES.find((m) => m.id === 'jianlong'), 0).mul, 1);
  d.qi = 80;
  d.arts.bixie = { xp: 55, last: 0, bt1: true };
  const bx = expectOf(d, MOVES.find((m) => m.id === 'bx1'), 0);
  assert.ok(Math.abs(bx.mul - (1 + (2 - 1) / EXPECT_SWINGS)) < 1e-9, bx.mul);
  d.arts.qishangFist = { xp: 55, last: 0, bt1: true };
  const qs = expectOf(d, MOVES.find((m) => m.id === 'qs1'), 0);
  assert.ok(Math.abs(qs.mul - 1.2) < 1e-9, qs.mul);
  assert.ok(qs.selfPerSec > 0);
});

test('拜師關卡擋得住；劍掌五連環要兩門都到大成', () => {
  const d = hero();
  const miss = (id) => reqMissing(d, artById(id));
  d.sectId = 'qizong';
  d.arts.huashanXinfa = { xp: 25, last: 0 };
  d.arts.pishiFist = { xp: 25, last: 0 };
  d.arts.basicSword = { xp: 25, last: 0 };
  d.arts.huashanSword = { xp: 55, last: 0, bt1: true };
  assert.ok(miss('sanxianSword').some((s) => s.includes('混元掌')));
  assert.ok(miss('yangwu').some((s) => s.includes('混元掌')));
  assert.ok(miss('taiyue').some((s) => s.includes('混元掌')));
  assert.ok(miss('wulian').length);
  d.arts.hunyuanPalm = { xp: 25, last: 0 };
  assert.equal(miss('sanxianSword').length, 0);
  assert.equal(miss('yangwu').length, 0);
  assert.equal(miss('taiyue').length, 0);
  assert.ok(miss('wulian').some((s) => s.includes('混元掌')));
  d.arts.hunyuanPalm.xp = 55;
  assert.equal(miss('wulian').length, 0);
  d.arts.huashanSword.xp = 25;
  assert.ok(miss('wulian').some((s) => s.includes('華山劍法')));

  d.sectId = 'jianzong';
  d.arts.huashanSword.xp = 55;
  assert.ok(miss('kuangfengSword').some((s) => s.includes('劍宗心法')));
  d.arts.jianzongXinfa = { xp: 25, last: 0 };
  assert.equal(miss('kuangfengSword').length, 0);
  d.arts.hunyuanPalm.xp = 20;
  assert.ok(miss('wulian').some((s) => s.includes('混元掌')));

  d.sectId = 'mingjiao';
  d.arts.yingzhuaHand = { xp: 25, last: 0 };
  assert.equal(miss('lieyanBlade').length, 0);
  assert.equal(miss('hanbingMian').length, 0);
  assert.equal(miss('feihua').length, 0);
  assert.ok(miss('guangmingGong').some((s) => s.includes('聖火心法')));
  assert.ok(miss('shenghuoLing').length);
  assert.ok(miss('datengnuo').length);
  d.arts.shenghuoXinfa = { xp: 25, last: 0 };
  d.arts.qingfuStep = { xp: 25, last: 0 };
  assert.equal(miss('guangmingGong').length, 0);
  assert.equal(miss('shenghuoLing').length, 0);
  assert.equal(miss('datengnuo').length, 0);
});

test('太極爪與玄虛刀不得高過太極拳；臨濟按火候開莊；落英要先看出掌路；百花第三招在大成開', () => {
  const d = hero();
  d.arts.taiji = { xp: 40, last: 0 };
  d.arts.taijiClaw = { xp: 10, last: 0 };
  d.focus = 'taijiClaw';
  for (let i = 0; i < 40; i++) gainArt(d, 40, 1, 0, { raw: 40, src: 'train' });
  assert.ok(d.arts.taijiClaw.xp > 10);
  assert.ok(d.arts.taijiClaw.xp <= 40);
  delete d.arts.taiji;
  const claw = d.arts.taijiClaw.xp;
  gainArt(d, 40, 1, 0, { raw: 40, src: 'train' });
  assert.equal(d.arts.taijiClaw.xp, claw);
  d.arts.taiji = { xp: 30, last: 0 };
  d.arts.xuanxuBlade = { xp: 10, last: 0 };
  d.focus = 'xuanxuBlade';
  for (let i = 0; i < 40; i++) gainArt(d, 40, 1, 0, { raw: 40, src: 'train' });
  assert.ok(d.arts.xuanxuBlade.xp > 10);
  assert.ok(d.arts.xuanxuBlade.xp <= 30);

  assert.deepEqual(zhuangOpen(d), []);
  learnArt(d, 'linjiZhuang', 0);
  const counts = [1, 2, 3, 5, 6];
  [0, 25, 55, 85, 100].forEach((xp, i) => { d.arts.linjiZhuang.xp = xp; assert.equal(zhuangOpen(d).length, counts[i], xp); });
  assert.equal(zhuangOpen(d)[0], '天字莊');
  assert.equal(zhuangOpen(d)[5], '宙字莊');

  const peach = hero();
  assert.equal(ponderLuoying(peach), false);
  peach.sectId = 'taohua';
  peach.arts.biboXinfa = { xp: 24, last: 0 };
  assert.equal(ponderLuoying(peach), false);
  assert.equal(practiceLuoying(peach, 1), false);
  assert.equal(peach.arts.luoyingPalm, undefined);
  peach.arts.biboXinfa.xp = 25;
  assert.equal(ponderLuoying(peach), true);
  assert.equal(ponderLuoying(peach), false);
  assert.equal(practiceLuoying(peach, 2), true);
  assert.ok(peach.arts.luoyingPalm);
  assert.equal(practiceLuoying(peach, 3), false);

  const hui = hero();
  hui.moves = hui.moves.filter((m) => m !== 'bh3' && m !== 'yl3');
  learnArt(hui, 'baihuaFist', 0);
  hui.arts.baihuaFist.xp = 30;
  unlockTechs(hui, artById('baihuaFist'));
  assert.ok(!hui.moves.includes('bh3'));
  hui.arts.baihuaFist.xp = 55;
  unlockTechs(hui, artById('baihuaFist'));
  assert.ok(hui.moves.includes('bh3'));
  learnArt(hui, 'yunlongSword', 0);
  hui.arts.yunlongSword.xp = 30;
  unlockTechs(hui, artById('yunlongSword'));
  assert.ok(!hui.moves.includes('yl3'));
  hui.arts.yunlongSword.xp = 55;
  unlockTechs(hui, artById('yunlongSword'));
  assert.ok(hui.moves.includes('yl3'));

  assert.equal(artById('wulian').fanR, 1);
  assert.deepEqual(artById('wulian').curve, artById('fengLei').curve);
  assert.equal(artById('tanzhi').fanTier, '常見');
  assert.equal(artById('guangmingGong').fanR, 1);
});

test('第二批絕活與內功被動各自觸發；乾坤只開第一層；觀破不靠火候發招', () => {
  const s = createState(3);
  const d = s.ds.find((x) => x.id === 'hero');
  d.ng = 1;
  d.arts.breath = { xp: 85, last: 0, bt1: true };
  d.qi = qiMax(d);
  d.hp = 80;
  d.values = { ...(d.values || {}), xia: 20 };
  const near = (a, b) => Math.abs(a - b) < 1e-6;
  const foe = () => ({ hp: 40, pos: [10, 0], cool: 0 });
  const mv = (id) => MOVES.find((m) => m.id === id);

  d.arts.xuantie = { xp: 20, last: 0 };
  assert.equal(applyArtOn(s, 'hit', d, foe(), { power: 10, move: 'xt1' }).fired, null);
  d.arts.xuantie.xp = 55;
  d.arts.xuantie.bt1 = true;
  const xt = applyArtOn(s, 'hit', d, foe(), { power: 10, move: 'xt1' });
  assert.equal(xt.fired.art, 'xuantie');
  assert.equal(xt.breakParry, true);
  assert.ok(near(xt.power, 10 * artById('xuantie').on.hit.dmg));
  assert.ok(near(expectOf(d, mv('xt1')).mul, artById('xuantie').on.hit.dmg));
  assert.match(blowWhy({ ...d, focus: 'xuantie', qi: d.qi, ng: 1, arts: { xuantie: d.arts.xuantie, breath: d.arts.breath } }), /招架/);

  d.arts.anran = { xp: 55, last: 0, bt1: true };
  d.mood = 10;
  const ar = applyArtOn(s, 'hit', d, foe(), { power: 10, move: 'ar1' });
  assert.equal(ar.fired.art, 'anran');
  assert.equal(ar.power, 10);
  assert.equal(expectOf(d, mv('ar1')).mul, 1);
  jhStep(s, 0.25);
  const low = d.jhMul;
  d.mood = 90;
  jhStep(s, 0.25);
  assert.ok(low > d.jhMul);
  assert.equal(expectOf(d, mv('ar1')).mul, 1);

  d.hp = 80;
  d.qi = qiMax(d);
  d.arts.hama = { xp: 55, last: 0, bt1: true };
  assert.equal(applyArtOn(s, 'hit', d, foe(), { power: 10, move: 'hm1' }).fired, null);
  d.hp = 40;
  const hm = applyArtOn(s, 'hit', d, foe(), { power: 10, move: 'hm1' });
  assert.equal(hm.fired.art, 'hama');
  assert.ok(near(hm.power, 15));
  assert.ok(qiOf(d) < qiMax(d));
  d.qi = qiMax(d);
  assert.ok(near(expectOf(d, mv('hm1')).mul, 1.5));
  d.hp = 80;
  assert.equal(expectOf(d, mv('hm1')).mul, 1);

  d.arts.qiankun = { xp: 1, last: 0 };
  const qk = applyArtOn(s, 'gethit', d, foe(), { dmg: 20 });
  const qfx = artById('qiankun').on.gethit;
  assert.equal(qk.fired.art, 'qiankun');
  assert.equal(qk.reflect, qfx.reflect);
  assert.ok(near(qk.dmg, 20 * (1 - qfx.shift)));
  assert.equal(d.reflect, undefined);
  assert.equal(expectOf(d, mv('qk1')).reflect, qfx.reflect);

  const x0 = d.values.xia;
  d.arts.jiuyinClaw = { xp: 55, last: 0, bt1: true };
  const jy = applyArtOn(s, 'hit', d, foe(), { power: 10, move: 'jy1' });
  assert.equal(jy.fired.art, 'jiuyinClaw');
  assert.equal(jy.breakGuard, true);
  assert.ok(d.values.xia < x0);
  assert.match(jy.line, /俠義/);
  assert.doesNotMatch(jy.line, /×|\d/);
  assert.ok(near(expectOf(d, mv('jy1')).mul, artById('jiuyinClaw').on.hit.dmg));

  d.arts.yuxiaoSword = { xp: 55, last: 0, bt1: true };
  const yx = applyArtOn(s, 'hit', d, foe(), { power: 10, move: 'yx1' });
  assert.equal(yx.fired.art, 'yuxiaoSword');
  assert.equal(yx.disturb, artById('yuxiaoSword').on.hit.disturb);
  assert.equal(yx.trip, 0);
  assert.match(yx.line, /簫/);
  d.focus = 'yuxiaoSword';
  assert.match(blowWhy(d), /簫/);
  assert.doesNotMatch(blowWhy(d), /×|\d/);

  const ally = s.ds.find((x) => x.id !== 'hero');
  ally.arts ??= {};
  ally.arts.yunv = { xp: 25, last: 0 };
  ally.away = false;
  ally.hp = 80;
  d.arts.yunv = { xp: 55, last: 0, bt1: true };
  const yv = innerOnHit(s, d, { qi: 0 }, { power: 10, move: 'yn1' });
  assert.ok(near(yv.power, 10 * YUNV_PAIR));
  d.yunvLink = true;
  assert.ok(near(expectOf(d, mv('yn1')).mul, YUNV_PAIR));
  delete ally.arts.yunv;
  assert.equal(innerOnHit(s, d, { qi: 0 }, { power: 10, move: 'yn1' }).power, 10);

  d.qi = 10;
  d.arts.biboXinfa = { xp: 25, last: 0 };
  const bb = innerOnHit(s, d, { qi: 0 }, { power: 10, move: 'fist' });
  assert.equal(bb.bibo, true);
  assert.ok(qiOf(d) > 10);
  delete d.arts.biboXinfa;

  d.qi = 10;
  d.arts.emeiJiuyang = { xp: 12, last: 0 };
  assert.equal(innerOnHit(s, d, { qi: 0 }, { power: 10, move: 'fist' }).emei, undefined);
  d.arts.emeiJiuyang.xp = 25;
  const em = innerOnHit(s, d, { qi: 0 }, { power: 10, move: 'fist' });
  assert.equal(em.emei, true);
  assert.match(em.line, /峨眉九陽/);

  d.hp = 40;
  d.arts.linjiZhuang = { xp: 55, last: 0, bt1: true };
  const lj = innerOnGetHit(s, d);
  assert.equal(lj.zhuang, zhuangOpen(d).length);
  assert.equal(lj.zhuang, 3);
  assert.equal(d.hp, 43);
  assert.match(lj.line, /臨濟/);
  assert.doesNotMatch(lj.line, /×|\d/);

  const zw = createState(4, { kind: 'template', id: 'zhangwuji', askMajor: false });
  const z = zw.ds.find((x) => x.id === 'hero');
  CARDS.zwj3.opts[0][1](zw);
  assert.equal(artTier(z, 'qiankun'), 0);
  assert.ok(z.arts.qiankun.xp < 25);
  assert.equal(z.reflect, undefined);
  z.arts.jiuyang = { xp: 40, last: 0 };
  z.focus = 'qiankun';
  for (let i = 0; i < 30; i++) gainArt(z, 40, 1, 0, { raw: 40, src: 'train' });
  assert.ok(z.arts.qiankun.xp > 1);
  assert.ok(z.arts.qiankun.xp <= 40);
  const held = z.arts.qiankun.xp;
  z.arts.qiankun.xp = 56;
  z.arts.qiankun.bt1 = true;
  gainArt(z, 40, 1, 0, { raw: 40, src: 'train' });
  assert.equal(z.arts.qiankun.xp, 56);
  delete z.arts.jiuyang;
  delete z.arts.shenghuoXinfa;
  z.arts.qiankun.xp = held;
  gainArt(z, 40, 1, 0, { raw: 40, src: 'train' });
  assert.equal(z.arts.qiankun.xp, held);

  const form = (id) => DUGU.find((f) => f.id === id);
  assert.equal(form('dg0').need, 0);
  assert.equal(form('dg1').need, 30);
  assert.equal(form('dg7').need, 30);
  assert.equal(form('dg6').need, 45);
  assert.equal(form('dg8').need, 60);
  assert.equal(form('dg9').need, 100);
  d.dugu = ['dg0'];
  d.arts.dugu = { xp: 100, last: 0, bt1: true, bt2: true };
  s.codex.peakguard = { insight: 80 };
  assert.equal(formReady(s, d, form('dg9')), false);
  s.codex.peakguard.insight = 100;
  assert.equal(formReady(s, d, form('dg9')), true);
  const moves = d.moves.slice();
  assert.deepEqual(unlockTechs(d, artById('dugu')), []);
  assert.deepEqual(d.moves, moves);
  assert.ok(!d.moves.includes('dg9'));
});

test('豬籠城寨四門絕活各自生效：如來神掌震退、譚腿踢亂下盤、鐵線拳破架、八卦棍逼退', () => {
  const s = createState(3);
  const d = s.ds.find((x) => x.id === 'hero');
  d.arts.breath = { xp: 85, last: 0, bt1: true };
  d.qi = 80;
  const foe = () => ({ hp: 40, pos: [10, 0], cool: 0 });

  d.arts.rulai = { xp: 55, last: 0, bt1: true };
  const ru = applyArtOn(s, 'hit', d, foe(), { power: 10, move: 'rulai' });
  assert.equal(ru.fired.art, 'rulai');
  assert.equal(ru.knock, 30);
  assert.ok(ru.power > 10);

  d.arts.tantui = { xp: 55, last: 0, bt1: true };
  const tt = applyArtOn(s, 'hit', d, foe(), { power: 10, move: 'tt1' });
  assert.equal(tt.fired.art, 'tantui');
  assert.equal(tt.trip, 1.3);

  d.arts.tiexian = { xp: 55, last: 0, bt1: true };
  const tx = applyArtOn(s, 'hit', d, foe(), { power: 10, move: 'tx1' });
  assert.equal(tx.fired.art, 'tiexian');
  assert.equal(tx.breakParry, true);

  d.arts.bagua = { xp: 55, last: 0, bt1: true };
  const bg = applyArtOn(s, 'hit', d, foe(), { power: 10, move: 'bg1' });
  assert.equal(bg.fired.art, 'bagua');
  assert.equal(bg.knock, 16);
});

test('舊存檔讀入後是 2.8', () => {
  const raw = readFileSync(new URL('./golden/saves/v2.4.json', import.meta.url), 'utf8');
  const r = load(raw);
  assert.equal(r.ok, true, r.err);
  assert.equal(r.state.rules, '2.8');
  assert.equal(r.state.rules, RULES_VERSION);
  assert.ok(r.state.migSteps.includes('2.8'));
  assert.equal(r.state.threat?.adapt, 1);
});

test('N9：戰力加倍，威脅上升，但不到兩倍', () => {
  const s = createState(7);
  const b = s.ds.find((d) => d.id !== 'hero');
  while (s.ds.length < 5) s.ds.push({ ...structuredClone(b), id: `p${s.ds.length}`, adult: true, role: 'inner' });
  s.day = 10;
  s.res.coin = 100;
  const p1 = points(s);
  assert.ok(p1 > 0);
  for (const d of s.ds) {
    if (d.skills) {
      d.skills.palm = (d.skills.palm || 0) + 50;
      d.skills.leg = (d.skills.leg || 0) + 50;
    }
  }
  const p2 = points(s);
  assert.ok(p2 > p1, `威脅需上升: p1=${p1}, p2=${p2}`);
  assert.ok(p2 < p1 * 2, `威脅上升不到兩倍: p1=${p1}, p2=${p2}`);
});

test('N9：落敗後適應係數下降，數日後回到 1', () => {
  const s = createState(7);
  s.day = 10;
  const X = T(s);
  assert.equal(X.adapt, 1);
  X.pending = { n: 1, pts: 50, demand: 200, p: 0, at: s.t, until: s.t + 100, day: s.day, noPay: true };
  raidResolve(s, 1, null);
  assert.ok(X.adapt < 1, `落敗後適應係數應下降: adapt=${X.adapt}`);
  assert.ok(X.adapt >= 0.6, `不低於下限 0.6: adapt=${X.adapt}`);
  for (let i = 0; i < 10; i++) {
    s.day++;
    threatDaily(s);
  }
  assert.equal(X.adapt, 1, `數日後回到 1: adapt=${X.adapt}`);
});
