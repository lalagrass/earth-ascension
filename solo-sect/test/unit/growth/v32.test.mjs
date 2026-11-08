/* v3.2 loop201：練法／打法寫在武學上。門派不再改戰鬥倍率。只在 v24。 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { createState, tick } from '../../../src/sim.mjs';
import { artsGrowHtml, rulesHtml, neigongRules2Html, growthHtml } from '../../../src/panel-ui.mjs';
import { MOVES, SECTS } from '../../../src/data.mjs';
import * as A from '../../../src/arts.mjs';

const V = (o = {}) => createState(7, { kind: 'custom', answers: Array(9).fill(0), askMajor: false, v22: true, ...o });
const other = (s) => s.ds.find((d) => d.id !== 'hero' && d.role !== 'laborer');
const dps = (d, mv) => {
  const m = MOVES.find((x) => x.id === mv);
  return m.dmg * A.moveMul(d, mv, 0) / (m.cd * A.cdMul(d, mv, 0));
};

test('loop201 內力低時打法秒傷更高，內力高時練法反超，交叉在 90–130', () => {
  const jd = MOVES.find((m) => m.id === 'jd1'), cs = MOVES.find((m) => m.id === 'cs1');
  assert.equal(jd.dmg, cs.dmg); assert.equal(jd.cd, cs.cd);
  assert.equal(A.artById('jindingPalm').mode, 'lian'); assert.equal(A.artById('chousuiPalm').mode, 'da');
  const d = {
    v24: true, v23: true, sectId: 'wudang', qi: 25, ng: 1, skills: { palm: 0 }, personality: [], values: {}, qiInjury: 0,
    arts: { breath: { xp: 100 }, zixia: { xp: 100 }, jindingPalm: { xp: 55 }, chousuiPalm: { xp: 55 } },
  };
  assert.ok(A.qiMax(d) >= 180, String(A.qiMax(d)));
  assert.equal(A.innerDrive28(d, A.artById('jindingPalm')).tier, 2);
  assert.equal(A.innerDrive28(d, A.artById('chousuiPalm')).tier, 2);
  assert.equal(A.innerDrive28(d, A.artById('jindingPalm')).mul, 1);
  assert.equal(A.innerDrive28(d, A.artById('chousuiPalm')).mul, 1);
  assert.ok(dps(d, 'cs1') > dps(d, 'jd1'), `qi25 da ${dps(d, 'cs1')} lian ${dps(d, 'jd1')}`);
  d.qi = 180;
  assert.ok(dps(d, 'jd1') > dps(d, 'cs1'), `qi180 lian ${dps(d, 'jd1')} da ${dps(d, 'cs1')}`);
  let cross = null;
  for (let q = 1; q <= 200; q++) { d.qi = q; if (dps(d, 'jd1') >= dps(d, 'cs1')) { cross = q; break; } }
  assert.ok(cross >= 90 && cross <= 130, `交叉在內力 ${cross}`);
});

test('loop201 吐納催三陰蜈蚣爪幾乎不掉威力', () => {
  const d = { v24: true, v23: true, sectId: 'xingxiu', qi: 10, arts: { breath: { xp: 60 }, sanyinClaw: { xp: 30 } } };
  const drv = A.innerDrive28(d, A.artById('sanyinClaw'));
  assert.equal(drv.tier, 3);
  assert.equal(drv.mul, 1); /* #405 退役：虛浮不再縮威力 */
});

test('loop201 同武學同數值，氣宗、劍宗、無名派倍率相同', () => {
  const mk = (sectId) => ({
    v24: true, v23: true, sectId, qi: 40, ng: 1, ng2: 1, skills: { palm: 0, agility: 0 }, personality: [], qiInjury: 0,
    arts: { breath: { xp: 55 }, basicSword: { xp: 55 }, bixie: { xp: 55 } },
  });
  const ds = ['qizong', 'jianzong', 'wuming'].map(mk);
  for (const mv of ['bs1', 'bx1']) {
    const moves = ds.map((d) => A.moveMul(d, mv, 0));
    const cds = ds.map((d) => A.cdMul(d, mv, 0));
    assert.equal(moves[1], moves[0], mv); assert.equal(moves[2], moves[0], mv);
    assert.equal(cds[1], cds[0], mv); assert.equal(cds[2], cds[0], mv);
  }
  assert.equal(A.swordCdMul(ds[0], 'bx1'), 1);
  assert.equal(A.swordDmgMul(ds[1], 'bx1'), 1);
});

