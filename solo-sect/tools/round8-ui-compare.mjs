import { chromium } from '/opt/codex/cua_node/lib/node_modules/playwright-core/index.mjs';
import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path';
const root = path.resolve('.');
const server = http.createServer((req,res)=>{ const file=path.resolve(root,'.'+decodeURIComponent(new URL(req.url,'http://localhost').pathname)); if(!file.startsWith(root+path.sep)){res.writeHead(403);res.end();return;} fs.readFile(file,(err,b)=>{if(err){res.writeHead(404);res.end();return;} res.writeHead(200,{'content-type':({'.html':'text/html','.png':'image/png','.css':'text/css'})[path.extname(file)]||'text/plain'});res.end(b);});});
await new Promise((r)=>server.listen(0,'127.0.0.1',r));
const browser = await chromium.launch({ executablePath: '/usr/bin/chromium', headless: true, args: ['--no-sandbox'] });
try { const page = await browser.newPage({ viewport: { width: 1440, height: 440 }, deviceScaleFactor: 1 }); await page.goto(`http://127.0.0.1:${server.address().port}/artifacts/round8/ui-candidates/compare.html`); await page.screenshot({ path: 'artifacts/round8/ui-three-way.png' }); console.log('artifacts/round8/ui-three-way.png'); } finally { await browser.close(); await new Promise((r)=>server.close(r)); }
