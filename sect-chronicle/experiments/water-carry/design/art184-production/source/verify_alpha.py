# 數值核對：每張 sprite 是 RGBA、四角全透明、含真半透明邊、綠溢色比例
import glob, numpy as np
from PIL import Image
bad=0
for f in sorted(glob.glob('sprites/*.png')):
    im=Image.open(f); a=np.asarray(im)
    ok = im.mode=='RGBA'; al=a[...,3]
    corners = int(al[0,0])+int(al[0,-1])+int(al[-1,0])+int(al[-1,-1])
    vis = al>128; rgb=a[...,:3].astype(int)
    spill = float(((rgb[...,1]-np.maximum(rgb[...,0],rgb[...,2])>45)&(al>0)).sum()/max(1,(al>0).sum()))
    print(f"{f:34s} {im.mode} {im.size} transparent={float((al==0).mean()):.2f} partial={float(((al>0)&(al<255)).mean()):.3f} corners={corners} green_spill={spill:.4f}")
    bad += (not ok) or corners>0 or spill>0.02
print('FAIL' if bad else 'ALL OK', bad)
