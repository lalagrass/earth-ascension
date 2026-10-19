/*
 * SG-RT-03a：RT 世界的正式存讀（契約見 #137 遊戲 PO 結論）。
 *
 * 存檔是封套＋`Realtime.serializeState` 的原字串，checksum 是該字串的 SHA-256，只用來檢查完整性，不防竄改。
 * localStorage 只用三個 key：指標 `sect-chronicle-save-v1` 與兩個資料槽 `:a`／`:b`。保存一律寫非 active 槽、
 * 讀回驗證，最後才切指標；原 active 不受本次寫入影響。localStorage 沒有多 key 交易，這裡也不宣稱有。
 * 整個保存流程包在 Web Locks 裡，只協調遵守同一協定的同源分頁；沒有 Web Locks 時不寫任何 key。
 * 不讀寫 guwu、Python 原型或其他 key；不轉換舊 slot 檔，不消耗世界 RNG，不改世界。
 */
(function (root, factory) {
  'use strict';
  if (typeof module === 'object' && module && module.exports) {
    module.exports = factory(require('./realtime.js'), require('./state.js'));
  } else {
    const ns = root.SectChronicle || (root.SectChronicle = {});
    if (!ns.Realtime || !ns.State) throw new Error('storage.js 需要先載入 state.js 與 realtime.js');
    ns.Storage = factory(ns.Realtime, ns.State);
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function (Realtime, State) {
  'use strict';

  const FORMAT = 'sect-chronicle';
  const ENVELOPE_VERSION = 1;
  const POINTER_KEY = 'sect-chronicle-save-v1';
  const SLOT_KEYS = Object.freeze({ a: `${POINTER_KEY}:a`, b: `${POINTER_KEY}:b` });
  const SLOTS = Object.freeze(['a', 'b']);
  const LOCK_NAME = POINTER_KEY;
  const ENVELOPE_FIELDS = Object.freeze([
    'format', 'envelopeVersion', 'scenarioId', 'schemaVersion', 'ruleVersion', 'rngVersion',
    'tick', 'revision', 'savedAt', 'checksum', 'stateText',
  ]);
  const POINTER_FIELDS = Object.freeze(['active', 'writerId', 'seq', 'revision', 'tick']);
  const IDENTITY = Object.freeze({
    scenarioId: Realtime.SCENARIO_ID, schemaVersion: Realtime.SCHEMA_VERSION,
    ruleVersion: Realtime.RULE_VERSION, rngVersion: Realtime.RNG_VERSION,
  });
  // 保存失敗後會停自動保存的碼；手動保存成功才恢復。
  const STOP_CODES = Object.freeze([
    'external_change', 'not_owner', 'save_broken', 'overwrite_broken_slot', 'storage_error', 'write_failed',
    'readback_mismatch', 'pointer_write_failed', 'pointer_readback_mismatch',
  ]);

  const fail = (code, reason, extra) => Object.assign({ ok: false, code, reason }, extra || {});
  const isRecord = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);
  const has = (o, k) => Object.prototype.hasOwnProperty.call(o, k);
  const isNonNeg = (v) => Number.isSafeInteger(v) && v >= 0;
  const otherSlot = (slot) => (slot === 'a' ? 'b' : 'a');

  // ---------- 封套（純函式） ----------

  function makeEnvelope(world, savedAt) {
    let stateText;
    try {
      stateText = Realtime.serializeState(world);
    } catch (e) {
      return fail('invalid_world', `世界不合法，不能保存：${e.message}`);
    }
    const envelope = {
      format: FORMAT,
      envelopeVersion: ENVELOPE_VERSION,
      scenarioId: world.scenarioId,
      schemaVersion: world.schemaVersion,
      ruleVersion: world.ruleVersion,
      rngVersion: world.rngVersion,
      tick: world.clock.tick,
      revision: world.revision,
      savedAt: typeof savedAt === 'string' ? savedAt : new Date(0).toISOString(),
      checksum: State.sha256Hex(stateText),
      stateText,
    };
    return { ok: true, envelope, text: JSON.stringify(envelope), checksum: envelope.checksum, tick: envelope.tick, revision: envelope.revision };
  }

  function looksLikeSlot(o) {
    return o.scenarioId === 'slice-14' || (o.schemaVersion === 4 && o.ruleVersion === 3) || has(o, 'slotIndex');
  }

  // 依序檢查：JSON → 封套辨識（含舊 slot）→ 封套版本與欄位 → 世界身份 → checksum → parseState → 封套與世界一致 → canonical。
  // 任何一步失敗都只回錯誤，不改任何東西；原始字串由呼叫端保留供匯出。
  function readSave(text) {
    if (typeof text !== 'string') return fail('no_data', '沒有存檔資料');
    let o;
    try {
      o = JSON.parse(text);
    } catch (e) {
      return fail('invalid_json', `不是合法 JSON：${e.message}`);
    }
    if (!isRecord(o)) return fail('unknown_format', '存檔必須是 JSON 物件');
    if (!has(o, 'format')) {
      if (looksLikeSlot(o)) return fail('legacy_slot_save', '舊 slot 模式的存檔不能在 RT 入口載入；原檔未改寫，也不轉換');
      if (o.scenarioId === IDENTITY.scenarioId) return fail('missing_envelope', '缺少存檔封套：只接受本遊戲匯出的完整存檔');
      return fail('unknown_format', '不是宗門編年的存檔');
    }
    if (o.format !== FORMAT) return fail('unknown_format', `未知格式：${String(o.format)}`);
    if (looksLikeSlot(o)) return fail('legacy_slot_save', '舊 slot 模式的存檔不能在 RT 入口載入；原檔未改寫，也不轉換');
    if (o.envelopeVersion !== ENVELOPE_VERSION) {
      return fail('unsupported_envelope_version', `封套版本 ${JSON.stringify(o.envelopeVersion)}，只支援 ${ENVELOPE_VERSION}`);
    }
    for (const k of Object.keys(o)) {
      if (!ENVELOPE_FIELDS.includes(k)) return fail('bad_envelope', `封套有未知欄位 ${k}`);
    }
    for (const k of ENVELOPE_FIELDS) {
      if (!has(o, k)) return fail('bad_envelope', `封套缺少欄位 ${k}`);
    }
    for (const k of Object.keys(IDENTITY)) {
      if (o[k] !== IDENTITY[k]) {
        return fail('unsupported_version', `存檔是 ${o.scenarioId}／schema${o.schemaVersion}／rule${o.ruleVersion}／rng${o.rngVersion}，本版只接受 ${IDENTITY.scenarioId}／schema${IDENTITY.schemaVersion}／rule${IDENTITY.ruleVersion}／rng${IDENTITY.rngVersion}`);
      }
    }
    if (!isNonNeg(o.tick) || !isNonNeg(o.revision) || typeof o.savedAt !== 'string' || typeof o.stateText !== 'string'
      || typeof o.checksum !== 'string' || !/^[0-9a-f]{64}$/.test(o.checksum)) {
      return fail('bad_envelope', '封套欄位型別不合法');
    }
    if (State.sha256Hex(o.stateText) !== o.checksum) return fail('checksum_mismatch', '內容與 checksum 不符，存檔可能損壞');
    const parsed = Realtime.parseState(o.stateText);
    if (!parsed.ok) {
      if (parsed.code === 'old_mode_unsupported') return fail('legacy_slot_save', parsed.reason);
      return fail(parsed.code, `世界驗證失敗：${parsed.reason}`, { stage: 'state' });
    }
    const world = parsed.state;
    for (const k of Object.keys(IDENTITY)) {
      if (world[k] !== o[k]) return fail('envelope_mismatch', `封套的 ${k} 與世界不符`);
    }
    if (world.clock.tick !== o.tick || world.revision !== o.revision) {
      return fail('envelope_mismatch', `封套記 tick ${o.tick}／revision ${o.revision}，世界是 tick ${world.clock.tick}／revision ${world.revision}`);
    }
    if (Realtime.serializeState(world) !== o.stateText) return fail('noncanonical_state', '世界內容不是正式序列化結果');
    return { ok: true, world, envelope: o, checksum: o.checksum };
  }

  function makePointer(active, writerId, seq, revision, tick) {
    return JSON.stringify({ active, writerId, seq, revision, tick });
  }

  function readPointer(text) {
    if (typeof text !== 'string') return fail('no_pointer', '沒有存檔指標');
    let o;
    try {
      o = JSON.parse(text);
    } catch (e) {
      return fail('bad_pointer', `指標不是合法 JSON：${e.message}`);
    }
    if (!isRecord(o) || Object.keys(o).length !== POINTER_FIELDS.length || !POINTER_FIELDS.every((k) => has(o, k))
      || !SLOTS.includes(o.active) || typeof o.writerId !== 'string' || o.writerId.length === 0
      || !Number.isSafeInteger(o.seq) || o.seq < 1 || !isNonNeg(o.revision) || !isNonNeg(o.tick)) {
      return fail('bad_pointer', '指標欄位不合法');
    }
    return { ok: true, pointer: o };
  }

  // ---------- localStorage 與鎖（注入） ----------

  function errorName(e) {
    return e && (e.name || e.code) ? String(e.name || e.code) : 'Error';
  }

  // storage：有 getItem／setItem 的物件（瀏覽器 localStorage 或測試用假物件）。locks：有 request(name, fn) 的物件。
  // 缺任一項就是「本地保存不可用」：仍可讀取現有資料（唯讀載入、匯出），但不寫任何 key。
  function createStore(options) {
    const opts = options || {};
    const storage = opts.storage || null;
    const locks = opts.locks || null;
    const writerId = String(opts.writerId || '');
    if (!writerId) throw new Error('createStore 需要 writerId');
    const canRead = !!storage && typeof storage.getItem === 'function';
    const canWrite = canRead && typeof storage.setItem === 'function' && !!locks && typeof locks.request === 'function';
    // expected：本分頁最後確認的指標原字串（null 表示空）；owned：本分頁是否已是寫者。
    let expected = { raw: undefined, owned: false };
    let broken = false;

    function get(key) {
      try {
        return { ok: true, raw: storage.getItem(key) };
      } catch (e) {
        return fail('storage_error', `讀取 ${key} 失敗：${errorName(e)}`, { name: errorName(e) });
      }
    }

    function put(key, text) {
      try {
        storage.setItem(key, text);
        return { ok: true };
      } catch (e) {
        return fail('write_failed', `寫入 ${key} 失敗：${errorName(e)}`, { name: errorName(e) });
      }
    }

    // 只讀三個 key 並逐一驗證，不改任何狀態。
    function inspect() {
      if (!canRead) return { state: 'unavailable', canWrite: false, pointer: null, slots: null, active: null };
      const p = get(POINTER_KEY);
      const slots = {};
      for (const s of SLOTS) {
        const g = get(SLOT_KEYS[s]);
        slots[s] = g.ok ? { raw: g.raw, result: g.raw === null ? fail('no_data', '空槽') : readSave(g.raw) } : { raw: null, result: g };
      }
      if (!p.ok) return { state: 'broken', canWrite, pointer: { raw: null, result: p }, slots, active: null };
      const pointer = { raw: p.raw, result: readPointer(p.raw) };
      if (p.raw === null && slots.a.raw === null && slots.b.raw === null) {
        return { state: 'empty', canWrite, pointer, slots, active: null };
      }
      const active = pointer.result.ok ? pointer.result.pointer.active : null;
      const ok = active !== null && slots[active].result.ok;
      return { state: ok ? 'ok' : 'broken', canWrite, pointer, slots, active };
    }

    // 頁面開啟時建立基線。空存檔：本分頁可直接成為寫者。已有存檔：要先明確接續（adopt）才寫。
    // 壞存檔：不寫，直到使用者明確恢復某一槽（restore）。
    function open() {
      const view = inspect();
      expected = { raw: view.pointer ? view.pointer.raw : undefined, owned: view.state === 'empty' };
      broken = view.state === 'broken';
      return view;
    }

    function withLock(fn) {
      if (!canWrite) return Promise.resolve(fail('storage_unavailable', '此瀏覽器不能使用本地保存（沒有 localStorage 或 Web Locks）'));
      return Promise.resolve(locks.request(LOCK_NAME, () => fn()));
    }

    // 保存一份已準備好的封套（makeEnvelope 的結果）。isCurrent 在取得鎖後、寫入前檢查；回 false 就不寫（舊 generation）。
    function save(prepared, saveOpts) {
      const so = saveOpts || {};
      return withLock(() => {
        if (typeof so.isCurrent === 'function' && !so.isCurrent()) return fail('stale_generation', '世界已換成新局或其他存檔，舊的保存要求不寫入');
        if (!prepared || prepared.ok !== true) return fail('invalid_world', prepared && prepared.reason ? prepared.reason : '沒有可保存的世界');
        const cur = get(POINTER_KEY);
        if (!cur.ok) return cur;
        if (expected.raw === undefined) return fail('not_opened', '尚未讀取存檔狀態');
        if (cur.raw !== expected.raw) {
          if (!so.takeover) return fail('external_change', '存檔已被其他分頁或程式改動；此分頁停止自動保存');
        } else if (!expected.owned && !so.takeover) {
          return fail('not_owner', '這份存檔不是此分頁寫的；確認在此分頁接續後才保存');
        }
        let base = null;
        if (cur.raw !== null) {
          const rp = readPointer(cur.raw);
          if (!rp.ok) return fail('save_broken', '存檔指標損壞；請先匯出原始資料並選擇要恢復的槽');
          const activeRaw = get(SLOT_KEYS[rp.pointer.active]);
          if (!activeRaw.ok) return activeRaw;
          if (!readSave(activeRaw.raw).ok) return fail('save_broken', '目前的存檔損壞；請先匯出原始資料並選擇要恢復的槽');
          base = rp.pointer;
        } else {
          for (const s of SLOTS) {
            const g = get(SLOT_KEYS[s]);
            if (!g.ok) return g;
            if (g.raw !== null) return fail('save_broken', '沒有指標但資料槽不是空的；請先匯出原始資料並選擇要恢復的槽');
          }
        }
        if (broken && !so.takeover) return fail('save_broken', '存檔損壞；請先恢復某一槽');
        const target = base ? otherSlot(base.active) : 'a';
        // 依即將覆寫的槽在鎖內的實際內容判斷，不靠本頁記憶：重新整理或換分頁後，壞資料仍要明確確認才覆寫。
        // 讀取失敗不能當空槽；空槽與合法備份照常輪替。
        const existing = get(SLOT_KEYS[target]);
        if (!existing.ok) return existing;
        if (existing.raw !== null && !readSave(existing.raw).ok && !so.overwriteBroken) {
          return fail('overwrite_broken_slot', `槽 ${target} 的資料損壞；確認覆寫（建議先匯出原始資料）後才保存`, { slot: target });
        }
        const w = put(SLOT_KEYS[target], prepared.text);
        if (!w.ok) return Object.assign(w, { slot: target });
        const back = get(SLOT_KEYS[target]);
        if (!back.ok) return back;
        const check = back.raw === prepared.text ? readSave(back.raw) : null;
        if (!check || !check.ok || check.checksum !== prepared.checksum) {
          return fail('readback_mismatch', `槽 ${target} 讀回內容與寫入不同；指標未切換`, { slot: target });
        }
        const seq = (base ? base.seq : 0) + 1;
        const ptr = makePointer(target, writerId, seq, prepared.revision, prepared.tick);
        const pw = put(POINTER_KEY, ptr);
        if (!pw.ok) return fail('pointer_write_failed', `${pw.reason}；原存檔仍有效，這次未保存`, { slot: target, name: pw.name });
        const pb = get(POINTER_KEY);
        if (!pb.ok) return pb;
        if (pb.raw !== ptr) return fail('pointer_readback_mismatch', '指標讀回內容與寫入不同；這次未保存', { slot: target });
        expected = { raw: ptr, owned: true };
        broken = false;
        return { ok: true, slot: target, seq, tick: prepared.tick, revision: prepared.revision, checksum: prepared.checksum, bytes: prepared.text.length };
      });
    }

    // 讀取並接續目前 active 的存檔：鎖內確認指標仍是使用者看到的那一份，之後本分頁成為寫者。
    function adopt(seenPointerRaw) {
      return withLock(() => {
        const view = inspect();
        if (view.pointer.raw !== seenPointerRaw) return fail('external_change', '存檔在確認期間被改動；請重新整理存檔狀態');
        if (view.state !== 'ok') return fail('save_broken', '目前的存檔無法讀取');
        const loaded = view.slots[view.active].result;
        expected = { raw: view.pointer.raw, owned: true };
        broken = false;
        return { ok: true, world: loaded.world, envelope: loaded.envelope, slot: view.active };
      });
    }

    // 明確恢復某一槽：鎖內重新驗證該槽，把指標改指向它，使它成為 active（不會被下一次保存覆寫）。
    // 另一槽若有損壞資料，save 在鎖內看到它就要求明確確認才覆寫。
    function restore(slot, seenPointerRaw) {
      if (!SLOTS.includes(slot)) return Promise.resolve(fail('bad_slot', `沒有槽 ${String(slot)}`));
      return withLock(() => {
        const view = inspect();
        if (view.pointer.raw !== seenPointerRaw) return fail('external_change', '存檔在確認期間被改動；請重新整理存檔狀態');
        const chosen = view.slots[slot].result;
        if (!chosen.ok) return fail('slot_invalid', `槽 ${slot} 無法讀取：${chosen.code}`);
        const old = view.pointer.result.ok ? view.pointer.result.pointer.seq : 0;
        const ptr = makePointer(slot, writerId, old + 1, chosen.envelope.revision, chosen.envelope.tick);
        const pw = put(POINTER_KEY, ptr);
        if (!pw.ok) return fail('pointer_write_failed', `${pw.reason}；沒有恢復`, { name: pw.name });
        const pb = get(POINTER_KEY);
        if (!pb.ok) return pb;
        if (pb.raw !== ptr) return fail('pointer_readback_mismatch', '指標讀回內容與寫入不同；沒有恢復');
        const other = otherSlot(slot);
        expected = { raw: ptr, owned: true };
        broken = false;
        return { ok: true, world: chosen.world, envelope: chosen.envelope, slot, otherSlotBroken: view.slots[other].raw !== null && !view.slots[other].result.ok };
      });
    }

    function readRaw(key) {
      if (!canRead) return fail('storage_unavailable', '此瀏覽器不能讀取本地存檔');
      return get(key);
    }

    return Object.freeze({
      inspect, open, save, adopt, restore, readRaw,
      get canWrite() { return canWrite; },
      get expectedRaw() { return expected.raw; },
      get owned() { return expected.owned; },
      get writerId() { return writerId; },
    });
  }

  // ---------- 保存工作階段：generation、dirty 與排隊 ----------

  // 每次新局／匯入／讀取都換新的 generation；排隊中的舊 generation 保存在取得鎖後被拒絕，不會蓋掉新世界。
  // dirty 以 (generation, revision) 判斷：不同世界可能有相同 revision。保存成功只標記當時捕捉的那份快照。
  function createSession(store, options) {
    const opts = options || {};
    const now = typeof opts.now === 'function' ? opts.now : () => new Date().toISOString();
    let generation = 0;
    let saved = null; // { generation, revision, tick, seq, slot, bytes }
    let stopped = null; // { code, reason }
    let last = null; // 最後一次保存結果
    let chain = Promise.resolve();
    let pendingCount = 0;

    function begin(kind, baseline) {
      generation += 1;
      stopped = null;
      last = null;
      saved = baseline && Number.isSafeInteger(baseline.revision)
        ? { generation, revision: baseline.revision, tick: baseline.tick, seq: null, slot: baseline.slot || null, bytes: null }
        : null;
      return generation;
    }

    function isDirty(world) {
      return !(world && saved && saved.generation === generation && saved.revision === world.revision);
    }

    function stop(code, reason) {
      stopped = { code, reason };
    }

    // manual：使用者按「立即保存」。自動保存在 stopped 時直接略過；手動保存可帶 takeover／overwriteBroken（已確認）。
    function request(world, reqOpts) {
      const ro = reqOpts || {};
      if (!store.canWrite) return Promise.resolve(fail('storage_unavailable', '此瀏覽器不能使用本地保存'));
      if (!ro.manual && stopped) return Promise.resolve(fail('autosave_stopped', `自動保存已停止：${stopped.reason}`));
      if (!ro.manual && !isDirty(world)) return Promise.resolve({ ok: true, skipped: true });
      const gen = generation;
      const prepared = makeEnvelope(world, now());
      if (!prepared.ok) return Promise.resolve(prepared);
      pendingCount += 1;
      const run = chain.then(() => store.save(prepared, {
        isCurrent: () => gen === generation,
        takeover: !!ro.takeover,
        overwriteBroken: !!ro.overwriteBroken,
      })).then((r) => {
        pendingCount -= 1;
        if (gen !== generation) return r.ok ? Object.assign({}, r, { stale: true }) : r;
        last = r;
        if (r.ok) {
          saved = { generation: gen, revision: r.revision, tick: r.tick, seq: r.seq, slot: r.slot, bytes: r.bytes };
          stopped = null;
        } else if (STOP_CODES.includes(r.code)) {
          stop(r.code, r.reason);
        }
        return r;
      }, (e) => {
        pendingCount -= 1;
        const r = fail('storage_error', `保存時發生例外：${errorName(e)}`);
        if (gen === generation) {
          last = r;
          stop(r.code, r.reason);
        }
        return r;
      });
      chain = run.then(() => undefined);
      return run;
    }

    // 其他分頁改了指標（storage 事件）：立即停自動保存，不等下一次保存才發現。
    function noticeExternal(newRaw) {
      if (newRaw === store.expectedRaw) return false;
      stop('external_change', '另一個分頁已改動存檔；此分頁停止自動保存');
      return true;
    }

    function status(world) {
      return {
        canWrite: store.canWrite,
        generation,
        dirty: isDirty(world),
        saved: saved && saved.generation === generation ? Object.assign({}, saved) : null,
        stopped: stopped ? Object.assign({}, stopped) : null,
        last: last ? Object.assign({}, last) : null,
        busy: pendingCount > 0,
      };
    }

    return Object.freeze({ begin, request, isDirty, noticeExternal, status, get generation() { return generation; } });
  }

  // 匯出檔名：只用 seed 中的安全字元。
  function exportFileName(world) {
    const seed = String(world.seed).replace(/[^0-9A-Za-z_-]+/g, '_').slice(0, 40) || 'world';
    return `sect-chronicle-${seed}-t${world.clock.tick}.json`;
  }

  return Object.freeze({
    FORMAT, ENVELOPE_VERSION, POINTER_KEY, SLOT_KEYS, LOCK_NAME, STOP_CODES,
    makeEnvelope, readSave, readPointer, createStore, createSession, exportFileName,
  });
});
