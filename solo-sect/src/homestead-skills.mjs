// 有效工作成長；不在顯示、走路或讀檔時發經驗。
export const SKILLS={
 gather:{name:'採集',thresholds:[0,4,12],base:'採果5／砍柴7'},
 build:{name:'建造',thresholds:[0,12,40],base:'施工每秒0.5'},
 farm:{name:'耕作',thresholds:[0,4,12],base:'播種／收成5'},
 cook:{name:'料理',thresholds:[0,3,8],base:'每鍋4'},
};
export const freshSkills=()=>Object.fromEntries(Object.keys(SKILLS).map(id=>[id,0]));
export function skillLevel(s,id){if(s.mode!=='solo')return 0;const xp=s.person.skills?.[id]||0;return SKILLS[id].thresholds.reduce((lv,n,i)=>xp>=n?i:lv,0);}
export function workCost(s,id,base){return base*(1-.1*skillLevel(s,id));}
export function gainWork(s,id,amount=1){if(s.mode==='solo'&&id&&amount>0)s.person.skills[id]=Math.min(SKILLS[id].thresholds.at(-1),s.person.skills[id]+amount);}
export function skillInfo(s,id){const rule=SKILLS[id],level=skillLevel(s,id);return {name:rule.name,level,xp:s.person.skills[id],next:rule.thresholds[level+1]??null,costPercent:100-level*10,nextPercent:level<2?90-level*10:null,base:rule.base};}
