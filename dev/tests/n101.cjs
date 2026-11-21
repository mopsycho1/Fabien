// Roadmap 10.46 (Suleiman 21 Nov): the Bulwark Shield. Under Earth's Bulwark, Alagara raises a shield on himself and
// every ally within 2 tiles that soaks damage up to 20 percent of each one's max health, for 2 of their turns. It is
// the answer to Gadara's Singularity, so the pull's slam and its sure blow must land on the shield first.
// Run:  FABIEN_MAP=cavern FABIEN_BENCH= FABIEN_KINGS=1 node n101.cjs
const { start, battle } = require('./boot.cjs');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let fails = 0; const check = (n, ok, x) => { console.log((ok ? 'PASS ' : 'FAIL ') + n + (x !== undefined ? '  [' + x + ']' : '')); if (!ok) fails++; };
(async () => {
  const { w, game, errors } = await start();
  const b = await battle(game); await sleep(600);
  const St = w.__status;
  const U = (id) => b.units.find((u) => u.id === id);
  const a = U('h5'), near = U('h1'), far = U('h3'), gad = U('e5'), foe = U('e1');
  b.endTurn = () => {}; b.enemySecondWalk = false; b.runEnemyTurn = () => {}; b.enemyAttack = () => {};
  b.time.removeAllEvents(); b.tweens.killAll(); await sleep(300); b.busy = false;
  const fresh = () => ({ offBalance: false, buff: null, hex: null, cooldowns: {}, exposed: null });
  const park = () => {
    let i = 0;
    for (const u of b.units) {
      if (u === a) continue;
      u.engagedWith = null; u.alive = true; u.hp = u.maxHp; u.status = fresh(); u.shield = null; u.channel = null;
      b.placeUnit(u, i % 11, i < 11 ? 10 : 0); i++;
    }
    a.status = fresh(); a.attune = { echo: null, swapped: false }; a.engagedWith = null; a.hp = a.maxHp; a.shield = null;
    a.hasActed = false; a.hasMoved = false; a.stepsUsed = 0;
    b.placeUnit(a, 3, 5);
    b.activeUnit = a; b.busy = false; b.cancelMode();
  };
  const cast = async (power) => {
    let done = false;
    b.castKingSkill(a, a, 'bulwarkShield', () => { done = true; });
    const t = Date.now(); while (!done && Date.now() - t < 6000) await sleep(30);
    return done;
  };
  const sp = w.__spells ? w.__spells.bulwarkShield : null;

  // 1. It needs Earth's Bulwark
  park();
  check('without Stone the shield is blocked', /Stone/.test(b.kingBlock(a, 'bulwarkShield') || ''), b.kingBlock(a, 'bulwarkShield'));
  check('it is in his skills', a.spells.includes('bulwarkShield'));

  // 2. Cast under Stone: him and the ally within 2 tiles, not the ally 3 away, not a foe
  park();
  St.applyBuff(a, 'stone');
  check('under Stone it can be used', b.kingBlock(a, 'bulwarkShield') === null, b.kingBlock(a, 'bulwarkShield'));
  b.placeUnit(near, 3, 7); b.placeUnit(far, 6, 5); b.placeUnit(foe, 4, 5);
  check('it lights the 2 tiles round him', b.kingAreaTiles(a, 'bulwarkShield').length === 12, b.kingAreaTiles(a, 'bulwarkShield').length);
  check('cast finishes', await cast());
  const want = (u) => Math.round(u.maxHp * 0.2);
  check('Alagara has a shield of 20 percent of his max health', a.shield && a.shield.hp === want(a), a.shield && a.shield.hp + ' of ' + a.maxHp);
  check('the ally 2 tiles away has 20 percent of hers', near.shield && near.shield.hp === want(near), near.shield && near.shield.hp + ' of ' + near.maxHp);
  check('the ally 3 tiles away has none', !far.shield);
  check('the foe has none', !foe.shield);
  check('it lasts 2 turns', near.shield && near.shield.turnsLeft === 2);
  check('the dome is drawn round each shielded fighter', !!(a.shieldDome && a.shieldDome.active && near.shieldDome && near.shieldDome.active));
  check('the card shows SHIELD n', St.statusTags(near).some((t) => t.text === 'SHIELD ' + want(near)), St.statusTags(near).map((t) => t.text).join(','));

  // 3. A hit lands on the shield first
  const s0 = near.shield.hp;
  const l1 = b.landHit(near, 3);
  check('a 3-point hit is soaked whole', l1.damage === 0 && near.shield.hp === s0 - 3, l1.damage + ' through, shield ' + near.shield.hp);
  const left = near.shield.hp;
  const l2 = b.landHit(near, left + 4);
  check('a bigger hit breaks it and the rest gets through', l2.damage === 4 && !near.shield, l2.damage);
  check('...and says so', /Shield -/.test(l2.note || ''), l2.note);
  b.refreshStatusTags();
  check('the dome goes when the shield breaks', !near.shieldDome);

  // 4. It fades after 2 of the fighter's turns
  w.__kings.tickShield(a); check('after 1 turn still there', !!a.shield);
  w.__kings.tickShield(a); check('after 2 turns gone', !a.shield);

  // 5. From the Echo: 75 percent
  park();
  St.applyBuff(a, 'stone'); St.applyBuff(a, 'fury'); // Stone goes to the Echo
  check('Stone in the Echo still offers it', b.kingBlock(a, 'bulwarkShield') === null, b.kingBlock(a, 'bulwarkShield'));
  await cast();
  check('from the Echo: 15 percent', a.shield && a.shield.hp === Math.round(a.maxHp * 0.2 * 0.75), a.shield && a.shield.hp);

  // 6. Singularity: the slam and the sure blow land on the shield. Same random numbers, shield and no shield.
  const singularity = async (shielded) => {
    park();
    b.placeUnit(gad, 5, 4); gad.mask = 6; gad.singularityUsed = false; gad.channel = { spellId: 'singularity' }; gad.status = fresh();
    b.placeUnit(near, 5, 6); b.placeUnit(far, 5, 7); // far is pulled into near: a slam
    b.placeUnit(a, 0, 0);
    if (shielded) { w.__kings.giveShield(near, 0.2, 2); w.__kings.giveShield(far, 0.2, 2); }
    const real = w.Math.random; let n = 0; w.Math.random = () => 0.3 + ((n++ % 7) * 0.05);
    let done = false;
    try { b.resolveSingularity(gad, () => { done = true; }); } finally { w.Math.random = real; }
    const t = Date.now(); while (!done && Date.now() - t < 6000) await sleep(30);
    return { near: near.maxHp - near.hp, far: far.maxHp - far.hp, ns: near.shield ? near.shield.hp : 0, fs: far.shield ? far.shield.hp : 0 };
  };
  const bare = await singularity(false);
  const safe = await singularity(true);
  check('Singularity hurts without the shield', bare.near > 0 && bare.far > 0, JSON.stringify(bare));
  const nCap = Math.round(near.maxHp * 0.2), fCap = Math.round(far.maxHp * 0.2);
  check('with the shield the near ally loses that much less', safe.near === Math.max(0, bare.near - (nCap - safe.ns)) && safe.near < bare.near, bare.near + ' -> ' + safe.near);
  check('the slammed ally too (slam and blow both soaked)', safe.far < bare.far && safe.far === Math.max(0, bare.far - (fCap - safe.fs)), bare.far + ' -> ' + safe.far);

  // 7. The AI raises it when Gadara charges Singularity near his side (and swaps Stone forward)
  park();
  St.applyBuff(a, 'stone'); St.applyBuff(a, 'swiftness'); // Stone in the Echo
  b.placeUnit(near, 3, 6); b.placeUnit(gad, 3, 8); gad.channel = { spellId: 'singularity' };
  let fin = false;
  const acted = b.kingAiAct(a, () => { fin = true; });
  const t0 = Date.now(); while (acted && !fin && Date.now() - t0 < 6000) await sleep(30);
  check('the AI swaps Stone in front', a.status.buff && a.status.buff.id === 'stone', a.status.buff && a.status.buff.id);
  check('the AI raises the shield', acted && !!a.shield && !!near.shield);

  check('no page errors', errors.filter((e) => !/focus\(\)/.test(e)).length === 0, errors.slice(0, 2).join(' | '));
  console.log(fails ? 'FAILED' : 'ALL PASSED');
  process.exit(fails ? 1 : 0);
})();
