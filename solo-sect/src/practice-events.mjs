// 共用事件紀錄；保持資料與受力模組無循環依賴。
export const EVENT_LIMIT=512;
export function emitPractice(s,row){
  if(!s?.captureEvents)return;
  (s.events ||= []).push({t:s.t,day:s.day,...row});
  if(s.events.length>EVENT_LIMIT)s.events.splice(0,s.events.length-EVENT_LIMIT);
}
