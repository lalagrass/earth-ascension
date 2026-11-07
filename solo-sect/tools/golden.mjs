#!/usr/bin/env node
// R0（#388）行為鎖定：固定種子矩陣雜湊與舊版存檔回放。
// 用法（在 solo-sect/ 下）：
//   node tools/golden.mjs --check [--tier quick|full|saves|all]   比對 test/golden/*.json，有差異 exit 1
//   node tools/golden.mjs --write [--tier ...]                    重產；只有明列行為變更的 PR 才可用，PR 須寫明改了哪些鍵與原因
//   node tools/golden.mjs --only bot-1001-emei                    只跑一格（除錯用）
// full 層 32 局 × 30 日（dt 0.5），以子行程平行跑，4 核約 5 分鐘。
import fs from 'node:fs';
import os from 'node:os';
import { fork } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const HERE = fileURLToPath(import.meta.url);
const DIR = new URL('../test/golden/', import.meta.url);
const argv = process.argv.slice(2), flag = (k) => argv.includes(k), opt = (k, d) => { const i = argv.indexOf(k); return i >= 0 ? argv[i + 1] : d; };

const S = await import('../test/golden/scenarios.mjs');

if (flag('--worker')) { // 子行程：收一格、回雜湊
  process.on('message', (c) => { process.send({ key: c.key, got: S.runCase(c) }); });
} else {
  const mode = flag('--write') ? 'write' : 'check', tier = opt('--tier', 'all'), only = opt('--only', null);
  const tiers = tier === 'all' ? ['quick', 'full', 'saves', 'hermitage'] : [tier];
  let bad = 0;
  for (const t of tiers) bad += t === 'saves' ? doSaves(mode) : await doTier(t, mode, only);
  console.log(bad ? `\n✗ ${bad} 格不符` : '\n✓ 全部相符');
  process.exit(bad ? 1 : 0);
}

function readJson(name) { const u = new URL(name, DIR); return fs.existsSync(u) ? JSON.parse(fs.readFileSync(u, 'utf8')) : null; }
function sortKeys(o) { return Object.fromEntries(Object.keys(o).sort().map((k) => [k, o[k]])); }
function writeJson(name, obj) { if (obj.runs) obj.runs = sortKeys(obj.runs); fs.writeFileSync(new URL(name, DIR), JSON.stringify(obj, null, 1) + '\n'); }

function compare(label, want, got) {
  const same = JSON.stringify(want) === JSON.stringify(got);
  console.log(`${same ? 'ok  ' : 'DIFF'} ${label}${same ? '' : `\n     want ${JSON.stringify(want)}\n     got  ${JSON.stringify(got)}`}`);
  return same ? 0 : 1;
}

async function doTier(tier, mode, only) {
  const cases = S.casesOf(tier).filter((c) => !only || c.key === only), file = `${tier}.json`, want = readJson(file)?.runs || {};
  const t0 = Date.now(), got = await pool(cases);
  console.log(`# ${tier}：${cases.length} 格，${((Date.now() - t0) / 1000).toFixed(0)} 秒`);
  if (mode === 'write') { const prev = readJson(file)?.runs || {}; writeJson(file, { tier, ...S.TIERS[tier], runs: { ...prev, ...got } }); console.log(`寫入 test/golden/${file}`); return 0; }
  let bad = 0; for (const c of cases) bad += compare(c.key, want[c.key], got[c.key]); return bad;
}

function doSaves(mode) {
  const files = fs.readdirSync(new URL('saves/', DIR)).filter((f) => f.endsWith('.json')).sort(), got = {};
  for (const f of files) got[f] = S.replaySave(fs.readFileSync(new URL(`saves/${f}`, DIR), 'utf8'));
  if (mode === 'write') { writeJson('saves.json', got); console.log('寫入 test/golden/saves.json'); return 0; }
  const want = readJson('saves.json') || {}; let bad = 0; for (const f of files) bad += compare(`save ${f}`, want[f], got[f]); return bad;
}

function pool(cases) {
  const n = Math.max(1, Math.min(cases.length, os.availableParallelism?.() || os.cpus().length)), out = {}, queue = [...cases];
  return new Promise((resolve, reject) => {
    let live = 0; if (!queue.length) return resolve(out);
    for (let i = 0; i < n; i++) {
      const w = fork(HERE, ['--worker']); live++;
      const next = () => { const c = queue.shift(); if (c) w.send(c); else w.kill(); };
      w.on('message', (m) => { out[m.key] = m.got; next(); });
      w.on('exit', (code) => { if (code && queue.length) reject(new Error(`worker exit ${code}`)); if (--live === 0) resolve(out); });
      next();
    }
  });
}
