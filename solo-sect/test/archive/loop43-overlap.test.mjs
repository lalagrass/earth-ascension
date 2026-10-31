// loop43：浮動窗不壓右欄（審查：視窗重疊）。靜態檢查 CSS 以 --pw 對齊右欄實寬。
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const css = fs.readFileSync(new URL('../../style.css', import.meta.url), 'utf8'), ui = fs.readFileSync(new URL('../../src/start-ui.mjs', import.meta.url), 'utf8');
test('--pw 等於右欄實寬（寬＋內距＋邊框）', () => {
  const pw = +css.match(/--pw:(\d+)px/)[1], m = css.match(/#panel\{width:(\d+)px;[^}]*padding:\d+px (\d+)px;[^}]*border-left:(\d+)px/);
  assert.equal(pw, +m[1] + 2 * +m[2] + +m[3]);
});
test('戰報、警示、抉擇窗皆以 --pw 讓開右欄', () => {
  assert.match(css, /#feed\{[^}]*right:calc\(var\(--pw\) \+ \d+px\)/); assert.match(css, /#alert\{[^}]*right:var\(--pw\)/);
  assert.match(ui, /#choice\{[^}]*left:calc\(\(100vw - var\(--pw, 410px\)\) \/ 2\)[^}]*max-width:min\(560px, calc\(100vw - var\(--pw, 410px\) - 32px\)\)/);
});
