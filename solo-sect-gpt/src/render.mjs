import{statusBadge,BADGE_STYLE}from'./person-view.mjs';
import{activitiesFor,movesFor,moveFor}from'./catalog.mjs';
import{TRAIL_ROUTES}from'./journey-data.mjs';
import{SECT_LIFE}from'./culture-data.mjs';
import {Q,FACILITIES,ITEM,MOVES,TASKNAME} from './data.mjs';
import {MAP,rects,stations,corridors,position,inRect,trees} from './map.mjs';
import {sorted,qty,bagWeight} from './state.mjs';
import {paintedGround,buildingShell,roofLayer,treeLayer,bridgeLayer,lifeProps,roadPath} from './scene-art.mjs';
import {STYLES} from './martial-config.mjs';
import {visibleEntity} from './view.mjs';
const COLORS={paper:'#eee7d3',ink:'#31443c',muted:'#7d8b70',earth:'#b9a485',grass:'#c2cbb0',water:'#8cbbb5',wood:'#87705a'};
export function cameraPreset(name){return {home:{x:1005,y:1245,span:1430},yard:{x:1350,y:1220,span:460},all:{x:1200,y:900,span:2440},forest:{x:1520,y:690,span:550},valley:{x:1830,y:440,span:600},cave:{x:2180,y:200,span:500}}[name]||cameraPreset('home');}
export function render(canvas,w,view){
 const dpr=window.devicePixelRatio||1,box=canvas.getBoundingClientRect(),width=box.width,height=box.height;if(canvas.width!==Math.round(width*dpr)||canvas.height!==Math.round(height*dpr)){canvas.width=Math.round(width*dpr);canvas.height=Math.round(height*dpr);}
 const ctx=canvas.getContext('2d');ctx.setTransform(dpr,0,0,dpr,0,0);ctx.fillStyle=COLORS.paper;ctx.fillRect(0,0,width,height);
 const cam=view.camera;if(view.follow&&w.people[view.follow]){cam.x=w.people[view.follow].x/Q;cam.y=w.people[view.follow].y/Q;}
 const scale=width/cam.span,ox=width/2-cam.x*scale,oy=height/2-cam.y*scale;
 ctx.save();ctx.translate(ox,oy);ctx.scale(scale,scale);ctx.lineCap='round';ctx.lineJoin='round';
 const poly=(pts,fill,stroke)=>{ctx.beginPath();pts.forEach((p,i)=>ctx[i?'lineTo':'moveTo'](...p));ctx.closePath();if(fill){ctx.fillStyle=fill;ctx.fill();}if(stroke){ctx.strokeStyle=stroke;ctx.stroke();}};
 // Separate mountains, terrain and editable route layers.
 ctx.fillStyle='#ccd0b8';ctx.fillRect(0,0,2400,1800);
 for(let i=0;i<28;i++){let x=(i*227+83)%2400,y=(i*113+120)%1600;poly([[x-160,y+180],[x-45,y-10],[x+5,y+40],[x+65,y-70],[x+220,y+180]],i%2?'#b5c1a7':'#bac6af');}
 paintedGround(ctx);
 ctx.save();ctx.fillStyle='#6f8c7424';for(const [x,y,rx,ry]of [[850,330,480,140],[1030,650,240,115],[2110,760,330,300],[260,510,400,360]]){ctx.beginPath();ctx.ellipse(x,y,rx,ry,-.25,0,7);ctx.fill();}ctx.restore();
 // Fine deterministic paper grain, view only.
 ctx.strokeStyle='#e2dfc5';ctx.lineWidth=1;for(let i=0;i<200;i++){let x=(i*173)%2400,y=(i*307)%1800;ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x+14,y+3);ctx.stroke();}
 const pond=ctx.createRadialGradient(280,1620,20,300,1645,230);pond.addColorStop(0,'#6f9f9a');pond.addColorStop(.75,'#91b5a9');pond.addColorStop(1,'#c2caaa');ctx.fillStyle=pond;ctx.beginPath();ctx.ellipse(300,1645,230,145,0,0,Math.PI*2);ctx.fill();ctx.strokeStyle='#e2ead066';ctx.lineWidth=2;for(let i=0;i<11;i++){ctx.beginPath();ctx.ellipse(260+i%3*35,1555+i*15,12+i%4*7,3,0,0,Math.PI);ctx.stroke();}
 ctx.fillStyle='#a0bcb0';ctx.fillRect(1870,0,70,1800);ctx.strokeStyle='#73988855';ctx.lineWidth=3;for(let j=0;j<1800;j+=21){for(const x of [1866,1944]){ctx.beginPath();ctx.moveTo(x,j);ctx.quadraticCurveTo(x+(j%3-1)*4,j+9,x,j+18);ctx.stroke();}}
 for(const c of corridors){ctx.strokeStyle='#baa87a44';ctx.lineWidth=c.width+7;roadPath(ctx,c.points);ctx.stroke();ctx.strokeStyle='#dfd0ac';ctx.lineWidth=Math.max(3,c.width-7);ctx.stroke();}
 // Water masks take precedence over paths; the single bridge is drawn afterwards.
 ctx.fillStyle=COLORS.water;ctx.fillRect(1870,0,70,425);ctx.fillRect(1870,455,70,1345);
 drawBridge(ctx,[1870,425,70,30]);drawBridge(ctx,[260,1515,38,280]);
 ctx.fillStyle='#b5b99a';ctx.beginPath();ctx.ellipse(2210,160,95,100,0,0,Math.PI*2);ctx.fill();
 drawCave(ctx,w);drawJourney(ctx,w);
 // Building floors and furniture; roof is a separate foreground pass.
 for(const f of Object.values(rects))drawBuilding(ctx,w,f,false,view);
 const actors=sorted(w.people).filter(p=>p.residence!=='departed'&&!p.inactive&&visibleEntity(w,p)).sort((a,b)=>a.y-b.y||a.id.localeCompare(b.id));
 const labels=[],labelOffsets={};for(const p of [...actors].sort((a,b)=>(b.id===view.selected)-(a.id===view.selected)||a.id.localeCompare(b.id))){const x=p.x/Q;let y=p.y/Q-62;while(labels.some(r=>Math.abs(r.x-x)<(w.martialPlan&&p.combatSession?110:66)&&Math.abs(r.y-y)<(w.martialPlan&&p.combatSession?42:20)))y-=w.martialPlan&&p.combatSession?42:20;labels.push({x,y});labelOffsets[p.id]=y-(p.y/Q-62);}
 for(const p of actors)if(w.martialPlan&&p.combatSession)drawCombatTelegraph(ctx,w,p,view);
 const props=[];
 for(const t of trees)props.push({y:t.y,fn:()=>{const p=w.people[view.selected];if(!treeLayer(ctx,t.x,t.y,t.variant,p&&Math.abs(p.x/Q-t.x)<43&&p.y/Q<t.y+15&&p.y/Q>t.y-85))drawTree(ctx,t.x,t.y,t.variant);}});
 for(const p of actors)props.push({y:p.y/Q,fn:()=>drawPerson(ctx,w,p,view,labelOffsets[p.id],false)});
 props.sort((a,b)=>a.y-b.y);for(const p of props)p.fn();
 for(const f of Object.values(rects))drawBuilding(ctx,w,f,true,view);
 bridgeLayer(ctx,[1870,425,70,30],true);lifeProps(ctx,w);drawSectLife(ctx,w);
 for(const p of actors)drawLabel(ctx,w,p,view,labelOffsets[p.id]);
 for(const [x,y,a,b]of [[1795,385,16,24],[2040,355,20,24]]){poly([[x,y+b],[x+2,y+5],[x+a*.6,y],[x+a,y+b*.5],[x+a-2,y+b]],'#8f9986','#74846f');ctx.strokeStyle='#c1c4a8';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(x+3,y+6);ctx.lineTo(x+a*.6,y+5);ctx.stroke();}
 drawResources(ctx,w);drawMarkers(ctx,w,view);
 // Foreground trees fade around selected actor, never alter LOS.
 ctx.restore();ctx.fillStyle='#31443c';ctx.font='13px system-ui';ctx.fillText('拖曳移鏡 · 滾輪縮放 · 點人物或地面',16,height-16);
 view.transform={scale,ox,oy};
}
function drawCave(c,w){const g=c.createRadialGradient(2230,105,15,2230,105,120);g.addColorStop(0,'#758174');g.addColorStop(1,'#aab49a');c.fillStyle=g;c.beginPath();c.moveTo(2120,170);c.quadraticCurveTo(2145,75,2200,46);c.quadraticCurveTo(2255,25,2295,78);c.lineTo(2318,168);c.quadraticCurveTo(2220,186,2120,170);c.fill();c.fillStyle='#43594e';c.beginPath();c.moveTo(2185,151);c.lineTo(2193,112);c.quadraticCurveTo(2200,79,2237,81);c.quadraticCurveTo(2270,82,2280,112);c.lineTo(2288,151);c.closePath();c.fill();c.fillStyle='#334c42';c.beginPath();c.moveTo(2205,153);c.lineTo(2209,112);c.quadraticCurveTo(2237,81,2262,112);c.lineTo(2271,153);c.fill();c.strokeStyle='#b4bba1';c.lineWidth=3;for(let i=0;i<10;i++){const x=2150+i*16,y=80+(i%3)*20;c.beginPath();c.moveTo(x,y);c.lineTo(x+12,y+7);c.stroke();}c.fillStyle='#bfae7c';c.fillRect(2225,126,30,13);c.strokeStyle='#8c825c';c.strokeRect(2225,126,30,13);c.fillStyle='#b49a69';for(let i=0;i<qty(w,'cave.food','ration');i++){c.beginPath();c.ellipse(2214+i*7,158,5,7,0,0,7);c.fill();}c.fillStyle='#708c6a';for(let i=0;i<12;i++){c.beginPath();c.ellipse(2150+i*13,160+(i%3)*5,10,3,0,0,7);c.fill();}}
function drawBridge(c,r){if(r[2]>r[3]&&bridgeLayer(c,r))return;const[x,y,w,h]=r;c.fillStyle='#a48a62';c.fillRect(x,y,w,h);c.strokeStyle='#655e49';c.lineWidth=2;for(let i=4;i<w;i+=8){c.beginPath();c.moveTo(x+i,y);c.lineTo(x+i,y+h);c.stroke();}c.strokeRect(x,y,w,h);c.strokeStyle='#6c6248';c.lineWidth=3;c.beginPath();c.moveTo(x,y-2);c.lineTo(x+w,y-2);c.moveTo(x,y+h+2);c.lineTo(x+w,y+h+2);c.stroke();}
function drawTree(c,x,y,i){c.fillStyle='#756e51';c.fillRect(x-3,y-22,6,26);for(let j=0;j<3;j++){c.fillStyle=['#749178','#829a79','#94a681'][(i+j)%3];c.beginPath();c.ellipse(x+(j-1)*12,y-24-j*9,23,22,0,0,7);c.fill();}c.strokeStyle='#526f5855';c.lineWidth=1.5;for(let k=0;k<5;k++){c.beginPath();c.moveTo(x-15+k*8,y-36-(k%2)*8);c.lineTo(x-8+k*8,y-39-(k%2)*8);c.stroke();}}
export function drawBuilding(c,w,f,roof,view){const[x,y,a,b]=f.rect,stage=w.facilities[f.id].stage,active=w.facilities[f.id].active,available=f.id==='hall'||stage>0;
 if(roof){
  if(!available||!f.solid)return;
  const inside=Object.values(w.people).some(p=>p.residence!=='departed'&&inRect(p.x/Q,p.y/Q,f.rect));c.save();const near=Object.values(w.people).some(p=>p.residence!=='departed'&&inRect(p.x/Q,p.y/Q,f.rect,30));c.globalAlpha=view.roofs&&!inside&&!near?0.94:0.12;
  if(roofLayer(c,f)){c.restore();return;}
  c.fillStyle=stage===2||['dorm','annex','quiet'].includes(f.id)?'#667f79':'#8d846c';
  c.beginPath();c.moveTo(x-10,y+18);c.lineTo(x+a/2,y-18);c.lineTo(x+a+10,y+18);c.lineTo(x+a+10,y+b-15);c.lineTo(x-10,y+b-15);c.closePath();c.fill();
  c.strokeStyle='#536b66';c.lineWidth=3;for(let j=0;j<b-25;j+=12){c.beginPath();c.moveTo(x-8,y+20+j);c.lineTo(x+a+8,y+20+j);c.stroke();}c.strokeStyle='#c2b397';c.lineWidth=3;c.beginPath();c.moveTo(x-10,y+18);c.lineTo(x+a/2,y-18);c.lineTo(x+a+10,y+18);c.stroke();c.restore();return;
 }
 c.fillStyle=available?'#ddd0b3':'#bfc6a6';c.strokeStyle=active?'#ac7e43':'#9fa88a';c.lineWidth=2;c.fillRect(x,y,a,b);c.strokeRect(x,y,a,b);if(available){c.save();c.globalAlpha=.3;c.strokeStyle='#b5a888';c.lineWidth=1;for(let row=10;row<b;row+=13){c.beginPath();c.moveTo(x+5,y+row);c.lineTo(x+a-5,y+row);c.stroke();}c.restore();}
 if(!available){c.save();c.strokeStyle='#8d9b704a';c.setLineDash([5,6]);c.strokeRect(x+7,y+7,a-14,b-14);c.setLineDash([]);c.strokeStyle='#83976a';c.lineWidth=1.1;for(let k=0;k<18;k++){let px=x+7+k*47%(a-14),py=y+8+k*31%(b-15);c.beginPath();c.moveTo(px-3,py);c.lineTo(px,py-7);c.lineTo(px+2,py);c.stroke();}c.restore();if(active){c.fillStyle='#987b57';for(let j=0;j<3;j++)c.fillRect(x+10+j*18,y+b-18,12,8);} }
 if(available&&f.solid)buildingShell(c,f,stage);
 if(available&&f.solid){c.fillStyle='#9b8a6c';c.fillRect(x,y,a,4);c.fillRect(x,y,4,b);c.fillRect(x+a-4,y,4,b);c.fillRect(x,y+b-4,f.door[0]-14-x,4);c.fillRect(f.door[0]+14,y+b-4,x+a-f.door[0]-14,4);}
 if(f.id==='hall'){const n=[3,2,0][stage];for(let i=0;i<n;i++)drawBed(c,1040+i*70,970,true);if(stage)c.fillStyle='#9c6849',c.fillRect(x+60,y+20,100,12);}
 if(['dorm','annex'].includes(f.id)&&available)for(let i=1;i<=4;i++){const pos=stations[f.id+'.bed.'+i];drawBed(c,...pos);}
 if(f.id==='quiet'&&available){c.fillStyle='#8c7054';c.fillRect(x+15,y+12,76,15);for(let i=0;i<8;i++){c.fillStyle=i%2?'#84947a':'#b89a69';c.fillRect(x+18+i*9,y+8,6,18);}}
 if(f.id==='dining'){for(let i=1;i<=[3,6,8][stage];i++){const p=stations['dining.'+i];c.fillStyle='#927d5d';c.fillRect(p[0]-10,p[1]-24,20,12);c.fillStyle='#a99877';c.fillRect(p[0]-7,p[1]+3,14,5);}}
 if(f.id==='yard'){for(let i=1;i<=(stage===2?4:stage===1?2:1);i++){const p=stations['yard.'+i];c.fillStyle='#a08158';c.fillRect(p[0]-3,p[1]-35,6,20);c.fillRect(p[0]-10,p[1]-30,20,4);}}
 if(['garden','herb'].includes(f.id)&&available){const n=stage;for(let i=0;i<n;i++){const px=x+18+i*65;c.fillStyle='#ad9874';c.fillRect(px,y+12,48,b-24);const plot=w.plots[f.id+'.'+i];for(let j=0;j<6;j++){c.fillStyle=plot.stage==='ready'?'#69845a':plot.watered?'#889a61':'#b8ad7b';c.beginPath();c.ellipse(px+10+(j%2)*24,y+25+Math.floor(j/2)*18,7,4,0,0,7);c.fill();}}}
 if(f.id==='kitchen'){c.fillStyle='#797562';c.fillRect(748,1237,24,18);c.fillStyle='#3f4e43';c.beginPath();c.ellipse(760,1238,11,5,0,0,7);c.fill();c.fillStyle='#9d977b';c.beginPath();c.ellipse(835,1248,10,14,0,0,7);c.fill();c.fillStyle='#87b4b2';c.beginPath();c.ellipse(835,1242,8,5,0,0,7);c.fill();}
 c.font='13px system-ui';c.textAlign='center';c.fillStyle='#3a4c40';c.fillText(FACILITIES[f.id].name+(active?' · 修建中':stage?'':' · 待修'),x+a/2,y+b+17);c.textAlign='left';
 if(active){const req=FACILITIES[f.id].stages[stage];c.fillStyle='#e6d8af';c.fillRect(x,y+b-7,a,5);c.fillStyle='#8f995c';c.fillRect(x,y+b-7,a*Math.min(1,w.facilities[f.id].work/(req[2]*20)),5);}
}
function drawBed(c,x,y,mat=false){c.fillStyle=mat?'#b29d70':'#9f825a';c.fillRect(x-12,y-36,24,36);c.fillStyle='#d4c49d';c.fillRect(x-9,y-32,18,29);c.fillStyle='#eee3c8';c.fillRect(x-8,y-31,16,7);}
export function drawPerson(c,w,p,v,labelOffset=0,labels=true){const x=p.x/Q,y=p.y/Q,a=w.activities[p.activity||p.classSession],selected=p.id===v.selected;
 c.save();c.translate(x,y);if(selected){c.strokeStyle='#d8b451';c.lineWidth=2;c.beginPath();c.ellipse(0,1,10,5,0,0,7);c.stroke();c.strokeStyle='#2f4d43';c.lineWidth=1.5;c.setLineDash([4,3]);c.beginPath();c.ellipse(0,1,15,8,0,0,7);c.stroke();c.setLineDash([]);}
 c.fillStyle='#48583c30';c.beginPath();c.ellipse(0,2,8,3,0,0,7);c.fill();
 if(p.kind!=='human'){c.fillStyle=p.kind==='rat'?'#8a8173':'#786255';c.beginPath();c.ellipse(0,-5,p.kind==='rat'?8:14,p.kind==='rat'?5:8,0,0,7);c.fill();c.fillStyle='#473e35';c.fillRect(7,-7,4,3);c.restore();return;}
 if(p.pose==='sleep'&&!p.moving){c.fillStyle='#ded2af';c.fillRect(-10,-30,20,30);c.fillStyle=p.color;c.fillRect(-9,-24,18,23);c.fillStyle='#e8dcc3';c.fillRect(-10,-29,20,7);c.fillStyle='#c9a986';c.beginPath();c.arc(0,-30,5,0,7);c.fill();c.strokeStyle='#4b4b3d';c.lineWidth=1;c.beginPath();c.moveTo(-3,-30);c.lineTo(-1,-30);c.moveTo(1,-30);c.lineTo(3,-30);c.stroke();c.fillStyle='#748069';c.font='9px serif';c.fillText('z',12,-31);c.restore();if(labels)drawLabel(c,w,p,v,labelOffset);return;}
 const child=!p.adult,scale=child?.95:1.28;c.scale(scale,scale);const sleep=a?.kind==='sleep'&&a.progress!==0||p.pose==='sleep'&&!p.moving,down=p.hp<=0;
 if(down){c.rotate(-Math.PI/2);c.translate(5,0);}else if(sleep){c.translate(0,-8);c.scale(.85,.65);}
 const frame=Math.floor(p.distance/(5*Q))%4,walk=p.moving?[-2,0,2,0][frame]:0;
 c.strokeStyle='#4c5147';c.lineWidth=3;c.beginPath();c.moveTo(-3,-8);c.lineTo(-3+walk,0);c.moveTo(3,-8);c.lineTo(3-walk,0);c.stroke();
 const robe=c.createLinearGradient(-7,-20,8,-6);robe.addColorStop(0,p.color);robe.addColorStop(.6,p.color);robe.addColorStop(1,'#756b54');c.fillStyle=robe;c.beginPath();c.moveTo(-6,-22);c.lineTo(6,-22);c.lineTo(8,-7);c.lineTo(-7,-7);c.closePath();c.fill();c.strokeStyle='#53604e55';c.lineWidth=.7;c.stroke();c.strokeStyle='#e1cfaa';c.lineWidth=2;c.beginPath();c.moveTo(-5,-10);c.lineTo(5,-10);c.stroke();
 c.fillStyle='#c9a986';c.beginPath();c.arc(0,-27,5,0,7);c.fill();c.fillStyle='#3e4238';c.beginPath();c.arc(0,-30,5,Math.PI,Math.PI*2);c.fill();c.fillRect(-3,-35,6,4);if(p.angle>225&&p.angle<315){c.fillRect(-4,-31,8,7);}else if(p.angle<45||p.angle>315){c.fillStyle='#c9a986';c.fillRect(4,-28,3,3);}else if(p.angle>135&&p.angle<225){c.fillStyle='#c9a986';c.fillRect(-7,-28,3,3);}if(!(p.angle>225&&p.angle<315)){c.fillStyle='#5e5947';c.fillRect(p.angle>135&&p.angle<225?-4:1,-28,1.3,1.3);}if(p.injury>30){c.fillStyle='#eee8d6';c.fillRect(-5,-29,10,2);}
 let ax=7,ay=-14,bx=-7,by=-14;if(p.pose==='teach'){ax=12;ay=-25;}
 if(p.action){const ac=p.action,m=moveFor(w,ac.contentMove||ac.move),dir=p.angle*Math.PI/180,phase=ac.phase;ax=Math.cos(dir)*(phase==='active'?19:phase==='windup'?3:9);ay=-17+Math.sin(dir)*(phase==='active'?13:-2);
  c.strokeStyle=ac.move==='sweep'?'#9c7549':'#cebd89';c.lineWidth=3;
  if(['sweep','thrust','intercept'].includes(ac.move)){c.beginPath();c.moveTo(ax,ay);c.lineTo(ax+Math.cos(dir)*(ac.move==='sweep'?24:22),ay+Math.sin(dir)*18);c.stroke();}
  if(phase==='active'){c.save();c.translate(0,-10);c.rotate(dir);c.strokeStyle=ac.move==='push'?'#a77a45':ac.move==='intercept'?'#d2bb68':'#eee3b9';c.lineWidth=ac.move==='thrust'?2:4;c.beginPath();if(ac.move==='sweep'||ac.move==='push')c.arc(0,0,m.range,-Math.PI/2,Math.PI/2);else if(ac.move==='step'){for(let i=0;i<3;i++){c.moveTo(-i*8,-3);c.lineTo(-i*8-3,3);}}else if(ac.move==='intercept'){c.moveTo(m.range-4,-6);c.lineTo(m.range+4,6);c.moveTo(m.range-4,6);c.lineTo(m.range+4,-6);}else{c.moveTo(6,0);c.lineTo(m.range,0);}c.stroke();c.restore();}
 }else if(a?.kind==='eat'&&!p.moving){ax=7;ay=-23+(v.lowMotion?0:Math.sin((a.progress||0)/7))*3;bx=-4;by=-15;}else if(a?.kind==='talk'&&!p.moving){ax=12;ay=-22+(v.lowMotion?0:Math.sin((a.progress||0)/10))*5;}else if(a?.kind==='train'&&!p.moving){ax=7+(v.lowMotion?0:Math.sin((a.progress||0)/6))*7;ay=-17;}else if(['build','gather','farm','cook'].includes(a?.kind)&&!p.moving){ax=9;ay=-17-(v.lowMotion?0:Math.sin((a.progress||0)/8))*9;}
 c.strokeStyle='#bd9b77';c.lineWidth=3;c.beginPath();c.moveTo(4,-21);c.lineTo(ax,ay);c.moveTo(-4,-21);c.lineTo(bx,by);c.stroke();
 if(p.helping||p.helpedBy){c.strokeStyle='#9c805e';c.lineWidth=2;c.beginPath();c.moveTo(9,-18);c.lineTo(12,1);c.stroke();}if(a?.kind==='gather'&&!p.moving&&a.args.item==='stone'){c.strokeStyle='#6a756d';c.lineWidth=3;c.beginPath();c.moveTo(ax,ay);c.lineTo(ax+10,ay-10);c.lineTo(ax+16,ay-7);c.stroke();}if(a?.kind==='gather'&&!p.moving&&a.args.item==='water'){c.strokeStyle='#7d928b';c.strokeRect(4,-14,10,11);}if(a?.kind==='build'&&!p.moving){c.fillStyle='#8a7755';c.fillRect(ax,ay-8,3,10);c.fillStyle='#7a8172';c.fillRect(ax-4,ay-10,12,4);}
 if(a?.kind==='eat'&&!p.moving){c.fillStyle='#eee4c9';c.beginPath();c.ellipse(-2,-15,7,4,0,0,Math.PI);c.fill();c.strokeStyle='#7f7356';c.lineWidth=1;c.beginPath();c.moveTo(ax,ay);c.lineTo(ax-6,ay-6);c.stroke();}
 if(!p.action&&p.weapon!=='punch'&&(w.inventories[p.equipment]?.items[p.weapon]||0)>0){c.strokeStyle=p.weapon==='staff'?'#8f7048':'#b8ab83';c.lineWidth=2.4;c.beginPath();c.moveTo(7,-15);c.lineTo(p.weapon==='staff'?-10:14,p.weapon==='staff'?-41:-36);c.stroke();if(p.weapon==='sword'){c.strokeStyle='#735e43';c.beginPath();c.moveTo(4,-17);c.lineTo(12,-13);c.stroke();}}
 const items=Object.keys(w.inventories[p.bag].items);if(items.length){const item=items[0];if(item==='tea'){c.fillStyle='#e4ddc7';c.fillRect(7,-19,7,6);c.strokeStyle='#afa384';c.strokeRect(7,-19,7,6);}c.fillStyle=item==='water'?'#7a8c83':item==='stone'?'#8b8a7b':'#9d8059';if(item==='wood'){c.save();c.rotate(-0.2);c.fillRect(-17,-22,34,5);c.restore();}else c.fillRect(6,-17,9,10);}
 c.restore();
 if(a&&['class','talk','encourage','care','teach','paired','story'].includes(a.kind)&&!p.moving){c.fillStyle='#f5eddb';c.beginPath();c.ellipse(x+13,y-32,8,5,0,0,7);c.fill();c.fillStyle='#7c856b';c.font='9px system-ui';c.fillText('…',x+9,y-30);}
 if(labels)drawLabel(c,w,p,v,labelOffset);
}
function drawLabel(c,w,p,v,labelOffset=0){const x=p.x/Q,y=p.y/Q,a=w.activities[p.activity||p.classSession];
 if(w.martialPlan&&p.combatSession){c.save();c.font='10px system-ui';c.textAlign='center';c.fillStyle='#f7efdde8';c.fillRect(x-52,y-84+labelOffset,104,39);c.fillStyle='#344638';c.fillText(p.name,x,y-72+labelOffset);const a=p.action;c.fillStyle=a?.phase==='windup'?'#a87535':a?.phase==='active'?'#a35f43':'#607c6e';c.fillText(a?moveFor(w,a.contentMove||a.move).name+' · '+({windup:'起手',active:'出招',recover:'收勢'}[a.phase])+' '+(a.remaining/20).toFixed(2)+'s':'移位／觀察',x,y-58+labelOffset);c.fillStyle='#c8c4a8';c.fillRect(x-43,y-51+labelOffset,86,3);c.fillStyle='#92a37c';c.fillRect(x-43,y-51+labelOffset,86*p.hp/p.maxHp,3);c.restore();return;}
 if(p.id===v.selected||p.residence==='resident'||p.residence==='visitor'){c.save();c.font='11px system-ui';c.textAlign='center';c.fillStyle='#f5edd9dd';c.fillRect(x-31,y-62+labelOffset,62,18);c.fillStyle='#344638';c.fillText(p.name,x,y-49+labelOffset);if(labelOffset){c.strokeStyle='#8b967c88';c.lineWidth=1;c.beginPath();c.moveTo(x,y-44+labelOffset);c.lineTo(x,y-28);c.stroke();}
  if(p.residence==='resident'||p.id===v.selected||p.action){const b=statusBadge(w,p),label=b.glyph+' '+(p.action?moveFor(w,p.action.contentMove||p.action.move).name+'·':'')+b.text;c.font='12px system-ui';const tw=Math.ceil(c.measureText(label).width)+10;c.fillStyle=BADGE_STYLE.fill;c.fillRect(x-tw/2,y+5,tw,16);c.strokeStyle=BADGE_STYLE.border[b.tone]||BADGE_STYLE.border.idle;c.lineWidth=b.tone==='alert'?2:1;if(b.tone==='alert')c.setLineDash([3,2]);c.strokeRect(x-tw/2,y+5,tw,16);c.setLineDash([]);c.fillStyle=BADGE_STYLE.text;c.fillText(label,x,y+17);}c.restore();}
}
function drawResources(c,w){for(const inv of Object.values(w.inventories))if(inv.pos&&Object.values(inv.items).some(n=>n>0)){c.fillStyle='#aa895c';c.fillRect(inv.pos[0]-6,inv.pos[1]-9,12,10);c.strokeStyle='#e1d0a4';c.strokeRect(inv.pos[0]-6,inv.pos[1]-9,12,10);}for(const [id,label]of [['wood','柴林'],['stone','石場'],['veg','野菜'],['herb','野藥'],['water.take','山潭取水']]){const p=stations[id];c.fillStyle='#58674d';c.font='14px system-ui';c.fillText(label,p[0]-25,p[1]+25);if(id==='stone'){c.fillStyle='#919386';for(let i=0;i<4;i++){c.beginPath();c.ellipse(p[0]-12+i*8,p[1]-10,10,7,0,0,7);c.fill();}}}
 const st=stations['store.drop'];for(let i=0;i<Math.min(8,qty(w,'store','wood'));i++){c.fillStyle='#937657';c.fillRect(st[0]-45+(i%4)*9,st[1]-16-Math.floor(i/4)*6,18,5);}
 c.fillStyle='#9d8d64';c.fillRect(1643,487,26,20);c.fillStyle='#3c594b';c.font='13px system-ui';c.fillText('休整營地',1620,560);
}
function drawMarkers(c,w,v){c.fillStyle='#506052';c.font='16px system-ui';for(const [id,name]of [['forest','林緣'],['valley','溪谷 · 單人窄橋'],['cave','古洞']]){const p=stations[id];c.fillText(name,p[0]-40,p[1]+60);}c.font='12px system-ui';c.fillText('山寨未開放 · 本章止步',2030,80);c.fillText('西南藥坡封路',150,1780);}

