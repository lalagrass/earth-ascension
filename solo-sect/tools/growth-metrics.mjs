import {options,growthSnapshots} from './growth-scenario.mjs';
import {growthSnapshot} from '../src/growth-adapter.mjs';
const {seed,days,get}=options(), result=growthSnapshots(seed,days), a=result.snapshots[0],b=result.snapshots.at(-1);
result.substrate=result.snapshots.map(s=>({day:s.day,...(({art,wind,reaction,force,why})=>({art,wind,reaction,force,why}))(growthSnapshot(s.hero))}));
const names={chopPause:'劈柴每斧間停頓(s)',waterTilt:'挑水最大傾角(deg)',hipHeight:'馬步重心高度(px)',routineSeconds:'通用拳三式秒數(s)',combatWind:'交手直拳前搖(s)',routinePause:'式間停頓(s)',sway:'身體晃動幅度(px)'};
result.table=Object.keys(names).map(k=>({key:k,name:names[k],day1:a.metrics[k],day60:b.metrics[k],reduction:1-b.metrics[k]/a.metrics[k],pass:b.metrics[k]<=.75*a.metrics[k]}));
result.pass=result.table.slice(0,5).every(r=>r.pass);
if(get('json',false)||process.argv.includes('--json'))console.log(JSON.stringify(result,null,2));
else {console.log(`seed=${seed} dt=${result.dt} clock=${result.clock} ${result.scenario}`);console.log('欄位 | 第'+a.day+'天 | 第'+b.day+'天 | 減少% | ≥25%');for(const r of result.table)console.log(`${r.name} | ${r.day1.toFixed(6)} | ${r.day60.toFixed(6)} | ${(r.reduction*100).toFixed(2)} | ${r.pass?'PASS':'FAIL'}`);for(const s of result.snapshots)console.log(`day=${s.day} events=${s.events} sha256=${s.eventHash}`);console.log(`pass=${result.pass}`);}
if(!result.pass)process.exitCode=1;