test('loop201 內力先乘造詣再封頂 260', () => {
  const bare = { v24: true, arts: { breath: { xp: 100 }, zixia: { xp: 100 } } };
  /* #403 退役：兩門化境各貢獻 100，不再乘品階。 */
  const raw = 100 + 100;
  assert.ok(Math.abs(A.qiMax2(bare) - raw) < 1e-6);
  assert.ok(raw < A.NG2.total24);
  const topped = { v24: true, arts: { breath: { xp: 100, gm: { e: 20 } }, zixia: { xp: 100, gm: { e: 55 } } } };
  assert.equal(A.mastery(topped, 'neigong'), 75);
  const product = raw * (1 + 0.004 * 75);
  assert.ok(product >= A.NG2.total24, String(product));
  assert.equal(A.qiMax2(topped), A.NG2.total24);
});

const body = (extra = {}) => ({ v24: true, sectId: 'wudang', style: 'palm', personality: [], values: {}, wu: 3, pairMul: 0, qiInjury: 0, moves: [], arts: {}, ...extra });

test('loop202 練法回饋主運內功且不破瓶頸，打法不回饋', () => {
  const d = body();
  d.arts = { wudangXinfa: { xp: 10, last: 0 }, mianPalm: { xp: 10, last: 0 }, chousuiPalm: { xp: 10, last: 0 } };
  d.focus = 'mianPalm';
  const o = A.gainArt(d, 8, 1, 0, { raw: 8, src: 'train' });
  assert.equal(o.feed?.id, 'wudangXinfa'); assert.equal(o.feed.label, '練招養氣');
  assert.ok(d.arts.wudangXinfa.xp > 10); assert.ok(d.arts.wudangXinfa.xp <= A.curCap(d, A.artById('wudangXinfa')));
  assert.ok(!d.arts.wudangXinfa.bt1);
  assert.equal(d.growMul.feed, '練招養氣');
  assert.ok(d.arts.wudangXinfa.gm.e > 0);
  const capped = body();
  capped.arts = { wudangXinfa: { xp: 54.85, last: 0 }, mianPalm: { xp: 10, last: 0 } };
  capped.focus = 'mianPalm';
  A.gainArt(capped, 40, 1, 0, { raw: 40, src: 'train' });
  assert.equal(capped.arts.wudangXinfa.xp, A.curCap(capped, A.artById('wudangXinfa')));
  assert.ok(!capped.arts.wudangXinfa.bt1);
  const da = body();
  da.arts = { wudangXinfa: { xp: 10, last: 0 }, chousuiPalm: { xp: 10, last: 0 } };
  da.focus = 'chousuiPalm';
  A.gainArt(da, 8, 1, 0, { raw: 8, src: 'train' });
  assert.equal(da.arts.wudangXinfa.xp, 10); assert.equal(da.arts.wudangXinfa.gm, undefined);
  const foreign = body();
  foreign.arts = { zixia: { xp: 100, last: 0 }, wudangXinfa: { xp: 12, last: 0 }, mianPalm: { xp: 10, last: 0 } };
  foreign.focus = 'mianPalm';
  const f = A.gainArt(foreign, 8, 1, 0, { raw: 8, src: 'train' });
  assert.equal(A.mainInner28(foreign).id, 'zixia');
  assert.equal(f.feed?.id, 'wudangXinfa'); assert.equal(foreign.arts.zixia.xp, 100);
  const base = body({ sectId: 'wuming', stree: ['breath', 'basicFist'], style: 'fist' });
  base.arts = { breath: { xp: 8, last: 0 }, basicFist: { xp: 6, last: 0 } };
  base.focus = 'basicFist';
  const b = A.gainArt(base, 8, 1, 0, { raw: 8, src: 'train' });
  assert.equal(b.feed?.label, '築基培元'); assert.equal(b.feed.id, 'breath'); assert.ok(base.arts.breath.xp > 8);
  const idle = body();
  idle.arts = { wudangXinfa: { xp: 10, last: 0 }, mianPalm: { xp: 10, last: 0 } };
  idle.focus = 'mianPalm';
  A.gainArt(idle, 0, 1, 0, { raw: 0, src: 'train' });
  assert.equal(idle.arts.wudangXinfa.xp, 10);
});

