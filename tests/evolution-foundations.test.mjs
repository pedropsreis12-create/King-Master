import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

await import('../flashcards-core.js');
await import('../habit-core.js');
const flash = globalThis.KingFlashcardsCore;
const habit = globalThis.KingHabitCore;

test('decks antigos migram para IDs múltiplos sem perder matéria nem cartões', () => {
    const data = { flashcards: { decks: [{ id: 'a', name: 'Teste', subjectId: 7 }], cards: [{ id: 'c', deckId: 'a' }], states: { c: { dueAt: 1 } }, reviews: [] } };
    flash.ensure(data);
    assert.deepEqual(data.flashcards.decks[0].subjectIds, ['7']);
    assert.equal(data.flashcards.decks[0].subjectId, '7');
    assert.equal(data.flashcards.cards.length, 1);
});

test('duplicar deck copia conteúdo sem sobrescrever o original', () => {
    const data = { flashcards: { decks: [{ id: 'a', name: 'Termodinâmica', subjectId: '1', subjectIds: ['1', '2'] }], cards: [{ id: 'c', deckId: 'a', front: 'Frente', back: 'Verso' }], states: { c: { repetitions: 3 } }, reviews: [] } };
    const copy = flash.duplicateDeck(data, 'a', 'b', () => 'd');
    assert.equal(copy.name, 'Termodinâmica — Cópia');
    assert.deepEqual(copy.subjectIds, ['1', '2']);
    assert.equal(data.flashcards.cards.find(card => card.id === 'd').deckId, 'b');
    assert.equal(data.flashcards.cards.find(card => card.id === 'c').deckId, 'a');
    assert.equal(data.flashcards.states.d, undefined);
});

test('excluir deck move para a lixeira e restaura histórico integral', () => {
    const data = { flashcards: { decks: [{ id: 'a', name: 'Biologia', subjectIds: ['1'] }], cards: [{ id: 'c', deckId: 'a' }], states: { c: { repetitions: 3 } }, reviews: [{ id: 'r', cardId: 'c' }] } };
    flash.archiveDeck(data, 'a', 100);
    assert.equal(flash.dueCards(data).length, 0);
    assert.equal(data.flashcards.trash[0].deletedAt, 100);
    flash.restoreDeck(data, 'a');
    assert.equal(data.flashcards.cards.length, 1);
    assert.equal(data.flashcards.states.c.repetitions, 3);
    assert.equal(data.flashcards.reviews.length, 1);
});

test('hábito em dias específicos ignora dias fora da meta', () => {
    const item = { frequency: { mode: 'weekdays', weekdays: [1, 3, 5] }, checkins: { '2026-09-28': true, '2026-09-30': true, '2026-10-02': true } };
    assert.equal(habit.streak(item, '2026-10-02'), 3);
    assert.equal(habit.weekProgress(item, '2026-10-02').target, 3);
    assert.equal(habit.weekProgress(item, '2026-10-02').done, 3);
    assert.equal(habit.due(item, '2026-10-01'), false);
});

test('hábito semanal soma semanas completas, não dias soltos', () => {
    const item = { frequency: { mode: 'weekly', timesPerWeek: 2 }, checkins: { '2026-09-23': true, '2026-09-25': true, '2026-09-30': true, '2026-10-01': true } };
    assert.equal(habit.streak(item, '2026-10-02'), 2);
    assert.deepEqual(habit.weekProgress(item, '2026-10-02'), { done: 2, target: 2 });
});

test('pulo justificado não soma nem quebra sequência; falta explícita quebra', () => {
    const item = { frequency: { mode: 'daily' }, checkins: { '2026-09-29': true, '2026-09-30': { status: 'skip', reason: 'doença' }, '2026-10-01': true, '2026-10-02': false } };
    assert.equal(habit.streak(item, '2026-10-01'), 2);
    assert.equal(habit.streak(item, '2026-10-02'), 0);
});

test('a interface inclui seletor compartilhado, menu de deck e frequência do hábito', () => {
    const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
    assert.match(html, /subject-picker\.js/);
    assert.match(html, /flashDeckSubjectsPicker/);
    assert.match(html, /flashDeckMenu/);
    assert.match(html, /personalHabitFrequency/);
    assert.match(html, /quickNoteType/);
});

