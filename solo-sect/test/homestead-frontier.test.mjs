import {previewTransfer} from '../src/homestead-transfer.mjs';
import test from 'node:test';import assert from 'node:assert/strict';
import {gridPath} from '../src/homestead-path.mjs';
import {createHomestead,tickHomestead,saveHomestead,loadHomestead} from '../src/homestead.mjs';
export const fresh=(personality='quiet')=>createHomestead({mode:'solo',autonomy:true,frontier:true,personality});
export function run(s,seconds){for(let i=0;i<seconds*4;i++)tickHomestead(s);return s;}
test('R1 upstream routing spike: fresh grids, blocked endpoints, no diagonal and deterministic repeats',()=>{const m=[[0,0,0],[0,1,0],[0,0,0]],p=gridPath(m,[0,1],[2,1]);assert.equal(p.length,5);for(let i=0;i<100;i++)assert.deepEqual(gridPath(m,[0,1],[2,1]),p);assert.deepEqual(gridPath(m,[1,1],[1,1]),[]);assert.deepEqual(gridPath(m,[0,0],[1,1]),[]);assert.deepEqual(gridPath([[0,1,0]],[0,0],[2,0]),[]);assert.deepEqual(gridPath(m,[0,0],[0,0]),[[0,0]]);for(let i=1;i<p.length;i++)assert.equal(Math.abs(p[i][0]-p[i-1][0])+Math.abs(p[i][1]-p[i-1][1]),1);});
test('R1 new entry preserves baseline autonomy, bounded profile and old mode',()=>{const s=run(fresh(),200);assert.equal(s.version,5);assert.ok(s.fac.hut.stage);assert.deepEqual(loadHomestead(saveHomestead(s)).state,s);const old=createHomestead({mode:'solo',autonomy:true});assert.equal(old.version,4);assert.equal(old.frontier,undefined);assert.ok(loadHomestead(saveHomestead(old)).ok);const bad=structuredClone(s);bad.frontier.approach='unknown';assert.equal(loadHomestead(saveHomestead(bad)).ok,false);});

test('R1 reviewed boundaries: old readers cannot opt into frontier, transfer refuses honestly',()=>{const s=fresh();for(const version of [1,2,3,4]){s.version=version;assert.equal(loadHomestead(saveHomestead(s)).ok,false);}s.version=5;assert.equal(previewTransfer(saveHomestead(s)).ok,false);assert.match(previewTransfer(saveHomestead(s)).error,/尚無本篇轉接/);});
