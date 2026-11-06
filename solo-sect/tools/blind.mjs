// 零相依、只準備真資料。此CLI不啟動或操控瀏覽器；錄影由正常頁面中的真人操作。
import {mkdir,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import path from 'node:path';
import {options,growthSnapshots} from './growth-scenario.mjs';
if(process.argv.some(a=>a==='--url'||a.startsWith('--url=')))throw Error('--url不再使用：CLI只準備資料，請在正常UI匯入A/B並由真人按錄影。');
const {seed,get}=options(),action=get('action','train'),out=path.resolve(get('out','out/blind'));
if(!['train','chop','water'].includes(action))throw Error('--action需train/chop/water');
await mkdir(out,{recursive:true});
const result=growthSnapshots(seed,[1,60]),swap=createHash('sha256').update('solo-sect-blind:'+seed).digest()[0]%2;
await writeFile(path.join(out,'metrics.json'),JSON.stringify(result,null,2));
for(let i=0;i<2;i++){
 const snapshot=result.snapshots[i^swap],label=i?'B':'A';
 await writeFile(path.join(out,label+'.json'),JSON.stringify({format:'solo-sect-growth-input-v1',label,action,clock:result.clock,hero:snapshot.hero,provenance:{seed,eventHash:snapshot.eventHash,events:snapshot.events}},null,2));
}
await writeFile(path.join(out,'key.txt'),`seed=${seed} action=${action}\nA=第${result.snapshots[swap].day}天\nB=第${result.snapshots[1^swap].day}天\n只準備真snapshot；尚無影片或真人結果。先記三處差異再開本檔。\n`);
console.log(JSON.stringify({seed,action,out,prepared:['A.json','B.json','metrics.json','key.txt'],videosCreated:0,humanBlindTest:'NOT_RUN',next:'正常UI紀錄→離線成長盲測驗收，匯入A.json/B.json各按錄製10秒下載WebM；不要開key給受測者。'},null,2));
