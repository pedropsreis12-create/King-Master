import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
await import('../flashcards-core.js');
const core = globalThis.KingFlashcardsCore;

test('SM-2 agenda acerto, erro e facilidade sem misturar conteúdo e estado', () => {
    const now = Date.UTC(2026, 8, 29, 12);
    const good = core.nextState({}, 'good', now);
    assert.equal(good.repetitions, 1);
    assert.equal(good.intervalDays, 1);
    assert.equal(good.dueAt, now + core.DAY);
    const second = core.nextState(good, 'good', good.dueAt);
    assert.equal(second.intervalDays, 6);
    const again = core.nextState(second, 'again', second.dueAt);
    assert.equal(again.repetitions, 0);
    assert.equal(again.lapses, 1);
    assert.equal(again.dueAt, second.dueAt + 10 * 60000);
    assert.equal(core.nextState({}, 'easy', now).intervalDays, 4);
    assert.throws(() => core.nextState({}, 'invalid', now));
});

test('prévia da IA remove cartões incompletos, repetidos e compridos', () => {
    const generated = [
        { front: 'Qual é a função da mitocôndria?', back: 'Produzir ATP.' },
        { front: 'qual e a funcao da mitocondria?', back: 'Duplicado.' },
        { front: 'Curta?', back: '' },
        { front: 'Onde ocorre a respiração celular?', back: 'Principalmente na mitocôndria.' }
    ];
    const result = core.validateCandidates({ cards: generated }, [], 10);
    assert.equal(result.length, 2);
    assert.equal(core.validateCandidates(generated, [result[0]], 10).length, 1);
});

test('estatísticas e fila consideram apenas cartões do deck e prazo', () => {
    const now = Date.UTC(2026, 8, 29, 12);
    const data = { flashcards: { decks: [{ id: 'd1' }, { id: 'd2' }], cards: [
        { id: 'c1', deckId: 'd1' }, { id: 'c2', deckId: 'd1' }, { id: 'c3', deckId: 'd2' }
    ], states: { c1: {}, c2: { lastReviewedAt: now - core.DAY, dueAt: now + core.DAY, repetitions: 2, ease: 2.2 }, c3: {} }, reviews: [] } };
    assert.equal(core.deckStats(data, 'd1', now).due, 1);
    assert.equal(core.deckStats(data, 'd1', now).learned, 1);
    assert.deepEqual(core.dueCards(data, 'd1', now).map(card => card.id), ['c1']);
    assert.equal(core.dueCards(data, '', now).length, 2);
    data.flashcards.states.c2 = { lastReviewedAt: now - core.DAY, repetitions: 2 };
    assert.equal(core.deckStats(data, 'd1', now).due, 2, 'um prazo ausente não pode esconder cartão antigo');
    assert.equal(core.dueCards(data, 'd1', now).length, 2);
});

test('integração publica os arquivos e usa o ícone do site na IA', async () => {
    const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');
    const vite = await readFile(new URL('../vite.config.js', import.meta.url), 'utf8');
    assert.match(html, /id="flashcards"/);
    assert.match(html, /flashcards-core\.js/);
    assert.match(html, /flashcards\.js/);
    assert.match(vite, /'flashcards-core\.js', 'flashcards\.js'/);
    assert.match(html, /class="ai-qg-launcher-orb"[^>]*><img src="assets\/app-icon-192\.png"/);
    assert.match(html, /class="ai-qg-avatar"[^>]*><img src="assets\/app-icon-192\.png"/);
});

test('a interface oferece quantidade personalizada, busca e confirmação antes de salvar IA', async () => {
    const ui = await readFile(new URL('../flashcards.js', import.meta.url), 'utf8');
    assert.match(ui, /new Option\('Personalizado', 'custom'\)/);
    assert.match(ui, /count < 1 \|\| count > 30/);
    assert.match(ui, /flashDeckSearch/);
    assert.match(ui, /flashAiAddSelected/);
    assert.match(ui, /validateCandidates\(accepted/);
});
