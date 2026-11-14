import { nextFloat, rngUuid, seedRng, makeRng } from './rng';

describe('wuxia rng', () => {
  test('same seed gives same sequence', () => {
    const a = seedRng(7);
    const b = seedRng(7);
    const xs = Array.from({ length: 100 }, () => nextFloat(a));
    const ys = Array.from({ length: 100 }, () => nextFloat(b));
    expect(xs).toEqual(ys);
    for (const x of xs) {
      expect(x).toBeGreaterThanOrEqual(0);
      expect(x).toBeLessThan(1);
    }
  });
  test('different seeds differ', () => {
    const a = seedRng(7);
    const b = seedRng(8);
    expect(nextFloat(a)).not.toEqual(nextFloat(b));
  });
  test('state survives JSON round trip (save/load mid-sequence)', () => {
    const a = seedRng(42);
    for (let i = 0; i < 10; i++) nextFloat(a);
    const restored = JSON.parse(JSON.stringify(a));
    expect(nextFloat(restored)).toEqual(nextFloat(a));
  });
  test('rngUuid is v4-shaped and deterministic', () => {
    const u1 = rngUuid(makeRng(1));
    const u2 = rngUuid(makeRng(1));
    expect(u1).toEqual(u2);
    expect(u1).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
  });
  test('roughly uniform', () => {
    const r = makeRng(3);
    const buckets = new Array(10).fill(0);
    for (let i = 0; i < 10000; i++) buckets[Math.floor(r() * 10)]++;
    for (const n of buckets) expect(Math.abs(n - 1000)).toBeLessThan(150);
  });
});
