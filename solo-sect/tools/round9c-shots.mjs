// Capture the real N50/N38 cards in the running game, without changing the save.
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
  const page=await browser.newPage({viewport:{width:1440,height:900},deviceScaleFactor:2});
  const errors=[];page.on('pageerror',e=>errors.push(String(e.stack||e)));
  await page.goto(`http://127.0.0.1:${server.address().port}/index.html`);
  await page.waitForSelector('#start');await page.click('[data-tab=classic]');await page.click('[data-hero=guojing]');await page.click('#st-go');await page.waitForFunction(()=>!!window.__sect?.S);
  await page.evaluate(()=>{window.__sect.speed=0;window.__sect.panel();window.__sect.freeze=true;});
  const dir=path.join(root,'artifacts/round9c');fs.mkdirSync(dir,{recursive:true});
  await page.locator('#ds').evaluate(el=>{el.classList.remove('folded');el.style.display='block';});
  const people=await page.locator('#ds').innerText();
  await page.locator('#ds').screenshot({path:path.join(dir,'people.png')});
  await page.click('[data-rail=journey]');
  await page.locator('#exp').evaluate(el=>{el.classList.remove('folded');el.style.display='block';});
  const admission=await page.locator('#exp').innerText();
  await page.locator('#exp .k').filter({hasText:'名俠奇遇'}).last().screenshot({path:path.join(dir,'admission.png')});
  await page.close();if(errors.length)throw Error(errors.join('\n'));
  console.log(JSON.stringify({people:people.slice(0,900),admission,images:['people.png','admission.png']}));
}finally{await browser?.close();await new Promise(resolve=>server.close(resolve));}
