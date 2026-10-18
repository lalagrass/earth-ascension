/*
 * SG-01：可序列化、可回放的權威 RNG（rngVersion 1）。
 *
 * - 演算法：種子字串以 cyrb128 轉成四個 uint32，再用 sfc32 並丟棄前 15 筆輸出。
 * - 狀態是四個 uint32 組成的普通陣列，可直接 JSON 序列化；所有函式都回傳新值，不修改輸入。
 * - 不使用 Math.random、牆鐘或任何環境熵；抽樣只能由呼叫端傳入的狀態決定。
 * - 載入策略：Node 以 CommonJS require；瀏覽器以一般 <script>，掛在 globalThis.SectChronicle.Rng。
 * - 更動演算法、播種或 nextInt 規則時必須升 RNG_VERSION，並說明舊 fixture 的變化。
 */
(function (root, factory) {
  'use strict';
  const api = factory();
  if (typeof module === 'object' && module && module.exports) {
    module.exports = api;
  } else {
    root.SectChronicle = root.SectChronicle || {};
    root.SectChronicle.Rng = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  const RNG_VERSION = 1;
  const TWO32 = 4294967296;

  function fail(code, reason) {
    return { ok: false, code, reason };
  }

  // cyrb128：以 UTF-16 code unit 逐一混入，輸出四個 uint32。
  function hashSeed(seed) {
    if (typeof seed !== 'string' || seed.length === 0) {
      throw new TypeError('seed 必須是非空字串');
    }
    let h1 = 1779033703;
    let h2 = 3144134277;
    let h3 = 1013904242;
    let h4 = 2773480762;
    for (let i = 0; i < seed.length; i++) {
      const k = seed.charCodeAt(i);
      h1 = h2 ^ Math.imul(h1 ^ k, 597399067);
      h2 = h3 ^ Math.imul(h2 ^ k, 2869860233);
      h3 = h4 ^ Math.imul(h3 ^ k, 951274213);
      h4 = h1 ^ Math.imul(h4 ^ k, 2716044179);
    }
    h1 = Math.imul(h3 ^ (h1 >>> 18), 597399067);
    h2 = Math.imul(h4 ^ (h2 >>> 22), 2869860233);
    h3 = Math.imul(h1 ^ (h3 >>> 17), 951274213);
    h4 = Math.imul(h2 ^ (h4 >>> 19), 2716044179);
    h1 ^= h2 ^ h3 ^ h4;
    h2 ^= h1;
    h3 ^= h1;
    h4 ^= h1;
    return [h1 >>> 0, h2 >>> 0, h3 >>> 0, h4 >>> 0];
  }

  function validateState(state) {
    if (!Array.isArray(state) || state.length !== 4) {
      return fail('bad_rng_state', 'rngState 必須是四個 uint32 的陣列');
    }
    for (let i = 0; i < 4; i++) {
      const v = state[i];
      if (typeof v !== 'number' || !Number.isInteger(v) || Object.is(v, -0) || v < 0 || v >= TWO32) {
        return fail('bad_rng_state', `rngState[${i}] 必須是 0 到 2^32-1 的整數`);
      }
    }
    return { ok: true };
  }

  function assertState(state) {
    const v = validateState(state);
    if (!v.ok) throw new TypeError(v.reason);
  }

  // sfc32 一步：回傳 uint32 輸出與新狀態。
  function nextUint32(state) {
    assertState(state);
    let a = state[0];
    let b = state[1];
    let c = state[2];
    let d = state[3];
    const t = (((a + b) | 0) + d) | 0;
    d = (d + 1) | 0;
    a = b ^ (b >>> 9);
    b = (c + (c << 3)) | 0;
    c = (c << 21) | (c >>> 11);
    c = (c + t) | 0;
    return { value: t >>> 0, state: [a >>> 0, b >>> 0, c >>> 0, d >>> 0] };
  }

  function create(seed) {
    let state = hashSeed(seed);
    for (let i = 0; i < 15; i++) state = nextUint32(state).state;
    return state;
  }

  // 0 <= value < n；以拒絕抽樣避免取模偏差。n 為 1 到 2^32 的整數。
  function nextInt(state, n) {
    if (typeof n !== 'number' || !Number.isInteger(n) || n < 1 || n > TWO32) {
      throw new RangeError('n 必須是 1 到 2^32 的整數');
    }
    const limit = Math.floor(TWO32 / n) * n;
    let s = state;
    for (;;) {
      const r = nextUint32(s);
      s = r.state;
      if (r.value < limit) return { value: r.value % n, state: s };
    }
  }

  return { RNG_VERSION, hashSeed, create, nextUint32, nextInt, validateState };
});
