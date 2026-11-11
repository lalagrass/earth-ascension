import { createHash } from 'node:crypto';
import { sha256Hex } from './sha256';
import { canonicalJson } from './canonical';
import { stateHash } from './hash';

describe('wuxia sha256 / canonical json / state hash', () => {
  test('sha256 matches node crypto', () => {
    const samples = [
      '',
      'abc',
      'a'.repeat(55),
      'a'.repeat(56),
      'a'.repeat(64),
      '武俠小鎮',
      'x'.repeat(10000),
    ];
    for (const s of samples) {
      expect(sha256Hex(s)).toEqual(createHash('sha256').update(s, 'utf8').digest('hex'));
    }
  });
  test('canonical json sorts keys and drops undefined', () => {
    expect(canonicalJson({ b: 1, a: { d: undefined, c: [1, { z: 1, y: 2 }] } })).toEqual(
      '{"a":{"c":[1,{"y":2,"z":1}]},"b":1}',
    );
  });
  test('state hash ignores historicalLocations and key order', () => {
    const w1: any = {
      nextId: 1,
      players: [],
      agents: [],
      conversations: [],
      wuxia: { v: 1, seed: 7 },
    };
    const w2: any = {
      wuxia: { seed: 7, v: 1 },
      conversations: [],
      agents: [],
      players: [],
      nextId: 1,
      historicalLocations: [{ playerId: 'p:0', location: new ArrayBuffer(4) }],
    };
    expect(stateHash(w1)).toEqual(stateHash(w2));
    expect(stateHash({ ...w1, nextId: 2 })).not.toEqual(stateHash(w1));
  });
});
