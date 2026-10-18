/* M2 observer extension. All displayed causes come from saved world events. */
const M2_MEMORY_ACTION_EFFECT = {
  '發現': { action: '研究', delta: '+0.35' },
  '關係': { action: '社交', delta: '+0.25' },
  '關係挫折': { action: '社交', delta: '-0.6' },
  '目標受挫': { action: '研究', delta: '-0.4' },
};
let m2EventMapRef = null, m2EventMap = null;
function m2LookupEvent(id) {
  const evs = world?.events || [];
  if (m2EventMapRef !== evs) {
    m2EventMapRef = evs;
    m2EventMap = new Map(evs.filter(e => e.event_id).map(e => [e.event_id, e]));
  }
  return m2EventMap.get(id);
}
function m2MemoryEffectNote(sourceEvent, chosenAction) {
  const eff = sourceEvent && M2_MEMORY_ACTION_EFFECT[sourceEvent.kind];
  if (!eff) return '';
  if (chosenAction && eff.action === chosenAction) {
    return `（影響所選「${esc(eff.action)}」${eff.delta}）`;
  }
  return `（影響候選「${esc(eff.action)}」${eff.delta}${chosenAction ? `，非本月所選「${esc(chosenAction)}」` : ''}）`;
}
function m2ActionMemorySummary(e) {
  const ids = e.causes || [];
  if (!ids.length) return '影響當月候選評分的記憶：無';
  const chosen = e.effects?.action || String(e.text || '').split('：')[1]?.split('；')[0] || '';
  const items = ids.map(id => {
    const src = m2LookupEvent(id);
    const link = src
      ? `<button class="person" data-event="${esc(id)}" title="${esc(id)}">${esc(id)} ↗</button>`
      : `<span title="找不到對應事件">${esc(id)}</span>`;
    return `${link}${m2MemoryEffectNote(src, chosen)}`;
  });
  return `影響當月候選評分的記憶：${items.join('、')}`;
}
function m2Observer(p) {
  const eventById = new Map(world.events.filter(e => e.event_id).map(e => [e.event_id, e]));
  const source = id => id ? `<button class="person" data-event="${esc(id)}">${esc(id)} ↗</button>` : '尚無事件來源';
  const goal = p.goals[0], decision = p.last_decision;
  const memories = (p.memories_v2 || []).slice(0, 12).map(m => {
    const e = eventById.get(m.event_id);
    return e ? `<div class="event">${esc(e.text)}<small>第 ${e.month} 月 · ${esc(e.kind)} · 來源 ${source(e.event_id)}</small></div>` : '';
  }).join('') || '<p>尚無有來源的關鍵記憶。</p>';
  const legacy = (p.legacy_memories || []).slice(0, 6).map(m =>
    `<div class="event">${esc(typeof m === 'string' ? m : JSON.stringify(m))}<small>legacy_unstructured · 舊版未記錄可驗證來源</small></div>`).join('');
  const relations = Object.entries(p.relationships_v2 || {}).sort((a,b) => b[1].trust-a[1].trust).slice(0, 8).map(([id, edge]) =>
    `<div class="event">${esc(world.people[id]?.name || id)} · 信任 ${edge.trust}<small>最近互動：${source(edge.last_event_id)}</small></div>`
  ).join('') || '<p>尚無互動關係。</p>';
  // Decision card: only link sources that exist in this snapshot; otherwise show plain text (#53 review).
  const sourceIfPresent = id => !id ? '尚無事件來源'
    : eventById.has(id) ? source(id) : `<span title="找不到對應事件">${esc(id)}（不在目前快照）</span>`;
  const decisionMemories = decision
    ? (decision.memory_event_ids.map(id => `${sourceIfPresent(id)}${m2MemoryEffectNote(eventById.get(id), decision.action)}`).join('、') || '無')
    : '無';
  const reason = decision ? `<p><strong>${esc(decision.action)}</strong> · ${esc(p.last_action?.outcome || '')}</p>
    <p>決策當時目標 ${esc(decision.goal_label)}（${decision.goal_progress}/${decision.goal_target}${decision.goal_id !== goal.id ? `；月末已轉為「${esc(goal.label)}」` : ''}）；當時計畫步驟 ${esc(decision.plan_step)}；可行行動 ${esc(decision.feasible.join('、'))}；當時已知事實 ${esc(decision.known_fact_ids.join('、') || '尚無')}。</p>
    <p>結算 ${esc(decision.resolution)}；限制 ${esc(decision.constraints.join('、') || '無')}；社交對象 ${esc(decision.target ? (world.people[String(decision.target)]?.name || decision.target) : '無')}。</p>
    <p>基礎分數：${Object.entries(decision.scores).map(([k,v]) => `${esc(k)} ${v}`).join('、')}；選擇波動：${Object.entries(decision.noise).map(([k,v]) => `${esc(k)} ${v}`).join('、')}。</p>
    <p>影響當月候選評分的記憶：${decisionMemories}；結果事件：${decision.outcome_event_ids.map(sourceIfPresent).join('、')}。</p>`
    : '<p>尚未行動；推進一個月後可檢視決策。</p>';
  const reviews = Array.isArray(p.goal_reviews) ? (p.goal_reviews.slice().reverse().map(r => {
    const scores = Object.entries(r.scores || {}).map(([k, v]) => `${esc(k)} ${v}`).join('、');
    const excluded = (r.excluded && r.excluded.length) ? r.excluded.map(esc).join('、') : '無';
    const basisLabel = r.basis === 'memory' ? '關鍵記憶驅動 (memory)' : '人格與處境基線 (profile_baseline)';
    const causes = (r.cause_event_ids && r.cause_event_ids.length) ? r.cause_event_ids.map(source).join('、') : '無決定性記憶事件';
    const contribs = (r.contributions && r.contributions.length)
      ? ` · 記憶加權：${r.contributions.map(c => `${esc(c.candidate)} ${c.delta > 0 ? '+' : ''}${c.delta}（${source(c.event_id)}）`).join('、')}` : '';
    return `<div class="event">第 ${r.month} 月 · ${esc(r.outcome)} → <strong>${esc(r.chosen)}</strong>${r.event_id ? ` · 轉向事件 ${source(r.event_id)}` : ''}<small>依據：${basisLabel} · 剛完成排除：${excluded} · 候選分數：${scores} · 決定來源：${causes}${contribs}</small></div>`;
  }).join('') || '<p>尚無休整期目標評估紀錄。</p>') : '';
  const pendingReview = goal.type !== '穩定生活' && goal.type !== 'legacy_custom' && goal.progress >= goal.target
    ? `（已達標，待第 ${p.plan.review_month} 月檢查結算）` : '';
  const base = p.profile_base || {};
  const drift = Object.entries(p.profile_current).filter(([k, v]) => k in base && Math.round((v - base[k]) * 100) !== 0).map(([k, v]) => {
    const pts = Math.round((v - base[k]) * 100), sources = (p.profile_changes || []).filter(c => c.dimension === k).map(c => `第 ${c.month} 月 ${source(c.event_id)}`).join('、');
    return `<div class="event">${esc(k)} ${pts > 0 ? '+' : ''}${pts} 個百分點（創角 ${Math.round(base[k] * 100)}% → 現在 ${Math.round(v * 100)}%）<small>來源：${sources}</small></div>`;
  }).join('') || '<p>相對創角值尚無變化。</p>';
  const death = p.alive ? null : world.events.find(e => e.kind === '死亡' && [e.actor, e.subject].some(x => x !== undefined && x !== null && String(x) === String(p.id)));
  const choose = goal.type === 'legacy_custom' && p.player && p.alive && viewMonth === null ?
    `<p>舊存檔自訂目標「${esc(goal.label)}」已保留原文；目前以中性步驟運作，尚無專屬規則。可改選：</p>
     <select id="legacy-goal">${['穩定生活','探索靈氣','建立關係','累積財富','服務社群'].map(x => `<option>${x}</option>`).join('')}</select>
     <button class="button secondary" id="choose-goal">確認目標</button>` : '';
  return `<div class="layout" style="grid-template-columns:260px 1fr"><div class="card"><h3>城市人物</h3>${personSelect()}</div><div>
    <div class="card"><div class="eyebrow">${p.player?'PLAYER CHARACTER':'AUTONOMOUS NPC'} · ID ${p.id}</div><h2>${esc(p.name)}</h2>
    <p>${p.age} 歲 · ${esc(p.job)} · ${esc(p.district)} · ${p.alive?'在世':'已故'}</p>
    <span class="pill">${p.alive ? '長期目標' : '離世時的長期目標'}：${esc(goal.label)}</span><span class="pill">狀態：${p.alive ? esc(goal.status) : '已故'}</span><span class="pill">需求：${esc(p.need)}</span>
    ${p.alive ? `<p>進度 ${goal.progress}/${goal.target}${pendingReview} · 下次檢查第 ${p.plan.review_month} 月 · 下一步 ${esc(p.plan.step)}</p>`
      : `<p>進度 ${goal.progress}/${goal.target} · ${death ? `第 ${death.month} 月離世 · 來源 ${source(death.event_id)}` : '離世事件來源不在目前快照'}；目標不再檢查或推進。</p>`}${choose}
    <div class="grid" style="grid-template-columns:repeat(3,1fr)">${stat('健康',p.health,'/100')}${stat('財富',p.wealth,'資源單位')}${stat('生命經過',p.months_lived,'個月')}</div></div>
    <div class="layout"><div class="card"><h3>能力 / 技能</h3>${Object.entries(p.traits).map(([k,v]) => `<div class="barrow"><span>${esc(k)}</span><div class="bar"><b style="width:${v*10}%"></b></div><span>${v}</span></div>`).join('')}
    <p>${Object.entries(p.skills).map(([k,v]) => `<span class="pill">${esc(k)} ${v}</span>`).join('')}</p></div>
    <div class="card"><h3>人格 / 價值</h3>${Object.entries(p.profile_current).map(([k,v]) => `<span class="pill">${esc(k)} ${Math.round(v*100)}%</span>`).join('')}
    <p>經歷變化 ${p.profile_changes.length} 次；以下為相對創角值的變化。</p>${drift}<h3>定向關係</h3>${relations}</div></div>
    <div class="card" style="margin-top:18px"><h3>最近行動 · 為什麼他這樣做？</h3>${reason}${reviews ? `<h3>目標評估與轉向紀錄</h3>${reviews}` : ''}<h3>關鍵記憶與來源</h3>${memories}${legacy ? `<h3>舊版記憶</h3>${legacy}` : ''}</div>
    </div></div>`;
}

document.addEventListener('click', async event => {
  if (event.target?.id !== 'choose-goal') return;
  const person = currentPerson();
  try {
    await api('/api/goal', {method:'POST', headers:{'Content-Type':'application/json'},
      body:JSON.stringify({person_id:person.id, goal:document.getElementById('legacy-goal').value, expected_month:world.month})});
    await load();
    notice('舊目標已明確改選。');
  } catch (error) { notice(error.message, true); }
});
