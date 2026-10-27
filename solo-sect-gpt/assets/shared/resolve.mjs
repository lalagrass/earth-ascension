// Source: lalagrass/earth-ascension@ef823ac277f48d9426cc3806f74468126a9cf91d sect-chronicle/assets/shared/resolve.mjs.
// Local change: the safe local-path prefix is this game's 'assets/shared/' (root = solo-sect-gpt/) instead of 'sect-chronicle/'.
// M38: the 'portrait' label split from lalagrass/earth-ascension@3079a03 resolve.mjs; local checks that a portrait recipe is the whole image and
// that template bindings point at real entries; templateAppearance() reads those bindings.
const root = new URL('../../', import.meta.url);
const fullCommit = /^[a-f0-9]{40}$/;
const hash = /^[a-f0-9]{64}$/;
const localPath = p => typeof p === 'string' && p.startsWith('assets/shared/') && !p.split('/').some(s => !s || s === '.' || s === '..') && !/[\\?#:]/.test(p);
const upstreamPath = p => typeof p === 'string' && p.startsWith('sect-chronicle/') && !p.split('/').some(s => !s || s === '.' || s === '..');
const freeze = v => { if (v && typeof v === 'object') { Object.values(v).forEach(freeze); Object.freeze(v); } return v; };

export function validateManifest(m) {
  const errors = [], ids = new Set(), paths = new Set();
  if (!m?.version || !m?.core || !fullCommit.test(m?.coreCommit || '')) errors.push('manifest: missing version/core/full core commit');
  if (!Array.isArray(m?.assets)) return [...errors, 'manifest: missing assets'];
  for (const a of m.assets) {
    if (!a || typeof a !== 'object') { errors.push('invalid asset record'); continue; }
    const id = a.assetId;
    if (!id || ids.has(id)) errors.push(`duplicate or missing assetId: ${id}`);
    ids.add(id);
    if (!a.use || !a.rights?.status || !a.recipe?.type || !a.source) errors.push(`${id}: missing provenance/use/rights/recipe`);
    if (a.availability === 'missing') {
      if (a.path !== null || !a.fallback || a.rights?.status !== 'unknown') errors.push(`${id}: missing asset needs null path, unknown rights and readable fallback`);
      continue;
    }
    if (a.availability !== 'known' || !localPath(a.path)) errors.push(`${id}: unsafe or missing local path`);
    if (paths.has(a.path)) errors.push(`duplicate path: ${a.path}`);
    paths.add(a.path);
    if (!hash.test(a.sha256 || '') || !fullCommit.test(a.source?.commit || '') || !a.source?.author || a.source.author === 'unknown' || !upstreamPath(a.source?.path)) errors.push(`${id}: unknown source/hash`);
    if (![a.dimensions?.width, a.dimensions?.height].every(v => Number.isInteger(v) && v > 0) || typeof a.alpha?.channel !== 'boolean') errors.push(`${id}: missing dimensions/alpha`);
    if (![a.anchor?.x, a.anchor?.y].every(v => Number.isFinite(v) && v >= 0 && v <= 1)) errors.push(`${id}: missing/invalid foot anchor`);
    if (a.recipe?.type === 'atlas-frame') {
      const r = a.recipe.rect;
      if (!localPath(a.recipe.metadataPath) || !hash.test(a.recipe.metadataSha256 || '') || !a.recipe.frame || !r || ![r.x,r.y,r.w,r.h].every(Number.isInteger) || r.x < 0 || r.y < 0 || r.w <= 0 || r.h <= 0 || r.x+r.w > a.dimensions?.width || r.y+r.h > a.dimensions?.height) errors.push(`${id}: invalid frame recipe`);
    }
    if (a.recipe?.type === 'portrait') {
      const r = a.recipe.rect;
      if (!r || r.x !== 0 || r.y !== 0 || r.w !== a.dimensions?.width || r.h !== a.dimensions?.height) errors.push(`${id}: portrait recipe must be the whole image`);
    }
  }
  for (const [actor,id] of Object.entries(m.portraits || {})) if (!ids.has(id)) errors.push(`${actor}: missing mapped entry ${id}`);
  for (const [tpl,id] of Object.entries(m.templates || {})) if (!ids.has(id)) errors.push(`${tpl}: missing template entry ${id}`);
  return errors;
}
export function createPin(manifest, expectedSha256) {
  const snapshot = structuredClone(manifest), errors = validateManifest(snapshot);
  if (errors.length) throw new Error(errors.join('; '));
  if (!hash.test(expectedSha256 || '')) throw new Error('pin: missing manifest digest');
  return freeze({ manifest: snapshot, expectedSha256 });
}
export function localAssetURL(path) {
  if (!localPath(path)) throw new Error('unsafe local asset path');
  return new URL(path, root).href;
}
function fallback(assetId, availability, label) {
  return { assetId, portraitAssetId: null, availability, url: null, source: null, crop: null, label };
}
export function resolveAsset(pin, assetId) {
  const a = pin?.manifest?.assets?.find(a => a.assetId === assetId);
  if (!a) return fallback(assetId, 'unsupported', `不支援素材：${assetId}`);
  if (a.availability !== 'known') return fallback(assetId, 'missing', a.fallback);
  // Keep unknown or invalid sources out of the renderer, even for an unvalidated caller.
  if (!fullCommit.test(a.source?.commit || '') || !localPath(a.path)) return fallback(assetId, 'unknown', '素材來源未知，使用文字替代');
  return freeze({ ...structuredClone(a), url: localAssetURL(a.path), version: pin.manifest.version });
}
export function portraitFor(pin, branch, actorId) {
  const id = pin?.manifest?.portraits?.[`${branch}:${actorId}`];
  if (!id) return fallback(null, 'unsupported', '尚無此角色正式立繪');
  const a = resolveAsset(pin,id);
  return { ...a, portraitAssetId: a.availability === 'known' ? id : null, crop: a.recipe?.rect || null,
    label: a.availability === 'known' ? (a.recipe?.type === 'portrait' ? '公開立繪' : '既有活動圖裁切（非新立繪）') : a.label };
}
export function templateAppearance(pin, branch, template) {
  const id = pin?.manifest?.templates?.[`${branch}:${template}`];
  if (!id) return fallback(null, 'unsupported', '此開局沒有核准的外觀，使用文字替代');
  const a = resolveAsset(pin, id);
  return { ...a, portraitAssetId: a.availability === 'known' ? id : null, crop: a.recipe?.rect || null,
    label: a.availability === 'known' ? (a.recipe?.type === 'portrait' ? '公開立繪' : '既有活動圖裁切（非新立繪）') : a.label };
}
