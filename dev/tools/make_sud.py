import sys; sys.path.insert(0,'tools')
from sheet import make, hair
A='/mnt/user-data/attachments/57fd3495-09cb-5f24-adc1-499e0aad6139/'
ST=A+'8676711d-image.png'; FU=A+'294dad82-image.png'; SW=A+'6b621605-image.png'; HE=A+'5681addd-image.png'
s=float(sys.argv[1]) if len(sys.argv)>1 else 0.6
P={
 'stone_downLeft':(ST,(602,96,819,378),s,False), 'stone_upLeft':(ST,(1064,107,1250,370),s,False),
 'fury_downLeft':(FU,(580,102,826,372),s,False), 'fury_upLeft':(FU,(1077,97,1272,380),s,False),
 'swift_downLeft':(SW,(603,102,841,367),s,False), 'swift_upLeft':(SW,(1062,105,1327,366),s,False),
 'heal':(HE,(1088,461,1281,732),s,False),
}
make('sudeen',P,'sud/','sud/preview.png')
for k in P: print(k, hair('sud/sudeen_'+k+'.png'))
print('existing', [hair('/home/claude/fabien/public/art/sudeen_'+k+'.png') for k in ['stand_downRight','stand_upLeft','ready','attack']])
