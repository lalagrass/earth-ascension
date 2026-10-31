// loop27 診斷：受傷來源（山賊/剿寨）、剿寨次數、錢來源。用法：node test/harness/diag-hurt.mjs off|on|null idle|bot（null＝事件照發但獎勵歸零）
const {run}=await import("./bot.mjs");const J=await import("../../src/jianghu.mjs");
const mode=process.argv[2],bot=process.argv[3]==='bot';
if(mode==='null'){Object.assign(J.JHEV.master,{xp:0,mood:0,teach:0});Object.assign(J.JHEV.letter.win,{rep:0,mood:0,coin:0,xp:0});Object.assign(J.JHEV.letter.lose,{rep:0,mood:0});}
const A={hurt:{raid:0,lair:0},raids:0,raidPts:0,lairN:0,coinSrc:{},lairFound:0,lairFirst:[],rep:0,coin:0};
for(let seed=1;seed<=10;seed++){let ph={},pl=0,pc=null,plog=null;const s=run(seed,{jhev:mode!=='off'},60,bot,(s)=>{
 const ln=s.lair?.hist?.length||0;for(const d of s.ds){const h=d.raidHurt||0,o=ph[d.id]||0;if(h>o)A.hurt[ln>pl?'lair':'raid']+=h-o;ph[d.id]=h;}pl=ln;
 const c=s.res.coin;if(pc!=null&&c!==pc){const e=s.log[0];const k=(e&&e!==plog?e.msg:'(無新log)').replace(/[0-9０-９].*/,'').slice(0,10);A.coinSrc[k]=(A.coinSrc[k]||0)+(c-pc);}pc=c;plog=s.log[0];});
 const X=s.threat||{hist:[]};A.raids+=X.hist.length;A.raidPts+=X.hist.reduce((a,h)=>a+(h.pts||0),0);A.lairN+=s.lair?.hist?.length||0;A.lairFirst.push(s.lair?.found??null);A.rep+=s.rep/10;A.coin+=s.res.coin/10;}
const top=Object.entries(A.coinSrc).sort((a,b)=>Math.abs(b[1])-Math.abs(a[1])).slice(0,8).map(([k,v])=>k+':'+v).join(' | ');
console.log(mode,bot?'bot':'idle',JSON.stringify({hurt:A.hurt,raids:A.raids,avgPts:(A.raidPts/A.raids).toFixed(1),lair:A.lairN,lairFound:A.lairFirst.join(','),rep:A.rep.toFixed(0),coin:A.coin.toFixed(0)}));console.log('   coin:',top);
