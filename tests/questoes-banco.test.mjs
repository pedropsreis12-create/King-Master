import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const ler = nome => fs.readFileSync(new URL(`../${nome}`, import.meta.url), 'utf8');
const scope = { window: { addEventListener() {} }, document: { readyState: 'complete', addEventListener() {}, getElementById: () => null, querySelector: () => null, querySelectorAll: () => [] }, localStorage: { getItem: () => null, setItem() {} }, setTimeout, clearTimeout, Date, Math, Number, String, Array, Object, JSON, RegExp, Set, Map, Promise };
vm.runInNewContext(`${ler('subject-icons.js')}; ${ler('questoes-assuntos.js')}; ${ler('questoes-banco.js')}; this.B = window.KingQuestoesBanco; this.A = window.KingQuestoesAssuntos;`, scope);
const { A, B } = scope;
const lista = v => Array.from(v);

test('a árvore de assuntos separa temas e subtemas e classifica textos e tags', () => {
    assert.ok(Object.keys(A.DISCIPLINAS).length >= 16);
    const subs = Object.values(A.DISCIPLINAS).flatMap(d => Object.values(d.temas).flatMap(t => Object.keys(t.subs)));
    assert.ok(subs.length >= 150, `só ${subs.length} subtemas`);
    assert.equal(A.subtema('historia', 'História do Brasil ; Império ; Segundo Reinado ; Sociedade'), 'imperio.segundoreinado');
    assert.equal(A.subtema('historia', 'História Geral ; Idade Média ; Alta Idade Média'), 'medieval.');
    assert.equal(A.subtema('historia', 'História do Brasil ; Período Colonial (1530-1822) ; Revoltas'), 'colonia.revoltas');
    assert.equal(A.subtema('geografia', 'Brasil ; Sociedade ; Urbanização - Brasil ; Urbanização'), 'humana.urbanizacao');
    assert.equal(A.subtema('biologia', 'O DNA sofre mutação e o gene alterado passa aos descendentes'), 'genetica.dna');
    assert.equal(A.subtema('quimica', 'A pilha de zinco e cobre: oxidação e redução no eletrodo'), 'fisicoquimica.eletroquimica');
    assert.equal(A.disciplina('Um carro com velocidade constante sofre força de atrito', ['fisica', 'quimica', 'biologia']).disc, 'fisica');
    assert.equal(A.nomeSub('historia', 'imperio.segundoreinado'), 'Segundo Reinado');
});

test('converte as três fontes para o formato do cartão', () => {
    const enem = B.normalizarEnem({ year: 2022, index: 91, context: 'Texto ![](https://enem.dev/2022/questions/91/a.png)', files: ['https://enem.dev/2022/questions/91/a.png', 'https://enem.dev/2022/questions/91/b.png'],
        correctAlternative: 'C', alternativesIntroduction: 'Assinale:', alternatives: ['A', 'B', 'C', 'D', 'E'].map(letter => ({ letter, text: `alt ${letter}`, file: null })) });
    assert.equal(enem.correta, 2);
    assert.deepEqual(lista(enem.imagens), ['https://enem.dev/2022/questions/91/b.png']);
    const base = { question: 'Pergunta?', titulo: 'UECE 2° Fase 2012 - Questão', alternatives: { A: 'um', B: 'dois', C: 'três', D: 'quatro', E: 'Nenhuma das anteriores' } };
    const quatro = B.normalizarVestibular({ ...base, answer: 'B' });
    assert.equal(quatro.alternativas.length, 4, 'tira o E artificial');
    assert.equal(quatro.correta, 1);
    assert.equal(quatro.rotulo, 'UECE 2° Fase 2012');
    assert.equal(B.normalizarVestibular({ ...base, answer: 'E' }).alternativas.length, 5, 'mantém o E quando é a resposta');
    const bluex = B.normalizarBluex({ id: 'USP_2023_81', question: 'Joana comprou', alternatives: ['a) 1', 'b) 2', 'c) 3', 'd) 4', 'e) 5'], answer: 'D', associated_images: ['iVBORw0KGgo='] });
    assert.equal(bluex.rotulo, 'FUVEST 2023');
    assert.equal(bluex.alternativas[0].texto, '1');
    assert.match(bluex.imagens[0], /^data:image\/png;base64,/);
    assert.equal(B.normalizarBluex({ id: 'X_1', question: 'q', alternatives: ['a) 1'], answer: 'A' }), null);
});

test('o texto é escapado e as linhas quebradas viram parágrafos', () => {
    const html = B.textoPlano('Drones vêm sendo\nutilizados por empresas.\nNovo parágrafo <script>x</script>\n01) item um\n02) item dois');
    assert.match(html, /<p>Drones vêm sendo utilizados por empresas\.<\/p>/);
    assert.doesNotMatch(html, /<script>/);
    assert.match(html, /<p>01\) item um<\/p><p>02\) item dois<\/p>/);
    assert.doesNotMatch(B.markdown('![](https://malicioso.com/x.png)'), /malicioso/);
});

const E = (id, fonte, disc, sub, ano, extra = {}) => ({ id, fonte, ref: id, disc, sub, ano, dif: 0, prova: fonte === 'enem' ? 'ENEM' : 'UECE', img: false, ...extra });
const entradas = [
    E('enem-2015-1', 'enem', 'historia', 'imperio.segundoreinado', 2015),
    E('enem-2009-5', 'enem', 'historia', 'colonia.revoltas', 2009, { img: true }),
    E('vest-1', 'vest', 'historia', 'medieval.', 2012, { dif: 3 }),
    E('vest-2', 'vest', 'geografia', 'humana.urbanizacao', 2018, { prova: 'EsPCEx', dif: 1 }),
    E('bluex-3', 'bluex', 'historia', 'imperio.abolicao', 2020, { prova: 'FUVEST' }),
];
const ids = (f, b) => lista(B.filtrar(entradas, { discs: [], temas: [], subs: [], origens: [], ids: [], ordem: 'antigas', ...f }, b)).map(e => e.id);

