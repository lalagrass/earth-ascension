// N35：沿 bot12 的公開日程跑真世界，列各種子首次悟招日。未篩敵，不冒充「只打弱敵」。
import {createState,tick,startHunt} from '../src/sim.mjs';
import {DAY} from '../src/data.mjs';
import {ALL_ON,botDaily} from '../test/harness/bot.mjs';
import {sectOfSeed} from '../test/golden/scenarios.mjs';
import {TECHNIQUES} from '../src/techniques.mjs';
const args=process.argv.slice(2),arg=(key,fallback)=>{const row=args.find(x=>x.startsWith(`--${key}=`));return row?Number(row.slice(key.length+3)):fallback;};
const one=arg('seed',null),days=arg('days',60),wu=arg('wu',2),huntEvery=arg('hunt-every',0);
if((one!==null&&(!Number.isSafeInteger(one)||one<0))||!Number.isSafeInteger(days)||days<1||![2,3].includes(wu))throw Error('seed 與 days 須為正整數；wu 可選 2 或 3');
const seeds=one===null?Array.from({length:12},(_,i)=>1001+i):[one],rows=[];
for(const seed of seeds){
  const sect=sectOfSeed(seed),s=createState(seed,{kind:'custom',answers:Array(9).fill(0),askMajor:false,...ALL_ON,v22:true,...(wu===3?{stats:{wu:3,gen:2,li:2,shen:2,ding:2,fu:1}}:{}),...(sect?{sect24:sect}:{})});
  s.captureTechniqueContexts=true;s.captureEvents=true;
  let day=s.day,boarVisible=0,boarCharges=0,boarDodges=0,heroBoarDodges=0,hunts=0;const boarMoves={},seenEvents=new WeakSet();
  const daily=[],lastContexts={},gainsByDay=new Map(),lastProgress=new Map(),progressResets=[];
  const snapshot=(finishedDay)=>{
    const hero=s.ds.find(d=>d.id==='hero'),contexts={};
    for(const d of s.ds){const id=d.id,prior=lastProgress.get(id)||{},current=d.glimmer?.progress||{};
      for(const [move,n] of Object.entries(prior))if((current[move]||0)<n-1e-9)progressResets.push({day:finishedDay,who:id,move,before:n,after:current[move]||0});
      lastProgress.set(id,{...current});
    }
    for(const row of TECHNIQUES){const cur=s.techniqueContextCounts?.[row.id]||{},prev=lastContexts[row.id]||{};
      contexts[row.id]=Object.fromEntries(['seen','lost','heroSeen','heroLost'].map(k=>[k,(cur[k]||0)-(prev[k]||0)]));
      lastContexts[row.id]={...cur};
    }
    const peak=s.ds.flatMap(d=>Object.entries(d.glimmer?.progress||{}).map(([id,n])=>{const row=TECHNIQUES.find(r=>r.id===id),threshold=row?.difficulty/(d.wu||d.root||3);return {who:d.id,move:id,progress:n,threshold,ratio:n/threshold};})).sort((a,b)=>b.ratio-a.ratio)[0]||null;
    daily.push({day:finishedDay,contexts,heroProgress:{...(hero?.glimmer?.progress||{})},heroKnown:[...(hero?.glimmer?.known||[])],gains:gainsByDay.get(finishedDay)||{count:0,w:0,heroCount:0,heroW:0},peak});
  };
  for(let i=1;i<=days*DAY/6;i++){
    if(s.band||s.hunt)for(let j=0;j<24;j++)tick(s,.25);else tick(s,6);
    if(s.mons?.some(m=>m.k==='boar'))boarVisible++;
    for(const e of s.events||[]){if(seenEvents.has(e))continue;seenEvents.add(e);if(e.type==='exchange'){if(e.move?.startsWith('boar')||e.move==='survivorFeint')boarMoves[e.move]=(boarMoves[e.move]||0)+1;if(e.move==='boarCharge'){boarCharges++;if(e.kind==='dodge'){boarDodges++;if(e.defender==='hero')heroBoarDodges++;}}}
      if(e.type==='glimmerProgress'){const row=gainsByDay.get(e.day)||{count:0,w:0,heroCount:0,heroW:0};row.count++;row.w+=e.w;if(e.who==='hero'){row.heroCount++;row.heroW+=e.w;}gainsByDay.set(e.day,row);}}
    if(s.alert)s.alert=null;
    if(s.day!==day){snapshot(day);day=s.day;botDaily(s);if(huntEvery&&s.day%huntEvery===0&&!s.hunt){const team=s.ds.filter(d=>d.role!=='laborer'&&!d.away&&d.hp>30).slice(0,3).map(d=>d.id);if(startHunt(s,team))hunts++;}}
  }
  const hero=s.ds.find(d=>d.id==='hero');
  if(daily.length!==days)throw Error(`seed ${seed}: expected ${days} daily ledger rows, got ${daily.length}`);
  for(const row of TECHNIQUES)for(const key of ['seen','lost','heroSeen','heroLost']){
    const sum=daily.reduce((n,d)=>n+(d.contexts[row.id]?.[key]||0),0),final=s.techniqueContextCounts?.[row.id]?.[key]||0;
    if(sum!==final)throw Error(`seed ${seed}: daily ${row.id}.${key} does not reconcile`);
  }
  const totalW=daily.reduce((n,d)=>n+d.gains.heroW,0),progress=Object.values(hero?.glimmer?.progress||{}).reduce((n,w)=>n+w,0);
  if(Math.abs(totalW-progress)>1e-8)throw Error(`seed ${seed}: daily hero w does not reconcile with saved progress`);
  rows.push({seed,day:s.day,wu:hero?.wu,firstDay:hero?.glimmer?.firstDay??null,known:hero?.glimmer?.known||[],progress:hero?.glimmer?.progress||{},progressResets,contexts:s.techniqueContextCounts||{},prerequisites:s.techniquePrereqCounts||{},tools:hero?.tools,stone:s.res.stone,hunts,boarVisible,boarMoves,boarCharges,boarDodges,heroBoarDodges,daily});
}
const first=rows.map(r=>r.firstDay).filter(Number.isFinite).sort((a,b)=>a-b);
const contexts=Object.fromEntries(TECHNIQUES.map(row=>[row.id,{seen:0,lost:0,heroSeen:0,heroLost:0}]));
for(const row of rows)for(const [id,count] of Object.entries(row.contexts))for(const key of Object.keys(contexts[id]))contexts[id][key]+=count[key]||0;
console.log(JSON.stringify({days,wu,huntEvery,seeds,rows,contexts,firstDays:first,medianFirstDay:first.length?first[Math.floor(first.length/2)]:null},null,2));
