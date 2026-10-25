import layout from '../maps/runtime/layout.mjs';
import {Q,FACILITIES} from './data.mjs';
export const MAP={...layout,version:'gpt-world-1',status:'runtime',units:'DU',origin:[0,800]};
export const home=(p)=>[p[0],p[1]+800];
export const rects=Object.fromEntries(layout.home.facilities.map(f=>[f.id,{...f,rect:[f.rect[0],f.rect[1]+800,f.rect[2],f.rect[3]],door:f.door&&home(f.door)}]));
export const stations=Object.fromEntries(layout.home.stations.map(s=>[s.id,home(s.pos)]));
Object.assign(stations,{
 wood:[430,960],stone:[480,1200],veg:[600,1400],herb:[650,1435],south:[1450,1700],spawn:[1480,1780],
 'hall.teach':[1110,1070],'hall.greet':[1170,1070],'hall.work':[1110,1060],'dorm.work':[865,1025],
 'store.work':[800,1120],'kitchen.work':[800,1260],'dining.work':[1040,1250],'annex.work':[1090,1440],
 'quiet.work':[1325,1020],'yard.work':[1270,1240],'garden.worksite':[1220,1420],'herb.worksite':[1220,1550],
 forest:[1490,630],camp:[1660,520],valley:[1770,480],cave:[2200,150],'cave.food':[2220,160],
 'cave.talk':[2150,230],'quiet.book':[1290,950], 'guard.prep':[1490,1230]
});
for(let i=0;i<3;i++)stations['hall.bed.'+i]=[1040+i*70,970];
for(let i=0;i<4;i++)stations['hall.student.'+i]=[1075+i*24,1100];
for(let i=0;i<10;i++)stations['safe.'+i]=[900+(i%5)*24,1100+Math.floor(i/5)*24];
export const side=[[1740,480],[1770,360],[1840,330],[1845,370],[1855,440],[1870,440]];
export const corridors=[...Object.values(layout.home.paths).map(p=>({points:p.points.map(home),width:p.width})),{points:layout.expedition.main,width:48},{points:side,width:36}];
export const trees=[];for(let i=0;i<30;i++){const x=380+(i*97)%340,y=880+(i*151)%500;if(Math.hypot(x-430,y-960)>=30)trees.push({id:'tree.home.'+i,x,y,variant:i});}for(let i=0;i<17;i++)trees.push({id:'tree.forest.'+i,x:1360+(i*53)%300,y:550+(i*113)%260,variant:i});
const protectedPoints=[...Object.values(stations),[1490,630],[1550,600],[1580,560],[1510,720],[1640,540]];for(let i=trees.length-1;i>=0;i--)if(protectedPoints.some(p=>Math.hypot(p[0]-trees[i].x,p[1]-trees[i].y)<22))trees.splice(i,1);
function segDist2(x,y,a,b){const dx=b[0]-a[0],dy=b[1]-a[1],n=dx*dx+dy*dy,t=n?Math.max(0,Math.min(1,((x-a[0])*dx+(y-a[1])*dy)/n)):0;return (x-a[0]-t*dx)**2+(y-a[1]-t*dy)**2;}
export const inRect=(x,y,r,pad=0)=>x>=r[0]-pad&&y>=r[1]-pad&&x<=r[0]+r[2]+pad&&y<=r[1]+r[3]+pad;
export function obstacles(w){
 const out=[];
 for(const [id,f] of Object.entries(rects)){
  if(!f.solid||!(id==='hall'||w.facilities[id].stage>0))continue;
  const [x,y,a,b]=f.rect,door=f.door[0];
  out.push([x,y,a,4],[x,y,4,b],[x+a-4,y,4,b],[x,y+b-4,door-14-x,4],[door+14,y+b-4,x+a-door-14,4]);
 }
 // Independent trunk and furniture geometry, aligned with the procedural props.
 for(const t of trees)out.push([t.x-3,t.y-3,6,6]);
 for(const id of ['dorm','annex'])if(w.facilities[id].stage)for(let i=1;i<=4;i++){const p=stations[id+'.bed.'+i];out.push([p[0]-12,p[1]-36,24,24]);}
 for(let i=0;i<[3,2,0][w.facilities.hall.stage];i++){const p=stations['hall.bed.'+i];out.push([p[0]-12,p[1]-36,24,24]);}
 for(let i=1;i<=[3,6,8][w.facilities.dining.stage];i++){const p=stations['dining.'+i];out.push([p[0]-10,p[1]-24,20,12]);}
 if(w.facilities.quiet.stage)out.push([1275,925,75,10]);
 // River spans the world: a single traversable bridge opening, no bank-end shortcut.
 out.push([1870,0,70,425],[1870,455,70,1345]);
 out.push([1795,385,16,24],[2040,355,20,24]);
 return out;
}
const cache=new Map();
export const signature=w=>Object.entries(w.facilities).sort().map(([k,v])=>k+v.stage).join('|');
export function geometry(w){const key=signature(w);if(!cache.has(key))cache.set(key,obstacles(w));return cache.get(key);}
export function terrain(x,y,r=6){
 if(x<12||y<12||x>2388||y>1788)return false;
 if(y>=806&&x<=1560){
  // Pond with an independently declared pedestrian plank opening.
  const pond=((x-300)/230)**2+((y-1645)/145)**2<1;
  if(pond&&!inRect(x,y,[260,1515,38,280],-r))return false;
  return true;
 }
 if(((x-1530)/130)**2+((y-680)/190)**2<1)return true;
 if(((x-2210)/95)**2+((y-160)/100)**2<1)return true;
 if(((x-1660)/55)**2+((y-520)/55)**2<1)return true;
 for(const c of corridors)for(let i=1;i<c.points.length;i++)if(segDist2(x,y,c.points[i-1],c.points[i])<=(c.width/2-r)**2)return true;
 return false;
}
export function walkable(w,x,y,r=6){return terrain(x,y,r)&&!geometry(w).some(o=>inRect(x,y,o,r));}
export function sweep(w,a,b,r=6){const obstacles=geometry(w);const d=Math.hypot(b[0]-a[0],b[1]-a[1]);for(let i=0,n=Math.ceil(d/3);i<=n;i++){let t=n?i/n:0;const x=a[0]+(b[0]-a[0])*t,y=a[1]+(b[1]-a[1])*t;if(!terrain(x,y,r)||obstacles.some(o=>inRect(x,y,o,r)))return false;}return true;}
export function los(w,a,b){const d=Math.hypot(b[0]-a[0],b[1]-a[1]);for(let i=0,n=Math.ceil(d/3);i<=n;i++){const t=n?i/n:0,x=a[0]+(b[0]-a[0])*t,y=a[1]+(b[1]-a[1])*t;if(geometry(w).some(o=>inRect(x,y,o)))return false;}return true;}
const navCache=new Map();
function grid(w){const key=signature(w);if(navCache.has(key))return navCache.get(key);const nx=241,ny=181,free=new Uint8Array(nx*ny);for(let y=0;y<ny;y++)for(let x=0;x<nx;x++)free[y*nx+x]=walkable(w,x*10,y*10)?1:0;const g={nx,ny,free,edges:new Uint8Array(nx*ny),checked:new Uint8Array(nx*ny)};navCache.set(key,g);return g;}
class Heap{constructor(){this.a=[];}push(v){let a=this.a,i=a.length;a.push(v);while(i){const j=(i-1)>>1;if(a[j][0]<v[0]||a[j][0]===v[0]&&a[j][1]<v[1])break;a[i]=a[j];i=j;}a[i]=v;}pop(){let a=this.a,r=a[0],v=a.pop();if(a.length){let i=0;while(i*2+1<a.length){let j=i*2+1;if(j+1<a.length&&(a[j+1][0]<a[j][0]||a[j+1][0]===a[j][0]&&a[j+1][1]<a[j][1]))j++;if(a[j][0]>v[0]||a[j][0]===v[0]&&a[j][1]>v[1])break;a[i]=a[j];i=j;}a[i]=v;}return r;}}
export function findPath(w,from,to,avoid=[]){
 const clear=(a,b)=>sweep(w,a,b)&&!avoid.some(p=>segDist2(p[0],p[1],a,b)<12.3**2);
 if(!walkable(w,...to))return null;
 if(clear(from,to))return [to.map(n=>Math.round(n*Q))];
 const {nx,ny,free:baseFree,edges,checked}=grid(w);const free=avoid.length?baseFree.slice():baseFree;if(avoid.length)for(const p of avoid){const gx=Math.round(p[0]/10),gy=Math.round(p[1]/10);for(let y=Math.max(0,gy-2);y<=Math.min(ny-1,gy+2);y++)for(let x=Math.max(0,gx-2);x<=Math.min(nx-1,gx+2);x++)if(Math.hypot(x*10-p[0],y*10-p[1])<12.3)free[y*nx+x]=0;}
 const nearest=p=>{let best=-1,dist=Infinity;const gx=Math.round(p[0]/10),gy=Math.round(p[1]/10);for(let y=Math.max(0,gy-3);y<=Math.min(ny-1,gy+3);y++)for(let x=Math.max(0,gx-3);x<=Math.min(nx-1,gx+3);x++){let id=y*nx+x,d=(x*10-p[0])**2+(y*10-p[1])**2;if(free[id]&&d<dist&&clear(p,[x*10,y*10])){best=id;dist=d;}}return best;};
 const start=nearest(from),goal=nearest(to);if(start<0||goal<0)return null;
 const costs=new Float64Array(nx*ny).fill(Infinity),prev=new Int32Array(nx*ny).fill(-1),heap=new Heap();costs[start]=0;heap.push([0,start]);
 const dirs=[[0,-1,10],[-1,0,10],[1,0,10],[0,1,10],[-1,-1,14],[1,-1,14],[-1,1,14],[1,1,14]];
 while(heap.a.length){const [,id]=heap.pop();if(id===goal)break;const x=id%nx,y=Math.floor(id/nx);for(let di=0;di<dirs.length;di++){const [dx,dy,c]=dirs[di];const xx=x+dx,yy=y+dy,j=yy*nx+xx;if(xx<0||yy<0||xx>=nx||yy>=ny||!free[j])continue;const bit=1<<di;if(!(checked[id]&bit)){checked[id]|=bit;if(sweep(w,[x*10,y*10],[xx*10,yy*10]))edges[id]|=bit;}if(!(edges[id]&bit)||avoid.length&&!clear([x*10,y*10],[xx*10,yy*10]))continue;const n=costs[id]+c;if(n<costs[j]){costs[j]=n;prev[j]=id;heap.push([n+Math.hypot(xx-goal%nx,yy-Math.floor(goal/nx))*10,j]);}}}
 if(costs[goal]===Infinity)return null;
 let path=[to],j=goal;while(j!==start){path.push([j%nx*10,Math.floor(j/nx)*10]);j=prev[j];if(j<0)return null;}path.push([start%nx*10,Math.floor(start/nx)*10]);path.reverse();
 let smooth=[],at=from;for(let i=0;i<path.length;){let k=i;while(k+1<path.length&&clear(at,path[k+1]))k++;smooth.push(path[k].map(n=>Math.round(n*Q)));at=path[k];i=k+1;}return smooth;
}
export const position=p=>[p.x/Q,p.y/Q];
export function bedSlots(w){let a=[];if(w.facilities.dorm.stage)for(let i=1;i<=4;i++)a.push('dorm.bed.'+i);if(w.facilities.annex.stage)for(let i=1;i<=4;i++)a.push('annex.bed.'+i);const n=[3,2,0][w.facilities.hall.stage];for(let i=0;i<n;i++)a.push('hall.bed.'+i);return a;}
export const stageMax=id=>FACILITIES[id].stages.length;
