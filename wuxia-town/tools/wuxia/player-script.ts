// 武俠小鎮 W9（#561）：用腳本模擬玩家 input，無頭跑完，報告每個操作的結果。
// 用法：npm run wuxia:player-script -- --script docs/wuxia/fixtures/w09-script.json --seed 7 --out /tmp/p.json
//        [--journal /tmp/p.jsonl]（匯出 journal，可用 wuxia:replay 重播）[--off w09-player]（玩家照上游真人加入，對照用）
//        [--days N]（覆寫腳本的天數）
// 腳本的每個操作都變成引擎 input（join／wuxiaPlayerAct／moveTo／startConversation／finishSendingMessage／
// leaveConversation／wuxiaPlayerPause），跟 AI 的回應 input 一起記進 journal，所以同 script 同 seed 兩次 hash 相同、
// 匯出的 journal 重播 hash 相符。腳本只決定「什麼時候按什麼」，做不做得成由引擎規則決定（結果從 input 回傳值與 w09-player 紀錄讀）。
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { runHeadless, journalLines, HeadlessOptions } from './headless';
import { parseArgs, quietConsole } from './sim';
import { defaultWuxiaConfig } from '../../convex/wuxia/state';
import { gameMinutes, readClock } from '../../convex/wuxia/clock';
import { PLACES, OBJECT_BY_ID, placeName } from '../../convex/wuxia/w03_life/data';
import { PLAYER_ROLES, PlayerState, W09_PLAYER } from '../../convex/wuxia/w09_player/data';
import type { LifeState } from '../../convex/wuxia/w03_life';
import type { DojoState } from '../../convex/wuxia/w04_dojo';
import type { MindState } from '../../convex/wuxia/w05_mind/data';
import { describeMemory } from '../../convex/wuxia/w05_mind/data';
import type { BondState } from '../../convex/wuxia/w07_bond/data';
import { FOLK_CHARACTERS } from '../../convex/wuxia/w02_folk';

export type ScriptStep = {
  day: number;
  at: string;
  op: 'join' | 'activity' | 'goto' | 'talk' | 'ask' | 'spar' | 'apprentice' | 'pause';
  obj?: string;
  act?: string;
  place?: string;
  target?: string;
  lines?: number;
  steps?: number;
  retry?: number;
};

export type Script = {
  role: string;
  name: string;
  token: string;
  days: number;
  retryEvery: number;
  steps: ScriptStep[];
};

export type StepOutcome = {
  i: number;
  op: string;
  what: string;
  planned: string;
  attempts: Array<{ at: string; ok: boolean; reason: string }>;
  ok: boolean;
  /** 活動：開始做／做完的時刻；聊天：雙方各說幾句；暫停：前後的遊戲分鐘 */
  detail: Record<string, unknown>;
};

const HUMAN_LINES = ['在下初到貴寶地，還請多多指教。', '這鎮上可有什麼好玩的地方？', '多謝，改日再來叨擾。'];

function minuteOf(at: string): number {
  const [h, m] = at.split(':').map(Number);
  return h * 60 + m;
}

const cidName = (cid: string) => FOLK_CHARACTERS.find((c) => c.id === cid)?.name ?? cid;

