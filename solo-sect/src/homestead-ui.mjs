import {RECIPES,preparedCount,recipeAccess,recipeReason,buildAccess,RESOURCE_NAMES} from './homestead-content.mjs';
import {currentFeelings,restRate} from './homestead-living.mjs';
import {SKILLS,skillInfo} from './homestead-skills.mjs';
import { drawHomestead } from './homestead-scene.mjs';
import { activityText, activityReason, buildingInfo, nextStep, foodDays, resourceSummary } from './homestead-view.mjs';
import { ACTIONS, BUILDABLE, FACILITIES, PLACES, HOME, DAY, SAVE_KEY, offers, supplyTargets, blockReason, visitorHere, createHomestead, startBlueprint, pauseProject, requestRecipe, setOrder, setHelperOrder, inviteHelper, acceptApprentice, askHelperLeave, tickHomestead, saveHomestead, loadHomestead } from './homestead.mjs';
import { mountTransferManager, downloadBytes } from './transfer-manager-ui.mjs';
import { previewTransfer, commitTransfer, transferSlots, validateTransferSave, exportTransferBackup } from './homestead-transfer.mjs';
const $ = (id) => document.getElementById(id);
const ctx = $('land').getContext('2d');
new ResizeObserver(()=>document.documentElement.style.setProperty('--home-header',`${document.querySelector('header').getBoundingClientRect().height}px`)).observe(document.querySelector('header'));
let s = null, speed = 1, last = performance.now(), acc = 0, painted = 0;
let pointerHeld = false;
document.addEventListener('pointerdown', () => {pointerHeld=true;});
for (const event of ['pointerup','pointercancel']) document.addEventListener(event, () => {pointerHeld=false;});
window.addEventListener('blur', () => {pointerHeld=false;});
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
function begin(state) { clearTransfer(); s = state; speed = 1; acc = 0; startScreen(false); last = performance.now(); render(); }
$('resume').disabled = !stored();
$('begin').onclick = () => begin(createHomestead({ name: $('name').value, personality: $('personality').value, mode: new URLSearchParams(location.search).has('legacy') ? 'legacy' : 'solo' }));
$('resume').onclick = () => { const r = loadHomestead(stored()); if (r.ok) begin(r.state); else show(r.error); };
$('new').onclick = () => { clearTransfer(); speed = 0; startScreen(true); $('resume').disabled = !stored(); };
$('save').onclick = () => { if (!s) return; try { localStorage.setItem(SAVE_KEY, saveHomestead(s)); clearTransfer(); show('荒居已存檔。'); } catch { show('無法寫入本機存檔。'); } };
$('load').onclick = () => { const r = loadHomestead(stored()); if (r.ok) { clearTransfer(); s = r.state; show('荒居讀檔完成。'); render(); } else show(r.error); };
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
$('clear').onclick = () => { setOrder(s, null); render(); };
$('speed').onclick = (e) => { const b = e.target.closest('[data-speed]'); if (b) { speed = Number(b.dataset.speed); render(); } };
$('recipes').onclick=(e)=>{const b=e.target.closest('[data-recipe]');if(b){if(!requestRecipe(s,b.dataset.recipe))show(recipeReason(s,b.dataset.recipe));else show('已選這一鍋，完成後恢復自主生活；可改令取消。');render();}};
$('orders').onclick = (e) => { const b = e.target.closest('[data-act]'); if (b) { if(s.mode==='solo'&&b.dataset.act==='cook')requestRecipe(s,'basic');else setOrder(s, b.dataset.act); render(); } };
$('build').onclick = (e) => { const project=e.target.closest('[data-project]');if(project){pauseProject(s,project.dataset.project,!s.fac[project.dataset.project].site.paused);render();return;} const b = e.target.closest('[data-build]'); if (b) { if (startBlueprint(s, b.dataset.build)) show('藍圖已立，主角會搬料施工。'); render(); } };
$('community').onclick = (e) => { const b = e.target.closest('[data-social]'); if (!b) return; const action = { invite: inviteHelper, apprentice: acceptApprentice, leave: askHelperLeave }[b.dataset.social]; if (action?.(s)) show('已記入荒居紀事。'); render(); };
$('helper-orders').onclick = (e) => { const b = e.target.closest('[data-helper]'); if (b) { setHelperOrder(s, b.dataset.helper === 'auto' ? null : b.dataset.helper); render(); } };

