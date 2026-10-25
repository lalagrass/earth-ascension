import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import crypto from 'node:crypto';
import { createState, tick, save, load, MIGRATIONS, scoreActs, startExpedition, canExpedition, codexRows, byId, skipGuide, startBuild } from '../src/sim.mjs';
import { RULES_VERSION, ROUTE, ENEMIES, DAY, PHASES } from '../src/data.mjs';
import { pipeline, MUL_CLAMP } from '../src/mul.mjs';
import { artMulParts, artById, seedArts, gainArt } from '../src/arts.mjs';
const FIX = new URL('./fixtures/', import.meta.url);
const runDays = (s, n) => { for (let i = 0; i < n * DAY * 4; i++) tick(s); };
const hash = (s) => crypto.createHash('sha256').update(save(s)).digest('hex').slice(0, 16);

// 1 逐版遷移＋真舊檔回歸（fixtures 由各版 commit 的 createState(7)+300 秒存檔產生）
const OLD = ['0.5', '0.6', '0.7', '0.8', '0.85', '0.9', '0.92'];
for (const v of OLD) test(`舊檔回歸 v${v}：可讀、只跑該跑的步驟、續玩 1 日無負值`, () => {
  const r = load(fs.readFileSync(new URL(`v${v}.json`, FIX), 'utf8')); assert.equal(r.ok, true, r.err); const s = r.state;
  assert.equal(s.rules, RULES_VERSION); assert.equal(s.migratedFrom, v);
  assert.deepEqual(s.migSteps, MIGRATIONS.filter((m) => parseFloat(m.to) > parseFloat(v)).map((m) => m.to));
  for (const d of s.ds) { assert.ok(d.arts && d.root && d.role && d.duties !== undefined || d.role === 'laborer'); assert.equal(d.best, 0); }
  assert.ok(s.codex && s.records && s.pace && s.guide); runDays(s, 1);
  for (const [k, n] of Object.entries(s.res)) assert.ok(n >= 0, k);
});
test('遷移步驟依版本排序、各有說明；新檔不跑任何步驟', () => {
  const v = MIGRATIONS.map((m) => parseFloat(m.to)); assert.deepEqual([...v].sort((a, b) => a - b), v); assert.ok(MIGRATIONS.every((m) => m.note));
  assert.equal(MIGRATIONS.at(-1).to, RULES_VERSION); const r = load(save(createState(2))); assert.deepEqual(r.state.migSteps, []);
});

// 2 統一倍率管線
test('倍率管線：組內相加、組間相乘、每組夾在 0.3–2.0', () => {
  const p = pipeline({ talent: [['a', 1.3], ['b', 1.2]], state: [['c', 0.5]], ext: [] });
  assert.ok(Math.abs(p.talent - 1.5) < 1e-9); assert.equal(p.state, 0.5); assert.equal(p.ext, 1); assert.ok(Math.abs(p.total - 0.75) < 1e-9);
  assert.equal(pipeline({ talent: [['x', 5]] }).talent, MUL_CLAMP[1]); assert.equal(pipeline({ state: [['x', 0], ['y', 0]] }).state, MUL_CLAMP[0]);
});
test('倍率管線：亂數組合的總倍率永遠在 0.3³–2³ 之間', () => {
  let x = 7; const r = () => (x = (x * 16807) % 2147483647) / 2147483647;
  for (let i = 0; i < 2000; i++) { const g = () => Array.from({ length: 1 + (r() * 4 | 0) }, () => ['k', r() * 3]); const p = pipeline({ talent: g(), state: g(), ext: g() }); assert.ok(p.total >= 0.027 - 1e-12 && p.total <= 8 + 1e-12); }
});
test('熟練與決策都走管線，d.why 顯示三組', () => {
  const d = seedArts({ root: 5, personality: ['honest', 'diligent'], style: 'palm', skills: { palm: 0, leg: 0 }, moves: ['fist'] });
  const p = artMulParts(d, artById('basicFist')); assert.deepEqual(p.parts.talent.map(([n]) => n), ['悟性', '憨厚', '勤奮']); assert.ok(p.talent <= 2 && p.talent >= 0.3);
  gainArt(d, 1, 0.9, 0); assert.ok(d.growMul && d.growMul.state < 1);
  const s = createState(4); runDays(s, 0.2); const w = scoreActs(s, s.ds[0])[0]; assert.match(w.f.text, /天賦×.*狀態×.*外部×/); assert.ok(w.f.total > 0);
});

// 3 決定性＋查表
test('同種子 30 日狀態雜湊一致（golden）', () => {
  const a = createState(42), b = createState(42); runDays(a, 30); runDays(b, 30);
  assert.equal(hash(a), hash(b)); assert.equal(a.t, 30 * DAY);
  const g = new URL('./fixtures/golden-30d.txt', import.meta.url); const want = fs.existsSync(g) ? fs.readFileSync(g, 'utf8').trim() : null;
  if (process.env.UPDATE_GOLDEN || !want) fs.writeFileSync(g, hash(a) + '\n'); else assert.equal(hash(a), want, '規則有意改變時以 UPDATE_GOLDEN=1 重產');
});
test('byId 查表：與線性搜尋一致、不進存檔', () => {
  const s = createState(3); tick(s); for (const d of s.ds) assert.equal(byId(s, d.id), d); assert.equal(byId(s, 'nobody'), undefined); assert.ok(!save(s).includes('BYID'));
});