test('contexto acadêmico só envia notas quando o pedido precisa delas', () => {
    const scope = { window: {}, Date };
    vm.runInNewContext(readFileSync(new URL('../academic-context.js', import.meta.url), 'utf8'), scope);
    const data = { cycleItems: [{ id: '1', subject: 'Matemática' }], quickNotes: [{ title: 'Privado', text: 'Texto de estudo', subject: 'Matemática' }] };
    const general = scope.window.KingAcademicContext.build(data, 'Qual é a hora?', '2026-10-02');
    assert.equal(general.notas, undefined);
    const requested = scope.window.KingAcademicContext.build(data, 'Resuma minhas notas de Matemática', '2026-10-02');
    assert.equal(requested.notas.length, 1);
    assert.equal(requested.notas[0].texto, 'Texto de estudo');
});

test('IA encontra notas multimatéria e sessões reais do dia solicitado', () => {
    const scope = { window: {}, Date };
    vm.runInNewContext(readFileSync(new URL('../academic-context.js', import.meta.url), 'utf8'), scope);
    const data = {
        cycleItems: [{ id: '1', subject: 'Física' }, { id: '2', subject: 'Química' }],
        quickNotes: [{ title: 'Termodinâmica', text: 'Calor específico', subject: 'Física', subjectIds: ['1', '2'] }],
        revisoesItems: [{ materia: 'Física', materiaIds: ['1', '2'], assunto: 'Calorimetria', dataAlvo: '2026-10-03', status: 'pendente' }],
        historyItems: [
            { materia: 'Química', assunto: 'Calorimetria', dataISO: '2026-10-02', tempoSegundos: 3000, questoes: 15, acertos: 12 },
            { materia: 'Química', assunto: 'Ligações', dataISO: '2026-10-01', tempoSegundos: 1200 }
        ]
    };
    const context = scope.window.KingAcademicContext.build(data, 'Crie flashcards do que estudei hoje em Química com minhas notas', '2026-10-02');
    assert.equal(context.notas.length, 1);
    assert.equal(context.revisoes.length, 1);
    assert.equal(context.sessoesRecentes.length, 1);
    assert.equal(context.sessoesRecentes[0].minutos, 50);
    assert.equal(context.sessoesRecentes[0].acertos, 12);
});

test('perfil não duplica questões do simulado já contado na sessão', () => {
    const source = readFileSync(new URL('../script.js', import.meta.url), 'utf8');
    const start = source.indexOf('function calcularEstatisticasGlobais()');
    const end = source.indexOf('function obterIniciaisPerfil()', start);
    const scope = { appData: {
        cycleItems: [{ acertos: 8, erros: 2 }],
        simuladosItems: [
            { format: 'sessao', acertos: 8, erros: 2, total: 10 },
            { format: 'area', acertos: 4, erros: 1, total: 6, brancos: 1 }
        ]
    } };
    vm.runInNewContext(`${source.slice(start, end)}; this.result = calcularEstatisticasGlobais();`, scope);
    assert.equal(scope.result.questoes, 15);
    assert.equal(scope.result.taxa, 80);
});

test('revisões antigas ganham relação por ID e revisões multimatéria preservam a principal', () => {
    const source = readFileSync(new URL('../script.js', import.meta.url), 'utf8');
    const start = source.indexOf('function normalizarItemRevisao(item = {})');
    const end = source.indexOf('function dataRevisaoComDias(', start);
    const scope = {
        appData: { cycleItems: [{ id: 1, subject: 'Física' }, { id: 2, subject: 'Química' }] },
        normalizarRevisaoTexto: value => String(value).toLowerCase(),
        normalizarImagemRevisao: value => value || null,
        dataLocalISO: () => '2026-10-02',
        REVISAO_MOTIVOS: { reforcar: 'Reforçar' }, Date
    };
    vm.runInNewContext(`${source.slice(start, end)}; this.normalize = normalizarItemRevisao;`, scope);
    assert.deepEqual(Array.from(scope.normalize({ materia: 'Física' }).materiaIds), ['1']);
    const modern = scope.normalize({ materia: 'Física', materiaIds: ['1', '2'], assunto: 'Termodinâmica' });
    assert.deepEqual(Array.from(modern.materiaIds), ['1', '2']);
    assert.equal(modern.materia, 'Física');
});

test('notas enviam imagens privadas fora do documento principal e preservam cópias', () => {
    const source = readFileSync(new URL('../script.js', import.meta.url), 'utf8');
    const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
    assert.match(html, /id="quickNoteImageInput"/);
    assert.match(source, /kingCloud\.saveReviewImage/);
    assert.match(source, /limparImagemNotaSemReferencias/);
    assert.match(source, /structuredClone\(item\), id: `nota-/);
});
