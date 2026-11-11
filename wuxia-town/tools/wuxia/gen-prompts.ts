// 武俠小鎮 W2（#554）：把 data/wuxia/prompts/*.txt 與 data/wuxia/anachronisms.txt 轉成
// convex/wuxia/w02_folk/prompts.gen.ts（Convex 打包與 jest 都不能直接 import .txt）。
// 用法：npm run wuxia:gen-prompts            → 重寫產生檔
//       npm run wuxia:gen-prompts -- --check → 只檢查是否同步（wuxia:check 第 8 項），不同步 exit 1
import { readdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

// 從 wuxia-town/ 根目錄執行（npm script 與 jest 都是）；jest 的 ts 設定不吃 import.meta。
const ROOT = process.cwd();
if (!existsSync(join(ROOT, 'data/wuxia/prompts'))) {
  throw new Error('gen-prompts: 請在 wuxia-town/ 目錄下執行');
}
export const GEN_PATH = join(ROOT, 'convex/wuxia/w02_folk/prompts.gen.ts');

export function parseWordList(text: string): string[] {
  return text
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l !== '' && !l.startsWith('#'));
}

export function generatePrompts(): string {
  const dir = join(ROOT, 'data/wuxia/prompts');
  const prompts: Record<string, string> = {};
  for (const f of readdirSync(dir)
    .filter((f) => f.endsWith('.txt'))
    .sort()) {
    prompts[f.replace(/\.txt$/, '')] = readFileSync(join(dir, f), 'utf8').replace(/\s+$/, '');
  }
  const words = parseWordList(readFileSync(join(ROOT, 'data/wuxia/anachronisms.txt'), 'utf8'));
  return [
    '// 產生檔，不要手改：改 data/wuxia/prompts/*.txt 或 data/wuxia/anachronisms.txt 後執行 npm run wuxia:gen-prompts。',
    `export const PROMPTS: Record<string, string> = ${JSON.stringify(prompts, null, 2)};`,
    `export const ANACHRONISMS: string[] = ${JSON.stringify(words, null, 2)};`,
    '',
  ].join('\n');
}

export function promptsInSync(): boolean {
  return existsSync(GEN_PATH) && readFileSync(GEN_PATH, 'utf8') === generatePrompts();
}

if (process.argv[1]?.endsWith('gen-prompts.ts')) {
  if (process.argv.includes('--check')) {
    if (!promptsInSync()) {
      process.stdout.write('prompts.gen.ts 跟 data/wuxia/prompts、anachronisms.txt 不同步\n');
      process.exit(1);
    }
    process.stdout.write('prompts.gen.ts in sync\n');
  } else {
    writeFileSync(GEN_PATH, generatePrompts());
    process.stdout.write(`wrote ${GEN_PATH}\n`);
  }
}
