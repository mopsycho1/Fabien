// Status art batch (30 Oct): his status icons over units and on the card (6.7),
// Earth's Bulwark (6.8), the small status cards on the characters (6.9), the bag
// on Items (6.10), the Charge symbol on Engage (6.12), Fury and Earth's Bulwark
// looks while active (6.13).
const { start, battle } = require('./boot.cjs');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let fails = 0; const check = (n, ok, x) => { console.log((ok ? 'PASS ' : 'FAIL ') + n + (x !== undefined ? '  [' + x + ']' : '')); if (!ok) fails++; };
(async () => {
  const { w, game, errors } = await start();
  const t0 = Date.now(); while (Date.now() - t0 < 8000 && !game.textures.exists('card:empower')) await sleep(50);
  const b = await battle(game); await sleep(800);
  const G = w.__grid, S = w.__status, E = w.__engagement;
  const U = (l) => b.units.find((u) => u.label === l);
  const sudeen = U('H1'), gaha = U('H2'), layra = U('H3'), rabdul = U('E1'), bull = U('E2'), archer = U('E3');
  const all = [sudeen, gaha, layra, rabdul, bull, archer];
  b.runEnemyTurn = () => {}; b.endTurn = () => {};
  const put = (u, c, r) => { u.col = c; u.row = r; const p = G.tileToScreen(c, r); u.view.setPosition(p.x, p.y); };
  const PARK = [[7, 7], [7, 6], [0, 0], [1, 0], [7, 0], [6, 0]];
  const reset = (placed) => {
    all.forEach((u, i) => {
      if (u.engagedWith) E.endDuel(u);
      u.status = null; u.fury = 0; u.charge = 0; u.bulwark = 0; u.hp = u.maxHp; u.hasActed = false; u.hasMoved = false; u.cardFreeAt = 0;
      put(u, ...PARK[i]);
    });
    for (const [u, c, r] of placed) put(u, c, r);
    b.busy = false; b.cancelMode(); b.refreshStatusTags();
  };
  const cast = (caster, target, id) => new Promise((res) => { b.activeUnit = caster; caster.hasActed = false; b.castSpell(caster, target, id, res); setTimeout(res, 6000); });
  const icons = (u) => u.tagRow.list.filter((o) => o.iconKey).map((o) => o.iconKey).join(',');
  // the small cards on the board: containers holding a card: picture
  const cards = () => b.children.list.filter((o) => o.type === 'Container' && o.list.some((c) => c.texture && /^card:/.test(c.texture.key)))
    .map((o) => ({ o, key: o.list.find((c) => c.texture && /^card:/.test(c.texture.key)).texture.key.slice(5), label: (o.list.find((c) => c.type === 'Text') || {}).text }));
  const cardText = () => { const t = []; const walk = (c) => c.list.forEach((o) => (o.list ? walk(o) : o.type === 'Text' && t.push(o.text))); walk(b.cardLayer); return t.join(' '); };
  const cardIcons = () => { const t = []; const walk = (c) => c.list.forEach((o) => (o.list ? walk(o) : o.texture && /^icon:/.test(o.texture.key) && t.push(o.texture.key.slice(5)))); walk(b.cardLayer); return t; };

  // ---------- the pictures ----------
  const ICONS = ['slow', 'poison', 'stunned', 'offbalance', 'exposed', 'hidden', 'echo', 'meditating', 'aiming', 'marked', 'burn', 'disoriented', 'enchanted', 'bloodied', 'charge', 'bulwark', 'swiftness', 'fury', 'stone'];
  check('6.7 all 19 status icons load', ICONS.every((k) => game.textures.exists('icon:' + k)), ICONS.filter((k) => !game.textures.exists('icon:' + k)).join(','));
  check('6.9 all 6 cards load', ['offbalance', 'swiftness', 'fury', 'stone', 'press', 'empower'].every((k) => game.textures.exists('card:' + k)));
  check('6.10 / 6.12 the bag and Charge glyphs load', game.textures.exists('ui:glyph_bag') && game.textures.exists('ui:glyph_charge'));
  check('6.13 the three crystals load', [0, 1, 2].every((i) => game.textures.exists('fx:bulwark_crystal_' + i)));

  // ---------- 6.7 icons over units ----------
  reset([[gaha, 3, 3], [bull, 3, 5]]);
  const tagIcons = (u) => S.statusTags(u).filter((t) => t.icon).map((t) => t.icon).join(',');
  S.applyOffBalance(gaha); S.applyPoison(gaha, 'poisonArrow'); S.applyStun(gaha); S.applyDisoriented(gaha); S.applyBurn(gaha, 'wildfire');
  b.refreshStatusTags();
  check('6.7 every status with art names its icon', tagIcons(gaha) === 'offbalance,poison,burn,stunned,disoriented', tagIcons(gaha));
  check('6.7 over the unit: icons, no words', icons(gaha) === 'offbalance,poison,burn,stunned,disoriented' && !gaha.tagRow.list.some((o) => o.type === 'Text'), icons(gaha));
  check('6.7 each icon sits in a thin bronze frame', gaha.tagRow.list.filter((o) => o.type === 'Rectangle').length === 5);
  reset([[bull, 3, 5]]);
  bull.fury = 2; b.refreshStatusTags();
  check('6.7 stacks show a number on the icon (Bloodied 2)', icons(bull) === 'bloodied' && bull.tagRow.list.some((o) => o.type === 'Text' && o.text === '2'), icons(bull));
  reset([[gaha, 3, 3]]); gaha.status = null; S.applyBuff(gaha, 'stone'); S.settleRooted && (S.statusOf ? 0 : 0);
  // ROOTED has no icon yet, so it keeps its word
  gaha.status.rooted = { turnsLeft: 1 }; b.refreshStatusTags();
  check('6.7 ROOTED (no icon yet) keeps its word next to the icons', icons(gaha) === 'stone' && gaha.tagRow.list.some((o) => o.type === 'Text' && o.text === 'ROOTED'), icons(gaha));

  // ---------- 6.7 the card shows icon and word ----------
  reset([[gaha, 3, 3]]);
  S.applyBuff(gaha, 'swiftness'); S.applyOffBalance(gaha);
  b.refreshCard(gaha);
  check('6.7 the unit card shows the icon and the word', cardIcons().join(',') === 'offbalance,swiftness' && /OFF-BAL/.test(cardText()) && /SWIFT/.test(cardText()), cardIcons().join(',') + ' / ' + cardText());
  S.applyPoison(gaha, 'poisonArrow'); S.applyStun(gaha); S.applyDisoriented(gaha); S.applyBurn(gaha, 'wildfire'); gaha.status.exposed = true;
  b.refreshCard(gaha);
  const right = (() => { let m = 0; const walk = (c) => c.list.forEach((o) => { if (o.list) walk(o); else if (o.type === 'Image' && o.texture && /^icon:/.test(o.texture.key)) m = Math.max(m, o.x + 10); }); walk(b.cardLayer); return m; })();
  check('6.7 too many for the card: icons only, still inside the card', cardIcons().length >= 6 && !/DISORIENTED/.test(cardText()) && right <= 368, cardIcons().length + ' icons, right edge ' + right);

  // ---------- 6.8 Earth's Bulwark ----------
  reset([[layra, 2, 7], [sudeen, 3, 7]]);
  layra.mp = layra.maxMp;
  const p = cast(layra, sudeen, 'stone');
  await sleep(300);
  { const t = Date.now(); while (Date.now() - t < 1500 && cards().length === 0) await sleep(20); } // (waits for the card, however busy the machine is)
  const c1 = cards();
  check('6.9 a Verse shows his card on the ally', c1.length === 1 && c1[0].key === 'stone', c1.map((c) => c.key).join(','));
  check('6.8 the card is named Earth\'s Bulwark (x2 on a shield-bearer)', c1[0] && c1[0].label === "Earth's Bulwark x2", c1[0] && c1[0].label);
  check('6.9 it is small and over the unit\'s head', c1[0] && Math.abs(c1[0].o.x - sudeen.view.x) < 2 && c1[0].o.y < sudeen.view.y - sudeen.topY && c1[0].o.list[0].displayHeight <= 92, c1[0] && Math.round(c1[0].o.list[0].displayHeight));
  check('6.9 no big floating word on top of the card', !b.children.list.some((o) => o.type === 'Text' && o.text === 'Stone x2'));
  await p; await sleep(500);
  check('6.9 it shrinks away into the icon row', cards().length === 0 && icons(sudeen) === 'stone', cards().length + ' / ' + icons(sudeen));
  check('6.8 Stone\'s effect is called Earth\'s Bulwark (short word EARTH; BULWARK stays the Warden\'s)', S.buffOf(sudeen).effect === "Earth's Bulwark" && S.statusTags(sudeen).some((t) => t.text === 'EARTH' && t.icon === 'stone'));
  b.refreshCard(sudeen);
  check('6.8 the card line says Earth\'s Bulwark: 2 turns left', /Earth's Bulwark: 2 turns left/.test(cardText()), cardText());

  // ---------- 6.13 the looks while active ----------
  check('6.13 Earth\'s Bulwark: crystals float round the unit (his four crystals since 6.18)', sudeen.bulwarkAura && sudeen.bulwarkAura.objects.length === 5);
  const crystals = sudeen.bulwarkAura.objects.slice(1);
  const pos0 = crystals.map((c) => c.x.toFixed(1)).join(',');
  let behindSeen = false, frontSeen = false;
  for (let i = 0; i < 30; i++) {
    await sleep(70);
    for (const c of crystals) {
      const above = sudeen.view.getIndex(c) > sudeen.view.getIndex(sudeen.sprite);
      if (above) frontSeen = true; else behindSeen = true;
    }
  }
  check('6.13 they move, passing behind and in front of him', pos0 !== crystals.map((c) => c.x.toFixed(1)).join(',') && behindSeen && frontSeen, behindSeen + '/' + frontSeen);
  reset([[layra, 2, 7], [sudeen, 3, 7]]);
  check('6.13 the look goes when the Verse goes', !sudeen.bulwarkAura);
  layra.mp = layra.maxMp;
  await cast(layra, sudeen, 'fury');
  check('6.13 Fury on Sudeen (no fire painted on his pictures): ring, two spinning ribbons and sparks', sudeen.furyAura && sudeen.furyAura.objects.length === 5);
  const rib = sudeen.furyAura.objects[2]; const sx0 = rib.scaleX; await sleep(300);
  check('6.13 the ribbons spin (their width changes)', Math.abs(rib.scaleX - sx0) > 0.02, sx0.toFixed(2) + ' -> ' + rib.scaleX.toFixed(2));
  sudeen.status.buff.turnsLeft = 1; S.tickBuff(sudeen); b.refreshStatusTags();
  check('6.13 Fury fades: its look goes and its pictures are destroyed', !sudeen.furyAura && !rib.active);

  // ---------- 6.9 cards in a clash ----------
  reset([[gaha, 3, 3], [bull, 3, 4]]);
  E.startDuel(gaha, bull);
  S.applyOffBalance(bull);
  const beat = { kind: 'stance', actor: gaha, holder: bull, actorStance: 'press', holderStance: 'slip', winner: gaha, loser: bull, decisive: true, empowered: true, actorScore: 14, holderScore: 8 };
  let done = false;
  b.playBeat({ beat, response: { held: false, slipped: false }, path: [], ended: false, strike: { hit: true, damage: 3 }, escape: null }, false, () => (done = true));
  await sleep(300);
  const ce = cards();
  check('6.9 Empower: his card beside the fighter who spent Poise', ce.some((c) => c.key === 'empower') && Math.abs(ce.find((c) => c.key === 'empower').o.x - gaha.view.x) > 40, ce.map((c) => c.key).join(','));
  const side = Math.sign(ce.find((c) => c.key === 'empower').o.x - gaha.view.x);
  check('6.9 beside him on the side away from the foe', side === Math.sign(gaha.view.x - bull.view.x) || bull.view.x === gaha.view.x, side);
  let sawPress = false, sawOff = false;
  for (let i = 0; i < 40 && !done; i++) {
    await sleep(60);
    for (const c of cards()) { if (c.key === 'press') sawPress = true; if (c.key === 'offbalance') sawOff = true; }
  }
  check('6.9 Press wins the beat: his Press card on the winner', sawPress);
  check('6.9 a decisive beat: the loser gets the Off Balance card', sawOff);
  await sleep(1500);
  check('6.9 all cards are gone after the beat', cards().length === 0);

  // two cards for one unit wait their turn
  reset([[gaha, 3, 3]]);
  b.statusCard(gaha, 'swiftness', { label: 'Swift' }); b.statusCard(gaha, 'offbalance', { label: 'Off-balance!' });
  await sleep(300);
  check('6.9 two cards on one unit: one at a time', cards().length === 1 && cards()[0].key === 'swiftness');
  await sleep(1000);
  check('6.9 then the second', cards().length === 1 && cards()[0].key === 'offbalance', cards().map((c) => c.key).join(','));
  await sleep(1000);

  // ---------- 6.10 and 6.12 the buttons ----------
  reset([[sudeen, 3, 3], [bull, 3, 4]]);
  b.activeUnit = sudeen; b.cancelMode(); b.refreshButtons();
  const all4 = [...(b.slots || []), ...(b.halves || []), ...(b.lowHalves || [])];
  const eng = all4.find((x) => x.label.text === 'Engage'); const items = all4.find((x) => x.label.text === 'Items');
  check('6.12 Engage uses the Charge symbol', eng && eng.glyph.visible && eng.glyph.texture.key === 'ui:glyph_charge', eng && eng.glyph.texture.key);
  check('6.10 Items uses his bag', items && items.glyph.visible && items.glyph.texture.key === 'ui:glyph_bag', items && items.glyph.texture.key);

  check('no errors', errors.filter((e) => !/focus/.test(e)).length === 0, errors.slice(0, 3).join(' | '));
  console.log(fails ? fails + ' FAILED' : 'ALL PASSED');
  w.close(); process.exit(0);
})().catch((e) => { console.log('CRASH ' + e.stack); process.exit(1); });
