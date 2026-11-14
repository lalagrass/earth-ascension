// 武俠小鎮 A4（#576）`npm run wuxia:card -- /tmp/g.json --out docs/wuxia/a4/card.png`
// 讀 wuxia:player-script（劇本腳本）輸出的 card 欄位，畫成 1200×630 PNG（Playwright 開 SVG 截圖）。檔案 > 1 MB 就失敗。
import { readFileSync, writeFileSync, mkdirSync, statSync, existsSync } from 'node:fs';
import { dirname } from 'node:path';
import { chromium } from 'playwright-core';
import { parseArgs } from './sim';
import { cardSvg, Card } from '../../src/wuxia/a4card';

const CHROME = [process.env.WUXIA_CHROME, '/usr/bin/google-chrome', '/usr/bin/chromium', '/usr/bin/chromium-browser'].filter(Boolean).find((p) => existsSync(p!));

export async function renderCard(card: Card, out: string): Promise<number> {
  const svg = cardSvg(card);
  const browser = await chromium.launch({ executablePath: CHROME, args: ['--no-sandbox'] });
  try {
    const page = await browser.newPage({ viewport: { width: 1200, height: 630 } });
    await page.setContent(`<html><body style="margin:0">${svg}</body></html>`);
    mkdirSync(dirname(out), { recursive: true });
    await page.locator('svg').screenshot({ path: out });
  } finally {
    await browser.close();
  }
  return statSync(out).size;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const input = String(args._?.[0] ?? args.in ?? '/tmp/g.json');
  const out = String(args.out ?? 'docs/wuxia/a4/card.png');
  const j = JSON.parse(readFileSync(input, 'utf8'));
  const card: Card | undefined = j.card ?? j;
  if (!card?.scenario) throw new Error(`${input}: 沒有 card 欄位（要用劇本腳本跑 wuxia:player-script）`);
  if (args.svg) writeFileSync(String(args.svg), cardSvg(card));
  const size = await renderCard(card, out);
  process.stdout.write(`${out} 1200×630 ${(size / 1024).toFixed(0)} KB；故事 ${card.story.length} 條，事件 id ${card.story.map((s) => s.id).join(',')}\n`);
  if (size > 1024 * 1024) {
    process.stdout.write('FAIL：卡片檔 > 1 MB\n');
    process.exit(1);
  }
}

if (process.argv[1]?.endsWith('card.ts')) void main();
