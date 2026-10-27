// Public display anchors already drawn by the official entry. No construction,
// station reservations, indoor beds or hidden wildlife are inferred from them.
import {TEA_SEAT,WOOD_PATH,DORM,TRAIN_POSTS} from '../experiments/water-carry/demo/routes.mjs';
export function officialNavigationFacilities(places) {
 return [...Object.entries(places).map(([id,p])=>({id,label:p.label,x:p.x,y:p.y})),
  {id:'tea',label:'茶座',...TEA_SEAT.stove},
  {id:'woods',label:'林緣枯木（砍柴）',...WOOD_PATH.log},
  {id:'dorm',label:'寢舍',...DORM.site},
  {id:'woodpile',label:'院倉柴堆',...DORM.woodpile},
  ...Object.entries(TRAIN_POSTS).map(([id,p])=>({id:`training:${id}`,label:id==='hero'?'主角練功樁':'熟手練功樁',...p.stake})),
 ];
}
