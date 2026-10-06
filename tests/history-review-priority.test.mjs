import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { runInNewContext } from 'node:vm';

const [html, script, styles] = await Promise.all([
    readFile(new URL('../index.html', import.meta.url), 'utf8'),
    readFile(new URL('../script.js', import.meta.url), 'utf8'),
    readFile(new URL('../usability.css', import.meta.url), 'utf8')
]);

test('histórico soma questões por semana sem duplicar simulado de sessão', () => {
    class TestDate extends Date {
        constructor(...args) { super(...(args.length ? args : ['2026-09-30T12:00:00'])); }
    }
    const elements = new Map(['historyQuestionsRange', 'hist-week-questions', 'hist-week-hits', 'hist-week-errors', 'hist-week-rate', 'historyQuestionChart', 'historyQuestionsNote', 'hist-life-questions', 'hist-life-hits', 'hist-life-errors', 'hist-life-rate', 'historyLifetimeNote']
        .map(id => [id, { textContent: '', innerHTML: '', disabled: false, setAttribute(name, value) { this[name] = value; } }]));
    const dateHelpers = script.slice(script.indexOf('function dataLocalISO('), script.indexOf('function reconciliarHistoricoComMateriasAtuais()'));
    const questionHelpers = script.slice(script.indexOf('function inicioSemanaQuestoes('), script.indexOf('function renderizarHistorico()'));
    const context = {
        Date: TestDate, Math, Map, Array, Number, String,
        document: { getElementById: id => elements.get(id) },
        appData: {
            historyItems: [
                { id: 1, dataISO: '2026-09-28', questoes: 15, acertos: 10, erros: 5 },
                { id: 2, dataISO: '2026-09-29', questoes: 20, acertos: 12, erros: 6, brancos: 2 },
                { id: 3, dataISO: '2026-08-03', questoes: 5, acertos: 4, erros: 1 }
            ],
            simuladosItems: [
                { date: '2026-09-29', format: 'sessao', total: 20, acertos: 12, erros: 6, brancos: 2 },
                { date: '2026-09-30', format: 'enem', total: 10, acertos: 8, erros: 2 }
            ]
        }
    };
    runInNewContext(`${dateHelpers}\n${questionHelpers}\nrenderizarQuestoesSemanaHistorico(); renderizarQuestoesVitaliciasHistorico();`, context);
    assert.equal(elements.get('hist-week-questions').textContent, 45);
    assert.equal(elements.get('hist-week-hits').textContent, 30);
    assert.equal(elements.get('hist-week-errors').textContent, 13);
    assert.equal(elements.get('hist-week-rate').textContent, '70%');
    assert.match(elements.get('historyQuestionsNote').textContent, /2 em branco/);
    assert.match(elements.get('historyQuestionChart').innerHTML, /SEG/);
    assert.equal(elements.get('hist-life-questions').textContent, 50);
    assert.equal(elements.get('hist-life-hits').textContent, 34);
    assert.equal(elements.get('hist-life-errors').textContent, 14);
});

test('revisões permitem definir e visualizar a prioridade sem perder os dados antigos', () => {
    assert.match(html, /name="revisaoPrioridade" value="alta"/);
    assert.match(html, /name="revisaoPrioridade" value="media" checked/);
    assert.match(script, /prioridade: \['baixa', 'media', 'alta'\]\.includes\(item\.prioridade\) \? item\.prioridade : 'media'/);
    assert.match(script, /review-priority-badge priority-/);
    assert.match(styles, /review-priority-options input:checked/);
});
