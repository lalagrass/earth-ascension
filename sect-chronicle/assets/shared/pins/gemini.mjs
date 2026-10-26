import manifest from '../manifests/gemini-1.1.0.mjs';
import { createPin } from '../resolve.mjs';
// Independent snapshot: never import another branch's mapping or a latest alias.
export const pin = createPin(manifest, '6e0444a2d2685535b1aba2fa9aa64a1700457a320cba907523e4690a5c72c2dc');
