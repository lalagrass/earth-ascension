import manifest from '../manifests/grok-1.0.0.mjs';
import { createPin } from '../resolve.mjs';
// Independent snapshot: never import another branch's mapping or a latest alias.
export const pin = createPin(manifest, '4fc0069fa5baafa1969da57e4a2f5d2ab3213ac8abed95b008ad21928de471c2');
