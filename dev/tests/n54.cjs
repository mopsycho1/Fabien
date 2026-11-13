// 13.53 Turn shape: a turn is one action and up to "move" steps, in any order, for both sides.
// Heroes could already act and then walk their leftover steps; this checks it, and the new
// part: an enemy that has acted uses its leftover steps too (the archer backs off but keeps
// a shot; a close fighter that acted from a distance walks up; nobody leaves a fight).
// Run on the cavern:  FABIEN_MAP=cavern FABIEN_BENCH= node n54.cjs
const { start, battle } = require('./boot.cjs');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let fails = 0; const check = (n, ok, x) => { console.log((ok ? 'PASS ' : 'FAIL ') + n + (x !== undefined ? '  [' + x + ']' : '')); if (!ok) fails++; };
(async () => {
  const { w, game, errors } = await start();
  const b = await battle(game); await sleep(400);
  const G = w.__grid, AI = w.__ai, C = w.__combat;
  const U = (l) => b.units.find((u) => u.label === l);
  const [sudeen, gaha, layra, tayo, bull, archer] = ['H1', 'H2', 'H3', 'E1', 'E2', 'E3'].map(U);
  const rabdul = b.units.find((u) => u.side === 'enemy' && ![tayo, bull, archer].includes(u));
  const put = (u, c, r) => { u.col = c; u.row = r; const p = G.tileToScreen(c, r); u.view.setPosition(p.x, p.y); u.view.setDepth(G.depthFor(c, r) + 1); };
  const dist = (a, c) => Math.abs(a.col - c.col) + Math.abs(a.row - c.row);
  let ended = 0; b.endTurn = () => { ended++; };
  for (const st of b.sites || []) st.dug = true;
  const away = (u) => { u.col = -9; u.row = -9; u.view.setVisible(false); };
  const here = (u, c, r) => { u.view.setVisible(true); put(u, c, r); };
  const fresh = (active) => {
    for (const u of b.units) { u.engagedWith = null; u.engagement = null; u.hp = u.maxHp; u.alive = true; u.status = { offBalance: false, buff: null, hex: null, cooldowns: {} }; u.hidden = false; u.smokeHidden = false; u.aiming = null; u.markedBy = null; u.hasActed = false; u.hasMoved = false; u.stepsUsed = 0; u.moveFrom = null; u.knockPending = false; u.items = []; away(u); }
    archer.weapon = 'bow'; b.activeUnit = active; b.busy = false; b.cancelMode(); ended = 0;
  };
  const turn = async (unit) => { b.runEnemyTurn(); const t = Date.now(); while (ended === 0 && Date.now() - t < 12000) await sleep(20); await sleep(80); return ended > 0; };
  b.setSpeed('base', 4);

  // ---------- heroes: act, then walk ----------
  fresh(gaha); here(gaha, 4, 7); here(tayo, 4, 5);
  b.refreshButtons();
  b.onAttackButton(); b.handleTap(4, 5); b.handleTap(4, 5);
  { const t = Date.now(); while ((b.busy || !gaha.hasActed) && Date.now() - t < 8000) await sleep(20); await sleep(700); }
  b.refreshButtons();
  check('hero: after attacking without walking, the Move button still offers every step', gaha.hasActed && b.stepsLeft(gaha) === w.__status.moveOf(gaha) && b.slots[0].enabled && /Move/.test(b.slots[0].label.text), b.slots[0].label.text + ' left ' + b.stepsLeft(gaha));
  b.onMoveButton(); b.handleTap(4, 8);
  { const t = Date.now(); while ((b.busy || gaha.row !== 8) && Date.now() - t < 6000) await sleep(20); }
  check('hero: and can walk after the attack', gaha.col === 4 && gaha.row === 8 && b.stepsLeft(gaha) === w.__status.moveOf(gaha) - 1, gaha.col + ',' + gaha.row);
  b.refreshButtons();
  check('hero: but cannot act a second time', !b.slots[1].enabled);

  // ---------- the rule on its own (enemyAi.chooseAfterTile) ----------
  fresh(archer); here(archer, 4, 3); here(gaha, 4, 6);
  let t = AI.chooseAfterTile(archer, b.units.filter((u) => u.col >= 0), 3);
  const roomNow = dist(archer, gaha);
  check('rule: an archer with 3 steps left backs away to a tile she can still shoot from', t && dist(t, gaha) > roomNow && dist(t, gaha) <= archer.range && C.hasClearShot(t, gaha), t && t.col + ',' + t.row);
  t = AI.chooseAfterTile(archer, b.units.filter((u) => u.col >= 0), 0);
  check('rule: no steps left, no walk', t === null);
  put(archer, 4, 1); // already 5 away, the length of her reach: nothing to gain
  t = AI.chooseAfterTile(archer, b.units.filter((u) => u.col >= 0), 3);
  check('rule: with room enough already she stays', t === null, t && t.col + ',' + t.row);
  put(archer, 4, 4);
  t = AI.chooseAfterTile(archer, b.units.filter((u) => u.col >= 0), 3, () => false, { target: gaha, range: 3 });
  check('rule: taking aim, she keeps her target in reach and in clear sight', t && dist(t, gaha) === 3 && C.hasClearShot(t, gaha), t && t.col + ',' + t.row + ' dist ' + dist(t, gaha));
  fresh(bull); here(bull, 4, 1); here(gaha, 4, 2);
  t = AI.chooseAfterTile(bull, b.units.filter((u) => u.col >= 0), 3);
  check('rule: a close fighter with a foe next to it never leaves the fight', t === null);
  put(gaha, 4, 6); put(bull, 4, 2);
  t = AI.chooseAfterTile(bull, b.units.filter((u) => u.col >= 0), 2);
  check('rule: a close fighter with nobody near walks up', t && dist(t, gaha) < 4, t && t.col + ',' + t.row);

  // ---------- whole enemy turns ----------
  // the archer: shoots first (she has a shot from where she stands), then backs off
  fresh(archer); here(archer, 4, 7); here(gaha, 6, 7); // the flat walkway along the near wall
  const hp0 = gaha.hp;
  archer.status.cooldowns.poisonArrow = 3; archer.status.cooldowns.smokeBomb = 3; // a plain shot this turn (taking aim is a whole turn by itself)
  let shots = 0; const realAttack = b.performAttack.bind(b); b.performAttack = (...args) => { shots++; return realAttack(...args); };
  let ok = await turn(archer);
  check('archer: her turn ends', ok);
  check('archer: she shot (hit or miss)', archer.hasActed && shots === 1, 'hp ' + hp0 + ' to ' + gaha.hp);
  check('archer: then stepped back to the end of her reach, still able to shoot him', dist(archer, gaha) === 5 && dist(archer, gaha) <= archer.range && C.hasClearShot(archer, gaha), archer.col + ',' + archer.row + ' dist ' + dist(archer, gaha));
  check('archer: she walked no more than her move in the whole turn', archer.stepsUsed <= w.__status.moveOf(archer), archer.stepsUsed);
  { const p = G.tileToScreen(archer.col, archer.row); check('archer: and stands on the middle of her new tile', Math.hypot(archer.view.x - p.x, archer.view.y - p.y) < 0.5); }

  // the bull: Shield Toss from 3 tiles, then walks up to the stunned hero
  fresh(bull); here(bull, 1, 1); here(gaha, 1, 4);
  bull.stepsUsed = 0;
  // he may not walk before the toss in this check (he would rather close in): pin him by spending 2 of his 3 steps
  bull.stepsUsed = w.__status.moveOf(bull) - 2;
  b.enemyAttack(bull); // he has nobody in reach: Shield Toss
  { const t0 = Date.now(); while (ended === 0 && Date.now() - t0 < 12000) await sleep(20); await sleep(80); }
  check('bull: tossed his shield from a distance (hit or miss)', bull.hasActed && w.__status.cooldownOf(bull, 'shieldToss') > 0, 'acted ' + bull.hasActed);
  check('bull: then used his 2 steps left to walk up', dist(bull, gaha) === 1 && bull.stepsUsed === w.__status.moveOf(bull), bull.col + ',' + bull.row + ' steps ' + bull.stepsUsed);

  // a fighter in a clash does not walk
  fresh(tayo); here(tayo, 4, 7); here(gaha, 4, 8);
  ok = await turn(tayo);
  check('Tayo next to a hero: acts and stays in the fight', ok && dist(tayo, gaha) <= 2 && tayo.stepsUsed === 0, tayo.col + ',' + tayo.row + ' gaha ' + gaha.col + ',' + gaha.row + ' steps ' + tayo.stepsUsed);

  // the switch for tests
  fresh(archer); here(archer, 4, 7); here(gaha, 6, 7); b.enemySecondWalk = false;
  archer.status.cooldowns.poisonArrow = 3; archer.status.cooldowns.smokeBomb = 3;
  ok = await turn(archer);
  check('with enemySecondWalk off she walks, shoots and stops there (the old turn, for older tests)', ok && archer.hasActed && dist(archer, gaha) === 4, archer.col + ',' + archer.row);
  b.enemySecondWalk = undefined;

  const real = errors.filter((e) => !e.includes('focus()'));
  check('no page errors', real.length === 0, real.slice(0, 2).join(' | '));
  console.log(fails ? fails + ' FAILED' : 'ALL PASSED');
  w.close(); process.exit(fails ? 1 : 0);
})().catch((e) => { console.log('FAIL crash', e); process.exit(2); });
