import { tick, setOrder, speedOf } from '../sources/grok/solo-sect/src/sim.mjs';
import { NODES, EDGES, FACILITIES } from '../sources/grok/solo-sect/src/data.mjs';
import { SCENE_VERSION } from '../contract.mjs';
import { GROK_SHA } from '../../character-card/grok.mjs';
export const grokDefinition=()=>({id:'grok-native',nodes:structuredClone(NODES),edges:structuredClone(EDGES),facilities:FACILITIES.map(f=>({id:f.id,label:f.name,x:NODES[f.node][0],y:NODES[f.node][1]}))});
// No clock: caller advances the ORIGINAL 0.25-second core once per step.
export function createGrokAdapter({state,appearance}){
 return {observeStep(){tick(state,0.25);},command({actorId,action}){return setOrder(state,actorId,action);},snapshot({paused=false,rate=1}={}){
 return {version:SCENE_VERSION,source:`grok:${GROK_SHA}`,epoch:0,tick:state.t,timeMs:state.t*1000,paused,rate,events:[],facilities:grokDefinition().facilities,
 actors:state.ds.filter(d=>!d.removed&&!d.away).map(d=>{const look=appearance(d);return {id:d.id,x:d.pos[0],y:d.pos[1],depth:d.pos[1],face:d.face||1,asset:look.asset,frame:look.frame,anchor:look.anchor,body:look.body,scale:look.scale||1,action:{id:d.task?.act||'idle',phase:d.task?.phase||'idle',progress:null},load:d.carry?1:0,speed:speedOf(d),label:d.name,positionSource:'core.pos'};})};}};
}
