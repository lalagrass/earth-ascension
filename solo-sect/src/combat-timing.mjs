// Fixed-step observation/commit boundary. Ephemeral views/queues never enter saves.
const frames=new WeakMap(), starts=new WeakMap(),decisions=new WeakMap();
export function beginCombatFrame(s){if(frames.get(s)?.t===s.t)return;const actors=[...(s.ds||[]),...(s.mons||[]),...(s.band?.members||[])];frames.set(s,{t:s.t,actors:new Map(actors.map(a=>[a,{...a,pos:a.pos&&[...a.pos],swing:a.swing&&{...a.swing},bswing:a.bswing&&{...a.bswing}}]))});}
export function observedActor(s,a){const f=frames.get(s);return f?.t===s?.t?f.actors.get(a)||a:a;}
export function queueCombatDecision(s,a,plan,onCommit){const q=decisions.get(s)||[];q.push({a,plan,onCommit});decisions.set(s,q);}
export function queueCombatStart(s,a,slot,w,publish,prepare){const q=starts.get(s)||[];q.push({a,slot,w,publish,prepare});starts.set(s,q);}
export function flushCombatStarts(s){
  // All old impacts have settled before prospective occupations are committed.
  for(const {a,plan,onCommit} of decisions.get(s)||[])if(a.combatDecision===plan&&(a.hp??1)>0&&!a.gone){plan.startedAt=Math.max(s.t,a.busyUntil||0);plan.readyAt=plan.startedAt+plan.seconds;a.busyUntil=plan.readyAt;onCommit?.();}
  decisions.delete(s);
  const q=(starts.get(s)||[]).sort((x,y)=>{const a=String(x.a.uid||x.a.id||x.a.k),b=String(y.a.uid||y.a.id||y.a.k);return (a>b)-(a<b);});starts.delete(s);
  for(const row of q)if(row.publish())row.a[row.slot]=row.w;
  // Publish everyone before inspecting anyone's opening. No instant damage in this phase.
  for(const row of q)if(row.a[row.slot]===row.w)row.prepare();
}
