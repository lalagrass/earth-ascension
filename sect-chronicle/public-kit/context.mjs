const fullSha=/^[a-f0-9]{40}$/;
// Optional public provenance. The writer is not inferred from the observed object.
export function withObservation(record,{branch,sha,writer,mode,tick}) {
 if(!branch||!fullSha.test(sha)||!writer||!mode||!Number.isFinite(tick))throw TypeError('Explicit branch/SHA/writer/mode/tick required');
 return {...structuredClone(record),observation:{branch,sha,writer,mode,tick}};
}
// Caller proves the current mode's owner. Never borrow another owner's energy,
// reason or stale lifePos just because the selected position is absent.
export function positionForOwner({owner,scenePosition,lifePosition,routePosition}) {
 const values={'worker.scenePosition':scenePosition,'persona.lifePos':lifePosition,'worker.routeProjection':routePosition};
 if(!Object.hasOwn(values,owner))throw TypeError('Unknown position owner');
 const p=values[owner];return p&&[p.x,p.y].every(Number.isFinite)?{x:p.x,y:p.y,owner}:null;
}
// Region-local navigation: camera AND points subtract the same explicit native
// origin. Relative foot anchors, body boxes, zoom and viewport pixels stay local.
export function localNavigationInput({definition,snapshot,camera,viewport,origin}) {
 if(!origin||![origin.x,origin.y].every(Number.isFinite))throw TypeError('Explicit region origin required');
 const point=p=>({...p,x:p.x-origin.x,y:p.y-origin.y});
 return {definition:{...structuredClone(definition),layers:[]},snapshot:{...structuredClone(snapshot),
  actors:snapshot.actors.map(p=>({...point(p),depth:Number.isFinite(p.depth)?p.depth-origin.y:p.depth})),
  facilities:snapshot.facilities.map(p=>({...point(p),...(p.entrance?{entrance:point(p.entrance)}:{})})),events:[]},
  camera:{...camera,x:camera.x-origin.x,y:camera.y-origin.y},viewport:{...viewport}};
}