// 4 敵人與圖鑑
test('敵人種類齊全；圖鑑未見為？？？，交手累積觀破值', () => {
  for (const seg of ROUTE) for (const [k] of seg.roster) assert.ok(ENEMIES[k], k);
  const s = createState(5); assert.ok(codexRows(s).every((r) => r.unknown));
  startExpedition(s, ['hero', 'senior']); let i = 0; while (s.exp && i++ < 20000) tick(s);
  const seen = codexRows(s).filter((r) => !r.unknown); assert.ok(seen.length >= 1); assert.ok(seen.every((r) => r.insight > 0));
  assert.ok(Object.values(s.ds[0].insight).some((v) => v > 0));
});

// 5 巡山遠征
const expRun = (seed, lvl, n, thr) => { const s = createState(seed); tick(s);
  for (const d of s.ds) { d.skills.palm = d.skills.leg = Math.max(d.skills.palm, lvl); d.skills.agility = d.skills.strength = lvl / 2; }
  s.res.food = 20; const r = startExpedition(s, s.ds.slice(0, n).map((d) => d.id), { thr }); let i = 0; while (s.exp && i++ < 40000) tick(s); return { s, r, rep: s.lastExp }; };
test('派遣 1–4 人；雇工、傷者不可；同時只一隊', () => {
  const s = createState(1); assert.equal(canExpedition(s, []).ok, false); assert.equal(canExpedition(s, ['a', 'b', 'c', 'd', 'e']).ok, false);
  s.ds[0].hp = 40; assert.equal(canExpedition(s, ['hero']).ok, false); s.ds[0].hp = 100;
  assert.equal(startExpedition(s, ['hero']).ok, true); assert.equal(canExpedition(s, ['senior']).ok, false); assert.ok(s.ds[0].away);
});
test('戰報：距離、各類擊倒、逃走、傷、帶回、回頭原因；沒有人會死', () => {
  const { s, rep } = expRun(3, 0, 2); assert.ok(rep.dist > 0); for (const k of ['kills', 'escaped', 'hurt', 'loot', 'reason', 'seg']) assert.ok(k in rep, k);
  assert.ok(s.ds.every((d) => d.hp > 0 && !d.away)); assert.ok(s.log.some((l) => /巡山戰報/.test(l.msg)));
});
test('固定難度：綜合能力越強走得越遠（同種子）', () => {
  const d = [0, 60, 90].map((l) => expRun(11, l, 2).rep.dist); assert.ok(d[0] < d[1] && d[1] <= d[2], d.join());
  assert.ok(expRun(11, 90, 4).rep.dist >= ROUTE[3].from, '強隊至少進深谷');
});
test('撤退線：70% 比 30% 早回頭；決定性', () => {
  const a = expRun(8, 30, 2, 0.7).rep, b = expRun(8, 30, 2, 0.3).rep; assert.ok(a.dist <= b.dist, `${a.dist} ${b.dist}`); assert.match(a.reason, /70%|心情|重傷/);
  assert.deepEqual(expRun(8, 30, 2, 0.5).rep, expRun(8, 30, 2, 0.5).rep);
});
test('紀錄：個人與本門最遠紀錄，破紀錄全門 +5 心情', () => {
  const { s, rep } = expRun(4, 30, 2); assert.equal(s.records.sect, rep.dist); assert.equal(s.ds[0].best, rep.dist); assert.ok(rep.sectRec);
  assert.ok(s.ds.filter((d) => d.role !== 'laborer').every((d) => d.thoughts.some((t) => t.id === 'recordSect' && t.v >= 4)));
});
test('戰利品入庫（含殘頁欄位）', () => { const { s, rep } = expRun(6, 90, 4); for (const [k, v] of Object.entries(rep.loot)) assert.ok(s.res[k] >= v, k); assert.ok('page1' in s.res && 'page2' in s.res); });

// 6 前期節奏
test('第一天黃昏野豬試煉：主角當天入小成、多一招，記為里程碑', () => {
  const s = createState(9); for (let i = 0; i < DAY * 4 * 0.99; i++) tick(s);
  assert.equal(s.pace.trial, 'done'); assert.ok(s.ds[0].arts.basicFist.xp >= 25); assert.ok(s.ds[0].moves.includes('fist2')); assert.ok(s.pace.done.includes('trial')); assert.ok(s.log.some((l) => /黃昏/.test(l.msg)));
});
test('前三天每天一個里程碑（試煉、第一次巡山、第一次動工）', () => {
  const s = createState(12); runDays(s, 1.05); assert.deepEqual(s.pace.done, ['trial']);
  startExpedition(s, ['senior']); runDays(s, 1); assert.ok(s.pace.done.includes('firstExp'));
  startBuild(s, 'kitchen'); tick(s); assert.ok(s.pace.done.includes('firstBuild')); assert.ok(s.rep >= 9);
});
test('導引旁白可略過；關掉後不再出現', () => {
  const s = createState(2); tick(s); assert.ok(s.guide.msg); skipGuide(s, true); runDays(s, 2.2); assert.equal(s.guide.msg, null); assert.equal(s.guide.on, false);
});
