import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const [html, script, schedule, style, cloud, rules] = await Promise.all([
    readFile(new URL('../index.html', import.meta.url), 'utf8'),
    readFile(new URL('../script.js', import.meta.url), 'utf8'),
    readFile(new URL('../schedule.js', import.meta.url), 'utf8'),
    readFile(new URL('../usability.css', import.meta.url), 'utf8'),
    readFile(new URL('../cloud-sync.js', import.meta.url), 'utf8'),
    readFile(new URL('../firestore.rules', import.meta.url), 'utf8')
]);

test('quick review capture keeps the required flow short and progressive', () => {
    assert.match(html, /class="quick-review-trigger"/);
    assert.match(html, /id="revisaoMateria"/);
    assert.match(html, /id="revisaoAssunto"/);
    assert.match(html, /id="revisaoDataAlvo"/);
    for (const reason of ['errei-questao', 'nao-entendi', 'demorei', 'interpretacao', 'esqueci-conceito', 'esqueci-formula', 'erro-calculo', 'reforcar']) {
        assert.match(html, new RegExp(`value="${reason}"`));
    }
    for (const optional of ['revisaoObservacao', 'revisaoQuestao', 'revisaoImagemInput', 'revisaoLink', 'revisaoFonte', 'revisaoNumeroQuestao']) {
        assert.match(html, new RegExp(`id="${optional}"`));
    }
    assert.match(html, /class="review-optional-details"/);
    assert.match(script, /function obterContextoRevisaoRapida/);
    assert.match(script, /activeScheduleBlock/);
    assert.match(script, /event\.altKey && event\.key\.toLowerCase\(\) === 'r'/);
});

test('review inbox reuses saved revision data and exposes the complete lifecycle', () => {
    assert.match(script, /revisoesItems:\s*\[\]/);
    assert.match(script, /appData\.revisoesItems = appData\.revisoesItems\.map\(normalizarItemRevisao\)/);
    assert.doesNotMatch(script, /reviewInboxItems:\s*\[/);
    for (const filter of ['hoje', 'pendentes', 'proximas', 'concluidas']) {
        assert.match(html, new RegExp(`data-review-filter="${filter}"`));
    }
    assert.match(script, /function marcarRevisao/);
    assert.match(script, /function adiarRevisao/);
    assert.match(script, /function revisarNovamenteRevisao/);
    assert.match(script, /function abrirReagendamentoRevisao/);
    assert.match(script, /function salvarRevisao/);
    assert.match(script, /abrirModalDeletar\('revisao'/);
});

test('schedule and daily close surface reviews without modifying ordinary blocks', () => {
    assert.match(html, /id="scheduleReviewQueue"/);
    assert.match(html, /As revisões ficam separadas dos blocos normais/);
    assert.match(script, /aproximadamente \$\{minutos\} min/);
    assert.match(html, /id="scheduleDayCloseReviewsList"/);
    assert.match(schedule, /renderizarRevisoesFechamentoDia\(dateForDay\(key, day\)\)/);
    assert.match(script, /function renderizarRevisoesFechamentoDia/);
});

test('review photos are stored as private per-user cloud documents', () => {
    assert.match(cloud, /'reviewImages'/);
    assert.match(cloud, /async function saveReviewImage/);
    assert.match(cloud, /async function getReviewImage/);
    assert.match(cloud, /async function deleteReviewImage/);
    assert.match(rules, /match \/reviewImages\/\{imageId\}/);
    assert.match(rules, /request\.auth\.uid == userId/);
});

test('review interface has dedicated mobile layouts and touch-sized controls', () => {
    assert.match(style, /\.review-quick-modal/);
    assert.match(style, /\.review-inbox-card/);
    assert.match(style, /@media \(max-width: 650px\)[\s\S]*\.review-quick-overlay/);
    assert.match(style, /\.review-reason-grid span \{ min-height: 42px/);
});
