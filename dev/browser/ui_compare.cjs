// UI rework, second pass (Baiyee 16 Nov): his mock-up on the left, our game on the right, at the
// same height, on a phone and on a desktop. Our game is set up like his picture: Layra's turn, the
// skills list open, a fire skill chosen (the skill panel showing).
//   node dev/browser/ui_compare.cjs <out dir>        (preview running on 4173)
// Writes <out>/game_<view>.png, <out>/compare_<view>.jpg, and prints the board's share and the
// smallest text, in real pixels.
const { openBattle } = require('./lib/play.cjs');
const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const out = process.argv[2] || 'ui_compare';
fs.mkdirSync(out, { recursive: true });
const BP = path.join(process.env.HOME, 'Documents/Fabien Blueprint/INBOX');
const MOCK = { phone: path.join(BP, '2026-11-16/new_ui.png'), desktop: path.join(BP, '2026-11-15b/ui_target.png') };

(async () => {
  for (const view of ['phone', 'desktop']) {
    const { browser, page, errors } = await openBattle(view);
    try {
      const info = await page.evaluate(async () => {
        const b = window.__game.scene.getScene('BattleScene');
        const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
        const layra = b.units.find((u) => u.name === 'Layra');
        b.activeUnit = layra; layra.hasActed = false; layra.hasMoved = false; layra.stepsUsed = 0; b.busy = false;
        b.cancelMode(); b.refreshStatus(); b.refreshCard(layra); b.refreshTurnStrip();
        b.manualView = false; b.followUnit(layra, 0, true);
        await sleep(400);
        b.onSpellButton(); await sleep(150);
        // a Blessings group opens to its list; choose the first skill with a colour of its own
        const list = b.spellMenu(layra);
        const group = list.find((e) => /\s>$/.test(e.label));
        if (group) { group.onTap(); await sleep(150); }
        b.selectedSpell = b.spellMenu(layra).length ? layra.spells.find((id) => id === 'fury') || layra.spells[0] : null;
        b.refreshStatus(); b.layoutMenu();
        await sleep(400);
        // the smallest text the interface camera draws, in real pixels
        let least = 99;
        const visit = (o) => { if (!o || !o.visible) return; if (o.type === 'Text' && o.text && o.alpha > 0.05) least = Math.min(least, parseFloat(o.style.fontSize) * Math.abs(o.scaleY) * b.lay.real); if (o.list) o.list.forEach(visit); };
        for (const o of b.children.list) if (o.cameraFilter & b.cameras.main.id) visit(o);
        return { board: (b.lay.bottom - b.lay.top) / b.lay.H, least: least.toFixed(1), row: (b.lay.rowH * b.lay.real).toFixed(1) };
      });
      const shot = path.join(out, 'game_' + view + '.png');
      await page.screenshot({ path: shot });
      console.log(view + ': board ' + (info.board * 100).toFixed(1) + '% of the height, smallest text ' + info.least + ' px, menu rows ' + info.row + ' px apart' + (errors.length ? ', ERRORS ' + errors[0] : ''));
      execFileSync(path.join(process.env.HOME, '.fabien-tools/venv/bin/python'), ['-I', '-c', `
import sys
from PIL import Image, ImageDraw
a = Image.open(sys.argv[1]).convert('RGB'); b = Image.open(sys.argv[2]).convert('RGB')
H = 1400
a = a.resize((round(a.width * H / a.height), H)); b = b.resize((round(b.width * H / b.height), H))
s = Image.new('RGB', (a.width + b.width + 30, H + 40), (20, 16, 12))
s.paste(a, (0, 40)); s.paste(b, (a.width + 30, 40))
d = ImageDraw.Draw(s); d.text((10, 12), "Suleiman's mock-up", fill=(230, 210, 160)); d.text((a.width + 40, 12), 'Our game (' + sys.argv[4] + ')', fill=(230, 210, 160))
s.save(sys.argv[3], quality=88)
`, MOCK[view], shot, path.join(out, 'compare_' + view + '.jpg'), view]);
    } finally { await browser.close(); }
  }
})();
