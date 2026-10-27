// Source: lalagrass/earth-ascension@00f4dbe26be5765a9622957b7c6a636ab5039f96 sect-chronicle/navigation-view/contract.mjs (see ../../SOURCES.md); unchanged.
// Read-only navigation projection. No world, command, clock, RNG or route inference.
const publicPoint = p => p && p.visible !== false && p.known !== false && !['hidden','unknown','unsupported'].includes(p.visibility) && (!p.availability || p.availability === 'known') && Number.isFinite(p.x) && Number.isFinite(p.y);
const cleanPoint = (p,kind,names) => ({kind,id:String(p.id),label:String(names?.[p.id] || p.label || p.id),x:p.x,y:p.y});
export function cameraFrame(camera,viewport,bounds) {
 if (!(camera.zoom > 0) || ![camera.x,camera.y,viewport.width,viewport.height].every(Number.isFinite)) throw TypeError('Invalid navigation camera');
 const clamp=(v,max)=>Math.max(0,Math.min(max,v));
 const left=clamp(camera.x-viewport.width/(2*camera.zoom),bounds.width),right=clamp(camera.x+viewport.width/(2*camera.zoom),bounds.width);
 const top=clamp(camera.y-viewport.height/(2*camera.zoom),bounds.height),bottom=clamp(camera.y+viewport.height/(2*camera.zoom),bounds.height);
 return {x:left,y:top,width:Math.max(0,right-left),height:Math.max(0,bottom-top)};
}
export function navigationView({definition,snapshot,camera,viewport,selectedId=null,names={}}) {
 const bounds={width:definition.width,height:definition.height};
 if (!(bounds.width>0&&bounds.height>0) || ![bounds.width,bounds.height].every(Number.isFinite)) throw TypeError('Native map bounds required');
 const inBounds=p=>publicPoint(p)&&p.x>=0&&p.x<=bounds.width&&p.y>=0&&p.y<=bounds.height;
 // Definition artwork/facilities and world caches are deliberately never fallbacks.
 const actors=snapshot.actors.filter(inBounds).map(p=>cleanPoint(p,'actor',names));
 const facilities=snapshot.facilities.filter(inBounds).map(p=>cleanPoint(p,'facility'));
 return {identity:`${snapshot.source}:${snapshot.epoch}`,source:snapshot.source,epoch:snapshot.epoch,tick:snapshot.tick,bounds,
  actors,facilities,selectedId:actors.some(a=>a.id===selectedId)?selectedId:null,frame:cameraFrame(camera,viewport,bounds),
  route:{availability:'unsupported',text:'實際路線未提供；不推算路徑或目的地。'}};
}
export function navigationLayers(view,{actors=true,facilities=true}={}) {
 return {...view,actors:actors?view.actors:[],facilities:facilities?view.facilities:[],selectedId:actors?view.selectedId:null};
}
export function pickNavigation(view,kind,id) {
 const list=kind==='actor'?view.actors:kind==='facility'?view.facilities:[];
 const found=list.find(p=>p.id===id);return found?{...found}:null;
}
// SVG uses the native viewBox; this shared transform documents its meet scaling.
export function mapTransform(bounds,width,height) {
 const scale=Math.min(width/bounds.width,height/bounds.height);
 const offset={x:(width-bounds.width*scale)/2,y:(height-bounds.height*scale)/2};
 return {scale,toMap:(x,y)=>({x:(x-offset.x)/scale,y:(y-offset.y)/scale}),toScreen:(x,y)=>({x:x*scale+offset.x,y:y*scale+offset.y})};
}
