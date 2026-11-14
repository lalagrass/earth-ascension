// 武俠小鎮 W2：鎮民身分與古風口吻（#554，元素 id `w02-folk`）。
// 規則不變：這個元素沒有 tick。開啟時 (1) 建人物改用 data/wuxia/characters.json；(2) 對話與記憶摘要的 prompt
// 改用 data/wuxia/prompts/*.txt（繁中、古代小鎮、人物口吻）；(3) LLM 回覆過用詞守門（guard.ts）；
// (4) 模板句改用 data/wuxia/templates/*.json（依人物與 start/continue/leave）。關閉時全部用回上游／W0。
import charactersJson from '../../../data/wuxia/characters.json';
import linSao from '../../../data/wuxia/templates/lin-sao.json';
import shiHu from '../../../data/wuxia/templates/shi-hu.json';
import heLangzhong from '../../../data/wuxia/templates/he-langzhong.json';
import laoHan from '../../../data/wuxia/templates/lao-han.json';
import aQing from '../../../data/wuxia/templates/a-qing.json';
import zhouJiaotou from '../../../data/wuxia/templates/zhou-jiaotou.json';
import defaultTemplates from '../../../data/wuxia/templates/default.json';
import { Descriptions } from '../../../data/characters';
import type { WuxiaElement } from '../registry';
import { PROMPTS } from './prompts.gen';
import townsfolkJson from '../../../data/wuxia/townsfolk.json';
import { drawFolk } from '../a2_master/folk';

export const W02_FOLK = 'w02-folk';

export const folkElement: WuxiaElement = { id: W02_FOLK, requires: ['w01-skin'] };

export type FolkCharacter = {
  id: string;
  name: string;
  sprite: string;
  role: string;
  home: string;
  workplace: string;
  identity: string;
  plan: string;
  voice: string;
  taboo: string;
};

export const FOLK_CHARACTERS: FolkCharacter[] = (charactersJson as any).characters;
/** A2（#575）：候選池與大師（data/wuxia/townsfolk.json）；只有出現在世界裡的人才會被查到，所以 a2-master 關閉時不影響。 */
export const ALL_PROFILES: FolkCharacter[] = [
  ...FOLK_CHARACTERS,
  ...(townsfolkJson as any).pool,
  (townsfolkJson as any).master,
];
const A2_ID = 'a2-master';

export type Stage = 'start' | 'continue' | 'leave';
export type TemplateSet = Record<Stage, string[]>;

export const TEMPLATES: Record<string, TemplateSet> = {
  'lin-sao': linSao as any,
  'shi-hu': shiHu as any,
  'he-langzhong': heLangzhong as any,
  'lao-han': laoHan as any,
  'a-qing': aQing as any,
  'zhou-jiaotou': zhouJiaotou as any,
  default: defaultTemplates as any,
};

/** 跟上游 Descriptions 同形狀（createAgent 用 descriptionIndex 取）。 */
export type Description = { name: string; character: string; identity: string; plan: string };

/** w02-folk 開：6 位鎮民；關：上游 data/characters.ts。enabled 要用「有效」開關（requires 已檢查）。 */
export function descriptionsFor(
  folkOn: boolean,
  w?: { seed: number; enabled: Record<string, boolean> },
): Description[] {
  if (!folkOn) return Descriptions;
  const toDesc = (c: { name: string; sprite: string; identity: string; plan: string }) => ({
    name: c.name,
    character: c.sprite,
    identity: c.identity,
    plan: c.plan,
  });
  const out = FOLK_CHARACTERS.map(toDesc);
  // A2（#575 審查補充）：a2-master 開啟時（建世界時已凍結、requires 已檢查），原本 6 位之後加 seed 抽出的 6 位
  if (w?.enabled[A2_ID]) for (const c of drawFolk(w.seed)) out.push(toDesc(c));
  return out;
}

export function profileByName(name: string): FolkCharacter | undefined {
  return ALL_PROFILES.find((c) => c.name === name);
}

export function profileById(cid: string): FolkCharacter | undefined {
  return ALL_PROFILES.find((c) => c.id === cid);
}

export function templatesFor(name: string): TemplateSet {
  const p = profileByName(name);
  return (p && TEMPLATES[p.id]) || TEMPLATES.default;
}

export function fill(template: string, vars: Record<string, string | undefined>): string {
  return template.replace(/\{(\w+)\}/g, (_, key) => vars[key] ?? '');
}

/** r ∈ [0,1)：無頭模擬用 actionRng()，action 裡用 Math.random()（action 不在 step 內）。 */
export function folkTemplate(
  speaker: string,
  stage: Stage,
  r: number,
  vars: { other: string },
  /** 同一段對話裡這個人上一句說的話：抽到一樣的就換下一句（不多耗亂數） */
  avoid?: string,
): string {
  const list = templatesFor(speaker)[stage];
  const i = Math.min(list.length - 1, Math.floor(r * list.length));
  const text = fill(list[i], vars);
  return text === avoid ? fill(list[(i + 1) % list.length], vars) : text;
}

export function renderPrompt(key: string, vars: Record<string, string | undefined>): string {
  const t = PROMPTS[key];
  if (t === undefined) throw new Error(`No wuxia prompt ${key}`);
  return fill(t, vars);
}
