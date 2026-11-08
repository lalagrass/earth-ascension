// 25a：每十五個門派日合看一次。庫存與氣血取每日末值的中位數，
// 餓昏與低心情用該段所有人物秒數作分母，來犯逐筆保留傳聞來源。
export const median = values => {
  const sorted = values.filter(x => x != null).sort((a, b) => a - b);
  return sorted.length ? sorted[Math.floor(sorted.length / 2)] : null;
};
const fraction = (n, d) => +(n / Math.max(1, d)).toFixed(3);

export function segmentReport(days, span = 15) {
  const segments = [];
  const last = Math.max(0, ...days.map(d => d.day));
  for (let from = 1; from <= last; from += span) {
    const to = Math.min(last, from + span - 1);
    const rows = days.filter(d => d.day >= from && d.day <= to);
    if (!rows.length) continue;
    const sum = key => rows.reduce((n, row) => n + (row[key] || 0), 0);
    const rumorTriggers = rows.flatMap(row => row.raids || []);
    segments.push({ from, to, vegMedian: median(rows.map(row => row.veg)), cookedFoodMedian: median(rows.map(row => row.food)),
      famishedShare: fraction(sum('famished'), sum('samples')), hpMedian: median(rows.map(row => row.hpMedian)),
      lowMoodShare: fraction(sum('lowMood'), sum('samples')), raids: rumorTriggers.length, rumorTriggers });
  }
  return segments;
}

export function aggregateSegments(runs) {
  const count = Math.max(0, ...runs.map(run => run.segments?.length || 0));
  return Array.from({ length: count }, (_, index) => {
    const rows = runs.map(run => run.segments?.[index]).filter(Boolean);
    return { from: rows[0].from, to: rows[0].to,
      vegMedian: median(rows.map(row => row.vegMedian)), cookedFoodMedian: median(rows.map(row => row.cookedFoodMedian)),
      famishedShareMedian: median(rows.map(row => row.famishedShare)), hpMedian: median(rows.map(row => row.hpMedian)),
      lowMoodShareMedian: median(rows.map(row => row.lowMoodShare)), raidsMedian: median(rows.map(row => row.raids)),
      raidsTotal: rows.reduce((n, row) => n + row.raids, 0) };
  });
}
