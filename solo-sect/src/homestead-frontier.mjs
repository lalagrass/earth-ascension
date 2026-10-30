import {freshSource,freshTrip,validExpedition,expeditionText} from './homestead-expedition.mjs';
import {freshCompanion,validCompanion,socialText} from './homestead-social.mjs';
import {freshMartial,freshTalents,validMartial,martialText} from './homestead-martial.mjs';
import {fenceMax,defenseText} from './homestead-defense.mjs';
import {freshThreat,validThreat,threatText} from './homestead-threat.mjs';
export const FRONTIER_VERSION=5;
export const APPROACHES={guard:'先守好家',learn:'先學會應對',peace:'尋求長久安寧'};
export function freshFrontier(approach='guard',body=1){return {version:1,approach:Object.hasOwn(APPROACHES,approach)?approach:'guard',gateOpen:true,gateManual:false,repairWood:0,fenceHp:0,threat:freshThreat(),martial:freshMartial(),talents:freshTalents(body),companion:freshCompanion(),source:freshSource(),trip:freshTrip()};}
export function validFrontier(s){const f=s.frontier;return f===null||f===undefined||!!(f&&s.version===FRONTIER_VERSION&&s.mode==='solo'&&s.autonomy&&f.version===1&&Object.hasOwn(APPROACHES,f.approach)&&typeof f.gateOpen==='boolean'&&Number.isFinite(f.fenceHp)&&f.fenceHp>=0&&f.fenceHp<=fenceMax(s)&&typeof f.gateManual==='boolean'&&Number.isInteger(f.repairWood)&&f.repairWood>=0&&validThreat(s)&&validMartial(f)&&validCompanion(s)&&validExpedition(s));}
export function frontierText(s){return s.frontier?`生活與山林試作 · ${APPROACHES[s.frontier.approach]}；先沿原本性情自主安家。${s.fac.fence?.stage?`林緣柵欄 ${fenceHealth(s)}，門${s.frontier.gateOpen?'開':'關'}；兩端可繞行。`:'可在固定林緣地塊立柵欄。'} ${threatText(s)} ${defenseText(s)} ${martialText(s)} ${socialText(s)} ${expeditionText(s)}` :'';}

export function upgradeFrontier(s){if(s.frontier){s.frontier.gateOpen??=true;s.frontier.fenceHp??=s.fac.fence?.stage?24:0;s.frontier.threat??=freshThreat();s.frontier.gateManual??=true;s.frontier.repairWood??=0;s.frontier.martial??=freshMartial();s.frontier.talents??=freshTalents();s.frontier.companion??=freshCompanion();s.frontier.companion.practiceXP??=1;s.frontier.companion.sparDay??=0;s.frontier.companion.taught??=false;s.frontier.martial.partnerRounds??=0;s.frontier.source??=freshSource();s.frontier.trip??=freshTrip();}}
export function toggleGate(s,manual=true){if(!s.frontier||!s.fac.fence.stage)return false;const people=[s.person,s.helper,s.frontier.threat?.beast,s.frontier.companion?.present?s.frontier.companion:null].filter(Boolean);if(s.frontier.gateOpen&&people.some(a=>a.pos[0]>=780&&a.pos[0]<810&&a.pos[1]>=330&&a.pos[1]<360))return false;s.frontier.gateOpen=!s.frontier.gateOpen;if(manual)s.frontier.gateManual=true;return true;}

const fenceHealth=s=>`${s.frontier.fenceHp}/${fenceMax(s)}`;
