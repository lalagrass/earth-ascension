// mulberry32；狀態是一個 32 位元整數，存在 state 裡才能決定論重播。
export function nextRand(holder) {
  let t = (holder.rng = (holder.rng + 0x6d2b79f5) | 0);
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

export function seedHolder(seed) {
  return { rng: (seed >>> 0) ^ 0x9e3779b9 };
}

export function randInt(holder, n) {
  return Math.floor(nextRand(holder) * n);
}

export function pick(holder, arr) {
  return arr[randInt(holder, arr.length)];
}

// FNV-1a，用於狀態雜湊比對。
export function hashString(s) {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(16).padStart(8, '0');
}
