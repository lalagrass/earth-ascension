import manifest from '../manifests/gemini-1.1.0.mjs';
import { createPin } from '../resolve.mjs';
// Independent snapshot: never import another branch's mapping or a latest alias.
export const pin = createPin(manifest, 'cfb58c3bff536d9ba85d266912027cb5f3eecbed13d9e5ded2ccc2af957d68af');
