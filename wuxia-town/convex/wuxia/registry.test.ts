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
  test('W1 default config enables exactly w01-skin; disabled flags are not stored', () => {
    const state = initWuxiaState();
    expect(enabledElements(state).map((e) => e.id)).toEqual(['w01-skin']);
    expect(initWuxiaState({ elements: { 'w01-skin': false }, seed: 7, timeScale: 60 }).enabled).toEqual({});
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
