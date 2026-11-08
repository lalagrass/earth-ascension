export const MILESTONES = Object.freeze([
  { id: 'firstArt', name: '第一門整套武學', when: 'state.firstArt' },
  { id: 'firstMove', name: '第一次學會一招', when: 'log.learnedMove' },
  { id: 'firstDog', name: '第一次打退野狗', when: 'enemy.dog' },
  { id: 'firstBoar', name: '第一次打退野豬', when: 'defeat.boar' },
  { id: 'firstBandit', name: '第一次打退山賊', when: 'defeat.bandit' },
  { id: 'cliff', name: '第一次上崖', when: 'log.cliff' },
  { id: 'firstVolume', name: '第一卷讀懂', when: 'log.readVolume' },
  { id: 'canFound', name: '可以立匾', when: 'state.canFound' },
  { id: 'founded', name: '立匾開山', when: 'log.founded' },
  { id: 'firstDisciple', name: '第一個徒弟', when: 'deed.join' },
  { id: 'heardRecruit', name: '第一次有人循傳聞拜師', when: 'log.heardRecruit' },
  { id: 'build', name: '第一次修好設施', when: 'deed.build' },
  { id: 'graduate', name: '第一個徒弟出師', when: 'log.graduated' },
  { id: 'grew', name: '山上人丁增長', when: 'state.grew' },
  { id: 'rumor', name: '第一則有來源傳聞', when: 'rumor.any' },
  { id: '大成', name: '第一次突破大成', when: 'deed.break1' },
  { id: '名俠', name: '第一次遇到名俠', when: 'log.heroVisitor' },
  { id: '成親', name: '第一次成親', when: 'log.married' },
  { id: '有喜', name: '第一次有喜', when: 'log.pregnant' },
  { id: '出生', name: '第一個新生兒', when: 'log.born' },
]);
export const milestoneRows = (record, who = null) => MILESTONES.map(row => {
  const e = record.events[row.when];
  const name = typeof who === 'object' ? who?.name : who;
  const key = typeof who === 'object' ? who?.id : who;
  return { ...row, day: who ? (e?.people?.[key]?.firstDay ?? e?.people?.[name]?.firstDay ?? null) : (e?.firstDay ?? null), who: name || e?.who || null };
});

const esc = x => String(x).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll("\"", "&quot;");
export const timelineHtml = (record, who = null) => {
  const rows = milestoneRows(record, who).filter(row => row.day != null).sort((a, b) => a.day - b.day || a.id.localeCompare(b.id));
  return (record.incomplete ? '<div class="k">舊存檔沒有歷史旁帳；此處只列導入後的新事件。</div>' : '') + (rows.length ? `<ol class="chron">${rows.map(row => `<li>第 ${row.day} 日・${esc(row.who || '山門')}：${esc(row.name)}</li>`).join('')}</ol>` : '<div class="k">尚無里程碑。</div>');
};
