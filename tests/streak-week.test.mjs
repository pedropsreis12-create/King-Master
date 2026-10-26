import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { runInNewContext } from 'node:vm';

const [html, script] = await Promise.all([
    readFile(new URL('../index.html', import.meta.url), 'utf8'),
    readFile(new URL('../script.js', import.meta.url), 'utf8')
]);
const dateHelpers = script.slice(script.indexOf('function dataLocalISO('), script.indexOf('function reconciliarHistoricoComMateriasAtuais()'));
const sequenceHelpers = script.slice(script.indexOf('function obterDiasDeEstudo()'), script.indexOf('function criarMapaSequencias()'));
const renderer = script.slice(script.indexOf('function renderStreak()'), script.indexOf('function atualizarLinhaMediaSedilhadDynamica()'));

function renderAt(today, historyItems) {
    class TestDate extends Date {
        constructor(...args) { super(...(args.length ? args : [`${today}T12:00:00`])); }
    }
    const elements = new Map(['streak-row', 'streak-current-count', 'streak-current-label', 'streak-week-range', 'streak-week-summary']
        .map(id => [id, { innerHTML: '', textContent: '' }]));
    runInNewContext(`${dateHelpers}\n${sequenceHelpers}\n${renderer}\nrenderStreak();`, {
        Date: TestDate, Map, Set, Number, String,
        document: { getElementById: id => elements.get(id) },
        appData: { historyItems },
        formatShortTime: seconds => `${Math.floor(seconds / 60)}m`
    });
    return elements;
}

test('constância mostra segunda a domingo com datas, tempo e estados visíveis', () => {
    const elements = renderAt('2026-10-28', [
        { dataISO: '2026-10-26', tempoSegundos: 3600 },
        { dataISO: '2026-10-27', tempoSegundos: 1800 },
        { dataISO: '2026-10-27', tempoSegundos: 1800 }
    ]);
    const week = elements.get('streak-row').innerHTML;
    assert.equal((week.match(/role="listitem"/g) || []).length, 7);
    assert.match(week, /Seg<\/span><span>26/);
    assert.match(week, /Ter<\/span><span>27/);
    assert.match(week, /Dom<\/span><span>01/);
    assert.match(week, /streak-day--studied[^>]*>[\s\S]*?Estudou<\/strong><small>60m/);
    assert.match(week, /streak-day--current[^>]*aria-label="quarta-feira, 28 de outubro: Hoje, Em aberto"/);
    assert.match(week, /streak-day--future/);
    assert.equal(elements.get('streak-current-count').textContent, 2);
    assert.match(elements.get('streak-week-summary').innerHTML, /2 dias estudados/);
    assert.match(elements.get('streak-week-range').textContent, /26 de out/);
    assert.match(html, /id="streak-title">Constância nesta semana/);
});

test('sábado sem estudo e domingo sem estudo não quebram a sequência', () => {
    const elements = renderAt('2026-11-01', [
        { dataISO: '2026-10-30', tempoSegundos: 2400 }
    ]);
    const week = elements.get('streak-row').innerHTML;
    assert.match(week, /streak-day--optional[^>]*>[\s\S]*?Opcional<\/strong><small>Não quebra/);
    assert.match(week, /streak-day--rest streak-day--current[^>]*>[\s\S]*?Descanso<\/strong><small>Não quebra/);
    assert.equal(elements.get('streak-current-count').textContent, 1);
    assert.match(elements.get('streak-week-summary').innerHTML, /1 dia estudado/);
});
