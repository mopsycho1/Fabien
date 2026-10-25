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
- `hp` is health. `attack` and `defense` set damage: damage = attack minus defense, never below 1.
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

- `s` is sand, `c` is cracked earth, `r` is rock, `g` is dry grass.
- Small rocks and tufts are scattered on the ground automatically. Raised tiles look best as rock.
- Keep exactly 8 rows of 8 letters, and a comma after every row except the last.

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

## Spells (`spells.json`)

The Sage's spells. Each has a `stat` it raises in contests (and by how much), a `range` in tiles, and `turns` it lasts.
`slipChance` and `holdChance` add to the target's chance to slip Off-Balance or hold its ground. A unit can only have one spell at a time: a new one replaces the old.

## Sound

All sounds and the battle music are made in code, so there are no sound files. The speaker button at the top right of the battle turns sound on and off, and the game remembers the choice. Sound starts after the first tap on the title screen, because browsers do not allow sound before the player has tapped something.
