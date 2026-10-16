import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { runInNewContext } from 'node:vm';

const [html, script, style, cloud, rules] = await Promise.all([
    readFile(new URL('../index.html', import.meta.url), 'utf8'),
    readFile(new URL('../script.js', import.meta.url), 'utf8'),
    readFile(new URL('../style.css', import.meta.url), 'utf8'),
    readFile(new URL('../cloud-sync.js', import.meta.url), 'utf8'),
    readFile(new URL('../firestore.rules', import.meta.url), 'utf8')
]);

test('error notebook is a first-class saved section with a guided entry form', () => {
    assert.match(html, /showSection\('caderno-erros'\)/);
    assert.match(html, /id="caderno-erros"/);
    assert.match(html, /id="errorNotebookForm"/);
    assert.doesNotMatch(html, /id="errorCauseInput"/);
    assert.match(html, /id="errorRuleInput"/);
    assert.match(html, /id="errorRuleImageInput"/);
    assert.match(html, /Minha resposta <span>\(opcional\)<\/span>/);
    assert.match(html, /Resposta correta <span>\(opcional\)<\/span>/);
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

test('an error can be scheduled for a chosen date without changing its review history', () => {
    assert.match(html, /id="errorReviewDateInput" required/);
    assert.match(script, /errorReviewDateInput'\)\.value = item\?\.proximaRevisao \|\| dataLocalISO\(\)/);
    assert.match(script, /proximaRevisao: document\.getElementById\('errorReviewDateInput'\)\.value/);
    assert.doesNotMatch(script, /etapaRevisao: 0, proximaRevisao: dataLocalISO\(\)/);
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

test('cards use two columns on wide screens and one on smaller screens', () => {
    assert.match(style, /\.error-notebook-list \{ display: grid; grid-template-columns: repeat\(2,minmax\(0,1fr\)\)/);
    assert.match(style, /@media \(max-width: 900px\) \{\s*\.error-notebook-list \{ grid-template-columns: minmax\(0,1fr\)/);
    assert.match(style, /\.error-notebook-list > \.error-empty-state \{ grid-column: 1 \/ -1/);
});

test('dominating an error stops scheduling without deleting it and can be undone', () => {
    const mark = script.match(/function marcarErroDominado\(id\) \{[\s\S]*?(?=\nfunction reativarErroDominado)/)?.[0];
    const reopen = script.match(/function reativarErroDominado\(id\) \{[\s\S]*?(?=\nfunction dataCadernoErroComDias)/)?.[0];
    const queue = script.match(/function obterFilaErrosDevidos\(\) \{[\s\S]*?(?=\nfunction marcarErroDominado)/)?.[0];
    assert.ok(mark && reopen && queue);
    const item = { id: 42, status: 'aprendendo', etapaRevisao: 2, proximaRevisao: '2026-10-16', historicoRevisoes: [], atualizadoEm: 1 };
    const items = [item];
    let saves = 0;
    const context = {
        Date, Number, String,
        obterItensCadernoErros: () => items,
        dataLocalISO: () => '2026-10-16',
        dataCadernoErroComDias: () => '2026-10-17',
        CADERNO_ERROS_INTERVALOS: [1, 3, 7, 14, 30],
        saveAppData: () => { saves += 1; },
        renderizarCadernoErros: () => {}, renderizarRevisoes: () => {},
        atualizarIndicadoresNavegacao: () => {}, showToast: () => {}
    };
    runInNewContext(`${queue}\n${mark}\n${reopen}\nthis.actions = { obterFilaErrosDevidos, marcarErroDominado, reativarErroDominado };`, context);
    context.actions.marcarErroDominado(42);
    assert.equal(item.status, 'dominado');
    assert.equal(item.proximaRevisao, '');
    assert.ok(item.dominadoEm);
    assert.equal(item.historicoRevisoes.at(-1).resultado, 'dominado-manual');
    assert.equal(context.actions.obterFilaErrosDevidos().length, 0);
    context.actions.reativarErroDominado(42);
    assert.equal(item.status, 'aprendendo');
    assert.equal(item.proximaRevisao, '2026-10-17');
    assert.equal(item.dominadoEm, null);
    assert.equal(item.etapaRevisao, 2);
    assert.equal(saves, 2);
    item.status = 'dominado';
    item.etapaRevisao = 5;
    context.actions.reativarErroDominado(42);
    assert.equal(item.etapaRevisao, 4);
    assert.equal(item.status, 'aprendendo');
});

test('question images support file selection, paste and drag without bloating the progress document', () => {
    assert.match(html, /id="errorImageInput"[^>]+accept="image\/png,image\/jpeg,image\/webp"[^>]+multiple/);
    assert.match(html, /onpaste="colarImagensCadernoErro\(event\)"/);
    assert.match(html, /ondrop="receberDropImagensCadernoErro\(event\)"/);
    assert.match(html, /id="errorReviewImages"/);
    assert.match(script, /filter\(imagem => imagem\.context === contexto\)/);
    assert.match(script, /canvas\.toDataURL\('image\/webp'/);
  assert.match(script, /dados\.imagens\s*=\s*imagensSalvas/);
    assert.doesNotMatch(script, /dados\.imagens\s*=\s*cadernoErroImagensRascunho/);
});

test('question image bytes stay in private per-user cloud documents', () => {
    assert.match(cloud, /'users', currentUser\.uid, 'errorImages'/);
    assert.match(cloud, /async function saveErrorImage/);
    assert.match(cloud, /async function getErrorImage/);
    assert.match(cloud, /async function deleteErrorImage/);
    assert.match(cloud, /image\.dataUrl\.length > 720000/);
    assert.match(rules, /match \/errorImages\/\{imageId\}/);
    assert.match(rules, /request\.auth\.uid == userId/);
    assert.match(rules, /request\.resource\.data\.dataUrl\.size\(\) <= 720000/);
});
