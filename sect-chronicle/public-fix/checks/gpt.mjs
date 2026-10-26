import { Application, Texture } from '../../experiments/water-carry/demo/vendor/pixi.min.mjs';
import { createWorld } from '../../scene-shared/sources/gpt/solo-sect-gpt/src/world.mjs';
import { createGPTAdapter, gptDefinition } from '../../scene-shared/adapters/gpt.mjs';
import { createSceneRenderer } from '../../scene-shared/renderer.mjs';
import { visibleEntity } from '../../scene-shared/sources/gpt/solo-sect-gpt/src/view.mjs';
import { Q } from '../../scene-shared/sources/gpt/solo-sect-gpt/src/data.mjs';
import { gptCard } from '../../character-card/gpt.mjs';
const world=createWorld({seed:11}),target=Object.values(world.people).find(p=>['wild','cave'].includes(p.residence)&&!visibleEntity(world,p)),resident=world.people.leader,home={x:resident.x,y:resident.y};
const adapter=createGPTAdapter({world,appearance:()=>({asset:'dot',frame:0,anchor:{x:.5,y:1},body:{x:-8,y:-20,w:16,h:20},scale:1})});
const app=new Application();await app.init({resizeTo:window,background:'#e8dfc8',antialias:true});document.body.prepend(app.canvas);
const renderer=createSceneRenderer({stage:app.stage,definition:{...gptDefinition(),layers:[]},bindings:{texture:()=>Texture.WHITE}});
let state;
function paint(){const snap=adapter.snapshot({paused:true});renderer.render(snap);for(const s of renderer.actors.values()){s.width=16;s.height=24;}
 renderer.world.position.set(innerWidth/2-target.x/Q,innerHeight/2-target.y/Q);state={target:target.id,visible:visibleEntity(world,target),rendered:renderer.actors.has(target.id),picked:renderer.pick(target.x/Q,target.y/Q-8,1),card:!!gptCard(world,target.id),actors:snap.actors.map(a=>a.id),tick:world.tick};
 document.getElementById('proof').textContent=JSON.stringify(state,null,2);return state;}
document.getElementById('reveal').onclick=()=>{resident.x=target.x+60*Q;resident.y=target.y;paint();};
document.getElementById('conceal').onclick=()=>{Object.assign(resident,home);paint();};
paint();window.visibilityProof={snapshot:()=>structuredClone(state),world:()=>structuredClone(world)};
