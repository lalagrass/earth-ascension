// M18 read-only adapter from GPT World to the public character-card / martial-template semantics (upstream proposal 6e5e69d, evaluation baseline).
// Four jobs only: person snapshot, art/move definitions, a person's learned arts, available-action descriptions. Never mutates World; every output is a fresh plain object.
import{ART,VERSION,Q}from'./data.mjs';import{CORE,movesFor,moveFor}from'./catalog.mjs';import{situation,predict}from'./person-view.mjs';import{speed}from'./navigation.mjs';import{bagWeight,day}from'./state.mjs';import{actionTiming,moveLearnError,moveKitError}from'./combat.mjs';import{movePrerequisite}from'./content.mjs';
export const ADAPTER={id:'gpt-public-adapter',version:1,upstream:{commit:'6e5e69dbe3fa166f06659d7835feb510deb9f08b',docs:['sect-chronicle/docs/CHARACTER_CARD_PUBLIC_PROPOSAL.md','sect-chronicle/docs/MARTIAL_ART_PUBLIC_TEMPLATE_PROPOSAL.md'],status:'evaluation-baseline'}};
const RANK={leader:'掌門',worker:'雇工',outer:'外門',inner:'內門',family:'家人',guest:'客人',traveler:'旅人',warden:'守路人',wild:'野生',training:'教習'};
// stats[i] meaning and the rules that actually read it (checked against src at M18; 臂力 and 定力 are read by no rule).
const STATS=[{semanticId:'capability.constitution',label:'體魄',category:'capability',effects:['建角時決定生命上限']},{semanticId:'capability.arm',label:'臂力',category:'capability',effects:[]},{semanticId:'capability.agility',label:'身法',category:'capability',effects:['交手時每tick轉身上限','短步收勢']},{semanticId:'aptitude.comprehension',label:'悟性',category:'aptitude',effects:['學習、同堂、研讀時的理解增量']},{semanticId:'aptitude.composure',label:'定力',category:'aptitude',effects:[]}];
const TRAITS=[{semanticId:'persona.diligence',label:'勤勉／隨興',effects:['自主選工作時偏好修屋、練功或休息、閒走']},{semanticId:'persona.care',label:'顧人／自持',effects:['自主選照料、交談；遠行抉擇的預設傾向']}];
const ART_KIND={punch:'拳',staff:'棍',sword:'劍',nine:'劍',step:'步法'};
const WILD_MOVES=['bite','gore'];
const head=w=>({adapter:{id:ADAPTER.id,version:ADAPTER.version,upstream:ADAPTER.upstream.commit},snapshotTick:w.tick,rulesVersion:w.rulesVersion||VERSION.rulesVersion});
const member=p=>p.kind==='human'&&['resident','visitor'].includes(p.residence);
// Only the leader's creation choices are shown by the existing GPT UI; everyone else's stats and traits stay hidden (no raw value is ever emitted).
const disclosed=p=>p.rank==='leader';
const effect=list=>list.length?{availability:'known',text:list}:{availability:'unsupported',reasonCode:'no-rule-reads-value',text:['本版規則沒有讀取這項']};
function statEntry(p,i){const d=STATS[i],meta={semanticId:d.semanticId,label:d.label,category:d.category,unit:'點',domain:{min:1,max:7,hard:true},higherIsBetter:true,provenance:{source:'people.stats['+i+']',kind:'authoritative'},origin:'creation-baseline',changePolicy:'fixed',effect:effect(d.effects)};
 if(!member(p))return{...meta,availability:'notApplicable',reasonCode:'not-a-sect-member',visibility:'none'};
 if(!disclosed(p))return{...meta,availability:'hidden',reasonCode:'not-disclosed',visibility:'hidden'};
 return{...meta,availability:'known',visibility:'player',rawValue:p.stats[i],initial:{availability:'unknown',reasonCode:'no-creation-snapshot'},base:{availability:'known',value:p.stats[i]},effective:{availability:'notApplicable',reasonCode:'no-modifiers-in-rules'}};}
function traitEntry(p,i){const d=TRAITS[i],meta={semanticId:d.semanticId,label:d.label,category:'persona',unit:'傾向',domain:{min:-2,max:2,hard:true},higherIsBetter:null,provenance:{source:'people.traits['+i+']',kind:'authoritative'},origin:p.rank==='leader'?'creation-answers':'unassigned',changePolicy:'fixed',effect:effect(d.effects)};
 if(!member(p))return{...meta,availability:'notApplicable',reasonCode:'not-a-sect-member',visibility:'none'};
 if(!disclosed(p))return{...meta,availability:'hidden',reasonCode:'not-disclosed',visibility:'hidden'};
 return{...meta,availability:'known',visibility:'player',rawValue:p.traits[i]};}
