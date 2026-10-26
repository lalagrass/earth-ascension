import{CORE}from'./catalog.mjs';
export const VERSION={schemaVersion:1,rulesVersion:'chapter1-1',mapVersion:'gpt-world-1'};
export const Q=256, HZ=20, DAY=12000;
export const ITEM={wood:'木',stone:'石',water:'水',veg:'菜',herb:'藥草',meal:'餐',ration:'乾糧',tea:'藥茶',money:'錢',staff:'木棍',sword:'木劍'};
export const WEIGHT={stone:2,money:0,staff:2,sword:2};
export const FACILITIES={
 dorm:{name:'宿舍甲',stages:[[6,2,30]],beds:4},hall:{name:'大廳',stages:[[4,2,25],[8,4,40]]},
 store:{name:'倉庫',stages:[[4,0,20],[6,4,30]]},kitchen:{name:'膳房',stages:[[4,2,25],[6,4,35]]},
 dining:{name:'餐敘院',stages:[[3,0,15],[4,2,20]]},annex:{name:'側舍',stages:[[10,6,50]],beds:4},
 quiet:{name:'靜室',stages:[[8,4,35]]},yard:{name:'外功場',stages:[[3,1,20],[4,2,25]]},
 garden:{name:'菜園',stages:[[2,0,15],[2,0,15]]},herb:{name:'藥園',stages:[[2,1,15],[2,1,15]]}
};
export const TEMPLATES={custom:{name:'自創掌門',stats:[4,4,4,4,4],traits:[0,0],color:'#386a72'},guo:{name:'郭靖',stats:[6,5,3,2,4],traits:[2,2],color:'#977041'},linghu:{name:'令狐沖',stats:[3,3,5,6,3],traits:[-2,1],color:'#5a717b'},yue:{name:'岳不群',stats:[3,3,3,5,6],traits:[1,0],color:'#725777'}};
export const LEGENDS=CORE.people;
export const ART={punch:'基礎拳',staff:'齊眉棍',sword:'基礎劍',nine:'九劍入門',step:'提縱步'};
export const MOVES=CORE.moves;
export const RECIPES={meal:{input:{veg:2,water:1},out:{meal:4},seconds:[30,20,16]},ration:{input:{veg:2,water:1},out:{ration:4},seconds:[20,20,20]},tea:{input:{herb:1,water:1},out:{tea:1},seconds:[6,6,6]}};
export const MEMORY={talk:['交談',2],encourage:['鼓勵',2],cowork:['共作',4],teach:['指點',3],care:['照料',5],protect:['護衛',6]};
export const TASKNAME={trailUnload:'返院交藥草',culture:'門風相處',class:'同堂授課',unloadQuest:'回倉交付古洞糧',drink:'喝藥茶',aid:'扶起傷員',collect:'拾回地包',pack:'領糧集合',reception:'接待來客',learn:'學習武學',equip:'換裝器械',harvestHaul:'搬運收成',move:'行走',gather:'採集',build:'施工',train:'練功',rest:'坐休',sleep:'就寢',eat:'用餐',cook:'烹調',farm:'耕作',talk:'交談',encourage:'鼓勵',care:'照料',teach:'指點',spar:'切磋',school:'義學',greet:'接待',delivery:'交貨',return:'回院',expedition:'遠征',study:'研讀',craft:'製作',story:'約定',escort:'護送',rescue:'救援'};
export const STORY_IDS=['recruit.worker','recruit.school','recruit.fame',...Object.keys(LEGENDS).flatMap(k=>[k+'.1',k+'.2']),'cave.see','cave.choice','cave.return'];
