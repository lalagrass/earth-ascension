// N35：沿 bot12 的公開日程跑真世界，列各種子首次悟招日。未篩敵，不冒充「只打弱敵」。
import {createState,tick} from '../src/sim.mjs';
import {DAY} from '../src/data.mjs';
import {ALL_ON,botDaily} from '../test/harness/bot.mjs';
import {sectOfSeed} from '../test/golden/scenarios.mjs';
const args=process.argv.slice(2),arg=(key,fallback)=>{const row=args.find(x=>x.startsWith(`--${key}=`));return row?Number(row.slice(key.length+3)):fallback;};
const one=arg('seed',null),days=arg('days',60),wu=arg('wu',2);
if((one!==null&&!Number.isSafeInteger(one))||!Number.isSafeInteger(days)||days<1||![2,3].includes(wu))throw Error('seed 與 days 須為正整數；wu 可選 2 或 3');
const seeds=one===null?Array.from({length:12},(_,i)=>1001+i):[one],rows=[];
for(const seed of seeds){
  const sect=sectOfSeed(seed),s=createState(seed,{kind:'custom',answers:Array(9).fill(0),askMajor:false,...ALL_ON,v22:true,...(wu===3?{stats:{wu:3,gen:2,li:2,shen:2,ding:2,fu:1}}:{}),...(sect?{sect24:sect}:{})});
  let day=s.day;
  for(let i=1;i<=days*DAY/6;i++){
    if(s.band)for(let j=0;j<24;j++)tick(s,.25);else tick(s,6);
    if(s.alert)s.alert=null;
    if(s.day!==day){day=s.day;botDaily(s);}
  }
  const hero=s.ds.find(d=>d.id==='hero');rows.push({seed,day:s.day,wu:hero?.wu,firstDay:hero?.glimmer?.firstDay??null,known:hero?.glimmer?.known||[],progress:hero?.glimmer?.progress||{}});
}
const first=rows.map(r=>r.firstDay).filter(Number.isFinite).sort((a,b)=>a-b);
console.log(JSON.stringify({days,wu,seeds,rows,firstDays:first,medianFirstDay:first.length?first[Math.floor(first.length/2)]:null},null,2));
