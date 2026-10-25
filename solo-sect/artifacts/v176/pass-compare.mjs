// 傳功前後：以 s.passed 計（v1.75 報告用 log 計，log 只留 60 筆）
import fs from 'node:fs';
const A = JSON.parse(fs.readFileSync('artifacts/v176/extra-before-v175code.json')).cases, B = JSON.parse(fs.readFileSync('artifacts/v176/extra-dao-on.json')).cases;
const sum = (X, f) => X.reduce((a, c) => a + f(c), 0);
const r = (X) => ({ passCompleted: sum(X, (c) => c.final.pass), passLogHits: sum(X, (c) => c.final.passLog), leadStarts: sum(X, (c) => (c.passEnds?.['lead:do'] || 0) + (c.passEnds?.['lead:go'] || 0)), leadEndedInDo: sum(X, (c) => c.passEnds?.['lead:do'] || 0), leadEndedInGo: sum(X, (c) => c.passEnds?.['lead:go'] || 0), taskStartsBothSides: sum(X, (c) => c.acts.pass || 0), brew: sum(X, (c) => c.acts.brew || 0), masters: sum(X, (c) => c.final.masters) });
const out = { before: r(A), after: r(B) }; fs.writeFileSync('artifacts/v176/pass-compare.json', JSON.stringify(out, null, 1)); console.log(JSON.stringify(out, null, 1));
