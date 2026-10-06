import test from 'node:test';
import assert from 'node:assert/strict';
import '../autopilot-core.js';
const Core = globalThis.KingAutopilotCore;

const base = () => ({
    dailyGoalMinutes: 240,
    cycleItems: [{ id: 1, subject: 'Matemática', topicos: [
        { nome: 'Regra de três', nivelDominio: 2, prioridade: 'alta' },
        { nome: 'Porcentagem', nivelDominio: 0, prioridade: 'media' }
    ] }, { id: 2, subject: 'História', topicos: [{ nome: 'Brasil Colônia', nivelDominio: 1, prioridade: 'alta' }] }],
    historyItems: [], revisoesItems: [], cadernoErrosItems: [], flashcards: { decks: [], cards: [], states: {} },
    studySchedule: { weeks: {} }, autopilot: { subjectWeights: {}, todayBudget: null }
});

test('prioriza assuntos não dominados sem fingir que ausência de questões é 0% de acerto', () => {
    const ranked = Core.rankTopics(base());
    assert.equal(ranked.length, 3);
    assert.match(ranked[0].reason, /sem prática|Retomar/);
    assert.doesNotMatch(ranked[0].reason, /0%/);
});

test('após quatro dias sem sessão, o recomeço cabe em no máximo 45 minutos', () => {
    const data = base(); data.historyItems.push({ dataISO: '2026-10-01', materia: 'Matemática', assunto: 'Regra de três', tempoSegundos: 1200 });
    data.revisoesItems.push({ id: 1, status: 'pendente', dataAlvo: '2026-10-04' });
    const plan = Core.buildDailyPlan(data, '2026-10-05');
    assert.equal(plan.comeback, true);
    assert.ok(plan.usedMinutes <= 45);
    assert.equal(plan.tasks.at(-1).title, 'Regra de três');
});

test('orçamento reduzido vale apenas para o dia e não modifica a meta normal', () => {
    const data = base(); data.autopilot.todayBudget = { date: '2026-10-05', minutes: 30 };
    const today = Core.buildDailyPlan(data, '2026-10-05', { budgetMinutes: data.autopilot.todayBudget.minutes });
    const tomorrow = Core.buildDailyPlan(data, '2026-10-06');
    assert.ok(today.usedMinutes <= 30);
    assert.equal(tomorrow.budget, 240);
    assert.equal(data.dailyGoalMinutes, 240);
});

test('blocos do Cronograma existentes substituem sugestões soltas e preservam conclusão', () => {
    const data = base();
    data.studySchedule.weeks['2026-10-05'] = { blocks: [
        { id: 10, day: 1, subjectId: 1, topic: 'Regra de três', duration: 50, start: '14:00', status: 'completed', order: 0 },
        { id: 11, day: 1, subjectId: 2, topic: 'Brasil Colônia', duration: 50, start: '15:00', status: 'pending', order: 1 }
    ] };
    const plan = Core.buildDailyPlan(data, '2026-10-05');
    assert.equal(plan.source, 'cronograma');
    assert.deepEqual(plan.tasks.map(task => task.blockId), ['10', '11']);
    assert.equal(plan.tasks[0].done, true);
    assert.equal(plan.tasks[1].done, false);
});

test('revisões, erros e cartões vencidos são contados sem incluir registros concluídos', () => {
    const data = base();
    data.revisoesItems = [{ status: 'pendente', dataAlvo: '2026-10-05' }, { status: 'revisado', dataAlvo: '2026-10-01' }];
    data.cadernoErrosItems = [{ status: 'aprendendo', proximaRevisao: '2026-10-04' }, { status: 'dominado', proximaRevisao: '2026-10-01' }];
    data.flashcards = { decks: [{ id: 'deck' }], cards: [{ id: 'a', deckId: 'deck' }], states: {} };
    assert.deepEqual(Core.dueCounts(data, '2026-10-05', Date.now()), { reviews: 1, errors: 1, cards: 1, total: 3 });
});
