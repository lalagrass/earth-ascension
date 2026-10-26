# v2.0 balance review: extra 60-day metrics computed from longrun60.json snapshots (pass/day, pills, endless, per-opening best & disciples)
import json, statistics as st, collections
d = json.load(open('longrun60.json'))['cases']; out = {}
snap = lambda c, day: min(c['snaps'], key=lambda s: abs(s['day'] - day))
P = lambda c, day, k: snap(c, day).get(k)
print('sample snap', {k: (v if not isinstance(v, (dict, list)) else type(v).__name__) for k, v in d[0]['snaps'][-1].items()})
def num(x):
  if isinstance(x, dict): return x.get('done', x.get('n', sum(v for v in x.values() if isinstance(v, (int, float)))))
  return x
passD = [num(c['snaps'][-1]['pass']) / c['snaps'][-1]['day'] for c in d if c['snaps'][-1].get('pass') is not None]
out['passPerCaseDay60'] = [round(min(passD), 2), round(st.mean(passD), 2), round(max(passD), 2)]
out['pillStock'] = {str(D): [min(num(P(c, D, 'pill')) for c in d), max(num(P(c, D, 'pill')) for c in d)] for D in (30, 60)}
out['endless60'] = sum(1 for c in d if num(c['snaps'][-1].get('endless') or 0))
out['endlessRaw0'] = d[0]['snaps'][-1].get('endless')
by = collections.defaultdict(list)
for c in d: by[c['opening'] or 'plain'].append(c)
out['perOpening60'] = {o: {'ds': sorted({num(c['snaps'][-1]['ds']) for c in L}), 'best': [min(num(c['snaps'][-1]['best']) for c in L), max(num(c['snaps'][-1]['best']) for c in L)], 'couples': [min(num(c['snaps'][-1]['couples']) for c in L), max(num(c['snaps'][-1]['couples']) for c in L)], 'hurt': [c['hurt'] if not isinstance(c['hurt'], dict) else num(c['hurt']) for c in L]} for o, L in by.items()}
f5 = [sum(1 for s in c['snaps'] if s['day'] <= 5 and num(s['food']) <= 0) for c in d]
out['first5FoodZeroSnaps'] = [min(f5), round(st.mean(f5), 2), max(f5)]
json.dump(out, open('extra-v200.json', 'w'), ensure_ascii=False, indent=1); print(json.dumps(out, ensure_ascii=False))
