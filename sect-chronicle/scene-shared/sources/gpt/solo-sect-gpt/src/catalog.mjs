import core from'../content/core-v1.json'with{type:'json'};
export function frozen(o){if(o&&typeof o==='object'&&!Object.isFrozen(o)){for(const v of Object.values(o))frozen(v);Object.freeze(o);}return o;}
export const CORE=frozen(core);const cache=new WeakMap();
function catalog(w){const state=w?.contentState;if(!state||!state.packs.length)return CORE;if(cache.has(state))return cache.get(state);const out={people:{...CORE.people},moves:{...CORE.moves},events:{...CORE.events},sectActivities:{...CORE.sectActivities}};for(const entry of state.packs){const p=structuredClone(entry.data);Object.assign(out.people,p.people);for(const [id,m]of Object.entries(p.moves))out.moves[id]={...CORE.moves[m.base],...m,art:CORE.moves[m.base].art};Object.assign(out.events,p.events);for(const [id,a]of Object.entries(p.sectActivities))out.sectActivities[id]={...CORE.sectActivities[a.base],...a};}frozen(out);cache.set(state,out);return out;}
export const movesFor=w=>catalog(w).moves,peopleFor=w=>catalog(w).people,eventsFor=w=>catalog(w).events,activitiesFor=w=>catalog(w).sectActivities;
export const moveFor=(w,id)=>Object.hasOwn(movesFor(w),id)?movesFor(w)[id]:null;
export const isPackMove=(w,id)=>!!moveFor(w,id)?.base;
export const isPackPerson=(w,id)=>!!w?.contentState&&!Object.hasOwn(CORE.people,id)&&Object.hasOwn(peopleFor(w),id);
