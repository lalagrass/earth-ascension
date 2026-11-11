// 武俠小鎮 W0：狀態 hash 工具（#549 第 5 節）。
// hash = sha256(鍵排序 JSON(world.serialize()，含 wuxia，不含 historicalLocations))。
// 用法：
//   npx tsx tools/wuxia/hash.ts world.json      # world 文件（或 {world: ...} 的 gameState）
//   npx tsx tools/wuxia/hash.ts journal.jsonl   # 印出快照 hash 與 final 記錄的 hash
import { readFileSync } from 'node:fs';
import { stateHash } from '../../convex/wuxia/hash';
import { World } from '../../convex/aiTown/world';

export function hashWorldDoc(doc: any): string {
  const { _id, _creationTime, ...rest } = doc.world ?? doc;
  return stateHash(new World(rest).serialize());
}

function main() {
  const file = process.argv[2];
  if (!file) throw new Error('usage: hash <world.json|journal.jsonl>');
  const text = readFileSync(file, 'utf8');
  if (file.endsWith('.jsonl')) {
    for (const line of text.split('\n')) {
      if (!line.trim()) continue;
      const rec = JSON.parse(line);
      if (rec.type === 'snapshot')
        process.stdout.write(`snapshot ${hashWorldDoc(rec.gameState)}\n`);
      if (rec.type === 'final') process.stdout.write(`final ${rec.hash}\n`);
    }
  } else {
    process.stdout.write(`hash ${hashWorldDoc(JSON.parse(text))}\n`);
  }
}

if (process.argv[1]?.endsWith('hash.ts')) {
  main();
}
