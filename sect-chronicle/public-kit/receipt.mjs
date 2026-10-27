import {PUBLIC_KIT_VERSION,LEGACY_SOURCE_SHA} from './version.mjs';
const sha=/^[a-f0-9]{40}$/,hash=/^[a-f0-9]{64}$/;
const freeze=v=>{if(v&&typeof v==='object'){Object.values(v).forEach(freeze);Object.freeze(v);}return v;};
export function createConsumerReceipt({sourceSha,manifestSha256,assetPin,adapter}) {
 if(!sha.test(sourceSha||'')||sourceSha===LEGACY_SOURCE_SHA||!hash.test(manifestSha256||''))throw TypeError('New exact release SHA and manifest digest required');
 if(!assetPin?.path||!assetPin.version||['dev','latest'].includes(assetPin.version)||assetPin.path.split('/').includes('..')||!hash.test(assetPin.manifestSha256||''))throw TypeError('Exact chosen asset pin required');
 if(!adapter?.id||!sha.test(adapter.sourceSha||'')||!sha.test(adapter.coreSha||''))throw TypeError('Adapter identity/source SHA and independent core SHA required');
 return freeze({receiptVersion:1,package:`public-kit@${PUBLIC_KIT_VERSION}`,sourceSha,manifestSha256,
  assetPin:{path:assetPin.path,version:assetPin.version,manifestSha256:assetPin.manifestSha256},
  adapter:{id:adapter.id,sourceSha:adapter.sourceSha,coreSha:adapter.coreSha}});
}
