// 武俠小鎮 A3（#574 第 5 節）：「鎮上動靜」句型渲染（純函式、確定性）。
// 句型 data/wuxia/grammar/social.json：每種互動 × 成敗至少 4 句；{how}／{react} 依人格挑詞。
// 依紀錄 id 輪換句型；同一互動同一成敗的句型不連續出現超過 2 次（#574 驗收 A）。
import grammarJson from '../../../data/wuxia/grammar/social.json';
import type { SocialEntry, Traits } from './data';

type Grammar = {
  topics: Record<string, string>;
  how: Record<string, string[]>;
  react: Record<string, string[]>;
  forms: Record<string, { ok: string[]; fail: string[] }>;
  a2: Record<string, string[]>;
};
export const GRAMMAR = grammarJson as unknown as Grammar;

/** 人格 → 用詞類別：最突出的一軸（外向／沉穩／內向／謹慎），都不明顯就 plain。 */
export function voiceOf(t: Traits): 'ext' | 'calm' | 'shy' | 'caut' | 'plain' {
  const c: Array<[string, number]> = [
    ['ext', t.ext],
    ['shy', -t.ext],
    ['calm', t.calm],
    ['caut', t.caut],
  ];
  c.sort((x, y) => y[1] - x[1]);
  return c[0][1] >= 0.3 ? (c[0][0] as any) : 'plain';
}

export type Rendered = { id: number; t: number; text: string; form: string };

/**
 * 依序渲染紀錄。form＝"互動.ok.句型編號"；同一 form 已連續 2 次時換下一句。
 * prev：上一批的最後兩個 form（分頁時接續用）。
 */
export function renderSocial(
  entries: SocialEntry[],
  name: (cid: string) => string,
  traits: (cid: string) => Traits,
  prev: string[] = [],
): Rendered[] {
  const out: Rendered[] = [];
  const recent = prev.slice(-2);
  for (const e of entries) {
    const forms = GRAMMAR.forms[e.kind]?.[e.ok ? 'ok' : 'fail'];
    if (!forms?.length) continue;
    let i = (e.id * 7 + e.t) % forms.length;
    let form = `${e.kind}.${e.ok ? 'ok' : 'fail'}.${i}`;
    if (recent.length === 2 && recent[0] === form && recent[1] === form) {
      i = (i + 1) % forms.length;
      form = `${e.kind}.${e.ok ? 'ok' : 'fail'}.${i}`;
    }
    recent.push(form);
    if (recent.length > 2) recent.shift();
    const how = pickWord(GRAMMAR.how, voiceOf(traits(e.a)), e.id);
    const react = pickWord(GRAMMAR.react, voiceOf(traits(e.b)), e.id + 1);
    const others = e.with?.length ? `${e.with.map(name).join('、')}也在旁邊` : '';
    const text =
      forms[i]
        .replaceAll('{a}', name(e.a))
        .replaceAll('{b}', name(e.b))
        .replaceAll('{topic}', GRAMMAR.topics[e.topic] ?? e.topic)
        .replaceAll('{how}', how)
        .replaceAll('{react}', react) + (others ? `（${others}）` : '');
    out.push({ id: e.id, t: e.t, text, form });
  }
  return out;
}

function pickWord(table: Record<string, string[]>, voice: string, n: number): string {
  const list = table[voice] ?? table.plain;
  return list[n % list.length];
}

/** A2 事件提示改走句型（#574 留言第 1 項）：kind＝arrive／switch／rival／watch／teach／again；n＝輪換用序號。 */
export function a2HintText(kind: string, vars: Record<string, string>, n: number): string | undefined {
  const forms = GRAMMAR.a2[kind];
  if (!forms?.length) return undefined;
  let s = forms[n % forms.length];
  for (const [k, v] of Object.entries(vars)) s = s.replaceAll(`{${k}}`, v);
  return s;
}
