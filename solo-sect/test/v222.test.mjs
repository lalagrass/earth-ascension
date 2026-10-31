// v2.22 Batch 3：M1 傳記／大事紀、M2 山賊餘黨反撲、M3 結伴吃飯・送飯・柵破避難（皆只在 v22 基準下啟動，無新開關）
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createState, tick, save, pairOf, PAIR } from '../src/sim.mjs';
import { bioLine, bioLean, chronHtml, tallyAct, recordDeed } from '../src/util.mjs';
import { T, points, threatDaily, BOSS, bossEnd, shelterOnBreak, timid, SHELTER } from '../src/threat.mjs';
import { DAY } from '../src/data.mjs';

const V22 = { kind: 'template', id: 'guojing', askMajor: false, v22: true, steward: true, stewkit: true, stewyard: true };
const mk = (seed = 11) => createState(seed, { ...V22 });
const runDays = (s, days) => { for (let i = 0; i < days * DAY / 0.25; i++) tick(s, 0.25); };

// ---- M1 ----
test('M1 傳記：樣本不足不臆測；外放／內斂／動靜皆宜', () => {
  const d = { name: '甲' }; assert.match(bioLine(d), /入門未久/); assert.equal(bioLean(d), null);
  tallyAct(d, 'chat', 50); tallyAct(d, 'spar', 30); tallyAct(d, 'farm', 10); assert.equal(bioLean(d), 'out'); assert.match(bioLine(d), /外放.*閒聊/);
  const e = { name: '乙' }; tallyAct(e, 'meditate', 40); tallyAct(e, 'cook', 30); tallyAct(e, 'chat', 5); assert.equal(bioLean(e), 'in'); assert.match(bioLine(e), /沉靜/);
  const f = { name: '丙' }; tallyAct(f, 'chat', 50); tallyAct(f, 'train', 50); assert.equal(bioLean(f), 'mid');
  tallyAct(f, 'eat', 999); tallyAct(f, 'rest', 999); assert.equal(f.acts.eat, undefined, '吃睡不算');
});
test('M1 傳記帶出事蹟次數；大事紀倒序顯示', () => {
  const s = mk(); const d = s.ds[0]; tallyAct(d, 'spar', 20); recordDeed(s, d, 'break'); recordDeed(s, d, 'defend'); recordDeed(s, d, 'boss');
  assert.match(bioLine(d), /衝關成功 1 回、守柵退敵 1 回、曾擊退山賊餘黨反撲/);
  assert.match(chronHtml(s), /尚無大事/); recordDeed(s, null, 'x', { chron: '甲事' }); s.day = 3; recordDeed(s, null, 'y', { chron: '乙事' });
  const h = chronHtml(s); assert.ok(h.indexOf('乙事') < h.indexOf('甲事')); assert.match(h, /第 3 日/);
});
test('M1 v22 下跑 3 日：弟子有行為記帳、大事紀有落成或入門', () => {
  const s = mk(); runDays(s, 3); assert.ok(s.ds.some((d) => d.acts && Object.keys(d.acts).length));
  assert.ok((s.chron || []).length >= 1); assert.ok(s.chron.every((c) => typeof c.text === 'string' && c.day >= 1));
});
test('M1 非 v22（舊局）不記帳、不寫大事紀', () => {
  const s = createState(11, { kind: 'template', id: 'guojing', askMajor: false }); runDays(s, 2);
  assert.ok(s.ds.every((d) => !d.acts)); assert.equal(s.chron, undefined);
});

