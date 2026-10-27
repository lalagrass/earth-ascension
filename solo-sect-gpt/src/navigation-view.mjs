// M42 read-only navigation projection for the current GPT world, in the adopted NavigationView shape (vendor/public/00f4dbe, see SOURCES.md).
// Only who the watercolour scene draws right now (id, name, DU position) and the three facility cards' points; no path, memory, journal or numbers.
// Camera {x,y,span} becomes the public {x,y,zoom} with zoom = canvas CSS width / span. The epoch is this page's reader lifetime, never saved.
import{navigationView}from'../vendor/public/00f4dbe/navigation-view/contract.mjs';import{Q}from'./data.mjs';import{MAP,rects}from'./map.mjs';import{sorted}from'./state.mjs';import{visibleEntity}from'./view.mjs';import{FACILITY_CARDS}from'./facility-view.mjs';
export const NAV_SOURCE='gpt-local:solo-sect-gpt/src/navigation-view.mjs@00f4dbe';
export const LOCATE_SPAN=520;
// The same people the scene draws (render.mjs actors).
export const publicActors=w=>sorted(w.people).filter(p=>p.residence!=='departed'&&!p.inactive&&visibleEntity(w,p));
const centre=id=>{const r=rects[id]?.rect;return r?{x:r[0]+r[2]/2,y:r[1]+r[3]/2}:null;};
export function createGptNavigation({getWorld}){let world=null,tick=-1,epoch=0;
 const sync=()=>{const w=getWorld();if(w!==world||w.tick<tick){world=w;epoch++;}tick=w.tick;return w;};
 return{get epoch(){return epoch;},
  snapshot({camera,viewport,selectedId=null}){const w=sync(),actors=publicActors(w).map(p=>({id:p.id,label:p.name,x:p.x/Q,y:p.y/Q}));
   const facilities=Object.keys(FACILITY_CARDS).filter(id=>w.facilities[id]).map(id=>({id,label:FACILITY_CARDS[id].label,...centre(id)})).filter(f=>Number.isFinite(f.x));
   return navigationView({definition:{width:MAP.world[0],height:MAP.world[1]},snapshot:{source:NAV_SOURCE,epoch,tick:w.tick,actors,facilities},camera:{x:camera.x,y:camera.y,zoom:viewport.width/camera.span},viewport,selectedId,names:Object.fromEntries(actors.map(a=>[a.id,a.label]))});},
  // The existing facilityLocate camera: rect centre, span 520, follow cleared by the caller.
  locate(id){const c=FACILITY_CARDS[id]&&centre(id);return c?{x:c.x,y:c.y,span:LOCATE_SPAN}:null;},
  // A click is checked against who is public now, not against an old marker.
  isPublicNow(id){const w=getWorld(),p=w.people[id];return!!p&&publicActors(w).includes(p);}};}
