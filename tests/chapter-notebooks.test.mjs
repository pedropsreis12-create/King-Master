import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const [html, script, styles, cloud] = await Promise.all([
  readFile(new URL('../index.html', import.meta.url), 'utf8'),
  readFile(new URL('../script.js', import.meta.url), 'utf8'),
  readFile(new URL('../chapter-notebooks.css', import.meta.url), 'utf8'),
  readFile(new URL('../cloud-sync.js', import.meta.url), 'utf8')
]);

test('chapters retain their own notebook data without restoring the removed subject screen', () => {
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
  assert.match(script, /window\.addEventListener\('pagehide'.*salvarCadernoPendente\(\)/);
  assert.match(script, /saveAppData\(\)/);
  assert.match(cloud, /king-master-data-changed/);
  assert.match(script, /abrirModalDeletar\('chapterPage'/);
  assert.match(script, /tipo === 'chapterPage'/);
  assert.match(script, /topico\.cadernoMigrado = true/);
});

test('clicking a chapter opens a switchable subject subtab with analytics and reviews', () => {
  assert.match(html, /id="topicNavSlot"/);
  assert.match(html, /data-section="topic-workspace"/);
  assert.match(html, /id="topicWorkspaceAnalytics"/);
  assert.match(html, /id="topicWorkspaceReviewState"/);
  assert.match(html, /id="topicWorkspaceNotebook"/);
  assert.match(script, /function abrirEspacoTopico\(materiaId, topicoIndice/);
  assert.match(script, /onclick="abrirEspacoTopico\(\$\{materia\.id\},\$\{indice\}\)"/);
  assert.match(script, /htmlAnaliseTopico\(analise\)/);
  assert.match(script, /obterRevisaoAtivaTopico\(materia, topico\)/);
  assert.match(script, /topicWorkspaceNotebook'\)\.append\(document\.getElementById\('chapterNotebook'\)\)/);
  assert.match(script, /sessionStorage\.setItem\('kingMasterOpenTopic'/);
});

test('chapter notebook reflows on mobile without a full-screen subject overlay', () => {
  assert.match(styles, /@media \(max-width: 900px\)/);
  assert.match(styles, /\.chapter-notebook-layout \{ grid-template-columns: 1fr; \}/);
  assert.doesNotMatch(styles, /position:\s*fixed/);
});