test('loop202 以技入道：外功造詣 50 才加成，內勁有效值吃兩成外功', () => {
  const lo = body();
  lo.arts = { basicSword: { xp: 10, gm: { e: 20 } }, breath: { xp: 4, last: 0 } };
  assert.equal(A.dao31(lo), false);
  assert.ok(!A.artMulParts(lo, A.artById('breath')).parts.ext.some((x) => x[0] === '以技入道'));
  const hi = body();
  hi.arts = { bixie: { xp: 20, gm: { e: 75 } }, breath: { xp: 4, gm: { e: 10 }, last: 0 } };
  assert.equal(A.mastery(hi, 'jianfa'), 75); assert.equal(A.dao31(hi), true);
  const ext = A.artMulParts(hi, A.artById('breath')).parts.ext.find((x) => x[0] === '以技入道');
  assert.deepEqual(ext, ['以技入道', 1.35]);
  assert.ok(!A.artMulParts(hi, A.artById('bixie')).parts.ext.some((x) => x[0] === '以技入道'));
  assert.equal(A.neigongEff31(hi), Math.min(100, 10 + 0.2 * 75));
});

const tasteOf = (d, id) => {
  const names = ['投其所好', '枯燥難耐', '嫌其花俏'];
  return A.artMulParts(d, A.artById(id)).parts.ext.filter((x) => names.includes(x[0]));
};

test('loop203 好打法連練練法後改練打法；手動主修與舊檔缺 bore31 都安全', () => {
  const d = body({ personality: ['nimble', 'playful', 'brave'], needs: { fun: 50 } });
  d.arts = { mianPalm: { xp: 12, last: 0 }, chousuiPalm: { xp: 10, last: 0 } };
  assert.equal(A.appetite31(d), 3);
  assert.equal(d.bore31, undefined);
  assert.equal(A.autoFocus(d), 'mianPalm');
  assert.equal(d.bore31, undefined);
  for (let i = 0; i < 3; i++) A.noteTrain31(d, A.artById('mianPalm'));
  assert.equal(d.bore31, 3);
  assert.ok(Math.abs(d.needs.fun - (50 - 2.1 * 3)) < 1e-9);
  assert.equal(A.autoFocus(d), 'chousuiPalm');
  d.focus = 'mianPalm';
  assert.equal(A.focusOf(d), 'mianPalm');
  d.focus = null;
  A.noteTrain31(d, A.artById('chousuiPalm'));
  assert.equal(d.bore31, 1);
  assert.ok(Math.abs(d.needs.fun - (50 - 6.3 + 2)) < 1e-9);
  assert.equal(A.autoFocus(d), 'mianPalm');
  const low = body({ personality: ['honest', 'quiet', 'rigid'] });
  assert.equal(A.appetite31(low), -3);
  low.arts = { wudangFist: { xp: 30, last: 0 }, wudangXinfa: { xp: 10, last: 0 }, mianPalm: { xp: 8, last: 0 }, chousuiPalm: { xp: 10, last: 0 } };
  assert.equal(A.autoFocus(low), 'wudangXinfa');
  for (let i = 0; i < 3; i++) A.noteTrain31(low, A.artById('chousuiPalm'));
  assert.equal(low.bore31, 3);
  assert.equal(low.needs, undefined);
  assert.equal(A.autoFocus(low), 'mianPalm');
});