export function runPlayerScript(
  script: Script,
  seed: number,
  opts: { playerOff?: boolean; days?: number; untilGameMinute?: number } = {},
) {
  const days = opts.days ?? script.days;
  const outcomes: StepOutcome[] = script.steps.map((s, i) => ({
    i,
    op: s.op,
    what: [s.obj && `${s.obj}/${s.act}`, s.place, s.target && cidName(s.target)].filter(Boolean).join(' ') || '-',
    planned: `第 ${s.day} 日 ${s.at}`,
    attempts: [],
    ok: false,
    detail: {},
  }));
  // 執行狀態
  let cursor = 0;
  let nextTry: number | undefined; // 遊戲分鐘
  let deadline: number | undefined;
  type Watch =
    | { kind: 'activity'; i: number; act: string; started?: number; finished?: number }
    | { kind: 'talk'; i: number; target: string; conv?: string; sent: number; got: number; lastAiAt?: number; left?: boolean; until: number }
    | { kind: 'pause'; i: number; resumeAtStep: number; gmBefore: number }
    | { kind: 'ask'; i: number };
  const watches: Watch[] = [];
  const pendingWatch = new Map<number, Watch>();
  // 送出的 input（args 物件本身）→ outcome index；不把標記寫進 args（journal 跟 live 的 input 同形狀）
  const pendingResult = new WeakMap<object, number>();
  let stepNo = 0;
  let inputSeq = 0;
  const label = (gm: number) => {
    const c = readClock(gm);
    return `第 ${c.day} 日 ${String(Math.floor(c.minuteOfDay / 60)).padStart(2, '0')}:${String(c.minuteOfDay % 60).padStart(2, '0')}`;
  };

  const inject: HeadlessOptions['inject'] = (game, now) => {
    stepNo++;
    const out: Array<{ name: string; args: any }> = [];
    const w = game.world.wuxia!;
    if (w.clockEpoch === undefined) return out;
    // 暫停中：引擎時間照走、遊戲時鐘停在暫停那一刻（繼續時引擎才把時鐘起點往後平移）
    const pausedSince = (w.elements[W09_PLAYER] as PlayerState | undefined)?.paused?.since;
    const gm = gameMinutes(pausedSince ?? now, w.clockEpoch, w.timeScale);
    const c = readClock(gm);
    const me = [...game.world.players.values()].find((p) => p.human === script.token);
    const life = w.elements['w03-life'] as LifeState | undefined;
    const send = (i: number, name: string, args: any) => {
      inputSeq++;
      out.push({ name, args });
      pendingResult.set(args, i);
    };
    const pidOf = (cid: string) =>
      life ? Object.entries(life.people).find(([, p]) => p.cid === cid)?.[0] : undefined;

    // 進行中的觀察：活動做了沒、聊天輪到誰、暫停多久
    for (const wch of [...watches]) {
      const o = outcomes[wch.i];
      if (pausedSince !== undefined && wch.kind !== 'pause') continue;
      if (wch.kind === 'activity') {
        const person = me && life?.people[me.id];
        if (person?.cur?.act === wch.act && person.cur.phase === 'do' && wch.started === undefined) {
          wch.started = gm;
          o.detail.started = label(gm);
        }
        if (wch.started !== undefined && (!person?.cur || person.cur.act !== wch.act || person.cur.phase !== 'do')) {
          wch.finished = gm;
          o.detail.finished = label(gm);
          o.detail.minutes = gm - wch.started;
          watches.splice(watches.indexOf(wch), 1);
        }
      } else if (wch.kind === 'talk' && me) {
        const conv = [...game.world.conversations.values()].find((cv) => cv.participants.has(me.id));
        if (!conv) {
          if (wch.conv) {
            o.detail.ended = label(gm);
            o.detail.playerLines = wch.sent;
            o.detail.aiLines = wch.got;
            watches.splice(watches.indexOf(wch), 1);
          } else if (gm > wch.until) {
            o.detail.ended = '對方沒來';
            watches.splice(watches.indexOf(wch), 1);
          }
          continue;
        }
        wch.conv = conv.id as string;
        const member = conv.participants.get(me.id)!;
        if (member.status.kind !== 'participating') continue;
        if (!o.detail.participating) o.detail.participating = label(gm);
        const last = conv.lastMessage;
        if (last && last.author !== me.id && wch.lastAiAt !== last.timestamp) {
          wch.lastAiAt = last.timestamp;
          wch.got++;
        }
        if (wch.left) continue;
        const myTurn = !last || last.author !== me.id;
        if (myTurn && !conv.isTyping && now - (last?.timestamp ?? 0) > 3000) {
          if (wch.sent < (script.steps[wch.i].lines ?? 2) && (wch.sent === 0 || last)) {
            send(wch.i, 'finishSendingMessage', { playerId: me.id, conversationId: conv.id, timestamp: now });
            wch.sent++;
          } else if (wch.sent >= (script.steps[wch.i].lines ?? 2)) {
            send(wch.i, 'leaveConversation', { playerId: me.id, conversationId: conv.id });
            wch.left = true;
          }
        }
      } else if (wch.kind === 'pause' && me && stepNo >= wch.resumeAtStep) {
        send(wch.i, 'wuxiaPlayerPause', { human: script.token, paused: false });
        o.detail.pausedSteps = stepNo - (wch.resumeAtStep - (script.steps[wch.i].steps ?? 600));
        watches.splice(watches.indexOf(wch), 1);
      }
    }

    // 下一個腳本操作（暫停中不按別的）
    if (pausedSince !== undefined) return out;
    if (cursor >= script.steps.length) return out;
    const s = script.steps[cursor];
    const due = c.day > s.day || (c.day === s.day && c.minuteOfDay >= minuteOf(s.at));
    if (!due) return out;
    if (nextTry !== undefined && gm < nextTry) return out;
    if (deadline === undefined) deadline = gm + (s.retry ?? 0);
    const o = outcomes[cursor];
    const i = cursor;
    const target = s.target ? pidOf(s.target) : undefined;
    // 等上一次嘗試的回傳結果（attempt 在 onInputResult 補上）
    if (o.attempts.length > 0 && o.attempts[o.attempts.length - 1].reason === '…') return out;
    if (o.ok || (o.attempts.length > 0 && gm > deadline)) {
      cursor++;
      nextTry = undefined;
      deadline = undefined;
      return out;
    }
    o.attempts.push({ at: label(gm), ok: false, reason: '…' });
    nextTry = gm + script.retryEvery;
    if (s.op === 'join') {
      const role = PLAYER_ROLES.find((r) => r.id === script.role)!;
      send(i, 'join', {
        name: script.name,
        character: role.sprite,
        description: role.identity,
        tokenIdentifier: script.token,
        ...(opts.playerOff ? {} : { wuxiaRole: role.id }),
      });
    } else if (!me) {
      o.attempts[o.attempts.length - 1] = { at: label(gm), ok: false, reason: '玩家不在世界上' };
    } else if (s.op === 'goto') {
      const place = PLACES.find((p) => p.id === s.place);
      send(i, 'moveTo', { playerId: me.id, destination: place ? { x: place.entry[0], y: place.entry[1] } : null });
    } else if (s.op === 'talk') {
      if (!target) o.attempts[o.attempts.length - 1] = { at: label(gm), ok: false, reason: `找不到 ${s.target}` };
      else {
        send(i, 'startConversation', { playerId: me.id, invitee: target });
        pendingWatch.set(i, { kind: 'talk', i, target, sent: 0, got: 0, until: gm + 120 });
      }
    } else if (s.op === 'pause') {
      send(i, 'wuxiaPlayerPause', { human: script.token, paused: true });
      pendingWatch.set(i, { kind: 'pause', i, resumeAtStep: stepNo + (s.steps ?? 600), gmBefore: gm });
    } else {
      const kind = s.op === 'activity' ? 'activity' : s.op;
      send(i, 'wuxiaPlayerAct', { human: script.token, kind, obj: s.obj, act: s.act, target: s.target });
      // 被拒絕的嘗試不看（不然之後碰巧做到同一個活動會被算進來）；回傳 ok 才開始觀察
      if (s.op === 'activity') pendingWatch.set(i, { kind: 'activity', i, act: s.act! });
    }
    return out;
  };

  let lastGm = 0;
  const onInputResult: HeadlessOptions['onInputResult'] = (input, rv) => {
    if (!input.args || typeof input.args !== 'object') return;
    const i = pendingResult.get(input.args);
    if (i === undefined) return;
    pendingResult.delete(input.args);
    const o = outcomes[i];
    const last = o.attempts[o.attempts.length - 1];
    if (!last || last.reason !== '…') return;
    if (rv.kind === 'error') {
      last.reason = `錯誤：${rv.message}`;
      return;
    }
    const v = rv.value;
    if (v && typeof v === 'object' && 'ok' in v) {
      last.ok = !!v.ok;
      last.reason = v.reason;
    } else {
      last.ok = true;
      last.reason = input.name === 'startConversation' ? `邀請送出（${v}）` : input.name === 'join' ? '加入' : 'ok';
    }
    if (last.ok) o.ok = true;
    const pw = pendingWatch.get(i);
    pendingWatch.delete(i);
    if (pw && last.ok) watches.push(pw);
    void lastGm;
  };

  const run = runHeadless({
    seed,
    minutes: 0,
    // W9 截圖（wuxia:shot --script）停在指定遊戲分鐘
    untilGameMinute: opts.untilGameMinute ?? days * 1440,
    trace: true,
    elements: opts.playerOff ? { [W09_PLAYER]: false } : {},
    inject,
    onInputResult,
  });
  const game = run.game;
  const w = game.world.wuxia!;
  const st = w.elements[W09_PLAYER] as PlayerState | undefined;
  const me = [...game.world.players.values()].find((p) => p.human === script.token);
  const life = w.elements['w03-life'] as LifeState | undefined;
  const rec = st?.players.find((p) => p.pid === me?.id);
  const cid = rec?.cid;
  const dojo = w.elements['w04-dojo'] as DojoState | undefined;
  const mind = w.elements['w05-mind'] as MindState | undefined;
  const bond = w.elements['w07-bond'] as BondState | undefined;
  const nameOf = (c: string) => (c === cid ? script.name : cidName(c));
  const lifeLog = (life?.log ?? []).filter((e) => e.who === cid);
  const player = cid
    ? {
        cid,
        pid: me?.id,
        mode: rec?.mode,
        needs: me && life?.people[me.id]?.needs,
        skills: dojo?.skills[cid],
        master: bond?.disciples[cid],
        memories: (mind?.people[me!.id as string]?.memories ?? []).map((m) => `#${m.id} ${describeMemory(m, nameOf, placeName)}`),
        thoughts: mind?.people[me!.id as string]?.thoughts.map((t) => `${t.id}(${t.s})`),
        bonds: bond?.bonds[cid],
        bondsToPlayer: Object.fromEntries(
          Object.entries(bond?.bonds ?? {})
            .filter(([, m]) => m[cid])
            .map(([a, m]) => [a, m[cid]]),
        ),
        log: st?.log,
        lifeLogTail: lifeLog.slice(-40),
      }
    : undefined;
  // 暫停驗證：w09-player 紀錄裡的「暫停」與「繼續」遊戲分鐘相同＝暫停期間遊戲時鐘沒走
  for (const o of outcomes) {
    if (o.op !== 'pause' || !o.ok) continue;
    const p = (st?.log ?? []).find((l) => l.who === cid && l.op === 'pause' && l.ok);
    const r = (st?.log ?? []).find((l) => l.who === cid && l.op === 'resume');
    o.detail.pausedAt = p ? label(p.t) : undefined;
    o.detail.resumedAt = r ? label(r.t) : undefined;
    o.detail.resumeNote = r?.reason;
    o.detail.clockFrozen = !!p && !!r && p.t === r.t;
  }
  const autoSpans = (st?.log ?? []).filter((l) => l.who === cid && (l.op === 'auto' || l.op === 'takeover'));
  const report = {
    tool: 'wuxia-town player-script',
    version: 1,
    seed,
    days,
    playerOff: !!opts.playerOff,
    finalHash: run.finalHash,
    clock: run.summary.clock?.label,
    outcomes,
    autoSpans: autoSpans.map((l) => `${label(l.t)} ${l.op}：${l.reason}`),
    player,
    enabledElements: run.summary.enabledElements,
  };
  return { run, report };
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  quietConsole(!!args.verbose);
  const script = JSON.parse(readFileSync(String(args.script ?? 'docs/wuxia/fixtures/w09-script.json'), 'utf8')) as Script;
  const seed = Number(args.seed ?? defaultWuxiaConfig.seed);
  const playerOff = String(args.off ?? '').split(',').includes(W09_PLAYER);
  const { run, report } = runPlayerScript(script, seed, {
    playerOff,
    days: args.days === undefined ? undefined : Number(args.days),
  });
  if (args.out) {
    mkdirSync(dirname(String(args.out)), { recursive: true });
    writeFileSync(String(args.out), JSON.stringify(report, null, 2) + '\n');
  }
  if (args.journal) {
    mkdirSync(dirname(String(args.journal)), { recursive: true });
    const lines = journalLines(run.snapshot, run.queue, run.steps, run.finalHash, {
      source: 'player-script',
      seed,
      days: report.days,
    }, run.messages);
    writeFileSync(String(args.journal), lines.join('\n') + '\n');
  }
  for (const o of report.outcomes) {
    const last = o.attempts[o.attempts.length - 1];
    const tries = o.attempts.length > 1 ? `（試 ${o.attempts.length} 次）` : '';
    const extra = Object.keys(o.detail).length ? ` ${JSON.stringify(o.detail)}` : '';
    process.stdout.write(
      `${o.ok ? 'OK  ' : 'NO  '} ${o.planned} ${o.op} ${o.what} → ${last ? `${last.at} ${last.reason}` : '沒有執行'}${tries}${extra}\n`,
    );
  }
  if (report.player) {
    const p = report.player;
    process.stdout.write(
      `玩家 ${p.cid}（${p.mode}）技能 ${JSON.stringify(p.skills)}；師父 ${p.master ? cidName(p.master.master) : '無'}；記憶 ${p.memories.length} 筆；代管／接手 ${report.autoSpans.length} 次\n`,
    );
  }
  process.stdout.write(`clock ${report.clock}\nhash ${report.finalHash}\n`);
}

if (process.argv[1]?.endsWith('player-script.ts')) {
  main();
}
