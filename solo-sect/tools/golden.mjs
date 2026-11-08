#!/usr/bin/env node
// R9（#529）行為鎖定：唯一隱居局的固定種子與檢查點。
// 用法（在 solo-sect/ 下）：
//   node tools/golden.mjs --check [--tier hermitage|all]           比對 test/golden/hermitage.json，有差異 exit 1
//   node tools/golden.mjs --write [--tier ...]                    重產；只有明列行為變更的 PR 才可用，PR 須寫明改了哪些鍵與原因
//   node tools/golden.mjs --only solo-chunyang-42                  只跑一格（除錯用）
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
  const tiers = tier === 'all' ? ['hermitage'] : [tier];
  let bad = 0;
  for (const t of tiers) bad += await doTier(t, mode, only);
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
