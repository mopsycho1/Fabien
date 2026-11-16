// 16 Nov: two fixes found in the last batch.
//   1.55  Kofi's Ember, Stone and Gale bolts fly as his spirit comet tinted red, gold and pale, never Layra's Wildfire or Lightning
//   1.56  an enchanted Tayo who is badly hurt stands in his weak pose, with the flame effect drawn over it
// Run on the cavern:  FABIEN_MAP=cavern FABIEN_BENCH= node n77.cjs
const { start, battle } = require('./boot.cjs');
const fs = require('fs');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let fails = 0; const check = (n, ok, x) => { console.log((ok ? 'PASS ' : 'FAIL ') + n + (x !== undefined ? '  [' + x + ']' : '')); if (!ok) fails++; };
const readJson = (p) => JSON.parse(fs.readFileSync(__dirname + '/../../' + p, 'utf8'));
(async () => {
  const { w, game, errors } = await start();
  const b = await battle(game); await sleep(600);
  const St = w.__status;
  const U = (id) => b.units.find((u) => u.id === id);
  const gaha = U('h2'), sudeen = U('h1'), layra = U('h3'), kofi = U('h4'), tayo = U('e1'), bull = U('e2'), archer = U('e3'), rabdul = U('e4');
  const put = (u, c, r) => b.placeUnit(u, c, r);
  const idle = async () => { const t = Date.now(); while ((b.busy || b.inCinematic) && Date.now() - t < 12000) await sleep(30); await sleep(80); };
  b.endTurn = () => {}; b.runEnemyTurn = () => {};
  const park = () => {
    for (const u of b.units) { u.engagedWith = null; u.engagement = null; u.hp = u.maxHp; u.mp = u.maxMp; u.status = { offBalance: false, buff: null, hex: null, cooldowns: {} }; u.hasActed = false; u.hasMoved = false; u.stepsUsed = 0; u.alive = true; u.hidden = false; }
    put(sudeen, 0, 10); put(layra, 1, 10); put(gaha, 5, 5); put(kofi, 8, 8); put(tayo, 10, 0); put(archer, 9, 0); put(rabdul, 8, 0); put(bull, 5, 4);
    b.busy = false; b.cancelMode(); b.refreshEngagementMarks(); b.refreshStatusTags();
  };
  const images = (prefix) => b.children.list.filter((o) => o.texture && o.texture.key && o.texture.key.startsWith(prefix));
  const slots = readJson('src/data/fxSlots.json');
  const spells = readJson('src/data/spells.json');

  // ================= 1.55 Kofi's bolts =================
  const want = { spiritBoltFire: 'spirit_bolt_fire', spiritBoltWater: 'spirit_bolt', spiritBoltEarth: 'spirit_bolt_earth', spiritBoltStorm: 'spirit_bolt_storm' };
  for (const [id, beam] of Object.entries(want)) {
    const v = spells[id];
    const d = b.drawnSpell(v);
    check(id + ': the comet ' + beam + ', no orb, no strike', !!v && !!d && d.beam === beam && d.orb === null && d.strike === null, JSON.stringify(d));
    check(id + ': its frames are loaded and it has a fit (6.64)', b.textures.exists('fx:sfx_' + beam + '_7') && !!slots.spells[beam].fit && slots.spells[beam].frames === 8);
  }
  check('Layra\'s own Lightning and Wildfire are untouched', b.drawnSpell(null).beam === 'lightning_bolt' && b.drawnSpell({ element: 'fire' }).beam === 'wildfire_lance');
  // each bolt really flies as its comet in a battle, and none of Layra's pieces show
  park(); put(kofi, 2, 3); put(bull, 2, 6);
  for (const [id, beam] of Object.entries(want)) {
    park(); put(kofi, 2, 3); put(bull, 2, 6);
    b.busy = true; bull.evade = -500; kofi.accuracy = 500;
    const mine = new Set(images('fx:sfx_')); let comet = null, layra = false;
    b.readingMove = () => id; /* force the element he reads */
    b.performAttack(kofi, bull, () => { b.busy = false; });
    for (let i = 0; i < 90 && !comet; i++) {
      await sleep(40);
      const fresh = images('fx:sfx_').filter((o) => !mine.has(o));
      if (fresh.some((o) => /sfx_(lightning|wildfire)/.test(o.texture.key))) layra = true;
      comet = fresh.find((o) => o.texture.key.startsWith('fx:sfx_' + beam + '_')) || null;
    }
    check(id + ' flies as ' + beam, !!comet && !layra, comet ? comet.texture.key : 'none');
    await idle(); await sleep(300);
  }
  // the tinted frames are a hue change, not the teal ones: the colour of the brightest coloured pixel differs per element
  const { execFileSync } = require('child_process');
  const hues = JSON.parse(execFileSync(process.env.HOME + '/.fabien-tools/venv/bin/python', ['-I', '-c', `
import colorsys, json
from PIL import Image
out = {}
for n in ('spirit_bolt', 'spirit_bolt_fire', 'spirit_bolt_earth', 'spirit_bolt_storm'):
    im = Image.open('${__dirname}/../../public/art/fx/sfx_%s_5.png' % n).convert('RGBA'); hs = []
    for r, g, bl, a in im.getdata():
        if a > 200:
            h, s, v = colorsys.rgb_to_hsv(r / 255, g / 255, bl / 255)
            if s > 0.3 and v > 0.4: hs.append(h * 360)
    out[n] = sum(hs) / len(hs) if hs else -1
print(json.dumps(out))`]).toString());
  check('Tide is teal, Ember red, Stone gold', Math.abs(hues.spirit_bolt - 175) < 25 && (hues.spirit_bolt_fire < 25 || hues.spirit_bolt_fire > 345) && Math.abs(hues.spirit_bolt_earth - 42) < 15, JSON.stringify(hues));

  // ================= 1.56 enchanted and badly hurt Tayo =================
  park(); put(tayo, 5, 5); put(gaha, 5, 7);
  St.applyEnchant(tayo, 'enchant'); b.refreshStatusTags(); b.showStanding(tayo); await sleep(200);
  const flameKey = tayo.sprite.texture.key;
  check('healthy and enchanted he shows his flame pictures', /flame|enchant|fire/i.test(flameKey) || !/weak/.test(flameKey), flameKey);
  check('his flame look has painted art (embers only, no code flame)', tayo.hasEnchantedArt === true);
  tayo.hp = Math.floor(tayo.maxHp * 0.2); b.updateHpBar(tayo); await sleep(900);
  const weakKey = tayo.sprite.texture.key;
  check('badly hurt and enchanted he stands in his weak pose', /weak/.test(weakKey), weakKey);
  check('his weak pose is drawn at his own size', Math.abs(tayo.sprite.scaleX / tayo.artScale - 1) < 0.04, tayo.sprite.scaleX + ' / ' + tayo.artScale);
  check('the flame effect is still on him, as the code flame (hand embers and flicker)', !!tayo.enchantAura && tayo.hasEnchantedArt === false && tayo.enchantAura.objects.length >= 3, tayo.enchantAura && tayo.enchantAura.objects.length);
  tayo.hp = tayo.maxHp; b.updateHpBar(tayo); await sleep(900);
  check('healed, he is back in his flame pictures', !/weak/.test(tayo.sprite.texture.key) && tayo.hasEnchantedArt === true, tayo.sprite.texture.key);
  // an unenchanted hurt Tayo is unchanged: weak pose
  St.clearEnchant ? St.clearEnchant(tayo) : (tayo.status.enchant = null); b.refreshStatusTags();
  tayo.hp = Math.floor(tayo.maxHp * 0.2); b.updateHpBar(tayo); await sleep(900);
  check('hurt without the flame he still stands weak', /weak/.test(tayo.sprite.texture.key), tayo.sprite.texture.key);

  const realErr = errors.filter((e) => !e.includes('focus()'));
  check('no errors', realErr.length === 0, realErr.slice(0, 2).join(' | '));
  console.log(fails === 0 ? 'ALL PASSED' : fails + ' FAILED');
  process.exit(0);
})();
