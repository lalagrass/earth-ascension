// N36/N37 真遊戲 Canvas 截圖：固定狀態只用共用受力函式，畫面仍由 main.mjs 繪製。
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const {chromium}=await import(process.env.PW||'playwright-core');
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const mime={'.html':'text/html','.mjs':'text/javascript','.css':'text/css','.png':'image/png','.jpg':'image/jpeg','.json':'application/json','.svg':'image/svg+xml','.woff2':'font/woff2'};
const server=http.createServer((req,res)=>{
  const file=path.resolve(root,'.'+decodeURIComponent(new URL(req.url,'http://localhost').pathname));
  if(!file.startsWith(root+path.sep)){res.writeHead(403);res.end();return;}
  fs.readFile(file,(err,bytes)=>{if(err){res.writeHead(404);res.end();return;}res.writeHead(200,{'content-type':mime[path.extname(file)]||'application/octet-stream'});res.end(bytes);});
});
let browser;
try{
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  browser=await chromium.launch({executablePath:'/usr/bin/chromium',headless:true,args:['--no-sandbox']});
  const page=await browser.newPage({viewport:{width:1600,height:900},deviceScaleFactor:2});
  const errors=[];page.on('pageerror',e=>errors.push(String(e)));
  await page.goto(`http://127.0.0.1:${server.address().port}/index.html`);
  await page.waitForSelector('#start');await page.click('[data-tab=classic]');await page.click('[data-hero=guojing]');await page.click('[data-comp=huangrong]');await page.click('#st-go');await page.waitForFunction(()=>!!window.__sect?.S);
  const setup=await page.evaluate(async()=>{
    const {COVERS}=await import('/src/tactics.mjs');
    const s=window.__sect.S;window.__sect.speed=0;
    const d=s.ds[1]||s.ds[0],c=COVERS.find(x=>x.id==='guardTree');s.featureShotActorId=d.id;d.pos=[...c.stand];d.path=[];d.task=null;d.anim=null;d.face=1;s.mons=Array.from({length:4},(_,i)=>({k:'dog',uid:`dog${i}`,hp:14,max:14,pos:[d.pos[0]+20+i,d.pos[1]+i*12],path:[],intentTarget:d.id}));s.fx=[];s.t=20;
    window.__sect.panel();return {actor:d.name,position:d.pos,cover:c.id,dogs:s.mons.map(x=>x.pos)};
  });
  await page.waitForTimeout(120);
  const dir=path.join(root,'artifacts/round9b');fs.mkdirSync(dir,{recursive:true});
  const coverClip={x:860,y:110,width:330,height:310};
  await page.screenshot({path:path.join(dir,'cover.png'),clip:coverClip});
  const contact=await page.evaluate(async()=>{
    const {contactImpact}=await import('/src/contact.mjs');const {BODY_MOVES}=await import('/src/starter-combat.mjs');
    const s=window.__sect.S,d=s.ds.find(x=>x.id===s.featureShotActorId),dog=s.mons[0];
    d.pos=[850,400];d.face=1;dog.pos=[875,400];s.mons=[dog];
    const out=contactImpact(s,d,dog,{move:BODY_MOVES.find(x=>x.id==='bodyKick'),force:22,armor:2});window.__sect.panel();return {layer:out.layer,pressure:out.pressure,knock:out.knock,wound:dog.wounds?.[0],fx:s.fx.at(-1)?.kind};
  });
  await page.waitForTimeout(70);await page.screenshot({path:path.join(dir,'contact.png'),clip:{x:460,y:250,width:510,height:370}});
  await page.close();if(errors.length)throw Error(errors.join('\n'));
  console.log(JSON.stringify({setup,contact,images:['cover.png','contact.png']}));
}finally{await browser?.close();await new Promise(resolve=>server.close(resolve));}
