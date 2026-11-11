// 武俠小鎮 W2（#554）：用詞守門。純函式，不打 LLM、不碰資料庫，jest 與 action 共用。
// 規則（#554 範圍 3）：LLM 回覆含禁用詞（data/wuxia/anachronisms.txt，含簡體常見字）或英文字母 → 重抽一次；
// 仍不合格 → 用模板句。另外照 prompt 的「每句 40 字以內」檢查長度（見 MAX_SENTENCE_CHARS）。
import { ANACHRONISMS } from './prompts.gen';

export type GuardOutcome = 'pass' | 'retry' | 'template';

/** 每句最多幾個字（不算標點與空白），#554 範圍 2「每句 40 字以內」。 */
export const MAX_SENTENCE_CHARS = 40;
/** 整則回覆最多幾個字（不算標點與空白）：prompt 要求「一兩句」，留到三句的餘裕。 */
export const MAX_REPLY_CHARS = 120;

const LATIN = /[A-Za-z\uFF21-\uFF3A\uFF41-\uFF5A]/;
const PUNCT = /[\s\p{P}\p{S}]/gu;
const SENTENCE_END = /[。！？!?；;…\n]+/;

export type GuardResult = { ok: boolean; reasons: string[] };

export function countChars(text: string): number {
  return [...text.replace(PUNCT, '')].length;
}

export function sentences(text: string): string[] {
  return text
    .split(SENTENCE_END)
    .map((s) => s.trim())
    .filter((s) => countChars(s) > 0);
}

/**
 * 只做清理，不放寬判定：去掉頭尾空白、模型自己加上的「某某對某某說：」「某某：」前綴、
 * 包住整句的引號，以及模型順手替對方接下去的部分（第二個「某某對某某說：」之後）。
 */
export function normalizeReply(text: string, speaker?: string): string {
  let t = text.trim();
  const prefix = /^[^\s：:，,。「」]{1,8}對[^\s：:，,。「」]{1,8}說[：:]\s*/;
  t = t.replace(prefix, '');
  if (speaker && (t.startsWith(`${speaker}：`) || t.startsWith(`${speaker}:`))) {
    t = t.slice(speaker.length + 1).trim();
  }
  const next = t.search(/[^\s：:，,。「」]{1,8}對[^\s：:，,。「」]{1,8}說[：:]/);
  if (next > 0) t = t.slice(0, next).trim();
  const pairs: Array<[string, string]> = [
    ['「', '」'],
    ['『', '』'],
    ['"', '"'],
    ['“', '”'],
  ];
  for (const [open, close] of pairs) {
    if (t.startsWith(open) && t.endsWith(close) && t.length >= 2) {
      t = t.slice(open.length, t.length - close.length).trim();
    }
  }
  return t.replace(/[ \t]*\n+[ \t]*/g, '\n').trim();
}

export function checkReply(
  text: string,
  words: string[] = ANACHRONISMS,
  /** 這個人在同一段對話裡已經說過的話：一字不差重複就不合格 */
  avoid: string[] = [],
): GuardResult {
  const reasons: string[] = [];
  if (countChars(text) === 0) reasons.push('empty');
  if (LATIN.test(text)) reasons.push('english');
  for (const w of words) {
    if (text.includes(w)) reasons.push(`word:${w}`);
  }
  for (const s of sentences(text)) {
    if (countChars(s) > MAX_SENTENCE_CHARS) {
      reasons.push(`sentence>${MAX_SENTENCE_CHARS}`);
      break;
    }
  }
  if (countChars(text) > MAX_REPLY_CHARS) reasons.push(`reply>${MAX_REPLY_CHARS}`);
  if (avoid.some((a) => a.trim() === text.trim())) reasons.push('repeat');
  return { ok: reasons.length === 0, reasons };
}

export type GuardMetadata = {
  guard: GuardOutcome;
  /** 每次嘗試沒過的理由（pass 時為空） */
  reasons: string[][];
  attempts: number;
  /** template 的成因：llm-fallback＝LLM 失敗或超過預算；rejected＝兩次都沒過守門；no-retry＝第一次太慢，沒時間重抽 */
  cause?: 'llm-fallback' | 'rejected' | 'no-retry';
};

export type Attempt = { content: string; fallback: boolean };

/**
 * 守門流程：第一次 → 沒過就重抽一次 → 仍沒過用模板句。
 * generate(retryReasons) 由呼叫端提供（action 裡打 LLM）；fallback 為 true 表示 LLM 根本沒回（失敗或超過預算），
 * 這時不重抽，直接用模板句（規則不等 LLM）。retryAllowed() 回 false 時也不重抽（例如第一次已經太慢）。
 */
export async function guardedReply(opts: {
  generate: (retryReasons?: string[]) => Promise<Attempt>;
  template: () => string;
  speaker?: string;
  retryAllowed?: () => boolean;
  words?: string[];
  avoid?: string[];
}): Promise<{ text: string; metadata: GuardMetadata }> {
  const reasons: string[][] = [];
  const first = await opts.generate();
  if (first.fallback) {
    return {
      text: opts.template(),
      metadata: { guard: 'template', reasons, attempts: 1, cause: 'llm-fallback' },
    };
  }
  const t1 = normalizeReply(first.content, opts.speaker);
  const r1 = checkReply(t1, opts.words, opts.avoid);
  if (r1.ok) return { text: t1, metadata: { guard: 'pass', reasons, attempts: 1 } };
  reasons.push(r1.reasons);
  if (opts.retryAllowed && !opts.retryAllowed()) {
    return {
      text: opts.template(),
      metadata: { guard: 'template', reasons, attempts: 1, cause: 'no-retry' },
    };
  }
  const second = await opts.generate(r1.reasons);
  if (second.fallback) {
    return {
      text: opts.template(),
      metadata: { guard: 'template', reasons, attempts: 2, cause: 'llm-fallback' },
    };
  }
  const t2 = normalizeReply(second.content, opts.speaker);
  const r2 = checkReply(t2, opts.words, opts.avoid);
  if (r2.ok) return { text: t2, metadata: { guard: 'retry', reasons, attempts: 2 } };
  reasons.push(r2.reasons);
  return {
    text: opts.template(),
    metadata: { guard: 'template', reasons, attempts: 2, cause: 'rejected' },
  };
}
