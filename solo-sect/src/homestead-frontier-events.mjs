// Read-only snapshots; UI observation, never a second simulation ledger.
export function frontierSnapshot(s){const f=s?.frontier;return f?{t:s.t,day:s.day,threat:f.threat.phase,trip:f.trip.phase,packed:f.trip.packed,returns:f.trip.returns,cleared:f.source.cleared}:null;}
export function frontierEvents(before,after){
 if(!before||!after||after.t<=before.t)return [];
 const events=[];const add=(kind,text)=>events.push({kind,text,at:after.t,day:after.day});
 if(after.threat!==before.threat&&after.threat==='warning')add('warning','林緣預警，還有30世界秒準備');
 if(after.threat!==before.threat&&after.threat==='active')add('beast','山豬已實際抵達林緣');
 if(after.packed>before.packed)add('depart','已打包真路糧，開始前往獸徑');
 if(after.trip==='source'&&before.trip!=='source')add('source','已走到獸徑，正在近身應對');
 if(after.cleared&&!before.cleared)add('clear','獸徑已清理，不再排新侵擾');
 if(after.returns>before.returns)add('home','已實際返家，未吃路糧已退回');
 return events;
}
