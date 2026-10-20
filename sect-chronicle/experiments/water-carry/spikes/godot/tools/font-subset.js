#!/usr/bin/env node
// Godot 的 Web 版不能用系統字型，介面中文要隨專案帶字型。這支腳本收集 scene.json 與 .gd 檔裡用到的字，
// 向 Google Fonts 取 Noto Sans TC（SIL OFL 1.1）只含這些字的子集 woff2，寫到 fonts/ui-subset.woff2。
// 改了介面文字就重跑。用法（在 spikes/godot 下）：node tools/font-subset.js
'use strict';
const fs = require('fs');
const path = require('path');
const https = require('https');

const root = path.resolve(__dirname, '..');
const sources = [path.join(root, '../shared/scene.json'), ...fs.readdirSync(root).filter((f) => f.endsWith('.gd')).map((f) => path.join(root, f))];
const chars = new Set('0123456789%×·・：；，。（）／↑↓');
for (const f of sources) for (const ch of fs.readFileSync(f, 'utf8')) if (ch.codePointAt(0) > 32) chars.add(ch);
const text = [...chars].sort().join('');
const UA = 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0 Safari/537.36';
const get = (url) => new Promise((ok, bad) => https.get(url, { headers: { 'User-Agent': UA } }, (res) => {
  const b = []; res.on('data', (d) => b.push(d)); res.on('end', () => (res.statusCode === 200 ? ok(Buffer.concat(b)) : bad(new Error(`${res.statusCode} ${url}`))));
}).on('error', bad));
(async () => {
  const css = (await get(`https://fonts.googleapis.com/css2?family=Noto+Sans+TC:wght@400&text=${encodeURIComponent(text)}`)).toString();
  const url = css.match(/url\((https:[^)]+)\)/)[1];
  const font = await get(url);
  fs.writeFileSync(path.join(root, 'fonts/ui-subset.woff2'), font);
  console.log(`${chars.size} 字，woff2 ${(font.length / 1024).toFixed(1)} KB`);
})().catch((e) => { console.error(e.message); process.exit(1); });
