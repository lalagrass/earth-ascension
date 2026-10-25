// Display-only assets. Never imported by simulation or saved in World.
const sprites=new Map;
export function sprite(name){if(typeof Image==='undefined')return null;if(!sprites.has(name)){const image=new Image;image.src=new URL('../assets/watercolor/'+name+'-v1.png',import.meta.url).href;sprites.set(name,image);}const image=sprites.get(name);return image.complete&&image.naturalWidth?image:null;}
let ground,groundMeadow=false;
export function paintedGround(c){
 if(!ground){ground=document.createElement('canvas');ground.width=2400;ground.height=1800;const g=ground.getContext('2d');g.fillStyle='#bbc5a1';g.fillRect(0,0,2400,1800);
 for(let i=0;i<115;i++){const x=(i*277+83)%2400,y=(i*389+123)%1800,r=80+i%7*24,z=g.createRadialGradient(x,y,0,x,y,r);z.addColorStop(0,['#607b6935','#f4e6b35c','#8eab7335','#e2d7ad40'][i%4]);z.addColorStop(1,'#a6b38b00');g.fillStyle=z;g.fillRect(x-r,y-r,r*2,r*2);}
 const z=g.createRadialGradient(1070,1220,70,1070,1220,640);z.addColorStop(0,'#e2dab8cc');z.addColorStop(.7,'#d5d1ae65');z.addColorStop(1,'#c1c8a300');g.fillStyle=z;g.fillRect(330,800,1270,1000);
 for(let i=0;i<2400;i++){const x=(i*173+19)%2400,y=(i*307+27)%1800;g.strokeStyle=i%3?'#68856420':'#f5edcc65';g.lineWidth=.6;g.beginPath();g.moveTo(x,y);g.lineTo(x-2,y-3-i%4);g.stroke();}
 }const meadow=sprite('meadow');if(meadow&&!groundMeadow){const g=ground.getContext('2d'),pattern=g.createPattern(meadow,'repeat');pattern.setTransform(new DOMMatrix().scale(.5));g.save();g.globalAlpha=.28;g.fillStyle=pattern;g.fillRect(0,0,2400,1800);g.restore();groundMeadow=true;}c.drawImage(ground,0,0);
}
export function buildingShell(c,f,stage){const[x,y,a,b]=f.rect,h=stage?32:24;
 c.save();c.fillStyle='#4f594a24';c.beginPath();c.moveTo(x-6,y+b);c.lineTo(x+a+20,y+b+12);c.lineTo(x+a+25,y+15);c.lineTo(x+a,y);c.closePath();c.fill();
 // Walls rise from the physical footprint. The real 28 DU doorway stays open.
 c.fillStyle=stage===2?'#d5c7a5':'#c1b08d';c.fillRect(x,y-h,a,h);c.fillStyle='#b6a57f';c.fillRect(x,y-h,5,b+h);c.fillStyle='#998b6c';c.fillRect(x+a-5,y-h,5,b+h);
 const door=f.door[0];c.fillStyle='#ded0ab';c.fillRect(x,y+b-h,door-14-x,h);c.fillRect(door+14,y+b-h,x+a-door-14,h);c.strokeStyle='#756b50';c.lineWidth=3;
 for(const px of [x+3,door-15,door+15,x+a-3]){c.beginPath();c.moveTo(px,y+b-h);c.lineTo(px,y+b);c.stroke();}
 c.strokeStyle='#b6a47d';c.lineWidth=1;for(let i=8;i<h;i+=8){c.beginPath();c.moveTo(x+5,y+b-i);c.lineTo(door-19,y+b-i);c.moveTo(door+19,y+b-i);c.lineTo(x+a-5,y+b-i);c.stroke();}
 // Windows, jars, doorstep and washing line are independent props.
 c.fillStyle='#65786c';for(const px of [x+15,x+a-31])if(Math.abs(px-door)>28){c.fillRect(px,y+b-h+8,16,13);c.strokeStyle='#9e8a63';c.lineWidth=2;c.strokeRect(px,y+b-h+8,16,13);c.beginPath();c.moveTo(px+8,y+b-h+8);c.lineTo(px+8,y+b-h+21);c.stroke();}
 c.fillStyle='#b8ad8b';c.fillRect(door-15,y+b-1,30,6);c.fillStyle='#a18461';c.beginPath();c.ellipse(x+9,y+b+5,6,8,0,0,7);c.fill();c.fillStyle='#66865e';for(let i=0;i<4;i++){c.beginPath();c.ellipse(x+7+i*2,y+b-4-i%2*4,3,6,i*.7,0,7);c.fill();}c.restore();
}
export function roofLayer(c,f){const im=sprite('roof');if(!im)return false;const[x,y,a,b]=f.rect;c.drawImage(im,0,75,1536,830,x-15,y-57,a+30,b+27);return true;}
export function treeLayer(c,x,y,variant,fade=false){const im=sprite('tree');if(!im)return false;c.save();c.globalAlpha=fade?.32:1;const s=80+variant%4*9;c.drawImage(im,x-s*.5,y-s*1.25,s,s*1.25);c.restore();return true;}
export function bridgeLayer(c,r,front=false){const im=sprite('bridge');if(!im)return false;const[x,y,w,h]=r;const sx=38,sy=150,sw=1690,sh=570;if(front)c.drawImage(im,sx,sy+sh*.63,sw,sh*.37,x-6,y+h*.48,w+12,h*.62);else c.drawImage(im,sx,sy,sw,sh,x-6,y-14,w+12,h+26);return true;}
export function lifeProps(c,w){
 // Cosmetic ground props outside route centers, no hidden new collision walls.
 c.save();c.strokeStyle='#7c7f5c';c.lineWidth=1.4;c.beginPath();c.moveTo(852,1138);c.lineTo(916,1138);c.stroke();for(let i=0;i<3;i++){c.fillStyle=['#e5dbbd','#b6b79a','#c3a57c'][i];c.fillRect(859+i*18,1139,12,15);}
 for(const[x,y]of [[850,1290],[915,1310],[1273,1294]]){c.fillStyle='#a08561';c.beginPath();c.ellipse(x,y,9,6,0,0,7);c.fill();c.strokeStyle='#c5b493';c.stroke();c.strokeStyle='#71694e';c.beginPath();c.ellipse(x,y-5,7,3,0,0,7);c.stroke();}
 if(w.activities&&Object.values(w.activities).some(a=>a.kind==='cook'&&a.progress>0)){c.strokeStyle='#fcf6e6aa';c.lineWidth=2;for(let i=0;i<3;i++){const dy=w.tick%60/3;c.beginPath();c.moveTo(752+i*6,1220-dy);c.bezierCurveTo(745+i*6,1212-dy,762+i*6,1208-dy,751+i*6,1199-dy);c.stroke();}}
 c.restore();
}
export function roadPath(c,points){c.beginPath();c.moveTo(...points[0]);for(let i=1;i<points.length;i++){const p=points[i],q=points[i+1];if(!q){c.lineTo(...p);break;}const prev=points[i-1],d=Math.hypot(p[0]-prev[0],p[1]-prev[1]),n=Math.hypot(q[0]-p[0],q[1]-p[1]),r=Math.min(9,d/3,n/3),a=[p[0]-(p[0]-prev[0])*r/d,p[1]-(p[1]-prev[1])*r/d],b=[p[0]+(q[0]-p[0])*r/n,p[1]+(q[1]-p[1])*r/n];c.lineTo(...a);c.quadraticCurveTo(...p,...b);}}
