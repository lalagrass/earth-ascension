// Public values are detached and masked BEFORE any renderer receives them.
export const AVAILABILITY = Object.freeze(['known', 'unknown', 'hidden', 'unsupported']);
export function field(semanticId, value, { source, unit = '', layer = 'base', availability = value == null ? 'unknown' : 'known' } = {}) {
  if (!AVAILABILITY.includes(availability)) throw new Error('Invalid availability');
  if (!source) throw new Error('A public value requires a source');
  return { semanticId, layer, source, unit, availability,
    ...(availability === 'known' ? { value: structuredClone(value) } : {}) };
}
export const missing = (id, source, layer = 'initial') => field(id, null, { source, layer });
export function card({ branch, sha, actorId, identity, action, fields, martial = [], commands = [] }) {
  return structuredClone({ version: 1, key: `${branch}:${sha}:${actorId}`, branch, sha, actorId, identity, action, fields, martial, commands });
}
