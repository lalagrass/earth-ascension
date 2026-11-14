// 武俠小鎮 W6（#558）：切磋旁白。模板句（data/wuxia/templates/spar.json）與 LLM prompt、守門。
// 純函式：引擎（模板句）、action（prompt＋守門）、工具與 jest 共用。LLM 只決定「說什麼」，不改勝負。
import sparTemplates from '../../../data/wuxia/templates/spar.json';
import { fill, renderPrompt } from '../w02_folk';
import { checkReply, countChars, GuardResult } from '../w02_folk/guard';
import { SPAR } from './duel';

const TEMPLATES = sparTemplates as unknown as { win: string[]; draw: string[] };

const DIGITS = ['零', '一', '二', '三', '四', '五', '六', '七', '八', '九'];
/** 1–99 的中文數字（旁白不用阿拉伯數字）。 */
export function zhNumber(n: number): string {
  if (n < 10) return DIGITS[n];
  if (n < 20) return `十${n % 10 ? DIGITS[n % 10] : ''}`;
  return `${DIGITS[Math.floor(n / 10)]}十${n % 10 ? DIGITS[n % 10] : ''}`;
}

export type NarrationFacts = {
  winner?: string;
  loser?: string;
  a: string;
  b: string;
  rounds: number;
  move: string;
};

/** 模板句：依場次 id 輪替（不耗亂數）。names 把人物 id 換成名字。 */
export function sparNarrationTemplate(
  matchId: number,
  facts: NarrationFacts,
  names: (cid: string) => string = (c) => c,
): string {
  const list = facts.winner ? TEMPLATES.win : TEMPLATES.draw;
  const t = list[(matchId - 1 + list.length) % list.length];
  return fill(t, {
    winner: facts.winner ? names(facts.winner) : undefined,
    loser: facts.loser ? names(facts.loser) : undefined,
    a: names(facts.a),
    b: names(facts.b),
    rounds: zhNumber(facts.rounds),
    move: facts.move,
  });
}

export const PLACE_NAMES: Record<string, string> = { dojo: '武館院子', plaza: '小廣場' };

/** LLM prompt（名字已經是人名）。 */
export function sparNarrationPrompt(args: {
  place: string;
  a: string;
  b: string;
  winner?: string;
  loser?: string;
  rounds: number;
  move: string;
  spectators: string[];
}): string {
  return renderPrompt('spar-narration', {
    place: PLACE_NAMES[args.place] ?? args.place,
    a: args.a,
    b: args.b,
    result: args.winner ? `${args.winner}贏，${args.loser}認輸` : '二十招內不分勝負，平手',
    rounds: zhNumber(args.rounds),
    move: args.move,
    spectators: args.spectators.length ? `在旁邊看的人：${args.spectators.join('、')}。` : '旁邊沒有人看。',
  });
}

/** W2 守門＋旁白限 30 字（不算標點）。 */
export function checkNarration(text: string): GuardResult {
  const r = checkReply(text);
  const reasons = [...r.reasons];
  if (countChars(text) > SPAR.narrationMaxChars) reasons.push(`narration>${SPAR.narrationMaxChars}`);
  return { ok: reasons.length === 0, reasons };
}
