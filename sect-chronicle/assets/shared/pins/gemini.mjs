import manifest from '../manifests/gemini-1.1.0.mjs';
import { createPin } from '../resolve.mjs';
// Independent snapshot: never import another branch's mapping or a latest alias.
export const pin = createPin(manifest, 'eea6137a1577ebe02ea54cae7462880422739edd3bc74d9e0f7367ef44d7df8b');
