// M8 read-only projections for the person panel and map badges; never mutates World.
import{maskHealthText}from'./health-view.mjs';import{ITEM,TASKNAME,ART}from'./data.mjs';import{commitmentOf,ownershipGate,OWNER_LABEL}from'./commitment.mjs';import{beginError}from'./activities.mjs';import{describeLife,placeName}from'./life-policy.mjs';import{bagWeight}from'./state.mjs';import{studyError,preferError}from'./content.mjs';
const itemName=s=>s.replace(/(wood|stone|water|veg|herb|meal|ration|tea|money|staff|sword)\b/g,m=>ITEM[m]||m);
const PHASE={prepare:'領糧集合',outbound:'沿路前進',ridge:'側稜窄路',campRest:'營地休整',resting:'到達目的地',gate:'守路人前',gateFight:'守路處交手',negotiate:'說明來意',cave:'古洞抉擇',collect:'搬取糧袋',attach:'扶助周行',unload:'回倉交付',return:'實走返程',halted:'舊檔暫停'};
// Turns a raw blocked string into who/what is in the way and what the player can do.
export function blockedAdvice(w,p,raw){if(!raw)return null;const text=String(raw);let say=itemName(text),hint='條件改善後會自動續做；也可改派其他工作或停工。',actions=[];const id=p.id,task=(kind,args={},label)=>({label,cmd:{type:'task',actor:id,kind,args}});
 const wait=/^候位：(?:station:)?([^／]+)／?(.*)$/.exec(text);if(wait){say='等候 '+placeName(wait[1])+(wait[2]?'（'+wait[2]+' 正在使用）':'（前面還有人排隊）');hint='依先後順序輪到才開始；不想等可改派其他工作。';actions.push({label:'停工改派',cmd:{type:'stop',actor:id}});}
 else if(/缺料：/.test(text)){const item=/缺料：(\w+)/.exec(text)[1];say='缺少'+(ITEM[item]||item)+'，灶上無法開工';hint='先把'+(ITEM[item]||item)+'實際搬進倉／水缸。';if(['wood','stone','water','veg','herb'].includes(item))actions.push(task('gather',{item},'去採'+ITEM[item]));}
 else if(/倉滿|倉已滿|容量已預約|放不下/.test(text)){hint='目的地已滿或被預約；先讓同門用掉、改做別的，或到建設擴建倉庫／膳房。';actions.push({label:'看建設',tab:'build'});}
 else if(/來源用盡/.test(text)){hint='這處今日已採完，隔日再生；可改採其他資源。';actions.push(task('gather',{item:'wood'},'改去採木'));}
 else if(/無路|無可通行|路標周邊/.test(text)){hint='目的地目前走不到（水域、封閉或被佔滿）；換個目標或停工。';actions.push({label:'停工',cmd:{type:'stop',actor:id}});}
 else if(/先建靜室|先修廳|修補大廳|需最終膳房|先開墾/.test(text)){hint='需要的設施尚未完成，到建設頁下令施工。';actions.push({label:'看建設',tab:'build'});}
 else if(/乾糧/.test(text)){hint='倉裡沒有可領的乾糧；最終膳房可製乾糧。';actions.push({label:'製乾糧',cmd:{type:'task',actor:id,kind:'cook',args:{recipe:'ration'}}});}
 else if(/餐/.test(text)){hint='桌上沒有空出的餐；先做一鍋。';actions.push({label:'做一鍋餐',cmd:{type:'task',actor:id,kind:'cook',args:{recipe:'meal'}}});}
 else if(/候橋|候路|禮讓|橋口/.test(text)){hint='窄橋／窄路一次一人，依序通過；等前面的人走過即可。';}
 else if(/尚未學會|未學會/.test(text)){hint='先在同堂授課或研讀學會這門武學。';actions.push({label:'看武學',tab:'martial'});}
 else if(/領用並裝備|器械/.test(text)){hint='先到倉庫實際領用器械並換裝。';actions.push({label:'看武學',tab:'martial'});}
 else if(/倒地/.test(text)){hint='需要同門近身扶起；在外可請求救援。';}
 else if(/對方正在忙|另有約定|雙人站位/.test(text)){hint='對方另有安排，等對方結束或先叫停對方。';}
 return{text:say,hint,actions};}
