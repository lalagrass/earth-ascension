import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { pin as gemini } from '../pins/gemini.mjs';
import { pin as gpt } from '../pins/gpt.mjs';
import { pin as grok } from '../pins/grok.mjs';
import { validateManifest, resolveAsset } from '../resolve.mjs';
export const pins = { gemini, gpt, grok };
const root = new URL('../../../../', import.meta.url);
const digest = data => createHash('sha256').update(data).digest('hex');
export async function verifyLocal(pin) {
  const errors = validateManifest(pin.manifest);
  if (digest(JSON.stringify(pin.manifest)) !== pin.expectedSha256) errors.push('pin: manifest digest changed; publish a new version and explicitly repin this branch');
  const entries = [];
  for (const a of pin.manifest.assets) {
    if (a.availability !== 'known') { entries.push({ assetId:a.assetId, status:'missing', fallback:a.fallback }); continue; }
    try {
      const data = await readFile(new URL(a.path,root));
      if (digest(data) !== a.sha256) errors.push(`${a.assetId}: bytes differ from pin`);
      if (data.subarray(0,8).toString('hex') !== '89504e470d0a1a0a' || data.readUInt32BE(16) !== a.dimensions.width || data.readUInt32BE(20) !== a.dimensions.height || (data[25]===6) !== a.alpha.channel) errors.push(`${a.assetId}: PNG dimensions/alpha differ`);
      if (a.recipe.metadataPath) {
        const metadata = await readFile(new URL(a.recipe.metadataPath,root));
        const atlas = JSON.parse(metadata);
        if (digest(metadata) !== a.recipe.metadataSha256 || JSON.stringify(atlas.frames[a.recipe.frame]?.frame) !== JSON.stringify(a.recipe.rect)) errors.push(`${a.assetId}: frame recipe differs`);
        if (atlas.meta.anchorPx.x / atlas.meta.frameSize.w !== a.anchor.x || atlas.meta.anchorPx.y / atlas.meta.frameSize.h !== a.anchor.y) errors.push(`${a.assetId}: foot anchor differs`);
      }
      entries.push({assetId:a.assetId,status:'verified',sha256:a.sha256,url:resolveAsset(pin,a.assetId).url});
    } catch(e) { errors.push(`${a.assetId}: local file missing/unreadable (${e.code || e.message})`); }
  }
  return {version:pin.manifest.version,coreCommit:pin.manifest.coreCommit,errors,entries};
}
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const reports = await Promise.all(Object.values(pins).map(verifyLocal));
  console.log(JSON.stringify(reports,null,2));
  if (reports.some(r=>r.errors.length)) process.exitCode=1;
}
