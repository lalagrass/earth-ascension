// 武俠小鎮 W1：8 個古裝人物的走路圖（public/wuxia/characters/folk.png，tools/wuxia/bake-folk.py 產生）。
// 格式同上游 data/spritesheets/f1.ts：每人 96×128，列序 down、left、right、up，每列 3 格 32×32。
// W4（#556）：每人多一列「打樁」2 格（面向右出拳），每人變 96×160；動畫名 punch。
// W7（#559）：每人再多一列「跪拜」1 格（面向右），每人變 96×192；動畫名 kneel。
import type { SpritesheetData } from '../spritesheets/types';

export const FOLK_TEXTURE = '/ai-town/wuxia/characters/folk.png';

export const FOLK = [
  { name: 'w1', label: '布衣男' },
  { name: 'w2', label: '短打' },
  { name: 'w3', label: '布衣女' },
  { name: 'w4', label: '老人' },
  { name: 'w5', label: '少年' },
  { name: 'w6', label: '長衫' },
  { name: 'w7', label: '郎中' },
  { name: 'w8', label: '說書人' },
] as const;

function sheet(index: number): SpritesheetData {
  const ox = (index % 4) * 96;
  const oy = Math.floor(index / 4) * 192;
  const frames: SpritesheetData['frames'] = {};
  const rows = ['down', 'left', 'right', 'up'];
  rows.forEach((dir, r) => {
    for (let c = 0; c < 3; c++) {
      frames[c === 0 ? dir : `${dir}${c + 1}`] = {
        frame: { x: ox + c * 32, y: oy + r * 32, w: 32, h: 32 },
        sourceSize: { w: 32, h: 32 },
        spriteSourceSize: { x: 0, y: 0 },
      };
    }
  });
  // W4：第 5 列打樁 2 格
  for (let c = 0; c < 2; c++) {
    frames[c === 0 ? 'punch' : `punch${c + 1}`] = {
      frame: { x: ox + c * 32, y: oy + 4 * 32, w: 32, h: 32 },
      sourceSize: { w: 32, h: 32 },
      spriteSourceSize: { x: 0, y: 0 },
    };
  }
  // W7：第 6 列跪拜 1 格
  frames.kneel = {
    frame: { x: ox, y: oy + 5 * 32, w: 32, h: 32 },
    sourceSize: { w: 32, h: 32 },
    spriteSourceSize: { x: 0, y: 0 },
  };
  return {
    frames,
    meta: { scale: '1' },
    animations: {
      ...Object.fromEntries(rows.map((d) => [d, [d, `${d}2`, `${d}3`]])),
      punch: ['punch', 'punch2'],
      kneel: ['kneel'],
    },
  };
}

export const folkCharacters = FOLK.map((f, i) => ({
  name: f.name,
  label: f.label,
  textureUrl: FOLK_TEXTURE,
  spritesheetData: sheet(i),
  speed: 0.1,
}));

/** W1 不改人物設定（W2 才改），只把上游的 f1–f8 換成古裝造型。 */
export const UPSTREAM_TO_FOLK: Record<string, string> = {
  f1: 'w1', // 布衣男
  f2: 'w2', // 短打
  f3: 'w3', // 布衣女
  f4: 'w4', // 老人
  f5: 'w5', // 少年
  f6: 'w6', // 長衫
  f7: 'w8', // 說書人
  f8: 'w7', // 郎中
};
