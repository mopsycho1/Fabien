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
- `heightBonusPerLevel`: high ground in a clash, 2 per level. Keep it the same as `openingHeightBonusPerLevel` in terrain.json (that is the one the game reads; a test checks they match).
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

## Phase 3: Intercept and the Verse-changed moves (29 Oct)

- **Intercept** (`spells.json`, `intercept`) is now a long-range engage: Sudeen charges up to 4 tiles, hits for half damage (`damageShare`) and locks the enemy in a clash with him. If it was clashing with an ally, he takes over and the ally is free. No stun.
- **Verse-changed moves.** A spell with `"verse": { "of": "intercept", "with": "stone" }` replaces Intercept while a Verse of Stone is on the unit. `"of": "attack"` changes the ordinary attack, and `"jobs"` limits it to some classes. The button shows the new name while the Verse lasts, and the old move comes back when it fades. The ones in the game:
  - Sudeen: `shieldRam` (Stone: rams the enemy 2 tiles back, wall slam rule), `furyCharge` (Fury: full damage, no clash), `blitz` (Swiftness: stuns, no clash). `"effect"` says which: `lock`, `knockback`, `strike` or `stun`.
  - Gaha: `sonicJavelin` (Swiftness) with three forms, picked by where the foe is: 2 tiles or closer (`closeRange`) he dashes in and whirls the spear down; further (up to `range` 5) the throw hits every enemy in its line, through high blocks (`pierce`); a foe that is Off-Balance or Disoriented gets the zip and low sweep (`sweepShare` times a normal blow). It never misses. His frames are in `art.json` under `moves`.
  - Layra: `thunderclap` (Stone on herself: her Lightning knocks the target a tile back) and `wildfire` (Fury: fire that leaves a Burn of `burn` a turn for `turns` turns; Herbs put it out).
- **The MP bar.** Units that use magic always show MP. The others show it only while a Verse lends them some: a Verse that changes one of their moves lends its `mp` (twice as much when a Husk echo doubles it), and the changed move costs its own `mp` from that. Once it's spent, the move goes back to normal. A Verse move ignores the cooldown of the move it replaces, and starts that cooldown when used.
- **What a Verse does without changing a move**, also in `spells.json`: `stillGuard` on Stone (Gaha: if he doesn't move on his turn, half damage and he can't be pushed until his next turn; the word ROOTED shows over him) and `freeClimb` on Swiftness (Layra: she can step up any height and fly over units).
- **Climbing** (`terrain.json`, `climbLimit`): walking, a unit can step up at most 1 level from one tile to the next (down is always fine). On the current map some climbs now take the long way round, and the 2-high pillar in the middle can only be reached by Layra under Swiftness.
- **Swift looks**: Suleiman's swirl turns at the feet of anyone under Swiftness, and his trail plays behind them as they move (`public/art/fx/swift_*`).

## Status art: icons, cards and the Verse looks (30 Oct)