// What a single order would do right now, without doing it.
export function predict(w,c){const p=w.people[c.actor||'leader'];const g=ownershipGate(w,c,p);if(g)return g.reason;
 if(c.type==='task'){if(p.kind!=='human')return'野生個體不能接受門派勞作命令';return beginError(w,p,c.kind,c.args||{})?.reason||null;}
 if(c.type==='studyContent')return studyError(w,p,c.move);
 if(c.type==='preferContent')return preferError(w,p,c.move);
 if(c.type==='recall')return beginError(w,p,'return',{})?.reason||null;// M33: same preflight the core runs before an individual recall
 if(c.type==='recallParty')return w.expedition&&!['returned','cancelled'].includes(w.expedition.phase)?null:'沒有外出或準備中的隊伍';
 if(c.type==='cultureStop')return w.culturePlan?.active?.status==='running'?null:'沒有進行中的相處';
 if(c.type==='endDrill')return w.drill&&!['completed','cancelled'].includes(w.drill.status)?null:'沒有進行中的演武';
 return null;}
function ownerCard(w,p,k){const id=p.id;if(!k)return null;const label=OWNER_LABEL[k.owner],party=k.party.filter(x=>x!==id).map(x=>w.people[x]?.name||x);
 if(k.owner==='expedition')return{label,detail:'隊伍階段：'+(PHASE[w.expedition.segment==='ridge'&&k.phase==='outbound'?'ridge':k.phase]||k.phase)+(party.length?'；同行 '+party.join('、'):'')+'。隊員不接個別改派，召回是全隊一起。',actions:[{label:'前往遠征頁',tab:'travel'},{label:k.phase==='prepare'?'全隊取消出發':'全隊召回',cmd:{type:'recallParty'}}]};
 if(k.owner==='class')return k.role==='teacher'?{label,detail:'正在授課，學生 '+party.join('、')+'；中途結束不給學理。',actions:[{label:'結束同堂',cmd:{type:'stop',actor:id}}]}:{label,detail:'在 '+(w.people[k.party[0]]?.name||'老師')+' 的同堂聽課；退出只影響自己。',actions:[{label:'退出同堂',cmd:{type:'stop',actor:id}}]};
 if(k.owner==='spar'||k.owner==='practice')return{label,detail:'與 '+party.join('、')+' 安全對練，半血或時間到結束。',actions:[{label:'叫停交手',cmd:{type:'practiceStop',actor:id}}]};
 if(k.owner==='drill')return{label,detail:'參加有限兩波演武。',actions:[{label:'自己退出',cmd:{type:'practiceStop',actor:id}},{label:'終止演武',cmd:{type:'endDrill'}}]};
 if(k.owner==='culture')return{label,detail:'和 '+party.join('、')+' 一起實際相處；叫停不結算，可重約。',actions:[{label:'叫停相處',cmd:{type:'cultureStop'}}]};
 if(k.owner==='story')return{label,detail:'與 '+party.join('、')+' 的約定進行中；取消後可重約。',actions:[{label:'取消約定',cmd:{type:'stop',actor:id}}]};
 if(k.owner==='journey')return{label,detail:'跟著遠行隊伍同行，返院後自行離開或回到原處，不接門派命令。',actions:[]};
 if(k.owner==='rescue')return{label,detail:'正在把傷員帶回家；這趟完成後才可改派。',actions:[]};
 return{label,detail:'正赴一個已答應的約定（例如走進院內或見證演武），完成後自然結束。',actions:[]};}
