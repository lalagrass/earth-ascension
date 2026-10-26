// Public-safe introductions. Not a second character-template core, and not a save record.
import { card, field, sanitizeProfile } from './contract.mjs';
import { portrait } from './portrait.mjs';

export const CATALOG_BASE = '5e7f36682272ef44190bc0d908030213e4ab8ca0';
export { sanitizeProfile };

function row(profileId, spec) {
  return [profileId, {
    visibility: 'public',
    catalog: spec.catalog,
    displayName: spec.displayName,
    work: spec.work,
    edition: spec.edition,
    storyStage: spec.storyStage,
    templateId: spec.templateId || '',
    actorId: spec.actorId || '',
    designId: spec.designId,
    skinId: '',
    portraitAssetId: spec.portraitAssetId || '',
    playable: spec.playable === true,
    shortIntro: spec.shortIntro,
    background: spec.background,
    source: spec.source,
  }];
}

const life = (profileId, spec) => row(profileId, {
  catalog: 'life', work: '本作', edition: '官方生活入口', playable: spec.playable === true,
  source: { kind: 'life', ref: '官方生活示範' }, ...spec,
});

const classic = (profileId, spec) => row(profileId, {
  catalog: 'research', edition: '公開安全版本', playable: false, actorId: '',
  designId: `research.${profileId}`, portraitAssetId: '',
  source: { kind: 'classic', ref: '十二人研究公開窗口' }, ...spec,
});

const film = (profileId, spec) => row(profileId, {
  catalog: 'research', work: '功夫', edition: '公開安全版本', playable: false, actorId: '',
  designId: `research.${profileId}`, portraitAssetId: '',
  source: { kind: 'film', ref: '功夫研究公開窗口' }, ...spec,
});

