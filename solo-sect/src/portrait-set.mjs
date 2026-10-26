// v1.8 PB-15/16/18：新舊畫像並存開關。v2＝批次後製版（去背壓淡＋描邊；小尺寸用臉部頭像），舊檔不刪。
export const POST_IDS = new Set('afang ake axing baozugong baozupo caifeng dongfangbubai feizaicong fengqingyang guojing haidafu hongqigong huangrong huoyunxieshen kulijiang linghuchong linpingzhi munianci ningzhongze renyingying shuanger tianboguang weixiaobao xiaolongnv xiaozhao yangguo youzhagui yuebuqun yuelingshan zhangwuji zhaomin zhoubotong '.trim().split(' '));
export const PSET_KEY = 'solo-sect-portraits';
export const SMALL_PX = 72; // 顯示寬 ≤72px 改用頭像
export function portraitSrc(src, set, small = false) {
  const m = /^(.*?)assets\/portraits\/(?:v2\/post\/)?([\w]+?)(?:-head)?\.png$/.exec(src || ''); if (!m || !POST_IDS.has(m[2])) return src;
  return set === 'v2' ? `${m[1]}assets/portraits/v2/post/${m[2]}${small ? '-head' : ''}.png` : `${m[1]}assets/portraits/${m[2]}.png`;
}
export function applyPortraitSet(root, set) {
  for (const img of root.querySelectorAll('img[src*="assets/portraits/"]')) { const cur = img.getAttribute('src'); const w = img.clientWidth || img.width || 999; const nx = portraitSrc(cur, set, w > 0 && w <= SMALL_PX); if (nx !== cur) img.setAttribute('src', nx); }
}
export function bindPortraitSet(doc, store, btn) {
  let set = store.getItem(PSET_KEY) === 'v2' ? 'v2' : 'v1'; const label = () => { if (btn) btn.textContent = set === 'v2' ? '畫像：新（v2）' : '畫像：舊'; };
  let busy = false; const run = () => { if (busy) return; busy = true; try { applyPortraitSet(doc, set); } finally { busy = false; } };
  new doc.defaultView.MutationObserver(run).observe(doc.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['src'] });
  if (btn) btn.onclick = () => { set = set === 'v2' ? 'v1' : 'v2'; store.setItem(PSET_KEY, set); label(); run(); };
  label(); run(); return () => set;
}