- **Status icons** (`public/art/icons`, cut from Suleiman's "status effects" sheet): over a unit, every status with a picture shows its icon in a thin bronze frame instead of the word, with a small number for stacks (Bloodied 2). The unit's card at the bottom shows the icon and the word together, so the icons are easy to learn; when a unit has too many for the card, the chips keep only the icons. ROOTED and the clash stances (PRESS, GUARD, SLIP) have no icon yet and keep their words. To change an icon, replace its PNG (64x64). A spell in `spells.json` picks its icon with `"icon"` (Slow, the three Verses).
- **The three Verses' icons** are the middle of his Swift, Fury and Earth's Bulwark cards (the Verse icons on his sheet were the wrongly named ones).
- **Earth's Bulwark**: the Verse of Stone's effect is now called Earth's Bulwark (`spells.json`, `stone`, `"effect"`). Its short word on the card is EARTH (`"short"`), because BULWARK is already the Warden's signature. Swift and Fury have `"effect"` too.
- **Status cards** (`public/art/cards`): a small card pops up on the character when a Verse lands (`"card"` in `spells.json`), when a unit is knocked Off-Balance, when a fighter spends Poise to Empower, and when a Press wins a beat in a clash. It holds for a moment with the name under it, then shrinks into the unit's icons. In a clash the card sits beside the fighter, away from the foe, so it stays clear of the banner. Cards for the same unit wait their turn.
- **Fury and Earth's Bulwark looks** (`spellArt.js`, `furyAura` and `bulwarkAura`): while Fury is on a unit, a ring of fire beats at its feet, red ribbons spin around it and sparks rise. While Earth's Bulwark is on it, three crystals from his card float round it. These are stand-ins made from pictures we already had, until he draws them in the Swift format.
- **Buttons**: Engage uses the Charge symbol from his status sheet, and Items uses his bag icon (`public/art/ui/glyph_charge.png`, `glyph_bag.png`).

## Fixes 1.9 to 1.11, the death effect, and the Verse looks from his sheets (30 Oct, evening)

- **MP numbers** now sit at the end of the MP bar on the unit's card (the bar is a little shorter to make room). Poise stays in the SPD line.
- **The archer's aiming picture** (`archer_poison.png`, the crouch she holds while she aims Poison Arrow) was drawn bigger than her other pictures, so it was shrunk to match. Every picture of a unit is shown at the same scale, so a new picture should be drawn at the same size as the unit's standing pictures.
- **Furious Charge**: Sudeen's Intercept under Fury (`spells.json`, `furyCharge`, `name` and `button`).
- **Sigil Dissolve** (`public/art/fx/death_0` to `death_7`): a defeated unit fades out as Suleiman's ring of sigils opens under it, rises and scatters, and leaves a faint ring that fades.
- **Fury and Earth's Bulwark landing**: his sequences play when the Verse lands (`fury_cast_*`, `earth_cast_*`). While Fury lasts, his ring of fire turns flat at the unit's feet (`fury_ground`). While Earth's Bulwark lasts, four of his crystals float round the unit (`earth_crystal_*`) over the first stage of his Earth sheet.
- **Gaha under Fury** (`art.json`, `h2`, `buffed`, `fury`): his turnaround with the fire painted on. Only the front and back views are used; the other two facings are their mirror images. `"auraPainted": ["fury"]` tells the game the fire is already in the pictures, so it adds only the ring and the sparks, not its own ribbons.
- **Gaha rooted** (`art.json`, `h2`, `rooted`): his low guard inside a dome of crystals, shown while he is ROOTED (he didn't move under Earth's Bulwark). He comes out of it at the start of his next turn. Any unit can have a `rooted` set.

## Phase 8: the new battle screen (30 Oct, night)

- **The screen takes the shape of the window** (`src/layout.js`): landscape on a computer or a phone held sideways, portrait on a phone held upright. One side is always 720 game pixels; the other stretches to match, so there are no black bars. Turning the phone lays the battle out again without losing its place. On Android the first tap on the title screen goes full screen; on an iPhone, "Add to Home Screen" does the same.
- **The frame follows Suleiman's mockups:** the turn order as portraits top left; the turn number and the tile in focus (its ground and height) top right, with the camera and sound buttons under it; the unit's profile bottom left (face, name, class, HP, MP and CT bars with their numbers, its stats in one row, its conditions); an info card bottom right for hints and previews. On a phone everything is drawn a bit bigger so it's easy to tap (`uiScaleFor` in `layout.js`).
- **Commands** are a small menu beside the unit whose turn it is. A skill's MP cost sits on the right of its row. The menu hides on the enemy's turn and while things move.
- **Tap to move:** on your turn the blue tiles show by themselves; tap one to walk. Tapping an enemy still walks up and attacks. To switch this off, set `this.autoMove = false` in `BattleScene.create`.
- **Over the characters** only a thin HP bar and small status icons remain; a gold diamond floats over the unit whose turn it is.
- **Clash banner** (`public/art/ui/clash_frame.png`, panel shapes in `src/data/clashBanner.json`): when a clash starts, both fighters' faces slam in from the sides in Suleiman's split frame, hero on the red panel, foe on the blue, using their battle-cry picture if they have one (`shout` in `art.json`).
- **Double-tap a Verse** to cast it on yourself, like Herbs.
- **The menu stays out of the way** (8.9): while you choose where to walk it sits where it hides the fewest blue tiles and characters (beside the unit, or in a corner above the cards). Once you pick something that needs a target, it shrinks to a small "✕ Attack" tag above the info card; tap the tag, or empty ground, to go back. The modes that count as picking a target are listed in `TARGET_MODES` at the top of `BattleScene.js`.
- The title, story and end screens keep their portrait design and are fitted into a landscape screen for now; the story screens get their own look with the painted stills later.

## Music and Suleiman's 31 Oct notes

- **Music** (`public/music`): `theme.mp3` (his 4-minute track) plays on the title, story and end screens; `battle.mp3` (his 3-minute track) plays in battle. To change a track, replace the file with an MP3 of the same name (MP3, 44.1 kHz, stereo, about 112 kbps keeps it light on phones). Volumes are in `TRACKS` at the music section of `src/audio.js`. If a track can't load, the battle falls back to the drums made in code.
- **Layra's menu**: the Spell button is now **Verses**, grouped by `"group"` in `spells.json`: `Blessings` (Swift, Fury, Earth's Bulwark) and `Hexes` (Slow). A spell with no group (Husk) sits on its own in the list. A spell of kind `rest` (Meditate) gets its own row on the main menu: tap once to read it, again to meditate.
- **The card's "Next turn" line** replaces the CT bar: CT is the turn meter, so the card says how many turns away the unit's next one is. The unit acting now has none.
- **Turn order numbers**: each waiting unit shows its place in the turn order over its head, matching the numbers on the turn list. In landscape the turn list runs down the left side, like Final Fantasy Tactics.
- **Victory**: the winners show their ready pose, then their victory pose, without jumping.
- **Developer tools** now live in the repo under `dev/` (tests, sheet cutters, browser checks); see `dev/README.md`.

