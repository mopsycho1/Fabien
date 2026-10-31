import sys; sys.path.insert(0,'tools')
from sheet import make
import numpy as np
from PIL import Image
A='/mnt/user-data/attachments/57fd3495-09cb-5f24-adc1-499e0aad6139/'
V8=A+'816e9b66-image.png'; V4=A+'489dbc68-image.png'; AC=A+'e835a725-image.png'; DM=A+'a2f1ed51-image.png'; DF=A+'19536a1c-image.png'; VI=A+'b75ceb74-image.png'
s=0.27
F=dict(v8=1.0, v4=1.0, ac=1.9, dm=1.15, df=1.15, vi=1.0)
P={
 'stand_downLeft':(V8,(225,12,409,446),s*F['v8'],False),
 'stand_downRight':(V8,(1379,7,1595,445),s*F['v8'],False),
 'stand_upLeft':(V8,(570,14,775,445),s*F['v8'],False),
 'stand_upRight':(V8,(1000,20,1197,440),s*F['v8'],False),
 'battle_downRight':(V4,(383,42,729,452),s*F['v4'],False),
 'battle_downLeft':(V4,(383,42,729,452),s*F['v4'],True),
 'battle_upLeft':(V4,(765,40,1170,449),s*F['v4'],False),
 'ready':(AC,(9,63,217,278),s*F['ac'],False),
 'windup':(AC,(565,27,744,273),s*F['ac'],False),
 'attack':(AC,(1067,81,1263,274),s*F['ac'],False),
 'guard':(AC,(1444,79,1592,284),s*F['ac'],False),
 'dodge':(AC,(1251,82,1439,278),s*F['ac'],False),
 'hurt':(DM,(255,57,494,416),s*F['dm'],False),
 'knocked':(DM,(530,83,768,416),s*F['dm'],False),
 'down':(DF,(1230,251,1596,443),s*F['df'],False),
 'weak':(DM,(4,35,241,414),s*F['dm'],False),
 'victory':(VI,(13,9,314,470),s*F['vi'],False),
 'face':(V4,(14,463,185,658),0.8,False),
 'face_hurt':(DM,(20,437,185,622),0.85,False),
}
man=make('bull',P,'bull/','bull/preview.png',measure=False)
# horn span: width of the top 9% of each standing-type picture
for k in man:
    if k.startswith('face') or k in ('down',): continue
    a=np.array(Image.open('bull/bull_'+k+'.png'))[...,3]>128
    h=a.shape[0]; top=a[:max(3,int(h*0.09))]
    xs=np.nonzero(top.any(0))[0]
    print(k, a.shape, 'top span', xs.max()-xs.min() if len(xs) else 0)
