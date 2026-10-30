export const FRONTIER_VERSION=5;
export const APPROACHES={guard:'先守好家',learn:'先學會應對',peace:'尋求長久安寧'};
export function freshFrontier(approach='guard'){return {version:1,approach:Object.hasOwn(APPROACHES,approach)?approach:'guard'};}
export function validFrontier(s){const f=s.frontier;return f===null||f===undefined||!!(f&&s.version===FRONTIER_VERSION&&s.mode==='solo'&&s.autonomy&&f.version===1&&Object.hasOwn(APPROACHES,f.approach));}
export function frontierText(s){return s.frontier?`生活與山林試作 · ${APPROACHES[s.frontier.approach]}；先沿原本性情自主安家。` :'';}
