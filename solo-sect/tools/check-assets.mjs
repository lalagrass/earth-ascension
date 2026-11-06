// 明確逐檔授權表；新素材不可靠萬用字元自動繼承授權。
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root = fileURLToPath(new URL('../assets/', import.meta.url));
const allowed = new Set(['CC0', 'OFL', 'CC BY', 'MIT', 'zlib', '本倉自製', '本倉研究再利用']);
const files = (dir) => fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
  const p = path.join(dir, e.name); if (e.isSymbolicLink()) throw Error(`不接受符號連結：${p}`);
  return e.isDirectory() ? files(p) : [p];
});
const all = files(root), records = new Map(), errors = [];
for (const ledger of all.filter((p) => path.basename(p) === 'LICENSES.md')) {
  for (const line of fs.readFileSync(ledger, 'utf8').split('\n')) {
    const match = line.match(/^\|\s*`([^`]+)`\s*\|([^|]+)\|\s*([^|]+)\|/);
    if (!match) continue;
    const [, file, source, license] = match, full = path.resolve(path.dirname(ledger), file);
    if (!full.startsWith(root) || !fs.existsSync(full) || !fs.statSync(full).isFile()) continue;
    if (allowed.has(license.trim()) && source.trim()) records.set(full, license.trim());
  }
}
for (const file of all) if (!records.has(file)) errors.push(`${path.relative(root, file)} 缺逐檔來源與允許授權`);
const portraits = all.filter((p) => p.startsWith(path.join(root, 'portraits') + path.sep));
const bytes = portraits.reduce((n, p) => n + fs.statSync(p).size, 0);
if (bytes > 12000000) errors.push(`portraits ${bytes} bytes > 12000000`);
for (const p of portraits.filter((p) => p.endsWith('.png'))) {
  const b = fs.readFileSync(p), w = b.readUInt32BE(16), h = b.readUInt32BE(20);
  if (Math.max(w, h) > 512) errors.push(`${path.relative(root,p)} ${w}x${h} > 512`);
}
if (fs.existsSync(path.join(root, 'portraits/old'))) errors.push('portraits/old 必須刪除');
if (errors.length) { console.error(errors.join('\n')); process.exitCode = 1; }
else console.log(`assets OK: ${all.length}/${all.length} licensed; portraits ${bytes} bytes <= 12000000; longest side <= 512; old absent`);
