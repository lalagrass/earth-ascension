// 公開短對刀史：所有角色真工作拿工具、真自修，再公開邀請對練；不造師父/灌n/f。
import {createState,tick,setOrder,clone} from '../src/sim.mjs';
import {ALL_ON} from '../test/harness/bot.mjs';
import {writeFile,mkdir} from 'node:fs/promises';
import path from 'node:path';
const args=process.argv.slice(2),get=(k,d)=>{const i=args.indexOf('--'+k);return i<0?d:args[i+1];},seed=Number(get('seed',17));
if(!Number.isSafeInteger(seed))throw Error('seed需整數');
const s=createState(seed,{kind:'bare',mbti:'ISTJ',askMajor:false,...ALL_ON});s.captureEvents=true;
const orders=[],events=[],seen=new WeakSet(),traces=[];
const command=(id,act)=>orders.push({t:s.t,id,act,result:setOrder(s,id,act)});
for(const d of s.ds)command(d.id,'chop');
let stage=0;
while(s.t<400){
 if(stage===0&&s.ds.every(d=>d.tools?.knife)){for(const d of s.ds)command(d.id,'train');stage=1;}
 if(stage===1&&s.t>=200){for(const d of s.ds)if(d.id!=='hero')command(d.id,null);command('hero','spar');stage=2;}
 tick(s,.25);s.alert=null;
 for(const e of s.events||[])if(!seen.has(e)){seen.add(e);events.push(clone(e));}
 if(s.ds.some(d=>d.swing?.practice))traces.push({t:s.t,actors:s.ds.map(d=>({id:d.id,pos:[...d.pos],path:clone(d.path),task:clone(d.task),swing:clone(d.swing),energy:d.needs.energy,eyes:clone(d.practice?.eyes)}))});
}
const hero=s.ds.find(d=>d.id==='hero'),drills=events.filter(e=>e.type==='drill'),incoming=drills.filter(e=>e.student==='hero'&&e.move==='toolKnife');
const result={seed,scenario:'受控公開短史：全員砍柴取真刀→自修到t200→解除同伴指派→主角邀請真對練；無改n/f/HP/資源或生成角色；human:toolKnife不冒充bandit:looterBlade',orders,drills,incoming,heroEyes:hero.practice?.eyes,pass:incoming.some(e=>e.eyeGain>0),events,traces};
const file=get('out',null);if(file){await mkdir(path.dirname(path.resolve(file)),{recursive:true});await writeFile(file,JSON.stringify(result,null,2));}
console.log(JSON.stringify({...result,events:undefined,traces:undefined},null,2));if(!result.pass)process.exitCode=1;
