/*
 * SG-RT-02V：唯讀生活 viewer 的播放控制器。
 *
 * 只透過 Realtime.createWorld／advanceTicks 這兩個公開 API 推進正式世界，不碰 DOM、不讀 RNG、不改世界。
 * 牆鐘時間只決定「這一幀要餵幾個 tick」：1× 每秒 4 tick，2×／4× 只是乘上倍率（D9）。
 * 暫停、背景與 render 都不推進世界；背景會自動暫停並清掉待補的時間，回前景仍暫停，恢復時不追趕離線時長。
 * breakthroughResolved 只結束一次 API 批次，控制器在同一幀把剩下的 tick 繼續餵完。
 * 批次中途出錯時保留已提交的成功前綴，停在最後合法的 tick，不再推進。
 * SG-RT-03a：保存時機只在幀末通知（onSavePoint），不切批次、不插在 advanceTicks 中間：
 * 這一段推進跨過日界（floor(t0/180) < floor(t1/180)，落點不必剛好是 180）、途中有突破停批、或播放中被暫停／轉背景。
 * 控制器本身不寫存檔；load(world) 換成已驗證的世界並保持暫停，不補離線 tick。
 * SG-RT-04：下令只走 Realtime.dispatch。畫面打開選單或編輯器時用 intent() 記下當時的世代與 revision，
 * 送出時以那個 revision 當 expectedRevision，不換成最新值；世界在這之間推進過就由引擎回 stale_revision。
 * 一個 intent 只能送一次（雙擊不會重送），被拒時世界不動、不換 id 重試。成功只採用回傳的 state，不推進 tick。
 * 新局（prepare）與換世界（load）會換世代，舊世代的 intent 一律作廢。
 */
