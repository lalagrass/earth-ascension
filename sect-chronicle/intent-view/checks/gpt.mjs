import {createWorld,step} from '../../scene-shared/sources/gpt/solo-sect-gpt/src/world.mjs';
import {createGPTIntentAdapter} from '../gpt.mjs';import {intentHtml} from '../render.mjs';import {createViewWriter} from '../../public-fix/view-state.mjs';
const world=createWorld({seed:11}),adapter=createGPTIntentAdapter({getWorld:()=>world}),put=createViewWriter(),panel=document.getElementById('panel');let result=null,playing=false,last=performance.now(),acc=0;
function render(){put('intent',panel,intentHtml(adapter.snapshot('leader'),{result}),'leader');document.getElementById('state').textContent=`GPT 6cbd3e6fccb8bc376e95e2f406ce6cead2a30fdc · tick ${world.tick} · manualStop ${world.people.leader.manualStop} · auto ${world.people.leader.auto}`;}
panel.addEventListener('click',e=>{const b=e.target.closest('[data-intent-command]');if(!b)return;const r=adapter.command({actorId:b.dataset.intentActor,commandId:b.dataset.intentCommand,payload:JSON.parse(b.dataset.intentPayload)},{expectedActorId:'leader'});result=r.ok?'原核心已受理':r.reason;render();});
document.getElementById('play').onclick=()=>{playing=!playing;acc=0;document.getElementById('play').textContent=playing?'暫停原世界':'繼續原世界';};
function frame(now){const dt=Math.min(250,now-last);last=now;if(playing){acc+=dt;while(acc>=50){step(world);acc-=50;}}render();requestAnimationFrame(frame);}render();requestAnimationFrame(frame);
document.addEventListener('visibilitychange',()=>{if(document.hidden){playing=false;acc=0;}});
window.intentHarness={snapshot:()=>adapter.snapshot('leader'),world:()=>structuredClone(world),pause:()=>{playing=false;acc=0;}};
