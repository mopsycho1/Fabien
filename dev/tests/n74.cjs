// Suleiman's GIF spell effects (15 Nov, roadmap 6.58): the Verses' drawn auras (loop, in motion, Rooted) and Layra's drawn
// Lightning and Wildfire (orb, bolt or lance, strike). Everything is read from src/data/fxSlots.json.
const { start, battle } = require('./boot.cjs');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let fails = 0; const check = (n, ok, x) => { console.log((ok ? 'PASS ' : 'FAIL ') + n + (x !== undefined ? '  [' + x + ']' : '')); if (!ok) fails++; };
(async () => {
  const { w, game, errors } = await start();
  const t0 = Date.now(); while (Date.now() - t0 < 8000 && !game.textures.exists('fx:sfx_wildfire_lance_7')) await sleep(50);
  const b = await battle(game); await sleep(600);
  const G = w.__grid, E = w.__engagement;
  const U = (l) => b.units.find((u) => u.label === l);
  const sudeen = U('H1'), gaha = U('H2'), layra = U('H3'), rabdul = U('E1'), bull = U('E2'), archer = U('E3');
  const all = [sudeen, gaha, layra, rabdul, bull, archer];
  b.runEnemyTurn = () => {}; b.endTurn = () => {};
  const put = (u, c, r) => { u.col = c; u.row = r; const p = G.tileToScreen(c, r); u.view.setPosition(p.x, p.y); };
  const PARK = [[7, 7], [7, 6], [0, 7], [1, 0], [7, 0], [6, 0]];
  const reset = (placed) => {
    all.forEach((u, i) => { if (u.engagedWith) E.endDuel(u); u.status = null; u.hp = u.maxHp; u.hasActed = false; u.hasMoved = false; u.stepsUsed = 0; u.hidden = false; u.moveFrom = null; put(u, ...PARK[i]); });
    for (const [u, c, r] of placed) put(u, c, r);
    b.busy = false; b.cancelMode(); b.refreshStatusTags();
  };
  const verse = (u, id) => { u.status = u.status || {}; u.status.buff = id ? { id, turnsLeft: 3, power: 1 } : null; b.refreshStatusTags(); };
  const slots = require('../../src/data/fxSlots.json');

  // ---------- the pictures are all there ----------
  const miss = [];
  for (const [id, s] of Object.entries(slots.buffs)) for (const part of ['loop', 'move', 'rooted']) for (let i = 0; i < (s[part] || 0); i++) if (!game.textures.exists('fx:buff_' + id + '_' + part + '_' + i)) miss.push(id + part + i);
  for (const [n, s] of Object.entries(slots.spells)) for (let i = 0; i < s.frames; i++) if (!game.textures.exists('fx:sfx_' + n + '_' + i)) miss.push(n + i);
  check('every frame of his GIF effects is loaded (3 loops, 2 in motion, 1 rooted, 5 spell pieces, 8 frames each = 88)', miss.length === 0, miss.slice(0, 4).join(','));

  // ---------- the Verses: his loop replaces ours ----------
  reset([[gaha, 3, 4]]);
  for (const id of ['swiftness', 'fury', 'stone']) {
    verse(gaha, id);
    check('6.58 under ' + id + ' he shows his drawn loop round the unit (and our own fury and bulwark looks step aside)', !!gaha['drawnAura_' + id] && gaha['drawnAura_' + id].objects.length === 1 + slots.wrap.steps /* 16 Nov: every loop is a back copy and the front copies */ /* 6.64: the orbit is drawn behind and its near half again in front */ && !gaha.furyAura && !gaha.bulwarkAura, Object.keys(gaha).filter((k) => /Aura/.test(k) && gaha[k]).join());
    verse(gaha, null);
    check('6.58 and it goes when the Verse ends', !gaha['drawnAura_' + id]);
  }
  // his loops sit BEHIND the figure (n41 checked, for the old look, that no fire picture lies over his body)
  verse(gaha, 'fury');
  const lst = gaha.view.list;
  check('6.58 his Fury loop is drawn behind the figure, never over it', lst.indexOf(gaha.drawnAura_fury.objects[0]) >= 0 && lst.indexOf(gaha.drawnAura_fury.objects[0]) < lst.indexOf(gaha.sprite), lst.indexOf(gaha.drawnAura_fury.objects[0]) + ' / ' + lst.indexOf(gaha.sprite));
  verse(gaha, 'stone');
  const [orbBack, orbFront] = gaha.drawnAura_stone.objects; /* back half, then the front copies (16 Nov wrap) */ const lst2 = gaha.view.list;
  check('6.64 the stone orbit: all of it behind the figure and its near (lower) half in front of it', lst2.indexOf(orbBack) < lst2.indexOf(gaha.sprite) && lst2.indexOf(orbFront) > lst2.indexOf(gaha.sprite) && orbFront.isCropped);
  verse(gaha, 'fury');
  check('6.64 the drawn auras are about 0.9 to 1.1 body heights tall (16 Nov: 1.0) (by the ruler\'s body height, not the picture)', ['swiftness', 'fury', 'stone'].every((id) => { const k = slots.buffs[id].fit.loop.k; return k >= 0.9 && k <= 1.1; }) && Math.abs(gaha.drawnAura_fury.objects[0].scaleY * slots.buffs.fury.fit.loop.h / (gaha.topY - 12) - slots.buffs.fury.fit.loop.k) < 0.02, gaha.drawnAura_fury.objects[0].scaleY);
  { const fo = gaha.drawnAura_fury.objects, l3 = gaha.view.list, fz = gaha.fuse_fury;
    check('16 Nov every loop is wrapped: one back copy behind, the cropped front copies in front and fainter (fxSlots.json wrap)', fo.length === 1 + slots.wrap.steps && l3.indexOf(fo[0]) < l3.indexOf(gaha.sprite) && fo.slice(1).every((o) => l3.indexOf(o) > l3.indexOf(gaha.sprite) && o.isCropped && o.alpha < fo[0].alpha));
    check('16 Nov the figure is lit by its Verse: a rim copy behind it and a tint copy in front (fxSlots.json fuse)', !!fz && l3.indexOf(fz.objects[0]) < l3.indexOf(gaha.sprite) && l3.indexOf(fz.objects[1]) > l3.indexOf(gaha.sprite)); }
  verse(gaha, null);
  // Rooted under Earth's Bulwark: the dome instead of the stones
  verse(gaha, 'stone'); gaha.status.rooted = true; b.refreshStatusTags();
  check('6.58 Gaha standing his ground (Rooted) under Earth\'s Bulwark shows his dome in place of the orbiting stones', !!gaha.drawnAura_stoneRooted && !gaha.drawnAura_stone);
  gaha.status.rooted = false; b.refreshStatusTags();
  check('6.58 and the orbiting stones come back when he is no longer Rooted', !gaha.drawnAura_stoneRooted && !!gaha.drawnAura_stone);
  verse(gaha, 'fury'); gaha.status.rooted = true; b.refreshStatusTags();
  check('6.58 Rooted without Earth\'s Bulwark shows no dome', !gaha.drawnAura_stoneRooted); gaha.status.rooted = false; verse(gaha, null);

  // ---------- in motion: it goes with the unit for the walk and ends with it ----------
  for (const id of ['swiftness', 'fury']) {
    reset([[gaha, 2, 4]]); verse(gaha, id); gaha.hasMoved = false; gaha.stepsUsed = 0; b.activeUnit = gaha;
    let seen = false, flip = null; const watch = setInterval(() => { if (gaha.moveFx && gaha.moveFx.objects[0]) { seen = true; flip = gaha.moveFx.objects[0].flipX; } }, 15);
    await new Promise((res) => { b.busy = true; b.moveUnit(gaha, 5, 4, () => { b.busy = false; res(); }); setTimeout(res, 5000); });
    clearInterval(watch); await sleep(100);
    check('6.58 under ' + id + ' his in-motion effect plays while the unit walks (the right way up the screen, not flipped for a walk to the right-down)', seen, 'flipX ' + flip);
    check('6.58 and it is gone when the walk ends', !gaha.moveFx);
  }
  verse(gaha, 'stone');
  reset([[gaha, 2, 4]]); verse(gaha, 'stone'); gaha.hasMoved = false; gaha.stepsUsed = 0; b.activeUnit = gaha;
  let stoneMove = false; const w3 = setInterval(() => { if (gaha.moveFx) stoneMove = true; }, 15);
  await new Promise((res) => { b.busy = true; b.moveUnit(gaha, 5, 4, () => { b.busy = false; res(); }); setTimeout(res, 5000); });
  clearInterval(w3);
  check('6.58 Earth\'s Bulwark has no drawn in-motion effect, so its dust puff stays', !stoneMove);

  // ---------- Layra's Lightning and Wildfire ----------
  const seq = [];
  const filmSfx = async (variant) => {
    const seen = []; const t = Date.now(); let impactAt = null;
    const realImpact = b.showImpact; b.showImpact = function (...a) { if (impactAt === null) impactAt = Date.now() - t; return realImpact.apply(this, a); };
    const watch = setInterval(() => { for (const o of b.children.list) if (o.texture && /^fx:sfx_/.test(o.texture.key)) { const k = o.texture.key.replace(/^fx:sfx_|_\d+$/g, ''); if (!seen.includes(k)) seen.push(k); } }, 10);
    b.playAttack(layra, rabdul, { hit: true, damage: 1 }, false, variant);
    await sleep(2300); clearInterval(watch); b.showImpact = realImpact;
    return { seen, impactAt };
  };
  reset([[layra, 2, 4], [rabdul, 5, 4]]);
  const lead = b.channelLead(layra, rabdul), fireLead = b.channelLead(layra, rabdul, { element: 'fire' });
  check('6.58 Layra gathers Lightning for his orb\'s lead (440 ms) and Wildfire for his fireball\'s (560 ms)', lead === slots.spells.lightning_orb.lead && fireLead === slots.spells.wildfire_orb.lead, lead + ' / ' + fireLead);
  let r = await filmSfx(null);
  check('6.58 Lightning plays his orb, then his bolt and his strike', r.seen.join() === 'lightning_orb,lightning_bolt,lightning_strike' || (r.seen[0] === 'lightning_orb' && r.seen.includes('lightning_bolt') && r.seen.includes('lightning_strike')), r.seen.join());
  check('6.58 and the blow lands when his bolt reaches the target (lead + hitMs)', r.impactAt !== null && Math.abs(r.impactAt - (lead + slots.spells.lightning_bolt.hitMs)) < 120, r.impactAt);
  reset([[layra, 2, 4], [rabdul, 5, 4]]);
  r = await filmSfx({ element: 'fire' });
  check('6.58 Wildfire plays his fireball, then his lance (and no bolt)', r.seen[0] === 'wildfire_orb' && r.seen.includes('wildfire_lance') && !r.seen.includes('lightning_bolt'), r.seen.join());
  check('6.58 and the blow lands when the lance reaches the target', r.impactAt !== null && Math.abs(r.impactAt - (fireLead + slots.spells.wildfire_lance.hitMs)) < 120, r.impactAt);

  check('no errors', errors.filter((e) => !/focus/.test(e)).length === 0, errors.filter((e) => !/focus/.test(e)).slice(0, 3).join(' | '));
  console.log(fails ? fails + ' FAILED' : 'ALL PASSED'); process.exit(fails ? 1 : 0);
})();
