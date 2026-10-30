import {freshSource,freshTrip,validExpedition,expeditionText} from './homestead-expedition.mjs';
import {freshCompanion,validCompanion,socialText} from './homestead-social.mjs';
import {freshMartial,freshTalents,validMartial,martialText} from './homestead-martial.mjs';
import {fenceMax,defenseText} from './homestead-defense.mjs';
import {freshThreat,validThreat,threatText} from './homestead-threat.mjs';
export const FRONTIER_VERSION=5;
export const APPROACHES={guard:'先守好家',learn:'先學會應對',peace:'尋求長久安寧'};
export function freshFrontier(approach='guard',body=1){return {version:1,autoCooperate:false,approach:Object.hasOwn(APPROACHES,approach)?approach:'guard',gateOpen:true,gateManual:false,repairWood:0,fenceHp:0,threat:freshThreat(),martial:freshMartial(),talents:freshTalents(body),companion:freshCompanion(),source:freshSource(),trip:freshTrip()};}
export function validFrontier(s){const f=s.frontier;return f===null||f===undefined||!!(f&&s.version===FRONTIER_VERSION&&s.mode==='solo'&&s.autonomy&&f.version===1&&typeof f.autoCooperate==='boolean'&&Object.hasOwn(APPROACHES,f.approach)&&typeof f.gateOpen==='boolean'&&Number.isFinite(f.fenceHp)&&f.fenceHp>=0&&f.fenceHp<=fenceMax(s)&&typeof f.gateManual==='boolean'&&Number.isInteger(f.repairWood)&&f.repairWood>=0&&validThreat(s)&&validMartial(f)&&validCompanion(s)&&validExpedition(s));}
export function frontierDetailText(s){return s.frontier?`${defenseText(s)} ${martialText(s)} ${socialText(s)}`:'';}
export function frontierText(s){return s.frontier?`${APPROACHES[s.frontier.approach]} · ${threatText(s)}`:'';}
export function frontierAim(s){const f=s.frontier;if(!f)return '';const p=s.person,t=f.trip;
 if(t.phase!=='home')return {outbound:'近期打算：沿真路前往獸徑；低需求或改派可先回家。',source:'近期打算：在獸徑應對；包內路糧要真吃才恢復，精力不足會撤回。',return:'近期打算：沿真路回家，未吃路糧退回後繼續生活。'}[t.phase];
 if(f.source.cleared)return '此來源已安寧。可以留居吃睡、照料家園或與林舟交流，沒有強迫下一場戰爭。';
 if(f.martial.avoid)return '你選擇避戰：仍會安家、吃睡與練步，不自主打包近山。途中會先真返家；允許應戰不會暗清已暫緩的探行。';
 if(!s.autonomy.warmMeals)return '近期先安家並吃過熱飯，山林方向不跳過基本求生。';
 if(p.order)return '先完成你的明確指派與急需吃睡，再考慮山林方向。';
 if(t.deferred&&f.approach==='peace')return '你已暫緩自主近山；仍可安居、守備或練步。準備好可按允許自主再考慮，或直接明確派一次出發。';
 if(f.approach==='guard'){const w=s.fac.fence;if(w.site?.paused)return '防線工程已由你暫停；材料保留，不自行恢復。';return w.stage<2?'安穩後備好唯一林緣防線；逐根搬木施工，不瞬間變出柵欄。':'防線已加固；吃睡後按需要真搬木修補，警告時照看木門。';}
 if(f.martial.xp<6)return `先從有效練步學會應對，目前步勢${f.martial.xp.toFixed(1)}/6；吃睡與手上物資先處理。`;
 return f.approach==='learn'?'已有基本步勢；需要時應戰，也可在彼此願意時交流；安穩後不無限練習。':'已有基本步勢；先睡好、備至少兩份現成菜，需求合適才考慮近山，也可自己決定出發。';
}

export function upgradeFrontier(s){if(s.frontier){if(s.frontier.autoCooperate===undefined)s.frontier.autoCooperate=false;s.frontier.gateOpen??=true;s.frontier.fenceHp??=s.fac.fence?.stage?24:0;s.frontier.threat??=freshThreat();s.frontier.gateManual??=true;s.frontier.repairWood??=0;s.frontier.martial??=freshMartial();if(s.frontier.martial.tactics===undefined)s.frontier.martial.tactics='fixed';if(s.frontier.martial.practiceGoal===undefined)s.frontier.martial.practiceGoal='direction';if(s.frontier.martial.reflections===undefined)s.frontier.martial.reflections=0;s.frontier.talents??=freshTalents();s.frontier.companion??=freshCompanion();s.frontier.companion.practiceXP??=1;s.frontier.companion.sparDay??=0;s.frontier.companion.taught??=false;s.frontier.martial.partnerRounds??=0;s.frontier.source??=freshSource();s.frontier.trip??=freshTrip();if(s.frontier.trip.rationPreference===undefined)s.frontier.trip.rationPreference='auto';}}
export function toggleGate(s,manual=true){if(!s.frontier||!s.fac.fence.stage)return false;const people=[s.person,s.helper,s.frontier.threat?.beast,s.frontier.companion?.present?s.frontier.companion:null].filter(Boolean);if(s.frontier.gateOpen&&people.some(a=>a.pos[0]>=780&&a.pos[0]<810&&a.pos[1]>=330&&a.pos[1]<360))return false;s.frontier.gateOpen=!s.frontier.gateOpen;if(manual)s.frontier.gateManual=true;return true;}

const fenceHealth=s=>`${s.frontier.fenceHp}/${fenceMax(s)}`;