(function (root, factory) {
  'use strict';
  if (typeof module === 'object' && module && module.exports) {
    module.exports = factory();
  } else {
    const ns = root.SectChronicle || (root.SectChronicle = {});
    ns.ViewerController = factory();
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  const TICKS_PER_SECOND = 4;
  const MS_PER_TICK = 1000 / TICKS_PER_SECOND;
  const SPEEDS = Object.freeze([1, 2, 4]);
  // 單幀最多計入的牆鐘時間。分頁被節流或卡頓時，不把空檔補成一大批 tick。
  const MAX_FRAME_MS = 250;
  const TICKS_PER_DAY = 180;

  function createController(Realtime, options) {
    if (!Realtime || typeof Realtime.createWorld !== 'function' || typeof Realtime.advanceTicks !== 'function') {
      throw new Error('ViewerController 需要 Realtime.createWorld 與 Realtime.advanceTicks');
    }
    const opts = options || {};
    const onSavePoint = typeof opts.onSavePoint === 'function' ? opts.onSavePoint : null;
    let mode = 'setup'; // setup → playing ⇄ paused；error 為終止狀態
    let world = null;
    let seed = null;
    let speed = 1;
    let carry = 0; // 尚未換成 tick 的「牆鐘 ms × 倍率」
    let lastNow = null;
    let error = null;
    let autoPaused = false;
    let lastStep = null;
    let totals = { ticks: 0, batches: 0, breakthroughStops: 0 };
    let generation = 0;
    let intentSeq = 0;
    const spent = new Set(); // 已送出過的 intent

    // 依序套用多個命令到同一份世界；全部成功才回傳新世界，任何一個被拒就整批不採用。
    function applyAll(base, baseRevision, commands, idOf) {
      let next = base;
      const events = [];
      for (let i = 0; i < commands.length; i += 1) {
        const c = commands[i];
        const r = Realtime.dispatch(next, { id: idOf(i), expectedRevision: baseRevision + i, type: c.type, payload: c.payload });
        if (!r || r.ok !== true) {
          return { ok: false, code: r ? r.code : 'no_result', reason: r ? r.reason : 'dispatch 沒有回傳結果', index: i };
        }
        if (r.duplicate) return { ok: false, code: 'duplicate', reason: `命令 ${idOf(i)} 已經處理過，這次沒有再套用`, index: i };
        next = r.state;
        events.push(...r.events);
      }
      return { ok: true, world: next, events };
    }

    // setup：{ characterOptions, policy, goals }。政策與目標只在和預設不同時才下命令，預設開局與 createWorld(seed) 完全相同。
    function prepare(nextSeed, setup) {
      const s = setup || {};
      const made = Realtime.createWorld(nextSeed, s.characterOptions !== undefined ? s.characterOptions : opts.characterOptions);
      if (!made || made.ok !== true) {
        return { ok: false, code: made && made.code, reason: made && made.reason };
      }
      const commands = [];
      if (s.policy !== undefined && JSON.stringify(s.policy) !== JSON.stringify(made.state.policy)) {
        commands.push({ type: 'setPolicy', payload: { policy: s.policy } });
      }
      if (s.goals !== undefined && JSON.stringify(s.goals) !== JSON.stringify(made.state.goals)) {
        commands.push({ type: 'setGoals', payload: { goals: s.goals } });
      }
      const applied = applyAll(made.state, made.state.revision, commands, (i) => `setup-${commands[i].type}`);
      if (!applied.ok) return { ok: false, code: applied.code, reason: applied.reason };
      world = applied.world;
      seed = nextSeed;
      generation += 1;
      mode = 'setup';
      error = null;
      autoPaused = false;
      lastStep = null;
      totals = { ticks: 0, batches: 0, breakthroughStops: 0 };
      resetClock();
      return { ok: true };
    }

    function resetClock() {
      carry = 0;
      lastNow = null;
    }

    function start() {
      if (mode !== 'setup' || world === null) return false;
      mode = 'playing';
      resetClock();
      return true;
    }

    function pause() {
      if (mode !== 'playing') return false;
      mode = 'paused';
      resetClock();
      notify(['pause']);
      return true;
    }

    function resume() {
      if (mode !== 'paused') return false;
      mode = 'playing';
      autoPaused = false;
      resetClock();
      return true;
    }

    function toggle() {
      if (mode === 'playing') return pause();
      if (mode === 'paused') return resume();
      return false;
    }

    function setSpeed(next) {
      if (!SPEEDS.includes(next)) return false;
      speed = next;
      return true;
    }

    // 分頁轉到背景：播放中就暫停，並丟掉尚未換成 tick 的時間。回前景時不自動繼續。
    function hide() {
      const was = mode === 'playing';
      if (was) {
        mode = 'paused';
        autoPaused = true;
      }
      resetClock();
      if (was) notify(['pause']);
      return was;
    }

    // 每個動畫幀呼叫一次，回傳本幀實際推進的 tick 數。
    function frame(now) {
      if (mode !== 'playing') {
        lastNow = null;
        return 0;
      }
      if (lastNow === null || now < lastNow) {
        lastNow = now;
        return 0;
      }
      const elapsed = Math.min(now - lastNow, MAX_FRAME_MS);
      lastNow = now;
      carry += elapsed * speed;
      const due = Math.floor(carry / MS_PER_TICK);
      if (due < 1) return 0;
      carry -= due * MS_PER_TICK;
      return advance(due);
    }

    // 推進恰好 n 個 tick（或遇到錯誤為止），結束後依實際推進範圍通知保存點。
    function advance(n) {
      if (world === null || mode === 'error') return 0;
      const t0 = world.clock.tick;
      const done = advanceBatch(n);
      const t1 = world.clock.tick;
      const reasons = [];
      if (Math.floor(t0 / TICKS_PER_DAY) < Math.floor(t1 / TICKS_PER_DAY)) reasons.push('day');
      if (lastStep && lastStep.stops.includes('breakthroughResolved')) reasons.push('breakthrough');
      // error 時 world 已是最後合法的成功前綴，可以照常保存；不保存失敗 tick 的 clone。
      if (reasons.length && t1 > t0) notify(reasons);
      return done;
    }

    function notify(reasons) {
      if (onSavePoint) onSavePoint(reasons);
    }

    // breakthroughResolved 只結束 API 批次，剩下的量繼續推。
    function advanceBatch(n) {
      let left = n;
      let advanced = 0;
      const stops = [];
      while (left > 0) {
        const r = Realtime.advanceTicks(world, left);
        if (!r || r.ok !== true) {
          // 拒絕：這一批一個 tick 都沒推進，世界維持呼叫前的樣子。
          const err = r ? { code: r.code, reason: r.reason } : { code: 'no_result', reason: 'advanceTicks 沒有回傳結果' };
          return fail(Object.assign(err, { kind: 'rejected', committedTicks: 0 }), n, advanced, stops);
        }
        totals.batches += 1;
        if (r.stopReason === 'error') {
          // 批次中途失敗：advancedTicks 是失敗前已提交的 tick（RT00 §1.5 保留）。回傳的 state 可能帶著失敗那個 tick 的改動，
          // 不直接採用；改用同一個公開 API 從批次起點重推這段成功前綴，停在最後一個合法邊界。
          const done = r.advancedTicks;
          if (!Number.isSafeInteger(done) || done < 0 || done >= left) {
            return fail({ code: 'bad_advance', reason: `出錯批次回報 ${String(done)} tick（要求 ${left}）`, kind: 'failed', committedTicks: 0 }, n, advanced, stops);
          }
          const prefix = replayPrefix(done, stops);
          advanced += prefix;
          left -= prefix;
          const err = r.error || { code: 'error', reason: '未說明的錯誤' };
          if (prefix !== done) {
            return fail({ code: 'prefix_mismatch', reason: `出錯前已提交 ${done} tick，重推只得到 ${prefix} tick（原錯誤 ${err.code}：${err.reason}）`, kind: 'failed', committedTicks: prefix }, n, advanced, stops);
          }
          return fail({ code: err.code, reason: err.reason, kind: 'failed', committedTicks: done }, n, advanced, stops);
        }
        if (!Number.isSafeInteger(r.advancedTicks) || r.advancedTicks < 1 || r.advancedTicks > left) {
          return fail({ code: 'bad_advance', reason: `advanceTicks 回報 ${String(r.advancedTicks)} tick（要求 ${left}）`, kind: 'failed', committedTicks: 0 }, n, advanced, stops);
        }
        commit(r, stops);
        left -= r.advancedTicks;
        advanced += r.advancedTicks;
      }
      lastStep = { requested: n, advanced, stops };
      return advanced;
    }

    function commit(r, stops) {
      world = r.state;
      totals.ticks += r.advancedTicks;
      stops.push(r.stopReason);
      if (r.stopReason === 'breakthroughResolved') totals.breakthroughStops += 1;
    }

    // 從目前世界重推 k 個 tick，只採用正常結束的批次；回傳實際採用的 tick 數。
    function replayPrefix(k, stops) {
      let got = 0;
      while (got < k) {
        const r = Realtime.advanceTicks(world, k - got);
        if (!r || r.ok !== true || r.stopReason === 'error') break;
        if (!Number.isSafeInteger(r.advancedTicks) || r.advancedTicks < 1 || r.advancedTicks > k - got) break;
        totals.batches += 1;
        commit(r, stops);
        got += r.advancedTicks;
      }
      return got;
    }

    // 停在目前（最後合法的）世界。tick 是下一個要跑、也就是失敗的那個 tick。
    function fail(err, requested, advanced, stops) {
      mode = 'error';
      error = { code: err.code, reason: err.reason, kind: err.kind, committedTicks: err.committedTicks, tick: world.clock.tick };
      lastStep = { requested, advanced, stops };
      resetClock();
      return advanced;
    }

    // 換成已驗證的世界（讀檔／匯入）。一律暫停、不補離線 tick；統計從這份世界重新計。
    function load(next) {
      const v = Realtime.validateWorld ? Realtime.validateWorld(next) : { ok: true };
      if (!v.ok) return { ok: false, code: v.code, reason: v.reason };
      world = next;
      seed = next.seed;
      generation += 1;
      mode = 'paused';
      error = null;
      autoPaused = false;
      lastStep = null;
      totals = { ticks: 0, batches: 0, breakthroughStops: 0 };
      resetClock();
      return { ok: true };
    }

    // 畫面打開選單或編輯器時呼叫，記下當下的世代與 revision。
    function intent() {
      if (world === null) return null;
      intentSeq += 1;
      return Object.freeze({ generation, revision: world.revision, tick: world.clock.tick, seq: intentSeq });
    }

    // commands：一個 { type, payload } 或其陣列（例如政策與目標一起改）。多個命令依序套用，全部成功才採用。
    function dispatch(it, commands) {
      const list = Array.isArray(commands) ? commands : [commands];
      if (world === null || mode === 'setup') return { ok: false, code: 'not_started', reason: '世界還沒開始' };
      if (mode === 'error') return { ok: false, code: 'world_stopped', reason: '世界已因錯誤停止，不再接受命令' };
      if (!it || it.generation !== generation) return { ok: false, code: 'stale_generation', reason: '世界已經換過（新局、讀檔或匯入），這個操作作廢' };
      if (spent.has(it.seq)) return { ok: false, code: 'intent_spent', reason: '這個操作已經送出過一次' };
      if (list.length === 0) return { ok: false, code: 'no_command', reason: '沒有要送出的命令' };
      spent.add(it.seq);
      const before = world;
      const applied = applyAll(world, it.revision, list, (i) => `ui-r${it.revision}-i${it.seq}${list.length > 1 ? `-${i}` : ''}`);
      if (!applied.ok) return applied;
      world = applied.world;
      return { ok: true, events: applied.events, before, revision: world.revision };
    }

    function snapshot() {
      return {
        mode, seed, speed, autoPaused, error, lastStep, generation,
        totals: Object.assign({}, totals),
        world,
      };
    }

    return Object.freeze({
      prepare, start, pause, resume, toggle, setSpeed, hide, frame, advance, load, snapshot, intent, dispatch,
      get world() { return world; },
      get generation() { return generation; },
      get mode() { return mode; },
      get speed() { return speed; },
    });
  }

  return Object.freeze({ TICKS_PER_SECOND, SPEEDS, MAX_FRAME_MS, TICKS_PER_DAY, createController });
});
