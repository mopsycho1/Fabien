import sys; sys.path.insert(0,'tools')
from sheet import make
A='/mnt/user-data/attachments/57fd3495-09cb-5f24-adc1-499e0aad6139/'
BT=A+'b4892674-image.jpg'; ST=A+'d9e83e3e-image.jpg'
s=0.255
b=0.255*1.2  # his battle-ready crouch is drawn low, so it is cut 20% bigger to read as tall as the others'
P={
 'stand_downLeft':(ST,(207,24,400,479),s,False), 'stand_upLeft':(ST,(595,26,771,475),s,False),
 'stand_upRight':(ST,(992,21,1179,475),s,False), 'stand_downRight':(ST,(1381,19,1577,479),s,False),
 'battle_downLeft':(BT,(200,100,483,460),b,False,[(200,280,233,358),(200,365,216,460),(448,185,483,332)]), 'battle_upLeft':(BT,(560,100,805,460),b,False),
 'battle_upRight':(BT,(975,100,1215,460),b,False), 'battle_downRight':(BT,(1361,100,1592,460),b,False,[(1361,400,1388,460)]),
 
 'face':(ST,(13,545,145,731),1.05,False), 'face_side':(ST,(152,547,284,731),1.05,False),
}
make('rabdul',P,'rab2/','rab2/preview.png',keep=0.5)  # keep only the figure itself, not a neighbour's spear tip
