// 武俠小鎮 W4（#556「看得出變強」）：人物詳情的技能面板——4 個技能（/10 取一位小數）與拳腳階級名。
// PlayerDetails 與截圖頁共用；w04-dojo 關閉時不顯示。
import type { DojoState } from '../../convex/wuxia/w04_dojo';
import type { LifeState } from '../../convex/wuxia/w03_life';
import { SKILL_KEYS, SKILL_LABELS, showSkill, strikesPerMinute, tierOf } from '../../convex/wuxia/w04_dojo/data';

export function SkillPanel(props: { dojo?: DojoState; life?: LifeState; playerId?: string }) {
  const { dojo, life, playerId } = props;
  if (!dojo || !life || !playerId) return null;
  const person = life.people[playerId];
  const skills = person && dojo.skills[person.cid];
  if (!skills) return null;
  const tier = tierOf(skills.fist);
  return (
    <div className="wuxia-skill-panel" data-testid="wuxia-skill-panel">
      <p className="wuxia-skill-tier">
        <b>武藝</b> {tier.emoji} {tier.name}
        <span className="wuxia-skill-strikes">（打樁 {strikesPerMinute(skills.fist)} 下/分）</span>
      </p>
      <div className="wuxia-skills">
        {SKILL_KEYS.map((k) => (
          <div key={k} className="wuxia-skill">
            <span className="wuxia-skill-label">{SKILL_LABELS[k]}</span>
            <span className="wuxia-skill-bar">
              <span className="wuxia-skill-fill" style={{ width: `${skills[k] / 10}%` }} />
            </span>
            <span className="wuxia-skill-value">{showSkill(skills[k])}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
