// PW=/opt/codex/cua_node/lib/node_modules/playwright-core/index.mjs node tools/n60-blind-board.mjs --seed=17
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const { chromium } = await import(process.env.PW || 'playwright-core');
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const seed=Number(process.argv.find(x=>x.startsWith('--seed='))?.slice(7)??17);
if(!Number.isSafeInteger(seed)||seed<1)throw Error('--seed must be a positive integer');
const out=path.join(root,'artifacts/n60');fs.mkdirSync(out,{recursive:true});
const mime={'.html':'text/html','.mjs':'text/javascript','.css':'text/css','.png':'image/png','.jpg':'image/jpeg','.json':'application/json','.svg':'image/svg+xml','.woff2':'font/woff2'};
const server=http.createServer((req,res)=>{const file=path.resolve(root,'.'+decodeURIComponent(new URL(req.url,'http://localhost').pathname));if(!file.startsWith(root+path.sep)){res.writeHead(403);res.end();return;}fs.readFile(file,(err,bytes)=>{if(err){res.writeHead(404);res.end();return;}res.writeHead(200,{'content-type':mime[path.extname(file)]||'application/octet-stream'});res.end(bytes);});});
let browser;
try{
  await new Promise(ok=>server.listen(0,'127.0.0.1',ok));
  browser=await chromium.launch({executablePath:process.env.CHROME||'/usr/bin/chromium',headless:true,args:['--no-sandbox']});
  const page=await browser.newPage({viewport:{width:1600,height:900},deviceScaleFactor:1});
  const errors=[];page.on('pageerror',e=>errors.push(String(e.stack||e)));
  await page.addInitScript((s)=>{Date.now=()=>s;},seed);
  await page.goto(`http://127.0.0.1:${server.address().port}/index.html`);
  await page.waitForSelector('#st-go');await page.click('#st-go');await page.waitForFunction(()=>!!window.__sect?.S);
  const setup=await page.evaluate(async()=>{
    const {NODES}=await import('./src/data.mjs');const S=window.__sect.S;
    window.__sect.speed=0;window.__sect.freeze=true;window.__setZoom('near');
    const people=S.ds.filter(d=>['hero','origin-1','origin-2'].includes(d.id));
    for(const [i,d] of people.entries()){d.away=false;d.pos=[NODES.yard[0]+(i-1)*84,NODES.yard[1]+45];d.at='yard';d.path=[];d.task=null;}
    window.__sect.focusOn('hero');return people.map(d=>({id:d.id,name:d.name,sprite:d.sprite}));
  });
  if(setup.length!==3)throw Error(`expected 3 people, got ${setup.length}`);
  const frame=()=>page.evaluate(()=>new Promise(ok=>requestAnimationFrame(()=>requestAnimationFrame(ok))));
  const shot=async(name)=>{await frame();const data=await page.evaluate(async()=>{const {HOME}=await import('./src/world.mjs'),map=document.querySelector('#map'),hero=window.__sect.S.ds.find(d=>d.id==='hero'),cam=window.__cam;const sx=800+(hero.pos[0]+HOME.x-cam.x)*cam.z,sy=450+(hero.pos[1]+HOME.y-cam.y)*cam.z;const left=Math.max(0,Math.min(map.width-600,sx-300)),top=Math.max(0,Math.min(map.height-300,sy-190));const cut=document.createElement('canvas');cut.width=600;cut.height=300;cut.getContext('2d').drawImage(map,left,top,600,300,0,0,600,300);return cut.toDataURL('image/webp',.95);});fs.writeFileSync(path.join(out,name),Buffer.from(data.split(',')[1],'base64'));};
  await shot('three-named.webp');
  await page.evaluate(()=>{for(const d of window.__sect.S.ds)if(['hero','origin-1','origin-2'].includes(d.id))d.name='';});
  await shot('three-blind.webp');
  if(errors.length)throw Error(errors.join('\n'));
  fs.writeFileSync(path.join(out,'blind-answer.json'),JSON.stringify({seed,leftToRight:setup},null,2)+'\n');
  console.log(JSON.stringify({seed,people:setup,files:['three-named.webp','three-blind.webp','blind-answer.json']}));
}finally{await browser?.close();await new Promise(ok=>server.close(ok));}
