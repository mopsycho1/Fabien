# How battles work in Fabien (for Suleiman)

Written 13 Nov from the game's real data files, so every number here is what the game uses today. All numbers are first guesses for playtesting, so tell us what feels wrong. Names: Sudeen is the Guardian, Gaha the Spearman, Layra the Sage, Rabdul the Twin Spear, Tayo the Bruiser, the Bull Commander the Warlord, and the Archer is the Ranger.

## 1. Turn order and speed

- Every fighter has a **speed** number and a hidden **charge meter** that starts at 0.
- Time ticks forward. Each tick, every fighter's meter goes up by its speed. The first one to reach 100 takes a turn, then pays 100 and starts charging again.
- So speed 12 acts more often than speed 6. Nothing else decides turn order. If two are ready together, the one with the fuller meter goes first.
- The turn list on screen is a preview of this, played on copies.
- **Slow** hurts twice: it knocks 50 off the meter (the next turn comes later) and takes 4 speed for 2 turns.
- **Stun** makes the victim lose its next turn.
- On a turn you can **walk, then do one action**: attack, a skill, an item, dig up a buried item, start a clash, or end the turn. Once you have acted, you can only end the turn.

| Fighter | Speed | Move (tiles) |
|---|---|---|
| Scout class | 12 | 4 |
| Archer | 11 | 3 |
| Gaha | 11 | 4 |
| Layra | 10 | 3 |
| Sudeen | 9 | 3 |
| Tayo | 9 | 3 |
| Rabdul | 9 | 3 |
| Bull Commander | 8 | 3 |

## 2. Moving, height and terrain

