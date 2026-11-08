import test from 'node:test';
import assert from 'node:assert/strict';
import { log, recordDeed } from '../../../src/util.mjs';
import { recordRumor } from '../../../src/rumors.mjs';
import { seeEnemy } from '../../../src/world.mjs';
import { createState, tick } from '../../../src/sim.mjs';
import { DAY } from '../../../src/data.mjs';
import { save, load } from '../../../src/save.mjs';
import { achievementRecord, observeAchievementFacts, restoreAchievementRecord } from '../../../src/achievement-record.mjs';
import { MILESTONES, milestoneRows, timelineHtml } from '../../../src/milestones.mjs';
import { ACHIEVEMENTS, achievementRows } from '../../../src/achievements.mjs';

const state = () => ({ day: 1, t: 0, ds: [{ id: 'hero', name: '阿草', arts: {} }, { id: 'ally', name: '阿石', arts: {} }], codex: {}, log: [], rumors: [], sect: {}, hermitage: { active: true } });

test('成就一 a：事件旁帳保存裁掉前的首日、次數、當日最大與個人首日，不改模擬資料', () => {
  const s = state(); observeAchievementFacts(s);
  recordDeed(s, s.ds[0], 'defend'); recordDeed(s, s.ds[0], 'defend');
  s.day = 2; recordDeed(s, s.ds[1], 'defend');
  const e = achievementRecord(s).events['deed.defend'];
  assert.deepEqual([e.count, e.firstDay, e.max, e.people.ally.firstDay], [3, 1, 2, 2]);
  assert.equal('achievementRecord' in s, false);
  seeEnemy(s, 'dog', 'kill', s.ds[0]);
  assert.equal(achievementRecord(s).events['enemy.dog'].firstDay, 2);
  log(s, '守柵迎敵——阿草把山賊打退了！');
  assert.equal(achievementRecord(s).events['defeat.bandit'].firstDay, 2);
  recordRumor(s, 'defend', '過路人');
  assert.equal(achievementRecord(s).events['rumor.any'].count, 1);
  const copy = JSON.parse(JSON.stringify(achievementRecord(s))), loaded = structuredClone(s);
  restoreAchievementRecord(loaded, copy);
  assert.equal(achievementRecord(loaded).events['deed.defend'].count, 3);
  const game = createState(17, { opening: 'solo', starterArt: 'none' });
  recordDeed(game, game.ds[0], 'break');
  const wire = save({ ...game, uiAchievementRecord: achievementRecord(game) });
  const revived = load(wire); assert.equal(revived.ok, true);
  restoreAchievementRecord(revived.state, revived.state.uiAchievementRecord);
  delete revived.state.uiAchievementRecord;
  assert.equal(achievementRecord(revived.state).events['deed.break'].firstDay, 1);
  assert.equal('uiAchievementRecord' in revived.state, false);
  const old = state(); old.day = 30; old.t = 29 * 600; old.ds[0].arts.basicFist = { xp: 40 };
  restoreAchievementRecord(old, null);
  observeAchievementFacts(old, { canFound: true });
  assert.equal(achievementRecord(old).incomplete, true);
  assert.equal(achievementRecord(old).events['state.firstArt'], undefined);
  assert.equal(achievementRecord(old).events['state.canFound'], undefined);
});

