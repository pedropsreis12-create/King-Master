import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const [html, script, usability] = await Promise.all([
  readFile(new URL('../index.html', import.meta.url), 'utf8'),
  readFile(new URL('../script.js', import.meta.url), 'utf8'),
  readFile(new URL('../usability.css', import.meta.url), 'utf8')
]);

test('subjects expose accessible content and mastery views with useful summaries', () => {
  assert.match(html, /role="tablist" aria-label="Visualização das matérias"/);
  assert.match(html, /id="tab-ciclo" role="tab" aria-selected="true"/);
  assert.match(html, /id="tab-dominio" role="tab" aria-selected="false"/);
  assert.match(html, /id="materiasDominio"/);
  assert.match(html, /id="mapaContainer"/);
  assert.match(script, /function navegarAbasHub\(event\)/);
  assert.match(script, /setAttribute\('aria-selected'/);
});

test('agenda and reviews can be reduced to the next actionable items', () => {
  for (const value of ['todos', 'hoje', 'proximos', 'concluidos']) {
    assert.match(html, new RegExp(`data-agenda-filter="${value}"`));
  }
  for (const value of ['ativas', 'hoje', 'fracas', 'concluidas', 'todas']) {
    assert.match(html, new RegExp(`data-review-filter="${value}"`));
  }
  assert.match(script, /function filtrarAgendamento\(filtro = 'todos'\)/);
  assert.match(script, /function filtrarRevisoes\(filtro = 'ativas'\)/);
  assert.match(script, /aria-pressed/);
});

test('performance sections show trends and replace fabricated history metrics', () => {
  assert.match(html, /id="simuladosTrend"/);
  assert.match(html, /id="redacoesTrend"/);
  assert.match(html, /id="redCompetencyChart"/);
  assert.match(html, /id="hist-session-count"/);
  assert.match(html, /id="hist-session-average"/);
  assert.doesNotMatch(html, /Desempenho Global[\s\S]{0,180}0 Acertos/);
  assert.doesNotMatch(script, /class="hs-stats"><span>0<\/span>/);
});

test('new workspaces reflow without trapping mobile content', () => {
  assert.match(usability, /\.learning-insight-grid \{ grid-template-columns: 1fr; \}/);
  assert.match(usability, /\.workspace-toolbar \{ align-items: stretch; flex-direction: column; \}/);
  assert.match(usability, /\.result-card-metrics,.result-card-metrics\.five \{ grid-template-columns: repeat\(2,minmax\(0,1fr\)\); \}/);
});
