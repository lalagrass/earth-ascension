import manifest from './manifest-gpt-local-1.0.0.mjs';
import { createPin } from './resolve.mjs';
// Local pin: the digest is the sha256 of manifest-gpt-local-1.0.0.mjs; checked by test/optimization/m29.test.mjs.
export const MANIFEST_FILE = 'manifest-gpt-local-1.0.0.mjs';
export const pin = createPin(manifest, 'a57ff4b0d56c6274c502727bf321d66844c796639482b70cdac738ae99b5feed');
