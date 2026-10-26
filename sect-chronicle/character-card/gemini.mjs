import { card, field, missing } from './contract.mjs';
import { officialMartial } from '../martial-view/official.mjs';
import { portrait } from './portrait.mjs';
export const GEMINI_SHA = 'bae43412dced2a2f0d9d82008d5cdf8b3acfb8f9';
export const OFFICIAL_SHA = '95402dcaf6adff4b39a799c930af58c536273b6a';
export function geminiCard(model, actorId, { fixed = false, identity = {} } = {}) {
  const v = model.view(), p = v.people[actorId];
  if (!p) throw new Error('Unknown actor');
  const branch = fixed ? 'gemini' : 'dev', sha = fixed ? GEMINI_SHA : OFFICIAL_SHA;
  const source = `${branch}:${sha}:model.view.people.${actorId}`;
  const f = (id, value, layer = 'base', unit = '') => field(id, value, { source, layer, unit });
  const t = p.train01, training = !!(t?.goal || t?.training);
  const reason = training ? t.why : p.tea?.active ? p.tea.why : p.life02?.why || p.why;
  const load = ['up','pour','herbBack','herbDeliver','woodBack','woodDeliver'].includes(p.phase?.name);
  const progress = training ? t.unitK : p.mode === 'carry' ? p.tripProgress : null;
  const fields = [f('energy', p.energy, 'effective', '精力點'), f('energy.max', p.energyMax, 'base', '精力點'),
    f('load', load ? 1 : 0, 'effective', '趟負載（非重量）'),
    f('leg.level', p.initialLevel, 'initial', 'Lv'), f('leg.level', p.level, 'base', 'Lv'),
    f('leg.xp', p.xp, 'base', '趟'), missing('energy', source),
    ...['empty','load'].flatMap(k => [f(`speed.${k}`, p.speedsInitial?.[k], 'initial', '場景單位／秒'), f(`speed.${k}`, p.speeds?.[k], 'base', '場景單位／秒'), f(`speed.${k}`, (p.mode === 'carry' ? p.tripSpeeds : p.speeds)?.[k], 'effective', '場景單位／秒')])];
  // Persona is a distinct authority; no energy/explain fallback across owners.
  const persona = fixed ? (actorId === 'hero' ? v.life?.master : v.life?.fellow) : null;
  if (persona?.innateStats) for (const [id,value] of Object.entries(persona.innateStats)) {
    // Only scalar public innate stats, never raw traits/perks/heartSeal/persona.
    if (typeof value === 'number') fields.push(field(`innate.${id}`, value, { layer: 'innate', source: `gemini:${sha}:view.life.${actorId === 'hero' ? 'master' : 'fellow'}.innateStats.${id}`, unit: '原生值', availability: 'hidden' }));
  }
  if (!persona) fields.push(field('innate', null, { source, layer: 'innate', availability: 'unsupported' }));
  return card({ branch, sha, actorId, identity: { name: identity.name || actorId, role: identity.role || '原 worker', portrait: portrait(branch,actorId) },
    action: { id: training ? 'train' : p.job, current: training ? t.now : p.tea?.now || p.status,
      phase: p.phase?.name || p.mode, reason: field('action.reason', reason || null, { source }),
      next: p.next, target: training ? `${t.units}／${t.max} 單位` : p.jobLabel,
      progress: field('action.progress', progress, { source, unit: 'ratio' }),
      stopReason: field('action.stopReason', p.why || (training ? t?.why : null) || null, { source }) }, fields,
    martial: officialMartial(model, p, source),
    commands: model.actions(actorId).filter(a => !a.hidden).map(a => ({ id:a.id, label:a.label, enabled:a.enabled, reason:a.reason || null })) });
}
export function geminiCommand(model, actorId, action) {
  const option = model.actions(actorId).find(a => a.id === action && !a.hidden);
  if (!option || !option.enabled) return { ok:false, reason:option?.reason || '不支援或不可見指令' };
  return model.dispatch(action, actorId);
}
