import {PLOT_BOUNDS,blueprintInfo,constructionFacts,inspectionBounds} from './homestead-construction.mjs';
import {HOME_STYLES,homeLook} from './homestead-look.mjs';
// Canvas 表現只讀狀態：時間來自世界，不另設動畫時鐘。
import{preparedCount}from'./homestead-content.mjs';
import {currentFeelings} from './homestead-living.mjs';
import {FACILITIES,PLACES,HOME,DAY,visitorHere} from './homestead.mjs';
export function sceneFacts(s) {
 const people=[s.person,s.helper].filter(Boolean);
 return {cooking:!!s.fac.kitchen.stage && people.some(p=>p.task?.act==='cook' && p.task.phase==='do'&&p.task.recipe!=='salad'),
  resting:people.filter(p=>p.task?.act==='rest' && p.task.phase==='do').length,
  leisure:people.filter(p=>p.task?.act==='leisure' && p.task.phase==='do').length,
  night:s.t%DAY/DAY<.2 || s.t%DAY/DAY>.8,
  gardenScale:s.plot.state==='ripe'?1:s.plot.state==='growing'?.25+.65*Math.min(1,s.plot.growth/34):0};
}
export function drawHomestead(g,s,preview,blueprint,inspected) {
 const look=homeLook(s,preview),palette=HOME_STYLES[look.style];
 const facts=sceneFacts(s), boxes=[];
 const rect=(x,y,w,h,color)=>{g.fillStyle=color;g.fillRect(x,y,w,h);};
 const circle=(x,y,r,color)=>{g.fillStyle=color;g.beginPath();g.arc(x,y,r,0,Math.PI*2);g.fill();};
 const ellipse=(x,y,w,h,color)=>{g.fillStyle=color;g.beginPath();g.ellipse(x,y,w,h,0,0,7);g.fill();};
 const line=(points,color,width=3)=>{g.strokeStyle=color;g.lineWidth=width;g.beginPath();points.forEach(([x,y],i)=>i?g.lineTo(x,y):g.moveTo(x,y));g.stroke();};
 function tag(text,x,y,person=false) {
  g.font=person?'bold 14px sans-serif':'bold 15px sans-serif';const w=g.measureText(text).width+14,h=24;
  let bx=Math.max(3,Math.min(897-w,x-w/2)),by=Math.max(3,Math.min(533,y));
  const overlaps=(xx,yy)=>boxes.some(b=>xx<b.x+b.w && xx+w>b.x && yy<b.y+b.h && yy+h>b.y);
  const choices=[[bx,by],[bx,by-28],[bx,by+28],[Math.max(3,bx-w-8),by],[Math.min(897-w,bx+w+8),by]];
  for(const [xx,yy] of choices)if(yy>=3 && yy<534 && !overlaps(xx,yy)){bx=xx;by=yy;break;}
  boxes.push({x:bx,y:by,w,h});rect(bx,by,w,h,person?'#fff1d8e8':'#f9f5dfdc');g.fillStyle='#2f402e';g.textAlign='center';g.fillText(text,bx+w/2,by+17);
 }
 const gradient=g.createLinearGradient(0,0,0,560);gradient.addColorStop(0,facts.night?'#9daea4':'#d9e6c9');gradient.addColorStop(1,facts.night?'#788c7b':'#adc18b');g.fillStyle=gradient;g.fillRect(0,0,900,560);
 for(let i=0;i<32;i++)ellipse(20+i*31,48+(i*71)%460,16,5,'#85996d55');
 g.lineCap='round';g.strokeStyle='#cbbb97';g.lineWidth=32;g.beginPath();g.moveTo(...PLACES.berries);g.quadraticCurveTo(420,425,...HOME);g.quadraticCurveTo(620,420,...PLACES.wood);g.stroke();
 ellipse(...HOME,80,48,'#a3957155');
 for(let i=0;i<5;i++){const x=105+i*24,y=316+(i%2)*35;circle(x,y,22,'#496e43');for(let j=0;j<Math.min(4,Math.ceil(s.wild.berries));j++)circle(x-10+j*7,y-5+(j%2)*8,3,'#b9574b');}
 for(let i=0;i<5;i++){const x=670+i*30,y=210+(i%2)*65;rect(x-6,y,12,67,'#72543c');circle(x,y-8,29,'#466b49');}
 for(let i=0;i<5;i++)ellipse(110+i*17,175+(i%2)*15,9,6,'#547c55');
 const hut=s.fac.hut;
 if(hut.stage){
  ellipse(448,285,100,16,'#4c473b33');rect(372,177,142,104,hut.stage===2?'#b69b70':'#96714d');
  for(let y=185;y<275;y+=14)line([[374,y],[512,y]],hut.stage===2?'#9b7b58':'#725239',2);
  g.fillStyle=palette.roof[hut.stage-1];g.beginPath();g.moveTo(350,183);g.lineTo(444,113);g.lineTo(537,183);g.closePath();g.fill();
  if(hut.stage===1){for(let i=0;i<7;i++)line([[370+i*11,176],[442+i*5,128]],'#a18a5666',3);}else{
   for(let y=139;y<182;y+=11)line([[444-(y-113)*1.32,y],[444+(y-113)*1.32,y]],'#573d33',2);
   rect(367,179,152,7,palette.trim);rect(388,203,23,24,'#e7d6a2');rect(478,203,23,24,'#e7d6a2');line([[399,203],[399,227]],look.style==='natural'?'#866b49':palette.trim,2);line([[489,203],[489,227]],look.style==='natural'?'#866b49':palette.trim,2);if(look.style!=='natural')for(const x of[388,478])line([[x,227],[x,203],[x+23,203],[x+23,227]],palette.trim,2);rect(415,277,60,8,'#baaa8c');
  }
  if(s.fac.bed?.stage){rect(420,205,44,23,'#6c533c');rect(422,206,40,16,s.fac.bed.stage===2?'#9db8c2':'#e5dbbf');rect(422,207,11,13,'#f2ead4');if(s.fac.bed.stage===2)rect(451,207,10,13,'#f2ead4');}
  rect(431,225,30,56,'#493728');circle(455,252,2,'#d5b17d');
  if(look.style!=='natural'){line([[427,281],[427,222],[465,222],[465,281]],palette.trim,5);line([[353,184],[535,184]],palette.trim,5);}
 }
 if(!hut.stage&&hut.site){const f=constructionFacts(s,'hut');
  for(const x of[372,514])line([[x,281],[x,264]],'#92704c',5);
  if(f.work>0){rect(370,271,148,12,'#a89978');line([[372,275],[516,275]],'#d3c29a',3);}
  if(f.progress>=1/3){for(const x of[374,430,462,512])line([[x,272],[x,179]],'#926440',6);line([[373,180],[514,180]],'#a88150',7);line([[375,265],[509,185]],'#8b6c49',4);}
  if(f.progress>=2/3){g.fillStyle=palette.roof[0]+'bb';g.beginPath();g.moveTo(350,183);g.lineTo(444,113);g.lineTo(537,183);g.closePath();g.fill();line([[350,183],[444,113],[537,183]],'#b09363',5);for(let y=198;y<245;y+=18)line([[375,y],[512,y]],'#9c7850',8);}
 }
 function plot(id,x,y,w,h,p,growth,color){
  const f=s.fac[id];rect(x,y,w,h,f.stage?'#796247':'#94a47555');
  if(f.stage)for(let row=0;row<3;row++){rect(x+7,y+9+row*18,w-14,8,'#9b7e50');if(p.state!=='empty')for(let col=0;col<5;col++){const scale=p.state==='ripe'?1:.25+.65*Math.min(1,p.growth/growth);ellipse(x+14+col*(w-24)/4,y+13+row*18,8*scale,6*scale,color);line([[x+14+col*(w-24)/4,y+17+row*18],[x+14+col*(w-24)/4,y+7+row*18]],'#436a3b',2*scale);}}
 }
 plot('garden',210,127,120,72,s.plot,34,s.plot.state==='ripe'?'#5e9745':'#94b767');plot('herbGarden',80,58,110,66,s.herbPlot,50,'#6d9d72');
 const kitchen=s.fac.kitchen;
 ellipse(...PLACES.kitchen,35,24,kitchen.stage?'#766e5a':'#a69d8055');
 if(kitchen.stage===2){rect(573,342,66,39,'#9c9179');rect(587,350,38,26,'#4c4a41');rect(576,323,8,23,'#a6a08c');}
 if(kitchen.stage){for(let i=0;i<7;i++)circle(605+Math.cos(i)*28,365+Math.sin(i)*14,8,'#827d6b');
  if(facts.cooking){g.fillStyle='#dc8238';g.beginPath();g.moveTo(586,363);g.lineTo(597,335);g.lineTo(603,348);g.lineTo(612,331);g.lineTo(623,363);g.fill();ellipse(606,351,10,12,'#f1c766');line([[598,321],[595,307],[602,294]],'#eceaddaa',4);line([[613,321],[619,306],[614,294]],'#eceadd88',3);}
  ellipse(605,332,25,10,'#494b44');rect(580,329,50,8,'#51574f');
 }
 if(s.fac.workbench?.stage){rect(637,448,78,9,'#ae8256');rect(643,457,6,31,'#69503b');rect(702,457,6,31,'#69503b');rect(650,441,30,6,'#7a6048');line([[687,439],[702,444]],'#c1c2b5',4);}
 if(s.fac.store.stage){rect(505,437,99,60,'#8b7653');g.fillStyle='#64523b';g.beginPath();g.moveTo(493,437);g.lineTo(555,410);g.lineTo(617,437);g.fill();rect(512,448,85,4,'#bba577');}
 for(let i=0;i<Math.min(10,s.stock.wood);i++){rect(515+(i%2)*33,489-Math.floor(i/2)*8,30,6,'#765337');circle(542+(i%2)*33,492-Math.floor(i/2)*8,3,'#ba925d');}
 for(let i=0;i<Math.min(4,Math.ceil((s.stock.berries+s.stock.veg+preparedCount(s))/4));i++){rect(575+i%2*17,480-Math.floor(i/2)*17,14,13,'#b5a174');rect(577+i%2*17,482-Math.floor(i/2)*17,10,3,'#69805a');}
 for(const [id,f]of Object.entries(s.fac))if(f.site){if(id==='hut'&&!f.stage){g.setLineDash([8,5]);g.strokeStyle=id===s.focusProject?'#ffe16a':'#f6e4ae';g.lineWidth=3;g.strokeRect(350,113,187,172);g.setLineDash([]);for(let i=0;i<f.site.delivered.wood;i++)rect(540,272-i*7,40,5,'#9d7347');if(f.site.work>0){rect(372,291,142,6,'#6b654e');rect(372,291,142*Math.min(1,f.site.work/f.site.workNeed),6,'#edc473');}continue;}const recipe=FACILITIES[id].stages[f.stage+1],point=recipe?.craft&&f.site.crafted<recipe.craft?PLACES.workbench:PLACES[id];const[x,y]=point;g.setLineDash([8,5]);g.strokeStyle=id===s.focusProject?'#ffe16a':'#f6e4ae';g.lineWidth=id===s.focusProject?5:3;g.strokeRect(x-45,y-40,90,70);g.setLineDash([]);line([[x-45,y+30],[x-45,y-45],[x+45,y-45],[x+45,y+30]],'#917450',4);for(let i=0;i<(!recipe.craft||f.site.crafted<recipe.craft?f.site.delivered.wood:0);i++)rect(x-28,y+22-i*6,55,4,'#9d7347');if(f.site.work>0){rect(x-40,y+34,80,5,'#6b654e');rect(x-40,y+34,80*Math.min(1,f.site.work/f.site.workNeed),5,'#edc473');}}
 for(const f of Object.values(s.fac))if(f.site?.assemblyAt){const[x,y]=f.site.assemblyAt;rect(x-18,y-12,36,12,'#8d6d48');line([[x-20,y-14],[x+20,y-14]],'#d1b37d',4);}
 if(s.fac.bench?.stage){rect(318,397,68,10,'#996f44');rect(322,407,6,16,'#655139');rect(376,407,6,16,'#655139');line([[321,390],[383,390]],'#b08a5b',6);}
 if(s.fac.flowers?.stage)for(let i=0;i<7;i++){const x=302+i*12,y=291+(i%2)*10;line([[x,y],[x,y-14]],'#53804d',3);circle(x,y-16,6,i%2?'#cb8e8c':'#e4be67');circle(x,y-16,2,'#f5df98');}
 if(blueprint&&Object.hasOwn(PLOT_BOUNDS,blueprint.id)&&s.fac[blueprint.id].stage===blueprint.stage){
  const q=blueprintInfo(s,blueprint.id,blueprint.stage),[x,y,w,h]=q.bounds,color=q.ok?'#315f8c':'#88523d';
  g.save();g.globalAlpha=.22;rect(x,y,w,h,color);g.restore();g.setLineDash([7,4]);g.strokeStyle=color;g.lineWidth=3;g.strokeRect(x,y,w,h);g.setLineDash([]);
  if(blueprint.id==='hut')line([[350,183],[444,113],[537,183],[514,183],[514,281],[372,281],[372,183],[350,183]],color,3);
  const[px,py]=q.point;circle(px,py,7,color);tag('固定地塊預覽 · '+q.name,x+w/2,Math.max(3,y-30));
  if(blueprint.id==='hut'){line([[444,283],[444,305]],color,3);tag('出入口示意',570,308);}
 }
 if(inspected&&Object.hasOwn(PLOT_BOUNDS,inspected)){const[x,y,w,h]=inspectionBounds(s,inspected);g.strokeStyle='#244f7a';g.lineWidth=4;g.setLineDash([3,4]);g.strokeRect(x-3,y-3,w+6,h+6);g.setLineDash([]);}
 // Feature labels first, then compact character tags choose a non-overlapping nearby slot.
 for(const id of ['hut','garden','herbGarden','kitchen','store',...(s.mode==='solo'?['workbench']:[])]){const pt={hut:[445,77],garden:[270,99],herbGarden:[135,28],kitchen:[605,278],store:[555,507],workbench:[676,501]}[id];tag(`${id==='hut'&&hut.stage&&look.name?look.name+' · ':''}${FACILITIES[id].stages[s.fac[id].stage].name}`,...pt);}
 tag('野果叢',155,380);tag('林緣枯木',745,129);tag('草藥坡',80,201);tag('村路',825,491);
 function person(p,color){const[x,y]=p.pos,t=p.task,rest=t?.act==='rest'&&t.phase==='do',sit=t?.act==='leisure'&&t.phase==='do';ellipse(x,y+4,15,6,'#423a3555');
  if(rest){rect(x-20,y-20,39,16,s.fac.bed?.stage===2?'#9db8c2':'#bcac8c');circle(x-19,y-14,8,'#e3bd92');g.font='bold 17px sans-serif';g.fillStyle='#eee8d2';g.fillText('z',x+12,y-24);}else{rect(x-9,y-(sit?20:33),18,sit?21:34,color);circle(x,y-(sit?28:42),10,'#e3bd92');if(sit)line([[x-8,y],[x+8,y]],'#493f34',4);}
  if(p.task?.step==='install'&&p.task.phase==='go')rect(x+10,y-25,25,16,'#b28d61');
  if(p.carry)rect(x+12,y-24,16,12,p.carry.kind==='wood'?'#8f6238':'#bc8b55');
  if(t?.act==='build'&&t.phase==='do'){line([[x+9,y-29],[x+27,y-45]],'#715232',4);line([[x+21,y-48],[x+32,y-41]],'#aaa797',6);}
  tag(p.name,x,y-(rest?58:76),true);
  if(p===s.person&&currentFeelings(s).value>0){circle(x+23,y-45,8,'#e8cc73');g.fillStyle='#715c35';g.font='12px sans-serif';g.fillText('♪',x+20,y-41);}
 }
 person(s.person,'#3e6481');if(s.helper)person(s.helper,'#a46652');else if(visitorHere(s))person({pos:PLACES.visitor,name:s.visitor.name},'#a46652');
 g.textAlign='left';
}
