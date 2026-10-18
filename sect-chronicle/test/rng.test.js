'use strict';
// SG-01 RNG 契約測試。已知向量由獨立的 Python 實作（cyrb128 + sfc32）產生並交叉核對，
// 不是由本實作回填。
const test = require('node:test');
const assert = require('node:assert/strict');
const Rng = require('../js/rng.js');

test('rngVersion 是正整數常數', () => {
  assert.equal(Number.isInteger(Rng.RNG_VERSION), true);
  assert.equal(Rng.RNG_VERSION, 1);
});

test('hashSeed 已知向量（UTF-16 code unit，含非 ASCII）', () => {
  assert.deepEqual(Rng.hashSeed('sg-vector-1'), [3379535760, 3899659653, 3911938401, 2031762651]);
  assert.deepEqual(Rng.hashSeed('é世界'), [3258467310, 1564936144, 848356937, 3255100955]);
});

test('create 已知向量：種子雜湊後丟棄 15 筆輸出', () => {
  assert.deepEqual(Rng.create('sg-vector-1'), [1631127092, 873751445, 1670577589, 2031762666]);
  assert.deepEqual(Rng.create('é世界'), [3998974430, 308531520, 3192233997, 3255100970]);
});

test('nextUint32 已知向量（原始狀態 [1,2,3,4]）', () => {
  let state = [1, 2, 3, 4];
  const out = [];
  for (let i = 0; i < 8; i++) {
    const r = Rng.nextUint32(state);
    out.push(r.value);
    state = r.state;
  }
  assert.deepEqual(out, [7, 34, 56623200, 188882296, 3431242869, 399395954, 785775158, 3843710725]);
  assert.deepEqual(state, [154712168, 1969681255, 1661847439, 12]);
});

test('nextUint32 已知向量（seed sg-vector-1）', () => {
  let state = Rng.create('sg-vector-1');
  const out = [];
  for (let i = 0; i < 10; i++) {
    const r = Rng.nextUint32(state);
    out.push(r.value);
    state = r.state;
  }
  assert.deepEqual(out, [241673907, 760451564, 3879345334, 870994086, 1690972694,
    4003881381, 690759147, 2416556563, 505090208, 2865030045]);
});

test('nextInt(n) 以拒絕抽樣取得，已知向量', () => {
  let state = Rng.create('sg-vector-1');
  const out = [];
  for (let i = 0; i < 12; i++) {
    const r = Rng.nextInt(state, 6);
    out.push(r.value);
    state = r.state;
  }
  assert.deepEqual(out, [3, 2, 4, 0, 2, 3, 3, 1, 2, 3, 5, 1]);
});

test('函式不修改輸入狀態（凍結陣列也可用）', () => {
  const state = Object.freeze([1, 2, 3, 4]);
  const r = Rng.nextUint32(state);
  assert.deepEqual([...state], [1, 2, 3, 4]);
  assert.notEqual(r.state, state);
  const r2 = Rng.nextInt(state, 10);
  assert.deepEqual([...state], [1, 2, 3, 4]);
  assert.notEqual(r2.state, state);
});

test('同 seed 重現；20 個 seed 各 42 次抽樣完全一致，且不同 seed 不同', () => {
  const firsts = new Set();
  for (let i = 0; i < 20; i++) {
    const seed = `sg-replay-${i}`;
    const run = () => {
      let s = Rng.create(seed);
      const seq = [];
      for (let k = 0; k < 42; k++) { const r = Rng.nextUint32(s); seq.push(r.value); s = r.state; }
      return { seq, s };
    };
    const a = run();
    const b = run();
    assert.deepEqual(a, b);
    firsts.add(a.seq[0]);
  }
  assert.equal(firsts.size, 20);
});

test('序列化往返：JSON 還原的狀態接續抽樣與不中斷相同', () => {
  let s = Rng.create('sg-resume');
  for (let i = 0; i < 17; i++) s = Rng.nextUint32(s).state;
  const restored = JSON.parse(JSON.stringify(s));
  assert.deepEqual(Rng.nextUint32(restored), Rng.nextUint32(s));
  assert.deepEqual(Rng.nextInt(restored, 1000), Rng.nextInt(s, 1000));
});

test('nextInt 範圍、n=1、拒絕非法 n', () => {
  let s = Rng.create('range');
  for (let i = 0; i < 500; i++) {
    const r = Rng.nextInt(s, 7);
    assert.ok(r.value >= 0 && r.value < 7 && Number.isInteger(r.value));
    s = r.state;
  }
  assert.equal(Rng.nextInt(s, 1).value, 0);
  for (const bad of [0, -1, 1.5, NaN, Infinity, '3', null, undefined, 2 ** 32 + 1]) {
    assert.throws(() => Rng.nextInt(s, bad), RangeError, String(bad));
  }
});

test('validateState 接受合法狀態並明確拒絕壞狀態', () => {
  assert.deepEqual(Rng.validateState([0, 1, 4294967295, 7]), { ok: true });
  const bad = [
    [null, 'bad_rng_state'], [{}, 'bad_rng_state'], [[1, 2, 3], 'bad_rng_state'],
    [[1, 2, 3, 4, 5], 'bad_rng_state'], [[1, 2, 3, -1], 'bad_rng_state'],
    [[1, 2, 3, 4294967296], 'bad_rng_state'], [[1, 2, 3, 1.5], 'bad_rng_state'],
    [[1, 2, 3, NaN], 'bad_rng_state'], [[1, 2, 3, '4'], 'bad_rng_state'],
  ];
  for (const [v, code] of bad) {
    const r = Rng.validateState(v);
    assert.equal(r.ok, false);
    assert.equal(r.code, code);
    assert.ok(r.reason.length > 0);
  }
});

test('create 拒絕非字串或空 seed', () => {
  for (const bad of [undefined, null, 12, '', {}, []]) {
    assert.throws(() => Rng.create(bad), TypeError, String(bad));
  }
});

test('輸出分布粗略合理（卡方，非嚴格統計檢定）', () => {
  let s = Rng.create('chi');
  const bins = new Array(10).fill(0);
  const N = 20000;
  for (let i = 0; i < N; i++) { const r = Rng.nextInt(s, 10); bins[r.value]++; s = r.state; }
  const exp = N / 10;
  const chi = bins.reduce((a, b) => a + (b - exp) ** 2 / exp, 0);
  assert.ok(chi < 40, `chi=${chi}`); // 自由度 9，40 遠高於 p=0.0001 臨界值
});
