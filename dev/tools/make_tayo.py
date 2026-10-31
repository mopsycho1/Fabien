import sys, json; sys.path.insert(0,'tools')
from cutter import cut
from PIL import Image, ImageDraw
src='/mnt/user-data/attachments/57fd3495-09cb-5f24-adc1-499e0aad6139/b12443c7-image.jpg'
B=0.72
# (box, size factor so his head matches the standing views, mirror so the pose faces right)
parts={
 'stand_downLeft':((392,62,530,362),1,False),'stand_downRight':((555,62,695,362),1,False),
 'stand_upLeft':((702,62,855,362),1,False),'stand_upRight':((866,62,1022,362),1,False),
 'windup':((368,448,522,652),1.24,True),'attack':((515,448,660,652),1.24,False),
 'ready':((788,448,918,652),1.24,True),'guard':((912,452,1042,652),1.24,False),
 'dodge':((652,448,798,652),1.24,False),
 'hurt':((26,698,172,902),1.38,True),'knocked':((168,752,302,892),1.38,False),'down':((302,795,458,888),1.38,False),
 'victory':((616,698,722,908),1.38,False),
 'face':((24,962,208,1150),0.85/B,False),'face_angry':((428,962,612,1150),0.85/B,False),
}
OUT='tayo_out/'; man={}
for k,(b,f,flip) in parts.items():
    man[k]=cut(src,b,OUT+'tayo_'+k+'.png',scale=B*f,flip=flip)
json.dump(man,open(OUT+'manifest.json','w'),indent=1)
tiles=[(k,Image.open(OUT+'tayo_'+k+'.png')) for k in man]
W=1900;x=10;y=30;rowh=0
bg=Image.new('RGBA',(W,900),(40,30,22,255)); d=ImageDraw.Draw(bg)
for k,t in tiles:
    if x+t.width>W-10: x=10;y+=rowh+30;rowh=0
    bg.alpha_composite(t,(x,y)); d.text((x,y-14),k,fill='white'); ox=x+t.width*man[k]; d.line([(ox,y+t.height-4),(ox,y+t.height+6)],fill='red',width=2)
    x+=t.width+16; rowh=max(rowh,t.height)
bg.crop((0,0,W,y+rowh+10)).save(OUT+'preview.png'); print(man)
