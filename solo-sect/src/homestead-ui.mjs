import {frontierSnapshot,frontierEvents} from './homestead-frontier-events.mjs';
import {EXPEDITION_ACTIONS,expeditionReason,pendingDeparture,expeditionText} from './homestead-expedition.mjs';
import {retreatExpedition,setAvoidCombat} from './homestead.mjs';
import {SOCIAL_ACTIONS,socialReason} from './homestead-social.mjs';
import {MOVES,moveKnown,martialReason} from './homestead-martial.mjs';
import {repairFence,projectRecipe} from './homestead.mjs';
import {frontierText,frontierAim,frontierDetailText,toggleGate,APPROACHES} from './homestead-frontier.mjs';
import{recoveryChoice}from'./homestead-autonomy-recovery.mjs';
import{lastMealText}from'./homestead-autonomy-learning.mjs';
import{mealAimText,automaticMealReason}from'./homestead-autonomy-meals.mjs';
import{deferAutonomyGoal,allowAutonomyGoals}from'./homestead.mjs';
import{autonomyText,DIRECTIONS,setAutonomyDirection,lifeStage,autonomyHistory,waitingText}from'./homestead-autonomy.mjs';
import{renderMarkup}from'./homestead-dom.mjs';
import{restComparisonText}from'./homestead-rest-view.mjs';
import{householdActions,performHouseholdAction,householdActionHelp}from'./homestead-household-actions.mjs';
import{householdFacts}from'./homestead-household.mjs';
import {projectRows,projectAt} from './homestead-projects.mjs';
import {facilityModelView,modelCrop} from './homestead-model.mjs';
import {blueprintInfo,inspectionInfo,plotAt,constructionRoute,siteMaterials,siteStages} from './homestead-construction.mjs';
import {HOME_STYLES,normalizeHomeName,homeLook,setHomeLook} from './homestead-look.mjs';
import {RECIPES,MEAL_STYLES,mealDecision,nextUnlocks,preparedCount,recipeAccess,recipeReason,eatReason,buildAccess,RESOURCE_NAMES} from './homestead-content.mjs';
import {FEELINGS,currentFeelings,restRate} from './homestead-living.mjs';
import {SKILLS,skillInfo} from './homestead-skills.mjs';
import { drawHomestead } from './homestead-scene.mjs';
import { activityText, activityReason, homeBenefits, projectFocusText, buildingInfo, nextStep, foodDays, resourceSummary } from './homestead-view.mjs';
import { ACTIONS, buildables, FACILITIES, PLACES, HOME, DAY, SAVE_KEY, offers, supplyTargets, blockReason, visitorHere, createHomestead, startBlueprint, pauseProject, requestRecipe, requestFood, setMealStyle, setProjectFocus, setOrder, setHelperOrder, inviteHelper, acceptApprentice, askHelperLeave, tickHomestead, saveHomestead, loadHomestead } from './homestead.mjs';
import { mountTransferManager, downloadBytes } from './transfer-manager-ui.mjs';
import { previewTransfer, commitTransfer, transferSlots, validateTransferSave, exportTransferBackup } from './homestead-transfer.mjs';
const $ = (id) => document.getElementById(id);
const ctx = $('land').getContext('2d');
const modelSurface=document.createElement('canvas');modelSurface.width=900;modelSurface.height=560;const modelCtx=modelSurface.getContext('2d');
function renderModels(d){const before=facilityModelView(s,d.id,false,d.stage),after=facilityModelView(s,d.id,true,d.stage);$('model-pair').hidden=!before||!after;if(!before||!after)return;for(const[which,view]of[['before',before],['after',after]]){drawHomestead(modelCtx,view,undefined,undefined,undefined,false,true);const[x,y,w,h]=modelCrop(d.id),g=$('model-'+which).getContext('2d'),scale=Math.min(300/w,220/h);g.clearRect(0,0,300,220);g.drawImage(modelSurface,x,y,w,h,(300-w*scale)/2,(220-h*scale)/2,w*scale,h*scale);$('model-'+which+'-title').textContent=`${which==='before'?'目前造型':'完工示意（尚未建成）'}：${FACILITIES[d.id].stages[view.fac[d.id].stage].name}${d.id==='bed'?'・屋內床鋪局部（床墊／枕頭）':''}`;}const info=buildingInfo(s,d.id);$('model-before-effect').textContent='設施本身：'+(info.current||'尚無設施');$('model-after-effect').textContent='設施本身：'+info.next;}
new ResizeObserver(()=>document.documentElement.style.setProperty('--home-header',`${document.querySelector('header').getBoundingClientRect().height}px`)).observe(document.querySelector('header'));
let s = null, speed = 1, last = performance.now(), acc = 0, painted = 0;
let pointerHeld = false;
let observedEvents=[];
document.addEventListener('pointerdown', () => {pointerHeld=true;});
for (const event of ['pointerup','pointercancel']) document.addEventListener(event, () => {pointerHeld=false;});
window.addEventListener('blur', () => {pointerHeld=false;});
let inspected=null;
function renderProjects(){const rows=projectRows(s);$('project-overview').hidden=s.mode!=='solo';$('project-count').textContent=`已立工程 ${rows.length}項${rows.length?`（暫停${rows.filter(r=>r.status==='已暫停').length}項）`:''}`;renderMarkup($('project-rows'),rows.length?rows.map(r=>`<button data-inspect="${r.id}" ${inspected===r.id?'aria-current="true"':''}>查看 #${r.number} ${r.text}</button>`).join(''):'<p class="muted">目前沒有工程，安穩生活也可以；想改善時再預覽建造。</p>');}
$('project-rows').onclick=e=>{const b=e.target.closest('[data-inspect]');if(!b)return;inspected=b.dataset.inspect;$('site-action-result').textContent='';closeBlueprint();render();$('site-select').focus({preventScroll:true});};
$('frontier-card').onclick=e=>{const id=e.target.closest('[data-frontier]')?.dataset.frontier;if(!id||!s.frontier)return;let ok=false;if(Object.hasOwn(EXPEDITION_ACTIONS,id)||Object.hasOwn(SOCIAL_ACTIONS,id)||id==='practice'||id==='fight')ok=setOrder(s,id);if(id==='avoid')ok=setAvoidCombat(s,!s.frontier.martial.avoid);if(id==='alone'){s.frontier.companion.allowed=!s.frontier.companion.allowed;ok=true;}if(id==='retreat')ok=retreatExpedition(s);if(id==='reconsider'){s.frontier.trip.deferred=false;ok=true;}if(id==='gate')ok=toggleGate(s);if(id==='repair')ok=repairFence(s);if(id==='auto-gate'){s.frontier.gateManual=false;ok=true;}render();$('frontier-result').textContent=ok?'已記下選擇；依實際材料、位置與需求執行。':'目前無法執行；可能有人通過門格、工程已立或尚無損傷。';document.querySelector(`[data-frontier="${id}"]`)?.focus({preventScroll:true});};
$('frontier-details').onkeydown=e=>{if(e.key==='Escape'){e.preventDefault();e.stopPropagation();$('frontier-details').open=false;$('frontier-details').querySelector('summary').focus();}};
$('frontier-join').onchange=e=>{if(s.frontier)s.frontier.trip.joinRequested=e.target.checked;};
$('frontier-stance').onchange=e=>{if(s.frontier&&moveKnown(s,e.target.value))s.frontier.martial.stance=e.target.value;render();};
$('frontier-approach-live').onchange=e=>{if(s.frontier)s.frontier.approach=e.target.value;render();};
$('project-markers').onchange=draw;
function renderInspection(){const ids=buildables(s).filter(id=>id!=='fence'||s.frontier).filter(id=>id==='hut'||s.fac.hut.stage>0).filter(id=>s.mode==='solo'||!['bed','workbench'].includes(id));const html='<option value="">選一個地塊</option>'+ids.map(id=>`<option value="${id}">${FACILITIES[id].label}</option>`).join('');if($('site-select').innerHTML!==html)$('site-select').innerHTML=html;if(!ids.includes(inspected))inspected=null;$('site-select').value=inspected||'';const q=inspectionInfo(s,inspected);$('site-inspector').hidden=!q;if(!q)return;const route=constructionRoute(s,inspected),m=siteMaterials(s,inspected),stages=siteStages(s,inspected);$('site-materials').hidden=!m;$('site-materials').textContent=m?`庫存可用（共用）${m.available}木 ｜ 工地已交${m.delivered}木 ｜ 在途（已離庫）${m.reserved}木 ｜ 尚待運${m.needed}木`:'';$('site-stages').innerHTML=stages.labels.map((name,i)=>`<li ${i===stages.index?'aria-current="step"':''}>${i<stages.index?'✓ ':i===stages.index?'目前：':''}${name}</li>`).join('');$('site-flow').textContent=route?`${route.text}。${s.frontier?'線只標目的地；實際移動會繞過林緣柵欄，不代表房屋已有完整碰撞。':'線顯示既有任務的直線方向，不是新導航或可走路徑驗證。'}`:s.person.task?.act==='return'&&s.person.carry?.kind==='wood'?`主角另有${s.person.carry.amount}木正在返倉，未算作此地預約；沒有此地在途方向。`:'目前沒有前往這個工地的行走任務；原地工作、吃睡或其他工作不畫假路線。';const life=householdFacts(s,inspected);$('site-life').hidden=!life;$('site-life-title').textContent=life?.title||'';$('site-life-facts').replaceChildren(...(life?.lines||[]).map(text=>{const li=document.createElement('li');li.textContent=text;return li;}));renderHouseholdActions();$('site-stages').hidden=$('site-flow').hidden=$('route-lines').parentElement.hidden=!q.site;$('site-title').textContent=q.name;$('site-info').textContent=q.text;$('site-pause').hidden=$('site-focus').hidden=!q.site||s.mode!=='solo';$('site-pause').textContent=q.paused?'繼續工程':'暫停工程';$('site-focus').disabled=!!q.paused;$('site-focus').textContent=s.focusProject===inspected?'取消優先（照常做）':'這項先做';}
function renderHouseholdActions(){
 $('site-action-help').textContent=householdActionHelp(inspected,!!s.autonomy);
 const rows=[];let row;
 for(const a of householdActions(s,inspected)){
  if(!a.id.startsWith('eat-')){row=document.createElement('div');row.className='context-choice';rows.push(row);}
  if(a.detail){const detail=document.createElement('p');detail.className='muted';detail.textContent=a.detail;row.append(detail);}
  const b=document.createElement('button');b.dataset.household=a.id;b.dataset.place=inspected;b.textContent=a.label;b.disabled=!!a.reason;b.classList.toggle('active',!!a.active);b.setAttribute('aria-describedby','site-action-help');row.append(b);if(a.reason){const reason=document.createElement('span');reason.id=`site-action-reason-${a.id}`;reason.className='context-reason';reason.textContent=a.reason;row.append(reason);b.setAttribute('aria-describedby',`site-action-help ${reason.id}`);}
 }
 $('site-actions').replaceChildren(...rows);
}
$('site-actions').onclick=e=>{const b=e.target.closest('[data-household]');if(!b)return;const r=b.dataset.place===inspected?performHouseholdAction(s,inspected,b.dataset.household):{ok:false,message:'地塊已切換，請重新選擇操作'};render();$('site-action-result').textContent=r.message;};
$('route-lines').onchange=draw;
$('site-select').onchange=()=>{$('site-action-result').textContent='';inspected=$('site-select').value||null;closeBlueprint();render();};
$('site-close').onclick=()=>{inspected=null;$('site-action-result').textContent='';render();$('site-select').focus();};
document.querySelector('.plot-controls').onkeydown=e=>{if(e.key==='Escape'&&inspected&&!e.defaultPrevented){e.preventDefault();$('site-close').click();}};
$('site-pause').onclick=()=>{if(inspected&&s.fac[inspected].site){pauseProject(s,inspected,!s.fac[inspected].site.paused);render();}};
$('site-focus').onclick=()=>{if(inspected){setProjectFocus(s,s.focusProject===inspected?null:inspected);render();}};
$('land').onclick=e=>{const r=$('land').getBoundingClientRect(),c=getComputedStyle($('land')),bx=parseFloat(c.borderLeftWidth),by=parseFloat(c.borderTopWidth),x=(e.clientX-r.left-bx)*900/(r.width-2*bx),y=(e.clientY-r.top-by)*560/(r.height-2*by);$('site-action-result').textContent='';inspected=($('project-markers').checked?projectAt(s,x,y,16/Math.max(.1,$('land').clientWidth/900)):null)||plotAt(s,x,y);closeBlueprint();render();if(inspected)$('site-select').focus({preventScroll:true});};
let blueprintDraft=null;
function closeBlueprint(){blueprintDraft=null;$('blueprint-preview').hidden=true;draw();}
function renderBlueprint(){const d=blueprintDraft;$('blueprint-preview').hidden=!d;if(!d)return;renderModels(d);const q=blueprintInfo(s,d.id,d.stage);$('blueprint-info').textContent=`${q.name}：木${q.cost}，庫存可用${q.available}，尚缺${q.shortage}。${q.effect}。${q.reason?q.reason+'。':'可在此立計畫；木料由主角逐根搬到工地，不在確認時扣料。'}${q.craft?'部件在木作台加工後搬回屋內安裝。':''}${restComparisonText(s,d.id)}`;$('blueprint-confirm').disabled=!q.ok;}
function returnBlueprintFocus(id){const el=document.querySelector(`[data-preview="${id}"]`)||$('build-card');el.focus({preventScroll:true});}
$('blueprint-cancel').onclick=()=>{const id=blueprintDraft?.id;closeBlueprint();returnBlueprintFocus(id);};
$('blueprint-preview').onkeydown=e=>{if(e.key==='Escape'){e.preventDefault();$('blueprint-cancel').click();}};
$('blueprint-confirm').onclick=()=>{const d=blueprintDraft;if(!d||!blueprintInfo(s,d.id,d.stage).ok)return;if(startBlueprint(s,d.id)){closeBlueprint();show('藍圖已立，接著依實際材料搬運施工。');render();returnBlueprintFocus(d.id);}};
let lookDraft = null;
function cancelLook(){lookDraft=null;$('look-editor').open=false;draw();}
function previewLook(){const name=normalizeHomeName($('home-name').value),valid=name!==null;lookDraft={style:$('home-style').value,name:valid?name:homeLook(s).name};$('look-apply').disabled=!valid||!s?.fac.hut.stage;$('home-name').setAttribute('aria-invalid',String(!valid));$('look-status').textContent=valid?`預覽${HOME_STYLES[lookDraft.style].name}${name?'・'+name:''}，尚未套用。`:'家名請用最多12個字的文字、數字、空格、間隔號或連字號；尚未套用。';draw();}
$('home-style').innerHTML=Object.entries(HOME_STYLES).map(([id,v])=>`<option value="${id}">${v.name}</option>`).join('');
function beginLook(){if(!s)return;$('home-style').value=homeLook(s).style;$('home-name').value=homeLook(s).name;previewLook();}
$('look-editor').querySelector('summary').onclick=()=>{if(!$('look-editor').open)beginLook();};
$('look-editor').ontoggle=()=>{if(!$('look-editor').open){lookDraft=null;draw();}else if(!lookDraft)beginLook();};
$('home-style').onchange=previewLook;
$('home-name').oninput=previewLook;
$('look-form').onsubmit=e=>{e.preventDefault();if(normalizeHomeName($('home-name').value)!==null&&setHomeLook(s,lookDraft)){cancelLook();render();$('look-editor').querySelector('summary').focus();}};
$('look-cancel').onclick=()=>{cancelLook();$('look-editor').querySelector('summary').focus();};
$('look-reset').onclick=()=>{$('home-style').value='natural';$('home-name').value='';previewLook();};
$('look-editor').onkeydown=e=>{if(e.key==='Escape'){e.preventDefault();e.stopPropagation();cancelLook();$('look-editor').querySelector('summary').focus();}};
let transferDraft = null;
mountTransferManager(document.getElementById('transfer-manager'));
mountTransferManager(document.getElementById('start-transfer-manager'));
let usedDraft = false;
const esc = (v) => String(v).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const show = (msg) => { $('message').textContent = msg; };
const stored = () => { try { return localStorage.getItem(SAVE_KEY); } catch { return null; } };
function clearTransfer() { transferDraft = null; $('transfer-dialog').close(); $('transfer-detail').replaceChildren(); }
function openPreview() { $('transfer-dialog').showModal(); $('transfer-title').focus(); }
$('transfer-dialog').addEventListener('keydown', (e) => { if (e.key !== 'Tab') return; const items = [...$('transfer-dialog').querySelectorAll('button:not(:disabled),input:not(:disabled),a[href]')].filter(el => el.getClientRects().length); const first = items[0], last = items.at(-1); if (!first) return; if (e.shiftKey && (document.activeElement === first || document.activeElement === $('transfer-title'))) {e.preventDefault();last.focus();} else if (!e.shiftKey && document.activeElement === last) {e.preventDefault();first.focus();} });
$('transfer-dialog').addEventListener('cancel', (e) => { e.preventDefault(); clearTransfer(); show('已取消轉接；存檔未改。'); });
function startScreen(on) { $('start').style.display = on ? 'grid' : 'none'; document.querySelector('main').inert = on; document.querySelector('header').inert = on; if (on) $('name').focus(); }
$('start').addEventListener('keydown', (e) => { if (e.key === 'Escape' && s) { e.preventDefault(); startScreen(false); $('new').focus(); } if (e.key !== 'Tab') return; const items = [...$('start').querySelectorAll('a[href],button:not(:disabled),input,select')].filter(el => el.getClientRects().length); const first = items[0], last = items.at(-1); if (e.shiftKey && document.activeElement === first) {e.preventDefault();last.focus();} else if (!e.shiftKey && document.activeElement === last) {e.preventDefault();first.focus();} });
function begin(state) { inspected=null; $('site-action-result').textContent=''; closeBlueprint(); cancelLook(); clearTransfer(); s = state; $('event-slow-note').textContent='';observedEvents=[]; speed = 1; acc = 0; startScreen(false); last = performance.now(); render(); $('homestead-title').focus({preventScroll:true}); }
$('resume').disabled = !stored();
if(new URLSearchParams(location.search).has('classic')||new URLSearchParams(location.search).has('legacy'))$('start-mode-help').textContent='這個入口保留原式生活：需自行立藍圖，不啟用新自主發展；既有吃睡與補庫仍可自主。';
const oldEntry=new URLSearchParams(location.search).has('classic')||new URLSearchParams(location.search).has('legacy');$('frontier-mode').disabled=oldEntry;$('frontier-mode').checked=!oldEntry&&new URLSearchParams(location.search).has('frontier');
$('begin').onclick = () => begin(createHomestead({ name: $('name').value, personality: $('personality').value, mode: new URLSearchParams(location.search).has('legacy') ? 'legacy' : 'solo', autonomy: !new URLSearchParams(location.search).has('classic'), frontier:$('frontier-mode').checked, approach:$('frontier-approach').value,body:Number($('frontier-body').value) }));
$('resume').onclick = () => { const r = loadHomestead(stored()); if (r.ok) begin(r.state); else show(r.error); };
$('new').onclick = () => { inspected=null; $('site-action-result').textContent=''; closeBlueprint(); cancelLook(); clearTransfer(); speed = 0; startScreen(true); $('resume').disabled = !stored(); };
$('save').onclick = () => { if (!s) return; try { localStorage.setItem(SAVE_KEY, saveHomestead(s)); clearTransfer(); show('荒居已存檔。'); } catch { show('無法寫入本機存檔。'); } };
$('load').onclick = () => { const r = loadHomestead(stored()); if (r.ok) { inspected=null; $('site-action-result').textContent=''; closeBlueprint(); cancelLook(); clearTransfer(); s = r.state; acc=0;$('event-slow-note').textContent='';observedEvents=[]; show('荒居讀檔完成。'); render(); } else show(r.error); };
$('transfer-preview').onclick = () => {
  speed = 0; const raw = stored(); const r = previewTransfer(raw);
  clearTransfer(); if (!r.ok) { $('transfer-detail').textContent = r.error; const back = document.createElement('button'); back.id = 'transfer-cancel'; back.textContent = '返回'; $('transfer-detail').append(back); openPreview(); return; }
  transferDraft = r; usedDraft = false;
  let unknownLegacy = false; try { unknownLegacy = transferSlots(localStorage).some(x => x.valid && !validateTransferSave(x.raw).state.homesteadOrigin.receipt); } catch {}
  $('transfer-detail').innerHTML = `<p>已儲存荒居 v${r.sourceVersion} → 本篇新槽；${r.apprentice ? '學徒同行' : '獨自前往'}。</p><b>帶入</b><ul>${r.carried.map((x) => `<li>${esc(x)}</li>`).join('')}</ul><b>不帶入或能力改變</b><ul>${r.dropped.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>${unknownLegacy ? '<p><label><input type="checkbox" id="legacy-confirm">舊 H6 檔已遊玩時無法精確比對來源；我確認這是另一局。</label></p>' : ''}<button id="transfer-confirm">確認另開本篇新局</button><button id="transfer-cancel">取消</button>`;
  openPreview();
};
$('transfer-detail').onclick = (e) => {
  if (e.target.id === 'transfer-cancel') { clearTransfer(); show('已取消轉接；存檔未改。'); }
  if (e.target.id === 'transfer-confirm' && !usedDraft) { usedDraft = true; let r; try { r = commitTransfer(localStorage, transferDraft, { allowLegacy: !!document.getElementById('legacy-confirm')?.checked }); } catch { r = { ok: false, error: '瀏覽器禁止讀寫本機存檔；未轉接。' }; } if (!r.ok) { clearTransfer(); show(r.error); if (r.recovery) { const b = exportTransferBackup(r.recovery); const btn = document.createElement('button'); btn.textContent = '下載回復位元'; btn.onclick = () => { if (b.ok) downloadBytes(b.bytes, 'homestead-recovery.json'); }; $('message').append(btn); } $('message').tabIndex = -1; $('message').focus(); } else { clearTransfer(); location.assign(`index.html?homestead=${r.slot}`); } }
};
for(const[id,target]of[['to-food','recipe-card'],['to-build','build-card']])$(id).onclick=()=>{$(target).scrollIntoView({block:'start'});$(target).focus({preventScroll:true});};
$('meal-style').innerHTML=Object.entries(MEAL_STYLES).map(([id,name])=>`<option value="${id}">${name}</option>`).join('');
$('meal-style').onchange=()=>{setMealStyle(s,$('meal-style').value);render();};
$('life-direction').innerHTML=Object.entries(DIRECTIONS).map(([id,name])=>`<option value="${id}">${name}</option>`).join('');
$('life-direction').onchange=()=>{setAutonomyDirection(s,$('life-direction').value);render();};
$('defer-goal').onclick=()=>{deferAutonomyGoal(s);render();};
$('drop-waiting').onclick=()=>{deferAutonomyGoal(s,s.autonomy?.waiting?.goal);render();};
$('allow-goals').onclick=()=>{allowAutonomyGoals(s);render();};
$('clear').onclick = () => { setOrder(s, null); render(); };
$('speed').onclick = (e) => { const b = e.target.closest('[data-speed]'); if (b) { speed = Number(b.dataset.speed); render(); } };
$('recipes').onclick=(e)=>{const food=e.target.closest('[data-eat]');if(food){if(requestFood(s,food.dataset.eat))show('已選這一份；吃完恢復自主生活，可改令取消。');else show('這份料理已無庫存或目前已吃飽；未改動指派。');render();return;}const b=e.target.closest('[data-recipe]');if(b){if(!requestRecipe(s,b.dataset.recipe))show(recipeReason(s,b.dataset.recipe));else show('已選這一鍋，完成後恢復自主生活；可改令取消。');render();}};
$('orders').onclick = (e) => { const b = e.target.closest('[data-act]'); if (b) { if(s.mode==='solo'&&b.dataset.act==='cook'){if(!requestRecipe(s,'basic'))show(recipeReason(s,'basic'));}else if(!setOrder(s,b.dataset.act,s.autonomy?$('order-scope').value:undefined))show('目前沒有可接的工程或指派條件不符，未改動現在工作。'); render(); } };
$('build').onclick = (e) => { const preview=e.target.closest('[data-preview]');if(preview){blueprintDraft={id:preview.dataset.preview,stage:s.fac[preview.dataset.preview].stage};render();$('blueprint-preview').scrollIntoView({block:'nearest'});$('blueprint-cancel').focus({preventScroll:true});return;} const focus=e.target.closest('[data-focus]');if(focus){setProjectFocus(s,s.focusProject===focus.dataset.focus?null:focus.dataset.focus);render();return;}const project=e.target.closest('[data-project]');if(project){pauseProject(s,project.dataset.project,!s.fac[project.dataset.project].site.paused);render();return;} const b = e.target.closest('[data-build]'); if (b) { if (startBlueprint(s, b.dataset.build)) show('藍圖已立，主角會搬料施工。'); render(); } };
$('community').onclick = (e) => { const b = e.target.closest('[data-social]'); if (!b) return; const action = { invite: inviteHelper, apprentice: acceptApprentice, leave: askHelperLeave }[b.dataset.social]; if (action?.(s)) show('已記入荒居紀事。'); render(); };
$('helper-orders').onclick = (e) => { const b = e.target.closest('[data-helper]'); if (b) { setHelperOrder(s, b.dataset.helper === 'auto' ? null : b.dataset.helper); render(); } };

