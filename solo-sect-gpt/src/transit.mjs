// M37 one read-only answer to "what is really on its way into this inventory", shared by the facility cards and the resource overview.
// moving: a named carrier holds the goods and is in the phase that walks them here. held: goods in a bag that are not being walked here
// (blocked, stopped, or the carrier is doing something else). A dest: reservation alone is capacity, never goods. No rule is changed.
import{qty}from'./state.mjs';
const stuck=(p,a)=>!!(p.blocked||a?.blocked);
export function transit(w,inv){const moving=[],held=[],put=(list,x)=>{if(x.n>0)list.push(x);};
 // gathering / building supply: a deliver-phase activity with a dest: hold here and the item in the bag
 for(const r of Object.values(w.reservations)){if(!r.key.startsWith('dest:'+inv+':'))continue;const item=r.key.split(':')[2],a=w.activities[r.activity],p=w.people[r.actor];if(!a||!p||a.phase!=='deliver')continue;put(stuck(p,a)?held:moving,{item,n:Math.min(qty(w,p.bag,item),r.n),actorId:p.id,via:a.kind});}
 // cooking / crafting output: batch units sitting in a bag, walked by the activity that is hauling this batch
 for(const [fid,f]of Object.entries(w.facilities)){const b=f.wip?.output;if(!b||b.target!==inv)continue;for(const [loc,n]of Object.entries(b.locations||{})){if(!loc.startsWith('bag.')||!n)continue;const p=Object.values(w.people).find(q=>q.bag===loc);if(!p)continue;const a=w.activities[p.activity],hauling=a&&a.phase==='haulOutput'&&(a.kind==='craft'?'hall':'kitchen')===fid&&f.wip.activity===a.id;put(hauling&&!stuck(p,a)?moving:held,{item:b.item,n,actorId:p.id,via:'output'});}}
 // ground piles and harvest hauls go to the store without a dest: hold
 if(inv==='store')for(const p of Object.values(w.people)){const a=w.activities[p.activity];if(!a||!(a.kind==='collect'&&a.phase==='deliver'||a.kind==='harvestHaul'))continue;for(const [item,n]of Object.entries(w.inventories[p.bag]?.items||{}))put(stuck(p,a)?held:moving,{item,n,actorId:p.id,via:a.kind});}
 return{moving,held};}
