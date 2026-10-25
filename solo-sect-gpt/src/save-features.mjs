export const LEGACY_RULES='chapter1-1',LIFE_RULES='chapter1-life-1',MARTIAL_RULES='chapter1-martial-1',CULTURE_RULES='chapter1-culture-1';
export const SUPPORTED_RULES=[LEGACY_RULES,LIFE_RULES,MARTIAL_RULES,CULTURE_RULES];
export function rulesFor(w){return w.culturePlan?CULTURE_RULES:w.martialPlan?MARTIAL_RULES:w.lifePolicy?LIFE_RULES:LEGACY_RULES;}
