// 作者不得在目前預覽連線阻擋下改host或啟動此工具繞過；由parent於桌面通路恢復後執行。
import {mkdir,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import path from 'node:path';
import {options,growthSnapshots} from './growth-scenario.mjs';
const {seed,get}=options(), url=get('url','http://localhost:8814/solo-sect/tools/growth-preview.html'),action=get('action','train');
if(!['train','chop','water'].includes(action))throw Error('--action需train/chop/water');
const out=path.resolve('out/blind');await mkdir(out,{recursive:true});
let chromium;try{({chromium}=await import('playwright'));}catch{throw Error('需要review環境既有Playwright與Chromium；不在遊戲新增依賴。請由parent處理正常測試工具環境，不改host重試。');}
const result=growthSnapshots(seed,[1,60]),swap=createHash('sha256').update('solo-sect-blind:'+seed).digest()[0]%2;
await writeFile(path.join(out,'metrics.json'),JSON.stringify(result,null,2));
// 本機Playwright是issue明列驗收工具，不屬遊戲依賴；目前worker僅提供程式，未執行錄影。
const browser=await chromium.launch({headless:true});
try{for(let i=0;i<2;i++){
  const which=i^swap,ctx=await browser.newContext({viewport:{width:640,height:480},recordVideo:{dir:path.join(out,'raw'),size:{width:640,height:480}}});
  const page=await ctx.newPage();
  try{
    await page.addInitScript(value=>{window.growthInput=value;},{hero:result.snapshots[which].hero,clock:result.clock,action});
    await page.route('**/*',route=>new URL(route.request().url()).origin===new URL(url).origin?route.continue():route.abort());
    await page.goto(url);await page.waitForFunction(()=>window.previewReady===true);
    await page.evaluate(()=>window.startGrowthPreview());await page.waitForTimeout(10_000);
    const video=page.video();await ctx.close();await video.saveAs(path.join(out,i?'B.webm':'A.webm'));
  }catch(e){await ctx.close();throw e;}
}
await writeFile(path.join(out,'key.txt'),`seed=${seed} action=${action}\nA=第${result.snapshots[swap].day}天\nB=第${result.snapshots[1^swap].day}天\n先記三處差異再開此檔。\n`);
console.log('已錄A.webm/B.webm，各含至少10秒同一動作；key.txt另檔。需真人盲測，不代表已通過。');
}finally{await browser.close();}
