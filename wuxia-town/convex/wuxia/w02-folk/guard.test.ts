// 武俠小鎮 W2（#554 驗收）：npm test -- guard
// 守門單元測試：禁用詞、英文、簡體常見詞、長度，以及「重抽一次 → 模板句」的流程。
import { checkReply, countChars, guardedReply, MAX_SENTENCE_CHARS, normalizeReply } from './guard';
import { ANACHRONISMS } from './prompts.gen';
import { FOLK_CHARACTERS, TEMPLATES, folkTemplate } from './index';

describe('guard: 禁用詞', () => {
  test.each(['手機', '咖啡', '電腦', '你好嗎', '汽車', '網路', '上班', '公司'])('%s', (w) => {
    const r = checkReply(`林嫂說今天${w}的事可多了。`);
    expect(r.ok).toBe(false);
    expect(r.reasons).toContain(`word:${w}`);
  });
  test('老闆你好嗎（#554 舉例）不合格', () => {
    expect(checkReply('老闆你好嗎？').ok).toBe(false);
  });
  test('禁用詞表約 100 個以上，且沒有空字串', () => {
    expect(ANACHRONISMS.length).toBeGreaterThanOrEqual(100);
    expect(ANACHRONISMS.every((w) => w.trim() === w && w.length > 0)).toBe(true);
  });
  test('古風句子通過', () => {
    for (const s of [
      '客官裡邊請，今兒的茶是新採的。',
      '嗯。成。',
      '依老夫看，這傷得靜養三日，切記不可動武。',
      '話說那年大雪封山，鎮上來了個怪人……',
    ]) {
      expect(checkReply(s)).toEqual({ ok: true, reasons: [] });
    }
  });
});

describe('guard: 英文', () => {
  test.each(['OK，就這樣。', '好的 ok', '你真是個 nice 的人', '我們ＯＫ吧', 'Lucky 來了'])(
    '%s',
    (s) => {
      expect(checkReply(s).reasons).toContain('english');
    },
  );
  test('阿拉伯數字不算英文', () => {
    expect(checkReply('三兩銀子，不，3 兩也成。').reasons).not.toContain('english');
  });
});

describe('guard: 簡體常見詞', () => {
  test.each([
    ['这个人真奇怪。', '这'],
    ['你说什么？', '说'],
    ['我没有钱。', '没'],
    ['他们都走了。', '们'],
    ['时候不早了。', '时'],
    ['谢谢你。', '谢'],
  ])('%s', (s, w) => {
    expect(checkReply(s).reasons).toContain(`word:${w}`);
  });
  test('繁體同義句通過', () => {
    for (const s of [
      '這個人真奇怪。',
      '你說什麼？',
      '我沒有錢。',
      '他們都走了。',
      '時候不早了。',
      '謝謝你。',
    ]) {
      expect(checkReply(s).ok).toBe(true);
    }
  });
});

describe('guard: 長度', () => {
  const forty = '甲'.repeat(MAX_SENTENCE_CHARS);
  test('一句 40 字可以，41 字不行', () => {
    expect(checkReply(`${forty}。`).ok).toBe(true);
    expect(checkReply(`${forty}乙。`).reasons).toContain('sentence>40');
  });
  test('標點與空白不算字', () => {
    expect(countChars('嗯，成！ 好。')).toBe(3);
  });
  test('多句各自不超過 40 字可以；整則超過 120 字不行', () => {
    const s20 = '乙'.repeat(20) + '。';
    expect(checkReply(s20.repeat(6)).ok).toBe(true);
    expect(checkReply(s20.repeat(7)).reasons).toContain('reply>120');
  });
  test('空回覆不行', () => {
    expect(checkReply(' 。').reasons).toContain('empty');
  });
});

