// #372 health disclosure: the leader's stats are public, so their exact HP is too; for everyone else 體魄 is hidden and
// maxHp = 80 + 5 x 體魄 would give it away, so the player sees a coarse band instead (and the bar is drawn at the band's
// fixed width). Read-only; core hp/maxHp, damage, healing and thresholds are untouched.
export const hpDisclosed=p=>p?.rank==='leader';
// Bands line up with the thresholds players act on (drills need 80%).
export const BANDS=[{id:'full',label:'完好',width:100},{id:'light',label:'輕傷',width:85},{id:'hurt',label:'帶傷',width:60},{id:'grave',label:'重傷',width:30},{id:'down',label:'倒地',width:0}];
export function healthBand(p){const r=p.maxHp>0?p.hp/p.maxHp:0;return BANDS[p.hp<=0?4:p.hp>=p.maxHp?0:r>=.8?1:r>=.5?2:3];}
// What the UI may print: exact for the leader, the band for others.
export function healthView(p){if(hpDisclosed(p))return{disclosed:true,text:Math.ceil(p.hp)+'/'+p.maxHp,width:Math.max(0,Math.min(100,Math.round(p.hp/p.maxHp*100))),label:Math.ceil(p.hp)+'/'+p.maxHp};const b=healthBand(p);return{disclosed:false,text:b.label,width:b.width,label:b.label,band:b.id};}
// Core report lines such as "林青生命64/80，休息即可回復" are world text; at the display boundary the exact pair is replaced for undisclosed people.
export function maskHealthText(w,text){if(typeof text!=='string'||!text.includes('生命'))return text;return text.replace(/([^\s，、；。：]+?)生命\s*(\d+)\s*\/\s*(\d+)/g,(all,name,hp,max)=>{const ps=Object.values(w.people).filter(q=>q.name===name);if(ps.length&&ps.every(hpDisclosed))return all;return name+'生命'+healthBand({hp:Number(hp),maxHp:Number(max)}).label;});}
