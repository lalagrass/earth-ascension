import { martialHtml } from '../martial-view/render.mjs';
import { escape, publicValueHtml } from '../public-ui/values.mjs';
export { escape, valueText } from '../public-ui/values.mjs';
const names = {'energy':'精力','energy.max':'精力上限','load':'負重','leg.level':'腳力等級','leg.xp':'腳力累積','speed.empty':'空手速度','speed.load':'負重速度','innate':'先天天賦','root':'根骨','comprehension':'悟性'};
const text = f => publicValueHtml(f);
export function profileHtml(c) {
 const p = c?.profile;
 if (!p || p.visibility !== 'public') return '';
 const meta = [p.work, p.edition, p.storyStage].filter(Boolean).join(' · ');
 const src = p.source?.kind && p.source?.ref ? `${p.source.kind}：${p.source.ref}` : '';
 return `<div class="public-profile" data-profile-id="${escape(p.profileId || '')}" data-playable="${p.playable ? 'yes' : 'no'}">${p.shortIntro ? `<p class="public-short">${escape(p.shortIntro)}</p>` : ''}${meta ? `<small class="public-stage">${escape(meta)}</small>` : ''}${p.background ? `<details class="public-background"><summary>背景</summary><p>${escape(p.background)}</p>${src ? `<small>來源：${escape(src)}</small>` : ''}${p.playable ? '' : '<small class="public-unplayable">只供對照，不是可選開局。</small>'}</details>` : ''}</div>`;
}
function portraitExpand(p) {
 if (!(p?.availability === 'known' && p.url)) return '<details class="portrait-expand"><summary>立繪未備</summary><p class="portrait-missing">沒有可載入的立繪，使用文字代替。</p></details>';
 const full = p.recipe?.type === 'portrait';
 const frame = full
  ? `<img data-public-portrait alt="${escape(p.label)}" src="${escape(p.url)}">`
  : `<img data-public-portrait alt="${escape(p.label)}" src="${escape(p.url)}" style="width:${p.dimensions.width / p.crop.w * 100}%;left:${-p.crop.x / p.crop.w * 100}%;top:${-p.crop.y / p.crop.h * 100}%">`;
 return `<details class="portrait-expand"><summary>展開立繪</summary><div class="portrait-stage ${full ? 'full' : 'crop'}" style="${full ? '' : `aspect-ratio:${p.crop.w}/${p.crop.h}`}">${frame}<p class="portrait-missing" hidden>本地圖片缺失，使用文字代替。</p></div><small>展開圖在卡片裡往下長，不蓋住操作。</small></details>`;
}
export function identityHtml(c) {
 const p=c.identity.portrait,r=p.crop;
 const art=p.availability==='known'&&r&&p.url ? `<div class="portrait-art" hidden style="aspect-ratio:${r.w}/${r.h}"><img data-public-portrait alt="${escape(p.label)}" src="${escape(p.url)}" style="width:${p.dimensions.width/r.w*100}%;left:${-r.x/r.w*100}%;top:${-r.y/r.h*100}%"></div>` : '';
 return `<div class="public-identity"><div class="public-portrait" title="${escape(p.source ? `${p.source.author} · ${p.source.commit}:${p.source.path} · ${p.version}` : p.label)}" data-asset-id="${escape(p.portraitAssetId)}">${art}<div class="portrait-placeholder" role="img" aria-label="${escape(p.label)}">${escape(c.identity.name.slice(0,1))}<small>${escape(art?'圖片載入中':p.label)}</small></div></div><div><h2>${escape(c.identity.name)}</h2><p>${escape(c.identity.role)}</p><small>${escape(c.branch)} · ${escape(c.actorId)}</small>${art?'<small class="portrait-note">既有活動圖裁切</small>':''}${profileHtml(c)}${portraitExpand(p)}</div></div>`;
}
// Capture handles newly rendered and cached images; failed local files stay readable.
if (typeof document !== 'undefined') {
 const imageState=(e,failed)=>{
  if(!e.target.matches?.('img[data-public-portrait]'))return;
  // Cached image events can arrive during DOM replacement; update after insertion.
  queueMicrotask(()=>{
   const img=e.target, host=img.closest('.public-portrait'), stage=img.closest('.portrait-stage');
   if(host?.isConnected){const art=host.querySelector('.portrait-art'),placeholder=host.querySelector('.portrait-placeholder');if(art&&placeholder&&art.contains(img)){art.hidden=failed;placeholder.hidden=!failed;if(failed)placeholder.querySelector('small').textContent='本地圖片缺失，使用文字替代';}}
   if(stage?.isConnected){img.hidden=failed;const note=stage.querySelector('.portrait-missing');if(note)note.hidden=!failed;}
  });
 };
 document.addEventListener('load',e=>imageState(e,false),true);
 document.addEventListener('error',e=>imageState(e,true),true);
}
export function actionHtml(c) {
 const a=c.action, p=a.progress;
 const phases={down:'前往泉水',dip:'取水',up:'負重返院',pour:'交付水',herbOut:'前往藥圃',herbGather:'採藥',herbBack:'負重返院',herbDeliver:'交付藥草',train:'練功',toTrain:'前往練功樁',fromTrain:'練功返院',idle:'待命',seated:'歇息',toSeat:'前往休息',back:'返院'};
 const phase=phases[a.phase] || a.current;
 const ratio=p.availability==='known' && typeof p.value==='number' ? Math.min(1,Math.max(0,p.value)) : null;
 return `<section class="public-action"><h4>目前行動</h4><b>${escape(a.current)}</b><p>階段：${escape(phase)} · 目標：${escape(a.target || '未知')}</p><p>真實原因：${text(a.reason)}</p><p>負重：${text(c.fields.find(f=>f.semanticId==='load'&&f.layer==='effective'))}</p><p>下一步：${escape(a.next || '未知')}</p><p>停止原因：${text(a.stopReason)}</p>${ratio==null?'<small>進度：未知</small>':`<progress aria-label="行動進度" max="1" value="${ratio}"></progress><small>${Math.round(ratio*100)}%</small>`}</section>`;
}
export function fieldsHtml(c) {
 const layer={initial:'起始快照',base:'目前常態',effective:'當下有效',innate:'先天天賦'};
 return `<details class="public-fields" data-view-key="attributes"><summary>起始／常態／有效值與先天天賦</summary><table><thead><tr><th>欄位</th><th>時點</th><th>原值／單位</th></tr></thead><tbody>${c.fields.map(f=>`<tr><td>${escape(names[f.semanticId] || f.semanticId)}</td><td>${layer[f.layer] || escape(f.layer)}</td><td>${publicValueHtml(f,{raw:true})}</td></tr>`).join('')}</tbody></table><small>未知不等於 0；缺失初值不由目前值倒推。滑鼠停在值上可查來源。</small></details>`;
}
export function renderCard(c){return identityHtml(c)+actionHtml(c)+fieldsHtml(c)+martialHtml(c);}