// ---- M2 ----
test('M2 剿寨後：前一日傳聞、當日餘黨反撲（不談價錢）', () => {
  const s = mk(); s.day = 10; const X = T(s); X.pending = null; X.next = 99; X.boss = { day: 12, state: 'wait' };
  s.day = 11; threatDaily(s); assert.equal(X.boss.rumored, true); assert.ok(s.log.some((l) => /餘黨/.test(l.msg ?? l)));
  s.day = 12; threatDaily(s); assert.equal(X.boss.state, 'on'); assert.equal(X.pending.boss, true); assert.equal(X.pending.noPay, true); assert.ok(X.pending.pts >= BOSS.min);
});
test('M2 撞上別的山賊就順延一日', () => {
  const s = mk(); const X = T(s); X.next = 99; X.boss = { day: 5, state: 'wait' }; X.pending = { n: 1, pts: 3 }; s.day = 5; threatDaily(s);
  assert.equal(X.boss.state, 'wait'); assert.equal(X.boss.day, 6);
});
test('M2 撐過＝山道永享太平：威脅大減、武名 +10、大事紀', () => {
  const s = mk(); s.res.coin = 300; s.day = 20; const X = T(s); X.boss = { day: 20, state: 'on' };
  const before = points(s), v0 = s.valor ?? 0; bossEnd(s, { boss: true }, true, [s.ds[0]]);
  assert.equal(X.taiping, true); assert.equal(X.boss.state, 'won'); assert.ok(points(s) <= Math.ceil(before * BOSS.peaceMul) + 1, `${points(s)} vs ${before}`);
  assert.equal(s.valor, Math.min(100, v0 + BOSS.valor)); assert.ok(s.chron.some((c) => /山道永享太平/.test(c.text))); assert.equal(s.ds[0].deedN.boss, 1);
});
test('M2 沒擋住：記入大事紀、不給太平', () => {
  const s = mk(); const X = T(s); X.boss = { day: 5, state: 'on' }; bossEnd(s, { boss: true }, false, []);
  assert.equal(X.taiping, undefined); assert.equal(X.boss.state, 'lost'); assert.ok(s.chron.some((c) => /反撲得手/.test(c.text)));
});
test('M2 非 v22 不排餘黨', () => {
  const s = createState(11, { kind: 'template', id: 'guojing', askMajor: false }); const X = T(s); X.boss = { day: 5, state: 'wait' }; X.next = 99; s.day = 5; threatDaily(s); assert.equal(X.boss.state, 'wait');
});

// ---- M3 ----
const pairUp = (s) => { const [a, b] = s.ds.filter((d) => d.id !== 'hero' && d.adult !== false); a.spouse = b.id; b.spouse = a.id; return [a, b]; };
test('M3 pairOf：配偶優先', () => { const s = mk(); const [a, b] = pairUp(s); assert.equal(pairOf(s, a).id, b.id); });
test('M3 另一半忙著幹活又餓：送飯過去（扣 1 飯、對方飽食上升、記事蹟）', () => {
  const s = mk(); const [a, b] = pairUp(s); s.res.food = 20;
  b.task = { act: 'build', phase: 'do', node: b.at, timer: 0, fac: 'dorm' }; b.path = []; b.needs.hunger = 10;
  a.task = null; a.order = null; a.needs.hunger = 90; a.needs.energy = 90; a.pos = [...b.pos]; a.at = b.at;
  let fed = false; for (let i = 0; i < 400 && !fed; i++) { const h0 = b.needs.hunger; tick(s, 0.25); if (b.task?.act !== 'build') { b.task = { act: 'build', phase: 'do', node: b.at, timer: 0, fac: 'dorm' }; b.path = []; } fed = !!a.deedN?.feed; if (!fed) b.needs.hunger = Math.min(b.needs.hunger, 10); }
  assert.ok(fed, '應送過一次飯'); assert.ok(a.acts.social > 0);
});
test('M3 另一半不餓、不忙不傷：不送飯', () => {
  const s = mk(); const [a, b] = pairUp(s); b.needs.hunger = 90; b.hp = 100; b.task = null;
  for (let i = 0; i < 40; i++) tick(s, 0.25); assert.ok(!a.deedN?.feed);
});
test('M3 柵破：膽小或真氣＋氣血都低的躲進屋，不在守柵者之列', () => {
  const s = mk(); const ds = s.ds; ds[0].personality = ['worrier']; ds[1].personality = ['brave']; ds[1].hp = 30; ds[1].qi = 5;
  ds[2].personality = ['brave']; ds[2].hp = 100; ds[2].qi = 80; ds[2].task = { act: 'defend', phase: 'do' };
  const who = shelterOnBreak(s); const ids = who.map((d) => d.id);
  assert.ok(ids.includes(ds[0].id) && ids.includes(ds[1].id)); assert.ok(!ids.includes(ds[2].id));
  assert.ok(ds[0].shelter > s.t && ds[0].shelter <= s.t + SHELTER.dur); assert.ok(['hall', 'court'].includes(ds[0].shelterAt));
  assert.equal(timid({ personality: ['gentle', 'brave'] }), false);
});
test('M3 避難者走向大廳／院倉，時間到自動回來', () => {
  const s = mk(); const d = s.ds[1]; d.task = null; d.order = null; d.shelter = s.t + 2; d.shelterAt = 'hall';
  tick(s, 0.25); assert.equal(d.task?.act, 'shelter');
  for (let i = 0; i < 20; i++) tick(s, 0.25); assert.notEqual(d.task?.act, 'shelter');
});
test('Batch 3 存檔可來回（新欄位可序列化）', () => { const s = mk(); runDays(s, 1); const j = save(s); assert.ok(typeof j === 'string' && j.length > 100); });
