import {Q} from './data.mjs';
import {los,position} from './map.mjs';
export function visibleEntity(w,p){if(!['wild','cave'].includes(p.residence))return true;return Object.values(w.people).some(o=>o.residence==='resident'&&o.hp>0&&Math.hypot(o.x-p.x,o.y-p.y)<=120*Q&&los(w,position(o),position(p)));}
export function discover(w){if(w.tick%20)return;const residents=Object.values(w.people).filter(p=>p.residence==='resident');for(const o of residents)for(const p of Object.values(w.people))if(p.id!==o.id&&p.residence!=='departed'&&Math.hypot(o.x-p.x,o.y-p.y)<=120*Q&&los(w,position(o),position(p)))o.known[p.id]={lastSeen:w.tick,pos:position(p)};}
