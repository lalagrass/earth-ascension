import manifest from '../manifests/gemini-1.1.0.mjs';
import { createPin } from '../resolve.mjs';
// Independent snapshot: never import another branch's mapping or a latest alias.
export const pin = createPin(manifest, 'b90913932fbd7e5b51786751b9f0664936d6f4f164aea3c5e8f8f596a28c9f56');
