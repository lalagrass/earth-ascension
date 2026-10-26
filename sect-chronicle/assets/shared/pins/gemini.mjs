import manifest from '../manifests/gemini-1.0.0.mjs';
import { createPin } from '../resolve.mjs';
// Independent snapshot: never import another branch's mapping or a latest alias.
export const pin = createPin(manifest, '8f99f488360e19deaaf675b71e321b0c1e1c0ce44cb2894516d707653cf1f252');
