// Requires git history containing the actual A20 base, plus git/tar on PATH.
import fs from 'node:fs/promises';
import path from 'node:path';
import {tmpdir} from 'node:os';
import {execFileSync} from 'node:child_process';
import {pathToFileURL,fileURLToPath} from 'node:url';
import assert from 'node:assert/strict';
import {createHomestead,loadHomestead,saveHomestead} from '../src/homestead.mjs';
const base='556e40ec5f6b18b663b6a383c60d90432b5d318c';
const root=fileURLToPath(new URL('../../',import.meta.url));
const args=process.argv.slice(2);
if(args.length&&!(args.length===2&&args[0]==='--output'))throw new Error('Usage: node homestead-frontier-compat.mjs [--output result.json]');
const output=path.resolve(args[1]||path.join(root,'solo-sect/FRONTIER-R12-COMPAT.json'));
let dir;
try{
 let archive;
 try{archive=execFileSync('git',['archive',base,'solo-sect/src'],{maxBuffer:20e6,cwd:root,stdio:['ignore','pipe','pipe']});}
 catch{throw new Error(`Compatibility check requires git and repository history containing A20 ${base}. A ZIP/shallow checkout may lack this history; obtain the base commit before rerunning. No compatibility result was produced.`);}
 dir=await fs.mkdtemp(path.join(tmpdir(),'homestead-a20-reader-'));
 const tar=path.join(dir,'source.tar');await fs.writeFile(tar,archive);execFileSync('tar',['-xf',tar,'-C',dir]);
 const old=await import(pathToFileURL(path.join(dir,'solo-sect/src/homestead.mjs')).href);
 const current=createHomestead({mode:'solo',autonomy:true,frontier:true}),classic=old.createHomestead({mode:'solo',autonomy:true}),raw=old.saveHomestead(classic);
 assert.equal(old.loadHomestead(saveHomestead(current)).ok,false);
 assert.equal(old.loadHomestead(raw).ok,true);
 const upgraded=loadHomestead(raw);assert.ok(upgraded.ok,upgraded.error);
 assert.equal(upgraded.state.version,4);assert.equal(upgraded.state.frontier,undefined);assert.equal(raw,old.saveHomestead(classic));
 const result={readerBase:base,oldA20RejectsFrontier5:true,oldA20StillReadsOwn4:true,newReadsOld4WithoutEnablingFrontier:true,sourceBytesUntouched:true};
 await fs.writeFile(output,JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify({output,...result}));
}finally{if(dir)await fs.rm(dir,{recursive:true,force:true});}
