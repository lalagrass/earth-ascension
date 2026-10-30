// loop37：右欄太長（外部審查）。各區標題可點擊收合，狀態記在介面偏好（keep）；預設收合較少用的區塊。純介面。
export const FOLD_DEFAULT = { arts: true, codex: true, hunt: true, labor: true, ledger: true, rel: true };
export const foldKey = (id) => `sec-${id}`;
export const isFolded = (K, id) => (foldKey(id) in (K || {}) ? !!K[foldKey(id)] : !!FOLD_DEFAULT[id]);
export const setAll = (K, ids, folded) => { for (const id of ids) K[foldKey(id)] = folded; return K; };
