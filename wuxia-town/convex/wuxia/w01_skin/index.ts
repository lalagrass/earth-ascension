// 武俠小鎮 W1：換皮成山腳古鎮（#553，元素 id `w01-skin`）。
// 規則一行不改：這個元素沒有 tick，只決定建世界時用哪張地圖；人物圖、地點名、時辰與日夜都在前端。
// 關掉時用回上游原版地圖（data/gentle.js）與人物（需要本機下載的上游素材）。
import * as gentle from '../../../data/gentle';
import * as town from '../../../data/wuxia/town-map';
import type { SerializedWorldMap } from '../../aiTown/worldMap';
import type { WuxiaElement } from '../registry';

export const W01_SKIN = 'w01-skin';

export const skinElement: WuxiaElement = { id: W01_SKIN };

type MapModule = {
  mapwidth: number;
  mapheight: number;
  tilesetpath: string;
  tilesetpxw: number;
  tilesetpxh: number;
  tiledim: number;
  bgtiles: number[][][];
  objmap: number[][][];
  animatedsprites: any[];
};

export function mapModuleFor(enabled: Record<string, boolean>): MapModule {
  return (enabled[W01_SKIN] ? town : gentle) as unknown as MapModule;
}

/** 建世界時寫進 maps 表的地圖（init.ts 與無頭模擬共用）。 */
export function serializedMapFor(enabled: Record<string, boolean>): SerializedWorldMap {
  const map = mapModuleFor(enabled);
  return {
    width: map.mapwidth,
    height: map.mapheight,
    tileSetUrl: map.tilesetpath,
    tileSetDimX: map.tilesetpxw,
    tileSetDimY: map.tilesetpxh,
    tileDim: map.tiledim,
    bgTiles: map.bgtiles,
    objectTiles: map.objmap,
    animatedSprites: map.animatedsprites,
  };
}