const known=(semanticId,label,category,rawValue,extra={})=>({semanticId,label,category,availability:'known',visibility:'player',rawValue,...extra});
// 1. Person snapshot.
export function personSnapshot(w,id){const p=w.people[id];if(!p)return null;const s=situation(w,p),walked=Math.floor((p.distance||0)/Q),today=day(w);
 const out={...head(w),actorId:p.id,identity:{name:p.name,rank:p.rank,rankLabel:RANK[p.rank]||p.rank,adult:p.adult,kind:p.kind,residence:p.residence},
  now:{current:s.current,why:s.why,next:s.next,owner:s.owner?{label:s.owner.label,detail:s.owner.detail}:null,blocked:s.blocked?{text:s.blocked.text,hint:s.blocked.hint}:null,vitals:[...s.vitals],provenance:{source:'person-view.situation',kind:'derived'}},
  capability:[0,1,2].map(i=>statEntry(p,i)),aptitude:[3,4].map(i=>statEntry(p,i)),persona:[0,1].map(i=>traitEntry(p,i)),
  state:[known('state.energy','精力','currentState',p.energy,{unit:'原值',domain:{min:0,max:10000,hard:true},current:p.energy,max:10000,display:{value:Math.round(p.energy/100),unit:'/100'},higherIsBetter:true,provenance:{source:'people.energy',kind:'authoritative'}}),
   known('state.hp','生命','currentState',p.hp,{unit:'點',current:p.hp,max:p.maxHp,higherIsBetter:true,provenance:{source:'people.hp/maxHp',kind:'authoritative'}}),
   known('state.injury','傷勢','currentState',p.injury,{unit:'點',domain:{min:0,max:100,hard:true},higherIsBetter:false,provenance:{source:'people.injury',kind:'authoritative'}}),
   known('state.mealsToday','今日用餐','currentState',p.mealDay===today?p.meals:0,{unit:'餐',higherIsBetter:null,gpt:{note:'當日紀錄，換日歸零；不是飽足值',recordDay:p.mealDay},provenance:{source:'people.meals/mealDay',kind:'authoritative'}})],
  performance:[known('performance.moveSpeed','目前步速','effectivePerformance',speed(w,p),{unit:'DU/秒',effective:{availability:'known',value:speed(w,p)},gpt:{factors:'背負、傷勢、低精力、扶人、行走累計階段'},provenance:{source:'navigation.speed',kind:'derived'}}),
   known('performance.walked','行走累計','history',walked,{unit:'DU',gpt:{stage:walked>=18000?3:walked>=9000?2:walked>=3000?1:0,note:'只影響步速階段，不是腿力'},provenance:{source:'people.distance',kind:'authoritative'}}),
   known('performance.bagWeight','背負重量','currentState',bagWeight(w,p),{unit:'重量',provenance:{source:'state.bagWeight',kind:'derived'}})],
  gpt:{visibilityVsCommand:member(p)?'可見資訊與可下指令分開；操作見 personActions':'只供觀察',hpFromConstitution:'生命上限已在現行 UI 公開；體魄未揭露時，此投影不印出換算式'}};
 return structuredClone(out);}
// 2. Definitions; no person's progress in here.
function packOf(w,id){const e=w.contentState?.packs.find(x=>Object.hasOwn(x.data.moves,id));return e?{id:e.id,version:e.version}:null;}
export function moveDefinition(w,id){const m=moveFor(w,id);if(!m)return null;const pack=m.base?packOf(w,id):null;
 return structuredClone({...head(w),moveId:id,name:m.name,artId:m.art,source:m.base?{kind:'pack',pack:pack?.id,version:pack?.version,base:m.base}:{kind:'core',pack:CORE.id,version:CORE.version},rule:{wind:m.wind,active:m.active,recover:m.recover,range:m.range,width:m.width,damage:m.damage,cost:m.cost},units:{time:'tick（20/秒）',range:'DU',cost:'精力原值'},requires:m.base?{U:m.requires.U,F:m.requires.F,weapon:['staff','sword'].includes(m.art)?m.art:null,facility:'靜室研讀20秒'}:null,description:m.description||null,wildlife:WILD_MOVES.includes(id)});}
