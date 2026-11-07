// PW=/path/to/playwright-core/index.mjs node tools/n59-blind-board.mjs --base=/tmp/n59-baseline-17 --seed=17
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
const { chromium } = await import(process.env.PW || 'playwright-core');
const home = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const option = (key) => process.argv.find((a) => a.startsWith(`--${key}=`))?.slice(key.length + 3);
const base = path.resolve(option('base') || '/tmp/n59-baseline-17'), out = path.resolve(option('out') || path.join(home, 'artifacts/n59'));
const seed = Number(option('seed') || 17);
const headRows = JSON.parse(fs.readFileSync(path.join(out, 'visual-check.json')));
const baseRows = JSON.parse(fs.readFileSync(path.join(base, 'visual-check.json')));
if (headRows.seed !== seed || baseRows.seed !== seed) throw Error('base/head seed mismatch');
const common = new Set(baseRows.observed.map((r) => r.label));
const preferred = ['idle-none','train-do','farm-do','eat-do','chat-do','rest-do'];
const names = preferred.filter((name) => common.has(name) && headRows.observed.some((r) => r.label === name));
if (names.length < 3) throw Error('fewer than three shared day-one states');
const headFirst = (crypto.createHash('sha256').update(`N59:${seed}`).digest()[0] & 1) === 0;
const cols = headFirst ? ['head','base'] : ['base','head'];
const image = (dir, name) => fs.readFileSync(path.join(dir, 'states', `${name}.webp`)).toString('base64');
const svg = [`<svg xmlns="http://www.w3.org/2000/svg" width="900" height="${names.length * 315 + 40}" viewBox="0 0 900 ${names.length * 315 + 40}">`,
  '<rect width="100%" height="100%" fill="#e9ddc4"/>',
  '<text x="8" y="28" font-size="24" fill="#33251a">N59 第一天：A / B 盲看人物畫法</text>'];
for (let i = 0; i < names.length; i++) {
  const y = i * 315 + 40; svg.push(`<text x="8" y="${y + 19}" font-size="18" fill="#33251a">${names[i]}</text>`);
  for (let c = 0; c < 2; c++) {
    const folder = cols[c] === 'head' ? out : base, x = c * 450 + 5;
    svg.push(`<text x="${x + 370}" y="${y + 19}" font-size="18" fill="#33251a">${c ? 'B' : 'A'}</text>`);
    svg.push(`<image x="${x}" y="${y + 25}" width="440" height="280" href="data:image/webp;base64,${image(folder, names[i])}"/>`);
  }
}
svg.push('</svg>');
fs.writeFileSync(path.join(out, 'blind-answers.json'), JSON.stringify({ seed, A: cols[0], B: cols[1], states: names }, null, 2) + '\n');
const browser = await chromium.launch({ executablePath: process.env.CHROME || '/usr/bin/chromium', headless: true, args: ['--no-sandbox'] });
try {
  const page = await browser.newPage({ viewport: { width: 920, height: 900 }, deviceScaleFactor: 1 });
  await page.setContent(svg.join('\n'));
  await page.locator('svg').screenshot({ path: path.join(out, 'blind-board.png') });
} finally { await browser.close(); }
console.log(JSON.stringify({ seed, states: names, board: path.join(out, 'blind-board.png'), answers: path.join(out, 'blind-answers.json') }));
