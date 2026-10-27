import manifest from './manifest-gpt-local-1.1.0.mjs';
import { createPin } from './resolve.mjs';
// Local pin: the digest is the sha256 of manifest-gpt-local-1.1.0.mjs; checked by test/optimization/m29.test.mjs and m38.test.mjs.
// 1.0.0 (sha256 a57ff4b0d56c6274c502727bf321d66844c796639482b70cdac738ae99b5feed) stays on disk unchanged and is still verified by m38.test.mjs.
export const MANIFEST_FILE = 'manifest-gpt-local-1.1.0.mjs';
export const pin = createPin(manifest, 'bd0afa259aeec8ccf597b6fab3e931d79007c947a5d4c96ae5d0b1e60684d109');