test('loop203 練功倍率只留一個偏好標籤，靈動不與投其所好疊加', () => {
  const like = body({ personality: ['nimble', 'playful', 'brave'] });
  const da = tasteOf(like, 'bixie'), lian = tasteOf(like, 'mianPalm');
  assert.deepEqual(da.map((x) => x[0]), ['投其所好']);
  assert.ok(Math.abs(da[0][1] - 1.12) < 1e-9);
  assert.ok(!A.artMulParts(like, A.artById('bixie')).parts.ext.some((x) => x[0] === '靈動跳階'));
  assert.deepEqual(lian.map((x) => x[0]), ['枯燥難耐']);
  assert.ok(Math.abs(lian[0][1] - 1 / (1 + 0.05 * 3)) < 1e-9);
  assert.ok(A.artMulParts(like, A.artById('mianPalm')).parts.ext.some((x) => x[0] === '靈動跳階'));
  const dull = body({ personality: ['diligent', 'nimble', 'playful', 'brave'] });
  assert.equal(A.appetite31(dull), 3);
  assert.ok(Math.abs(tasteOf(dull, 'mianPalm')[0][1] - 1 / (1 + 0.05 * 3 * 0.5)) < 1e-9);
  const flash = body({ personality: ['honest', 'quiet', 'rigid'] });
  assert.deepEqual(tasteOf(flash, 'chousuiPalm').map((x) => x[0]), ['嫌其花俏']);
  assert.ok(Math.abs(tasteOf(flash, 'chousuiPalm')[0][1] - 1 / (1 + 0.025 * 3)) < 1e-9);
  assert.deepEqual(tasteOf(flash, 'mianPalm').map((x) => x[0]), ['投其所好']);
  const plain = body();
  assert.equal(tasteOf(plain, 'mianPalm').length, 0);
  assert.equal(A.temperOf(body({ personality: ['clever'] })).ling, true);
  assert.equal(A.temperOf(body({ personality: ['playful'] })).ling, true);
  assert.equal(A.temperOf(body({ personality: ['quiet'] })).zheng, true);
  assert.equal(A.temperOf(body({ personality: ['bold'] })).xiao, true);
  assert.equal(A.temperOf(body({ personality: ['bold'] })).ling, false);
});

test('loop204 面板寫出類別與內勁，徽章只看主修武學', () => {
  const d = body({ v23: true, qi: 160, ng: 1, personality: ['nimble', 'playful', 'brave'], needs: { fun: 40 }, bore31: 3 });
  d.arts = { wudangXinfa: { xp: 60, last: 0 }, wudangJiuyang: { xp: 100, last: 0 }, mianPalm: { xp: 40, last: 0 }, chousuiPalm: { xp: 55, last: 0 } };
  d.focus = 'mianPalm'; d.growMul = { feed: '練招養氣' };
  const html = artsGrowHtml(d, 0, false);
  assert.match(html, /好打法/); assert.match(html, /坐不住/); assert.match(html, /枯燥難耐/); assert.match(html, /練招養氣/);
  assert.match(html, /練法・內勁係數 0.4・內勁 ×/);
  assert.ok(A.qiOf(d) >= 62.5, String(A.qiOf(d)));
  assert.ok(A.qiStrikeMul(d, A.artById('mianPalm')) >= 1.25);
  assert.ok(A.styleBadges24(d).includes('【以氣御劍】'));
  assert.ok(!A.styleBadges24(d).includes('【本門正宗】'));
  assert.match(A.artsSvg(d), /武當綿掌（[^）]*練法・內勁係數 0.4/);
  d.focus = 'chousuiPalm';
  assert.ok(A.swordFast24(d)); assert.ok(A.styleBadges24(d).includes('【唯快不破】'));
  assert.ok(!A.styleBadges24(d).includes('【以氣御劍】'));
  assert.match(artsGrowHtml(d, 0, false), /投其所好/);
  const same = (sectId) => A.swordFast24({ ...d, sectId }) && A.qiArtBadge24({ ...d, sectId, focus: 'mianPalm' });
  assert.equal(same('jianzong'), true); assert.equal(same('qizong'), true); assert.equal(same('wuming'), true);
  const g = body({ sectId: 'gaibang', v23: true, qi: 40, stree: ['breath', 'huntianGong', 'lianhuaPalm'] });
  g.arts = { huntianGong: { xp: 60, last: 0 }, lianhuaPalm: { xp: 30, last: 0 } };
  assert.equal(A.innerDrive28(g, A.artById('lianhuaPalm')).tier, 1);
  assert.equal(A.innerDrive28(g, A.artById('lianhuaPalm')).mul, 1); /* #405 退役：面板不再寫正宗 ×1.25 */
  assert.ok(!artsGrowHtml(g, 0, false).includes('×1.25'));
  assert.ok(!A.styleBadges24(g).includes('【本門正宗】'));
  const dao = body({ v23: true, qi: 20 });
  dao.arts = { bixie: { xp: 20, gm: { e: 75 } }, breath: { xp: 10, last: 0 } };
  dao.focus = 'breath';
  assert.match(artsGrowHtml(dao, 0, false), /以技入道/);
});

