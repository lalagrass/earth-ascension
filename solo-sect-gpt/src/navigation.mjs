import directions from '../data/directions.mjs';
import {Q} from './data.mjs';
import {findPath,position,sweep,walkable,inRect} from './map.mjs';
import {bagWeight,event,sorted} from './state.mjs';
function isqrt(n){let v=Math.floor(Math.sqrt(n));while((v+1)*(v+1)<=n)v++;while(v*v>n)v--;return v;}
function heading(dx,dy){let best=-Infinity,angle=0;for(let i=0;i<360;i++){const v=directions[i],dot=dx*v[0]+dy*v[1];if(dot>best){best=dot;angle=i;}}return angle;}
export function speed(w,p){let level=p.distance>=18000*Q?3:p.distance>=9000*Q?2:p.distance>=3000*Q?1:0;let n=(bagWeight(w,p)?20:30)+level*4;if(p.kind==='rat')n=24;if(p.kind==='boar')n=22;if(p.rank==='warden'||p.rank==='training')n=26;if(p.injury>60)n*=0.6;else if(p.injury>30)n*=0.8;if(p.energy<2500)n*=0.8;if(p.helping||p.helpedBy)n*=0.65;return Math.max(6,n);}
export function route(w,p,target){if(w.bridge.holder===p.id){p.bridgeExit=true;p.bridgePendingTarget=[...target];return true;}const path=findPath(w,position(p),target);if(!path){p.blocked='無可通行路徑';p.path=[];return false;}p.path=path;p.routeAt=0;p.blocked='';return true;}
export const arrived=p=>p.routeAt>=p.path.length;
function bridgePermit(w,p,x,y){const b=w.bridge,on=inRect(x,y,[1840,410,130,60]);
 if(b.holder===p.id)return true;
 if(!on)return true;
 if(p.x/Q<1870&&x<p.x/Q||p.x/Q>1940&&x>p.x/Q)return true;
 if(!b.queue.some(q=>q.id===p.id))b.queue.push({id:p.id,tick:w.tick,dir:p.x/Q<1905?'east':'west',priority:p.helpedBy||p.rank==='rescuer'?2:p.intent?.kind==='return'?1:0});
 b.queue=b.queue.filter(q=>w.people[q.id]&&w.people[q.id].residence!=='departed');
 const priority=q=>q.priority+Math.floor((w.tick-q.tick)/600);
 b.queue.sort((a,c)=>priority(c)-priority(a)||((b.batch>=3&&a.dir!==b.lastDirection)?-1:0)-((b.batch>=3&&c.dir!==b.lastDirection)?-1:0)||a.tick-c.tick||a.id.localeCompare(c.id));
 if(!b.holder&&b.queue[0]?.id===p.id){const q=b.queue.shift();b.holder=p.id;b.direction=q.dir;b.batch=b.lastDirection===q.dir?b.batch+1:1;b.lastDirection=q.dir;event(w,'bridge-enter',[p.id],{direction:q.dir});return true;}
 p.blocked='候橋：單人通行'+(b.holder?'／'+w.people[b.holder].name:'');return false;
}
export function moveAll(w){
 const people=sorted(w.people).filter(p=>p.residence!=='departed'&&!p.inactive);
 for(const p of people){p.moving=false;if(p.stun||p.hp<=0||p.action&&p.action.phase!=='recover')continue;if(w.bridge.holder===p.id&&arrived(p)&&!p.action)p.bridgeExit=true;
  if(arrived(p)&&!p.bridgeExit)continue;
  if(w.bridge.holder===p.id&&p.bridgeExit&&!p.bridgeExitPath){const exit=w.bridge.direction==='east'?1954:1856,path=findPath(w,position(p),[exit,440]);if(!path){p.blocked='橋口退出路徑受阻';continue;}p.path=path;p.routeAt=0;p.bridgeExitPath=true;}
  let target=p.path[p.routeAt]||[p.x,p.y];let dx=target[0]-p.x,dy=target[1]-p.y,d=isqrt(dx*dx+dy*dy);p.walkRemainder=(p.walkRemainder||0)+Math.round(speed(w,p)*Q*1000);const step=Math.floor(p.walkRemainder/20000);p.walkRemainder%=20000;if(d<2){p.routeAt++;continue;}
  const bridge=w.bridge;if(bridge.holder===p.id){const exit=bridge.direction==='east'?1954:1856;
   // Cancellation in the middle preserves ownership and must finish crossing first.
   // Exit follows its saved legal path, including bank alignment before the water.
  }
  const n=Math.min(step,d),nx=p.x+Math.round(dx/d*n),ny=p.y+Math.round(dy/d*n);
  if(!bridgePermit(w,p,nx/Q,ny/Q))continue;
  const others=people.filter(o=>o.id!==p.id);
  const free=(x,y)=>sweep(w,position(p),[x/Q,y/Q])&&!others.some(o=>(o.x-x)**2+(o.y-y)**2<(12*Q)**2);
  let x=nx,y=ny;
  if(!free(x,y)){
   p.waitSince??=w.tick;p.blocked='候路／禮讓';
   if(w.tick-(p.lastDetourTick||0)>=40&&w.bridge.holder!==p.id){p.lastDetourTick=w.tick;const goal=p.path.at(-1)?.map(n=>n/Q),avoid=others.map(position);if(goal){const detour=findPath(w,position(p),goal,avoid);if(detour){p.path=detour;p.routeAt=0;continue;}}}
   // Deterministic reciprocal avoidance; waiters can move sideways on legal ground.
   const sign=p.id.localeCompare(others.find(o=>(o.x-nx)**2+(o.y-ny)**2<(12*Q)**2)?.id||'')<0?1:-1;
   const vectors=[[-dy*sign,dx*sign],[dy*sign,-dx*sign],[-dx,-dy]];let ok=false;
   for(const [vx,vy]of vectors){const dist=Math.hypot(vx,vy);if(!dist)continue;const xx=p.x+Math.round(vx/dist*step),yy=p.y+Math.round(vy/dist*step);if(free(xx,yy)){x=xx;y=yy;ok=true;break;}}
   if(!ok)continue;
  }else {p.waitSince=null;if(p.blocked.startsWith('候'))p.blocked='';}
  const walked=Math.round(Math.hypot(x-p.x,y-p.y));p.x=x;p.y=y;p.distance+=walked;w.metrics.walked+=walked;p.moving=walked>0;
  if(p.moving&&!p.action)p.angle=heading(dx,dy);
  if(n===d&&x===nx&&y===ny)p.routeAt++;
  if(bridge.holder===p.id){const end=bridge.direction==='east'?p.x/Q>=1952:p.x/Q<=1858;if(end){event(w,'bridge-exit',[p.id],{x:p.x,y:p.y,direction:bridge.direction});bridge.holder=null;bridge.direction=null;if(p.bridgeExit){p.bridgeExit=false;p.bridgeExitPath=false;p.path=[];p.routeAt=0;const pending=p.bridgePendingTarget;p.bridgePendingTarget=null;if(pending)route(w,p,pending);}}}
 }
}
