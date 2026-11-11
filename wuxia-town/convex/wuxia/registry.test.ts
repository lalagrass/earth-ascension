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

  test('W0 registry is empty and default config enables nothing', () => {
    const state = initWuxiaState();
    expect(enabledElements(state)).toEqual([]);
    expect(Object.values(state.enabled).filter(Boolean)).toEqual([]);
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
