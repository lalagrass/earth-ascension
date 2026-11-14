// 武俠小鎮 W2（#554 範圍 2）：w02-folk 開啟時的對話 prompt 組裝。模板文字在 data/wuxia/prompts/*.txt。
// 純函式（不碰資料庫、不打 LLM），convex/agent/conversation.ts 與 memory.ts 呼叫，jest 可直接測。
import { profileByName, renderPrompt, Stage } from './index';

type Who = { name: string };
type AgentDesc = { identity: string; plan: string } | null;

export function folkSystemPrompt(opts: {
  stage: Stage;
  player: Who;
  otherPlayer: Who;
  agent: AgentDesc;
  otherAgent: AgentDesc;
  hasMemories: boolean;
  memoryWithOtherPlayer: boolean;
  /** W5（#557）：「想學武（強度 70）、想變強（強度 50）」；w05-mind 關閉或沒有心念時不給 */
  thoughts?: string;
  /** W8：最近聽說的傳聞（w08-jianghu） */
  rumors?: string;
}): string {
  const { player, otherPlayer, agent, otherAgent } = opts;
  const me = profileByName(player.name);
  const parts = [
    renderPrompt('persona', {
      name: player.name,
      role: me?.role ?? '鎮上的人',
      identity: agent?.identity ?? me?.identity ?? '',
      plan: agent?.plan ?? me?.plan ?? '',
      voice: me?.voice ?? '平常人家的說話口氣。',
      taboo: me?.taboo ?? '沒有特別不談的事。',
    }),
  ];
  if (otherAgent) {
    parts.push(
      renderPrompt('other', { other: otherPlayer.name, otherIdentity: otherAgent.identity }),
    );
  }
  // W5：心念只影響「說什麼」（#557「跟 LLM 的接法」）
  if (opts.thoughts) parts.push(renderPrompt('thoughts', { thoughts: opts.thoughts }));
  if (opts.rumors) parts.push(renderPrompt('rumors', { rumors: opts.rumors }));
  parts.push(renderPrompt('rules', { name: player.name }));
  parts.push(renderPrompt(opts.stage, { other: otherPlayer.name }));
  if (opts.stage === 'start' && opts.memoryWithOtherPlayer)
    parts.push(renderPrompt('start-memory', {}));
  if (opts.hasMemories) parts.push(renderPrompt('memories', {}));
  return parts.join('\n');
}

export function folkLine(author: string, recipient: string, text: string): string {
  return renderPrompt('line', { author, recipient, text });
}

export function folkCue(name: string, other: string): string {
  return renderPrompt('cue', { name, other });
}

/** OpenAI 最多 4 個 stop：對方接話的兩種寫法＋上游英文格式。 */
export function folkStopWords(name: string, other: string): string[] {
  return [`${other}對${name}說：`, `${other}對${name}說:`, `${other} to ${name}:`, `\n${other}：`];
}

const REASON_ZH: Record<string, string> = {
  empty: '沒有說話',
  english: '夾了英文字母',
  repeat: '跟你自己前面說過的話一模一樣',
};

export function reasonsZh(reasons: string[]): string {
  return reasons
    .map((r) =>
      r.startsWith('word:')
        ? `用了不該出現的詞「${r.slice(5)}」`
        : r.startsWith('sentence>')
          ? '句子太長'
          : r.startsWith('reply>')
            ? '說得太多'
            : (REASON_ZH[r] ?? r),
    )
    .join('、');
}

export function folkRetryPrompt(reasons: string[]): string {
  return renderPrompt('retry', { reasons: reasonsZh(reasons) });
}

export function folkMemorySummaryPrompt(name: string, other: string): string {
  return renderPrompt('memory-summary', { name, other });
}
