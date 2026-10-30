// loop34 介面可讀性（選用，s.jhui）：原型、同門小派、江湖事件三塊面板。純顯示：只讀狀態、不寫狀態、不抽亂數；golden 不變。
// 只顯示玩家已知的資訊：未看清根骨（rootKnown=false）的新弟子，原型也不揭露（原型會洩漏根骨／悟性區間）。
import { ARCH } from './archetype.mjs';
import { CLQ } from './clique.mjs';
import { JHEV, letterP } from './jhevents.mjs';
import { DAY } from './data.mjs';
const esc = (x) => String(x).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
const live = (s) => (s.ds || []).filter((d) => !d.removed);
const ACT = { train: '練功', meditate: '打坐', spar: '切磋' };
export const archKnown = (s, d) => !!d.arch && !!ARCH[d.arch] && (d.id === 'hero' || d.rootKnown !== false);
// 弟子卡上的原型行：已知→名稱（參考）＋一句傾向；未知→提示共事後才看得出
export function archLine(s, d) {
  if (!d.arch || !ARCH[d.arch]) return '';
  if (!archKnown(s, d)) return `<div class="k">原型：？？（共事久了才看得出）</div>`;
  const A = ARCH[d.arch]; return `<div class="k" title="${esc(A.desc)}">原型：${esc(A.name)}（參考：${esc(A.ref)}）— ${esc(A.desc)}</div>`;
}
export function archPanel(s) {
  const ds = live(s).filter((d) => d.arch && ARCH[d.arch]); if (!ds.length) return '<div class="k">門中尚無帶原型的弟子（自創主角可選原型；開「人以群分」後新弟子會帶原型）。</div>';
  const known = ds.filter((d) => archKnown(s, d)), hidden = ds.length - known.length, by = {};
  for (const d of known) (by[d.arch] ??= []).push(d.name);
  const rows = Object.entries(by).map(([id, ns]) => `<tr><td>${esc(ARCH[id].name)}</td><td class="k">參考：${esc(ARCH[id].ref)}</td><td>${ns.map(esc).join('、')}</td><td class="k">${esc(ARCH[id].desc)}</td></tr>`).join('');
  return `<table class="codex"><tr><th>原型</th><th>參考</th><th>弟子</th><th>傾向</th></tr>${rows}</table>${hidden ? `<div class="k">另有 ${hidden} 人原型未明（共事久了才看得出）。</div>` : ''}`;
}
export function cliquePanel(s) {
  if (!s.draw) return '<div class="k">未開「人以群分」，不會結小派。</div>';
  const cs = s.cliques || [], name = (id) => live(s).find((d) => d.id === id);
  const head = `<div class="k">好感彼此都很高的一群人會結成小派；同派的人一起${CLQ.acts.map((a) => ACT[a]).join('／')}時進步略快，剿寨也優先同行。感情淡了就會散。</div>`;
  if (!cs.length) return head + `<div class="k">目前沒有小派。${s.cliqueN ? `（曾結成 ${s.cliqueN} 派，都已散了）` : ''}</div>`;
  return head + cs.map((c) => { const ms = c.ids.map(name).filter(Boolean);
    const now = ms.filter((d) => CLQ.acts.includes(d.task?.act)), same = Object.entries(now.reduce((a, d) => ((a[d.task.act] = (a[d.task.act] || 0) + 1), a), {})).filter(([, n]) => n >= 2);
    return `<div class="card"><b>${esc(c.name)}</b> <span class="k">第 ${c.day} 日結成・${ms.length} 人</span><div>${ms.map((d) => esc(d.name)).join('、')}</div>${same.length ? `<div class="k">正一起${same.map(([a, n]) => `${ACT[a]}（${n} 人）`).join('、')}，進步略快</div>` : ''}</div>`; }).join('');
}
const recent = (s, tag, n) => (s.log || []).filter((l) => l.msg?.startsWith(tag)).slice(0, n);
export function jhevPanel(s) {
  if (!s.jhev) return '<div class="k">未開「江湖事件」。</div>';
  const E = typeof s.jhev === 'object' ? s.jhev : { m: 0, l: 0, lw: 0 }, day = s.day || 1, M = JHEV.master, L = JHEV.letter;
  const est = day >= L.after ? `若今日有人下挑戰帖，勝算約 ${Math.round(letterP(s, day) * 100)}%（看門中前三人的武功）` : `第 ${L.after} 日後才會有人下挑戰帖`;
  const rows = [
    `<div>過路高人：來過 ${E.m || 0} 次${E.t ? `，傳武學 ${E.t} 套` : ''}${E.mv ? `，點撥招式 ${E.mv} 招` : ''}<span class="k">（第 ${M.after} 日起偶爾來訪）</span></div>`,
    `<div>挑戰帖：應戰 ${E.l || 0} 次，勝 ${E.lw || 0}・敗 ${(E.l || 0) - (E.lw || 0)}${E.lr ? `・婉拒 ${E.lr}` : ''}<span class="k">（點到為止，不會受傷；勝了得名聲與彩頭，敗了掉一點名聲）</span></div>`,
    `<div class="k">${est}</div>`];
  const ev = [...recent(s, '【過路高人】', 3), ...recent(s, '【挑戰帖】', 3)].sort((a, b) => b.t - a.t).slice(0, 4);
  return rows.join('') + (ev.length ? `<ul class="k">${ev.map((l) => `<li>第 ${Math.floor(l.t / DAY) + 1} 日：${esc(l.msg)}</li>`).join('')}</ul>` : '<div class="k">還沒遇過江湖事件。</div>');
}
// loop35：折疊狀態由呼叫端保存（closed[key]=true 表示玩家收合過）；預設展開
export const JHUI_KEYS = ['arch', 'clique', 'jhev'];
export function jhuiHtml(s, closed = {}) {
  if (!s.jhui) return '';
  const sec = (k, title, body) => `<details data-keep="jhui-${k}"${closed[`jhui-${k}`] ? '' : ' open'}><summary>${title}</summary>${body}</details>`;
  return sec('arch', '原型', archPanel(s)) + sec('clique', '同門小派', cliquePanel(s)) + sec('jhev', '江湖事件', jhevPanel(s));
}
