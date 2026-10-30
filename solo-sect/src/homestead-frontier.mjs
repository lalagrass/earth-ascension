export const FRONTIER_VERSION=5;
export const APPROACHES={guard:'先守好家',learn:'先學會應對',peace:'尋求長久安寧'};
export function freshFrontier(approach='guard'){return {version:1,approach:Object.hasOwn(APPROACHES,approach)?approach:'guard',gateOpen:true,fenceHp:0};}
export function validFrontier(s){const f=s.frontier;return f===null||f===undefined||!!(f&&s.version===FRONTIER_VERSION&&s.mode==='solo'&&s.autonomy&&f.version===1&&Object.hasOwn(APPROACHES,f.approach)&&typeof f.gateOpen==='boolean'&&Number.isFinite(f.fenceHp)&&f.fenceHp>=0&&f.fenceHp<=24);}
export function frontierText(s){return s.frontier?`生活與山林試作 · ${APPROACHES[s.frontier.approach]}；先沿原本性情自主安家。${s.fac.fence?.stage?`林緣柵欄 ${fenceHealth(s)}，門${s.frontier.gateOpen?'開':'關'}；兩端可繞行。`:'可在固定林緣地塊立柵欄。'}` :'';}

export function upgradeFrontier(s){if(s.frontier){s.frontier.gateOpen??=true;s.frontier.fenceHp??=s.fac.fence?.stage?24:0;}}
export function toggleGate(s){if(!s.frontier||!s.fac.fence.stage||!s.frontier.fenceHp)return false;const p=s.person.pos;if(s.frontier.gateOpen&&p[0]>=780&&p[0]<810&&p[1]>=330&&p[1]<360)return false;s.frontier.gateOpen=!s.frontier.gateOpen;return true;}

const fenceHealth=s=>`${s.frontier.fenceHp}/24`;
