// Source: lalagrass/earth-ascension@6f959f534e9a00994f1cea7c230b4110e60db8c6 sect-chronicle/character-card/render.mjs, profileHtml only (see ../../SOURCES.md).
// Local change (GPT branch): the research-page line "只供對照，不是可選開局" is dropped; every profile here belongs to a person or an opening in this game.
import { escape } from '../public-ui/values.mjs';
export function profileHtml(c) {
 const p = c?.profile;
 if (!p || p.visibility !== 'public') return '';
 const meta = [p.work, p.edition, p.storyStage].filter(Boolean).join(' · ');
 const src = p.source?.kind && p.source?.ref ? `${p.source.kind}：${p.source.ref}` : '';
 return `<div class="public-profile" data-profile-id="${escape(p.profileId || '')}" data-playable="${p.playable ? 'yes' : 'no'}">${p.shortIntro ? `<p class="public-short">${escape(p.shortIntro)}</p>` : ''}${meta ? `<small class="public-stage">${escape(meta)}</small>` : ''}${p.background ? `<details class="public-background"><summary>背景</summary><p>${escape(p.background)}</p>${src ? `<small>來源：${escape(src)}</small>` : ''}</details>` : ''}</div>`;
}
