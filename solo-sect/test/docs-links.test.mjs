// #389 文件連結檢查：常青文件裡的相對連結與 .mjs 引用都要指得到東西。
// 不檢查 docs/reports/、docs/decisions/、loop/LOG.md（歷史紀錄，照原樣保留）。
// 舊模組名（loop144 合併前）只有在同一行也寫出現在的模組時才允許，對照表在 docs/architecture/MODULES.md §3。
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const rel = (p) => path.relative(ROOT, p);
const walk = (dir, out = []) => { for (const e of fs.readdirSync(dir, { withFileTypes: true })) { if (e.name === 'node_modules' || e.name.startsWith('.')) continue; const p = path.join(dir, e.name); if (e.isDirectory()) walk(p, out); else out.push(p); } return out; };
const ALL = walk(ROOT), BASENAMES = new Set(ALL.map((p) => path.basename(p)));
const mdIn = (d) => ALL.filter((p) => p.startsWith(path.join(ROOT, d) + path.sep) && p.endsWith('.md'));
export const LIVING = ['README.md', 'ROADMAP.md', 'FEATURES.md', 'loop/AGENTS-DOC-GUIDE.md', 'loop/DECISIONS.md'].map((f) => path.join(ROOT, f))
  .concat([path.join(ROOT, 'docs/README.md')], mdIn('docs/architecture'), mdIn('docs/systems'));

const LEGACY = Object.fromEntries([...fs.readFileSync(path.join(ROOT, 'docs/architecture/MODULES.md'), 'utf8').matchAll(/^\| `([a-z0-9-]+\.mjs)` \| `([a-z0-9-]+\.mjs)` \|$/gm)].map((m) => [m[1], m[2]]));
const OTHER_BRANCH = new Set(['patrol-pip.mjs']); // PATROL-MAP.md 引用的是另一個分支的檔案，該行已寫明
const PLACEHOLDER = new Set(['xxx.mjs']);

test('對照表有內容（MODULES.md §3）', () => { assert.ok(Object.keys(LEGACY).length >= 40); for (const now of Object.values(LEGACY)) assert.ok(fs.existsSync(path.join(ROOT, 'src', now)), now); });

for (const file of LIVING) test(`文件連結：${rel(file)}`, () => {
  const lines = fs.readFileSync(file, 'utf8').split('\n'), bad = [];
  lines.forEach((line, i) => {
    for (const m of line.matchAll(/\]\(([^)\s]+)\)/g)) {
      const target = m[1].split('#')[0]; if (!target || /^[a-z]+:/i.test(target)) continue;
      if (!fs.existsSync(path.resolve(path.dirname(file), decodeURI(target)))) bad.push(`${i + 1}: 連結 ${m[1]}`);
    }
    for (const m of line.matchAll(/[A-Za-z0-9_./-]*?([A-Za-z0-9_-][A-Za-z0-9_.-]*\.mjs)\b/g)) {
      const name = path.basename(m[0]); if (name.startsWith('.') || BASENAMES.has(name) || OTHER_BRANCH.has(name) || PLACEHOLDER.has(name)) continue;
      if (LEGACY[name] && line.includes(LEGACY[name])) continue;
      bad.push(`${i + 1}: ${name}${LEGACY[name] ? `（已併入 ${LEGACY[name]}，同一行要寫出來）` : ' 不存在'}`);
    }
  });
  assert.deepEqual(bad, []);
});
