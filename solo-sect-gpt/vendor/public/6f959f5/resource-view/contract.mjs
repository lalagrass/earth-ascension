// Source: lalagrass/earth-ascension@6f959f534e9a00994f1cea7c230b4110e60db8c6 sect-chronicle/resource-view/contract.mjs (see ../../SOURCES.md); unchanged.
import { field } from '../character-card/contract.mjs';
export { field };
export const RESOURCE_FIELDS = Object.freeze(['amount','capacity','incoming','reserved','available']);
// A detached presentation projection, never a second inventory or availability formula.
export function resourceView({ namespace, sha, nativeId, label, unit, source, availability = 'known', values, uses, links = [], commands = [], notes = [] }) {
  if (!namespace || !/^[a-f0-9]{40}$/.test(sha || '') || !nativeId || !source || !unit) throw Error('Resource provenance and native unit required');
  const fields = Object.fromEntries(RESOURCE_FIELDS.map(key => {
    const f = values[key];
    if (!f?.source) throw Error(`Resource ${key} source required`);
    return [key,field(`resource.${key}`,f.value,{ source:f.source,unit:f.unit || unit,availability:availability === 'known' ? f.availability : availability })];
  }));
  return structuredClone({ version:1,id:`${namespace}:resource:${nativeId}`,namespace,sha,nativeId,label,unit,source,availability,fields,
    uses:field('resource.uses',uses?.value,{source:uses?.source || source,availability:availability === 'known' ? uses?.availability || 'unsupported' : availability}),
    links:availability === 'known' ? links : [], commands:availability === 'known' ? commands : [], notes:availability === 'known' ? notes : [] });
}
