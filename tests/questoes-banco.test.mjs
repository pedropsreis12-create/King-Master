import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const source = fs.readFileSync(new URL('../questoes-banco.js', import.meta.url), 'utf8');
const icones = fs.readFileSync(new URL('../subject-icons.js', import.meta.url), 'utf8');
const scope = { window: { addEventListener() {} }, document: { readyState: 'complete', addEventListener() {}, getElementById: () => null, querySelector: () => null, querySelectorAll: () => [] }, setTimeout, clearTimeout, Date, Math, Number, String, Array, Object, JSON, RegExp, Set, Map };
vm.runInNewContext(`${icones}; ${source}; this.B = window.KingQuestoesBanco;`, scope);
const B = scope.B;

const alternativas = ['A', 'B', 'C', 'D', 'E'].map(letter => ({ letter, text: `alt ${letter}`, file: null }));
const exemplo = {
    year: 2022, index: 91, discipline: 'ciencias-natureza', language: null,
    context: 'O DNA da célula sofre mutação e o gene alterado passa aos descendentes por herança. **Importante** com *ênfase*.\n\n![](https://enem.dev/2022/questions/91/a.png)\n\n<script>alert(1)</script>',
    files: ['https://enem.dev/2022/questions/91/a.png', 'https://enem.dev/2022/questions/91/b.png'], correctAlternative: 'C', alternativesIntroduction: 'Assinale:', alternatives: alternativas,
};

test('converte uma questão real do ENEM, com disciplina, assunto e figuras', () => {
    const q = B.normalizarEnem(exemplo);
    assert.equal(q.id, 'enem-2022-91');
    assert.equal(q.area, 'natureza');
    assert.equal(q.disc, 'biologia');
    assert.equal(q.assunto, 'genetica');
    assert.equal(q.correta, 2);
    assert.equal(q.temImagem, true);
    assert.deepEqual(Array.from(q.arquivos), ['https://enem.dev/2022/questions/91/b.png'], 'a figura que já está no texto não se repete');
    assert.equal(B.normalizarEnem({ ...exemplo, alternatives: [] }), null);
    assert.equal(B.normalizarEnem({ ...exemplo, discipline: 'outra' }), null);
});

test('classifica física, matemática e língua estrangeira', () => {
    const fisica = B.normalizarEnem({ ...exemplo, index: 100, context: 'Um carro com velocidade constante sofre uma força de atrito e sua aceleração muda.', files: [] });
    assert.equal(fisica.disc, 'fisica'); assert.equal(fisica.assunto, 'mecanica');
    const geo = B.normalizarEnem({ ...exemplo, index: 140, discipline: 'matematica', context: 'Um cilindro e um cubo têm o mesmo volume. Qual a área da base?', files: [] });
    assert.equal(geo.disc, 'geometria');
    const ingles = B.normalizarEnem({ ...exemplo, index: 2, discipline: 'linguagens', language: 'ingles', context: 'Read the text.', files: [] });
    assert.equal(ingles.disc, 'idiomas'); assert.equal(ingles.id, 'enem-2022-2-ingles');
});

test('o texto da questão é escapado e só aceita imagens do enem.dev', () => {
    const html = B.markdown(exemplo.context + '\n\n![](https://malicioso.com/x.png)');
    assert.match(html, /<strong>Importante<\/strong>/);
    assert.match(html, /<em>ênfase<\/em>/);
    assert.match(html, /<img src="https:\/\/enem\.dev\/2022\/questions\/91\/a\.png"/);
    assert.doesNotMatch(html, /<script>/);
    assert.doesNotMatch(html, /malicioso/);
    assert.doesNotMatch(B.textoIa('- <b>oi</b>\ntexto'), /<b>/);
});

test('filtros profundos: disciplina, assunto, anos, dia, imagem e situação', () => {
    const bio = B.normalizarEnem(exemplo);
    const fis = B.normalizarEnem({ ...exemplo, year: 2015, index: 100, context: 'Um carro com velocidade constante sofre força de atrito e aceleração.', files: [] });
    const mat = B.normalizarEnem({ ...exemplo, year: 2019, index: 150, discipline: 'matematica', context: 'A porcentagem de desconto e os juros do produto.', files: [] });
    const base = { disc: [], assuntos: [], ids: [], ordem: 'recentes' };
    const ids = (f, b) => Array.from(B.filtrar([bio, fis, mat], { ...base, ...f }, b), q => q.id);
    assert.deepEqual(ids({ disc: ['biologia'] }), ['enem-2022-91']);
    assert.deepEqual(ids({ disc: ['biologia', 'fisica'], assuntos: ['fisica.mecanica'] }), ['enem-2022-91', 'enem-2015-100'], 'assunto marcado só restringe a própria disciplina');
    assert.deepEqual(ids({ anoDe: '2016', anoAte: '2020' }), ['enem-2019-150']);
    assert.deepEqual(ids({ dia: '1' }), []);
    assert.deepEqual(ids({ imagem: 'com' }), ['enem-2022-91']);
    assert.deepEqual(ids({ busca: 'juros' }), ['enem-2019-150']);
    const b = { respondidas: { 'enem-2015-100': { ok: false, em: 1 }, 'enem-2019-150': { ok: true, em: 2 } }, salvas: { 'enem-2022-91': 3 } };
    assert.deepEqual(ids({ situacao: 'errei' }, b), ['enem-2015-100']);
    assert.deepEqual(ids({ situacao: 'nao' }, b), ['enem-2022-91']);
    assert.deepEqual(ids({ situacao: 'salvas' }, b), ['enem-2022-91']);
    assert.deepEqual(ids({ ids: ['enem-2019-150'], disc: ['biologia'] }), ['enem-2019-150'], 'abrir uma questão ignora os outros filtros');
});

test('matérias do aluno viram disciplinas do banco', () => {
    assert.deepEqual(Array.from(B.discDaMateria({ subject: 'Matemática' })), ['matematica', 'geometria', 'estatistica']);
    assert.deepEqual(Array.from(B.discDaMateria({ subject: 'Biologia' })), ['biologia']);
    assert.deepEqual(Array.from(B.discDaMateria({ subject: 'Redação' })), []);
});

test('o id diz de qual prova buscar a questão', () => {
    assert.deepEqual({ ...B.origemDoId('enem-2020-140') }, { ano: 2020, numero: 140, lingua: '' });
    assert.equal(B.origemDoId('enem-2018-3-espanhol').lingua, 'espanhol');
    assert.equal(B.origemDoId('ia-abc-1'), null);
});

test('desempenho por disciplina e assuntos para reforçar', () => {
    const r = B.desempenho({
        a: { ok: true, em: 1, d: 'biologia', s: 'genetica' }, b: { ok: false, em: 2, d: 'biologia', s: 'genetica' },
        c: { ok: false, em: 3, d: 'biologia', s: 'genetica' }, d: { ok: true, em: 4, d: 'fisica', s: 'optica' },
    });
    assert.equal(r.porDisc.biologia.total, 3);
    assert.equal(r.porDisc.biologia.erradas, 2);
    assert.equal(r.fracos[0].chave, 'biologia.genetica');
    assert.equal(r.fracos[0].pct, 33);
});