## Verse moves, round two (31 Oct)

- **Fury Dive** (`spells.json`, `furyDive`): Fury turns Gaha's Spear Throw into a leap of up to `range` tiles, over heads and walls, that slams down next to the foe for `damageShare` times a normal blow. It never misses, and every enemy next to where he lands is knocked Off-Balance. It costs the Verse's lent MP like Sonic Javelin. His pictures are the `furyDive` move in `art.json` (`h2`): wind-up, leap, dive, slam, landing.
- **Sudeen's charges, frame by frame** (`art.json`, `h1`, `moves`): `furiousCharge` (ready, two charging frames, the leaping strike, the fire explosion, landing) and `shieldRam` (brace, two charging frames, impact, push, brace). Plain Intercept and Blitz keep his shield-up pose.
- **The Husk gust**: a Husk cast while Layra is under Swiftness leaves a decoy with wind swirling at its feet. When an enemy strikes it, it bursts in a howling gust and every enemy next to it is blown 2 tiles away (falls and wall slams apply). The wind does no damage, and allies are left alone.
- The frames were cut with `dev/tools/make_moves31.py`.

## Phase 9: the new isometric look (31 Oct)

- **Everyone in the test battle except the archer now uses Suleiman's isometric re-render**: Sudeen, Gaha, Layra, Rabdul and the Bull Commander. For each pose, `art.json` lists one picture facing up (away from the camera) and one facing down. The game mirrors them for the other two facings, as Suleiman suggested. Heroes use his north-east and south-east figures, because they mostly face up-right towards the enemy; enemies use north-west and south-west. The new files are named `<name>_iso_<pose>_<facing>.png`.
- **Size**: each character is drawn the same size as before. Some old pictures are kept until he redraws them: knocked down, victory, the weakened look, and Verse looks he hasn't redone, such as Gaha under Fury. They were rescaled so they match the new ones.
- **Walking** (`"walk"` in `art.json`, `h2`): Gaha plays his three walking frames in the order 1, 2, 3, 2 while he moves between tiles, two frames per tile (`frameMs` 75). When he stops he stands in his normal pose. His frames walk away from the camera to the upper left. Walking up-right uses them mirrored. Walking towards the camera still uses the old hop until he has frames facing that way. To give another character a walk, add `"walk": { "frameMs": 75, "upLeft": [frame1, frame2, frame3] }` to its entry.
- **Spear Throw** uses his wind-up (`throw`) and release (`throwRelease`) pictures.
- **Layra casts in two steps**: first she concentrates (`chant`), then she casts (`cast`). Any character with a `chant` picture does the same. Under any Verse she stands in his blessing stance (`buffed`). Her battle stance and staff strike are "defending herself".
- **Layra can be caught in a clash** (`jobs.json`, `sage`, `contest`): an enemy next to her can engage her. She fends it off with her staff, but her clash numbers are weak, so her allies have to come and save her. She can't start a clash herself.
- **Rabdul's enchantment pictures** are in `art.json` as `chant`, `cast` and `fireAttack`, ready for Enchant (roadmap 4.1).
- **How the sheets were cut**: `dev/tools/iso31.py` removes the floor tiles, shadows and printed numbers from his sheets. `make_iso31.py` picks the figures and cuts them (per-sheet size corrections are in `mult.json` next to the cut files). `wire_iso31.py` writes `art.json` and rescales the old pictures each character keeps.
- **Tapping a unit standing behind another**: tapping its tile picks it, even when the shield or weapon of the figure in front covers the tile. Tapping the front figure's body still picks the front figure.

