import { dayTint, gameMinutes, readClock } from './clock';

describe('wuxia game clock (#549 §3, W1)', () => {
  test('timeScale 60: one engine second is one game minute', () => {
    expect(gameMinutes(61_000, 1_000, 60)).toBe(60);
    expect(gameMinutes(1_000 + 999, 1_000, 60)).toBe(0);
  });
  test('game minute 0 is day 1, 卯正 (06:00)', () => {
    const c = readClock(0);
    expect([c.day, c.hour, c.shichen, c.half, c.label]).toEqual([1, 6, '卯', '正', '第 1 日 卯正']);
  });
  test('twelve shichen boundaries', () => {
    const at = (h: number) => readClock(((h - 6 + 24) % 24) * 60).shichen;
    expect(at(23)).toBe('子');
    expect(at(0)).toBe('子');
    expect(at(1)).toBe('丑');
    expect(at(5)).toBe('卯');
    expect(at(11)).toBe('午');
    expect(at(12)).toBe('午');
    expect(at(17)).toBe('酉');
    expect(at(19)).toBe('戌');
    expect(at(21)).toBe('亥');
  });
  test('day rolls over at midnight', () => {
    expect(readClock(18 * 60 - 1).day).toBe(1);
    expect(readClock(18 * 60).day).toBe(2);
    expect(readClock(18 * 60).label).toBe('第 2 日 子正');
  });
  test('day/night tint: night 戌–寅 blue-dark, dusk 酉 orange, noon clear', () => {
    const night = dayTint(22 * 60);
    expect(night.phase).toBe('night');
    expect(night.alpha).toBeGreaterThan(0.3);
    expect(night.color & 0xff).toBeGreaterThan((night.color >> 16) & 0xff); // 藍多於紅
    const dusk = dayTint(18 * 60);
    expect(dusk.phase).toBe('dusk');
    expect((dusk.color >> 16) & 0xff).toBeGreaterThan(dusk.color & 0xff); // 紅多於藍
    expect(dayTint(12 * 60)).toEqual({ phase: 'day', color: 0xffffff, alpha: 0 });
    expect(dayTint(3 * 60).phase).toBe('night');
    expect(dayTint(6 * 60).phase).toBe('dawn');
  });
});