export function drawCombatTelegraph(c,w,p,v){const a=p.action,x=p.x/Q,y=p.y/Q,style=STYLES[w.martialPlan?.styles[p.id]||'arhat'];c.save();c.translate(x,y);if(p.id===v.selected){c.strokeStyle=style.color+'88';c.lineWidth=1;c.setLineDash([3,5]);c.beginPath();c.arc(0,0,style.move==='intercept'?30:MOVES[style.move].range+6,0,Math.PI*2);c.stroke();c.setLineDash([]);}if(a?.phase==='windup'){c.rotate(Math.atan2(a.aim[1],a.aim[0]));c.fillStyle='#c5913c30';c.beginPath();c.moveTo(0,0);c.arc(0,0,moveFor(w,a.contentMove||a.move).range+6,-.35,.35);c.closePath();c.fill();c.strokeStyle='#ad844d77';c.lineWidth=1;c.beginPath();c.moveTo(0,0);c.lineTo(moveFor(w,a.contentMove||a.move).range+6,0);c.stroke();}c.restore();}

export function drawSectLife(c,w){if(!w.culturePlan)return;const a=activitiesFor(w)[w.culturePlan.pack],pos={hearth:[907,1180],discipline:[1160,1114],freedom:[1240,1220]}[a.base||w.culturePlan.pack],x=pos[0],y=pos[1];c.save();c.strokeStyle='#776d51';c.lineWidth=3;c.beginPath();c.moveTo(x,y);c.lineTo(x,y-86);c.stroke();c.fillStyle=a.color;c.beginPath();c.moveTo(x,y-84);c.lineTo(x+35,y-80);c.lineTo(x+32,y-32);c.lineTo(x,y-37);c.fill();c.fillStyle='#f7eed8';c.font='18px serif';c.fillText(a.symbol,x+7,y-55);if((a.base||w.culturePlan.pack)==='freedom'){c.fillStyle='#b8b28b';c.fillRect(x+8,y+8,60,14);c.strokeStyle='#8c906d';c.lineWidth=1;for(let i=0;i<10;i++){c.beginPath();c.moveTo(x+10+i*6,y+8);c.lineTo(x+10+i*6,y+22);c.stroke();}}else{c.fillStyle=a.color+'55';c.fillRect(x+5,y+4,46,12);}c.restore();}

export function drawJourney(c,w){const j=w.expedition?.journey;if(!w.trailPlan)return;c.save();c.strokeStyle='#7f7853';c.lineWidth=2;c.strokeRect(1638,532,45,10);c.fillStyle='#bfb28a';c.fillRect(1640,533,41,8);c.fillStyle='#9b805a';for(let i=0;i<3;i++){c.beginPath();c.ellipse(1620+i*9,548,5,3,0,0,7);c.fill();}c.font='12px system-ui';c.fillStyle='#455d4d';c.fillText('營地 · '+(w.expedition?.phase==='campRest'?(j?.camp==='rest'?'留糧慢休':'實糧用餐'):'歇腳／召回'),1610,570);if(j){c.strokeStyle=j.route==='ridge'?'#bd8e5a99':'#628f8b99';c.lineWidth=3;c.setLineDash([6,6]);roadPath(c,[[1660,520],...(TRAIL_ROUTES[j.route].points.length?TRAIL_ROUTES[j.route].points:[[1740,480],[1770,480]])]);c.stroke();c.setLineDash([]);}c.restore();}
