import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';

// Dev server only: the lick browser and recorder save into these project
// files (likes and hides, and licks recorded from your piano). The files are
// unwatched so saving doesn't reload the page; the new data ships with the
// next build.
const DEV_FILES: Record<string, string> = {
  '/__dev/ratings': fileURLToPath(new URL('./src/music/data/ratings.json', import.meta.url)),
  '/__dev/recorded': fileURLToPath(new URL('./src/music/data/recorded.json', import.meta.url)),
};

function devFiles(): Plugin {
  return {
    name: 'melodream-dev-files',
    apply: 'serve',
    configureServer(server) {
      Object.values(DEV_FILES).forEach((f) => server.watcher.unwatch(f));
      Object.entries(DEV_FILES).forEach(([route, file]) => {
        server.middlewares.use(route, (req, res) => {
          if (req.method !== 'POST') {
            res.statusCode = 405;
            res.end();
            return;
          }
          let body = '';
          req.on('data', (chunk) => (body += chunk));
          req.on('end', () => {
            try {
              const data: unknown = JSON.parse(body);
              writeFileSync(file, JSON.stringify(data, null, 2) + '\n');
              res.statusCode = 204;
            } catch {
              res.statusCode = 400;
            }
            res.end();
          });
        });
      });
    },
  };
}

export default defineConfig({
  plugins: [react(), devFiles()],
  // Relative asset paths, so the build works from any subpath (GitHub Pages
  // serves it at /melodream/). Routing is hash-based, so no server rewrites.
  base: './',
});