test('成就一 b：表驅動門派與個人時間線給出同一首次日', () => {
  const s = state(); observeAchievementFacts(s);
  s.day = 3; s.ds[0].arts.basicFist = { xp: 1 }; observeAchievementFacts(s);
  s.day = 4; s.ds[1].arts.basicFist = { xp: 1 }; observeAchievementFacts(s);
  const r = achievementRecord(s), row = milestoneRows(r).find(x => x.id === 'firstArt');
  assert.equal(row.day, 3);
  assert.equal(milestoneRows(r, s.ds[1]).find(x => x.id === 'firstArt').day, 4);
  assert.match(timelineHtml(r), /第 3 日・阿草：第一門整套武學/);
  assert.match(timelineHtml(r, s.ds[1]), /第 4 日・阿石：第一門整套武學/);
  const twins = state(); twins.ds[1].name = twins.ds[0].name;
  recordDeed(twins, twins.ds[0], 'break1'); twins.day = 5; recordDeed(twins, twins.ds[1], 'break1');
  assert.equal(milestoneRows(achievementRecord(twins), twins.ds[0]).find(x => x.id === '大成').day, 1);
  assert.equal(milestoneRows(achievementRecord(twins), twins.ds[1]).find(x => x.id === '大成').day, 5);
  log(twins, '阿草把已學套路的「出拳」練成了');
  assert.equal(milestoneRows(achievementRecord(twins)).find(x => x.id === 'firstMove').day, 5);
  assert.equal(milestoneRows(achievementRecord(twins), twins.ds[0]).find(x => x.id === 'firstMove').day, null);
  assert.ok(MILESTONES.length >= 13);
  const trial = createState(1001, { opening: 'solo', starterArt: 'chunyangFist' });
  for (let elapsed = 0; elapsed < 3 * DAY && !achievementRecord(trial).events['enemy.dog']; elapsed++) { tick(trial, 1); trial.alert = null; }
  assert.equal(milestoneRows(achievementRecord(trial)).find(x => x.id === 'firstDog').day, 1);
});

test('成就一 c：每項成就固定未達／達成，門檻日正確，隱藏項達成前不顯示', () => {
  assert.ok(ACHIEVEMENTS.length >= 15 && ACHIEVEMENTS.length <= 25);
  assert.deepEqual(new Set(ACHIEVEMENTS.map(a => a.kind)), new Set(['progress', 'challenge', 'life', 'hidden']));
  assert.ok(ACHIEVEMENTS.filter(a => ['first-step', 'own-art', 'first-scroll', 'high-place', 'dog-watch', 'boar-watch'].includes(a.id)).length >= 3);
  const solo = state(); solo.ds = solo.ds.slice(0, 1); observeAchievementFacts(solo);
  solo.ds[0].arts.basicFist = { xp: 1 }; observeAchievementFacts(solo);
  log(solo, '阿草把已學套路的「出拳」練成了');
  seeEnemy(solo, 'dog', 'kill', solo.ds[0]);
  assert.equal(solo.hermitage.active, true);
  assert.equal(solo.ds.length, 1);
  assert.ok(achievementRows(achievementRecord(solo)).filter(a => a.done).length >= 3);
  const messages = {
    learnedMove: '阿草把已學套路的「出拳」練成了',
    learnedArt: '【拳譜】阿草讀完《第一卷》，學會《一門拳》。',
    readVolume: '【拳譜】阿草讀完《第一卷》，學會《一門拳》。',
    cliff: '阿草踏上斷木試劍崖，望見山路又開了一層。',
    founded: '【開山立宗】阿草立匾「山門」',
    graduated: '阿草通過考核，升入內門！', married: '阿草與阿石成親',
  };
  for (const a of ACHIEVEMENTS) {
    const s = state(), id = a.when.event;
    let rows = achievementRows(achievementRecord(s), { showHidden: true });
    assert.equal(rows.find(x => x.id === a.id).done, false, a.id);
    assert.equal(rows.find(x => x.id === a.id).day, null, a.id);
    if (a.kind === 'hidden') assert.equal(achievementRows(achievementRecord(s)).some(x => x.id === a.id), false, a.id);
    const count = a.when.count;
    for (let i = 0; i < count; i++) {
      s.day = i === count - 1 && count > 1 ? 7 : 3;
      const [source, key] = id.split('.');
      if (source === 'deed') recordDeed(s, s.ds[0], key);
      else if (source === 'rumor') recordRumor(s, 'defend', '過路人');
      else if (source === 'log') log(s, messages[key]);
      else if (source === 'enemy') seeEnemy(s, key, 'kill', s.ds[0]);
      else if (id === 'defeat.bandit') log(s, '守柵迎敵——阿草把山賊打退了！');
      else if (id === 'defeat.boar') seeEnemy(s, 'boars', 'kill', s.ds[0]);
      else if (id === 'state.firstArt') { s.ds[0].arts.basicFist = { xp: 1 }; observeAchievementFacts(s); }
      else assert.fail(`unknown event ${id}`);
    }
    rows = achievementRows(achievementRecord(s));
    assert.equal(rows.find(x => x.id === a.id).done, true, a.id);
    assert.equal(rows.find(x => x.id === a.id).day, count === 1 ? 3 : 7, a.id);
  }
});