const PROFILES = Object.fromEntries([
  life('life-hero', {
    displayName: '主角', storyStage: '初學日常', actorId: 'hero', designId: 'life.hero',
    portraitAssetId: 'person.hero.sheet', playable: true,
    shortIntro: '道館裡新上手的人，日子過在挑水、採藥和練掌之間。',
    background: '從做事裡慢慢熟起來。腳力、精力和掌法以畫面上的真數值為準，這段介紹不另抄一份。',
  }),
  life('life-cousin', {
    displayName: '熟手同伴', storyStage: '已先上路的同伴', actorId: 'cousin', designId: 'life.senior-companion',
    playable: true,
    shortIntro: '先上路的熟手同伴，手腳已經熟，會在院裡跟你打招呼。',
    background: '他是生活示範裡的熟手，不是道館收養的小女孩，也不是某位經典人物。沒有專用立繪時用文字代替，不借用別人的臉。',
  }),
  life('life-girl', {
    displayName: '道館收養的小女孩', storyStage: '自小在道館長大', actorId: 'girl', designId: 'life.adopted-girl',
    portraitAssetId: 'person.adopted-girl.portrait', playable: false,
    shortIntro: '自小被道館收養，內向，說話溫柔，會鼓勵主角。',
    background: '親情和陪伴。她不是村莊裡偶爾來的堂親，介紹裡不寫戀愛，也不把別人的立繪套到她身上。正式立繪仍缺。資料就緒，生活名冊還沒有把她收成可選的人。',
  }),
  classic('guojing', {
    displayName: '郭靖', work: '射雕英雄傳', storyStage: '草原上初學的時候',
    shortIntro: '蒙古草原上長大的老實少年，吃飯香，性子韌，學會的事情就一遍遍練。',
    background: '公開介紹只寫這時的生活：跟馬、跟人學、不耍滑。後來的名頭和任何武學效果都不寫進這段，遊戲裡也沒有他的開局。',
  }),
  classic('linghuchong', {
    displayName: '令狐沖', work: '笑傲江湖', storyStage: '華山弟子、剛受點撥',
    shortIntro: '華山的弟子，愛喝酒，也愛自由，學東西常常靠看和想。',
    background: '介紹停在初學、剛受點撥的時候。不寫他後來的地位，也不把性情當成戰力。',
  }),
  classic('dongfangbubai', {
    displayName: '東方不敗', work: '笑傲江湖', storyStage: '黑木崖上外人看得到的樣子',
    shortIntro: '日月神教的教主。黑木崖上的人記得紅袍、針與線，行事極細。',
    background: '只保留外人看得到的身分與氣質。沒有在公開介紹裡說破的事，不放進這張卡，也不提供開局。',
  }),
  classic('xiaolongnv', {
    displayName: '小龍女', work: '神雕俠侶', storyStage: '古墓中的日常',
    shortIntro: '古墓裡長大的女子，話少，白衣，身邊是劍與蜂，清冷而不刺人。',
    background: '寫出身和氣質。師門舊怨、後來的離合都不寫成必然。她不是電影裡被叫做小龍女的另一個人。',
  }),
  classic('limochou', {
    displayName: '李莫愁', work: '神雕俠侶', storyStage: '已在江湖上成名',
    shortIntro: '人稱赤練仙子，掌與針都很有名，性情烈，心裡擱著放不下的舊事。',
    background: '只寫已公開的名號與印象。毒物怎麼配、會不會在遊戲裡生效，都沒有可執行配置，介紹不承諾。',
  }),
  classic('huangrong', {
    displayName: '黃蓉', work: '射雕英雄傳', storyStage: '桃花島上長大',
    shortIntro: '桃花島上長大的姑娘，機靈，嘴快，點子多，也做得來島上的生活手藝。',
    background: '機靈是性情，不是一項數值。她會的東西以各版真實記錄為準，這張卡不另開能力表。',
  }),
  classic('azi', {
    displayName: '阿紫', work: '天龍八部', storyStage: '離開星宿後四處看',
    shortIntro: '從星宿派出來的少女，好奇心重，對毒與小機關特別有興趣。',
    background: '興趣不等於樣樣精通。介紹不把門派功法整包算成她已經會的武學。',
  }),
  classic('wangyuyan', {
    displayName: '王語嫣', work: '天龍八部', storyStage: '熟讀典籍、很少下場',
    shortIntro: '讀過許多武學典籍的女子，說得清招式來歷，自己很少下場動手。',
    background: '知道和做得到是兩件事。沒有文獻範圍的實測，介紹不把博學寫成戰力。',
  }),
  classic('chenglingsu', {
    displayName: '程靈素', work: '飛狐外傳', storyStage: '跟著醫毒傳承行醫',
    shortIntro: '跟著醫毒傳承長大的姑娘，看病人細，配藥也細，出手是為了救人。',
    background: '動機、知識和手法分開。沒有配方配置，介紹不寫療效。',
  }),
  classic('xuzhu', {
    displayName: '虛竹', work: '天龍八部', storyStage: '少林裡的公開日子',
    shortIntro: '少林的小和尚，性子軟，遇到爭鬥先想著別傷人。',
    background: '只寫看得到的出家人日子。後來得到的本事沒有接到本作，介紹不列效果，也不回填出生資質。',
  }),
  classic('zhoubotong', {
    displayName: '周伯通', work: '射雕英雄傳', storyStage: '已經玩出名堂的長輩',
    shortIntro: '人稱老頑童，閒不住，愛找人玩，也愛自己跟自己較勁。',
    background: '玩心是這個人的味道。左右手各做各的事只是人們認識他的方式，不是本作裡的增益。',
  }),
  classic('duanyu', {
    displayName: '段譽', work: '天龍八部', storyStage: '不想練武的初學',
    shortIntro: '大理來的讀書人，不想練武，腳步倒靈，遇事先想溜。',
    background: '願意練和不願意練是兩件事。介紹不保證他出得了哪一招。',
  }),
  film('axing', {
    displayName: '阿星', storyStage: '豬籠城寨裡耍帥的日子',
    shortIntro: '巷子裡愛耍帥的年輕人，鼻子常青，嘴硬，心裡卻熱。',
    background: '只寫他在街坊的樣子。後來的轉變和不存在的開局能力都不寫進來。',
  }),
  film('baozupo', {
    displayName: '包租婆', storyStage: '巷子裡當房東',
    shortIntro: '這條巷子的房東，嗓門亮，護著街坊，催租也不含糊。',
    background: '嗓門和性情是生活，不是已經交到遊戲裡的一門功法。她不是小說裡的小龍女。',
  }),
  film('baozugong', {
    displayName: '包租公', storyStage: '巷子裡收租的長輩',
    shortIntro: '懶洋洋的街坊長輩，收租時能坐著就絕不站著。',
    background: '公開介紹只寫這個懶散的日常。沒有說破的本事不放進卡裡。',
  }),
  film('kulijiang', {
    displayName: '苦力強', storyStage: '以搬運為生',
    shortIntro: '扛貨的漢子，話少，一肩走過去，巷子都得讓一讓。',
    background: '搬運是看得到的生活。沒有在這張卡上說破的身分，保持不說。',
  }),
  film('caifeng', {
    displayName: '裁縫', storyStage: '鋪子裡做衣裳',
    shortIntro: '鋪子裡縫衣的人，性子慢，說話也輕，衣服卻縫得很齊。',
    background: '手藝是做衣服。別的本事若沒有公開寫在這段，就還沒有對玩家說。',
  }),
  film('youzhagui', {
    displayName: '油炸鬼', storyStage: '早餐攤上',
    shortIntro: '賣早餐的，油鍋響，人也不閒著，笑起來滿臉熱氣。',
    background: '烹飪是這份公開生活。工具和別的技藝沒有接到本作，介紹不寫效果。',
  }),
  film('huoyunxieshen', {
    displayName: '火雲邪神', storyStage: '公開找人比試',
    shortIntro: '專程找人打架的怪客，樣子唬人，嘴上也唬人。',
    background: '好戰是人們認識他的方式。不把他的名字當成另一部小說裡的同名人物，也不給數值。',
  }),
  film('tiancan', {
    displayName: '天殘', storyStage: '與地缺一同出現',
    shortIntro: '和地缺一起行動的人，負責琴音那一邊。',
    background: '兩人是一對，介紹仍各寫各的，不併成一個人的能力。沒有各自的立繪，也不用別人的臉代替。',
  }),
  film('dique', {
    displayName: '地缺', storyStage: '與天殘一同出現',
    shortIntro: '和天殘一起行動的人，負責把曲子接上。',
    background: '與天殘成對出現。缺一人時本作沒有可執行的合奏，介紹不假裝已經能打。',
  }),
]);

