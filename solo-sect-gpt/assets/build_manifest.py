"""Catalog original procedural artwork; does not modify upstream design assets."""
from pathlib import Path
import hashlib,json
ROOT=Path(__file__).resolve().parents[1]
entries=[]
def asset(id,source,export,bounds,geometry=None,kind='procedural',presentation=None):
    data=(ROOT/source).read_bytes()
    entries.append(dict(id=id,type=kind,source=dict(path=source,export=export,sha256=hashlib.sha256(data).hexdigest(),viewBox=bounds,transparent=(export!='render') if kind!='audio' else None,colorMode='sRGB' if kind!='audio' else None),provenance=dict(kind='original' if 'render' in source or 'audio' in source else 'derived',author='GPT / Codex',tool='Canvas 2D / WebAudio / original JavaScript',date='2026-10-25',planningCommit='e530a2c078722fd69732332eef2cd964da99ad24'),rights='Original local prototype; classic character names not cleared for public release',geometryRef=geometry,presentation=presentation or dict(zBand=4,feet=dict(local=[0,0],world='people[id].x/Q, people[id].y/Q'),directions=['N','E','S','W'],lowMotion='same phase, reduced oscillation'),fallback='procedural labelled silhouette',verification=dict(status='signal_verified_not_listened' if kind=='audio' else 'author_visual_self_review',evidence='evidence/development/visual-final/' if kind!='audio' else 'evidence/development/presentation-continue/progress.jsonl')))
for zone in ['home','e1','e2','e3']:asset('backdrop.'+zone,'src/render.mjs','render',[0,0,2400,1800])
for material in ['grass','road','stone','stream','pond','bridge']:asset('ground.'+material,'src/render.mjs','render',[0,0,256,256],material)
for f in ['hall','dorm','store','kitchen','dining','annex','quiet','yard','garden','herb']:
 for stage in ['wild','construction','basic','built']:
  for part in ['body','roof'] if f in ['hall','dorm','store','kitchen','annex','quiet'] else ['body']:
   asset('structure.'+f+'.'+stage+'.'+part,'src/render.mjs','drawBuilding',[0,0,440,280],f,presentation=dict(stage=stage,occluderPart=part,zBand=2 if part=='body' else 5,lowMotion='static'))
for person in ['leader','child','amu','lin','shen','zhou','hong','linghu','qiao','guo','yue','villager','warden','training','rescuer','rat','boar']:
 for pose in ['idle','walk','carry','work','eat','rest','sleep','social','teach','help','windup','active','recover','hurt','down']:
  asset('person.'+person+'.'+pose,'src/render.mjs','drawPerson',[-48,-64,96,80],person)
for fx in ['punch','push','sweep','thrust','intercept','step','miss','hit']:asset('fx.'+fx,'src/render.mjs','drawPerson',[0,0,128,128],fx)
for id,export in [('paint','paintedGround'),('wall','buildingShell'),('watercolor-roof','roofLayer'),('watercolor-tree','treeLayer'),('watercolor-bridge','bridgeLayer'),('life-props','lifeProps')]:asset('scene.'+id,'src/scene-art.mjs',export,[0,0,2400,1800])
for sound in ['footstep','work','martial','complete']:asset('audio.'+sound,'src/audio.mjs','AudioPalette',[0,0,0,0],kind='audio',presentation=dict(generator='oscillator/envelope v1',voices=8,firstInteraction=True))
(ROOT/'assets/manifest.json').write_text(json.dumps(dict(version=1,author='GPT / Codex',status='validated_author_self_review',coordinateSpace='DU; procedural source is authoritative, no baked sprite frames',rulesVersion='chapter1-1',mapVersion='gpt-world-1',entries=entries),ensure_ascii=False,indent=2)+'\n')
print('catalogued',len(entries),'procedural visual/audio IDs')
