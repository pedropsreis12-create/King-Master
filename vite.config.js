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

      const privacyPage = await readFile('privacidade.html', 'utf8');
      await writeFile('dist/privacidade.html', privacyPage, 'utf8');
      files['/privacidade.html'] = { body: privacyPage, type: 'text/html; charset=utf-8' };

      for (const name of ['script.js', 'periodic-table-data.js', 'periodic-table-core.js', 'periodic-table.js', 'topic-core.js', 'review-trail-core.js', 'notebook-core.js', 'notebook.js', 'caderno-library-core.js', 'caderno-library.js', 'study-evolution-core.js', 'study-evolution.js', 'autopilot-core.js', 'autopilot.js', 'practice-core.js', 'practice.js', 'agenda-workspace.js', 'schedule-core.js', 'schedule-planner.js', 'schedule.js', 'flashcards-core.js', 'flashcards.js', 'mock-exam-core.js', 'mock-exams.js', 'subject-picker.js', 'habit-core.js', 'academic-context.js', 'sidebar-icons.js', 'personal-development.js', 'subject-lab.js', 'timer-recovery.js', 'ai-assistant.js', 'productivity.js', 'rank-system-v2.js', 'rank-integration-v2.js', 'accessibility-v2.js', 'data-portability.js', 'command-palette.js', 'modal-accessibility.js', 'profile-overhaul.js', 'firebase-config.js', 'auth-warmup.js', 'cloud-state.js', 'cloud-sync.js', 'password-reset.js', 'rank-art.js', 'military-insignia.js', 'study-insights.js', 'sw.js']) {
        const body = await readFile(name, 'utf8');
        await writeFile(`dist/${name}`, body, 'utf8');
        files[`/${name}`] = { body, type: 'application/javascript; charset=utf-8' };
      }

      const manifest = await readFile('manifest.webmanifest', 'utf8');
      await writeFile('dist/manifest.webmanifest', manifest, 'utf8');
      files['/manifest.webmanifest'] = { body: manifest, type: 'application/manifest+json; charset=utf-8' };

      for (const name of assetNames) {
        if (name.endsWith('.css') || name.endsWith('.js')) {
          files[`/assets/${name}`] = {
            body: await readFile(`dist/assets/${name}`, 'utf8'),
            type: name.endsWith('.css') ? 'text/css; charset=utf-8' : 'application/javascript; charset=utf-8',
          };
        } else if (/\.(png|webp|jpg|jpeg|svg|ttf)$/i.test(name)) {
          const body = await readFile(`dist/assets/${name}`);
          const type = name.endsWith('.webp') ? 'image/webp' : name.endsWith('.png') ? 'image/png' : name.endsWith('.svg') ? 'image/svg+xml' : name.endsWith('.ttf') ? 'font/ttf' : 'image/jpeg';
          files[`/assets/${name}`] = { body: body.toString('base64'), type, binary: true };
        }
      }

      // Cenários são referenciados pelo JS clássico, fora do grafo de imports.
      for (const name of await readdir('assets')) {
        if (!/^rank-[a-z0-9-]+\.webp$/.test(name) && !/^app-icon-(192|512)\.png$/.test(name) && !/^periodic-(spider-(hanging|web|mask)\.png|spider-symbol\.svg|web-corner\.svg|bangers\.ttf|bangers-OFL\.txt)$/.test(name)) continue;
        const body = await readFile(`assets/${name}`);
        await writeFile(`dist/assets/${name}`, body);
        const type = name.endsWith('.png') ? 'image/png' : name.endsWith('.svg') ? 'image/svg+xml' : name.endsWith('.ttf') ? 'font/ttf' : name.endsWith('.txt') ? 'text/plain; charset=utf-8' : 'image/webp';
        files[`/assets/${name}`] = name.endsWith('.txt') ? { body: body.toString('utf8'), type } : { body: body.toString('base64'), type, binary: true };
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
      'Cache-Control': file.type.startsWith('text/html') ? 'private, no-cache' : 'public, max-age=31536000, immutable',
      'X-Content-Type-Options': 'nosniff',
      'Referrer-Policy': 'strict-origin-when-cross-origin',
      'X-Frame-Options': 'DENY',
      'Content-Security-Policy': "frame-ancestors 'none'; base-uri 'self'; object-src 'none'",
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
