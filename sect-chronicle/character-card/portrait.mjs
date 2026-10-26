// #343 previews are NOT production portraits. No same-name or arbitrary fallback.
export const PORTRAITS = Object.freeze({});
export function portrait(branch, actorId) {
  return PORTRAITS[`${branch}:${actorId}`] || { portraitAssetId: null, source: null, crop: null, availability: 'unsupported', label: '尚無此角色正式立繪' };
}
