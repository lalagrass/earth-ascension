import { field } from '../character-card/contract.mjs';
import { martialEntry } from './contract.mjs';
import { SKILLS, PALM } from '../experiments/water-carry/demo/palm.mjs';
export function officialMartial(model, person, source) {
  const p = person, t = p.train01, sk = SKILLS[p.palm];
  // A missing skill is not granted to make an animation available.
  if (!sk) return [];
  const src = `${source}.palm; palm.mjs:SKILLS/PALM; train01.mjs:view; model.mjs:actions/contact`;
  const f = (id, value, unit = '', availability = value == null ? 'unknown' : 'known') => field(id, value, { source: src, unit, availability });
  const active = ['windup', 'recover', 'patrolWind', 'patrolRec'].includes(p.mode) || p.mode === 'train';
  const options = model.actions(p.id).filter(a => ['clean', 'patrol', 'train'].includes(a.id));
  return [martialEntry({ id: 'basic-palm:first', name: '基礎掌法・第一式', source: src,
    learned: f('learned', '已學既有第一式（非全套掌法）'),
    proficiency: f('proficiency', `${sk.label}；起手 ${sk.windup}／收勢 ${sk.recover} tick${t ? `；練習 ${t.units}／${t.max} 單位` : ''}`),
    execution: f('execution', active ? `正在${p.mode === 'train' ? '練掌' : '施展'}：${({windup:'起手',recover:'出掌／收勢',patrolWind:'起手',patrolRec:'出掌／收勢',train:'練習中'})[p.mode]}（由核心推進）` : options.length ? options.map(a => `${a.label}：${a.enabled ? '核心可受理' : a.reason || '核心暫不可受理'}`).join('；') : null),
    moves: [{ id: 'basic-palm:first', name: '既有第一式', source: src }],
    conditions: {
      entry: { appliesTo: '已學／練習', policy: '原開局記錄與既有練掌目標', result: f('condition.entry', `人物 palm=${p.palm}；練掌沿師父基礎指點，不代表已學第二式`) },
      capacity: { appliesTo: '對敵起手／持續練掌', policy: '原核心精力檢查', result: f('condition.capacity', `對敵起手 ${PALM.cost} 精力；練掌每遊戲秒 1 精力。指令是否受理讀原核心；未建立內息／傷勢承載判定`) },
      control: { appliesTo: '既有第一式節奏', policy: '原 palm 熟練狀態', result: f('condition.control', `${sk.label}：起手 ${sk.windup}／收勢 ${sk.recover} tick；接觸距離 ≤${PALM.reach} 場景單位，核心重驗目標`) },
      special: { appliesTo: '完整功法／其他招式', policy: '本核心未提供通用特殊前提判定', result: f('condition.special', null, '', 'unsupported') },
    }, risk: f('risk', null),
  })];
}