test('loop205 診斷鉤子預設不聽；掛上才記練功與反哺', () => {
  const ev = [];
  assert.equal(A.meter32.note, null);
  A.meter32.note = (e) => ev.push(e);
  try {
    const d = body({ personality: ['nimble', 'playful', 'brave'] });
    d.arts = { wudangXinfa: { xp: 10, last: 0 }, mianPalm: { xp: 10, last: 0 } };
    A.noteTrain31(d, A.artById('mianPalm'));
    const fed = A.feedInnerFromOuter(d, A.artById('mianPalm'), 10, { raw: 4 });
    assert.equal(fed.label, '練招養氣');
    assert.ok(ev.some((e) => e.kind === 'train' && e.k === 'lian' && e.A === 3));
    assert.ok(ev.some((e) => e.kind === 'feed' && e.mode === 'lian' && e.xp > 0));
  } finally { A.meter32.note = null; }
});

test('loop201 神木毒功退出學習池，已學會的舊檔仍讀得到', () => {
  const a = A.artById('shenmuGong');
  assert.equal(a.deprecated, true); assert.equal(a.secret, true); assert.equal(a.grade, 2);
  assert.ok(!SECTS.xingxiu.tree.includes('shenmuGong'));
  const s = V({ sect24: 'xingxiu' }); tick(s, 0.1); const d = other(s);
  assert.ok(!A.artHints(d).some((r) => r.id === 'shenmuGong'));
  assert.ok(!A.artsSvg(d).includes('data-art="shenmuGong"'));
  d.arts.shenmuGong = { xp: 30, last: 0 };
  assert.equal(A.artById('shenmuGong').name, '神木毒功');
  assert.match(artsGrowHtml(d, 0, false), /神木毒功/);
  assert.ok(!A.artsSvg(d).includes('data-art="shenmuGong"'));
});

test('loop201 面板規則跟上封頂與造詣', () => {
  const s = V(); tick(s, 0.1); const d = s.ds[0];
  const h = growthHtml(d, {}, 1, s.t, true);
  assert.match(h, new RegExp(`再封頂 ${A.NG2.total24}`));
  assert.match(h, new RegExp(`最多 ${Math.round(A.NG2.mitCap24 * 100)}%`));
  assert.match(h, new RegExp(`築基內勁係數 ${A.MODE31.base.qiScale}`));
  assert.doesNotMatch(h, /造詣不加傷害/);
  assert.doesNotMatch(h, /氣宗／紫霞/);
  assert.doesNotMatch(rulesHtml(), /造詣進實戰/);
  assert.match(rulesHtml(), /出手強度只讀武學的勁目標，沒有熟練十重的第二層傷害/);
  assert.doesNotMatch(neigongRules2Html({ ng: 1 }), /出手 ×/);
});
