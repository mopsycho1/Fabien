// Relay Strike (Suleiman's spec, roadmap 13.40), old flat map, run with FABIEN_BENCH=:
// a pushed foe that stops next to an ally of the pusher gets a free hit from that ally
// (60 percent, full if Off-Balance); one per ally per round; two at most per push, the
// second at half; not if engaged, stunned, out of range; a push toward an ally never harms it.
// Tested with Earth Drive, Sonic Burst (the clap) and Shield Ram, for both sides.
const { start, battle } = require('./boot.cjs');
const SP = require('../../src/data/spells.json');
const RR = require('../../src/data/relay.json');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let fails = 0; const check = (n, ok, x) => { console.log((ok ? 'PASS ' : 'FAIL ') + n + (x !== undefined ? '  [' + x + ']' : '')); if (!ok) fails++; };
(async () => {
  const { w, game, errors } = await start();
  const t0 = Date.now(); while (Date.now() - t0 < 8000 && !game.textures.exists('fx:spike_2')) await sleep(50);
  const b = await battle(game); await sleep(600);
  const G = w.__grid, S = w.__status, C = w.__combat;
  const U = (l) => b.units.find((u) => u.label === l);
  const sudeen = U('H1'), gaha = U('H2'), layra = U('H3'), rabdul = U('E1'), bull = U('E2'), archer = U('E3'), tayo = U('E4');
  const all = [sudeen, gaha, layra, rabdul, bull, archer, tayo];
  b.runEnemyTurn = () => {}; b.endTurn = () => {};
  const put = (u, c, r) => { u.col = c; u.row = r; const p = G.tileToScreen(c, r); u.view.setPosition(p.x, p.y); };
  const PARK = [[0, 8], [1, 8], [0, 7], [8, 0], [7, 0], [8, 1], [6, 0]];
  // a flat open 5 by 2 patch (the old map has no bigger one), centre (ox, oy): the usual downhill and cliff rules stay out of the numbers
  let ox = 0, oy = 0, found = false;
  for (let c = 0; c <= 9 && !found; c++) for (let r = 1; r <= 9 && !found; r++) {
    let ok = true; const h = G.getHeight(c, r);
    for (let dc = 0; dc <= 4; dc++) for (let dr = -1; dr <= 0; dr++) { const cc = c + dc, rr = r + dr; if (!G.isInsideGrid(cc, rr) || b.isBlocked(cc, rr) || G.getHeight(cc, rr) !== h) ok = false; }
    if (ok) { ox = c; oy = r; found = true; }
  }
  check('13.40 flat test patch found', found, ox + ',' + oy);
  const P = (u, dc, dr) => [u, ox + dc, oy + dr];
  const rel = (u) => (u.col - ox) + ',' + (u.row - oy);
  const reset = (placed) => {
    all.forEach((u, i) => { u.status = null; u.alive = true; u.hp = u.maxHp = 150; u.hasActed = false; u.hasMoved = false; u.stepsUsed = 0; u.accuracy = 999; u.engagedWith = null; u.meditating = null; u.relayTurn = undefined; put(u, ...PARK[i]); });
    for (const sp of [...b.spikes]) b.removeSpike(sp);
    for (const [u, c, r] of placed) put(u, c, r);
    b.busy = false; b.battleOver = false; b.cancelMode(); b.refreshStatusTags();
  };
  // spy: every relay strike (who, whom, nth, damage asked for, share of a full blow)
  let log = [];
  const realStrike = b.relayStrike.bind(b);
  b.relayStrike = (ally, foe, nth, done) => {
    const off = S.isOffBalance(foe), full = C.getDamage(ally, foe);
    const realLand = b.landHit.bind(b);
    b.landHit = (t, d) => { log.push({ ally: ally.label, foe: foe.label, nth, off, dmg: d, share: d / full, full }); b.landHit = realLand; return realLand(t, d); };
    return realStrike(ally, foe, nth, done);
  };
  const floats = []; const realFloat = b.floatText.bind(b);
  b.floatText = (u, t, ...rest) => { floats.push(u.label + ':' + t); return realFloat(u, t, ...rest); };
  const drive = (user, target) => new Promise((res) => { b.activeUnit = user; log = []; b.castEarthDrive(user, target, { ...SP.earthDrive }, res); setTimeout(res, 9000); });
  const near = (a, x, tol = 0.12) => Math.abs(a - x) <= tol;

  // ---------- Earth Drive, heroes pushed, Tayo's side relays ----------
  reset([P(tayo, 0, 0), P(gaha, 1, 0), P(rabdul, 2, -1)]);
  let hp0 = gaha.hp;
  await drive(tayo, gaha);
  check('13.40 Earth Drive pushes the foe 1 tile and it stops next to the ally', rel(gaha) === '2,0', rel(gaha));
  check('13.40 the ally relays once, for about 60 percent', log.length === 1 && log[0].ally === 'E1' && near(log[0].share, RR.share), JSON.stringify(log));
  check('13.40 the "Relay!" callout showed on the ally', floats.includes('E1:Relay!'), floats.filter((f) => /Relay/.test(f)).join(','));
  check('13.40 the foe lost the push damage plus the relay', gaha.hp < hp0 - 1, hp0 - gaha.hp);
  check('13.40 the ally stands where it was, unharmed', rel(rabdul) === '2,-1' && rabdul.hp === 150, rel(rabdul) + ' ' + rabdul.hp);

  // ---------- Off-Balance foe: full damage ----------
  reset([P(tayo, 0, 0), P(gaha, 1, 0), P(rabdul, 2, -1)]);
  S.applyOffBalance(gaha);
  await drive(tayo, gaha);
  check('13.40 Off-Balance foe: the relay hits for full damage', log.length === 1 && near(log[0].share, RR.offBalanceShare, 0.05), JSON.stringify(log));

  // ---------- two relayers: the second at half ----------
  reset([P(tayo, 0, 0), P(gaha, 1, 0), P(rabdul, 2, -1), P(bull, 3, 0)]);
  await drive(tayo, gaha);
  check('13.40 two relay at most per push', log.length === RR.perPush, log.map((l) => l.ally).join(','));
  check('13.40 the second strike is at reduced damage', log.length === 2 && near(log[1].share, RR.share * RR.secondShare) && log[1].nth === 1, JSON.stringify(log.map((l) => l.share.toFixed(2))));

  // ---------- who cannot relay ----------
  reset([P(tayo, 0, 0), P(gaha, 1, 0), P(rabdul, 2, -1)]);
  rabdul.engagedWith = layra; layra.engagedWith = rabdul;
  await drive(tayo, gaha);
  check('13.40 an ally in a clash does not relay', log.length === 0, log.length);
  reset([P(tayo, 0, 0), P(gaha, 1, 0), P(rabdul, 2, -1)]);
  S.applyStun(rabdul);
  await drive(tayo, gaha);
  check('13.40 a stunned ally does not relay', log.length === 0, log.length);
  reset([P(tayo, 0, 0), P(gaha, 1, 0), P(rabdul, 2, -1)]);
  rabdul.meditating = { restore: 1 };
  await drive(tayo, gaha);
  check('13.40 a meditating ally does not relay', log.length === 0, log.length);
  reset([P(tayo, 0, 0), P(gaha, 1, 0), P(rabdul, 3, -1)]); // diagonal, not next to where the foe stops (2,0)
  await drive(tayo, gaha);
  check('13.40 an ally not next to the foe does not relay', log.length === 0, log.length);
  reset([P(tayo, 0, 0), P(gaha, 1, 0), P(archer, 2, -1)]); // a bow cannot fire at the next tile
  await drive(tayo, gaha);
  check('13.40 an ally that cannot reach the foe (archer, point blank) does not relay', log.length === 0, log.length);
  // one per ally per round
  reset([P(tayo, 0, 0), P(gaha, 1, 0), P(rabdul, 2, -1)]);
  b.turnCount = 50;
  await drive(tayo, gaha);
  const first = log.length;
  put(gaha, ox + 1, oy); gaha.hp = 150; tayo.hasActed = false;
  await drive(tayo, gaha);
  check('13.40 one per ally per round: the same ally cannot relay twice at once', first === 1 && log.length === 0, first + ' then ' + log.length);
  b.turnCount += 10; put(gaha, ox + 1, oy);
  await drive(tayo, gaha);
  check('13.40 ...but is ready again a round later', log.length === 1, log.length);

  // ---------- Sonic Burst (the clap): two foes pushed, each gets its own relayer ----------
  reset([P(tayo, 2, 0), P(gaha, 3, 0), P(sudeen, 1, 0), P(rabdul, 4, -1), P(bull, 0, -1)]);
  log = [];
  await new Promise((res) => { b.activeUnit = tayo; b.castClap(tayo, SP.clap, res); setTimeout(res, 12000); });
  check('13.40 Sonic Burst: both pushed foes are relayed (one ally each)', log.length === 2 && new Set(log.map((l) => l.ally)).size === 2, JSON.stringify(log.map((l) => l.ally + '>' + l.foe)));
  check('13.40 Sonic Burst: the relays come after the burst, not before', rel(gaha) === '4,0' && rel(sudeen) === '0,0', rel(gaha) + ' ' + rel(sudeen));

  // ---------- Shield Ram, the heroes relay for their side ----------
  reset([P(gaha, 0, 0), P(rabdul, 2, 0), P(sudeen, 4, -1), P(layra, 3, -1)]);
  log = [];
  await new Promise((res) => { b.activeUnit = gaha; b.castIntercept(gaha, rabdul, { ...SP.shieldRam }, res); setTimeout(res, 12000); });
  check('13.40 Shield Ram shoves the foe 2 tiles', rel(rabdul) === '4,0', rel(rabdul));
  check('13.40 both sides: a hero relays for the heroes', log.length >= 1 && log[0].foe === 'E1' && /^H/.test(log[0].ally), JSON.stringify(log.map((l) => l.ally + '>' + l.foe)));

  // ---------- a push toward an ally never harms the ally ----------
  reset([P(tayo, 0, 0), P(gaha, 1, 0), P(rabdul, 2, 0)]); // rabdul stands right behind the foe
  hp0 = gaha.hp;
  await drive(tayo, gaha);
  check('13.40 pushing a foe into the pusher\'s ally: the ally takes no damage and is not Disoriented', rabdul.hp === 150 && !S.isDisoriented(rabdul), rabdul.hp);
  check('13.40 ...the foe takes the slam and the ally relays it', gaha.hp < hp0 && log.length === 1 && log[0].ally === 'E1', hp0 - gaha.hp);

  // ---------- a relay that finishes the foe ----------
  reset([P(tayo, 0, 0), P(gaha, 1, 0), P(rabdul, 2, -1)]);
  gaha.hp = 3;
  await drive(tayo, gaha);
  check('13.40 a dead foe is not relayed', !gaha.alive && log.length === 0, gaha.alive + ' ' + log.length);

  check('no errors', errors.filter((e) => !/focus/.test(e)).length === 0, errors.filter((e) => !/focus/.test(e)).slice(0, 3).join(' | '));
  console.log(fails ? fails + ' FAILED' : 'ALL PASSED');
  w.close(); process.exit(0);
})().catch((e) => { console.log('CRASH ' + e.stack); process.exit(1); });
