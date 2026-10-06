import test from 'node:test';
import assert from 'node:assert/strict';
import '../flashcards-core.js';

const core = globalThis.KingFlashcardsCore;
const base = () => ({ flashcards: { decks: [], cards: [], states: {}, reviews: [] } });
const options = { errorId: 7, subjectId: 2, subject: 'Química', topic: 'Estequiometria',
    front: 'O que indica o coeficiente numa equação química balanceada?',
    back: 'A proporção molar entre as substâncias participantes.', now: 1000 };

test('erro diagnosticado cria deck e cartão novo ligado ao erro sem alterar outras matérias', () => {
    const data = base(); let sequence = 0;
    const first = core.addFromError(data, { ...options, makeId: prefix => `${prefix}-${++sequence}` });
    assert.equal(first.created, true);
    assert.equal(data.flashcards.decks.length, 1);
    assert.equal(data.flashcards.decks[0].subjectId, '2');
    assert.equal(data.flashcards.cards[0].sourceErrorId, 7);
    assert.equal(core.dueCards(data).length, 1);
});

test('pergunta repetida sem acentos não cria cartão nem deck extra', () => {
    const data = base(); let sequence = 0;
    const makeId = prefix => `${prefix}-${++sequence}`;
    core.addFromError(data, { ...options, makeId });
    const repeated = core.addFromError(data, { ...options, front: options.front.normalize('NFD').replace(/[\u0300-\u036f]/g, ''), makeId });
    assert.equal(repeated.reason, 'duplicate');
    assert.equal(data.flashcards.cards.length, 1);
    assert.equal(data.flashcards.decks.length, 1);
});

test('sugestão insuficiente não altera dados', () => {
    const data = base();
    const result = core.addFromError(data, { ...options, front: 'O quê?', back: '', makeId: () => 'id' });
    assert.equal(result.created, false);
    assert.equal(data.flashcards.cards.length, 0);
});
