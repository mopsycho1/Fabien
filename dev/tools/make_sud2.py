# Sudeen's battle stance from Suleiman's "Suddeen battle ready" sheet (29 Oct).
# Figure 1 faces down-right, figure 4 up-right (face turned right), figure 6
# up-left (face turned left). Down-left is figure 1 mirrored by the game.
import sys; sys.path.insert(0,'tools')
from sheet import make, hair
SRC='blueprint/sud_battle.jpg'
s=float(sys.argv[1]) if len(sys.argv)>1 else 1.0
P={
 'battle_downRight':(SRC,(590,90,822,382),s,False),
 'battle_upRight':(SRC,(1303,90,1536,382),s,False),
 'battle_upLeft':(SRC,(858,410,1062,702),s,False),
}
make('sudeen',P,'sud2/','sud2/preview.png')
for k in P: print(k, hair('sud2/sudeen_'+k+'.png'))
print('existing', [hair('/home/claude/fabien/public/art/sudeen_'+k+'.png') for k in ['stand_downRight','stand_upLeft','stand_upRight','ready']])