describe('guard: 清理（不放寬判定）', () => {
  test('去掉「某某對某某說：」前綴、引號，截掉替對方接的話', () => {
    expect(normalizeReply('林嫂對石虎說：「哎喲，好久不見呢。」', '林嫂')).toBe(
      '哎喲，好久不見呢。',
    );
    expect(normalizeReply('林嫂：來喝茶。', '林嫂')).toBe('來喝茶。');
    expect(normalizeReply('來喝茶。\n石虎對林嫂說：嗯。', '林嫂')).toBe('來喝茶。');
  });
  test('清理後仍含英文就不合格', () => {
    expect(checkReply(normalizeReply('林嫂對石虎說：OK 啦', '林嫂')).ok).toBe(false);
  });
});

describe('guardedReply：重抽一次 → 模板句', () => {
  const template = () => '模板句。';
  const seq = (...xs: Array<string | null>) => {
    let i = 0;
    const calls: Array<string[] | undefined> = [];
    return {
      calls,
      generate: async (reasons?: string[]) => {
        calls.push(reasons);
        const x = xs[i++];
        return x === null ? { content: '', fallback: true } : { content: x, fallback: false };
      },
    };
  };
  test('第一次就過 → pass', async () => {
    const g = seq('客官請坐。');
    const r = await guardedReply({ generate: g.generate, template });
    expect(r).toEqual({
      text: '客官請坐。',
      metadata: { guard: 'pass', reasons: [], attempts: 1 },
    });
  });
  test('第一次含英文、第二次過 → retry，重抽時帶上理由', async () => {
    const g = seq('Hello，客官。', '客官請坐。');
    const r = await guardedReply({ generate: g.generate, template });
    expect(r.text).toBe('客官請坐。');
    expect(r.metadata.guard).toBe('retry');
    expect(g.calls).toEqual([undefined, ['english']]);
  });
  test('兩次都不合格 → template（rejected）', async () => {
    const g = seq('手機呢？', '喝杯咖啡吧。');
    const r = await guardedReply({ generate: g.generate, template });
    expect(r.text).toBe('模板句。');
    expect(r.metadata).toEqual({
      guard: 'template',
      reasons: [['word:手機'], ['word:咖啡']],
      attempts: 2,
      cause: 'rejected',
    });
  });
  test('LLM 失敗或超過預算 → 直接 template，不重抽', async () => {
    const g = seq(null, '不該被呼叫。');
    const r = await guardedReply({ generate: g.generate, template });
    expect(r.metadata).toMatchObject({ guard: 'template', attempts: 1, cause: 'llm-fallback' });
    expect(g.calls.length).toBe(1);
  });
  test('第一次太慢（retryAllowed=false）→ 不重抽，template', async () => {
    const g = seq('OK', '客官請坐。');
    const r = await guardedReply({ generate: g.generate, template, retryAllowed: () => false });
    expect(r.metadata).toMatchObject({ guard: 'template', attempts: 1, cause: 'no-retry' });
  });
});

describe('模板句本身都過守門', () => {
  test('6 位鎮民＋default 各有 start／continue／leave 至少 5 句，全部合格', () => {
    for (const c of FOLK_CHARACTERS) expect(TEMPLATES[c.id]).toBeDefined();
    for (const [id, set] of Object.entries(TEMPLATES)) {
      for (const stage of ['start', 'continue', 'leave'] as const) {
        expect(set[stage].length).toBeGreaterThanOrEqual(5);
        for (const t of set[stage]) {
          const filled = t.replace(/\{other\}/g, '何郎中');
          const r = checkReply(filled);
          if (!r.ok) throw new Error(`${id}.${stage}「${t}」不合格：${r.reasons.join(',')}`);
        }
      }
    }
  });
  test('folkTemplate 依人物挑句，不認識的人用 default；avoid 會換下一句', () => {
    expect(TEMPLATES['shi-hu'].continue).toContain(
      folkTemplate('石虎', 'continue', 0, { other: '林嫂' }),
    );
    expect(TEMPLATES.default.start.map((t) => t.replace('{other}', '某甲'))).toContain(
      folkTemplate('路人', 'start', 0.5, { other: '某甲' }),
    );
    const first = folkTemplate('石虎', 'continue', 0, { other: '林嫂' });
    expect(folkTemplate('石虎', 'continue', 0, { other: '林嫂' }, first)).not.toBe(first);
  });
});
