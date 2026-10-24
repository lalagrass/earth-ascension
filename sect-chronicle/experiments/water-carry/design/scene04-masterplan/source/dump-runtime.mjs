// 只讀匯出開工 base 的 runtime 幾何（不改任何 demo 檔）。node dump-runtime.mjs > runtime-snapshot.json
import { WATER_POINTS, WORLD_SIZE, WATER_LENGTH } from '../../../demo/water-layout.mjs';
import { HERB, TRAIN_POSTS, SEATS, DRINK } from '../../../demo/routes.mjs';
import { LEAD, MAIN, LEAD_LENGTH, MAIN_LENGTH } from '../../../demo/patrol-layout.mjs';
const anchors = [
  { name: '院中端點 HOME', runtime: [962, 512], master: 'fac.hall 前院 (880,300)', verdict: '沿用端點概念，需搬' },
  { name: '水缸', runtime: [DRINK.vat.x, DRINK.vat.y], master: 'fac.kitchen 缸 (675,292)', verdict: '沿用，移入膳房' },
  { name: '溪橋', runtime: [850, 1000], master: 'wat.bridge (432,522)', verdict: '沿用同名，需重繪方向' },
  { name: '谷底泉眼', runtime: [352, 1245], master: 'wat.intake (590,598)', verdict: '沿用取水，需搬到潭東岸' },
  { name: '藥圃', runtime: [HERB.patch.x, HERB.patch.y], master: 'fac.garden (1000,430)', verdict: '沿用，鄰院' },
  { name: '石凳', runtime: [SEATS.bench.x, SEATS.bench.y], master: 'fac.dining (760,345)', verdict: '保留石凳＋候選餐敘' },
  { name: '練功樁', runtime: [TRAIN_POSTS.hero.stake.x, TRAIN_POSTS.hero.stake.y], master: 'fac.yard (895,300)', verdict: '沿用，擴場' },
  { name: '巡山 S3 林緣', runtime: MAIN[MAIN.length - 1], master: '西南遠採集景段 / 望台', verdict: '保留 #290，另加候選' },
];
console.log(JSON.stringify({ base: process.env.BASE, world: WORLD_SIZE, lengths: { water: WATER_LENGTH, lead: +LEAD_LENGTH.toFixed(1), main: +MAIN_LENGTH.toFixed(1) },
  paths: { water: WATER_POINTS, herb: HERB.points, patrolLead: LEAD, patrolMain: MAIN, train: TRAIN_POSTS.hero.points }, anchors }, null, 1));
