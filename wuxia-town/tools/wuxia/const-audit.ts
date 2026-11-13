// 武俠小鎮 A1（#564）`npm run wuxia:const-audit`：data/wuxia/*.json 的每個數值都要附 `_src`。
// 規則：數值所在路徑上，任何一層的 key K 有同層兄弟 `K_src`（或群組前綴 `G_src`：K＝G＋大寫開頭的後綴，
// 例如 `arrive_src` 涵蓋 `arriveMinuteOfDay`，沿用 W4–W9 的寫法），或任何一層物件自己有 `_src`，就算有出處；
// `_src` 必須以「量測／推導／旋鈕」開頭（#562 W4-8 的三種來源）。`_` 開頭的說明欄位不算數值。
import * as fs from 'node:fs';
import * as path from 'node:path';

export const SRC_KINDS = /^(量測|推導|旋鈕)/;
export const DATA_DIR = path.resolve('data', 'wuxia'); // 從 wuxia-town/ 跑（npm script、jest 都是）

export type AuditIssue = { file: string; path: string; problem: string };

function srcOk(v: unknown): boolean {
  return typeof v === 'string' && SRC_KINDS.test(v);
}

function groupSrc(o: Record<string, unknown>, k: string): boolean {
  for (const [sk, sv] of Object.entries(o)) {
    if (!sk.endsWith('_src') || sk === '_src') continue;
    const g = sk.slice(0, -4);
    if (k.length > g.length && k.startsWith(g) && /[A-Z]/.test(k[g.length]) && srcOk(sv)) return true;
  }
  return false;
}

export function auditJson(file: string, json: unknown): AuditIssue[] {
  const issues: AuditIssue[] = [];
  const walk = (node: unknown, at: string, covered: boolean) => {
    if (typeof node === 'number') {
      if (!covered) issues.push({ file, path: at || '(根)', problem: '數值沒有 _src' });
      return;
    }
    if (Array.isArray(node)) {
      node.forEach((x, i) => walk(x, `${at}[${i}]`, covered));
      return;
    }
    if (node && typeof node === 'object') {
      const o = node as Record<string, unknown>;
      const here = covered || srcOk(o._src);
      for (const [k, v] of Object.entries(o)) {
        if (k.endsWith('_src')) {
          if (!srcOk(v)) issues.push({ file, path: `${at}.${k}`, problem: '_src 沒以「量測／推導／旋鈕」開頭' });
          continue;
        }
        if (k.startsWith('_')) continue;
        walk(v, at ? `${at}.${k}` : k, here || srcOk(o[`${k}_src`]) || groupSrc(o, k));
      }
    }
  };
  walk(json, '', false);
  return issues;
}

export function auditAll(dir = DATA_DIR): { files: number; issues: AuditIssue[] } {
  const files = fs.readdirSync(dir).filter((f) => f.endsWith('.json')).sort();
  const issues = files.flatMap((f) => auditJson(f, JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'))));
  return { files: files.length, issues };
}

if (process.argv[1]?.endsWith('const-audit.ts')) {
  const { files, issues } = auditAll();
  const byFile = new Map<string, AuditIssue[]>();
  for (const i of issues) byFile.set(i.file, [...(byFile.get(i.file) ?? []), i]);
  for (const [f, list] of byFile) {
    console.log(`${f}：${list.length} 處`);
    for (const i of list.slice(0, process.argv.includes('--all') ? Infinity : 8)) console.log(`  ${i.path} — ${i.problem}`);
  }
  console.log(issues.length ? `wuxia:const-audit FAIL：${files} 個檔、${issues.length} 處沒出處` : `wuxia:const-audit OK：${files} 個檔，每個數值都有 _src`);
  process.exit(issues.length ? 1 : 0);
}
