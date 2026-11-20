// UI rework, second pass (Baiyee 16 Nov; 18.44 on 20 Nov: the HUD is HTML now, its letters are measured too): his mock-up on the left, our game on the right, at the
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
const MOCK = { phone: path.join(BP, '2026-11-16/new_ui.png'), desktop: path.join(BP, '2026-11-15b/ui_target.png'), retina: path.join(BP, '2026-11-15b/ui_target.png') };

(async () => {
  for (const view of ['phone', 'desktop', 'retina']) {
    // 'retina': the desktop at twice the pixels (a Retina screen), to show the HUD stays sharp
    const { browser, page, errors } = await openBattle(view === 'retina' ? 'desktop' : view, view === 'retina' ? { dsf: 2 } : {});
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
        b.selectedSpell = b.spellMenu(layra).length ? layra.spells.find((id) => /wildfire/i.test(id)) || layra.spells.find((id) => /fire/i.test(id)) || layra.spells[0] : null;
        b.refreshStatus(); b.layoutMenu();
        await sleep(400);
        // the smallest text the interface camera draws, in real pixels
        let least = 99;
        const visit = (o) => { if (!o || !o.visible) return; if (o.type === 'Text' && o.text && o.alpha > 0.05) least = Math.min(least, parseFloat(o.style.fontSize) * Math.abs(o.scaleY) * b.lay.real); if (o.list) o.list.forEach(visit); };
        for (const o of b.children.list) if ((o.cameraFilter & b.cameras.main.id) && !(o.cameraFilter & b.uiCam.id)) visit(o);
        // ...and the HTML HUD's letters (18.44): every element with words of its own, as the browser draws it
        let domLeast = 99;
        for (const el of document.querySelectorAll('#fabien-hud *')) {
          if (!el.offsetParent || ![...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim())) continue;
          domLeast = Math.min(domLeast, parseFloat(getComputedStyle(el).fontSize));
        }
        least = Math.min(least, domLeast);
        return { board: (b.lay.bottom - b.lay.top) / b.lay.H, least: least.toFixed(1), row: (b.lay.rowH * b.lay.real).toFixed(1) };
      });
      const shot = path.join(out, 'game_' + view + '.png');
      await page.screenshot({ path: shot });
      console.log(view + ': board ' + (info.board * 100).toFixed(1) + '% of the height, smallest text ' + info.least + ' px, menu rows ' + info.row + ' px apart' + (errors.length ? ', ERRORS ' + errors[0] : ''));
      execFileSync(path.join(process.env.HOME, '.fabien-tools/venv/bin/python'), ['-I', '-c', `
import sys
from PIL import Image, ImageDraw
a = Image.open(sys.argv[1]).convert('RGB'); b = Image.open(sys.argv[2]).convert('RGB')
# our screen at its own size (1440 x 900, 390 x 844 at 2 pixels a point, or the Retina desktop), his mock-up at the same height
H = b.height
a = a.resize((round(a.width * H / a.height), H), Image.LANCZOS)
detail = sys.argv[4] == 'retina'
dh = 700 if detail else 0
s = Image.new('RGB', (a.width + b.width + 30, H + 40 + dh + (40 if detail else 0)), (20, 16, 12))
s.paste(a, (0, 40)); s.paste(b, (a.width + 30, 40))
d = ImageDraw.Draw(s); d.text((10, 12), "Suleiman's mock-up", fill=(230, 210, 160)); d.text((a.width + 40, 12), 'Our game (' + sys.argv[4] + ', ' + str(b.width) + ' x ' + str(b.height) + ' real pixels)', fill=(230, 210, 160))
if detail:
    # the bottom left corner at full size: every real pixel of the card and the hint, as a Retina screen shows them
    crop = b.crop((0, b.height - dh, min(b.width, a.width + b.width + 30), b.height))
    d.text((10, H + 52), 'Retina detail, 1 to 1 (no scaling):', fill=(230, 210, 160))
    s.paste(crop, (0, H + 80 - 0))
s.save(sys.argv[3], quality=92)
`, MOCK[view], shot, path.join(out, 'compare_' + view + '.jpg'), view]);
    } finally { await browser.close(); }
  }
})();
