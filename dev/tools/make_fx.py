import numpy as np
from PIL import Image, ImageDraw
A='/mnt/user-data/attachments/57fd3495-09cb-5f24-adc1-499e0aad6139/'
OUT='fx/out/'
def glow(f, box, bg, name, scale=1.0, boost=1.0):
    a=np.array(Image.open(A+f+'-image.png').convert('RGB').crop(box)).astype(float)
    bgv=np.array(bg,float)
    g=np.clip(a-bgv,0,None)
    if bgv.max()>0: g=g*255/(255-bgv)
    g=np.clip(g*boost,0,255).astype(np.uint8)
    im=Image.fromarray(g,'RGB')
    # trim empty edges
    bb=Image.fromarray((np.array(im).max(-1)>12).astype(np.uint8)*255).getbbox()
    if bb: im=im.crop(bb)
    if scale!=1: im=im.resize((max(1,round(im.width*scale)),max(1,round(im.height*scale))),Image.LANCZOS)
    im.save(OUT+name+'.png'); return im
G=[81,81,81]; K=[0,0,0]
strike=[(10,130),(140,290),(300,490),(495,690),(690,930),(935,1290),(1300,1530)]
for i,(x0,x1) in enumerate(strike): glow('34ca4abe',(x0,258,x1,521),G,'strike_%d'%i,0.8,1.15)
for i,(x0,x1) in enumerate([(20,290),(300,565),(600,865),(900,1200),(1210,1525)]): glow('34ca4abe',(x0,531,x1,693),G,'crackle_%d'%i,0.55,1.2)
glow('95a96e79',(540,429,765,612),K,'fury_ring',0.6)
glow('95a96e79',(811,432,944,620),K,'fury_column',0.8)
glow('95a96e79',(997,429,1201,612),K,'fury_sparks',0.7)
glow('95a96e79',(18,429,273,612),K,'fury_ribbons',0.6)
glow('a56f95bc',(740,436,985,607),K,'swift_ring',0.6)
glow('a56f95bc',(14,436,279,607),K,'swift_ribbons',0.6)
glow('a56f95bc',(990,436,1246,607),K,'swift_streaks',0.6)
for i,(x0,x1) in enumerate([(0,300),(305,660),(700,995)]): glow('e4c22a63',(x0,205,x1,454),K,'stone_burst_%d'%i,0.55,1.1)
# preview on a mid-dark background, added like the game does
import os
fs=sorted(f for f in os.listdir(OUT) if f.endswith('.png'))
ims=[(f,Image.open(OUT+f)) for f in fs]
W=1900;x=10;y=20;rowh=0
bg=Image.new('RGB',(W,1600),(46,34,26)); d=ImageDraw.Draw(bg)
for f,im in ims:
    if x+im.width>W-10: x=10;y+=rowh+24;rowh=0
    region=np.array(bg.crop((x,y,x+im.width,y+im.height))).astype(int)
    region=np.clip(region+np.array(im).astype(int),0,255).astype(np.uint8)
    bg.paste(Image.fromarray(region),(x,y)); d.text((x,y-12),f[:-4],fill='white')
    x+=im.width+12; rowh=max(rowh,im.height)
bg.crop((0,0,W,y+rowh+10)).save('fx/preview.png')
print([ (f,im.size) for f,im in ims])
