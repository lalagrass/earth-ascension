import {escape,valueText} from '../character-card/render.mjs';
const value=f=>`<span title="${escape(f?.source)}">${escape(valueText(f))}</span>`;
export function commandHtml(view,commands=view.commands){return commands.map(c=>`<button class="btn${c.pressed?' on':''}" data-cmd="${escape(c.nativeId)}" data-intent-command="${escape(c.id)}" data-intent-actor="${escape(view.actorId)}" data-intent-payload="${escape(JSON.stringify(c.payload))}" ${c.enabled?'':'disabled'} ${c.pressed==null?'':`aria-pressed="${c.pressed}"`} title="${escape(c.enabled?c.detail||c.label:c.reason||'未知')}">${escape(c.label)}</button>${!c.enabled&&c.reason?`<small class="intent-disabled">${escape(c.reason)}</small>`:''}`).join(' ');}
export function policiesHtml(v){return `<div class="public-policies">${v.policies.map(p=>`<section data-policy="${escape(p.id)}"><b>${escape(p.label)}</b><p>允許：${value(p.allow)} · 傾向：${value(p.reaction)}</p><p>現在：${value(p.state)} · ${value(p.reason)}</p>${commandHtml(v,v.commands.filter(c=>p.commandIds.includes(c.id)))}</section>`).join('')}</div>`;}
export function intentHtml(v,{controls=true,policies=true,result=null}={}){if(!v)return '<p>此人物意圖不可見或不支援。</p>';
 const f=v.fields;
 return `<section class="public-intent" data-intent-owner="${escape(v.actorId)}"><details data-view-key="intent"><summary>工作目標／待辦與停工</summary><p>執行中：${escape(v.current.current||'未知')} · 下一步：${escape(v.current.next||'未知')}</p><p>活動原因：${value(v.current.reason)}</p><p>既有工作目標：${value(f.workGoal)}</p><p>待改派：${value(f.pending)}</p><p>明確停工：${value(f.stop)} · 恢復：${value(f.rest)}</p><p>玩家叫回：${value(f.recall)}</p><p>已有其他目標：${value(f.goals)}</p><small>原生佇列能力：${value(f.queue)}</small></details>
 <div id="p-pend" class="pending"><span>待改派：${value(f.pending)} · ${value(f.stop)}</span>${commandHtml(v,v.commands.filter(c=>v.shortcuts.includes(c.id)))}</div>
 ${result?`<p role="status" data-intent-result>${escape(result)}</p>`:''}
 ${controls?`<div id="p-cmds" class="cmds">${commandHtml(v,v.commands.filter(c=>c.group==='action'&&!c.hidden))}</div>`:''}
 ${policies?`<details data-view-key="policies"><summary>自主政策與原原因</summary>${policiesHtml(v)}</details>`:''}</section>`;}
