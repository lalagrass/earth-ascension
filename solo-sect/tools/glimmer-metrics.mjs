// N35：沿 bot12 的公開日程跑真世界，列各種子首次悟招日。未篩敵，不冒充「只打弱敵」。
import {createState,tick,startHunt} from '../src/sim.mjs';
import {DAY} from '../src/data.mjs';
import {ALL_ON,botDaily} from '../test/harness/bot.mjs';
import {sectOfSeed} from '../test/golden/scenarios.mjs';
import {TECHNIQUES} from '../src/techniques.mjs';
const args=process.argv.slice(2),arg=(key,fallback)=>{const row=args.find(x=>x.startsWith(`--${key}=`));return row?Number(row.slice(key.length+3)):fallback;};
const one=arg('seed',null),days=arg('days',60),wu=arg('wu',2),huntEvery=arg('hunt-every',0);
if((one!==null&&!Number.isSafeInteger(one))||!Number.isSafeInteger(days)||days<1||![2,3].includes(wu))throw Error('seed 與 days 須為正整數；wu 可選 2 或 3');
const seeds=one===null?Array.from({length:12},(_,i)=>1001+i):[one],rows=[];
for(const seed of seeds){
  const sect=sectOfSeed(seed),s=createState(seed,{kind:'custom',answers:Array(9).fill(0),askMajor:false,...ALL_ON,v22:true,...(wu===3?{stats:{wu:3,gen:2,li:2,shen:2,ding:2,fu:1}}:{}),...(sect?{sect24:sect}:{})});
  s.captureTechniqueContexts=true;s.captureEvents=true;
  let day=s.day,boarDodges=0,heroBoarDodges=0,hunts=0;const seenEvents=new WeakSet();
  for(let i=1;i<=days*DAY/6;i++){
    if(s.band||s.hunt)for(let j=0;j<24;j++)tick(s,.25);else tick(s,6);
    for(const e of s.events||[]){if(seenEvents.has(e))continue;seenEvents.add(e);if(e.type==='exchange'&&e.move==='boarCharge'&&e.kind==='dodge'){boarDodges++;if(e.defender==='hero')heroBoarDodges++;}}
    if(s.alert)s.alert=null;
    if(s.day!==day){day=s.day;botDaily(s);if(huntEvery&&s.day%huntEvery===0&&!s.hunt){const team=s.ds.filter(d=>d.role!=='laborer'&&!d.away&&d.hp>30).slice(0,3).map(d=>d.id);if(startHunt(s,team))hunts++;}}
  }
  const hero=s.ds.find(d=>d.id==='hero');rows.push({seed,day:s.day,wu:hero?.wu,firstDay:hero?.glimmer?.firstDay??null,known:hero?.glimmer?.known||[],progress:hero?.glimmer?.progress||{},contexts:s.techniqueContextCounts||{},prerequisites:s.techniquePrereqCounts||{},tools:hero?.tools,stone:s.res.stone,hunts,boarDodges,heroBoarDodges});
}
const first=rows.map(r=>r.firstDay).filter(Number.isFinite).sort((a,b)=>a-b);
const contexts=Object.fromEntries(TECHNIQUES.map(row=>[row.id,{seen:0,lost:0,heroSeen:0,heroLost:0}]));
for(const row of rows)for(const [id,count] of Object.entries(row.contexts))for(const key of Object.keys(contexts[id]))contexts[id][key]+=count[key]||0;
console.log(JSON.stringify({days,wu,huntEvery,seeds,rows,contexts,firstDays:first,medianFirstDay:first.length?first[Math.floor(first.length/2)]:null},null,2));
