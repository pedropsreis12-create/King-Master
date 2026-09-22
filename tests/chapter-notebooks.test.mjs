import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const [html, script, styles, cloud] = await Promise.all([
  readFile(new URL('../index.html', import.meta.url), 'utf8'),
  readFile(new URL('../script.js', import.meta.url), 'utf8'),
  readFile(new URL('../chapter-notebooks.css', import.meta.url), 'utf8'),
  readFile(new URL('../cloud-sync.js', import.meta.url), 'utf8')
]);

test('each chapter opens its own notebook inside the mastery center, not the removed subject screen', () => {
  assert.match(html, /id="chapterBrowser"/);
  assert.match(html, /id="chapterNotebook"/);
  assert.match(html, /id="chapterPageList"/);
  assert.doesNotMatch(html, /id="assuntosModal"/);
  assert.match(script, /function abrirCadernoCapitulo\(materiaId, topicoIndice\)/);
  assert.match(script, /topico\.caderno\.paginas/);
  assert.match(script, /function filtrarCadernosCapitulos/);
});

test('pages autosave through the existing local and cloud flow, and deletion requires confirmation', () => {
  assert.match(script, /setTimeout\(salvarAlteracoesCadernoCapitulo, 650\)/);
  assert.match(script, /window\.addEventListener\('pagehide', salvarCadernoPendente\)/);
  assert.match(script, /saveAppData\(\)/);
  assert.match(cloud, /king-master-data-changed/);
  assert.match(script, /abrirModalDeletar\('chapterPage'/);
  assert.match(script, /tipo === 'chapterPage'/);
  assert.match(script, /topico\.cadernoMigrado = true/);
});

test('chapter notebook reflows on mobile without a full-screen subject overlay', () => {
  assert.match(styles, /@media \(max-width: 900px\)/);
  assert.match(styles, /\.chapter-notebook-layout \{ grid-template-columns: 1fr; \}/);
  assert.doesNotMatch(styles, /position:\s*fixed/);
});
