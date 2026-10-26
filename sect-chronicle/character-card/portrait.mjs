// #343 previews remain candidates. No same-name or arbitrary role substitution.
import { pin as gemini } from '../assets/shared/pins/gemini.mjs';
import { pin as gpt } from '../assets/shared/pins/gpt.mjs';
import { pin as grok } from '../assets/shared/pins/grok.mjs';
import { portraitFor } from '../assets/shared/resolve.mjs';
export const PORTRAITS = Object.freeze({ dev: gemini, gemini, gpt, grok });
export function portrait(branch, actorId) {
  return portraitFor(PORTRAITS[branch], branch, actorId);
}