function draw() { if(s) drawHomestead(ctx,s); }
function render() {
  if (!s || pointerHeld) return;
  const focused = document.activeElement; const focusSelector = focused?.id ? '#' + CSS.escape(focused.id) : ['act','recipe','build','project','social','helper'].find(k => focused?.dataset?.[k]) ? Object.entries(focused.dataset).map(([k,v]) => `[data-${k}="${CSS.escape(v)}"]`).join('') : null;
  const p = s.person, task = p.task;
  $('time').textContent = `第 ${s.day} 日 · ${Math.floor((s.t % DAY) / DAY * 24).toString().padStart(2, '0')}:00`;
  const feeling=currentFeelings(s);
  const target = supplyTargets(s), resources=resourceSummary(s);
  $('social-card').hidden=s.mode==='solo';
  $('resource-top').textContent=`木料可用 ${resources.available.wood} · 料理共${preparedCount(s)}份（熱飯${s.stock.meal}／拌食${s.stock.salad||0}／燉菜${s.stock.stew||0}）／野果 ${s.stock.berries} · 種子 ${s.stock.seeds} · 青菜 ${s.stock.veg}`;
  $('resource-detail').textContent=`施工已交 ${resources.delivered} 木／運往工地 ${resources.reserved} 木（已離庫，不可再花）；待運${resources.needed}木，共用庫存尚缺${resources.shortage}木。回倉／採集在途：${resources.incoming.map(c=>`${{wood:'木',berries:'野果',veg:'菜',herbs:'藥'}[c.kind]}${c.amount}`).join('、')||'無'}。`;
  $('home-summary').textContent = `${FACILITIES.hut.stages[s.fac.hut.stage].name} · ${s.helper ? '兩人同住' : '一人生活'} · 現成食物約 ${foodDays(s)} 日；自主夠用目標：飯${target.meal}／果${target.berries}／菜${target.veg}／木${target.wood}／藥${target.herbs}（非容量限制，手動可多備）`;
  $('next-step').textContent = nextStep(s);
  $('status').innerHTML = `<h2>${esc(p.name)} · ${p.personality === 'quiet' ? '喜靜' : p.personality === 'diligent' ? '勤勞' : s.mode === 'solo' ? '開朗' : '好交往'}</h2><div>飢餓 ${Math.round(p.hunger)} / 100</div><div class="meter"><span style="width:${p.hunger}%"></span></div><div>精力 ${Math.round(p.energy)} / 100</div><div class="meter energy"><span style="width:${p.energy}%"></span></div><p class="activity">${esc(activityText(s))}</p>${s.mode==='solo'?`<div class="feeling">感受 ${feeling.value}/5 · ${feeling.active.map(f=>`${f.name}（${f.left}秒）`).join('、')||'平靜'}<div class="muted">來自實際使用，會消退；不抵銷飢餓或轉為工作增益。</div></div>`:''}<div class="muted">${esc(activityReason(s))}</div><div class="muted">工作 ${Math.floor(p.work)} · 閒暇 ${p.leisure} · 識藥 ${p.herbalSkill}</div>`;
  $('recipe-card').hidden=s.mode!=='solo';
  $('recipes').innerHTML=Object.entries(RECIPES).map(([id,r])=>`<div class="facility"><b>${r.name} · 料理Lv${r.skill}</b><div class="muted">${Object.entries(r.ingredients).map(([k,n])=>`${RESOURCE_NAMES[k]}${n}`).join('＋')} → ${r.servings}份；每份飽腹${r.hunger}${r.energy?`、精力+${r.energy}`:''}；製作${r.duration}秒。${r.facility===2?'需改良灶具':'需露天灶'}</div><div>${recipeReason(s,id)||'已具備做這一鍋的條件'}</div><button data-recipe="${id}" class="${p.cookRequest===id?'active':''}" ${recipeReason(s,id)?'disabled':''}>只做這一鍋${r.name}</button></div>`).join('');
  $('unlocks').textContent=`建造路線：Lv1木作台／改良灶具 → Lv2且有木作台與木床可做舒適床。已學會：${s.unlocked?.join('、')||'先做好第一間家與第一鍋熱飯'}。`;
  $('skills-card').hidden=s.mode!=='solo';
  $('skills').innerHTML=`<p class="muted">${task&&ACTIONS[task.act]?.skill?`正在做${SKILLS[ACTIONS[task.act].skill].name}工作；有效${task.act==='build'?'施工量':'成果完成'}才累積`:'走路、搬運和休息不發技能經驗。'}</p>`+Object.keys(SKILLS).map(id=>{const k=skillInfo(s,id);return `<div class="skill"><b>${k.name} Lv${k.level}</b> · XP ${Number(k.xp.toFixed(2))}${k.next!==null?`／${k.next}`:'（封頂）'}<div class="muted">${k.base}體力 → 現在耗${k.costPercent}%${k.nextPercent!==null?`；下級耗${k.nextPercent}%`:'；已達最高效果'}。產量與時間不變。</div></div>`;}).join('');
  $('orders').innerHTML = Object.entries(ACTIONS).filter(([id])=>s.mode!=='solo'||!['chat','gift','care','talkHelper','helperCare'].includes(id)).filter(([id]) => id === 'talkHelper' || id === 'helperCare' ? !!s.helper : id === 'selfCare' ? p.herbalSkill > 0 || s.stock.herbs > 0 : id === 'herbFarm' ? s.fac.hut.stage > 0 : !['chat', 'gift', 'care'].includes(id) || visitorHere(s)).map(([id, a]) => { const locked = id === 'farm' ? !offers(s, 'garden', 'farm') : id === 'herbFarm' ? !offers(s, 'herbGarden', 'herbFarm') : id === 'cook' ? !offers(s, 'kitchen', 'cook') : id === 'build' ? !Object.values(s.fac).some((x) => x.site) : id === 'gift' ? !s.stock.meal || s.visitor.lastGift === s.day : id === 'care' ? !s.visitor.injury || s.visitor.cared || !s.stock.herbs : id === 'helperCare' ? s.helper?.leaving : id === 'talkHelper' ? s.helper?.leaving || s.visitor.lastChat === s.day : id === 'chat' ? s.visitor.lastChat === s.day : false; return `<button data-act="${id}" class="${p.order === id ? 'active' : ''}" ${locked ? 'disabled' : ''}>${s.mode==='solo'&&id==='cook'?'基本熱飯（一鍋）':a.name}</button>`; }).join('');
  for (const b of $('speed').querySelectorAll('button')) b.classList.toggle('active', +b.dataset.speed === speed);
  $('build').innerHTML = BUILDABLE.filter(id=>!['bed','workbench'].includes(id)||s.mode==='solo').filter((id) => id === 'hut' || s.fac.hut.stage > 0).map((id) => { const f = FACILITIES[id], st = s.fac[id], site = st.site, stage = f.stages[st.stage], next = f.stages[st.stage + 1], info=buildingInfo(s,id), locked=buildAccess(s,id,st.stage+1); return `<div class="facility"><b>${f.label}：${stage.name}</b><div class="muted">現在：${info.current}${id==='hut'&&s.mode==='solo'&&s.fac.bed.stage?`；在床鋪使用共每秒${restRate(s,{pos:PLACES.hut})}精力`:''}</div>${next ? `<div class="upgrade">建好後：${info.next}${id==='hut'&&s.fac.bed.stage?`；另加既有床鋪${s.fac.bed.stage===2?5:1}，共每秒${next.rest+(s.fac.bed.stage===2?5:1)}精力`:''}</div>` : '<div class="muted">已完成此地塊</div>'}${site ? `${s.mode==='solo'?`<button data-project="${id}">${site.paused?'繼續工程':'暫停工程'}</button><span class="muted">${site.paused?'已暫停，材料與進度保留':''}</span>`:''}<div>已交木料 ${site.delivered.wood}/${site.need.wood}，在途 ${site.reserved.wood}；${info.missing === 0 ? site.reserved.wood ? '材料已在途，等待交料' : '材料已交齊，等待施工' : info.shortage ? `此項尚缺${info.shortage}木，需砍柴` : '此項現存材料足夠；多項工程共用庫存，搬出前尚未保留'}；${next.craft?`台前加工 ${site.crafted}/${next.craft}；${site.assemblyAt?'部件已完成，接著搬回屋內；':''}`:''}施工／安裝 ${Math.floor(site.work)}/${site.workNeed}<div class="progress"><span style="width:${Math.min(100, site.work / site.workNeed * 100)}%"></span></div></div>` : next ? `<div><button data-build="${id}" ${locked?'disabled':''}>建 ${next.name} · 木 ${next.cost.wood}</button><span class="muted">${locked ? locked : info.shortage ? ` 現有${s.stock.wood}木，尚缺${info.shortage}木` : ' 材料足夠（共用庫存）'}</span></div>` : ''}</div>`; }).join('');

  $('stock').innerHTML = [['berries', '野果'], ['wood', '木料'], ['seeds', '種子'], ['veg', '青菜'], ['meal', '基本熱飯'], ['herbs', '草藥']].map(([k, n]) => `<div class="statline"><span>${n}</span><b>${s.stock[k]} / ${s.cap[k]}</b></div>`).join('') + (s.mode==='solo'?`<div>蔬果拌食 ${s.stock.salad} · 家常燉菜 ${s.stock.stew} · 共用料理容量 ${preparedCount(s)}/${s.cap.meal}</div>`:'') + `<p class="muted">現成食物按目前人數約可撐 ${foodDays(s)} 日（不含田間與在途）。${s.fac.garden.stage ? `菜園：${{ empty: '待播種', growing: `生長中 ${Math.floor(s.plot.growth)}/34`, ripe: '可收成' }[s.plot.state]}` : '建好菜園才可播種'}；${s.fac.herbGarden.stage ? `藥田：${{ empty: '待插穗', growing: `生長中 ${Math.floor(s.herbPlot.growth)}/50`, ripe: '可收成' }[s.herbPlot.state]}` : '建好藥田才可插穗'}。熱飯需菜 2、木 1；收穫須搬回。</p>`;
  const v = s.visitor, h = s.helper;
  $('community').innerHTML = `<div>${esc(v.name)} · ${v.role === 'visitor' ? visitorHere(s) ? '正在村路' : '已回村' : v.role === 'helper' ? '短住幫手' : '學徒'} · 信任 ${v.trust}</div><div class="muted">${v.injury && !v.cared ? '村路扭傷可用 1 份遊戲草藥照料。' : '關係可慢慢建立；獨居也能繼續生活。'}</div><div class="row"><button data-social="invite" ${visitorHere(s) && v.trust >= 2 && v.willing && s.fac.hut.stage > 0 && v.inviteDay !== s.day ? '' : 'disabled'}>${v.apprenticeDay ? '請學徒回來' : '邀請短住'}</button><button data-social="apprentice" ${h && v.role === 'helper' && v.trust >= 4 && s.t - v.inviteTime >= DAY && h.hunger >= 30 && !h.leaving ? '' : 'disabled'}>彼此同意收徒</button><button data-social="leave" ${h && !h.leaving ? '' : 'disabled'}>請幫手回村</button></div><div class="muted">邀請需小屋、信任 2 且對方願意；收徒需信任 4、同住滿一日、雙方同意。</div>`;
  const helperReason = h?.order && h.task?.act !== h.order ? blockReason(s, h.order, 'helper') : null;
  $('helper-orders').innerHTML = h ? `<div>${esc(h.name)}：飢餓 ${Math.round(h.hunger)} · 精力 ${Math.round(h.energy)} · 雜務 ${Math.floor(h.work)} · 識藥 ${h.herbalSkill} · ${esc(activityText(s,h))}</div>${helperReason ? `<div class="blocked">派工暫停：${esc(helperReason)}</div>` : ''}<div class="row">${[['auto', '自主'], ['chop', '砍柴'], ['farm', '菜園'], ...(v.role === 'apprentice' ? [['herbFarm', '藥田']] : [])].map(([id, label]) => `<button data-helper="${id}" class="${h.order === (id === 'auto' ? null : id) ? 'active' : ''}" ${(id === 'farm' && !offers(s, 'garden', 'farm')) || (id === 'herbFarm' && !offers(s, 'herbGarden', 'herbFarm')) ? 'disabled' : ''}>${label}</button>`).join('')}</div>` : '<div class="muted">目前獨居；可一直維持這樣。</div>';
  $('home-history').textContent = Object.keys(s.fac).filter(id=>s.fac[id].stage>0).map(id=>`✓ ${FACILITIES[id].stages[s.fac[id].stage].name}`).join(' · ') || '第一間屋還在等你落腳。';
  $('log').innerHTML = s.log.slice(0, 9).map((x) => `<li>第${x.day}日 · ${esc(x.msg)}</li>`).join(''); draw();
  if (focusSelector && !focused.isConnected) document.querySelector(focusSelector)?.focus({preventScroll:true});
}
function loop(now) {
  if (s && speed) { acc += Math.min(0.1, (now - last) / 1000) * speed; let n = 0; while (acc >= .25 && n++ < 16) { tickHomestead(s); acc -= .25; } }
  if (s && now - painted > 250) { render(); painted = now; }
  last = now; requestAnimationFrame(loop);
}
requestAnimationFrame(loop);
Object.defineProperty(window, '__homestead', { get: () => s });

startScreen(true);