const BY_ACTOR = {
  'dev:hero': 'life-hero',
  'gemini:hero': 'life-hero',
  'dev:cousin': 'life-cousin',
  'gemini:cousin': 'life-cousin',
  'dev:girl': 'life-girl',
  'gemini:girl': 'life-girl',
};

export function publicProfile(profileId) {
  const raw = PROFILES[profileId];
  return raw ? sanitizeProfile({ ...raw, profileId }) : null;
}

export function profileForBranchActor(branch, actorId) {
  const id = BY_ACTOR[`${branch}:${actorId}`];
  return id ? publicProfile(id) : null;
}

export function listProfiles() {
  return Object.keys(PROFILES).map((profileId) => ({ ...publicProfile(profileId), catalog: PROFILES[profileId].catalog, work: PROFILES[profileId].work }));
}

export function presentCard(profileId) {
  const profile = publicProfile(profileId);
  if (!profile) return null;
  const artActor = profile.actorId || profileId;
  const source = `research:${CATALOG_BASE}:profiles.${profileId}`;
  const absent = (id) => field(id, null, { source, availability: 'unsupported' });
  return card({
    branch: 'research',
    sha: CATALOG_BASE,
    actorId: artActor,
    identity: { name: profile.displayName, role: profile.storyStage || '公開簡介', portrait: portrait('dev', artActor) },
    action: {
      id: 'none', current: '沒有本局行動', reason: absent('action.reason'), next: null, phase: 'idle', target: null,
      progress: absent('action.progress'), stopReason: absent('action.stopReason'),
    },
    fields: [],
    profile,
  });
}
