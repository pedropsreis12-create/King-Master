import test from 'node:test';
import assert from 'node:assert/strict';
import '../study-evolution-core.js';
const core = globalThis.KingStudyEvolutionCore;

test('domingo sem meta é folga e peso maior desloca a meta semanal', () => {
    const subjects = [{ id: 1, subject: 'Biologia', questoes: 20, acertos: 10 }, { id: 2, subject: 'Física', questoes: 20, acertos: 18 }, { id: 3, subject: 'Redação' }];
    const plan = { configured: true, minutesByWeekday: [0, 180, 180, 180, 180, 180, 240], rhythm: 'equilibrado', weights: { 1: 5, 2: 1 }, examDate: '2027-11-01' };
    assert.equal(core.goalForDay(plan, '2026-10-11', 240), 0);
    const result = core.weeklyAllocation(subjects, plan, [], '2026-10-06');
    assert.equal(result.stage, 'base');
    assert.ok(result.subjects.find(item => item.id === 1).minutes > result.subjects.find(item => item.id === 2).minutes);
    assert.equal(result.subjects.reduce((sum, item) => sum + item.minutes, 0), Math.round(result.subjectMinutes / 5) * 5);
});

test('fase muda perto da prova e reforço mantém carga total sem estudo anterior', () => {
    const subjects = [{ id: 1, subject: 'Química' }, { id: 2, subject: 'História' }];
    const plan = { configured: true, minutesByWeekday: [0, 200, 200, 200, 200, 200, 0], rhythm: 'equilibrado', examDate: '2026-11-01' };
    const result = core.weeklyAllocation(subjects, plan, [], '2026-10-06');
    assert.equal(result.stage, 'reta-final');
    assert.equal(core.reinforce(result, {}).note, '');
    const reinforced = core.reinforce(result, { 1: 1, 2: 1000 });
    assert.match(reinforced.note, /Química/);
    assert.equal(reinforced.subjects.reduce((sum, item) => sum + item.minutes, 0), result.subjects.reduce((sum, item) => sum + item.minutes, 0));
});

test('mapa de calor diferencia folga, extra e meta; histórico anual mantém meses vazios', () => {
    assert.equal(core.dayState(0, 0, '2026-10-04', '2026-10-01', '2026-10-06'), 'livre');
    assert.equal(core.dayState(60, 0, '2026-10-04', '2026-10-01', '2026-10-06'), 'extra');
    assert.equal(core.dayState(90, 180, '2026-10-06', '2026-10-01', '2026-10-06'), 'nivel-2');
    const annual = core.annual([{ dataISO: '2026-10-06', tempoSegundos: 3600, materia: 'Matemática', questoes: 10, acertos: 8 }], 2026);
    assert.equal(annual.months[9], 3600);
    assert.equal(annual.months[8], 0);
    assert.equal(annual.days, 1);
});
