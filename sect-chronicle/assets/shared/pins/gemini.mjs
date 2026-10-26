import manifest from '../manifests/gemini-1.1.0.mjs';
import { createPin } from '../resolve.mjs';
// Independent snapshot: never import another branch's mapping or a latest alias.
export const pin = createPin(manifest, 'e99d1f81d2370edf764d800ba98ca4ac54dea2d0824aac785c44f30d0e743090');
