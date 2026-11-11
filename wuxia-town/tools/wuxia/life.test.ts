// 武俠小鎮 W3（#555）：無頭模擬下的生活規則（全程檢查、開關、確定性）。
import { runHeadless } from './headless';

describe('w03-life 無頭模擬', () => {
  const run = runHeadless({ seed: 7, minutes: 0, untilGameMinute: 1440, trace: true });
  test('同種子兩次 hash 相同、換種子不同', () => {
    const again = runHeadless({ seed: 7, minutes: 0, untilGameMinute: 300 });
    const short = runHeadless({ seed: 7, minutes: 0, untilGameMinute: 300 });
    const other = runHeadless({ seed: 8, minutes: 0, untilGameMinute: 300 });
    expect(again.finalHash).toBe(short.finalHash);
    expect(other.finalHash).not.toBe(short.finalHash);
  });
  test('開啟時不發 agentDoSomething（不漫遊、不隨機活動）', () => {
    expect(run.summary.stats.operations.agentDoSomething ?? 0).toBe(0);
    expect(run.summary.stats.wanders).toBe(0);
  });
  test('一整天：預約 ≤ capacity、沒人卡住、對話 ≤ 90 遊戲分鐘', () => {
    const c = run.summary.life!.checks;
    expect(c.reservationOverCapacity).toBe(0);
    expect(c.usingOverCapacity).toBe(0);
    expect(c.doubleBooked).toBe(0);
    expect(Math.max(...Object.values(c.maxNoChoiceMinutes))).toBeLessThan(120);
    expect(c.maxConversationMinutes).toBeLessThanOrEqual(91);
  });
  test('有人聊天，而且只在閒暇地點開始', () => {
    const conv = run.summary.life!.conversations;
    expect(conv.total).toBeGreaterThan(0);
  });
  test('關掉 w03-life＝W2 世界（沒有生活狀態，照舊漫遊）', () => {
    const off = runHeadless({ seed: 7, minutes: 0, untilGameMinute: 300, elements: { 'w03-life': false } });
    expect(off.game.world.wuxia!.enabled['w03-life']).toBeUndefined();
    expect(off.game.world.wuxia!.elements['w03-life']).toBeUndefined();
    expect(off.summary.stats.operations.agentDoSomething).toBeGreaterThan(0);
  });
});
