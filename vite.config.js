import { defineConfig } from 'vite';
import fs from 'fs';
import path from 'path';

// "base: './'" makes the built game load its files from wherever it is hosted,
// whether that is the top of a website or a folder inside one.
export default defineConfig({
  base: './',
  plugins: [dropPngTwins()],
});

// Every PNG in public/art has a lossless WebP twin that the game fetches (src/artUrl.js,
// dev/tools/make_webp.py, roadmap 18.47). The PNGs are only masters for the tools and tests, so they
// are left out of the published game (less to upload). The mouse cursors stay PNG: CSS reads those.
function dropPngTwins() {
  return {
    name: 'drop-png-twins',
    apply: 'build',
    closeBundle() {
      const art = path.resolve('dist', 'art');
      if (!fs.existsSync(art)) return;
      let dropped = 0;
      const walk = (dir) => {
        for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
          const file = path.join(dir, entry.name);
          if (entry.isDirectory()) walk(file);
          else if (entry.name.endsWith('.png') && !entry.name.startsWith('cursor_') && fs.existsSync(file.slice(0, -4) + '.webp')) {
            fs.unlinkSync(file);
            dropped++;
          }
        }
      };
      walk(art);
      console.log('dropped ' + dropped + ' PNG masters that have a WebP twin');
    },
  };
}
