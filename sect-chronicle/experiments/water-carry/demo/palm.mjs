// LP-11 手動掌法清鼠：純幾何與已批示意值（D21 K1–K4）。不碰 Pixi／DOM；模型在權威 tick 用這裡取樣位置，畫面讀模型輸出的同一座標。
// 座標沿 LP10 畫稿的有限區／三鼠位置／西側出口（已標示 fixture），但不匯入畫稿的 STATES／PATHS；路線只是少量固定節點＋短路段。

// 院中共同端點（與挑水／採藥／休息／休閒／防守路同一點）。
export const HOME = [962, 512];
// 院中往清理區的通道：HOME → 這兩個節點，再直線分短段走向站位。通道可在有限區外，不因 HOME 在區外就拒絕或瞬移。
export const GATE = [[930, 522], [905, 530]];
// 有限區（竹護欄內西院草地）：邊界視為區內，跨出才失效。
export const ZONE = [[640, 386], [720, 480], [770, 556], [900, 568], [940, 524], [910, 462], [860, 418], [760, 380]];
// 三隻測試弱鼠：兩普通、一警覺（鼠3）。新局才重設，不補滿、不繁殖。
export const RATS = Object.freeze([
  Object.freeze({ id: 1, x: 868, y: 528, kind: 'normal' }),
  Object.freeze({ id: 2, x: 790, y: 490, kind: 'normal' }),
  Object.freeze({ id: 3, x: 712, y: 432, kind: 'alert' }),
]);
// 警覺鼠沿已知西側出口折線逃（從牠目前位置先接到第一點）。
export const EXIT = [[684, 438], [636, 448], [586, 456]];

export const PALM = Object.freeze({
  reach: 28, // 人物與鼠腳底世界距離 ≤28 才算接觸
  stand: 20, // 站位：鼠東側 20（面向西出掌），在 reach 內
  seg: 40, // 短路段上限；取消時只走完當前這段
  cost: 2, // 每次真正開始起手扣 2 精力；中止不退
  see: 50, // 警覺鼠：清理者 ≤50 察覺逼近就逃
  witness: 100, // 警覺鼠：100 內同伴實際受掌後逃
  flee: 120, // 逃速（場景單位／秒）
});
// 掌法比較 fixture：只改起手／收勢 tick，不改腳力、傷害或任何成長。
export const SKILLS = Object.freeze({
  novice: Object.freeze({ label: '初學', windup: 48, recover: 36 }),
  adept: Object.freeze({ label: '熟練', windup: 24, recover: 18 }),
});

export const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
const EPS = 1e-6;
function onSeg(x, y, [ax, ay], [bx, by]) {
  const cross = (bx - ax) * (y - ay) - (by - ay) * (x - ax);
  if (Math.abs(cross) > EPS * Math.hypot(bx - ax, by - ay)) return false;
  return x >= Math.min(ax, bx) - EPS && x <= Math.max(ax, bx) + EPS && y >= Math.min(ay, by) - EPS && y <= Math.max(ay, by) + EPS;
}
// 點在多邊形內（邊界算區內）。
export function inZone(x, y, poly = ZONE) {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    if (onSeg(x, y, poly[j], poly[i])) return true;
    const [xi, yi] = poly[i], [xj, yj] = poly[j];
    if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}
// 有效目標：還沒擊倒／逃出，且仍在有限區內。
export const validRat = (r) => (r.mode === 'sniff' || r.mode === 'flee') && inZone(r.x, r.y);
// 最近仍有效者；距離打平用穩定 ID（小者優先）。
export function nearest(rats, at) {
  let best = null, bd = Infinity;
  for (const r of rats) {
    if (!validRat(r)) continue;
    const d = dist(r, at);
    if (d < bd - EPS || (Math.abs(d - bd) <= EPS && best && r.id < best.id)) { best = r; bd = d; }
  }
  return best;
}
export const standFor = (r) => ({ x: r.x + PALM.stand, y: r.y });
// 從 a 往 b 的下一段終點（不超過 seg）。
export function stepToward(a, b, max = PALM.seg) {
  const d = dist(a, b);
  if (d <= max) return { x: b.x, y: b.y };
  return { x: a.x + (b.x - a.x) * max / d, y: a.y + (b.y - a.y) * max / d };
}
// 從 a 經過一串節點的短段列表（每段 ≤ seg）。
export function legs(a, nodes, max = PALM.seg) {
  const out = [];
  let cur = { x: a.x, y: a.y };
  for (const [x, y] of nodes) {
    const to = { x, y };
    while (dist(cur, to) > EPS) { const nx = stepToward(cur, to, max); out.push(nx); cur = nx; }
  }
  return out;
}
// 返院節點：先回通道入口，再經通道回 HOME。
export const HOME_NODES = [GATE[1], GATE[0], HOME];
export const GO_NODES = [GATE[0], GATE[1]];
