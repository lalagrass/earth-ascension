// loop25 突破排程（選用，s.bt25）：卡在瓶頸且可衝關時，打坐分數不低於最高練功分數×BT25.k。
// 診斷：人多後主角升首徒（練功×1.5），練功 ~130 壓過打坐 75，武學卡 55；並非座位不足（座位滿 0%）。
export const BT25 = { k: 1.1 };
export function btBoost(s, out) {
  if (!s.bt25) return; const m = out.find((o) => o.act === 'meditate' && o.f?.btOk); if (!m) return;
  const tr = Math.max(0, ...out.filter((o) => o.act === 'train').map((o) => o.score)); if (m.score < tr * BT25.k) m.score = tr * BT25.k;
}
