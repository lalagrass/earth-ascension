import { Application, Graphics } from '../../experiments/water-carry/demo/vendor/pixi.min.mjs';
import { createSceneRenderer } from '../../scene-shared/renderer.mjs';
import { createGrokAdapter, grokDefinition } from '../../scene-shared/adapters/grok.mjs';
import { createState } from '../../scene-shared/sources/grok/solo-sect/src/sim.mjs';
import { grokCard } from '../grok.mjs';
import { renderCard } from '../render.mjs';
const state=createState(11),app=new Application();
await app.init({width:1000,height:800,background:'#d4d0b2',antialias:true});document.querySelector('#scene').append(app.canvas);
const native=grokDefinition(),g=new Graphics();
// Keep native coordinates: camera transform only; never stretch into another map.
for(const edge of native.edges){const [a,b]=edge;if(native.nodes[a]&&native.nodes[b])g.moveTo(...native.nodes[a]).lineTo(...native.nodes[b]).stroke({width:5,color:0xad9b73});}
for(const p of Object.values(native.nodes))g.circle(...p,6).fill(0x697b55);
const bounds=g.getBounds();
const map=app.renderer.generateTexture({target:g});g.destroy();
const dot=new Graphics().ellipse(0,0,10,17).fill(0x647354),texture=app.renderer.generateTexture({target:dot});dot.destroy();
const adapter=createGrokAdapter({state,appearance:()=>({asset:'dot',anchor:{x:.5,y:1},body:{x:-10,y:-34,w:20,h:34}})});
const renderer=createSceneRenderer({stage:app.stage,definition:{id:'grok-native',width:2000,height:1600,layers:[{id:'native',asset:'map',x:bounds.x,y:bounds.y}]},bindings:{texture:id=>id==='map'?map:texture}});
renderer.world.position.set(-650,-150);
let selected=state.ds[0].id;
const selector=document.querySelector('#actor');for(const d of state.ds){const opt=document.createElement('option');opt.value=d.id;opt.textContent=d.name;selector.append(opt);}
function draw(){renderer.render(adapter.snapshot({paused:true}));document.querySelector('#card').innerHTML=renderCard(grokCard(state,selected));}
selector.onchange=()=>{selected=selector.value;draw();};document.querySelector('#step').onclick=()=>{adapter.observeStep();draw();};
window.cardHarness={state,adapter,card:()=>grokCard(state,selected),step:n=>{for(let i=0;i<n;i++)adapter.observeStep();draw();}};draw();
