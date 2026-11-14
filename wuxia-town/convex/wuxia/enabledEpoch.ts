// 武俠小鎮 A1：元素開關快取的「世代」（#564 審查第 2 項，效能）。
// registry 的 isEnabled 快取在同一個世代內不重看 state.enabled；每個 tick 開始、每個 input 處理前、
// 以及任何改 state.enabled 的地方都要呼叫 bumpEnabledEpoch()，下一次查詢就會重看。純快取，不進狀態、不影響 hash。
let epoch = 0;
export function bumpEnabledEpoch(): void {
  epoch++;
}
export function enabledEpoch(): number {
  return epoch;
}
