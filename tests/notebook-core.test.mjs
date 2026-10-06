import test from 'node:test';
import assert from 'node:assert/strict';
import '../notebook-core.js';
const core = globalThis.KingNotebookCore;

test('caderno central reúne fontes originais sem copiá-las e combina filtros', () => {
    const data = {
        cycleItems: [{ id: 1, subject: 'Matemática', temas: [{ id: 't1', nome: 'Álgebra' }], topicos: [{ id: 'a1', nome: 'Funções', temaId: 't1', caderno: { paginas: [{ id: 'p1', titulo: 'Resumo', texto: 'Função afim cresce.', destaques: [{ id: 'd1', inicio: 0, trecho: 'Função', cor: 'azul' }] }] } }] }],
        cadernoErrosItems: [{ id: 2, materia: 'Matemática', assunto: 'Funções', topicId: 'a1', regra: 'Verifique o sinal', questao: 'Qual gráfico?' }],
        flashcards: { decks: [{ id: 'deck1', subjectId: '1', topicId: 'a1', topic: 'Funções' }], cards: [{ id: 'card1', deckId: 'deck1', front: 'O que é?', back: 'Relação' }] },
        quickNotes: [{ id: 3, subjectIds: ['1'], title: 'Dúvida', text: 'Rever' }]
    };
    const items = core.collect(data);
    assert.equal(items.length, 5);
    assert.equal(core.filter(items, { subjectId: '1', themeId: 't1' }).length, 4);
    assert.equal(core.filter(items, { kind: 'destaque', color: 'azul' }).length, 1);
    assert.equal(core.filter(items, { review: 'pendentes' }, { 'pagina:p1': '2026-10-06' }).length, 4);
    assert.equal(core.filter(items, { review: 'revisados' }, { 'pagina:p1': '2026-10-06' }).length, 1);
    assert.equal(data.cycleItems[0].topicos[0].caderno.paginas[0].texto, 'Função afim cresce.');
});

test('destaque deslocado reencontra trecho e trecho apagado fica sinalizado', () => {
    const one = { id: 'd1', inicio: 0, trecho: 'Regra de três' };
    assert.deepEqual(core.reanchorHighlights('Sobre Regra de três', [one])[0], { ...one, inicio: 6, fim: 19, stale: false });
    assert.equal(core.reanchorHighlights('Sobre proporção', [one])[0].stale, true);
});