function draw() { if(s) drawHomestead(ctx,s,lookDraft,blueprintDraft,inspected,$('route-lines').checked,false,$('project-markers').checked,16/Math.max(.1,$('land').clientWidth/900)); }
function focusFallback(el){
 if(el?.dataset?.frontier||el?.closest?.('#frontier-card'))return $('frontier-details').querySelector('summary');
 const d=el?.dataset;if(!d)return null;
 const build=d.build||d.preview||d.project||d.focus;if(build)return $('build-'+build)||$('build-card');
 const recipe=d.recipe||d.eat;if(recipe)return $('recipe-'+recipe)||$('recipe-card');
 if(d.act)return $('orders');
 if(d.household)return $('site-close');
 if(d.inspect)return $('site-select');
 return null;
}
function render() {
  if (!s || pointerHeld) return;
  const focused = document.activeElement; const focusSelector = focused?.id ? '#' + CSS.escape(focused.id) : ['act','recipe','eat','build','preview','inspect','focus','project','social','helper','household','frontier'].find(k => focused?.dataset?.[k]) ? Object.entries(focused.dataset).map(([k,v]) => `[data-${k}="${CSS.escape(v)}"]`).join('') : null;
  if(s){renderMarkup($('frontier-trip-actions'),s.frontier?`<button data-frontier="depart" ${expeditionReason(s,'depart')?'disabled':''}>打包一份料理去本圖獸徑</button><span class="muted">${expeditionReason(s,'depart')||'可出發，先真走回家打包'}</span><button data-frontier="retreat" ${s.frontier.trip.phase==='home'&&!pendingDeparture(s)?'disabled':''}>${pendingDeparture(s)?'取消備糧（尚未扣料）':'撤回家園（保留路糧）'}</button><button data-frontier="trailEat" ${expeditionReason(s,'trailEat')?'disabled':''}>吃包內這一份路糧</button><button data-frontier="reconsider">允許再考慮近山</button>`:'');$('frontier-join').checked=!!s.frontier?.trip.joinRequested;$('frontier-join').disabled=!s.frontier||s.frontier.trip.phase!=='home'||s.frontier.source.cleared;renderMarkup($('frontier-social-actions'),s.frontier?Object.entries(SOCIAL_ACTIONS).map(([id,a])=>`<button data-frontier="${id}" ${socialReason(s,id)?'disabled':''}>${a.name}</button><span class="muted">${socialReason(s,id)||'可進行一次'}</span>`).join('')+`<button data-frontier="alone">${s.frontier.companion.allowed?'希望獨處（訪客先回去）':'允許林舟來訪'}</button>`:'');renderMarkup($('frontier-martial-actions'),s.frontier?`<button data-frontier="practice" ${martialReason(s,'practice')?'disabled':''}>練一段步勢（8秒）</button><button data-frontier="fight" ${martialReason(s,'fight')?'disabled':''}>應戰一次</button><button data-frontier="avoid">${s.frontier.martial.avoid?'允許自主應戰':'選擇避戰'}</button>`:'');if(s.frontier){renderMarkup($('frontier-stance'),Object.entries(MOVES).map(([id,m])=>`<option value="${id}" ${moveKnown(s,id)?'':'disabled'}>${m.name}${moveKnown(s,id)?'':'（未學會）'}</option>`).join(''));$('frontier-stance').value=s.frontier.martial.stance;}$('frontier-approach-live').value=s.frontier?.approach||'guard';$('frontier-card').hidden=!s.frontier;$('frontier-state').textContent=frontierText(s);$('frontier-aim').textContent=frontierAim(s);$('frontier-detail-text').textContent=frontierDetailText(s);$('frontier-trip-state').textContent=s.frontier?expeditionText(s):'';$('homestead-title').querySelector('small').textContent=s.frontier?'生活與山林 · 十輪試作 R1–R10':'山門之前 · 自主生活試玩 · A01–A20';renderMarkup($('frontier-actions'),s.frontier&&s.fac.fence.stage?`<button data-frontier="gate">${s.frontier.gateOpen?'關門':'開門'}</button><button data-frontier="repair">修補1木／6秒／+12耐久</button><button data-frontier="auto-gate">交給角色管門</button>`:'');}

  if(s.frontier){const t=s.frontier.trip;$('frontier-history-summary').textContent=`目前真紀錄：探行${t.returns}/${t.journeys}，${s.frontier.source.cleared?'獸徑已清理':'獸徑尚未清理'}。以下只列本頁／讀檔後觀察；跨讀檔不保存，普通搬運不佔位。`;$('frontier-events').replaceChildren(...observedEvents.toReversed().map(e=>{const li=document.createElement('li');li.textContent=`第${e.day}日・${e.at.toFixed(2)}世界秒：${e.text}`;return li;}));}
  $('event-watch').hidden=!s.frontier;$('event-slow-note').hidden=!s.frontier;
  const p = s.person, task = p.task;
  $('live-needs').textContent=`${p.name} · 飽腹 ${Math.round(p.hunger)}/100 · 精力 ${Math.round(p.energy)}/100`;
  $('live-activity').textContent=activityText(s);
  $('live-speed').textContent=speed?`目前 ${speed}×`:'已暫停';
  document.querySelectorAll('[data-speed]').forEach(b=>b.setAttribute('aria-pressed',String(Number(b.dataset.speed)===speed)));

  renderInspection();renderProjects();renderBlueprint();
  $('time').textContent = `第 ${s.day} 日 · ${Math.floor((s.t % DAY) / DAY * 24).toString().padStart(2, '0')}:00`;
  const feeling=currentFeelings(s);
  const target = supplyTargets(s), resources=resourceSummary(s);
  $('social-card').hidden=s.mode==='solo';
  $('home-nav').hidden=s.mode!=='solo';
  $('look-editor').hidden=s.mode!=='solo';
  for(const el of $('look-form').elements)el.disabled=!s.fac.hut.stage||(el.id==='look-apply'&&normalizeHomeName($('home-name').value)===null);
  $('home-title').textContent=homeLook(s).name||'我的小家';
  $('land').setAttribute('aria-label',`${homeLook(s,lookDraft).name||'荒居'}地圖${lookDraft?'（外觀預覽）':''}`);
  $('home-benefits').hidden=s.mode!=='solo';$('home-benefits').textContent=homeBenefits(s);
  $('project-focus').hidden=s.mode!=='solo';$('project-focus').textContent=projectFocusText(s);
  $('meal-result').hidden=s.mode!=='solo';
  const mealResult=lastMealText(s)||s.log.find(x=>x.msg.startsWith('這一餐：'))?.msg||'可在料理卡選一份現成菜；吃完會回到自主生活。';if($('meal-result').textContent!==mealResult)$('meal-result').textContent=mealResult;
  $('resource-top').textContent=`木料可用 ${resources.available.wood} · 料理共${preparedCount(s)}份（熱飯${s.stock.meal}／拌食${s.stock.salad||0}／燉菜${s.stock.stew||0}）／野果 ${s.stock.berries} · 種子 ${s.stock.seeds} · 青菜 ${s.stock.veg}`;
  $('resource-detail').textContent=`施工已交 ${resources.delivered} 木／運往工地 ${resources.reserved} 木（已離庫，不可再花）；待運${resources.needed}木，共用庫存尚缺${resources.shortage}木。回倉／採集在途：${resources.incoming.map(c=>`${{wood:'木',berries:'野果',veg:'菜',herbs:'藥'}[c.kind]}${c.amount}`).join('、')||'無'}。`;
  $('home-summary').textContent = `${s.autonomy?lifeStage(s)+' · ':'原模式（自立藍圖） · '}${FACILITIES.hut.stages[s.fac.hut.stage].name} · ${s.helper ? '兩人同住' : '一人生活'} · 現成食物約 ${foodDays(s)} 日；自主夠用目標：料理${target.meal}份／果${target.berries}／菜${target.veg}／木${target.wood}／藥${target.herbs}（非容量限制，手動可多備）`;
  $('next-step').textContent = (autonomyText(s)||nextStep(s))+(s.autonomy?' '+mealAimText(s)+' '+(s.autonomy.goal?waitingText(s):''):'');
  $('autonomy-controls').hidden=!s.autonomy;
  $('drop-waiting').hidden=!s.autonomy?.waiting;
  $('order-mode').hidden=!s.autonomy;
  $('order-status').textContent=s.autonomy?`目前${p.order?`${p.orderScope==='once'?'一次':'持續'}指派：${ACTIONS[p.order].name}${p.onceProject?'（完整完成'+FACILITIES[p.onceProject].label+'工程）':''}${p.onceDelivery?'；正把這次成果搬回，放妥才完成':''}`:'沒有直接指派，照自己的打算生活'}。一次採集／收成包含搬回；建造是一項完整工程。一鍋／一份／休息本就一次。`:'';
  if(s.autonomy){$('life-direction').value=s.autonomy.direction;$('defer-goal').disabled=!s.autonomy.goal;$('allow-goals').disabled=!s.autonomy.deferred.length;}
  $('autonomy-mode').textContent=s.autonomy?`自主發展已啟用。${p.order?'目前直接指派優先，完成或清除後再續打算。':'不派工也會安家與改善生活。'}暫停工程需由你恢復。`:'舊局維持原來的自主補庫模式。';
  $('status').innerHTML = `<h2>${esc(p.name)} · ${p.personality === 'quiet' ? '喜靜' : p.personality === 'diligent' ? '勤勞' : s.mode === 'solo' ? '開朗' : '好交往'}</h2><div>飽腹 ${Math.round(p.hunger)} / 100</div><div class="meter"><span style="width:${p.hunger}%"></span></div><div>精力 ${Math.round(p.energy)} / 100</div><div class="meter energy"><span style="width:${p.energy}%"></span></div><p class="activity">${esc(activityText(s))}</p>${s.mode==='solo'?`<div class="feeling">感受 ${feeling.value}/5 · ${feeling.active.map(f=>`${f.name}（${f.left}秒）`).join('、')||'平靜'}<div class="muted">來自實際使用，會消退；不抵銷飢餓或轉為工作增益。</div></div>`:''}<div class="muted">${esc(task?.act==='selfCare'&&s.autonomy?recoveryChoice(s)?.reason||activityReason(s):activityReason(s))}</div><div class="muted">工作 ${Math.floor(p.work)} · 閒暇 ${p.leisure} · 識藥 ${p.herbalSkill}</div>`;
  $('recipe-card').hidden=s.mode!=='solo';
  $('meal-style').value=s.mealStyle||'auto';
  $('meal-style-reason').textContent=`只影響下次自主補餐，不打斷現在工作或手動一鍋／一份。${s.autonomy?.deferred.includes('stew')?'你已暫緩燉菜，自主補餐先用基本餐／拌食；明確派一鍋仍可。':preparedCount(s)>=target.meal?`現成${preparedCount(s)}份已達夠用${target.meal}份，先不另做。`:automaticMealReason(s)||mealDecision(s).reason}`;
  renderMarkup($('recipes'),Object.entries(RECIPES).map(([id,r])=>`<div class="facility" id="recipe-${id}" tabindex="-1" role="group" aria-label="${r.name}的料理與用餐"><b>${r.name} · 料理Lv${r.skill}</b><div class="muted">${Object.entries(r.ingredients).map(([k,n])=>`${RESOURCE_NAMES[k]}${n}`).join('＋')} → ${r.servings}份；每份飽腹${r.hunger}${r.energy?`、精力+${r.energy}`:''}；製作${r.duration}秒。${r.facility===2?'需改良灶具':'需露天灶'}；實吃感受+${FEELINGS[r.feeling].value}，${FEELINGS[r.feeling].duration}秒。</div><div>${recipeReason(s,id)||'已具備做這一鍋的條件'}</div><div>現成 ${s.stock[r.output]||0}份；現在吃可補飽腹${Math.min(100-p.hunger,r.hunger).toFixed(1)}${r.energy?`、精力${Math.min(100-p.energy,r.energy).toFixed(1)}`:''}。</div><button data-eat="${id}" class="${p.foodRequest===id?'active':''}" ${!s.stock[r.output]||p.hunger>=95?'disabled':''}>吃一份${r.name}</button><button data-recipe="${id}" class="${p.cookRequest===id?'active':''}" ${recipeReason(s,id)?'disabled':''}>只做這一鍋${r.name}</button></div>`).join(''));
  $('unlocks').textContent=`建造路線：Lv1木作台／改良灶具 → Lv2且有木作台與木床可做舒適床。已學會：${s.unlocked?.join('、')||'先做好第一間家與第一鍋熱飯'}。`;
  $('skills-card').hidden=s.mode!=='solo';
  $('skills').innerHTML=`<p class="muted">${task&&ACTIONS[task.act]?.skill?`正在做${SKILLS[ACTIONS[task.act].skill].name}工作；有效${task.act==='build'?'施工量':'成果完成'}才累積`:'走路、搬運和休息不發技能經驗。'}</p>`+Object.keys(SKILLS).map(id=>{const k=skillInfo(s,id);return `<div class="skill"><b>${k.name} Lv${k.level}</b> · XP ${Number(k.xp.toFixed(2))}${k.next!==null?`／${k.next}`:'（等級效果封頂）'}<div class="muted">${k.base}體力 → 現在耗${k.costPercent}%${k.nextPercent!==null?`；下級耗${k.nextPercent}%`:'；已達最高效果'}。產量與時間不變。${nextUnlocks(s,id)}</div></div>`;}).join('');
  $('rest-help').hidden=s.mode!=='solo';$('rest-help').textContent=p.energy>=100?'精神已滿，暫不需要歇息；可自主生活或繼續已有工程。':'手動歇息到100後回自主；開始歇息前若缺糧先吃，手上物資先搬回。原自主休息到85，床鋪／住處只在實際使用時改善恢復。';
  renderMarkup($('orders'),Object.entries(ACTIONS).filter(([,a])=>!a.internal&&!a.frontierOnly).filter(([id])=>s.mode!=='solo'||!['chat','gift','care','talkHelper','helperCare'].includes(id)).filter(([id]) => id === 'talkHelper' || id === 'helperCare' ? !!s.helper : id === 'selfCare' ? p.herbalSkill > 0 || s.stock.herbs > 0 : id === 'herbFarm' ? s.fac.hut.stage > 0 : !['chat', 'gift', 'care'].includes(id) || visitorHere(s)).map(([id, a]) => { const locked = id === 'eat' && s.mode==='solo' ? !!eatReason(s) : id === 'rest' && s.mode==='solo' ? p.energy>=100 : id === 'farm' ? !offers(s, 'garden', 'farm') : id === 'herbFarm' ? !offers(s, 'herbGarden', 'herbFarm') : id === 'cook' ? s.mode==='solo'?!!recipeReason(s,'basic'):!offers(s, 'kitchen', 'cook') : id === 'build' ? !Object.values(s.fac).some((x) => x.site) : id === 'gift' ? !s.stock.meal || s.visitor.lastGift === s.day : id === 'care' ? !s.visitor.injury || s.visitor.cared || !s.stock.herbs : id === 'helperCare' ? s.helper?.leaving : id === 'talkHelper' ? s.helper?.leaving || s.visitor.lastChat === s.day : id === 'chat' ? s.visitor.lastChat === s.day : false; return `<button data-act="${id}" ${s.mode==='solo'&&id==='cook'?'aria-describedby="primary-cook-reason"':s.mode==='solo'&&id==='eat'?'aria-describedby="primary-eat-reason"':''} class="${p.order === id ? 'active' : ''}" ${locked ? 'disabled' : ''}>${s.mode==='solo'&&id==='eat'?'吃一份現成食物':s.mode==='solo'&&id==='rest'?'歇到精神恢復（一次）':s.mode==='solo'&&id==='cook'?'基本熱飯（一鍋）':a.name}</button>${s.mode==='solo'&&id==='cook'?`<span id="primary-cook-reason" class="muted">${recipeReason(s,'basic')||'已具備這一鍋的條件；開始仍先顧吃睡與手上搬運。'}</span>`:''}${s.mode==='solo'&&id==='eat'?`<span id="primary-eat-reason" class="muted">${eatReason(s)||'選現成食物，吃這一份後回自主；可到料理卡指定菜。'}</span>`:''}`; }).join(''));
  for (const b of $('speed').querySelectorAll('button')) b.classList.toggle('active', +b.dataset.speed === speed);
  renderMarkup($('build'),buildables(s).filter(id=>id!=='fence'||s.frontier).filter(id=>!['bed','workbench'].includes(id)||s.mode==='solo').filter((id) => id === 'hut' || s.fac.hut.stage > 0).map((id) => { const f = FACILITIES[id], st = s.fac[id], site = st.site, stage = f.stages[st.stage], next = projectRecipe(s,id), info=buildingInfo(s,id), locked=buildAccess(s,id,st.stage+1); return `<div class="facility" id="build-${id}" tabindex="-1" role="group" aria-label="${f.label}的建造狀態"><b>${f.label}：${stage.name}</b><div class="muted">現在：${info.current}${id==='hut'&&s.mode==='solo'&&s.fac.bed.stage?`；在床鋪使用共每秒${restRate(s,{pos:PLACES.hut})}精力`:''}</div>${next ? `<div class="upgrade">建好後：${info.next}${id==='hut'&&s.fac.bed.stage?`；另加既有床鋪${s.fac.bed.stage===2?5:1}，共每秒${next.rest+(s.fac.bed.stage===2?5:1)}精力`:''}</div>` : '<div class="muted">已完成此地塊</div>'}${restComparisonText(s,id)?`<p class="rest-comparison">${restComparisonText(s,id)}</p>`:''}${site ? `${s.mode==='solo'?`<button data-focus="${id}" class="${s.focusProject===id?'active':''}" ${site.paused?'disabled':''}>${s.focusProject===id?'取消優先（照常做）':'這項先做'}</button><button data-project="${id}">${site.paused?'繼續工程':'暫停工程'}</button><span class="muted">${site.paused?'已暫停，材料與進度保留':''}</span>`:''}<div>已交木料 ${site.delivered.wood}/${site.need.wood}，在途 ${site.reserved.wood}；${info.missing === 0 ? site.reserved.wood ? '材料已在途，等待交料' : '材料已交齊，等待施工' : info.shortage ? `此項尚缺${info.shortage}木，需砍柴` : '此項現存材料足夠；多項工程共用庫存，搬出前尚未保留'}；${next.craft?`台前加工 ${site.crafted}/${next.craft}；${site.assemblyAt?'部件已完成，接著搬回屋內；':''}`:''}施工／安裝 ${Math.floor(site.work)}/${site.workNeed}<div class="progress"><span style="width:${Math.min(100, site.work / site.workNeed * 100)}%"></span></div></div>` : next ? `<div><button data-preview="${id}">看地塊</button><button data-build="${id}" ${locked?'disabled':''}>建 ${next.name} · 木 ${next.cost.wood}</button><span class="muted">${locked ? locked : info.shortage ? ` 現有${s.stock.wood}木，尚缺${info.shortage}木` : ' 材料足夠（共用庫存）'}</span></div>` : ''}</div>`; }).join(''));

  $('stock').innerHTML = [['berries', '野果'], ['wood', '木料'], ['seeds', '種子'], ['veg', '青菜'], ['meal', '基本熱飯'], ['herbs', '草藥']].map(([k, n]) => `<div class="statline"><span>${n}</span><b>${s.stock[k]} / ${s.cap[k]}</b></div>`).join('') + (s.mode==='solo'?`<div>蔬果拌食 ${s.stock.salad} · 家常燉菜 ${s.stock.stew} · 共用料理容量 ${preparedCount(s)}/${s.cap.meal}</div>`:'') + `<p class="muted">現成食物按目前人數約可撐 ${foodDays(s)} 日（不含田間與在途）。${s.fac.garden.stage ? `菜園：${{ empty: '待播種', growing: `生長中 ${Math.floor(s.plot.growth)}/34`, ripe: '可收成' }[s.plot.state]}` : '建好菜園才可播種'}；${s.fac.herbGarden.stage ? `藥田：${{ empty: '待插穗', growing: `生長中 ${Math.floor(s.herbPlot.growth)}/50`, ripe: '可收成' }[s.herbPlot.state]}` : '建好藥田才可插穗'}。熱飯需菜 2、木 1；收穫須搬回。</p>`;
  const v = s.visitor, h = s.helper;
  $('community').innerHTML = `<div>${esc(v.name)} · ${v.role === 'visitor' ? visitorHere(s) ? '正在村路' : '已回村' : v.role === 'helper' ? '短住幫手' : '學徒'} · 信任 ${v.trust}</div><div class="muted">${v.injury && !v.cared ? '村路扭傷可用 1 份遊戲草藥照料。' : '關係可慢慢建立；獨居也能繼續生活。'}</div><div class="row"><button data-social="invite" ${visitorHere(s) && v.trust >= 2 && v.willing && s.fac.hut.stage > 0 && v.inviteDay !== s.day ? '' : 'disabled'}>${v.apprenticeDay ? '請學徒回來' : '邀請短住'}</button><button data-social="apprentice" ${h && v.role === 'helper' && v.trust >= 4 && s.t - v.inviteTime >= DAY && h.hunger >= 30 && !h.leaving ? '' : 'disabled'}>彼此同意收徒</button><button data-social="leave" ${h && !h.leaving ? '' : 'disabled'}>請幫手回村</button></div><div class="muted">邀請需小屋、信任 2 且對方願意；收徒需信任 4、同住滿一日、雙方同意。</div>`;
  const helperReason = h?.order && h.task?.act !== h.order ? blockReason(s, h.order, 'helper') : null;
  $('helper-orders').innerHTML = h ? `<div>${esc(h.name)}：飢餓 ${Math.round(h.hunger)} · 精力 ${Math.round(h.energy)} · 雜務 ${Math.floor(h.work)} · 識藥 ${h.herbalSkill} · ${esc(activityText(s,h))}</div>${helperReason ? `<div class="blocked">派工暫停：${esc(helperReason)}</div>` : ''}<div class="row">${[['auto', '自主'], ['chop', '砍柴'], ['farm', '菜園'], ...(v.role === 'apprentice' ? [['herbFarm', '藥田']] : [])].map(([id, label]) => `<button data-helper="${id}" class="${h.order === (id === 'auto' ? null : id) ? 'active' : ''}" ${(id === 'farm' && !offers(s, 'garden', 'farm')) || (id === 'herbFarm' && !offers(s, 'herbGarden', 'herbFarm')) ? 'disabled' : ''}>${label}</button>`).join('')}</div>` : '<div class="muted">目前獨居；可一直維持這樣。</div>';
  $('home-history').textContent = Object.keys(s.fac).filter(id=>s.fac[id].stage>0).map(id=>`✓ ${FACILITIES[id].stages[s.fac[id].stage].name}`).join(' · ') || '第一間屋還在等你落腳。';
  if(s.autonomy)$('home-history').textContent+='。生活進展：'+(autonomyHistory(s)||'尚未完成主要打算。');
  $('log').innerHTML = s.log.slice(0, 9).map((x) => `<li>第${x.day}日 · ${esc(x.msg)}</li>`).join(''); draw();
  if(focusSelector&&(!focused.isConnected||focused.disabled)){const target=document.querySelector(focusSelector),fallback=focusFallback(focused),next=target&&!target.disabled?target:fallback;if(next){next.focus({preventScroll:true});if(next===fallback)next.scrollIntoView({block:'nearest'});}}
}
function loop(now) {
  if (s && speed) { acc += Math.min(0.1, (now - last) / 1000) * speed; let n = 0; while (acc >= .25 && n++ < 16) { const before=frontierSnapshot(s);tickHomestead(s);acc-=.25;const events=frontierEvents(before,frontierSnapshot(s));if(events.length)observedEvents=[...observedEvents,...events].slice(-12);if(events.length&&$('watch-events').checked&&speed>1){const previous=speed;speed=1;acc=0;$('event-slow-note').textContent=`${events.map(e=>e.text).join('；')} · 從${previous}×降至1×，可自行調回。`;render();break;} } }
  if (s && now - painted > 250) { render(); painted = now; }
  last = now; requestAnimationFrame(loop);
}
requestAnimationFrame(loop);
Object.defineProperty(window, '__homestead', { get: () => s });

startScreen(true);