## The battle-screen batch (1 Nov)

- **His clash banners** (`"clash"` in `art.json`; pictures in `public/art/clash`): when two fighters who both have a banner clash, the hero's banner slams in from the left and the foe's from the right. The foe's is flipped to face him, with a small picture of its name plate laid over so the name still reads the right way. Their points meet in the middle. Sudeen, Gaha and the Bull Commander have one now; Gadara's and Alagara's are cut and waiting for Phase 10. Until both fighters have one (Layra, Rabdul and the archer don't yet), a clash shows the shared banner with both faces, as before. The banners load in the background after the battle starts, so they don't slow the first load. To add one: put his 1600 by 900 picture in `dev/tools/cut_banners31.py`'s list, run it, and add the `clash` entry it prints to the character in `art.json`.
- **Move the menu**: drag it by the row of gold dots along its top. It stays where you put it for the rest of the battle, for every hero, and the dots turn bright gold. Double-tap the dots to send it back beside the unit.
- **His cursor** (`src/cursor.js`, pictures `public/art/ui/cursor_*.png`, tips in `src/data/cursor.json`): on computers the mouse pointer is his arrowhead. It glows over anything you can tap, shows rings while the button is held, and shows a dashed ring while the game is busy (moves playing, the enemy's turn). Phones and tablets have no cursor.
- **Turn buttons on phones**: on a phone or tablet the two turn-the-map buttons sit halfway down the left and right sides of the screen, under your thumbs. The little map of the board stays top right. On a computer they stay top right as before.
- **Herbs are thrown** (`spells.json`, `herbs`): Sudeen throws the pouch to an ally up to `range` tiles away (2), one tile further for each level he stands above them (`rangePerLevel`). The pouch flies in an arc, so walls don't stop it, and the healing lands when it does. On himself he just uses it.

## Phase 11: the Hidden Cavern (1 Nov)

- **Maps live in `src/data/maps`.** The game is fought in `cavern.json`, Suleiman's Hidden Cavern. `yoba.json` is the first cave map, kept because the rule tests in `dev/tests` were written for its tiles. A battle in `story.json` can name its map with `"map": "cavern"`; with no name it uses the cavern.
- **Editing the cavern** (`cavern.json`; each part has a note beside it):
  - `board`: how many tiles a side (9) and how big they are. The tiles are bigger than on the first map, which gives the characters more room. `figureScale` sets how big the characters are drawn.
  - `heights`: one row per line, as his height breakdown: 0 water, 1 low, 2 mid, 3 high. Row 0 is the far side, where the enemies start.
  - `terrain`: one letter per tile. F stone floor, S sand, R rubble, G the platform's sigil stone, W shallow water, B a wooden bridge over the water.
  - `sigilCircle`: the tile his sigil ring is drawn round, across the 3 by 3 platform.
  - `starts`: where each unit starts, by its id in `units.json`.
  - `waterfalls`: water pouring off a ledge into the water below it.
  - `lamps`: the ritual lamps, which also give the cavern its light.
  - `surround`: the ledge and rock walls round the far sides, and his props on the ledge.
- **The bridges are the way onto the platform.** A unit can step up at most one level, so it can't climb from the water (0) onto the platform (2). It has to cross a bridge (1). Layra under Swiftness ignores this, and Gaha's Fury Dive leaps.
- **His pictures** (cut by `dev/tools/make_cavern.py` into `public/art/terrain/cave_*`): the four looks of each ground, his sunlit and shadowed rock for the sides of the tiles and the walls, his eight props, and his tall cavern painting behind the board. The cavern is lit only by fire, as his sheet says ("no natural openings"). Each tile is as bright as the lamps and braziers near it make it.
- **Water** (rules in `terrain.json`, `water`):
  - Units can wade through it. A unit standing in water is **Drenched** and stays so for 2 of its own turns after it leaves.
  - A Drenched unit takes 1.5 times the damage from lightning (Layra's Lightning and Thunderclap) and half from fire (Wildfire), and can't be set alight.
  - Walking into water puts out a burn. Wading figures stand in the water up to their shins.
  - What an attack is made of is `"element"` in `jobs.json` (Layra: lightning) or `spells.json` (Wildfire: fire, Thunderclap: lightning).
- **The camera** (`"camera": "follow"` in the map):
  - **On a screen too small to show the whole board clearly**, the battle is played zoomed in, and the camera turns to whoever's turn it is.
  - **Drag the board** to look around. A drag never moves anyone, because taps on the board happen when the finger lifts.
  - **Pinch, or use the mouse wheel**, to zoom between the whole board and close up.
  - **Tap the little map** top right for the whole board, and tap it again to go back to the unit.
  - **On a computer** the whole board usually fits, so the camera stays put.

## The clean-up batch (1 Nov)

- **Blue and red tiles in the Final Fantasy Tactics style**: each highlighted tile is a see-through pane with a small gap round it and a bright glowing edge, and they all pulse together (`showHighlights` in `BattleScene.js`). Making them bend over slopes needs ramp tiles (roadmap Phase 12).
- **Gaha's clash close-ups** (`art.json`, `h2`, poses `clashPress`, `clashGuard`, `clashSlip`): when the camera zooms in on a clash he shows his lunge, his block and his low dodge. Any character can get these by adding the same three poses. His low dodge is now his everyday dodge too.
- **Sudeen's slip strike** (`h1`, `dodge` and `slipStrike`): when he wins a clash beat with Slip, he dodges and then strikes.
- **Empower**: spending Poise to Empower a stance makes his golden aura burst up round the fighter (`public/art/fx/empower_aura.jpg`, drawn on black so it glows).
- **Layra concentrating**: as she gathers a Verse, its element rises round her from his sheets: wind for Swift, earth for Earth's Bulwark, fire for Fury, the purple swirl for Slow. Wildfire flies as his fire.
- **Sonic Javelin in his new frames** (`h2` poses `sonicWindup`, `sonicClose`; `fx/sonic_spear.png`, `fx/sonic_impact.png`): the wind-up, the spear in flight, the moment of impact, and the close-range strike. His release picture is being redone, so Gaha holds the wind-up as the spear leaves. When the new one comes, it goes in as the frame after the wind-up.
- **Layra injured**: his 1 Nov set.
- All cut by `dev/tools/make_cleanup.py`.

## Phase 4: the enemy skills (1 Nov)

- **Rabdul's Enchant** (`spells.json`, `enchant`): he sets Shango's symbol on a weapon, his own or an ally's up to 3 tiles away. For 3 of that unit's turns its hits do +2 damage (`"damage"`), or +1 against a Drenched target. Rabdul has 9 MP (`jobs.json`, `twinSpear`) and it costs 3, so he can cast it three times a battle.
- **Enchanted looks** (`art.json`, `"enchanted"` under a character): while enchanted, a character's `"battle"` pictures and any `"poses"` listed there replace its usual ones. The bull has his flaming mace and shield, the archer her flaming bow, and Rabdul strikes with his flaming spear. Any character can get a look by adding an `"enchanted"` entry.
- **Tayo's Earth Drive** (`spells.json`, `earthDrive`): a spike of rock bursts up under the foe in front of him. It does half damage (`"damageShare"`) and throws the foe back 1 tile (`"push"`). The spike stays as a wall for 2 of his turns (`"turns"`): nobody walks through it and it stops arrows.
- **Who fights on the Hidden Cavern** (Suleiman's plan, 3 against 3): Tayo in for the bull. Tayo is benched in `units.json`, the cavern brings him in (`"alsoFighting"` in `maps/cavern.json`) and benches the bull (`"sittingOut"`). For all four enemies, empty `"sittingOut"`; four were tried and the heroes lost every test battle.
- **Calmer lights**: the cavern's flames breathe slowly, sparks are rare, the glowing dust is gone, and the water glints and waterfall spray are softer (`boardArt.js`, `atmosphere.js`).
- Cut by `dev/tools/make_phase4.py` from his 29 Oct sheets in `CHARACTER UPDATES`, and wired into `art.json` by `dev/tools/wire_phase4.py`.

## Phase 5: items
- src/data/items.json: "items" (name, what it does, colour), and "start" (what each class carries). A unit in units.json can have its own "bag": { "sheaBalm": 2 }.
- Buried things: "digsites" in src/data/maps/cavern.json (col, row, prop pots or bones, item).
- Using an item or digging takes the unit's action.

## 8 Nov batch: Sudeen's Fury and base sets, two clash banners, the sand impact (roadmap 6.35 to 6.37)
- Sudeen's pictures for a Verse live under `"buffPoses"` in `art.json` (`"fury"`: `"attack"` and `"windup"`, four facings each) and `"buffed"` (`"fury"`: his Fury stance). His normal attack and wind-up are `"poses"`: two facings drawn, the other two are mirrored by the game.
- Furious Charge (`"moves"`, `"furiousCharge"`): four frames. `"chargeFrames"` are shown in turn while he runs, `"strikeFrom"` to `"strikeTo"` are the frames of the hit, then his shield push.
- A clash banner (`"clash"` in `art.json`) may leave out `"name"`: the archer has no name plate.
- The sand impact (`public/art/fx/sand_impact_ne.png`, `_nw.png`) plays for a hit of 9 or more damage on sand, floor, rubble or rock (`SANDY` in `BattleScene.js`).
- Cut by `dev/tools/make_nov9.py`, `cut_banners31.py` and `make_sand_impact.py`; wired by `dev/tools/wire_nov9.py`.

## 8 Nov batch 2: the archer's Smoke Bomb, Switch weapon, the Blinded status, the new deaths (roadmap 13.26, 13.29, 13.30, 16.2)
- Smoke Bomb is `"smokeBomb"` in `spells.json` (`"range"`: how far she slips after the throw, `"cooldown"`). She has it through `"spells"` of the Ranger in `jobs.json`.
- Blinded is `"blinded"` in `conditions.json`: `"missPenalty"` is how much less often its attacks hit, `"turns"` how long it lasts (1 = until the end of its next turn). A blinded unit also cannot start a clash or take aim.
- The smoke pictures are `public/art/fx/smoke_cloud_0` to `5` (the cloud growing) and `smoke_clear_0` to `3` (blowing away). `src/data/smoke.json` says where the middle of each picture's floor tile is. The throw is the move `"smokeThrow"` of the archer in `art.json`.
- Her AI throws it when a foe is next to her and she is at 60% health or less, or cornered (the numbers are in `smokeChoice` in `BattleScene.js`).
- Switch weapon: the Ranger's `"closeWeapon"` in `jobs.json` is the dagger (`"attack": -2` is how much weaker it hits). The bow reaches 2 to 5 tiles, the dagger the next tile only. The switch is free once a turn.
- Her Poison Arrow crouch is `"poses"` `"poison"` in `art.json`: four facings now.
- Cut by `dev/tools/make_smoke.py` (needs the Mac tool `sips` for the HEIC files), wired by `dev/tools/wire_smoke.py`; the Blinded icon by `make_blinded_icon.py`.
- Deaths (16.2): `playDefeat` in `BattleScene.js` is one continuous fall; a lethal push into a wall flies into it and slumps; `goldDissolve` in `src/spellArt.js` is the gold wipe, with the ground sigil `fx/death_sigil.png` (cut from `death_0` by `make_death_sigil.py`).

## 11 Nov batch: one knockback (roadmap 18.1)
- Every push in the battle is drawn by one file, `src/knockback.js`. The speeds and sizes are at the top of it, in `KNOCK`: `stepMs` (one tile on level ground), `dropMs` (a one level drop), `lift` (how far the body rises off the edge), `landHold` (how long it stays on hands and knees), `riseMs` (getting up), and the wall slam numbers.
- Fall pictures go in `src/data/art.json` under the character's `poses`, three names: `fallAir` (thrown back, in the air), `fallLand` (on hands and knees), `fallRise` (pushing up). Draw them facing right; the game mirrors them. Gaha has them. A character without them leans its `hurt` picture back in the air and uses `kneel` or `down` on landing.
- To cut a new fall sheet like Gaha's (one row: standing ruler, air, landed, rising): copy `dev/tools/make_gaha_fall.py`, change the names and the standing height, and run it with `~/.fabien-tools/venv/bin/python`.
- To look at falls and slams: `node dev/browser/knock.cjs <out dir>` (add `desktop` for the big screen), then `python3 dev/browser/knock_sheet.py <out dir>`.

## 12 Nov batch: the size ruler, the sharp archer, Kofi's first pictures (roadmap 18.2, 18.26, 6.38)
- Every character has a `"ruler"` list in `src/data/art.json`: per picture file, `"scale"` (1.4 = drawn 1.4 times bigger, so the head matches the standing picture) and, for a few, `"feet"` (0.94 = the ground is 94 percent of the way down the picture; the rest is dust below the feet). A picture that is not listed is drawn as it is. Do not edit the list by hand: the tool writes it.
- To change a size by hand, edit `dev/tools/ruler_marks.json` (per character: `"scale"` for one file or a whole family of files, `"feet"`, `"family"`), then run `~/.fabien-tools/venv/bin/python dev/tools/ruler.py measure`. `ruler.py audit` checks every head is within 8 percent; `ruler.py sheets <folder>` draws the contact sheets.
- A new character needs the box round the head of each standing picture in `dev/tools/ruler_heads.json` (left, top, right, bottom in the picture's own pixels) before the tool can measure him.
- New four-figure sheets are cut at the right size from the start with `dev/tools/sheet4.py` (see `make_archer_hq.py` and `make_kofi.py`): the standing sheet is the ruler, 300 pixels tall.
- Kofi is `"h4"` in `art.json` (standing, battle, and his casting pose as `windup` and `cast`). He is not in `units.json` yet.


## 13 Nov batch: the gap fix, the clash rule, turn shape, foot points (roadmap 13.47, 13.51 to 13.53, 18.2)
- **The rule of a clash beat** is written once, as `"beatRule"` at the top of `src/data/engagement.json`: score = 3 dice + half the stance stat (rounded up) + bonuses. The numbers it names are in the same file (`beatDice`, `statWeight`, `affinityBonus`, `matchupBonus`, `momentum`, `poise`). The older numbers marked "classic" are not used by the game.
- **High ground in a clash** is 2 per level: `openingHeightBonusPerLevel` in `terrain.json` (the one the game reads) and `heightBonusPerLevel` in `engagement.json`. Change both together; a test fails if they differ.
- **Turn shape:** a turn is one action and up to Move steps in any order, for both sides. What an enemy does with its leftover steps is in `src/enemyAi.js`, `chooseAfterTile`.
- **Foot points:** the ruler list in `art.json` can now hold `"footX"` per picture (0 = left edge, 1 = right edge): the point of the picture that sits on the middle of the tile. The tool writes it. To set one by hand, add `"footX": { "file_or_family": 0.47 }` under the character in `dev/tools/ruler_marks.json` (or `"keep"` to leave the cutter's anchor), then run `ruler.py measure`.
- **Design defaults** for Suleiman to confirm are in `docs/BATTLE_SYSTEMS.md` section 11 (dodges, Guard and Rest, par for fast wins).
- **Effects that stay put (roadmap 18.3):** every effect made of several frames is listed in `dev/tools/fx_anchors.json` with the point that must not move. After adding or replacing frames in `public/art/fx`, run `~/.fabien-tools/venv/bin/python dev/tools/align_fx.py fix <name>`, then `audit`.
- **Waterfalls:** the pictures are `public/art/fx/waterfall_tall.png`, `waterfall.png` and `splash_ring.png` (12 frames side by side). Where falls are is still `waterfalls` in the map file. To swap in new frames, put them in the three folders and run `dev/tools/make_water.py`.
- **Effect layers (roadmap 18.23):** the colours of each element and how hard each level of hit shakes the screen are at the top of `src/fxLayers.js` (`ELEMENTS`, `FEEL`). A skill names its element where it calls `showImpact` (for example `element: 'earth'`).
- **Suleiman's buff effects (13.46):** put his frames in `public/art/fx` as `buff_fury_cast_0.png`, `buff_fury_loop_0.png` and so on, then write the frame counts in `src/data/fxSlots.json`. Nothing else to change.

## 13 Nov late batch: falls and dodges (roadmap 18.18, 13.44)
- A fall is three pictures in `poses`: `fallAir`, `fallLand`, `fallRise`. Each can be one picture or a set by facing (`downRight`, `upRight`, ...); a facing that is missing is the opposite one, mirrored. Sudeen and Gaha have down-right and up-right.
- A miss shows the unit's `dodge` picture (also drawn by facing) for half a second. Every fighter has one now.
- To cut new sheets: `dev/tools/make_falls_dodges.py`; the notes at the top of that file say what each sheet is.

## 14 Nov batch: three archer fixes (roadmap 1.45 to 1.47)

- Which way she points: in `src/data/art.json`, under `e3`, each pose has four views (upLeft, upRight, downLeft, downRight). A view with `"flip": true` is that picture drawn mirrored. Her down-left battle stance and shot are mirrored pictures, because both of Suleiman's front figures point right. If a new sheet arrives, look at which way the bow points before trusting the order of the figures.
- Dagger or bow: nothing to edit. Between turns she holds the dagger when a foe she can see is next to her, the bow otherwise. The dagger's numbers are still `closeWeapon` in `src/data/jobs.json`.
- Hidden: a hidden unit cannot be chosen as a target by the other side. Area effects (Lightning's jump, Sonic Burst) still hit it, and a hit shows it again. How faint a hidden enemy is drawn: `HIDDEN_ALPHA_FOE` near the top of `src/scenes/BattleScene.js` (0.3 = 30 percent).

