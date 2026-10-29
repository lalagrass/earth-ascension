import {createHomestead,inviteHelper,saveHomestead} from '../../src/homestead.mjs';
import {previewTransfer} from '../../src/homestead-transfer.mjs';
import {load,save,tick,setOrder} from '../../src/sim.mjs';
export function scenario({personality='diligent',apprentice=false,low=false,interrupt=false,reload=false}={}) {
 const h=createHomestead({name:'阿雲',personality});h.fac.hut.stage=1;h.stock.meal=low?0:2;
 if(apprentice){h.t=70;h.visitor.willing=true;h.visitor.trust=4;inviteHelper(h);h.visitor.role='apprentice';h.visitor.apprenticeDay=1}
 let s=load(previewTransfer(saveHomestead(h)).candidate).state;
 const initialFood=s.res.food; let produced=0,consumed=0,minHunger=100,minEnergy=100,maxZeroSeconds=0;
 const zero=s.ds.map(()=>0),eaten=s.ds.map(()=>0),rested=s.ds.map(()=>false),days=[];
 for(let i=0;i<7200;i++){
  if(interrupt&&i===4400)setOrder(s,'hero','chop');if(interrupt&&i===4440)setOrder(s,'hero',null);
  if(reload&&i===4444){const r=load(save(s));if(!r.ok)throw Error(r.err);s=r.state}
  const beforeFood=s.res.food,before=s.ds.map(d=>({h:d.needs.hunger,act:d.task?.act}));tick(s);
  const diff=s.res.food-beforeFood;if(diff>0)produced+=diff;else consumed-=diff;
  s.ds.forEach((d,j)=>{if(d.needs.hunger>before[j].h&&before[j].act==='eat')eaten[j]++;if(d.task?.act==='rest')rested[j]=true;minHunger=Math.min(minHunger,d.needs.hunger);minEnergy=Math.min(minEnergy,d.needs.energy);zero[j]=d.needs.hunger===0?zero[j]+.25:0;maxZeroSeconds=Math.max(maxZeroSeconds,zero[j])});
  if((i+1)%2400===0)days.push({elapsedDays:(i+1)/2400,food:s.res.food,veg:s.res.veg,wood:s.res.wood,produced,consumed,needs:s.ds.map(d=>({id:d.id,hunger:d.needs.hunger,energy:d.needs.energy}))});
 }
 return {personality,apprentice,low,interrupt,reload,initialFood,minHunger,minEnergy,maxZeroSeconds,produced,consumed,eaten,rested,days,finalState:s};
}