export function situation(w,p){const life=describeLife(w,p),k=commitmentOf(w,p),a=w.activities[p.activity],owner=ownerCard(w,p,k),raw=p.blocked||a?.blocked||'',blocked=raw?blockedAdvice(w,p,raw):null,id=p.id;let actions=owner?[...owner.actions]:[];
 if(p.hp<=0){actions=[];}
 else if(!owner){if(blocked)actions.push(...blocked.actions);if(p.adult)actions.push({label:'練拳',cmd:{type:'task',actor:id,kind:'train',args:{art:'punch'}}});actions.push({label:'坐休',cmd:{type:'task',actor:id,kind:'rest',args:{}}},{label:'吃飯',cmd:{type:'task',actor:id,kind:'eat',args:{}}});actions.push(p.manualStop||!p.auto?{label:'恢復自主',cmd:{type:'resume',actor:id}}:{label:'停工',cmd:{type:'stop',actor:id}});}
 const seen=new Set();actions=actions.filter(x=>{const key=x.label;if(seen.has(key))return false;seen.add(key);return true;}).slice(0,6).map(x=>x.cmd?{...x,reason:predict(w,x.cmd)}:x);
 const last=w.trailPlan?.history?.at(-1),home=last?.report&&last.actors?.includes(id)&&w.tick-(last.ended||0)<12000?last.report.next.filter(t=>t.startsWith(p.name)||!/^\S+(受傷|生命|手上)/.test(t)):[];const vitals=[...home.map(t=>'剛返院：'+maskHealthText(w,t)),p.energy<2500?'精力偏低，會先坐休':null,p.injury>60?'傷勢過重，只能休養':p.injury>30?'有傷，不能切磋':null,p.hp<=0?'倒地，需要同門扶起或救援':null].filter(Boolean);
 return{version:1,actor:id,current:life.current,why:life.why,next:life.next,owner,blocked,vitals,actions,carried:life.carried.map(([i,n])=>ITEM[i]+' '+n),weight:bagWeight(w,p)};}
// Shape-first map badge: a glyph plus short text, never colour alone.
export function statusBadge(w,p){const a=w.activities[p.activity||p.classSession],load=Object.entries(w.inventories[p.bag]?.items||{}).find(([,n])=>n>0),k=commitmentOf(w,p),raw=p.blocked||a?.blocked||'';
 if(p.hp<=0)return{glyph:'✚',text:'倒地',tone:'alert'};
 if(p.action)return{glyph:'✕',text:({windup:'起手',active:'出招',recover:'收勢'}[p.action.phase]),tone:'combat'};
 if(p.combatSession||p.combatTarget)return{glyph:'✕',text:p.sparUntil?'對練':'交手',tone:'combat'};
 if(raw){const wait=/^候位：(?:station:)?([^／]+)/.exec(raw),miss=/缺料：(\w+)/.exec(raw);return{glyph:'⚠',text:wait?'等'+placeName(wait[1]).slice(0,4):miss?'缺'+(ITEM[miss[1]]||miss[1]):itemName(raw).slice(0,5),tone:'alert'};}
 if(p.moving&&load)return{glyph:'▣',text:'搬'+ITEM[load[0]],tone:'work'};
 if(k?.owner==='expedition')return{glyph:'⚑',text:(PHASE[k.phase]||'遠征').slice(0,4),tone:'travel'};
 if(p.moving)return{glyph:'➤',text:TASKNAME[a?.kind]&&a.kind!=='move'?'赴'+TASKNAME[a.kind]:'行走',tone:'move'};
 if(a?.kind==='sleep'||p.pose==='sleep')return{glyph:'☾',text:'睡眠',tone:'rest'};
 if(a?.kind==='rest')return{glyph:'☾',text:'坐休',tone:'rest'};
 if(['train','study','class','contentStudy'].includes(a?.kind))return{glyph:'◆',text:a.kind==='class'?(a.actor===p.id?'授課':'聽課'):TASKNAME[a.kind]||'修行',tone:'practice'};
 if(p.classSession)return{glyph:'◆',text:'聽課',tone:'practice'};
 if(a?.kind==='eat')return{glyph:'◎',text:'用餐',tone:'rest'};
 if(['talk','encourage','care','teach','greet','paired','culture','story'].includes(a?.kind))return{glyph:'◇',text:TASKNAME[a.kind]||'相處',tone:'social'};
 if(load)return{glyph:'▣',text:'持'+ITEM[load[0]],tone:'work'};
 if(a)return{glyph:'⚒',text:TASKNAME[a.kind]||a.kind,tone:'work'};
 return{glyph:'·',text:p.manualStop||!p.auto?'停工':'閒',tone:'idle'};}
export const BADGE_STYLE={fill:'#fbf5e4f2',text:'#2b3a30',border:{alert:'#9c5a2c',combat:'#8f3f2e',work:'#5d6b45',move:'#4d6772',travel:'#6a5a2c',rest:'#56607a',practice:'#4f6a5a',social:'#7a5a6a',idle:'#8a8a78'}};
export{ART};
