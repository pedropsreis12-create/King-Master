import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import { sites } from '@openai/sites-vite-plugin';
import { defineConfig } from 'vite';

function staticSiteWorker() {
  return {
    name: 'king-master-static-worker',
    apply: 'build',
    async closeBundle() {
      const assetNames = await readdir('dist/assets');
      const files = {
        '/index.html': {
          body: await readFile('dist/index.html', 'utf8'),
          type: 'text/html; charset=utf-8',
        },
      };

      const passwordResetPage = await readFile('recuperar.html', 'utf8');
      await writeFile('dist/recuperar.html', passwordResetPage, 'utf8');
      files['/recuperar.html'] = { body: passwordResetPage, type: 'text/html; charset=utf-8' };

      for (const name of ['script.js', 'timer-recovery.js', 'ai-assistant.js', 'productivity.js', 'firebase-config.js', 'cloud-state.js', 'cloud-sync.js', 'password-reset.js', 'rank-art.js', 'military-insignia.js', 'study-insights.js', 'sw.js']) {
        const body = await readFile(name, 'utf8');
        await writeFile(`dist/${name}`, body, 'utf8');
        files[`/${name}`] = { body, type: 'application/javascript; charset=utf-8' };
      }

      const manifest = await readFile('manifest.webmanifest', 'utf8');
      await writeFile('dist/manifest.webmanifest', manifest, 'utf8');
      files['/manifest.webmanifest'] = { body: manifest, type: 'application/manifest+json; charset=utf-8' };

      for (const name of assetNames) {
        if (!name.endsWith('.css') && !name.endsWith('.js')) continue;
        files[`/assets/${name}`] = {
          body: await readFile(`dist/assets/${name}`, 'utf8'),
          type: name.endsWith('.css') ? 'text/css; charset=utf-8' : 'application/javascript; charset=utf-8',
        };
      }

      // Cenários são referenciados pelo JS clássico, fora do grafo de imports.
      for (const name of await readdir('assets')) {
        if (!/^rank-[a-z0-9-]+\.webp$/.test(name) && !/^app-icon-(192|512)\.png$/.test(name)) continue;
        const body = await readFile(`assets/${name}`);
        await writeFile(`dist/assets/${name}`, body);
        files[`/assets/${name}`] = { body: body.toString('base64'), type: name.endsWith('.png') ? 'image/png' : 'image/webp', binary: true };
      }

      await mkdir('dist/server', { recursive: true });
      await writeFile(
        'dist/server/index.js',
        `const files = ${JSON.stringify(files)};

export default {
  async fetch(request) {
    if (request.method !== 'GET' && request.method !== 'HEAD') {
      return new Response('Method Not Allowed', { status: 405 });
    }

    const url = new URL(request.url);
    const path = url.pathname === '/' ? '/index.html' : url.pathname;
    const file = files[path];
    if (!file) return new Response('Not Found', { status: 404 });

    const headers = {
      'Content-Type': file.type,
      'Cache-Control': path === '/index.html' ? 'private, no-cache' : 'public, max-age=31536000, immutable',
      'X-Content-Type-Options': 'nosniff',
    };
    const body = file.binary ? Uint8Array.from(atob(file.body), c => c.charCodeAt(0)) : file.body;
    return new Response(request.method === 'HEAD' ? null : body, { status: 200, headers });
  }
};
`,
        'utf8',
      );
    },
  };
}

export default defineConfig({
  plugins: [sites(), staticSiteWorker()],
});
