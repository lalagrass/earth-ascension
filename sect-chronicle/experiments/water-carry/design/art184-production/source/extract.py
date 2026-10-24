# 去背與切件：raw/*.jpg（純綠底）→ sprites/*.png（真 RGBA alpha）＋ manifest.json
# 用法：python source/extract.py   （需 numpy、scipy、pillow）
import json, numpy as np
from PIL import Image
from scipy import ndimage as nd
NAMES = {
 'hero-turnaround': ['hero_front_idle','hero_side_idle','hero_back_idle'],
 'hero-poses': ['hero_side_carry','hero_back_carry','hero_side_herb'],
 'senior-turnaround': ['senior_front_idle','senior_side_idle','senior_back_idle'],
 'senior-poses': ['senior_side_carry','senior_back_carry','senior_side_herb'],
 'dojo-props': ['dojo_main_hall','dojo_side_house','dojo_gate','court_wall','water_vat','stone_mill','woodpile','herb_rack'],
 'path-kit': ['pine_a','pine_b','bamboo_clump','broadleaf_tree','boulder_l','boulder_m','boulder_s','path_edge_stones','spring_pool','creek_bank','fern'],
}
LAYER = {'court_wall':'occluder','path_edge_stones':'ground-decal','spring_pool':'ground-decal','creek_bank':'ground-decal'}
man = {}
for src, names in NAMES.items():
    im = np.asarray(Image.open(f'raw/{src}.jpg').convert('RGB')).astype(np.float32)
    r,g,b = im[...,0],im[...,1],im[...,2]
    gdom = g - np.maximum(r,b)
    a = 1 - np.clip((gdom-45)/(95-45),0,1)            # 綠度越高越透明
    a = nd.median_filter(a,3)
    # 去綠溢色：半透明或邊緣像素把 G 壓到 max(R,B)+小幅
    edge = (a<0.999) | (nd.binary_dilation(a<0.5, iterations=2))
    g2 = np.where(edge & (gdom>8), np.maximum(r,b)+8, g)
    rgba = np.dstack([r,g2,b,a*255]).clip(0,255).astype(np.uint8)
    solid = a>0.5
    lab,n = nd.label(nd.binary_dilation(solid, iterations=(14 if src.startswith(("hero","senior")) else 3)))
    objs = []
    for i,sl in enumerate(nd.find_objects(lab),1):
        m = (lab[sl]==i)&solid[sl]
        if m.sum()<1500: continue
        objs.append((sl,i))
    H = im.shape[0]; objs.sort(key=lambda o:(int((o[0][0].start+o[0][0].stop)/2/(H/{'path-kit':3,'dojo-props':2}.get(src,1))), (o[0][1].start+o[0][1].stop)/2))
    assert len(objs)==len(names), (src,len(objs),[o[0] for o in objs])
    for (sl,li),name in zip(objs,names):

        crop = rgba[sl].copy(); crop[...,3] = np.where(lab[sl]==li, crop[...,3], 0)
        ys,xs = np.nonzero(crop[...,3]>16)
        crop = crop[ys.min():ys.max()+1, xs.min():xs.max()+1]
        Image.fromarray(crop,'RGBA').save(f'sprites/{name}.png', optimize=True)
        h,w = crop.shape[:2]
        kind = 'character' if name.startswith(('hero','senior')) else 'prop'
        man[name] = {'file':f'sprites/{name}.png','src':f'raw/{src}.jpg','size':[w,h],
                     'anchor':[round(w/2),h-1],'anchor_note':'底邊中心＝腳底/落地點',
                     'layer': LAYER.get(name, 'actor' if kind=='character' else 'occluder-ysort'),
                     'alpha_min':int(crop[...,3].min()),'alpha_max':int(crop[...,3].max()),
                     'transparent_ratio':round(float((crop[...,3]==0).mean()),3)}
json.dump(man, open('export/manifest-raw.json','w'), ensure_ascii=False, indent=1)
print(len(man))
