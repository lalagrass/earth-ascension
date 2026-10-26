// Public values are detached and masked BEFORE any renderer receives them.
export const AVAILABILITY = Object.freeze(['known', 'unknown', 'hidden', 'unsupported']);
export function field(semanticId, value, { source, unit = '', layer = 'base', availability = value == null ? 'unknown' : 'known' } = {}) {
  if (!AVAILABILITY.includes(availability)) throw new Error('Invalid availability');
  if (!source) throw new Error('A public value requires a source');
  return { semanticId, layer, source, unit, availability,
    ...(availability === 'known' ? { value: structuredClone(value) } : {}) };
}
export const missing = (id, source, layer = 'initial') => field(id, null, { source, layer });
const PROFILE_TEXT = ['profileId', 'displayName', 'templateId', 'work', 'edition', 'storyStage', 'actorId', 'designId', 'skinId', 'portraitAssetId', 'shortIntro', 'background'];
const profileText = (v) => typeof v === 'string' && v.trim() ? v : null;
// Only public strings leave this boundary. Hidden records and extra keys are dropped before render.
export function sanitizeProfile(input) {
  if (!input || typeof input !== 'object' || input.visibility !== 'public') return null;
  const out = { visibility: 'public', playable: input.playable === true };
  for (const key of PROFILE_TEXT) {
    const value = profileText(input[key]);
    if (value) out[key] = value;
  }
  if (profileText(input.source?.kind) && profileText(input.source?.ref)) out.source = { kind: input.source.kind, ref: input.source.ref };
  if (!out.profileId || !out.displayName || (!out.shortIntro && !out.background)) return null;
  return out;
}
export function card({ branch, sha, actorId, identity, action, fields, martial = [], commands = [], profile = null }) {
  return structuredClone({ version: 1, key: `${branch}:${sha}:${actorId}`, branch, sha, actorId, identity, action, fields, martial, commands, profile: sanitizeProfile(profile) });
}
