// loop17 山賊多樣：只在 s.m9（江湖規則「太平與備料」）時抽類型；舊局／golden 無 kind＝原樣。
// 期望點數 ≈ 原值（0.5×0.8+0.3×1.25+0.2×1.0=0.975），夜襲不能付錢、敗了只偷不傷人 → 不推高重傷。
export const RAID_KINDS = {
  liukou: { name: '流寇', w: 0.5, pts: 0.8, demand: 0.8, steal: 1, winHurt: 0.5, loseHurt: true, desc: '烏合之眾，好打發' },
  hanfei: { name: '悍匪', w: 0.3, pts: 1.25, demand: 1.3, steal: 1.2, winHurt: 1, loseHurt: true, desc: '亡命之徒，下手狠' },
  yexi: { name: '夜襲', w: 0.2, pts: 1, demand: 0, steal: 0.6, winHurt: 0.5, loseHurt: false, noPay: true, desc: '趁夜摸進來偷，不談價；只偷不傷人' },
};
export function pickKind(r) { let a = 0; for (const [id, k] of Object.entries(RAID_KINDS)) { a += k.w; if (r < a) return id; } return 'liukou'; }
export const kindOf = (id) => (id && RAID_KINDS[id]) || null;
