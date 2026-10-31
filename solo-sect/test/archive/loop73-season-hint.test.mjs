/* loop73：季節說明（純顯示） */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { seasonHint } from '../../src/economy.mjs';
import { DAY, SEASON_DAYS } from '../../src/data.mjs';
test('冬季寫出剩餘日數、心情 −3、飯量 ×1.2，下一季是春', () => { const h = seasonHint({ t: (3 * SEASON_DAYS + 2) * DAY + 5 }); assert.match(h, /冬季還有 5 日/); assert.match(h, /心情 -3/); assert.match(h, /飯量 ×1\.2/); assert.match(h, /之後是春/); });
test('只讀不寫', () => { const s = { t: 10 }, j = JSON.stringify(s); seasonHint(s); assert.equal(JSON.stringify(s), j); });
test('時鐘提示隨江湖面板開關', () => assert.match(readFileSync(new URL('../../src/main.mjs', import.meta.url), 'utf8'), /S\.jhui \? seasonHint\(S\) : ''/));
