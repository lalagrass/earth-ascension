import {gridPath} from './homestead-path.mjs';
export const CELL=30,COLS=30,ROWS=19;
export function barrierCells(s){return s.frontier&&s.fac.fence?.stage>0&&s.frontier.fenceHp>0?[9,10,11,12,13].filter(y=>y!==11||!s.frontier.gateOpen).map(y=>[26,y]):[];}
const cell=p=>[Math.min(29,Math.floor(p[0]/30)),Math.min(18,Math.floor(p[1]/30))];
export function route(s,from,to){
 if([from,to].some(p=>!Array.isArray(p)||p.length!==2||p.some(n=>!Number.isFinite(n))||p[0]<0||p[0]>900||p[1]<0||p[1]>560))return [];
 const blocks=barrierCells(s);if(!blocks.length)return [[...to]];
 const blocked=p=>blocks.some(([x,y])=>x===Math.floor(p[0]/30)&&y===Math.floor(p[1]/30));
 if(blocked(from)||blocked(to))return [];
 const clear=!blocks.some(([x,y])=>segmentBlocked(from,to,[x*30,y*30,30,30]));
 if(clear)return [[...to]];
 const matrix=Array.from({length:ROWS},()=>Array(COLS).fill(0));for(const[x,y]of blocks)matrix[y][x]=1;
 const path=gridPath(matrix,cell(from),cell(to));return path.length?[...path.slice(1).map(([x,y])=>[x*30+15,Math.min(555,y*30+15)]),[...to]]:[];
}
export function move(s,p,target,dt,speed=75){
 const path=route(s,p.pos,target);if(!path.length)return false;
 const next=path[0],dx=next[0]-p.pos[0],dy=next[1]-p.pos[1],len=Math.hypot(dx,dy),step=speed*dt;
 if(len<=step)p.pos=[...next];else{p.pos[0]+=dx/len*step;p.pos[1]+=dy/len*step;}
 return Math.hypot(p.pos[0]-target[0],p.pos[1]-target[1])<1e-7;
}

// Exact slab intersection against rectangle interiors; no sample spacing can miss corners.
export function segmentBlocked(a,b,[x,y,w,h]){let lo=0,hi=1;for(const[i,min,max]of[[0,x+1e-9,x+w-1e-9],[1,y+1e-9,y+h-1e-9]]){const d=b[i]-a[i];if(Math.abs(d)<1e-12){if(a[i]<min||a[i]>max)return false;continue;}let p=(min-a[i])/d,q=(max-a[i])/d;if(p>q)[p,q]=[q,p];lo=Math.max(lo,p);hi=Math.min(hi,q);if(lo>hi)return false;}return hi>=0&&lo<=1;}
export function validSpatial(s){return !s.frontier||[s.person,s.helper,s.frontier?.threat?.beast,s.frontier?.companion?.present?s.frontier.companion:null].filter(Boolean).every(p=>route(s,p.pos,p.pos).length>0);}

export function clearBarrierFootprint(s){const blocks=[9,10,11,12,13].filter(y=>y!==11||!s.frontier.gateOpen);return [s.person,s.helper,s.frontier.threat?.beast,s.frontier.companion?.present?s.frontier.companion:null].filter(Boolean).every(p=>!(p.pos[0]>=780&&p.pos[0]<810&&blocks.includes(Math.floor(p.pos[1]/30))));}