export function artDefinition(w,art){if(!ART[art])return null;const moves=Object.entries(movesFor(w)).filter(([id,m])=>m.art===art&&!WILD_MOVES.includes(id)).map(([id])=>id);
 return structuredClone({...head(w),artId:art,name:ART[art],category:ART_KIND[art],provenance:{source:'data.ART',kind:'definition'},growthModel:{tracks:[{id:'U',label:'理解',domain:{min:0,max:100}},{id:'F',label:'熟練',domain:{min:0,max:100}},{id:'I',label:'體悟',domain:{min:0,max:100}}],stages:[{label:'入門'},{label:'熟練',when:'熟練18'},{label:'深修',when:'熟練90且體悟10'}]},moves,
  note:art==='nine'?'本版九劍入門只有「辨隙截擊」一招：先看兩次起手，守距離與窗口；快拳、遮擋與佯攻會破局。不是完整獨孤九劍九式。':art==='step'?'提縱步在拳練滿六單位後才出現，短步不能穿牆、越溪或搶橋。':null});}
// 3. A person's learned arts, each move with its learn state and the persistent use condition (situational checks are left to the core at press time).
const stage=s=>s.F>=90&&s.I>=10?'深修':s.F>=18?'熟練':'入門';
function moveStatus(w,p,id){const m=moveFor(w,id),base=m.base||id;let learn;
 if(m.base)learn=p.contentMoves?.includes(id)?{state:'learned'}:{state:movePrerequisite(w,p,id)?'blocked':'can-study',reason:movePrerequisite(w,p,id)};
 else learn=id==='push'&&!p.pushLearned?{state:'not-learned',reason:'推掌需洪七公真授課'}:{state:'learned'};
 const use=moveLearnError(w,p,id)||(p.adult?null:'未成年不參戰')||moveKitError(w,p,base);
 return{moveId:id,name:m.name,source:m.base?'pack':'core',learn,useNow:{ok:!use,reason:use,situational:'距離、空間、精力與收勢在按下時由核心判定'},timing:p.skill[m.art]?actionTiming(p,id,w):null};}
export function personArts(w,id){const p=w.people[id];if(!p)return null;const moves=Object.entries(movesFor(w)).filter(([mid])=>!WILD_MOVES.includes(mid));
 const arts=Object.entries(p.skill).map(([art,s])=>({artId:art,name:ART[art]||art,U:known('art.U','理解','martial',s.U),F:known('art.F','熟練','martial',s.F),I:known('art.I','體悟','martial',s.I),stage:stage(s),contexts:[...s.contexts],
  sources:s.sources.map(x=>({kind:x.kind,tick:x.tick,ref:x.source||x.activity||x.teacher||null})),gpt:{sourcesRetained:'complete-since-acquired',note:art==='punch'&&!s.sources.length?'建角時的基礎拳沒有來源紀錄':'來源只記事件，不記前後值'},
  moves:member(p)?moves.filter(([,m])=>m.art===art).map(([mid])=>moveStatus(w,p,mid)):[]}));
 return structuredClone({...head(w),actorId:p.id,arts,unlearned:Object.keys(ART).filter(a=>!p.skill[a]),contentMoves:[...(p.contentMoves||[])],preferred:p.contentPreferred||null});}
// 4. Action descriptions: an intent plus the core's prediction at snapshot time. The UI must send the intent to command() again; enabledAtSnapshot is never authority.
export function personActions(w,id){const p=w.people[id];if(!p)return null;if(!member(p))return structuredClone({...head(w),actorId:id,actions:[],reason:'野外／教習人物只供觀察，不能代下門人命令'});
 const s=situation(w,p),list=s.actions.map(a=>({group:'life',label:a.label,intent:a.cmd||null,tab:a.tab||null,reasonAtSnapshot:a.cmd?a.reason:null}));
 const seen=new Set(list.map(a=>JSON.stringify(a.intent))),add=(group,label,cmd)=>{if(!seen.has(JSON.stringify(cmd)))list.push({group,label,intent:cmd,tab:null,reasonAtSnapshot:predict(w,cmd)});};
 for(const art of Object.keys(p.skill).filter(a=>ART[a]))add('martial','練'+ART[art],{type:'task',actor:id,kind:'train',args:{art}});
 if(w.contentState)for(const [mid,m]of Object.entries(movesFor(w)).filter(([,m])=>m.base)){if(!p.contentMoves?.includes(mid))add('martial','研讀'+m.name,{type:'studyContent',actor:id,move:mid});else add('martial','交手偏好'+m.name,{type:'preferContent',actor:id,move:mid});}
 return structuredClone({...head(w),actorId:id,actions:list.map(a=>({...a,enabledAtSnapshot:a.intent?!a.reasonAtSnapshot:true,revalidate:'core'}))});}
