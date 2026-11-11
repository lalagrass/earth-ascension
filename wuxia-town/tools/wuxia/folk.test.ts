// 武俠小鎮 W2（#554）：工具層的檢查（prompt 產生檔同步、開關對照）。
import { promptsInSync } from './gen-prompts';
import { folkDiff } from './folk-diff';

test('prompts.gen.ts 跟 data/wuxia/prompts、anachronisms.txt 同步', () => {
  expect(promptsInSync()).toBe(true);
});

describe('w02-folk 開關對照（規則不變）', () => {
  test('關＝W1；同樣 5 人開／關只差 enabled 旗標', () => {
    const r = folkDiff(7, 3);
    expect(r.resultA.ok).toBe(true);
    expect(r.resultB.ok).toBe(true);
    expect(r.resultB.statsOn).toEqual(r.resultB.statsOff);
  });
});
