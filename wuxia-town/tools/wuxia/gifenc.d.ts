// W6：gifenc（MIT）沒有附型別；只宣告 shot-gif.ts 用到的部分。
declare module 'gifenc' {
  const gifenc: { GIFEncoder: typeof GIFEncoder; quantize: typeof quantize; applyPalette: typeof applyPalette };
  export default gifenc;
  export function GIFEncoder(): {
    writeFrame(index: Uint8Array, width: number, height: number, opts: { palette: number[][]; delay?: number }): void;
    finish(): void;
    bytes(): Uint8Array;
  };
  export function quantize(rgba: Uint8Array | Buffer, maxColors: number): number[][];
  export function applyPalette(rgba: Uint8Array | Buffer, palette: number[][]): Uint8Array;
}
