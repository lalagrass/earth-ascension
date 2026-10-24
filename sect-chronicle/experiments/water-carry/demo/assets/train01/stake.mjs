// SG-TRAIN-01 練功木樁：Grok 以 Pixi Graphics 向量繪製的可編輯來源（無點陣素材）。只是道具：不是有 HP 的敵人、採木資源或建造設施。
// 色調沿水彩場景的木色／繩色（取自既有護欄 drawFence 的木樁色系），腳底在 (0,0)。
export const STAKE_SRC = 'Grok Bot 自繪向量（assets/train01/stake.mjs），SG-TRAIN-01／#305';
export function drawStake(g, flash = 0) {
  g.clear();
  g.ellipse(0, 1, 13, 4).fill({ color: 0x3b2f22, alpha: 0.22 }); // 地面陰影
  g.roundRect(-6, -54, 12, 55, 3).fill({ color: 0x8a6a45 }).stroke({ color: 0x4f3b26, width: 1.5 });
  g.rect(-6, -54, 4, 55).fill({ color: 0xa88457, alpha: 0.6 }); // 受光面
  for (const y of [-44, -30]) g.rect(-7, y, 14, 4).fill({ color: 0xc8b07a }).stroke({ color: 0x6b5634, width: 1 }); // 纏繩
  g.roundRect(-7, -58, 14, 6, 2).fill({ color: 0x6f5233 });
  if (flash > 0) g.circle(-8, -36, 10 + 6 * (1 - flash)).stroke({ color: 0xfff1c8, width: 2, alpha: flash }); // 掌觸木樁的輕微閃（只是畫面）
}
