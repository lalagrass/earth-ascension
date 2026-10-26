// Source: lalagrass/earth-ascension@ef823ac277f48d9426cc3806f74468126a9cf91d sect-chronicle/martial-view/contract.mjs (see ../SOURCES.md); import path only.
import { field } from '../character-card/contract.mjs';
export const CONDITION_LAYERS = Object.freeze(['entry', 'capacity', 'control', 'special']);
// Display records only: no common formula, effect multiplication or learning command.
export function martialEntry({ id, name, source, learned, proficiency, execution, conditions = {}, moves = [], risk }) {
  if (!id || !source) throw new Error('A martial record needs its native ID and source');
  const absent = (key, availability = 'unknown') => field(key, null, { source, availability });
  return structuredClone({ id, name, source, learned: learned || absent('learned'),
    proficiency: proficiency || absent('proficiency'), execution: execution || absent('execution'), moves,
    conditions: CONDITION_LAYERS.map(id => ({ id, appliesTo: conditions[id]?.appliesTo || '原核心未提供作用階段',
      policy: conditions[id]?.policy || '未評估', result: conditions[id]?.result || absent(`condition.${id}`, 'unsupported') })),
    risk: risk || absent('risk') });
}
