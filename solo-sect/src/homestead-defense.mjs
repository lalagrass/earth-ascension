import {preparedCount} from './homestead-content.mjs';
export const REPAIR={name:'修補林緣柵欄',offers:[],cost:{wood:1},work:6};
export const fenceMax=s=>s.fac.fence?.stage===2?48:s.fac.fence?.stage===1?24:0;
export function defensePlan(s,hooks){
 const f=s.frontier;if(!f||f.approach!=='guard'||!s.autonomy.warmMeals||s.t<360)return null;
 const wall=s.fac.fence;if(wall.site?.paused)return null;
 if(wall.stage&&f.fenceHp>0&&!f.gateManual&&f.gateOpen&&f.threat.phase!=='quiet')return 'closeGate';
 if(s.person.hunger<45||s.person.energy<40||preparedCount(s)<1)return null;
 if(wall.stage<2&&!wall.site)hooks.start('fence');
 if(wall.stage===2&&!wall.site&&f.fenceHp<=fenceMax(s)-12&&f.threat.phase==='quiet')hooks.repair();
 if(wall.site){if(hooks.can('build'))return 'build';if(s.stock.wood<1&&hooks.can('chop'))return 'chop';}
 return null;
}
export function defenseText(s){const f=s.frontier,w=s.fac.fence;if(!w.stage)return '防線：尚未建造；可選擇守家，或往後學武。';return `防線${f.fenceHp}/${fenceMax(s)}；${w.site?.repair?'正補送1木並現場修補12耐久；工量完成仍須等屏障範圍無人／獸，避免封住角色':w.site?'加固工程進行中':'修補需1木＋現場6秒補12；加固另3木＋15秒至48'}。門由${f.gateManual?'玩家控制':'角色按預警照看'}，暫停的工程不會自行恢復。`;}
