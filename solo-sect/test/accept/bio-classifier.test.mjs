// M1 驗收：48 種子 × 30 日，只看傳記文字，分辨「外放（社交／武鬥）」與「內斂（修練／手藝）」弟子，準確率須 ≥ 90%。
// 重現：SS_DT=0.25 node --test test/accept/bio-classifier.test.mjs（8 個子程序並行，種子 1001–1048）
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
const ex = promisify(execFile), W = new URL('./bio-worker.mjs', import.meta.url).pathname;
// 純文字分類器：不讀任何遊戲狀態
export const OUT_KW = [['外放', 3], ['人堆', 3], ['閒聊', 2], ['陪著說話', 2], ['切磋過招', 2], ['打獵守柵', 2], ['守柵退敵', 1], ['剿寨', 1], ['餘黨', 1]];
export const IN_KW = [['沉靜', 3], ['埋頭', 3], ['苦練', 2], ['打坐參悟', 2], ['田裡', 2], ['灶邊', 2], ['工地', 1]];
export function classify(text) {
  const head = text.split('。')[0], sc = (kw) => kw.reduce((a, [k, w]) => a + (head.includes(k) ? w * (head.indexOf(k) < head.length / 2 ? 1.5 : 1) : 0), 0);
  return sc(OUT_KW) > sc(IN_KW) ? 'out' : 'in';
}
test('M1 傳記文字分辨外放／內斂 ≥ 90%（48 種子 × 30 日）', { timeout: 770000 }, async () => {
  const seeds = Array.from({ length: 48 }, (_, i) => 1001 + i), chunks = Array.from({ length: 8 }, (_, k) => seeds.filter((_, i) => i % 8 === k));
  const res = (await Promise.all(chunks.map((c) => ex(process.execPath, [W, ...c.map(String)], { env: { ...process.env, SS_DT: process.env.SS_DT || '0.25' }, maxBuffer: 64 << 20 })))).flatMap((r) => JSON.parse(r.stdout));
  const ok = res.filter((r) => classify(r.text) === r.truth).length, acc = ok / res.length;
  const nOut = res.filter((r) => r.truth === 'out').length;
  console.log(`bio-classifier: ${ok}/${res.length} = ${(acc * 100).toFixed(1)}%（真值外放 ${nOut}、內斂 ${res.length - nOut}）`);
  assert.ok(nOut >= res.length * 0.15 && nOut <= res.length * 0.85, '樣本要兩類都有，否則準確率沒意義');
  assert.ok(acc >= 0.9, `準確率 ${(acc * 100).toFixed(1)}% < 90%`);
});
