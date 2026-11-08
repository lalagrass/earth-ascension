#!/usr/bin/env node
// R1（#519）與 R4（#520）：核對隱居數值的分類、理由與出處；純靜態，不改模擬。
import fs from 'node:fs';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const manifest = JSON.parse(fs.readFileSync(new URL('../docs/systems/hermitage-constant-audit.json', import.meta.url), 'utf8'));
const digest = (line) => crypto.createHash('sha256').update(line.trim()).digest('hex');
const literals = (line) => {
  const code = line.replace(/(['"`])(?:\\.|(?!\1).)*?\1/g, '""').replace(/\/\*.*?\*\//g, '').split('//')[0];
  return [...code.matchAll(/(?<![\w$])\d+(?:\.\d+)?(?:[eE][+-]?\d+)?(?![\w])/g)].map((m) => m[0]).filter((v) => v !== '0' && v !== '1');
};
const files = [...new Set([...manifest.entries.map((entry) => entry.file), ...(manifest.scanFiles || [])])];
const source = new Map(files.map((file) => [file, fs.readFileSync(`${root}${file}`, 'utf8').split('\n')]));
const indexed = new Map(manifest.entries.map((entry) => [`${entry.file}:${entry.sha256}`, entry]));
const untagged = [];
const active = new Set();
let present = 0;
for (const [file, lines] of source) {
  let inOpening = false;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i], values = literals(line), entry = indexed.get(`${file}:${digest(line)}`);
    if (file === 'src/data.mjs' && line.includes('export const OPENING_SCENARIOS')) inOpening = true;
    if (entry) {
      present++; active.add(`${file}:${entry.sha256}`);
      if (values.join(',') !== entry.values.join(',') || (entry.valueGroups && entry.valueGroups.length !== values.length)
        || [...new Set([entry.group, ...(entry.valueGroups || [])])].some((group) => !manifest.groups[group]?.reason || !manifest.groups[group]?.source)) untagged.push(`${file}:${i + 1} 數值、分類理由或來源不符`);
    } else if (values.length && (/出自 Phase [4-7]|Phase [4-7]：|R4/.test(line) || inOpening)) {
      untagged.push(`${file}:${i + 1} ${values.join(', ')}`);
    }
    if (inOpening && line.trim() === '});') inOpening = false;
  }
}
const knobs = manifest.entries.filter((entry) => active.has(`${entry.file}:${entry.sha256}`)).flatMap((entry) => entry.values.flatMap((value, i) => {
  const group = entry.valueGroups?.[i] || entry.group;
  return manifest.groups[group].category === '設計旋鈕' ? [{ file: entry.file, line: entry.sha256, value, group, source: manifest.groups[group].source }] : [];
}));
const report = { scanned: manifest.entries.length, present, retired: manifest.entries.length - present, untagged,
  knobLines: new Set(knobs.map((knob) => `${knob.file}:${knob.line}`)).size, knobLiterals: knobs.length, knobs };
if (process.argv.includes('--json')) console.log(JSON.stringify(report, null, 2));
else {
  console.log(`隱居常數：${present}/${manifest.entries.length} 列仍在程式；設計旋鈕 ${report.knobLines} 列／${report.knobLiterals} 個數值；未標 ${untagged.length}。`);
  for (const missing of untagged) console.log(`未標 ${missing}`);
  if (process.argv.includes('--list')) for (const knob of report.knobs) console.log(`${knob.file} ${knob.value}｜${knob.group}｜${knob.source}`);
}
if (untagged.length || (process.argv.includes('--strict') && report.retired)) process.exitCode = 1;
