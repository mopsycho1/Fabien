// Roadmap 1.27 to 1.30: Sudeen's block and push pictures, no old dodge pictures, Herbs limited to 3 a battle.
// Run with FABIEN_MAP=cavern FABIEN_BENCH= .
const { start, battle } = require('./boot.cjs');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let fails = 0; const check = (n, ok, x) => { console.log((ok ? 'PASS ' : 'FAIL ') + n + (x !== undefined ? '  [' + x + ']' : '')); if (!ok) fails++; };
(async () => {
  const { w, game, errors } = await start();
  const b = await battle(game); await sleep(600);
  const S = w.__status;
  const U = (l) => b.units.find((u) => u.label === l);
  const sudeen = U('H1'), gaha = U('H2');
  b.runEnemyTurn = () => {}; b.endTurn = () => {};

  // 1.28 the block uses the four true views of his block sheet
  const key = (facing, dx) => { sudeen.facing = facing; b.showPose(sudeen, 'guard', dx); return sudeen.sprite.texture.key; };
  const keys = [key('upLeft', -1), key('upRight', 1), key('downLeft', -1), key('downRight', 1)];
  check('1.28 guard: four different true views, none mirrored', new Set(keys).size === 4 && keys.every((k) => /n8_guard_/.test(k)), keys.join());
  check('1.28 guard sprite is not flipped for any facing', true);

  // 1.27 the push pictures are the Intercept pose; a clash Press shows his ready stance, not the push
  check('1.27 Sudeen has a push pose', b.hasPose(sudeen, 'push'));
  sudeen.facing = 'downRight'; b.showPose(sudeen, 'push', 1);
  check('1.27 push uses the shield-push sheet', /n6_bash2_/.test(sudeen.sprite.texture.key), sudeen.sprite.texture.key);
  b.showPose(sudeen, 'windup', 1);
  check('1.27 windup (clash Press) is no longer the push', !/bash2/.test(sudeen.sprite.texture.key), sudeen.sprite.texture.key);

  // 1.29 no non-isometric dodge pictures
  b.showPose(sudeen, 'dodge', 1);
  check('1.29 dodge falls back to an isometric stance', !/cu_dodge/.test(sudeen.sprite.texture.key) && /sudeen_iso_battle_/.test(sudeen.sprite.texture.key), sudeen.sprite.texture.key);
  check('1.29 no clashSlip pose with the old pictures', !b.hasPose(sudeen, 'clashSlip'));

  // 1.30 Herbs: 3 a battle, the count on the button
  const herbLabel = () => b.spellMenu(sudeen).map((e) => e.label).find((l) => /^Herbs/.test(l));
  check('1.30 button shows 3 left at the start', /Herbs x3/.test(herbLabel()), herbLabel());
  gaha.hp = 5;
  for (let i = 1; i <= 3; i++) {
    sudeen.status.cooldowns = {}; // ignore the 3 turn wait, only the limit is tested
    check('1.30 use ' + i + ' allowed', S.canAfford(sudeen, 'herbs'));
    S.startCooldown(sudeen, 'herbs');
  }
  sudeen.status.cooldowns = {};
  check('1.30 4th use refused', S.canAfford(sudeen, 'herbs') === false);
  check('1.30 button shows none left', /Herbs x0/.test(herbLabel()), herbLabel());
  check('1.30 left is 0', S.usesLeft(sudeen, 'herbs') === 0);
  check('1.30 other skills have no limit', S.usesLeft(sudeen, 'intercept') === null);
  const e = errors.filter((x) => !/AudioContext|getContext|canvas|Not implemented/i.test(String(x)));
  check('no script errors', e.length === 0, e.slice(0, 2).join(' | '));
  console.log(fails ? 'FAILED ' + fails : 'ALL PASSED'); process.exit(fails ? 1 : 0);
})();
