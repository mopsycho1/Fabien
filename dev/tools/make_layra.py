import sys; sys.path.insert(0,'tools')
from sheet import make
A='/mnt/user-data/attachments/57fd3495-09cb-5f24-adc1-499e0aad6139/'
ST=A+'25333329-image.png'; HU=A+'54695c80-image.png'; DE=A+'fd6bcbb3-image.png'
s=0.32
P={
 'stand_downRight':(ST,(11,16,191,361),s,False), 'stand_downLeft':(ST,(1400,26,1590,368),s,True),
 'stand_upLeft':(ST,(844,34,1058,367),s,False),  # her only back view (turned left); upRight is its mirror
 'battle_downRight':(DE,(12,10,208,356),s*0.95,False),  # standing firm, staff ready
 'chant':(ST,(184,23,408,363),s,False), 'cast':(ST,(384,33,640,366),s,False), 'attack':(ST,(650,0,860,368),s,False),
 'meditate':(HU,(1004,10,1300,348),s*0.85,False),  # kneeling, eyes closed, staff planted
 'hurt':(HU,(222,29,497,346),s*0.85,False), 'knocked':(HU,(13,17,271,343),s*0.85,False), 'kneel':(HU,(753,5,1007,343),s*0.85,False),
 'down':(DE,(891,238,1206,356),s*0.95,False), 'weak':(DE,(384,9,617,352),s*0.95,False),  # bent over, leaning on her staff
 'face':(ST,(14,490,113,622),1.3,False), 'face_smile':(ST,(119,491,228,622),1.3,False), 'face_hurt':(HU,(11,483,120,623),1.3,False),
}
make('layra',P,'layra/','layra/preview.png')
