// HOME-01：把 runtime 權威幾何（只讀）倒成 JSON 給 Pillow 烘焙地面；不另存第二份座標。
import { WATER_POINTS, SPRING_PLACE, WORLD_SIZE } from '../../../demo/water-layout.mjs';
import { HERB, SEATS, FUN, GUARD, DRINK, MEET, TRAIN_POSTS, TEA_SEAT, BOAR } from '../../../demo/routes.mjs';
import { LEAD, MAIN } from '../../../demo/patrol-layout.mjs';
import { HOME, GO_NODES, RATS } from '../../../demo/palm.mjs';
import * as L from '../../../demo/scene/layout.mjs';
import { STREAM_POLY } from '../../../demo/assets/long-water/scenery.mjs';
const out = {
  world: WORLD_SIZE, home: HOME, spring: SPRING_PLACE, stream: STREAM_POLY,
  paths: { water: WATER_POINTS, herb: HERB.points, seatH: SEATS.hero.points, seatC: SEATS.cousin.points, funH: FUN.hero.points, funC: FUN.cousin.points,
    guard: GUARD.points, drink: DRINK.points, meetH: MEET.hero.points, meetC: MEET.cousin.points, trainH: TRAIN_POSTS.hero.points, trainC: TRAIN_POSTS.cousin.points,
    tea: TEA_SEAT.points, lead: LEAD, main: MAIN, gate: [HOME, ...GO_NODES], ...L.DECOR_PATHS },
  boarPath: BOAR.points, fence: BOAR.fence, rats: RATS, tea: TEA_SEAT,
  yard: L.YARD_POLY, streamUp: L.STREAM_UP, streamDown: L.STREAM_DOWN, streamOut: L.STREAM_OUT, pool: L.POOL, oldPond: L.OLD_POND,
  forest: L.FOREST, rocky: L.ROCKY, washes: L.WASHES, bank: L.SPRING_BANK, mouth: L.SPRING_MOUTH, bridge: L.BRIDGE,
};
process.stdout.write(JSON.stringify(out));
