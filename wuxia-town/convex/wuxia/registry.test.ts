import { enabledElements, initElements, runElements, WuxiaElement } from './registry';
import { defaultWuxiaConfig, initWuxiaState } from './state';

describe('wuxia element registry', () => {
  const calls: string[] = [];
  const elements: WuxiaElement[] = [
    { id: 'a', init: () => calls.push('init a'), tick: () => calls.push('tick a') },
    {
      id: 'b',
      requires: ['a'],
      init: () => calls.push('init b'),
      tick: () => calls.push('tick b'),
    },
    { id: 'c', init: () => calls.push('init c'), tick: () => calls.push('tick c') },
  ];
  beforeEach(() => calls.splice(0));

  // W1 起 registry 有 w01-skin，預設設定開啟它（#553）。W0 的設定（沒有任何元素）仍然什麼都不開。
  test('W0 config (no elements) enables nothing', () => {
    const state = initWuxiaState({ elements: {}, seed: 7, timeScale: 60 });
    expect(enabledElements(state)).toEqual([]);
    expect(state.enabled).toEqual({});
  });
  // W2 起預設設定多開 w02-folk（#554）；W1 的設定（只開 w01-skin）仍然只開 w01-skin。
  test('W1 config enables exactly w01-skin; disabled flags are not stored', () => {
    const state = initWuxiaState({ elements: { 'w01-skin': true }, seed: 7, timeScale: 60 });
    expect(enabledElements(state).map((e) => e.id)).toEqual(['w01-skin']);
    expect(initWuxiaState({ elements: { 'w01-skin': false }, seed: 7, timeScale: 60 }).enabled).toEqual({});
  });
  test('W8 default config enables w01-skin to w07-bond and w08-jianghu', () => {
    // W3 刻意改變：預設開 w03-life（W2 時是 ['w01-skin', 'w02-folk']）
    // W4 刻意改變：預設開 w04-dojo（W3 時是 ['w01-skin', 'w02-folk', 'w03-life']，見 docs/wuxia/W4.md）
    // W5 刻意改變：預設開 w05-mind（W4 時是 [..., 'w04-dojo']，見 docs/wuxia/W5.md）
    // W6 刻意改變：預設開 w06-spar（W5 時是 [..., 'w05-mind']，見 docs/wuxia/W6.md）
    // W7 刻意改變：預設開 w07-bond（W6 時是 [..., 'w06-spar']，見 docs/wuxia/W7.md）
    // W8 刻意改變：預設開 w08-jianghu（W7 時是 [..., 'w07-bond']，見 docs/wuxia/W8.md）
    // A1 刻意改變：預設開 a1-base（W9 時是 [..., 'w08-jianghu']；w09-player 要玩家加入才開，見 docs/wuxia/A1.md）
    // A2 刻意改變：預設開 a2-master（A1 時是 [..., 'a1-base']，見 docs/wuxia/A2.md）
    // A3 刻意改變：預設開 a3-silent（A2 時是 [..., 'a2-master']，見 docs/wuxia/A3.md）
    // A4 刻意改變：預設開 a4-play（A3 時是 [..., 'a3-silent']，見 docs/wuxia/A4.md）
    // A5 刻意改變：預設開 a5-robust（A4 時是 [..., 'a4-play']，見 docs/wuxia/A5.md）
    // A6 刻意改變：預設開 a6-spread（A5 時是 [..., 'a5-robust']，見 docs/wuxia/A6.md）
    expect(enabledElements(initWuxiaState()).map((e) => e.id)).toEqual([
      'w01-skin',
      'w02-folk',
      'w03-life',
      'w04-dojo',
      'w05-mind',
      'w06-spar',
      'w07-bond',
      'w08-jianghu',
      'a1-base',
      'a2-master',
      'a3-silent',
      'a4-play',
      'a5-robust',
      'a6-spread',
    ]);
  });
  test('w08-jianghu requires w07-bond（關掉 w07-bond 時 w08-jianghu 不凍結進 enabled）', () => {
    const st = initWuxiaState({ elements: { ...defaultWuxiaConfig.elements, 'w07-bond': false }, seed: 7, timeScale: 60 });
    expect(st.enabled['w08-jianghu']).toBeUndefined();
  });
  test('w06-spar requires w04-dojo and w05-mind (diamond requires is not a cycle)', () => {
    const all = {
      'w01-skin': true,
      'w02-folk': true,
      'w03-life': true,
      'w04-dojo': true,
      'w05-mind': true,
      'w06-spar': true,
    };
    expect(initWuxiaState({ elements: all, seed: 7, timeScale: 60 }).enabled['w06-spar']).toBe(true);
    for (const off of ['w01-skin', 'w03-life', 'w04-dojo', 'w05-mind']) {
      const state = initWuxiaState({ elements: { ...all, [off]: false }, seed: 7, timeScale: 60 });
      expect(state.enabled['w06-spar']).toBeUndefined();
    }
  });
  test('a real cycle still throws', () => {
    const cyc: WuxiaElement[] = [
      { id: 'x', requires: ['y'] },
      { id: 'y', requires: ['x'] },
    ];
    const state = initWuxiaState({ elements: {}, seed: 1, timeScale: 60 });
    state.enabled = { x: true, y: true };
    expect(() => enabledElements(state, cyc)).toThrow(/Circular/);
  });
  test('w05-mind requires w03-life (w04-dojo optional)', () => {
    const base = { 'w01-skin': true, 'w02-folk': true, 'w03-life': true, 'w05-mind': true };
    expect(initWuxiaState({ elements: base, seed: 7, timeScale: 60 }).enabled['w05-mind']).toBe(true);
    expect(
      initWuxiaState({ elements: { ...base, 'w03-life': false }, seed: 7, timeScale: 60 }).enabled['w05-mind'],
    ).toBeUndefined();
  });
  test('w04-dojo requires w03-life: turning life (or anything below) off drops dojo from the frozen flags', () => {
    for (const off of ['w01-skin', 'w02-folk', 'w03-life']) {
      const state = initWuxiaState({
        elements: { 'w01-skin': true, 'w02-folk': true, 'w03-life': true, 'w04-dojo': true, [off]: false },
        seed: 7,
        timeScale: 60,
      });
      expect(state.enabled['w04-dojo']).toBeUndefined();
    }
  });
  test('w03-life requires w02-folk: turning folk (or skin) off drops life from the frozen flags', () => {
    for (const off of ['w01-skin', 'w02-folk']) {
      const state = initWuxiaState({
        elements: { 'w01-skin': true, 'w02-folk': true, 'w03-life': true, [off]: false },
        seed: 7,
        timeScale: 60,
      });
      expect(state.enabled['w03-life']).toBeUndefined();
    }
  });
  test('w02-folk requires w01-skin: turning the skin off drops folk from the frozen flags', () => {
    const state = initWuxiaState({
      elements: { 'w01-skin': false, 'w02-folk': true },
      seed: 7,
      timeScale: 60,
    });
    expect(state.enabled).toEqual({});
    expect(enabledElements(state)).toEqual([]);
  });
  test('clock epoch is set on the first tick only when some element is enabled', () => {
    const off = initWuxiaState({ elements: {}, seed: 1, timeScale: 60 });
    runElements({ world: { wuxia: off } } as any, 1234);
    expect(off.clockEpoch).toBeUndefined();
    const on = initWuxiaState({ elements: { 'w01-skin': true }, seed: 1, timeScale: 60 });
    runElements({ world: { wuxia: on } } as any, 1234);
    runElements({ world: { wuxia: on } } as any, 5678);
    expect(on.clockEpoch).toBe(1234);
  });
  test('disabled elements are not init/ticked; requires is respected', () => {
    const state = initWuxiaState({ elements: { b: true, c: true }, seed: 1, timeScale: 60 });
    // b requires a (off) → only c
    expect(enabledElements(state, elements).map((e) => e.id)).toEqual(['c']);
    initElements(state, elements);
    runElements({ world: { wuxia: state } } as any, 0, elements);
    expect(calls).toEqual(['init c', 'tick c']);
  });
  test('registry order is preserved', () => {
    const state = initWuxiaState({
      elements: { a: true, b: true, c: true },
      seed: 1,
      timeScale: 60,
    });
    runElements({ world: { wuxia: state } } as any, 0, elements);
    expect(calls).toEqual(['tick a', 'tick b', 'tick c']);
  });
});