- One step is one tile, up, down, left or right. No diagonals. You cannot walk through other units.
- **Climbing:** you can step up at most **1 level** at a time. Stepping down is always fine. A 2-level wall stops you. (Layra under Swiftness ignores this and flies over people.)
- The Hidden Cavern is a 9 by 9 board. Heights: 0 water, 1 low, 2 mid, 3 high. The platform in the middle is level 2, ringed by water at level 0. You cannot climb from water straight onto the platform (2 levels), so you use the four wooden bridges.
- **Shallow water:** you can wade through it. Standing in it makes you **Drenched**, and you stay Drenched for 2 of your own turns after you leave. Drenched units take **1.5 times lightning damage** and **half fire damage**. Water puts out a burn, and fire cannot light a Drenched unit.
- **Sand, rubble, floor, sigil stone and bridges** are the same to walk on. They only change the look.
- **Buried items:** pots and bone piles block their tile until a unit next to one spends its action digging up the item.
- **Rock spikes** (Tayo's Earth Drive) are walls for 2 turns of his: nobody walks through, and they stop arrows and thrown weapons.
- **Height and shooting:**
  - Ranged attacks gain or lose **10 accuracy per level** of height (better from above, worse uphill).
  - Arrows and thrown weapons fly from chest height to chest height (1.5 levels up). A block in the way that reaches that line stops the shot. In practice a block 2 levels higher than both fighters hides the target, and 1 level does not.
  - Magic and piercing skills are never stopped.
  - Spear Throw and Herbs reach **1 tile further per level** you stand above the target.
- **Falls:** a unit pushed down a drop takes **4 damage per level** it falls.

## 3. Attacks, hit chance and damage

- **Hit chance** = attacker's accuracy minus defender's evade, but never below 5 percent or above 95 percent. Nothing is certain and nothing is hopeless.
- It goes up by 10 against someone **Distracted** (busy in a clash with somebody else), and with Off-Balance's evade drop (see statuses).
- It goes down by 25 for lightning cast point blank (next to the caster), and by 45 if the attacker is **Blinded**.
- A Stunned target cannot dodge at all (evade counts as 0).
- **Damage** = attack minus defense, at least 1. Magic uses magic attack minus magic defense. Buffs add to these numbers (Fury +2 attack, Stone +2 defense).
- A Stunned target takes **+3** (a flank hit). A Disoriented target takes **+3 from any magic**. An Enchanted weapon adds its bonus on top.
- **The Archer** shoots up to 5 tiles but cannot draw her bow next to a foe. She can switch weapon for free once a turn: the bow (reach 2 to 5) or the dagger (only the tile next to her, 2 less attack).
- **Spears** (Gaha) hit 2 tiles away in a straight line. **Layra's lightning** reaches 4 tiles and jumps to a second enemy within 2 tiles for half damage.

| Fighter | Health | Attack | Defense | Magic atk | Magic def | Accuracy | Evade | Reach |
|---|---|---|---|---|---|---|---|---|
| Sudeen | 48 | 6 | 4 | 1 | 2 | 85 | 10 | 1 |
| Gaha | 36 | 8 | 2 | 1 | 2 | 88 | 16 | 2 |
| Layra | 28 | 3 | 1 | 7 | 5 | 85 | 12 | 4 (MP 12) |
| Rabdul | 34 | 7 | 3 | 1 | 2 | 88 | 14 | 1 (MP 9) |
| Tayo | 53 | 7 | 4 | 1 | 2 | 85 | 10 | 1 |
| Bull Commander | 48 | 8 | 3 | 1 | 1 | 85 | 8 | 1 |
| Archer | 29 | 5 | 1 | 1 | 3 | 90 | 15 | 5 |

(Health and the Archer's attack are set per fighter in the battle's unit list, so they can differ from the class sheet.)

## 4. Clashes (skirmish and distraction)

- A melee fighter can spend its action to **start a clash** with a foe next to it. Archers can be caught too (an archer in a clash cannot shoot). Layra cannot start one and is weak in one, so allies must save her. Husk always frees her.
- Both fighters are locked: no walking, no normal attacks. The rest of the battle carries on. The two are **Distracted**, so everyone else hits them more easily.
- **Every turn in the clash is a beat.** The unit whose turn it is picks a stance and the foe answers with one:
  - **Press** (uses power): attack hard.
  - **Guard** (uses guard): hold firm.
  - **Slip** (uses agility): dodge and counter.
  - **Break away** (uses agility): try to leave the clash.
- Stances beat each other in a circle: **Guard beats Press, Slip beats Guard, Press beats Slip**. A win in the circle gives +3, but dice still roll, so it is a bonus, not a guarantee.
- Each class is strong, average or weak in each stance (strong +1, weak -1). A beat adds the matching stat, the stance bonus, the dice (3 dice), height and buffs.
- **Momentum** is a shared track from -3 to +3. Winning a beat moves it your way by 1, a winning Press by 2. At +2 the leader fights better (+2). At +3 the beat is **decisive**: the loser is knocked Off-Balance and pushed back, the winner gets a free strike, and the track goes back to 0. A decisive Overpower win pushes 2 tiles.
- **Poise** is a pool of 3 (you start with 2). Spend 1 to **Empower** a stance for +3 in that beat. Poise comes back +1 on each turn spent outside a clash and does not come back inside one, so long clashes drain it. Kola nut refills it.
- **Height:** the one who starts a clash from higher ground gets a bonus for each level on the opening beat.
- **Break away:** a roll with agility. Breaking free puts you on a free tile next to you, preferably not next to the old foe. An archer caught in a clash tries to break away 50 percent of the time unless she is winning.
- **Fighting styles:** Overpower (Warlord, Bruiser, Striker) is stronger when pressing. Defence (Guardian, Warden) is stronger holding and often holds its ground when it loses. Evasion (Scout, Spearman, Ranger) often slips out of Off-Balance.

| Fighter | Style | Power | Guard | Agility | Press | Guard | Slip |
|---|---|---|---|---|---|---|---|
| Sudeen | Defence | 4 | 8 | 3 | average | strong | weak |
| Gaha | Evasion | 6 | 4 | 6 | average | average | strong |
| Layra | Defence | 2 | 4 | 3 | weak | average | weak |
| Rabdul | Overpower | 6 | 5 | 5 | strong | average | average |
| Tayo | Overpower | 7 | 6 | 3 | strong | average | weak |
| Bull Commander | Overpower | 8 | 4 | 3 | strong | weak | weak |
| Archer | Evasion | 2 | 3 | 5 | weak | weak | average |

- **Signature defences** (a class that has one uses it while in a clash in its signature stance):
  - **Bloodied Press** (Bull Commander): each hit taken adds a stack (up to 3). In Press, each stack takes 1 off every hit. Winning a Press beat lands a quick hit of 1 plus the stacks, and a decisive win pushes 1 tile further.
  - **Counter-Press** (Tayo): in Press his gauntlet soaks up to 4 damage of the first hit after each beat. Every 4 soaked is 1 Charge (up to 3). Losing a beat releases all Charge as a counter-punch of 3 per Charge.
  - **Bulwark** (the Warden class; no hero has it yet): each beat in a row held in Guard adds a level (up to 3), and each level cuts the push by 1 tile. An even Guard beat gives back 1 Poise and 2 health.

## 5. Every status

| Status | What it does | How long | How to get it, how to remove it |
|---|---|---|---|
| **Off-Balance** | Defense -2, evade -15, clash score -2 | Until the start of its next turn | Lose a clash decisively; Fury Dive on those beside the landing |
| **Distracted** | Others hit it +10 | While in a clash | Being in a clash with someone else |
| **Stunned** | Loses its next turn, cannot dodge, takes +3 from every hit | 1 turn | Shield Toss, Blitz |
| **Disoriented** | Takes 2 on impact; attack -2, defense -2, evade -10; magic does +3 to it | Until the end of its next turn | Pushed into a wall, higher ground or a unit |
| **Blinded** | Hit chance -45 (never below 5), cannot start a clash or take aim | Until the end of its next turn | Smoke Bomb |
| **Hidden** | Cannot be targeted | 1 turn | Smoke Bomb |
| **Slowed** | Next turn comes later (-50 charge), speed -4 | 2 turns | Slow (Husk-doubled: twice as much) |
| **Swift** | +15 evade, +1 move; in a clash +3 agility | 2 turns | Verse of Swiftness |
| **Earth's Bulwark** | +2 defense; in a clash +3 guard and harder to push | 2 turns | Verse of Stone |
| **Fury** | +2 attack; in a clash +3 power | 2 turns | Verse of Fury |
| **Rooted** | Half damage taken, cannot be pushed | Until his next turn | Gaha under Stone, if he did not move |
| **Poisoned** | 3 damage at the start of each of its turns, never the last point | 3 turns | Poison Arrow; cured by Herbs or Bitter leaf |
| **Burning** | 2 damage at the start of each of its turns, never the last point | 3 turns | Wildfire, fire Element Blast; put out by Herbs, Bitter leaf or water |
| **Enchanted** | Its weapon does +2 damage (+1 against Drenched) | 3 turns | Enchant (Rabdul) |
| **Drenched** | Lightning x1.5, fire x0.5, cannot be set alight | 2 turns after leaving water | Standing in water; Element Blast (water) |
| **Exposed** | Defense -2, evade -10 | While meditating | Meditate |
| **Meditating** | Cannot act on its next turn, then gets 6 MP | 1 turn | Meditate; a fall or a slam breaks it |

- A unit holds **only one buff** at a time (Swift, Bulwark or Fury). A new one replaces the old one, so buffs cannot pile up. A unit can carry a buff and an Enchant at once.
- A unit with no MP of its own gets MP lent to it by a Verse, but only if the Verse changes one of its moves. That lent MP pays for the changed move.

## 6. Every character's skills

Cooldown is in turns of that unit. "Verse" means Layra's buffs change a move into another one.

**Sudeen (Guardian)**
- **Herbs** (ally, range 2, +1 per level above): +10 health, cures poison and burn. Cooldown 3, 3 pouches a battle.
- **Intercept** (enemy, range 4): charge in, half damage, locks it in a clash with you. If it was clashing with an ally, you take over and the ally is free. Cooldown 3.
  - **Shield Ram** (with Stone, 3 MP): half damage, pushes 2 tiles, no clash. Into a wall: slam and Disoriented.
  - **Furious Charge** (with Fury, 3 MP): full damage, no clash.
  - **Blitz** (with Swiftness, 3 MP): half damage and a stun, no clash.
- Verse bonuses are doubled on Sudeen (shield-bearer) for Stone.

**Gaha (Spearman)**
- **Thrust** (normal attack): range 2 in a straight line.
- **Spear Throw** (enemy, range 3, +1 per level above): a hit pushes the target 1 tile (off a ledge it falls, into a wall it slams). A higher block stops it. Cooldown 3.
  - **Sonic Javelin** (with Swiftness, 3 MP): up close, dash in and whirl the spear. Far (5 tiles), a throw that hits every enemy in the line through blocks. At a reeling foe, zip in and sweep low for 1.5 times damage. Never misses.
  - **Fury Dive** (with Fury, 3 MP): leap up to 3 tiles over heads and walls, hit for 1.5 times damage, enemies beside the landing go Off-Balance. Never misses.
- **Stone passive:** if he does not move on his turn, he is Rooted (half damage, no pushing).

**Layra (Sage), 12 MP**
- **Lightning** (range 4, magic 7): jumps to a second enemy within 2 for half damage. Point blank it is 25 less accurate.
  - **Thunderclap** (with Stone): the bolt pushes the target 1 tile, still jumps.
  - **Wildfire** (with Fury): sets the target alight (2 damage a turn for 3 turns), does not jump.
- **Verse of Swiftness** (3 MP, range 3, 2 turns): +15 evade, +1 move. Twice as strong on a Scout or Spearman.
- **Verse of Stone** (3 MP): +2 defense. Twice as strong on a shield-bearer.
- **Verse of Fury** (3 MP): +2 attack. Twice as strong on a heavy hitter.
- **Slow** (4 MP, range 4): see statuses.
- **Husk** (5 MP, range 3): leave a decoy and slip up to 3 tiles away, even out of a clash. Enemies chase the decoy. If nobody strikes it by her next turn, it echoes her next spell (a second bolt, or a Verse or Slow twice as strong). Under Swiftness, a struck decoy bursts in a gust that blows adjacent enemies 2 tiles away.
- **Meditate** (free): rest a turn, then 6 MP return. You are Exposed meanwhile.

**Rabdul (Twin Spear), 9 MP**
- **Double Hit** (range 1): two hits at 60 percent each, each rolled on its own. When he attacks, there is a 35 percent chance he does this.
- **Enchant** (3 MP, range 3, 3 turns): sets Shango's symbol on a weapon, his own or an ally's. +2 damage on every hit (+1 against Drenched). Cooldown 3.

**Tayo (Bruiser)**
- **Punch** (normal attack).
- **Earth Drive** (range 1): half damage, push 1, and a rock spike stays as a wall for 2 of his turns. Cooldown 3.
- **Sonic Clap** (area, 2 tiles): every foe within 2 takes 30 percent damage and is pushed 1 tile. Cooldown 3.
- **Element Blast** (range 3, needs an element on him): full damage down a straight line. Enchanted gives a fire blast that burns. Drenched gives a water blast that leaves the target Drenched. It spends the element. Cooldown 3.
- **Counter-Press** (signature), see clashes.

**Bull Commander (Warlord)**
- **Shield Toss** (range 3): half damage and a stun for a turn. A higher block stops it. Cooldown 3.
- **Bloodied Press** (signature), see clashes.

**Archer (Ranger)**
- **Arrow** (range 5, or the dagger next to her).
- **Poison Arrow** (range 5): she takes aim this turn, and the arrow flies at the start of her next turn if the target is still in reach and in clear sight. Half damage, then 3 poison on each of its next 3 turns. Cooldown 3.
- **Smoke Bomb** (free of clashes only): Blind enemies next to her for 1 turn, then slip up to 2 tiles and be Hidden for 1 turn. The cloud stays until her next turn. Cooldown 3.
- **Switch weapon:** free, once a turn.

## 7. Items

Using one takes the unit's action, on itself or an ally standing next to it. Each fighter starts with the items below.

| Item | Effect |
|---|---|
| **Shea balm** | Heals 10 health |
| **Kola nut** | Fills Poise to full |
| **Spirit water** | Gives back 6 MP (units with magic only) |
| **Bitter leaf** | Cures poison and puts out a burn |

- Starting bags: Sudeen (balm, kola), Gaha (balm, bitter leaf), Layra (spirit water, bitter leaf), Rabdul (kola), Tayo (balm), Bull Commander (balm, kola), Archer (bitter leaf).
- More are buried on the Cavern map: balm in the pots on the left (column 1, row 3), spirit water in the pots on the right (column 7, row 3), kola in the bones on the left (column 1, row 5), bitter leaf in the bones on the right (column 7, row 5).

## 8. Relay Strike

When a push, pull or shove leaves a foe **standing next to one of your units**, that unit gets a **free hit**.

- It does **60 percent** damage, or **full** damage if the foe is Off-Balance.
- One relay per ally per round (one full cycle of turns). At most **two per push**, and the second hits at half strength.
- It does not happen if the ally is in a clash, Stunned, Meditating or cannot reach the foe.
- A push that slams the foe into something counts too. It works for both sides.

## 9. Knockback

- Every push (a lost clash, Spear Throw, Thunderclap, Shield Ram, Earth Drive, Sonic Clap, Husk's gust) uses the same rules.
- The unit moves straight away from the pusher, one tile at a time. It stops at the first tile that is blocked: the edge of the board, another unit, or a step up of more than 1 level.
- **Downhill pushes carry 1 tile further.**
- Each level it drops costs **4 damage**.
- **Slam:** if it hits a wall, higher ground or another unit before the push is used up, it takes **2 damage** and is **Disoriented**.
- A fall or a slam also breaks a trance or an aim.
- Resistance: a Rooted unit cannot be pushed at all, and a Warden's Bulwark cuts the push by 1 tile per level.
- Known problem: sometimes a pushed unit ends up in the space between blocks (roadmap 13.47). Not fixed yet.

## 10. Planned but not built yet

- **Reward fast wins:** the result screen shows the turn count against a par for the battle, a rating, and a bonus for beating par.
- **Pace:** faster enemy turns and animations only. No fatigue rule.
- **4 v 4 battles** and a wider Hidden Cavern.
- **Healing and combos for the enemy AI:** enemies healing themselves and allies, Sonic Burst with Earth Drive, and enemies foraging items (only Tayo uses items now).
- **Tooltips** for status effects and techniques.
- **New buff visual effects.**
- **Dodges for everyone** (open question).
- **Kofi, the summoned spirits, Gadara and King Alagura:** kits are written up but not in battle yet. Attunement (two Verses at once, only the King) is planned with him.
- **Real Guard and Rest actions**, and fixes for the gap-between-blocks knockback bug.
