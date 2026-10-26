import manifest from '../manifests/gemini-1.1.0.mjs';
import { createPin } from '../resolve.mjs';
// Independent snapshot: never import another branch's mapping or a latest alias.
export const pin = createPin(manifest, '391ce47d218bc486b84e0db270e9dd8eae4f207f600b5bf0aad90cc9da2b26b3');
