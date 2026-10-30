// loop21 武俠人物原型：只借「性格／資質」的公開印象，人物一律只標「參考」；不用任何立繪、不借臉。
// 主角：自創時可選原型＝一組合法六項點數＋兩個明面特質（價值觀與暗特質仍看九問）。
// 招募：江湖規則「人以群分」（s.draw）開時，新弟子抽一個原型，根骨／悟性落在原型附近（±1），原型首特質補為暗特質。
export const ARCH = {
  kulian: { name: '苦練憨直', ref: '郭靖', stats: { wu: 1, gen: 5, li: 3, shen: 1, ding: 2, fu: 1 }, traits: ['honest', 'diligent'], desc: '悟性低、根骨好，肯下笨功夫' },
  caizi: { name: '灑脫才子', ref: '令狐沖', stats: { wu: 5, gen: 2, li: 1, shen: 2, ding: 1, fu: 1 }, traits: ['free', 'sociable'], desc: '悟性極高，愛交朋友，不拘一格' },
  renhou: { name: '仁厚溫和', ref: '張無忌', stats: { wu: 3, gen: 4, li: 1, shen: 1, ding: 2, fu: 1 }, traits: ['gentle', 'worrier'], desc: '根骨好、心軟，愛照顧人，常多慮' },
  jiling: { name: '機靈百變', ref: '黃蓉', stats: { wu: 4, gen: 2, li: 1, shen: 3, ding: 1, fu: 1 }, traits: ['playful', 'sociable'], desc: '聰明身輕，愛往外跑、愛說話' },
  haomai: { name: '豪邁俠客', ref: '喬峰', stats: { wu: 2, gen: 3, li: 4, shen: 1, ding: 1, fu: 1 }, traits: ['brave', 'optimist'], desc: '力大膽大，天塌下來也笑' },
  laowan: { name: '天真頑童', ref: '周伯通', stats: { wu: 4, gen: 3, li: 1, shen: 2, ding: 1, fu: 1 }, traits: ['playful', 'glutton'], desc: '貪玩貪吃，悟性不差' },
};
export const isArch = (id) => !!ARCH[id];
export const archLabel = (id) => (isArch(id) ? `${ARCH[id].name}（參考：${ARCH[id].ref}）` : '');
const clamp15 = (x) => Math.max(1, Math.min(5, x));
// 招募用：r() 為 0–1 亂數
export function archRecruit(r) { const ids = Object.keys(ARCH), id = ids[Math.floor(r() * ids.length)], A = ARCH[id];
  return { id, root: clamp15(A.stats.gen + Math.floor(r() * 3) - 1), wu: clamp15(A.stats.wu + Math.floor(r() * 3) - 1), trait: A.traits[0] }; }
