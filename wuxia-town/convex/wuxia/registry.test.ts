import { enabledElements, initElements, runElements, WuxiaElement } from './registry';
import { initWuxiaState } from './state';

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
  test('W3 default config enables w01-skin, w02-folk and w03-life', () => {
    // W3 刻意改變：預設開 w03-life（W2 時是 ['w01-skin', 'w02-folk']）
    expect(enabledElements(initWuxiaState()).map((e) => e.id)).toEqual([
      'w01-skin',
      'w02-folk',
      'w03-life',
    ]);
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
