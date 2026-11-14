// 武俠小鎮 W3（#555）：無頭模擬下的生活規則（全程檢查、開關、確定性）。
import { runHeadless } from './headless';
import { OBJECTS, socialPlaceAt } from './life-trace';

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
    // A3（#574）刻意改變：a3-silent 預設開，AI 之間不再發起 AI Town 對話（改成無言互動，見 docs/wuxia/A3.md）；
    // 這裡改用 a3-silent 關閉的世界檢查 W3 的聊天規則，並確認開著時一場對話都沒有
    expect(run.summary.life!.conversations.total).toBe(0);
    const talk = runHeadless({ seed: 7, minutes: 0, untilGameMinute: 1440, trace: true, elements: { 'a3-silent': false } });
    const conv = talk.summary.life!.conversations;
    expect(conv.total).toBeGreaterThan(0);
    // A2（#575）：a2-master 預設開，鎮東民宅多了灶（飯桌），閒暇地點多一個 home-east；元素關閉時仍只有茶館、河邊
    const leisure = ['teahouse', 'river', ...(talk.summary.a2 ? ['home-east'] : [])];
    for (const place of Object.keys(conv.byPlace)) expect(leisure).toContain(place);
    expect(conv.ratio!).toBeGreaterThanOrEqual(0.8);
  });
  test('說話地點：茶館門口 2 格內算茶館、灶旁算飯桌、街心不算', () => {
    expect(socialPlaceAt(21, 20)).toBe('teahouse');
    expect(socialPlaceAt(10.5, 16)).toBe('teahouse');
    expect(socialPlaceAt(24, 30)).toBeNull();
    const stove = OBJECTS.find((o) => o.activities.some((a) => a.id === 'eat'))!;
    const [sx, sy] = stove.slots[0];
    expect(socialPlaceAt(sx, sy)).toMatch(/^(table:|teahouse$)/);
  });
  test('關掉 w03-life＝W2 世界（沒有生活狀態，照舊漫遊）', () => {
    const off = runHeadless({ seed: 7, minutes: 0, untilGameMinute: 300, elements: { 'w03-life': false } });
    expect(off.game.world.wuxia!.enabled['w03-life']).toBeUndefined();
    expect(off.game.world.wuxia!.elements['w03-life']).toBeUndefined();
    expect(off.summary.stats.operations.agentDoSomething).toBeGreaterThan(0);
  });
});
