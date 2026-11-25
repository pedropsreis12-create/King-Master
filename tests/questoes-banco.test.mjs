import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const source = fs.readFileSync(new URL('../questoes-banco.js', import.meta.url), 'utf8');
const scope = { window: { addEventListener() {} }, document: { readyState: 'complete', addEventListener() {}, getElementById: () => null, querySelector: () => null }, setTimeout, clearInterval, setInterval, Date, Math, Number, String, Array, Object, JSON };
vm.runInNewContext(`${source}; this.B = window.KingQuestoesBanco;`, scope);
const B = scope.B;

const exemplo = {
    year: 2022, index: 91, discipline: 'ciencias-natureza', language: null,
    context: 'Texto **importante** com *ênfase*.\n\n![](https://enem.dev/2022/questions/91/a.png)\n\n<script>alert(1)</script>',
    files: ['https://enem.dev/2022/questions/91/a.png'], correctAlternative: 'C', alternativesIntroduction: 'Assinale:',
    alternatives: ['A', 'B', 'C', 'D', 'E'].map(letter => ({ letter, text: `alt ${letter}`, file: null })),
};

test('converte uma questão real do ENEM para o banco', () => {
    const q = B.normalizarEnem(exemplo);
    assert.equal(q.id, 'enem-2022-91');
    assert.equal(q.area, 'natureza');
    assert.equal(q.correta, 2);
    assert.equal(q.alternativas.length, 5);
    assert.equal(B.normalizarEnem({ ...exemplo, alternatives: [] }), null);
    assert.equal(B.normalizarEnem({ ...exemplo, discipline: 'outra' }), null);
});

test('o texto da questão é escapado e só aceita imagens do enem.dev', () => {
    const html = B.markdown(exemplo.context + '\n\n![](https://malicioso.com/x.png)');
    assert.match(html, /<strong>importante<\/strong>/);
    assert.match(html, /<em>ênfase<\/em>/);
    assert.match(html, /<img src="https:\/\/enem\.dev\/2022\/questions\/91\/a\.png"/);
    assert.doesNotMatch(html, /<script>/);
    assert.doesNotMatch(html, /malicioso/);
});

test('o resumo conta acertos, erros e puladas', () => {
    const qs = [{ fonte: 'enem', area: 'natureza', correta: 0 }, { fonte: 'enem', area: 'natureza', correta: 1 }, { fonte: 'enem', area: 'humanas', correta: 2 }];
    const r = B.resumir(qs, [{ escolha: 0, segundos: 60 }, { escolha: 3, segundos: 30 }, { escolha: null, segundos: 5 }]);
    assert.equal(r.acertos, 1); assert.equal(r.erros, 1); assert.equal(r.puladas, 1); assert.equal(r.percentual, 50);
    assert.equal(r.porArea.Natureza.total, 2);
});
