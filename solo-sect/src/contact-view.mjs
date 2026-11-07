// 唯讀畫面：不回寫actor/時間，不決定任何命中或傷害。
import {BODY_MOVES} from './starter-combat.mjs';
import {TISSUES} from './contact.mjs';
export const HITSTOP={max:.5,fist:.1,shake:5,frequency:80};
const fist=BODY_MOVES.find(m=>m.id==='bodyPunch').force,bone=TISSUES.blunt.find(r=>r.id==='bone').threshold;
const slope=(HITSTOP.max-HITSTOP.fist)/(bone-fist),base=HITSTOP.fist-slope*fist;
export const hitstopSeconds=(force,nearby=2)=>Math.min(HITSTOP.max,base+slope*force)/Math.sqrt(Math.max(1,nearby-1));
export function impactVisual(s,a,time=s.t,enabled=true){
 const id=a.uid||a.id||a.k,pos=a.pos||[0,0];if(!enabled)return {clock:time,pos,paused:false,shake:0};
 const f=[...(s.fx||[])].reverse().find(f=>f.kind==='contact'&&(f.attacker===id||f.defender===id)&&time>=f.at&&time-f.at<hitstopSeconds(f.force,f.nearby));
 if(!f)return {clock:time,pos,paused:false,shake:0};
 const victim=f.defender===id,amplitude=HITSTOP.shake*f.force/(f.force+fist)*(victim?1:.5),shake=Math.sin((time-f.at)*HITSTOP.frequency)*amplitude;
 return {clock:f.at,pos:[...(victim?f.to:f.from)],paused:true,shake};
}
