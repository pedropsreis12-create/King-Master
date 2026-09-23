import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const [html, script, usability, style, sidebarIcons, sidebarIconStyles] = await Promise.all([
  readFile(new URL('../index.html', import.meta.url), 'utf8'),
  readFile(new URL('../script.js', import.meta.url), 'utf8'),
  readFile(new URL('../usability.css', import.meta.url), 'utf8'),
  readFile(new URL('../style.css', import.meta.url), 'utf8'),
  readFile(new URL('../sidebar-icons.js', import.meta.url), 'utf8'),
  readFile(new URL('../sidebar-icons.css', import.meta.url), 'utf8')
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

test('discard confirmation stays above the session form that opened it', () => {
  assert.match(style, /\.modal-overlay \{[^}]+z-index:\s*1000/);
  assert.match(usability, /\.session-complete-overlay \{ z-index:\s*1500/);
  assert.match(style, /#deleteConfirmModal \{ z-index:\s*1800/);
  assert.match(style, /body:has\(#deleteConfirmModal\.active\)[^{]+\{[^}]*pointer-events:\s*none/);
});

test('sidebar keeps the approved coherent vector icon family', () => {
  assert.match(html, /sidebar-icons\.css\?v=20260922-personal-v1/);
  assert.match(html, /sidebar-icons\.js\?v=20260922-notes-icon-v1/);
  for (const section of ['dashboard', 'agendamento', 'cronograma', 'planejamento', 'revisoes', 'caderno-erros', 'simulados', 'redacao', 'historico', 'desenvolvimento', 'perfil', 'notes']) {
    assert.match(sidebarIcons, new RegExp(`(?:'${section}'|${section}):`));
  }
  assert.match(sidebarIcons, /viewBox="0 0 24 24"/);
  assert.match(sidebarIconStyles, /\.nav-item-icon svg/);
});

test('notes are a dedicated page where each topic contains multiple saved annotations', async () => {
  const notesCss = await readFile(new URL('../notes-workspace.css', import.meta.url), 'utf8');
  assert.match(html, /data-section="notas"[^>]+aria-controls="notas"/);
  assert.match(html, /<section id="notas" class="content-section notes-section">/);
  assert.match(html, /id="quickNoteBooksList"/);
  assert.match(html, /id="quickNotesList"/);
  assert.match(script, /appData\.quickNotes\.filter\(nota => nota\.bookId === caderno\.id\)/);
  assert.match(script, /if\(sectionId === 'notas'\) renderizarNotasRapidas\(\)/);
  assert.match(notesCss, /@media \(max-width: 700px\)/);
});

test('free color controls share a visible, accessible picker treatment', async () => {
  const notesCss = await readFile(new URL('../notes-workspace.css', import.meta.url), 'utf8');
  for (const id of ['colorPicker', 'cycleColor', 'personalSpaceColor']) assert.match(html, new RegExp(`type="color" id="${id}"`));
  assert.match(html, /class="color-choice-control"/);
  assert.match(notesCss, /\.color-choice-control:focus-within/);
  assert.match(notesCss, /\.subject-custom-color:focus-within/);
  assert.match(script, /document\.querySelectorAll\('\.theme-circle'\)[\s\S]*?setAttribute\('aria-pressed'/);
});

test('modules group entire existing subjects without copying their topics or progress', async () => {
  const modules = await readFile(new URL('../subject-modules.js', import.meta.url), 'utf8');
  const moduleStyles = await readFile(new URL('../subject-modules.css', import.meta.url), 'utf8');
  assert.match(html, /id="tab-modulos" role="tab"[^>]+aria-controls="aba-modulos-content"/);
  assert.match(html, /id="aba-modulos-content"[^>]+role="tabpanel"/);
  assert.match(script, /subjectModules: \[\]/);
  assert.match(script, /if \(aba === 'modulos'\) window\.KingModules\?\.render/);
  assert.match(modules, /subject\.moduleId = targetId/);
  assert.match(modules, /delete subject\.moduleId/);
  assert.match(modules, /abrirModalDeletar\('subjectModule'/);
  assert.match(modules, /appData\.subjectModules = modules\(\)\.filter/);
  assert.match(moduleStyles, /@media \(max-width: 780px\)/);
});
