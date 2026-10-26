// Compare the view-only official change against the exact pre-PR model bytes.
// Requires the recorded base commit in Git. This is a one-off delta check, not CI.
import { execFileSync } from 'node:child_process';
import { writeFile, unlink } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import { createHash } from 'node:crypto';
import assert from 'node:assert/strict';
import { createGeminiCore } from './cores.mjs';
import { createModel } from '../../experiments/water-carry/demo/model.mjs';
const base = '9ef497e86a5837539cc8e461855695b0fe468dbd';
const demo = new URL('../../experiments/water-carry/demo/', import.meta.url);
const temporary = new URL(`.scene342-baseline-${process.pid}.mjs`, demo);
const baseline = execFileSync('git', ['show', `${base}:sect-chronicle/experiments/water-carry/demo/model.mjs`], { cwd: new URL('../../../', import.meta.url) });
try {
  await writeFile(temporary, baseline, { flag: 'wx' });
  const Original = await import(pathToFileURL(temporary.pathname).href);
  const { geometry, lengths } = createGeminiCore();
  for (let scenario = 0; scenario < 5; scenario++) {
    const before = Original.createModel(lengths, undefined, undefined, undefined, { placeOf: geometry.of });
    const after = createModel(lengths, undefined, undefined, undefined, { placeOf: geometry.of });
    const commands = [
      [0, 'cousin', scenario % 2 ? 'work:water' : 'work:herb'],
      [600 + scenario * 17, 'hero', 'restAfterTrip'],
      [700 + scenario * 17, 'hero', 'work:herb'],
      [800 + scenario * 17, 'hero', 'restAfterTrip'],
      [6500, 'hero', 'start'],
    ];
    for (let tick = 0; tick < 10000; tick++) {
      for (const [at, id, action] of commands) if (at === tick) assert.deepEqual(after.dispatch(action, id), before.dispatch(action, id));
      before.step(); after.step();
      // Exercise the added read-only projection at different cadences.
      if (tick % 7 === 0) after.view();
      if (tick % 53 === 0) before.view();
    }
    assert.deepEqual(after.exportState(Infinity), before.exportState(Infinity));
    const sha256 = createHash('sha256').update(JSON.stringify(after.exportState(Infinity))).digest('hex');
    console.log(JSON.stringify({ scenario, base, ticks: after.state.tick, sha256, parity: true }));
  }
} finally { await unlink(temporary); }
