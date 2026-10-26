import manifest from '../manifests/gpt-1.0.0.mjs';
import { createPin } from '../resolve.mjs';
// Independent snapshot: never import another branch's mapping or a latest alias.
export const pin = createPin(manifest, 'e0a3e53581aa722a5b2b4e145e89ae5a0138e138914e580b71970b98e28985fb');
