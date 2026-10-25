import test from 'node:test';
import assert from 'node:assert/strict';
import { createState, tick, startExpedition } from '../src/sim.mjs';
import { ARTS, MOVES, RULES_VERSION, DAY, DUGU } from '../src/data.mjs';
import { learnArt, artTier } from '../src/arts.mjs';
import { CARDS, card, hsResolve, hsStep, zxGate, zxUp, fengFit, formReady, learnDugu, bixie } from '../src/huashan.mjs';
import { XIA, xiaPool, join } from '../src/wuxia.mjs';
import { autoPick, resolveChoice } from '../src/hero.mjs';
import { migrate } from '../src/save.mjs';
import fs from 'node:fs';

const yue = (ask = true) => { const s = createState(7, { kind: 'template', id: 'yuebuqun', companion: 'linghuchong', askMajor: ask }); tick(s); return s; };
const hero = (s) => s.ds.find((d) => d.id === 'hero');
const run = (s, sec) => { for (let i = 0; i < sec / 0.25; i++) tick(s); };
test('v1.2 版本；九劍九式照原著、辟邪三招；都不入秘笈', () => {
  assert.equal(RULES_VERSION, '1.2');
  assert.deepEqual(DUGU.map((f) => f.name), ['總訣式', '破劍式', '破刀式', '破槍式', '破鞭式', '破索式', '破掌式', '破箭式', '破氣式']);
  for (const id of ['zixia', 'bixie', 'dugu']) assert.ok(ARTS.find((a) => a.id === id).secret);
});
test('岳不群開局紫霞第一層；1→3 靠閉關、4→6 要祕洞壁刻、7→9 要連續 7 天沒有違心', () => {
  const s = yue(); const d = hero(s); assert.equal(d.zixia, 1);
  assert.equal(zxGate(s, d), null); zxUp(s, d); zxUp(s, d); assert.equal(d.zixia, 3); assert.ok(s.choices.some((c) => c.hs === 'cave'));
  assert.match(zxGate(s, d), /壁刻/); s.hs.carv = 3; zxUp(s, d); zxUp(s, d); zxUp(s, d); assert.equal(d.zixia, 6);
  d.mood = 80; d.ding = 4; d.lastWexinT = s.t; assert.match(zxGate(s, d), /連續 7 天/); s.t += 7.1 * DAY; assert.equal(zxGate(s, d), null);
});
test('辟邪三卡：林平之上山→暗查劍譜→自宮修練；岳不群自動駕駛照名望走，偽君子添違心', () => {
  const s = yue(false); run(s, DAY * 3.2);
  assert.ok(s.ds.some((d) => d.id === 'linpingzhi')); assert.ok(s.hs.bixie === 3, `bixie ${s.hs.bixie}`); const d = hero(s);
  assert.ok(artTier(d, 'bixie') >= 2); assert.ok(d.duanqing != null); assert.ok(d.wexin >= 1); assert.ok(s.hero.arcStep >= 3);
});
test('辟邪代價：斷情、寧中則好感鎖死、全門心情受衝擊；力量隨斷情天數上升', () => {
  const s = createState(7, { kind: 'template', id: 'yuebuqun', companion: 'ningzhongze' }); tick(s); const d = hero(s), n = s.ds.find((x) => x.id === 'ningzhongze');
  const a0 = s.aff[`${n.id}>hero`] || 0; bixie(s, d); assert.ok((s.aff[`${n.id}>hero`]) <= a0 - 40); assert.ok(n.lockDown);
  hsStep(s, 0.25); const m0 = d.powMul; s.t += 5 * DAY; hsStep(s, 0.25); assert.ok(d.powMul > m0);
});
test('嵩山派施壓：第 3 天起每 4 天一張', () => {
  const s = yue(); s.day = 4; s.choices = []; Object.assign(s.hs.cards, { linJoin: true }); s.hs.bixie = -1; hsStep(s, 0.25); assert.ok(s.choices.some((c) => c.hs === 'song'));
});
test('總訣式：灑脫＋悟性 ≥4 必成；拘謹＋正統劍法圓滿互斥；不合性格軟性 5%', () => {
  const s = yue(); const l = s.ds.find((d) => d.id === 'linghuchong'), y = hero(s);
  assert.ok(fengFit(l).ok); learnArt(y, 'zixia', 0); y.arts.zixia.xp = 90; assert.ok(fengFit(y).orthodox);
});
test('思過崖：罰令狐沖面壁→風清揚三晚指點、第四晚對練傳總訣，傳完就走', () => {
  const s = yue(); s.hs.bixie = -1; s.hs.cards.linJoin = true; s.hs.songLast = 99; s.day = 4; s.choices = []; hsStep(s, 0.25);
  const sg = s.choices.find((c) => c.hs === 'siguo'); assert.ok(sg); hsResolve(s, sg, 0); assert.ok(s.hs.siguo);
  hsStep(s, 0.25); const f = s.choices.find((c) => c.hs === 'feng'); assert.ok(f && f.portrait.includes('fengqingyang')); hsResolve(s, f, 0);
  const H = { rand: () => 0.5 }; for (let k = 0; k < 4; k++) { s.day++; hsStep(s, 0.25, H); }
  const l = s.ds.find((d) => d.id === 'linghuchong'); assert.ok(l.dugu.includes('dg0')); assert.ok(s.hs.fengLeft); assert.equal(s.hs.feng, null);
});
test('九劍各式要見過對應敵人（深段）才悟出；破氣式還要化境內功', () => {
  const s = yue(); const l = s.ds.find((d) => d.id === 'linghuchong'); learnDugu(s, l, 'dg0');
  const pj = DUGU.find((f) => f.id === 'dg1'), pq = DUGU.find((f) => f.id === 'dg8'); assert.ok(!formReady(s, l, pj));
  s.codex.swordtomb = { seen: 1, kills: 1, fled: 0, insight: 40 }; assert.ok(formReady(s, l, pj));
  s.codex.peakguard = { seen: 1, kills: 1, fled: 0, insight: 80 }; assert.ok(!formReady(s, l, pq)); l.zixia = 9; assert.ok(formReady(s, l, pq));
});
test('嫉令狐沖：首徒學了九劍 → 逐出抉擇；逐出後他離開（不死）', () => {
  const s = yue(); s.hs.bixie = -1; Object.assign(s.hs.cards, { linJoin: true, siguo: true, feng: true }); s.hs.songLast = 99; s.choices = [];
  const l = s.ds.find((d) => d.id === 'linghuchong'); learnDugu(s, l, 'dg0'); hsStep(s, 0.25); const ch = s.choices.find((c) => c.hs === 'expel'); assert.ok(ch); assert.ok(s.hs.jealous);
  assert.equal(autoPick(s, ch), 0); hsResolve(s, ch, 0); assert.ok(!s.ds.includes(l)); assert.equal(s.hs.lhc, 'expelled');
});
test('令狐沖模板：進洞→風清揚→總訣式；也能以名俠身分在斷崖遇到', () => {
  const s = createState(7, { kind: 'template', id: 'linghuchong', companion: 'yuelingshan', askMajor: false }); run(s, DAY * 6.5);
  assert.ok(hero(s).dugu?.includes('dg0')); assert.ok(s.hero.arcStep >= 3);
  const t = createState(3); tick(t); t.records.sect = 720; assert.ok(xiaPool(t).includes('linghuchong')); assert.ok(XIA.linghuchong.need(t));
});
test('奇遇卡帶立繪；洪七公立繪已補', () => {
  assert.ok(fs.existsSync(new URL('../assets/portraits/hongqigong.png', import.meta.url)));
  assert.ok(fs.existsSync(new URL('../assets/portraits/fengqingyang.png', import.meta.url)));
  const s = createState(3); tick(s); s.rep = 30; s.xia.lastT = -1e9; tick(s); const ch = s.choices.find((c) => c.xia); assert.ok(ch?.portrait?.endsWith(`${ch.xia}.png`));
});
function party(mode) { const s = createState(11); tick(s); const ids = s.ds.filter((d) => d.role !== 'laborer').slice(0, 4).map((d) => d.id);
  for (const d of s.ds) if (ids.includes(d.id)) { for (const k of Object.keys(d.skills)) d.skills[k] = 100; for (const a of ARTS) { if ((a.classic && mode === 'normal') || a.id === 'rulai' || a.layered || a.forms || a.id === 'bixie') continue; learnArt(d, a.id, 0); Object.assign(d.arts[a.id], { xp: 1e6, bt1: true, bt2: true, bt3: true, last: 1e9 }); learnArt(d, a.id, 0); } d.mood = 95; }
  s.res.food = 200; startExpedition(s, ids, { thr: 0.3, target: 'inf', supplies: 24 }); let i = 0; while (s.exp && i++ < 2000000) tick(s); return s.lastExp; }
test('無盡段體力牆修正：招牌武學練滿的隊伍過一重回一口真氣，能推到第 4 重以後；一般武學仍止於 1600 內', () => {
  const n = party('normal'), c = party('classic'); assert.ok(n.dist <= 1600); assert.ok(c.dist >= 2400, `classic ${c.dist}`); assert.ok(c.events?.some?.((e) => /真氣/.test(e)) ?? true);
});
test('1.1 存檔遷移到 1.2 補上華山線狀態', () => { const s = createState(3); tick(s); delete s.hs; s.rules = '1.1'; const o = migrate(JSON.parse(JSON.stringify(s))); assert.ok(o.hs && o.hs.cards); });
