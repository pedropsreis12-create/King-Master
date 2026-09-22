import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const [html, script, usability, productivity] = await Promise.all([
  readFile(new URL('../index.html', import.meta.url), 'utf8'),
  readFile(new URL('../script.js', import.meta.url), 'utf8'),
  readFile(new URL('../usability.css', import.meta.url), 'utf8'),
  readFile(new URL('../productivity.js', import.meta.url), 'utf8')
]);

test('subjects expose accessible content and mastery views with useful summaries', () => {
  assert.match(html, /role="tablist" aria-label="Visualização das matérias"/);
  assert.match(html, /id="tab-ciclo" role="tab" aria-selected="true"/);
  assert.match(html, /id="tab-dominio" role="tab" aria-selected="false"/);
  assert.match(html, /id="materiasDominio"/);
  assert.match(html, /id="mapaContainer"/);
  assert.match(html, /Central de domínio/);
  assert.match(html, /id="domainCenterStats"/);
  assert.match(html, /id="domainPriorityList"/);
  assert.doesNotMatch(html, /Seu mapa de domínio/);
  assert.match(script, /function navegarAbasHub\(event\)/);
  assert.match(script, /setAttribute\('aria-selected'/);
  assert.match(script, /pontuacaoAcaoTopico\(a\.materia, a\.topico\)/);
  assert.doesNotMatch(html, /id="subjectWorkspaceMount"|id="assuntosModal"|id="topicControlPanel"/);
  assert.doesNotMatch(script, /function abrirModalAssuntos\(|function abrirTopicoPelaCentral\(/);
  assert.match(script, /onclick="editarMateriaCiclo\(\$\{i\.id\}\)"/);
});

test('agenda and reviews can be reduced to the next actionable items', () => {
  for (const value of ['todos', 'hoje', 'proximos', 'concluidos']) {
    assert.match(html, new RegExp(`data-agenda-filter="${value}"`));
  }
  for (const value of ['hoje', 'pendentes', 'proximas', 'concluidas']) {
    assert.match(html, new RegExp(`data-review-filter="${value}"`));
  }
  assert.match(script, /function filtrarAgendamento\(filtro = 'todos'\)/);
  assert.match(script, /function filtrarRevisoes\(filtro = 'pendentes'\)/);
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

test('motion quality can be automatic, full, reduced or disabled', () => {
  for (const value of ['auto', 'full', 'reduced', 'off']) assert.match(html, new RegExp(`<option value="${value}">`));
  assert.match(productivity, /navigator\.hardwareConcurrency/);
  assert.match(productivity, /navigator\.deviceMemory/);
  assert.match(productivity, /frames \/ \(elapsed \/ 1000\)/);
  assert.match(productivity, /IntersectionObserver/);
  assert.match(usability, /data-motion-level="off"/);
  assert.match(usability, /motion-outside-view/);
  assert.doesNotMatch(html, /Backup de Segurança/);
});

test('dyslexia reading mode is persistent and improves tracking without removing the chosen accent', () => {
  assert.match(html, /id="dyslexiaToggleBtn"[^>]+aria-pressed="false"/);
  assert.match(script, /dyslexiaMode: false/);
  assert.match(productivity, /classList\.toggle\('dyslexia-friendly', prefs\.dyslexiaMode === true\)/);
  assert.match(productivity, /savePreference\('dyslexiaMode'/);
  assert.match(usability, /html\.dyslexia-friendly body[\s\S]+Verdana/);
  assert.match(usability, /line-height:\s*1\.65/);
  assert.match(usability, /word-spacing:\s*\.09em/);
  assert.match(usability, /:focus-visible/);
});

test('completed timers require a topic, keep notes optional and can feed specialist workspaces', () => {
  assert.match(html, /id="sessionCompleteForm"/);
  assert.match(html, /id="sessionTopic"[^>]+required/);
  assert.match(html, /id="sessionNotes"/);
  assert.doesNotMatch(html, /id="sessionNotes"[^>]+required/);
  assert.match(html, /name="sessionKind" value="simulado"/);
  assert.match(html, /name="sessionKind" value="redacao"/);
  assert.match(html, /id="sessionAutoReview" checked/);
  assert.match(html, /Salvar registro/);
  assert.match(script, /function prepararRegistroSessao/);
  assert.match(script, /function criarRevisaoAutomaticaRegistro/);
  assert.match(html, /id="pendingSessionCard"[^>]+hidden/);
  assert.match(html, /onclick="descartarRegistroSessao\(\)"/);
  assert.match(script, /abrirModalDeletar\('pendingSession'/);
  assert.match(script, /pendingStudySessions/);
  assert.match(script, /resolvedStudySessionIds/);
  assert.match(script, /sourceSessionId/);
  assert.doesNotMatch(script, /setTimeout\([^\n]*abrirRegistroSessaoPendente/);
});

test('timer goal keeps counting and uses a system notification when available', () => {
  assert.match(script, /O cronômetro continua contando até você encerrar/);
  assert.match(script, /function notificarMetaTimer/);
  assert.match(script, /TimestampTrigger/);
  assert.doesNotMatch(script, /setTimeout\(\(\) => \{ stopAlarm\(\); prepararRegistroSessao\(currentSeconds, 'meta'\); \}, 1600\)/);
});

test('simulation and essay records capture a useful post-practice diagnosis', () => {
  for (const id of ['simFormat', 'simBrancos', 'simPreparation', 'simMainError', 'simWeakTopics', 'simNextStep', 'simCreateReview']) {
    assert.match(html, new RegExp(`id="${id}"`));
  }
  for (const id of ['redTempo', 'redScoresSection', 'redEvaluator', 'redStrengths', 'redNextFocus']) {
    assert.match(html, new RegExp(`id="${id}"`));
  }
  for (const status of ['draft', 'awaiting', 'corrected']) assert.match(html, new RegExp(`name="redStatus" value="${status}"`));
  assert.match(script, /function atualizarResumoSimulado/);
  assert.match(script, /erros: total - acertos - brancos/);
  assert.match(script, /function atualizarEstadoRedacao/);
  assert.match(script, /status !== 'corrected'/);
});

test('profile keeps an independent persistent banner', () => {
  assert.match(html, /id="profileBannerImage"/);
  assert.match(html, /id="profileBannerInput"/);
  assert.match(script, /profileBanner: ''/);
  assert.match(script, /function alterarBannerPerfil/);
  assert.match(script, /appData\.profileBanner = canvas\.toDataURL/);
});

test('removing the subject screen keeps stored topic and review operations intact', () => {
  assert.doesNotMatch(html, /id="assuntosBuscaInput"|id="assuntosOrdenacao"|id="topicControlPanel"/);
  assert.match(script, /function registrarTopicoEstudado/);
  assert.match(script, /function removerRevisaoTopico/);
  assert.match(script, /function obterNivelDominioTopico/);
  assert.match(html, /id="cycleInitialTopics"/);
});

test('subject creation starts simple and progressively reveals planning tools', () => {
  assert.match(html, /class="modal-box subject-editor-modal"/);
  assert.match(html, /id="cycleSubject"[^>]+required[^>]+maxlength="50"/);
  assert.match(html, /id="cyclePlanDetails"/);
  assert.match(html, /id="cycleTopicsDetails"/);
  assert.match(html, /id="cycleLivePreview"[^>]+aria-live="polite"/);
  assert.match(html, /id="cycleWeeklyBlocks"[^>]+min="0"[^>]+max="30"/);
  assert.match(html, /aria-label="Diminuir um bloco"/);
  assert.match(html, /aria-label="Adicionar um bloco"/);
  assert.match(html, /id="cycleInitialTopics"[^>]+maxlength="1600"/);
  assert.match(html, /id="cycleTopicCount"[^>]+aria-live="polite"/);
  assert.doesNotMatch(html, /id="cycleType"/);
  assert.match(html, /id="cyclePreviewStatus"/);
});

test('subject creation previews choices and preserves existing progress while appending unique topics', () => {
  assert.match(script, /function atualizarPreviewMateria\(\)/);
  assert.match(script, /function ajustarCargaMateria\(delta\)/);
  assert.match(script, /function normalizarListaTopicosMateria\(valor\)/);
  assert.match(script, /vistos\.has\(chave\)/);
  assert.match(script, /topicos: \[\.\.\.atuais, \.\.\.adicionados\]/);
  assert.doesNotMatch(script, /\.\.\.appData\.cycleItems\[idx\][^\n]+targetMin: 0/);
  assert.match(script, /window\.KingSchedule\?\.render\(\)/);
});

test('deleting a subject removes its linked study records instead of creating a deleted bucket', () => {
  assert.match(script, /function removerMateriaComRegistros\(id\)/);
  assert.match(script, /function reconciliarHistoricoComMateriasAtuais\(\)/);
  assert.match(script, /descontarSessoesDosTotais\(sessoesRemovidas\)/);
  assert.match(script, /nome: 'Sem matéria'/);
  assert.doesNotMatch(script, /Livre \/ Deletados/);
});

test('navigation uses a compact brand and hides its scrollbar without disabling scrolling', () => {
  assert.match(html, /class="site-brand"/);
  assert.match(html, /class="site-brand-mark"/);
  assert.match(usability, /#mainNavigation \{ scrollbar-width: none/);
  assert.match(usability, /#mainNavigation::-webkit-scrollbar \{ display: none/);
});
