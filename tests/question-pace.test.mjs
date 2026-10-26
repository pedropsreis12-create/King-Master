import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import '../question-pace-core.js';

const Core = globalThis.KingQuestionPaceCore;
const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const script = readFileSync(new URL('../script.js', import.meta.url), 'utf8');
const ui = readFileSync(new URL('../question-pace.js', import.meta.url), 'utf8');
const css = readFileSync(new URL('../question-pace.css', import.meta.url), 'utf8');

const setup = { id: 'tempo-1', accountUid: 'aluno-1', subjectId: 'math', subject: 'Matemática', topic: 'Regra de três', count: 3, budgetMinutes: 9, hideClock: true };

test('cronômetro registra cada questão e exclui pausas do tempo líquido', () => {
    let draft = Core.start(setup, 1000);
    draft = Core.record(draft, 'hit', '', 'Q12', 91000);
    assert.equal(draft.records[0].seconds, 90);
    assert.equal(draft.records[0].reference, 'Q12');
    assert.equal(draft.runningSince, 91000);
    draft = Core.pause(draft, 151000);
    assert.equal(Core.elapsedSeconds(draft, 1000000), 60);
    draft = Core.resume(draft, 1000000);
    draft = Core.record(draft, 'miss', 'interpretacao', '', 1120000);
    assert.equal(draft.records[1].seconds, 180);
    assert.equal(draft.records[1].cause, 'interpretacao');
    draft = Core.record(draft, 'skip', '', '', 1150000);
    assert.equal(draft.status, 'summary');
    const summary = Core.summary(draft.records, draft.budgetSeconds, draft.count);
    assert.deepEqual([summary.hits, summary.misses, summary.skips], [1, 1, 1]);
    assert.equal(summary.totalSeconds, 300);
    assert.equal(summary.hitAverageSeconds, 90);
    assert.equal(summary.missAverageSeconds, 180);
    assert.equal(summary.targetSeconds, 180);
});

test('erro precisa de causa e uma sessão parcial pode ser encerrada', () => {
    const draft = Core.start(setup, 1000);
    assert.equal(Core.record(draft, 'miss', '', '', 6000), null);
    assert.equal(Core.finish(draft, 6000), null);
    const completed = Core.record(draft, 'miss', 'calculo', '', 6000);
    assert.equal(Core.finish(completed, 6000).status, 'summary');
});

test('recuperação pausa um treino anterior e rejeita rascunho de outra conta', () => {
    const draft = Core.start(setup, 1000);
    assert.equal(Core.restore(draft, 'aluno-2'), null);
    const restored = Core.restore(draft, 'aluno-1');
    assert.equal(restored.status, 'paused');
    assert.equal(Core.elapsedSeconds(restored, 10000000), 0);
});

test('interface integra matérias, histórico e caderno sem duplicar a contagem de questões', () => {
    for (const id of ['questionPaceSubject', 'questionPaceTopic', 'questionPaceActive', 'questionPaceSummary', 'questionPaceHistory'])
        assert.match(html, new RegExp(`id="${id}"`));
    assert.match(html, /data-section="question-timer"/);
    assert.match(html, /KingQuestionPace\.openForTopic\(\)/);
    assert.match(script, /questionPaceSessions:\s*\[\]/);
    assert.match(script, /if \(detalhes\?\.questionPaceSession\)/);
    assert.match(ui, /registrarSessao\(info\.totalSeconds/);
    assert.match(ui, /study: \{ questoes: info\.attempted, acertos: info\.hits, erros: info\.misses \}/);
    assert.match(ui, /normalizarItemCadernoErro\(/);
    assert.match(ui, /if \(row\.errorId && \(appData\.cadernoErrosItems \|\| \[\]\)\.some\(item => item\.id === row\.errorId\)\) return abrirModalCadernoErro\(row\.errorId\)/);
    assert.match(css, /@media\(max-width:650px\)/);
});
