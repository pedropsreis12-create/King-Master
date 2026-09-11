import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const [html, script, style] = await Promise.all([
    readFile(new URL('../index.html', import.meta.url), 'utf8'),
    readFile(new URL('../script.js', import.meta.url), 'utf8'),
    readFile(new URL('../style.css', import.meta.url), 'utf8')
]);

test('error notebook is a first-class saved section with a guided entry form', () => {
    assert.match(html, /showSection\('caderno-erros'\)/);
    assert.match(html, /id="caderno-erros"/);
    assert.match(html, /id="errorNotebookForm"/);
    assert.match(html, /id="errorCauseInput"/);
    assert.match(html, /id="errorRuleInput"/);
    assert.match(script, /cadernoErrosItems:\s*\[\]/);
    assert.match(script, /saveAppData\(\);\s*\n\s*renderizarCadernoErros\(\)/);
});

test('review flow hides feedback until recall and schedules repeated retrieval', () => {
    assert.match(html, /Tente responder sem olhar/);
    assert.match(html, /id="errorReviewAnswer" hidden/);
    assert.match(script, /CADERNO_ERROS_INTERVALOS = \[1, 3, 7, 14, 30\]/);
    assert.match(script, /function revelarCorrecaoCadernoErro/);
    assert.match(script, /function avaliarRevisaoCadernoErro/);
    assert.match(script, /resultado === 'remembered'/);
    assert.match(script, /item\.status = item\.etapaRevisao >= CADERNO_ERROS_INTERVALOS\.length \? 'dominado' : 'aprendendo'/);
});

test('errors can be searched, filtered by cause and used comfortably on small screens', () => {
    for (const cause of ['conteudo', 'interpretacao', 'calculo', 'atencao', 'estrategia']) {
        assert.match(html, new RegExp(`value="${cause}"`));
    }
    assert.match(html, /id="errorSearchInput"/);
    assert.match(html, /id="errorSubjectFilter"/);
    assert.match(html, /id="errorStatusFilter"/);
    assert.match(style, /@media \(max-width: 760px\)[\s\S]+\.error-review-rating > div \{ grid-template-columns: 1fr; \}/);
    assert.match(script, /escaparRevisaoHtml\(item\.questao\)/);
});
