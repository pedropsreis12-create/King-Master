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

      for (const name of ['script.js', 'ai-assistant.js', 'firebase-config.js', 'cloud-sync.js']) {
        const body = await readFile(name, 'utf8');
        await writeFile(`dist/${name}`, body, 'utf8');
        files[`/${name}`] = { body, type: 'application/javascript; charset=utf-8' };
      }

      for (const name of assetNames) {
        if (!name.endsWith('.css')) continue;
        files[`/assets/${name}`] = {
          body: await readFile(`dist/assets/${name}`, 'utf8'),
          type: 'text/css; charset=utf-8',
        };
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
    return new Response(request.method === 'HEAD' ? null : file.body, { status: 200, headers });
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
