// Shared immutable action/position definitions, no simulation imports.
export const DAY = 240;
export const HOME = [445, 345];
export const PLACES = { berries: [155, 340], wood: [730, 250], herbs: [145, 185], herbGarden: [135, 90], meeting:[650,345],practice:[500,350],encounter:[500,350], fence:[750,345], visitor: [825, 450], hut: [440, 225], garden: [270, 170], kitchen: [605, 365], store: [555, 470], bench: [352, 412], flowers: [340, 300], bed: [440, 225], workbench: [675, 470] };
export const LIFE_ACTIONS = {
  forage: { skill: 'gather', name: '採野果', place: 'berries', duration: 6, energy: 5 },
  chop: { skill: 'gather', name: '砍柴', place: 'wood', duration: 7, energy: 7 },
  eat: { name: '吃東西', place: 'home', duration: 2 },
  rest: { name: '歇息', place: 'hut' },
  build: { skill: 'build', name: '搬料與施工', place: 'hut' },
  closeGate:{name:'扣上木門',place:'fence',duration:1,internal:true},
  settle: {name:'挑選家名與配色',place:'hut',duration:6,internal:true},
  leisure: { name: '閒坐看雲', place: 'home', duration: 8 },
  farm: { skill: 'farm', name: '照料菜園', place: 'garden', duration: 7, energy: 5 },
  cook: { skill: 'cook', name: '煮飯', place: 'kitchen', duration: 8, energy: 4 },
  herbal: { name: '採草藥', place: 'herbs', duration: 7, energy: 5 },
  herbFarm: { name: '照料藥田', place: 'herbGarden', duration: 7, energy: 5 },
  selfCare: { name: '草藥調養自己', place: 'home', duration: 3 },
  helperCare: { name: '草藥調養幫手', place: 'home', duration: 3 },
  chat: { name: '談天', place: 'visitor', duration: 5 },
  talkHelper: { name: '與幫手談天', place: 'home', duration: 5 },
  gift: { name: '送熱飯', place: 'visitor', duration: 4 },
  care: { name: '照料扭傷', place: 'visitor', duration: 6 },
};