test('filtros por tema, subtema, origem, prova, anos, dificuldade e situação', () => {
    assert.deepEqual(ids({}), ['enem-2009-5', 'vest-1', 'enem-2015-1', 'vest-2', 'bluex-3'], 'começa pelo ENEM de 2009');
    assert.equal(ids({ ordem: 'recentes' })[0], 'bluex-3');
    assert.deepEqual(ids({ ordem: 'enem' }), ['enem-2009-5', 'enem-2015-1', 'vest-1', 'vest-2', 'bluex-3'], 'padrão: ENEM a partir de 2009, depois as outras provas');
    assert.deepEqual(ids({ discs: ['geografia'] }), ['vest-2']);
    assert.deepEqual(ids({ temas: ['historia.imperio'] }), ['enem-2015-1', 'vest-2', 'bluex-3'], 'tema marcado só restringe a própria disciplina');
    assert.deepEqual(ids({ subs: ['historia.imperio.abolicao'], discs: ['historia'] }), ['bluex-3']);
    assert.deepEqual(ids({ temas: ['historia.medieval'], discs: ['historia'] }), ['vest-1'], 'questão marcada só no tema entra no tema');
    assert.deepEqual(ids({ origens: ['militar'] }), ['vest-2']);
    assert.deepEqual(ids({ origens: ['enem', 'militar'] }), ['enem-2009-5', 'enem-2015-1', 'vest-2']);
    assert.deepEqual(ids({ prova: 'FUVEST' }), ['bluex-3']);
    assert.deepEqual(ids({ anoDe: '2013', anoAte: '2019' }), ['enem-2015-1', 'vest-2']);
    assert.deepEqual(ids({ dif: '3' }), ['vest-1']);
    assert.deepEqual(ids({ imagem: 'com' }), ['enem-2009-5']);
    const b = { respondidas: { 'vest-1': { ok: false, em: 1 }, 'bluex-3': { ok: true, em: 2 } }, salvas: { 'vest-2': 3 } };
    assert.deepEqual(ids({ situacao: 'errei' }, b), ['vest-1']);
    assert.deepEqual(ids({ situacao: 'salvas' }, b), ['vest-2']);
    assert.deepEqual(ids({ situacao: 'nao' }, b), ['enem-2009-5', 'enem-2015-1', 'vest-2']);
    assert.deepEqual(ids({ ids: ['vest-2'], discs: ['historia'] }), ['vest-2'], 'abrir uma questão ignora os outros filtros');
    const c = B.contarAssuntos(entradas);
    assert.equal(c['historia.imperio'], 2);
    assert.equal(c['historia.imperio.abolicao'], 1);
    assert.equal(c['historia.medieval'], 1);
});

test('matérias do aluno viram disciplinas do banco', () => {
    assert.deepEqual(lista(B.discDaMateria({ subject: 'Matemática' })), ['matematica', 'geometria', 'estatistica']);
    assert.deepEqual(lista(B.discDaMateria({ subject: 'Inglês' })), ['ingles']);
    assert.deepEqual(lista(B.discDaMateria({ subject: 'Biologia' })), ['biologia']);
    assert.deepEqual(lista(B.discDaMateria({ subject: 'Redação' })), []);
});

test('desempenho por disciplina e subtemas para reforçar', () => {
    const r = B.desempenho({ a: { ok: true, d: 'biologia', s: 'genetica.dna' }, b: { ok: false, d: 'biologia', s: 'genetica.dna' }, c: { ok: false, d: 'biologia', s: 'genetica.dna' }, d: { ok: true, d: 'idiomas', s: '' } });
    assert.equal(r.porDisc.biologia.erradas, 2);
    assert.equal(r.porDisc.outras.total, 1);
    assert.equal(r.fracos[0].chave, 'biologia.genetica.dna');
});

test('o índice publicado tem as matérias e entradas bem formadas', () => {
    const pasta = new URL('../dados/questoes/', import.meta.url);
    const resumo = JSON.parse(fs.readFileSync(new URL('resumo.json', pasta), 'utf8'));
    for (const d of ['historia', 'geografia', 'biologia', 'matematica', 'portugues', 'fisica', 'quimica', 'ingles']) assert.ok(resumo.total[d] > 50, `${d}: ${resumo.total[d]}`);
    for (const [disc, total] of Object.entries(resumo.total)) {
        assert.ok(A.DISCIPLINAS[disc], disc);
        const { provas, q } = JSON.parse(fs.readFileSync(new URL(`${disc}.json`, pasta), 'utf8'));
        assert.equal(q.length, total);
        for (const [fonte, ref, sub, dif, p, ano, img] of q.slice(0, 400)) {
            assert.ok([0, 1, 2].includes(fonte));
            assert.ok(ref !== undefined && provas[p] && (ano === 0 || ano >= 2000) && [0, 1].includes(img) && [0, 1, 2, 3].includes(dif), JSON.stringify([fonte, ref, sub, dif, p, ano, img]));
            if (sub) assert.ok(A.DISCIPLINAS[disc].temas[sub.split('.')[0]], `${disc} ${sub}`);
        }
    }
});
