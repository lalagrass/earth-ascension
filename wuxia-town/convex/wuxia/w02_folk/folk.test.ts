// 武俠小鎮 W2（#554）：人物資料、prompt 組裝、開關對照。
import places from '../../../data/wuxia/places.json';
import { FOLK } from '../../../data/wuxia/characters';
import { Descriptions } from '../../../data/characters';
import { descriptionsFor, FOLK_CHARACTERS, profileByName } from './index';
import { folkStopWords, folkSystemPrompt, reasonsZh } from './prompt';

describe('characters.json（#554 範圍 1）', () => {
  test('起始 6 人，欄位齊全，id／名字不重複', () => {
    expect(FOLK_CHARACTERS.map((c) => c.name)).toEqual([
      '林嫂',
      '石虎',
      '何郎中',
      '老韓',
      '阿青',
      '周教頭',
    ]);
    const keys = [
      'id',
      'name',
      'sprite',
      'role',
      'home',
      'workplace',
      'identity',
      'plan',
      'voice',
      'taboo',
    ];
    for (const c of FOLK_CHARACTERS) {
      for (const k of keys)
        expect(typeof (c as any)[k] === 'string' && (c as any)[k].length > 0).toBe(true);
    }
    expect(new Set(FOLK_CHARACTERS.map((c) => c.id)).size).toBe(6);
  });
  test('sprite 是古裝人物圖、home／workplace 是 places.json 的地點', () => {
    const placeIds = new Set((places as any).places.map((p: any) => p.id));
    const sprites = new Set(FOLK.map((f) => f.name));
    for (const c of FOLK_CHARACTERS) {
      expect(sprites.has(c.sprite as any)).toBe(true);
      expect(placeIds.has(c.home)).toBe(true);
      expect(placeIds.has(c.workplace)).toBe(true);
    }
  });
  test('開關：開用鎮民，關用上游', () => {
    expect(descriptionsFor(false)).toBe(Descriptions);
    expect(descriptionsFor(true).map((d) => d.character)).toEqual(
      FOLK_CHARACTERS.map((c) => c.sprite),
    );
  });
});

describe('prompt（#554 範圍 2）', () => {
  const sys = folkSystemPrompt({
    stage: 'start',
    player: { name: '石虎' },
    otherPlayer: { name: '林嫂' },
    agent: { identity: profileByName('石虎')!.identity, plan: profileByName('石虎')!.plan },
    otherAgent: { identity: profileByName('林嫂')!.identity, plan: '' },
    hasMemories: true,
    memoryWithOtherPlayer: true,
  });
  test('含繁中、古代小鎮、人物口吻、禁談、40 字、不知現代事物', () => {
    expect(sys).toContain('你是石虎，鐵匠');
    expect(sys).toContain('繁體中文');
    expect(sys).toContain('古代');
    expect(sys).toContain(profileByName('石虎')!.voice);
    expect(sys).toContain(profileByName('石虎')!.taboo);
    expect(sys).toContain('四十個字');
    expect(sys).toContain('手機');
    expect(sys).toContain('關於林嫂');
    expect(sys).toContain('上回聊過');
    expect(sys).not.toMatch(/[A-Za-z]/);
  });
  test('stop 最多 4 個；重抽理由翻成中文', () => {
    expect(folkStopWords('石虎', '林嫂').length).toBeLessThanOrEqual(4);
    expect(reasonsZh(['english', 'word:手機', 'sentence>40'])).toBe(
      '夾了英文字母、用了不該出現的詞「手機」、句子太長',
    );
  });
});
