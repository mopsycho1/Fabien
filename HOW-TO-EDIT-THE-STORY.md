# How to edit the story

All the story text lives in three small files in the folder `src/data`.
You can edit them with any text editor. You never need to touch the code.

## 1. `dialogue.json` (the words)

Each scene has a name, a background color, a place name, and a list of lines.

    "ship": {
      "background": "#1d2a30",
      "place": "Wings of Oren, the Shores of Ido",
      "lines": [
        {"speaker": "", "text": "Fog hangs above the water."},
        {"speaker": "ligali", "text": "You would think it a provocation."},
        {"speaker": "sadare", "text": "To the heathenous perhaps, less so the pious."}
      ]
    }

- `"speaker": ""` (empty) means the story is describing something. It shows in slanted text with no portrait.
- `"speaker": "ligali"` means a character is talking. The name must match a name in `characters.json`.
- To change the place name in the middle of a scene, add a `"place"` to that line:
  `{"speaker": "", "text": "...", "place": "The Wasteland"}`
- Keep each line under about 300 letters. Longer lines still work, but the letters shrink to fit.
- Every line needs a comma after it, except the last one in the list.
- Use straight quotes `"` around text. If you need a quote mark inside a line, write `\"`.

## 2. `characters.json` (who can speak)

    "biola": {"name": "Biola", "color": "#3fa7a0"}

The `name` is what the player sees. The `color` is the color of the placeholder portrait.
To add a character, copy a line, give it a new short name in lowercase, and use that name as the `speaker`.

## 3. `story.json` (the order things happen in)

    {"type": "dialogue", "scene": "prologue"},
    {"type": "battle"},
    {"type": "dialogue", "scene": "ship"},
    {"type": "end"}

The game plays these from top to bottom. To add a scene, write it in `dialogue.json`,
then add a `dialogue` line for it here, where you want it to play.

## Checking your changes

Save the file. If the game is running, refresh the page and play to the scene you changed.
If the screen goes blank, there is probably a missing comma or quote. Open the browser console
(Option, Command and J in Chrome) to see which file has the problem.

## Jobs and units (for the battle)

Two more files in `src/data` control the battle. You can edit these too.

### `jobs.json` (what each job is like)

    "guardian": {
      "name": "Guardian",
      "badge": "G",
      "stats": { "hp": 40, "attack": 6, "defense": 4, "accuracy": 85, "evade": 10, "speed": 9, "move": 3, "range": 1 }
    }

- `name` is what the player sees. `badge` is the one letter shown on the unit.
- `hp` is health. `mp` is magic points for spells (leave it out for units without spells).
- There are two kinds of damage, never below 1:
  - weapons (swords, spears, arrows): `attack` minus the target's `defense`
  - magic (lightning): `magicAttack` minus the target's `magicDefense`
