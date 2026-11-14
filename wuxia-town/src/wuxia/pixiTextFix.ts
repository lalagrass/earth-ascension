// 武俠小鎮 A5（#577 第 4 節，驗收 A3 掛機記憶體）：@pixi/react 7 卸載元件時呼叫 destroy({ texture: false, baseTexture: false })，
// 但 PIXI.Text 的貼圖是自己用 Texture.from(canvas) 建的（放進全域貼圖快取），不一起銷毀就永遠留著：
// 64× 掛機時人物頭上的字（活動、泡泡）每分鐘掛載／卸載數百次，canvas 與 GL 貼圖一直累積（renderer RSS 每 5 分鐘 +150 MB）。
// Text 的貼圖只屬於它自己，這裡讓 Text 卸載時一律連貼圖一起銷毀（等同 PIXI 對 Text 的預設）。只 import 一次即可。
import * as PIXI from 'pixi.js';

const FLAG = '__wuxiaTextDestroyFix';
const proto = PIXI.Text.prototype as any;
if (!proto[FLAG]) {
  const orig = proto.destroy;
  proto.destroy = function (options?: boolean | Record<string, unknown>) {
    const o = typeof options === 'boolean' ? { children: options } : { ...(options ?? {}) };
    return orig.call(this, { ...o, texture: true, baseTexture: true });
  };
  proto[FLAG] = true;
}
