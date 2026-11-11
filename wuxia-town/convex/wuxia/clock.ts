// 武俠小鎮：遊戲時鐘（#549 第 3 節）。純函式，引擎與前端共用。
// gameMinutes = (engineTime - epoch) / 1000 * timeScale / 60；規則內部一律用「遊戲分鐘」整數。
// W1 只拿來顯示時辰與日夜色調，不影響規則。

/** 遊戲分鐘 0 ＝ 第 1 日的這個時刻（分鐘）。06:00＝卯正。 */
export const DAY_START_MINUTE = 6 * 60;
export const MINUTES_PER_DAY = 24 * 60;
export const SHICHEN = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'] as const;

export function gameMinutes(engineTime: number, epoch: number, timeScale: number): number {
  return Math.floor((((engineTime - epoch) / 1000) * timeScale) / 60);
}

export type ClockReading = {
  /** 從世界開始算起的遊戲分鐘 */
  gameMinute: number;
  /** 第幾日（從 1 起算） */
  day: number;
  /** 當日 0–1439 */
  minuteOfDay: number;
  hour: number;
  minute: number;
  /** 0＝子 … 11＝亥 */
  shichenIndex: number;
  shichen: string;
  /** 「初」（時辰前半）或「正」（後半） */
  half: '初' | '正';
  /** 例：「第 1 日 卯正」 */
  label: string;
};

export function readClock(gameMinute: number): ClockReading {
  const total = gameMinute + DAY_START_MINUTE;
  const day = Math.floor(total / MINUTES_PER_DAY) + 1;
  const minuteOfDay = ((total % MINUTES_PER_DAY) + MINUTES_PER_DAY) % MINUTES_PER_DAY;
  const hour = Math.floor(minuteOfDay / 60);
  const minute = minuteOfDay % 60;
  // 子時 23:00–01:00、丑時 01:00–03:00 …
  const shichenIndex = Math.floor(((hour + 1) % 24) / 2);
  const half = (hour + 1) % 2 === 0 ? '初' : '正';
  const shichen = SHICHEN[shichenIndex];
  return {
    gameMinute,
    day,
    minuteOfDay,
    hour,
    minute,
    shichenIndex,
    shichen,
    half,
    label: `第 ${day} 日 ${shichen}${half}`,
  };
}

export type DayTint = { phase: 'night' | 'dusk' | 'dawn' | 'day'; color: number; alpha: number };

const NIGHT = { color: 0x16224a, alpha: 0.46 };
const DUSK = { color: 0xd8742c, alpha: 0.26 };
const DAWN = { color: 0xe9c79a, alpha: 0.14 };

function mix(a: number, b: number, t: number) {
  const ar = (a >> 16) & 255,
    ag = (a >> 8) & 255,
    ab = a & 255;
  const br = (b >> 16) & 255,
    bg = (b >> 8) & 255,
    bb = b & 255;
  const r = Math.round(ar + (br - ar) * t),
    g = Math.round(ag + (bg - ag) * t),
    bl = Math.round(ab + (bb - ab) * t);
  return (r << 16) | (g << 8) | bl;
}

/**
 * 日夜色調（純畫面）：夜（戌–寅，19:00–05:00）偏藍暗、黃昏（酉，17:00–19:00）偏橘、
 * 清晨（卯，05:00–07:00）淡暖，其餘白天不疊色。交界處 30 分鐘內漸變。
 */
export function dayTint(minuteOfDay: number): DayTint {
  const m = ((minuteOfDay % MINUTES_PER_DAY) + MINUTES_PER_DAY) % MINUTES_PER_DAY;
  const h = m / 60;
  const ramp = (from: number, to: number) => Math.min(1, Math.max(0, (h - from) / (to - from)));
  if (h >= 19 || h < 5) {
    // 戌時開頭 30 分鐘由黃昏漸入夜；寅時最後 30 分鐘漸亮
    if (h >= 19 && h < 19.5) {
      const t = ramp(19, 19.5);
      return { phase: 'night', color: mix(DUSK.color, NIGHT.color, t), alpha: DUSK.alpha + (NIGHT.alpha - DUSK.alpha) * t };
    }
    if (h >= 4.5 && h < 5) {
      const t = ramp(4.5, 5);
      return { phase: 'night', color: mix(NIGHT.color, DAWN.color, t), alpha: NIGHT.alpha + (DAWN.alpha - NIGHT.alpha) * t };
    }
    return { phase: 'night', ...NIGHT };
  }
  if (h >= 17) {
    const t = ramp(17, 17.5);
    return { phase: 'dusk', color: DUSK.color, alpha: DUSK.alpha * t };
  }
  if (h < 7) {
    const t = 1 - ramp(6.5, 7);
    return { phase: 'dawn', color: DAWN.color, alpha: DAWN.alpha * t };
  }
  return { phase: 'day', color: 0xffffff, alpha: 0 };
}
