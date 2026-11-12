// 武俠小鎮 W8 事件「說書新段子」（#560）：老韓開始說一段「最近的江湖事」，內容取自他聽過、還沒說過的最近一則傳聞；
// 那天他在茶館說書時，正在聽書的人得到這則傳聞（老韓的版本，再傳一手、可能走樣）。
import { JIANGHU, JianghuState } from '../data';
import { EventImpl, heardOf, hear, people } from '../common';
import { zhNumber } from '../../w06_spar/narration';

const DEF = JIANGHU.events.story;

/** 老韓可以說的傳聞：聽過、還沒說過、不是「藥鋪進貨」這種買賣消息；最近聽到的優先。 */
export function storyCandidate(st: JianghuState): number | undefined {
  const list = (st.known[DEF.teller] ?? [])
    .filter((h) => !st.told.includes(h.rid))
    .filter((h) => st.rumors.find((r) => r.id === h.rid)?.about !== 'wealth');
  if (list.length === 0) return undefined;
  return list.reduce((a, b) => (b.gm >= a.gm ? b : a)).rid;
}

export const storyEvent: EventImpl = {
  start(c, ev) {
    const rid = storyCandidate(c.st)!;
    c.st.told.push(rid);
    ev.phase = 'telling';
    ev.data = { rid, listeners: [], sessions: 0, wasTelling: false };
  },
  tick(c, ev) {
    const d = ev.data;
    const rumor = c.st.rumors.find((r) => r.id === d.rid)!;
    const teller = people(c).find((r) => r.cid === DEF.teller);
    const telling = !!teller && teller.person.cur?.phase === 'do' && teller.person.cur.act === 'storytell';
    if (telling) {
      const mine = heardOf(c.st, DEF.teller, d.rid);
      for (const r of people(c)) {
        if (r.cid === DEF.teller) continue;
        if (r.person.cur?.phase !== 'do' || r.person.cur.act !== 'listen_story') continue;
        hear(c, r.cid, rumor, 'story', { cid: DEF.teller, heard: mine });
        // 早就聽過的人也算聽眾（聽的是老韓的版本）
        if (!d.listeners.includes(r.cid)) d.listeners.push(r.cid);
      }
    }
    if (d.wasTelling && !telling) d.sessions++;
    d.wasTelling = telling;
    return c.mod >= DEF.endMinuteOfDay || (d.sessions > 0 && d.listeners.length > 0);
  },
  end(c, ev) {
    const d = ev.data;
    const mine = heardOf(c.st, DEF.teller, d.rid);
    const tale = mine?.text ?? '';
    const text = d.listeners.length
      ? `老韓在茶館說了新段子「${tale}」，${zhNumber(d.listeners.length)}人聽了`
      : `老韓備了新段子「${tale}」，那天沒人來聽`;
    return { text, outcome: { rid: d.rid, listeners: d.listeners, tale }, rumors: [] };
  },
};
