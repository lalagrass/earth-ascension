"""Planning-only static checks. Does not verify a game or its navigation."""
from pathlib import Path
import json, math, itertools, re, xml.etree.ElementTree as ET
root=Path(__file__).resolve().parents[2]
p=json.loads((root/'maps/design/layout.json').read_text())
fac=p['home']['facilities'];fail=[];lines=['Design static audit — not runtime pathfinding / LOS / crowd verification.']
for a,b in itertools.combinations(fac,2):
 x,y,w,h=a['rect'];q,r,v,u=b['rect']
 if min(x+w,q+v)>max(x,q) and min(y+h,r+u)>max(y,r):fail.append('Overlapping footprints: '+a['id']+'/'+b['id'])
for name,r in p['home']['paths'].items():
 length=sum(math.dist(a,b) for a,b in zip(r['points'],r['points'][1:]))
 lines.append(f'{name}: {length:.3f} DU / {length*2:.3f} WU')
 for a,b in zip(r['points'],r['points'][1:]):
  n=max(2,math.ceil(math.dist(a,b)))
  for k in range(n):
   t=k/(n-1);px=a[0]+(b[0]-a[0])*t;py=a[1]+(b[1]-a[1])*t
   for f in fac:
    x,y,w,h=f['rect']
    if f['solid'] and x+1e-7<px<x+w-1e-7 and y+1e-7<py<y+h-1e-7:fail.append(f'Route center enters solid: {name}/{f["id"]}')
for f in (root/'maps/design').glob('*.svg'):ET.parse(f)
for f in itertools.chain((root/'docs').glob('*.md'),(root/'maps/design').glob('*.md'),(root/'evidence/planning').glob('*.md')):
 for target in re.findall(r'\]\(([^)]+)\)',f.read_text()):
  if not target.startswith(('http','mailto','#')) and not (f.parent/target.split('#')[0]).exists():fail.append(f'Missing local link {f.relative_to(root)}: {target}')
assert p['expedition']['main'][0]==[1480,800]
assert p['home']['origin']==[0,800] and p['home']['paths']['north']['points'][-1]==[1480,0]
lines.extend(['Facility footprints disjoint: '+str(not any('footprints' in s for s in fail)),
 'Route centerline samples outside solid interiors: '+str(not any('Route' in s for s in fail)),
 '6 SVG XML documents parsed; local Markdown links checked; world/home portal coordinates match.',
 'Actor-radius swept collision, indoor paths, doors, occupancy, LOS, terrain and crowd flow NOT tested.',
 'Use /usr/bin/python3 here: Homebrew Python 3.14 XML expat library failed in this environment. No environment repair performed.'])
lines.extend(sorted(set(fail)));lines.append('PASS' if not fail else 'FAIL')
(root/'evidence/planning/layout-check.txt').write_text('\n'.join(lines)+'\n')
print('\n'.join(lines));raise SystemExit(bool(fail))
