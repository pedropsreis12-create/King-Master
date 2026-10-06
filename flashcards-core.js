/* SM-2: https://super-memory.org/archive/english/ol/sm2.htm
 * Conteúdo, estado de memorização e histórico são guardados separadamente.
 */
(function (root, factory) {
    const api = factory();
    if (typeof module !== 'undefined' && module.exports) module.exports = api;
    root.KingFlashcardsCore = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
    const DAY = 86400000;
    const QUALITY = { again: 0, hard: 3, good: 4, easy: 5 };
    const text = (value, max) => String(value ?? '').replace(/\s+/g, ' ').trim().slice(0, max);
    const key = value => text(value, 500).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('pt-BR');
    const validDate = value => Number.isFinite(Number(value)) && Number(value) > 0;

    function ensure(data) {
        if (!data.flashcards || typeof data.flashcards !== 'object' || Array.isArray(data.flashcards)) data.flashcards = {};
        const box = data.flashcards;
        for (const field of ['decks', 'cards', 'reviews', 'trash']) if (!Array.isArray(box[field])) box[field] = [];
        if (!box.states || typeof box.states !== 'object' || Array.isArray(box.states)) box.states = {};
        for (const deck of box.decks) {
            if (!Array.isArray(deck.subjectIds)) deck.subjectIds = deck.subjectId == null || deck.subjectId === '' ? [] : [String(deck.subjectId)];
            deck.subjectIds = [...new Set(deck.subjectIds.map(String))];
            deck.subjectId = deck.subjectIds[0] || '';
        }
        return box;
    }

    function duplicateDeck(data, deckId, newId, cardId) {
        const box = ensure(data), source = box.decks.find(item => item.id === deckId);
        if (!source) throw new Error('Deck não encontrado.');
        const now = Date.now();
        const copy = { ...structuredClone(source), id: newId, name: `${source.name} — Cópia`, createdAt: now, updatedAt: now };
        const copiedCards = box.cards.filter(item => item.deckId === deckId).map(item => ({ ...structuredClone(item), id: cardId(), deckId: newId, createdAt: now, updatedAt: now }));
        box.decks.push(copy); box.cards.push(...copiedCards);
        return copy;
    }

    function archiveDeck(data, deckId, now = Date.now()) {
        const box = ensure(data), index = box.decks.findIndex(item => item.id === deckId);
        if (index < 0) return null;
        const [deck] = box.decks.splice(index, 1);
        box.trash.push({ deck, deletedAt: now });
        return deck;
    }

    function restoreDeck(data, deckId) {
        const box = ensure(data), index = box.trash.findIndex(item => item.deck?.id === deckId);
        if (index < 0 || box.decks.some(item => item.id === deckId)) return null;
        const [entry] = box.trash.splice(index, 1);
        box.decks.push(entry.deck);
        return entry.deck;
    }

    function nextState(previous = {}, rating, now = Date.now()) {
        if (!Object.hasOwn(QUALITY, rating)) throw new Error('Resultado de revisão inválido.');
        const q = QUALITY[rating];
        const oldEase = Math.max(1.3, Math.min(3.5, Number(previous.ease) || 2.5));
        const ease = Math.max(1.3, Math.min(3.5, oldEase + 0.1 - (5 - q) * (0.08 + (5 - q) * 0.02)));
        const oldRepetitions = Math.max(0, Math.floor(Number(previous.repetitions) || 0));
        const repetitions = q < 3 ? 0 : oldRepetitions + 1;
        let intervalDays;
        if (q < 3) intervalDays = 10 / 1440; // reapresentação em 10 min
        else if (repetitions === 1) intervalDays = rating === 'easy' ? 4 : 1;
        else if (repetitions === 2) intervalDays = rating === 'easy' ? 8 : 6;
        else intervalDays = Math.min(3650, Math.ceil(Math.max(1, Number(previous.intervalDays) || 1) * ease * (rating === 'hard' ? 0.75 : rating === 'easy' ? 1.3 : 1)));
        return {
            ease, repetitions, intervalDays, lastReviewedAt: now,
            dueAt: now + intervalDays * DAY,
            successes: Math.max(0, Number(previous.successes) || 0) + (q >= 3 ? 1 : 0),
            lapses: Math.max(0, Number(previous.lapses) || 0) + (q < 3 ? 1 : 0),
            lastRating: rating
        };
    }

    function normalizeCandidate(item) {
        if (!item || typeof item !== 'object') return null;
        const front = text(item.front ?? item.frente ?? item.pergunta, 400);
        const back = text(item.back ?? item.verso ?? item.resposta, 800);
        if (front.length < 8 || back.length < 2 || front === back) return null;
        return { front, back };
    }

    function validateCandidates(raw, existing = [], limit = 20) {
        const items = Array.isArray(raw) ? raw : Array.isArray(raw?.cards) ? raw.cards : Array.isArray(raw?.flashcards) ? raw.flashcards : [];
        const seen = new Set(existing.map(card => key(card.front)));
        const result = [];
        for (const item of items.slice(0, 60)) {
            const card = normalizeCandidate(item);
            if (!card || seen.has(key(card.front))) continue;
            seen.add(key(card.front)); result.push(card);
            if (result.length >= limit) break;
        }
        return result;
    }

    function addFromError(data, { errorId, subjectId, subject, topic, front, back, now = Date.now(), makeId }) {
        const box = ensure(data);
        const candidate = normalizeCandidate({ front, back });
        if (!candidate || !subjectId || !String(topic || '').trim() || typeof makeId !== 'function') return { created: false, reason: 'invalid' };
        const targetTopic = text(topic, 100);
        let deck = box.decks.find(item => (item.subjectIds || [item.subjectId]).map(String).includes(String(subjectId)) && key(item.topic) === key(targetTopic));
        if (deck && box.cards.some(item => item.deckId === deck.id && key(item.front) === key(candidate.front))) return { created: false, reason: 'duplicate' };
        if (!deck) {
            deck = { id: makeId('deck'), name: text(`${subject} · ${targetTopic}`, 80), subjectId: String(subjectId),
                subjectIds: [String(subjectId)], topic: targetTopic, createdAt: now, updatedAt: now };
            box.decks.push(deck);
        }
        const card = { id: makeId('card'), deckId: deck.id, ...candidate, sourceLabel: 'Caderno de Erros',
            sourceErrorId: errorId, createdAt: now, updatedAt: now };
        box.cards.push(card);
        return { created: true, deckId: deck.id, cardId: card.id };
    }

    function deckStats(data, deckId, now = Date.now()) {
        const box = ensure(data);
        const cards = box.cards.filter(card => card.deckId === deckId);
        const states = cards.map(card => box.states[card.id] || {});
        return {
            total: cards.length,
            new: states.filter(state => !validDate(state.lastReviewedAt)).length,
            due: states.filter(state => !validDate(state.lastReviewedAt) || !validDate(state.dueAt) || Number(state.dueAt) <= now).length,
            difficult: states.filter(state => Number(state.lapses) > 0 || Number(state.ease) < 2).length,
            learned: states.filter(state => Number(state.repetitions) >= 2).length,
            mastered: states.filter(state => Number(state.repetitions) >= 4 && Number(state.ease) >= 2).length,
            lastReviewedAt: Math.max(0, ...states.map(state => Number(state.lastReviewedAt) || 0))
        };
    }

    function dueCards(data, deckId = '', now = Date.now()) {
        const box = ensure(data);
        return box.cards.filter(card => (!deckId || card.deckId === deckId) && box.decks.some(deck => deck.id === card.deckId))
            .filter(card => !validDate(box.states[card.id]?.lastReviewedAt) || !validDate(box.states[card.id]?.dueAt) || Number(box.states[card.id]?.dueAt) <= now)
            .sort((a, b) => (Number(box.states[a.id]?.dueAt) || 0) - (Number(box.states[b.id]?.dueAt) || 0));
    }

    return { DAY, QUALITY, ensure, duplicateDeck, archiveDeck, restoreDeck, nextState, normalizeCandidate, validateCandidates, addFromError, deckStats, dueCards, key, text };
});
