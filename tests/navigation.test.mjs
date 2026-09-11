import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const [html, script, usability] = await Promise.all([
  readFile(new URL('../index.html', import.meta.url), 'utf8'),
  readFile(new URL('../script.js', import.meta.url), 'utf8'),
  readFile(new URL('../usability.css', import.meta.url), 'utf8')
]);

test('primary navigation is grouped by study intent and identifies the current destination', () => {
  assert.match(html, /nav-cluster-label">Agora/);
  assert.match(html, /nav-cluster-label">Aprender/);
  assert.match(html, /nav-cluster-label">Evolução/);
  assert.match(html, /data-section="dashboard"[^>]+aria-controls="dashboard"[^>]+aria-current="page"/);
  assert.match(script, /b\.dataset\.section === sectionId/);
  assert.match(script, /setAttribute\('aria-current', 'page'\)/);
});

test('mobile keeps four frequent destinations and a stable More entry', () => {
  const dock = html.match(/<div class="mobile-dock"[\s\S]*?<\/div>/)?.[0] || '';
  assert.ok(dock);
  assert.equal((dock.match(/class="dock-btn/g) || []).length, 5);
  assert.match(dock, /id="dockMoreButton"/);
  assert.match(usability, /grid-template-columns:\s*repeat\(5,minmax\(0,1fr\)\)/);
  assert.match(usability, /body > main \{ padding-bottom: 104px !important; \}/);
});

test('only actionable due counts become navigation badges', () => {
  assert.match(html, /id="navAgendaBadge" hidden/);
  assert.match(html, /id="navReviewBadge" hidden/);
  assert.match(html, /id="navErrorBadge" hidden/);
  assert.match(script, /function atualizarIndicadoresNavegacao\(\)/);
  assert.match(script, /badge\.hidden = total < 1/);
});
