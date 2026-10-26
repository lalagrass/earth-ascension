import manifest from '../manifests/gemini-1.1.0.mjs';
import { createPin } from '../resolve.mjs';
// Independent snapshot: never import another branch's mapping or a latest alias.
export const pin = createPin(manifest, '9971444c86b031a62975bea442acd56e8f7941afca747dd20572dc9ec856f50a');
