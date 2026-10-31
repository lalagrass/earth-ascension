import json,glob,sys,collections
tag=sys.argv[1]
R=collections.defaultdict(list)
for f in glob.glob(f'out/{tag}/*.jsonl'):
    for l in open(f):
        l=l.strip()
        if l: o=json.loads(l); R[o['arm']].append(o)
def rate(rs,lo,hi):
    n=l=h=0
    for o in rs:
        for r in o['raids']:
            if lo<=r['d']<=hi and r['f'] in('win','lose'): n+=1; l+=r['f']=='lose'; h+=r['h']
    return n, (l/n if n else 0), (h/n if n else 0)
for arm,rs in sorted(R.items()):
    print(arm,'runs',len(rs))
    for lo,hi in [(1,10),(11,16),(17,24),(25,40)]:
        n,lr,hr=rate(rs,lo,hi); print(f'  raids d{lo}-{hi}: n={n} lose={lr:.3f} hurt/fight={hr:.3f}')
    for d in ['4','8','12','16','20','30']:
        v=[o['snap'][d] for o in rs if d in o['snap']]
        if v: print(f'  day{d}: pow={sum(x["pow"] for x in v)/len(v):.1f} qiMaxAvg={sum(x["qi"] for x in v)/len(v):.1f}')
    lw=[x for o in rs for x in o['lair']]; print('  lair n',len(lw),'win',sum(x['w'] for x in lw)/max(1,len(lw)))
    print('  guard/run',sum(o['guard'] for o in rs)/len(rs),'hurtLog/run',sum(o['hurtLog'] for o in rs)/len(rs))
