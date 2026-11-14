// 武俠小鎮 A3（#574）：前端讀 a3-silent 狀態的小工具，與可選的「翻成一句話」。
// 只讀世界、不改規則：翻譯結果放在瀏覽器的句庫（localStorage），不進世界狀態，所以開不開 LLM hash 都一樣（#574 驗收 A）。
import type { WuxiaState } from '../../convex/wuxia/state';
import { A3_SILENT, INTERACTION_BY_ID, traitsOf } from '../../convex/wuxia/a3_silent/data';
import type { A3State, SocialEntry } from '../../convex/wuxia/a3_silent/data';
import { GRAMMAR, renderSocial } from '../../convex/wuxia/a3_silent/grammar';
import { profileById } from '../../convex/wuxia/w02_folk';

export function a3StateOf(world: { wuxia?: WuxiaState } | undefined | null): A3State | undefined {
  const w = world?.wuxia;
  if (!w || !w.enabled[A3_SILENT]) return undefined;
  return w.elements[A3_SILENT] as A3State | undefined;
}

export const cidName = (cid: string) => profileById(cid)?.name ?? cid;

/** 畫面上正在進行的互動（t ≤ 現在 < t＋minutes；寒暄等短互動至少顯示 minShow 分鐘） */
export function activeEntries(st: A3State | undefined, gm: number, minShow = 6): SocialEntry[] {
  if (!st) return [];
  const out: SocialEntry[] = [];
  for (let i = st.log.length - 1; i >= 0; i--) {
    const e = st.log[i];
    if (gm - e.t > 90) break;
    if (e.t <= gm && gm < e.t + Math.max(e.minutes, minShow)) out.push(e);
  }
  return out.reverse();
}

/** 句庫鍵：說話的人＋互動＋話題＋成敗（#574 第 6 節） */
export const lineKey = (e: SocialEntry) => `${e.a}|${e.kind}|${e.topic}|${e.ok ? 1 : 0}`;

export type Llm = (prompt: string) => Promise<string>;
export type Translated = { text: string; source: 'llm' | 'library' | 'template'; note?: string };

const LIB_KEY = 'wuxia.a3.lines';
const memLib = new Map<string, string>();
function libGet(k: string): string | undefined {
  if (memLib.has(k)) return memLib.get(k);
  try {
    const all = JSON.parse(globalThis.localStorage?.getItem(LIB_KEY) ?? '{}');
    if (all[k]) memLib.set(k, all[k]);
    return all[k];
  } catch {
    return undefined;
  }
}
function libPut(k: string, v: string) {
  memLib.set(k, v);
  try {
    const all = JSON.parse(globalThis.localStorage?.getItem(LIB_KEY) ?? '{}');
    all[k] = v;
    globalThis.localStorage?.setItem(LIB_KEY, JSON.stringify(all));
  } catch {
    /* 沒有 localStorage（測試、無痕）就只放記憶體 */
  }
}

/** 給 LLM 的提示：一句台詞，不准改事實（成敗、話題、人物都已由規則決定）。 */
export function translatePrompt(e: SocialEntry, st?: A3State): string {
  const t = traitsOf(st, e.a);
  const def = INTERACTION_BY_ID[e.kind];
  return [
    '你是武俠小鎮的旁白。把下面這個「無言互動」翻成發起人說的一句話（20 字內，口語、古風，不用引號外的說明）。',
    `發起人：${cidName(e.a)}（外向 ${t.ext}、沉穩 ${t.calm}）`,
    `互動：${def?.label ?? e.kind}；話題：${GRAMMAR.topics[e.topic] ?? e.topic}；結果：${e.ok ? '成功' : '沒成'}`,
    '對方稱「你」，不要提對方名字；不要新增事件、招式或人物。',
  ].join('\n');
}

/**
 * 玩家點泡泡 →「翻成一句話」。句庫有就直接用；有 llm 就呼叫一次並存進句庫；都沒有就用文法模板（並註明）。
 * 不碰世界狀態。
 */
export async function translateEntry(e: SocialEntry, st: A3State | undefined, llm?: Llm): Promise<Translated> {
  const k = lineKey(e);
  const hit = libGet(k);
  if (hit) return { text: hit, source: 'library' };
  if (llm) {
    try {
      const text = (await llm(translatePrompt(e, st))).trim().split('\n')[0].slice(0, 40);
      if (text) {
        libPut(k, text);
        return { text, source: 'llm' };
      }
    } catch {
      /* LLM 失敗 → 模板，不重試 */
    }
  }
  const [line] = renderSocial([e], cidName, (c) => traitsOf(st, c));
  return { text: line?.text ?? '', source: 'template', note: llm ? 'LLM 失敗，改用模板' : '未設定 LLM，用文法模板' };
}

/** 可選的 LLM：設定 VITE_WUXIA_LLM_URL（OpenAI 相容 /chat/completions，例如本機 Ollama）才有。不帶金鑰（前端不放金鑰），要金鑰請自架代理。 */
export function llmFromEnv(): Llm | undefined {
  const env = (import.meta as any).env ?? {};
  const url = env.VITE_WUXIA_LLM_URL as string | undefined;
  if (!url) return undefined;
  const model = (env.VITE_WUXIA_LLM_MODEL as string | undefined) ?? 'gpt-4o-mini';
  return async (prompt: string) => {
    const r = await fetch(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ model, messages: [{ role: 'user', content: prompt }], max_tokens: 60 }),
    });
    const j = await r.json();
    return String(j.choices?.[0]?.message?.content ?? '');
  };
}