- A job with `"attackType": "magic"` attacks with magic. `attackName` is the name on its attack button (the Sage's says Lightning).
- `chain` makes the attack jump to a second enemy: `range` is how far it jumps from the first target, `share` is the part of the damage it does (0.5 is half).
- `closePenalty` makes the attack harder to aim at someone right next to the attacker (the Sage's lightning: 25 less).
- `accuracy` and `evade` set the chance to hit: accuracy minus evade, kept between 5 and 95 percent.
- `speed` decides how often the unit gets a turn. A unit with speed 10 acts twice as often as one with speed 5.
- `move` is how many tiles it can walk. `range` is how many tiles away it can attack (1 means next to it).
- To add a job, copy a block, give it a new short name in lowercase, and change the numbers.

### `units.json` (who is in the battle)

    { "id": "h1", "name": "Hero 1", "label": "H1", "side": "hero", "job": "guardian", "col": 2, "row": 6 }

- `side` is `"hero"` or `"enemy"`. `job` must match a name in `jobs.json`.
- `col` and `row` are the starting tile. The board is 8 by 8, counting from 0, so columns and rows go from 0 to 7.
- To give one unit a one-off difference, add the number to that unit, for example `"hp": 60`. It beats the job's number.
- To add a unit, copy a line and give it a new `id`. Keep a comma after every line except the last.

### `map.json` (the shape of the ground)

    "heights": [
      [0, 0, 1, 1, 1, 0, 0, 0],
      [0, 0, 0, 1, 0, 0, 0, 0],
      ...eight rows in all...
    ]

- This is the height of every tile on the 8 by 8 board. Each row of the file is one row of the board, and each number is one tile in that row.
- `0` is flat ground. `1`, `2` and `3` are raised blocks, each step a little higher.
- Right now height only changes how the board looks. It does not change walking, hitting or damage. If you want high ground to matter, tell Baiyee and it can be added.
- Keep exactly 8 rows with 8 numbers each, and a comma after every number except the last in each row.

The same file also has `terrain`, which says what kind of ground each tile is. It is 8 rows, and each row is 8 letters:

    "terrain": [
      "sgrrrssg",
      "sssrsgss",
      ...
    ]

- `s` red sand, `d` dusty sand with pebbles, `c` cracked earth, `r` grey stone, `k` stone split by dark veins, `v` cave floor with a glowing sigil, `g` a withered thicket.
- Raised tiles look best as `c` (cracked earth), like the ledges in the map picture. Use `v` sparingly: it is the special floor in front of the sigil wall.
- Keep exactly 8 rows of 8 letters, and a comma after every row except the last.

The file also has `setting`: `"cave"` or `"wasteland"`. A cave is dark, closed in by rock walls, with torchlight and a shaft of daylight, and the floor fades into darkness around the board. The wasteland has the painted desert sky and the board floats over it. The first fight uses the cave.

The file also has `scenery`: decoration around and on the board. It never blocks a tile.

    { "prop": "sigilWall", "col": 6, "row": -1 }
    { "prop": "sandfall", "col": 1, "row": 1, "side": "left" }

- A block prop stands at a column and row. Use row `-1` (or column `-1`) for just behind the board, and `-2` for one step further back. The props are `cliffLow`, `cliffHigh`, `spire` (a stone spike) and `sigilWall` (the carved cavern wall). Add `"flip": true` to mirror one.
- A `torch` hangs on a wall at that spot: `{ "prop": "torch", "col": 4, "row": -1 }`. It flickers and gives off sparks.
- A `sandfall` pours sand off the `left` or `right` side of a raised tile, down onto the lower tile in front of it. It only shows if that tile really is lower.
- The pictures live in `public/art/terrain`. Replacing a picture there with a new one of the same name changes it everywhere.

### `terrain.json` (how height changes a fight)

- `rangedAccuracyPerLevel`: archers and the Sage get this much more chance to hit (percent) for each level they stand above the target, and this much less shooting uphill. Swords and spears are not affected.
- `openingHeightBonusPerLevel`: points on the opening beat of a clash for each level the one engaging stands above the other.
- `pushClimbLimit`: a fighter pushed in a clash cannot be shoved up a step higher than this (a taller step acts like a wall).
- `downhillPushExtra`: a push that goes downhill carries this many tiles further.
- `fallDamagePerLevel`: health lost for each level a pushed fighter drops. A fall can finish a fighter off.

## Character pictures (`art.json` and the `public/art` folder)

Picture files go in the folder `public/art`. The file `src/data/art.json` says which pictures belong to which unit.

    "h2": {
      "height": 100,
      "standing": {
        "downLeft":  {"file": "scout_stand_downLeft.png", "originX": 0.433},
        "downRight": {"file": "scout_stand_downRight.png", "originX": 0.469},
        "upLeft":    {"file": "scout_stand_upLeft.png", "originX": 0.486},
        "upRight":   {"file": "scout_stand_upRight.png", "originX": 0.449}
      },
      "poses": {
        "attack": {"file": "scout_attack.png", "originX": 0.348},
        "ready":  {"file": "scout_ready.png", "originX": 0.366}
      }
    }

- The name on top (`h2`) is the unit's `id` in `units.json`. A unit with no entry here is drawn as a colored circle.
- `height` is how tall the figure is drawn when standing, in pixels.
- `standing` has one picture for each way a unit can face: `downLeft` and `downRight` face the player, `upLeft` and `upRight` face away. If one is missing, the mirror image of the other side is used.
- `battle` (optional) is the same four facings in a fighting stance. A unit shows its `standing` pictures when relaxed and switches to `battle` whenever an enemy is within 3 tiles. Leave it out and the unit always stands relaxed.
- `buffed` (optional) has four facings for each Verse, like `"buffed": { "stone": {...}, "fury": {...}, "swiftness": {...} }`. While that Verse is on the unit, those pictures replace its standing ones. Gaha has them.
- `portraitHurt` (optional) is a face for when the unit is down to 35% health or less. It replaces the calm face on the unit card and in the turn bar.
- `poses` are action pictures, all facing RIGHT: `attack`, `windup`, `ready` (the stance while locked in an engagement), `guard`, `dodge`, `cast`. Facing left uses the mirror image. Missing poses are fine: the standing picture is used instead.
- `portrait` is a calm face picture, used in the turn order and the unit card. `shout` is a battle-cry face, used in the cut-ins (the banner that sweeps across for an engagement or a finishing blow). Units without them get a round token with their job letter.
- `originX` says where the body is across the picture (0 is the left edge, 1 is the right edge), so a figure with a long sword still stands in the middle of its tile.

## Effects test screen

Add `?lab` to the end of the web address (for example `http://localhost:5173/?lab`) to open a screen where you can tap a button to play each battle effect: slash, hit spark, dust, arrow, fire, lightning, ice, earth and screen shake.

## Engagements (`engagement.json`)

This is the Skirmish / Distraction system from the combat design notes. Every number is a first guess for playtesting.

- `dice` and `diceSides`: each side rolls 2 six-sided dice in a contest.
- `stalemateWithin`: if the two scores are this close or closer, it is a Stalemate.
- `decisiveMargin`: winning by this much or more is a big win.
- `styleStat`: which number each style fights with (Overpower uses power, Defence uses guard, Evasion uses agility).
- `pressBonus` / `holdBonus`: extra points for a style when it starts a contest, or when it receives one.
- `breakBonus` / `keepHoldBonus`: extra points when breaking away, or when keeping a foe locked.
- `heightBonusPerLevel`: points for standing higher than the foe.
- `offBalance`: what Off-Balance costs: points in a contest, defense and evade in ordinary attacks.
- `holdGroundChance`: chance (percent) that a style is not pushed back when it loses.
- `slipChance`: chance that a style avoids Off-Balance when it loses.
- `decisivePush`: how many tiles a style shoves its foe on a big win.
- `distractedHitBonus`: extra chance to hit a unit that is locked in someone else's engagement.

Each melee job in `jobs.json` has a `contest` line, for example:

    "contest": { "style": "defence", "power": 4, "guard": 8, "agility": 3 }

Only fighters (range 1) can start a clash, but anyone with a `contest` line can be caught in one. The Ranger has one, so a fighter standing next to an archer can Engage it. A caught archer cannot shoot until it gets free, and everyone else hits it 10% more easily (`distractedHitBonus`), so the team can pile onto it. Give a job no `contest` line (like the Sage) and it can never be caught. `rangedBreakChance` in `engagement.json` is how often (in %) a caught enemy archer tries to Break away on its turn, unless it is winning the clash.

### The stance duel (also in `engagement.json`)

`mode` picks how clashes work: `"stance"` is the stance duel from the v0.4 design, `"classic"` is the older Engage with Press / Break away. Everything below is for the stance duel.

- Every turn of a unit locked in a clash is a **beat**: it picks a stance, and its foe answers. An enemy answers by its class habits (the player cannot see it in advance); a hero answers with the stance it last used (shown as a tag over the hero).
- `stances`: Press, Guard, Slip and Break away, and the number (`stat`) each one uses.
- `beats`: which stance beats which. Now: Guard beats Press, Slip beats Guard, Press beats Slip. `matchupBonus` is the points for having the stance that wins.
- `breakVs`: points for breaking away against each stance (easy against a Guard, hard against a Press).
- `affinityBonus`: points for a class's strong stance (+1) and weak stance (-1). Each melee job in `jobs.json` has a `stances` line, for example `"stances": { "press": "average", "guard": "strong", "slip": "weak", "break": "average" }`. A strong stance shows a * on its button, and Auto picks it.
- `beatDice`: dice per side in a beat (3). `statWeight`: how much the stat counts (0.5 = half). These keep beats uncertain; `beatOddsNote` lists the odds they give.
- `momentum`: the track runs to `max` (3) each way. `leadAt`/`leadBonus`: points for the side that is ahead by 2. `winShift`: how far a win moves it, `pressWinShift` for a winning Press, `decisiveExtra` for a big win.
- At +3 the beat is **decisive**: the loser is thrown Off-Balance and pushed back (`holdGroundChance` and `slipChance` still let some classes resist), the winner lands a free strike if `decisiveStrike` is true, and the track goes back to 0.
- `poise`: the pool for Empower (`max`, `start`, `refill` each turn, `empower` = the points it adds).
- `aiReadChance`: how often (percent) an enemy picks the stance that beats the hero's last one.

## Spells (`spells.json`)

The Sage's spells. Every spell has:
- `name` (the full name), `button` (the short name on its button), `short` (the tag above the unit), `text` (one line explaining it, kept short so it fits on screen).
- `mp`: what it costs. `range`: how many tiles away it reaches. `turns`: how many of the target's turns it lasts.
- `use`: `"both"` works during a clash too, `"battlefield"` only outside one, `"engagement"` only in one.
- `group`: spells with the same group share one button in the menu (Verse, Escape).
- `kind` says what it does:
  - `buff` (the Verses): `boosts` changes normal fighting (for example `"defense": 2`), and `stat` and `amount` change clash contests. `slipChance` and `holdChance` add to the chance to slip Off-Balance or hold ground. A unit has one buff at a time: a new one replaces the old.
  - `hex` (Slow): `delay` pushes the enemy's next turn back, `speedLoss` lowers its speed while it lasts.
  - `escape` (Husk): the caster slips up to `range` tiles away and leaves a decoy that looks exactly like her. She is drawn faded and enemies cannot see her: they chase and strike the decoy instead. The trick ends when the decoy is struck (it bursts and she shows herself) or at the start of her next turn. Using Husk spends the rest of her steps.
  - `rest` (Meditate): gives back `restore` MP, ends the turn, and leaves the caster `exposed` (lower defense and evade) until its next turn.
- `affinity`: the class a spell suits, and how much stronger it is on that class. `{ "jobs": ["guardian"], "times": 2, "who": "a shield-bearer" }` makes a Verse of Stone twice as strong on a Guardian. `who` is the wording the game uses when it tells the player.
- Every unit with MP also gets 1 MP back at the start of each of its turns.

## Sound

All sounds and the battle music are made in code, so there are no sound files. The speaker button at the top right of the battle turns sound on and off, and the game remembers the choice. Sound starts after the first tap on the title screen, because browsers do not allow sound before the player has tapped something.

## Moving

A unit can walk as many tiles as its Move each turn, split into as many walks as you like. Walk 2 of 5, and the blue tiles come straight back for the other 3. Steps left over can still be used after attacking: the first button then reads "Move  3 left". Undo move (before attacking) goes back to where the unit started the turn, with every step back.

## Skills (Spear Throw, Herbs)

Skills live in `spells.json` like spells, with `"mp": 0` and a `cooldown` (how many of the unit's own turns before it can be used again). A job lists them in `jobs.json` under `"spells"`. A fighter with skills gets a **Skills** button, which holds Engage and its skills.

- `spearThrow` (Spearman): `kind` "throw". Hits an enemy up to `range` tiles away and knocks it back `push` tiles (off a ledge, it falls).
- `herbs` (Guardian): `kind` "heal". Heals the unit itself or an ally next to it by `heal`.

## Signature stances

A job with a `"signature"` line in `jobs.json` has a signature stance in a clash. Its defence works while it is in a clash and its last stance is the signature stance. The numbers are in `engagement.json` under `"signatures"`, each with a note saying what it does.

- **Bloodied Press** (`bloodied`, on the Warlord): every hit taken adds a stack (BLOODIED 1 to 3). In Press each stack takes 1 off every hit. Winning a beat with Press lands a quick hit of 1 + stacks, and a decisive win pushes 1 tile further.
- **Counter-Press** (`counter`, on the Bruiser): in Press the gauntlet soaks up to 4 of the first hit after each beat. Every 4 soaked is 1 Charge (up to 3). Losing a beat releases all Charge as a counter-punch of 3 per Charge.
- **Bulwark** (`bulwark`, on the Warden): each beat in a row held in Guard adds a level (BULWARK 1 to 3), and each level pushes him 1 tile less. An even beat in Guard gives back 1 Poise and 2 health.

## Auto or Manual stances

`stanceChoice` in `engagement.json` is how heroes pick stances in a clash until the player switches: `"auto"` (one Fight button picks the signature or best stance, and switches to the counter if the foe's last stance would beat it) or `"manual"` (Press, Guard and Slip buttons). The player's choice is remembered on their device.

## Turning the camera

The two round buttons at the bottom corners of the board (or Q and E on a keyboard) turn the camera a quarter turn around the board. The battle does not change, only the view. The small diamond next to the left button shows which side you are looking from: the gold dot is the board's first corner.

Scenery in `map.json` with a `col` or `row` outside the board (the cave walls, the torches, the sigil wall) is the room around the board. Its `col` and `row` are places in the view, so it always stays on the far side and never blocks the board. Scenery on the board (the sandfalls) turns with the board; a sandfall is only shown while its cliff face points toward the camera.

## Spell pictures

The pictures in `public/art/fx` come from the effect sheets: `strike_0` to `strike_6` (lightning crashing down), `crackle_0` to `crackle_4` (the ground crackling), and the Fury, Swift and Stone auras. They are drawn with their black background turned to light, so a new picture should also be on a black or plain dark background. If a picture is missing, the game falls back to the effect it drew before.

## Figure size

`figureScale` in `map.json` sets how big every character is drawn (1 = full size). It is 0.86 now, so figures on neighbouring tiles overlap less.

## Husk echo

If nobody strikes the Husk decoy before the caster's next turn, she shows herself and the decoy glows violet (ECHO). Her next spell that turn is echoed by the decoy: Lightning fires a second bolt at the same target, and a Verse or Slow is twice as strong. The decoy then bursts. An echo she does not use fades at the end of her turn.

## The archer: dagger and Poison Arrow

- `closeWeapon` in `jobs.json` (on the Ranger): right next to a foe she fights with her dagger instead of the bow. `attack` is how much weaker it is (-2), and `pose` is the picture she strikes with.
- `poisonArrow` in `spells.json`: `damageShare` of a bow shot lands now, then `poison` damage at the start of each of the target's next `turns` turns. Poison never takes the last point of health, and Herbs cures it. `cooldown` is the wait between arrows.
- The enemy archer uses Poison Arrow on the healthiest foe in reach that is not poisoned yet, and steps away from fighters before she shoots.

## Facings, weakened looks and size (Oct 27)

- A pose in `art.json` can be one picture (drawn facing right, mirrored for left) or four facings like `standing`. Gaha's and the bull's `ready` (their clash stance) and the archer's `attack` and `ready` have four, so they face their foe in any direction.
- `weak` is how a unit stands at 35% health or less: four facings (Gaha's bloodied sheet) or one picture (Layra, the bull, the archer).
- A unit's size is set from its tallest standing picture, so it no longer changes with the way it happens to face first.
- In a turnaround sheet the figures go: front, front-right, right, back turned right, back, back turned left, left, front-left. The game's four facings are the 2nd (downRight), 4th (upRight), 6th (upLeft) and 8th (downLeft).

## Spear reach, Meditate and the aimed Poison Arrow (Oct 27)

- Spearman: `"range": 2` with `"melee": true` (still a close fighter who can Engage and clash) and `"lineReach": true` (past the next tile, only in a straight line).
- Meditate: she sinks into a trance. Her next turn is spent in it too (she can't act), then 6 MP come back. She is Exposed the whole time.
- Poison Arrow: she takes aim this turn (AIMING over her, MARKED over the target) and the arrow flies at the start of her next turn, if the target is still within reach and she isn't caught in a clash. Poison is 3 a turn again.

## Stun, Shield Toss and Intercept (Oct 27)

- **Stunned** (`src/data/conditions.json`): the unit loses its next turn. While stunned it cannot dodge, and every hit on it is a flank hit for `flankDamage` extra damage (3).
- **Shield Toss** (`shieldToss` in `spells.json`, on the Warlord, so the bull has it): hurl the shield at an enemy up to `range` tiles away for `damageShare` of a normal hit; a hit stuns it. The enemy bull uses it on a foe he can't reach this turn, a caster first.
- **Intercept** (`intercept`, on the Guardian, so Sudeen has it): charge up to `range` tiles to an enemy and slam it for `damageShare` of a normal hit. The slam always lands. It stuns the target, or knocks it back `push` tiles instead if it is Off-Balance. The charge uses up the rest of his steps.

## Interruptions and Poise (Oct 27)

- A hit (or a fall) breaks a Sage's meditation (no MP comes back) and an archer's aim (the Poison Arrow never flies). Poison ticks do not.
- Poise only comes back while a fighter is out of a clash (`refill`), not during one (`refillInClash`, 0), so every Empower in a clash really costs.

## Balance (Oct 27)

The enemies have about 20% more health than their jobs give them, set in `units.json` (`"hp"` on Tayo 53, the bull 48, the archer 29). With that, the automated test player wins about 4 battles in 10; a person plays better than it. To make battles easier or harder, change those numbers.

Rabdul (Oct 27, evening) keeps his job's own health (34) and is slower than Gaha (speed 9, 3 steps, in `jobs.json` under `twinSpear`). At Gaha's speed he reached Layra in a turn or two and the test player won 0 battles in 8; slowed down, it won 4 in 8.

## Rabdul, Double Hit and the bench (Oct 27, evening)

- **Rabdul** (`e4` in `units.json`) uses the `twinSpear` job in `jobs.json`. It is called "Spearman", like Gaha's job, but it is a different kit: a two-headed spear fought up close (`range` 1, no Spear Throw) with **Double Hit** instead.
- **Double Hit** (`doubleHit` in `spells.json`): two quick strikes on an enemy next to him (`hits` 2), each for `damageShare` of a normal hit (0.6), then a wait of `cooldown` turns (2). The enemy Rabdul uses it whenever it is ready.
- **The bench**: `"bench": true` on a unit in `units.json` keeps it out of the battle without deleting it. Tayo is benched so Rabdul can take his place. To bring Tayo back, remove that line from Tayo and add it to someone else (or to nobody, for a 4 against 3).

## Herbs on yourself (Oct 27, evening)

- Tap Herbs, then tap Herbs again to use them on Sudeen himself. Tapping a green tile still heals an ally.

## Status icons and the Slow look (Oct 27, evening)

- A spell with `"icon"` in `spells.json` shows a small picture over the unit instead of a word. The pictures live in `public/art/icons/` (for example `slow.png` for `"icon": "slow"`). Slow is the first; any status can get one the same way.
- Casting Slow plays the gravity effect from the effect sheet, and a faint ring stays on the slowed unit until Slow wears off.

## Living clashes and faces (Oct 27, evening)

- While two fighters are locked in a clash and it is somebody else's turn, they keep trading blows every couple of seconds: one strikes, the other blocks or dodges. Nothing changes in the numbers; it is only for the look.
- During a clash beat, each fighter's face slides in at the side of the screen (hero on the left, enemy on the right). The winner of the beat shouts, the loser winces, and the faces go when the beat ends.

## Layra (Oct 27, evening)

- Her front facings now use her level-gaze battle pose, and Meditate shows her kneeling. Her back view still looks a little upward; it needs a new turnaround picture.

## Phase 1 of the roadmap (29 Oct)

- **Line of sight** (`terrain.json`, `sightHeight`): arrows and thrown weapons (bow shots, Poison Arrow, Spear Throw, Shield Toss) fly from chest height to chest height, `sightHeight` levels above each unit's tile. A tile in between whose top reaches that line stops the shot. With 1.5, a block 2 levels higher than both units hides the target; 1 level does not. Magic is never stopped, and a skill with `"pierce": true` in `spells.json` isn't either. A unit marked by a Poison Arrow can duck behind cover: the arrow shows "Blocked".
- **Wall slam and Disoriented** (`conditions.json`, `disoriented`): a push that runs into a wall, higher ground, the edge of the board or another unit stops there. The unit slams into it, takes `impactDamage` and is Disoriented until the end of its next turn: `attack`, `defense` and `evade` go down by those amounts, and every kind of magic hits it for `magicDamage` extra. This applies to every push (Spear Throw, clashes, Intercept's knockback).
- **The archer** (`jobs.json`, `ranger`): her bow reaches 5 tiles (`range`), and so does Poison Arrow (`spells.json`). Her AI looks for a tile she can shoot from that is as far as possible from every foe (up to 4 tiles, `KEEP_AWAY` in `enemyAi.js`), so you have to chase her; once someone reaches her and locks her in a clash, she fights with the dagger.
- **Sudeen's battle stance** (`art.json`, `h1`, `battle`): from his "battle ready" sheet, shown when a foe is within 3 tiles and in clashes. Down-left is the down-right picture mirrored.
- **Gaha's facing**: his standing, weak and Stone pictures had up-right and up-left swapped (his face pointed the wrong way). Rule for new pictures: in an up view, his face should point the way he's facing.
- **Rabdul's size**: `height` 112, like the bull, and his battle-stance pictures cut 20% bigger, because the crouch is drawn so low.

## Phase 2: the battle screen (29 Oct)

- The battle screen uses Suleiman's UI art, cut from his UI COMPONENTS sheets into `public/art/ui`: the draped top bar (`top.png`), the bottom panel (`bottom.png`), the hint bar (`hint.png`), the ring around the card portrait (`ring.png`), the glowing medal for the unit whose turn it is (`medal_glow.png`), the button bars (`bar_*.png` wide, `barS_*.png` half width, each in `normal`, `glow` and `grey`), and his 14 icons (`icon_*.png` round, `glyph_*.png` just the symbol for a button).
- To change a piece, replace its PNG with one of the same size. The buttons are cut from the bars to whatever size they need, so a new bar can be any size, but the round socket should stay on the left and the woven end on the right.
- A button glows while its action is in use (for example Move while you pick a tile) and turns grey when it can't be used. Long words shrink to fit before the woven end.
- Row 4 of a normal turn is now **Items | End turn**. Items stays grey until items arrive (roadmap Phase 5: digging through the map's props).
- If the UI pictures are missing, the game falls back to the older look drawn in code, so it never breaks.

## Fixes 1.7 and 1.8, and the skeleton test (29 Oct)

- **The archer's stance**: her battle-ready pictures were never listed as her `battle` set in `art.json` (`e3`), so she always stood relaxed. They are now, and like everyone she takes the stance when a foe is close. Because she fights from far away, "close" for her is her bow's reach (5 tiles), not 3.
- **The bull and Rabdul facing right at the start**: their down-left and down-right pictures were swapped (the turnaround sheets were labelled the other way round), the same mix-up Gaha's up views had. The pictures are renamed and the `originX` values swapped with them. Rule for new pictures: in a down view, the face should point the way the unit is facing.
- **Skeleton test**: a separate page at `/skeleton-test/` (not part of the game). Gaha is built from Suleiman's parts sheet and moved by code, next to the frame-by-frame thrust. `public/skeleton-test/rig.json` says where each part's joints are and how the parts hang together; the moves are at the bottom of `index.html`; the findings are in `notes.html`.
