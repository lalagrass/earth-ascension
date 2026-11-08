// 只讀一a 的事件統計；四種成就共用同一條規則，沒有遊戲內獎勵。
export const ACHIEVEMENTS = Object.freeze([
  { id: 'first-step', name: '初試拳腳', kind: 'progress', when: { event: 'log.learnedMove', count: 1 } },
  { id: 'own-art', name: '一門在身', kind: 'progress', when: { event: 'state.firstArt', count: 1 } },
  { id: 'first-scroll', name: '卷中有路', kind: 'progress', when: { event: 'log.readVolume', count: 1 } },
  { id: 'high-place', name: '登高望遠', kind: 'progress', when: { event: 'log.cliff', count: 1 } },
  { id: 'breakthrough', name: '破關初成', kind: 'progress', when: { event: 'deed.break1', count: 1 } },
  { id: 'two-arts', name: '兩路相參', kind: 'progress', when: { event: 'log.learnedArt', count: 2 } },
  { id: 'dog-watch', name: '守住山犬', kind: 'challenge', when: { event: 'enemy.dog', count: 1 } },
  { id: 'boar-watch', name: '止住野豬', kind: 'challenge', when: { event: 'defeat.boar', count: 1 } },
  { id: 'bandit-watch', name: '退了山賊', kind: 'challenge', when: { event: 'defeat.bandit', count: 1 } },
  { id: 'defend-twice', name: '再守山門', kind: 'challenge', when: { event: 'deed.defend', count: 2 } },
  { id: 'lair-run', name: '剿寨歸來', kind: 'challenge', when: { event: 'deed.lair', count: 1 } },
  { id: 'stand-banner', name: '山門有名', kind: 'life', when: { event: 'log.founded', count: 1 } },
  { id: 'first-student', name: '有人願學', kind: 'life', when: { event: 'deed.join', count: 1 } },
  { id: 'rumor-found', name: '有人傳話', kind: 'life', when: { event: 'rumor.any', count: 1 } },
  { id: 'hall-repaired', name: '一磚一木', kind: 'life', when: { event: 'deed.build', count: 1 } },
  { id: 'first-graduate', name: '徒弟出師', kind: 'life', when: { event: 'log.graduated', count: 1 } },
  { id: 'family-day', name: '兩人同心', kind: 'life', when: { event: 'log.married', count: 1 } },
  { id: 'quiet-cultivator', name: '兩度衝關', kind: 'hidden', when: { event: 'deed.break', count: 2 } },
  { id: 'wild-observer', name: '野路識招', kind: 'hidden', when: { event: 'deed.glimmer', count: 1 } },
  { id: 'many-scrolls', name: '書山有徑', kind: 'hidden', when: { event: 'log.readVolume', count: 3 } },
]);
export function achievementRows(record, { showHidden = false } = {}) {
  const thresholdDay = (e, n) => { let seen = 0; for (const [day, count] of Object.entries(e?.days || {}).sort((a, b) => Number(a[0]) - Number(b[0]))) { seen += count; if (seen >= n) return Number(day); } return null; };
  return ACHIEVEMENTS.filter(a => a.kind !== 'hidden' || showHidden || (record.events[a.when.event]?.count || 0) >= a.when.count)
    .map(a => ({ ...a, count: record.events[a.when.event]?.count || 0,
      done: (record.events[a.when.event]?.count || 0) >= a.when.count,
      day: thresholdDay(record.events[a.when.event], a.when.count) }));
}
const esc = x => String(x).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');
const KIND_NAMES = { progress: '進度', challenge: '挑戰', life: '生活', hidden: '隱藏' };
export const achievementHtml = record => `<div class="k">只記事蹟，不給遊戲內獎勵。${record.incomplete ? '舊存檔只統計導入後的新事件。' : ''}</div>` + achievementRows(record)
  .map(a => `<div class="k">${a.done ? '✓' : '○'} ${esc(a.name)}〔${KIND_NAMES[a.kind]}〕 ${a.done ? `第 ${a.day} 日` : `${a.count}/${a.when.count}`}</div>`).join('');
