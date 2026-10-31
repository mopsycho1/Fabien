import sys; sys.path.insert(0,'tools')
from sheet import make, hair
A='/mnt/user-data/attachments/57fd3495-09cb-5f24-adc1-499e0aad6139/'
ST=A+'a199077f-image.png'; AI=A+'92060fa7-image.png'; DS=A+'b0f368ef-image.png'; DK=A+'6054cc1e-image.png'; HU=A+'76cbd30d-image.png'; PO=A+'4138b8d6-image.png'
s=0.27
P={
 'stand_downRight':(ST,(216,47,420,462),s,False), 'stand_upRight':(ST,(624,49,775,455),s,False),
 'stand_upLeft':(ST,(1001,47,1181,454),s,False), 'stand_downLeft':(ST,(1412,47,1583,462),s,False),
 'attack':(AI,(228,36,442,471),s,False), 'windup':(AI,(420,36,648,469),s,False),
 'ready':(DS,(199,79,419,479),s,False), 'guard':(DS,(2,71,202,474),s,True), 'dodge':(DS,(426,102,616,480),s,False),
 'dagger':(DK,(205,60,430,480),s,False),
 'hurt':(HU,(253,89,490,482),s,False), 'knocked':(HU,(482,150,723,499),s,False), 'down':(HU,(727,174,999,505),s,False),
 'poison':(PO,(276,104,529,479),s,False), 'poisonShot':(PO,(1290,63,1588,478),s,False),
 'aim_upRight':(AI,(615,58,835,476),s,False), 'aim_upLeft':(AI,(1001,43,1216,445),s,False), 'aim_downLeft':(AI,(1357,35,1589,471),s,False),
 'stance_upRight':(DS,(610,79,817,469),s,False), 'stance_upLeft':(DS,(976,98,1199,484),s,False), 'stance_downLeft':(DS,(1383,79,1575,478),s,False),
 'weak':(HU,(21,72,254,498),s,False),
 'face':(ST,(20,491,246,736),0.75,False), 'face_hurt':(HU,(17,523,232,756),0.75,False),
}
make('archer2',P,'arch/','arch/preview.png')
