import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const context = vm.createContext({ window: {}, globalThis: {}, Date, console });
vm.runInContext(fs.readFileSync(new URL('../schedule-core.js', import.meta.url), 'utf8'), context);
context.window.KingScheduleCore = context.globalThis.KingScheduleCore;
vm.runInContext(fs.readFileSync(new URL('../schedule-planner.js', import.meta.url), 'utf8'), context);
const { ScheduleConstraints, ScheduleGenerator, ScheduleValidator, AIScheduleAssistant, UserStudyPreferences } = context.window.KingSchedulePlanner;
const Core = context.globalThis.KingScheduleCore;

const rules = {
    startTime: '14:00', endTime: '18:30', studyDays: [1, 2, 3, 4, 5], blocksPerDay: 4,
    blockMinutes: 50, pauseMinutes: 15, registrationMinutes: 5,
    maxSubjectsPerDay: 2
};
const subjects = [
    { id: 'math', subject: 'Matemática', schedule: { weeklyBlocks: 10, priority: 3, consecutive: true } },
    { id: 'physics', subject: 'Física', schedule: { weeklyBlocks: 8, priority: 2, consecutive: true } },
    { id: 'essay', subject: 'Redação', schedule: { weeklyBlocks: 2, priority: 2, consecutive: true, preferredDay: 5 } }
];
const generate = (subjectList = subjects, overrides = {}, options = {}) =>
    ScheduleGenerator.generate(subjectList, { ...rules, ...overrides }, '2026-09-28', options);

test('quatro blocos de 50 minutos respeitam pausas, registro e fim do dia', () => {
    const result = generate();
    assert.equal(result.valid, true, result.errors.join(' / '));
    assert.equal(ScheduleConstraints.requiredMinutes(rules), 265);
    for (const day of rules.studyDays) {
        const blocks = result.blocks.filter(block => block.day === day);
        assert.equal(blocks.length, 4);
        assert.deepEqual(Array.from(blocks, block => `${block.start}–${block.end}`), [
            '14:00–14:50', '15:10–16:00', '16:20–17:10', '17:30–18:20'
        ]);
        assert.equal(blocks.at(-1).registrationEnd, '18:25');
    }
});

test('horário insuficiente adapta a carga sem bloco extra ou tempo ultrapassado', () => {
    const result = generate(subjects, { endTime: '18:00' });
    assert.equal(result.valid, true, result.errors.join(' / '));
    assert.equal(result.blocks.length, 15);
    assert.ok(result.blocks.every(block => block.end <= '18:00'));
    assert.match(result.warnings.join(' '), /cabem 3 blocos/i);
});

test('pares consecutivos preservam duas matérias por dia quando possível', () => {
    const two = subjects.slice(0, 2).map(item => ({ ...item, schedule: { ...item.schedule, weeklyBlocks: 2 } }));
    const result = generate(two, { studyDays: [1] });
    assert.equal(result.valid, true, result.errors.join(' / '));
    assert.equal(new Set(result.blocks.map(block => block.subjectId)).size, 2);
    assert.deepEqual(Array.from(result.blocks, block => block.subjectId), ['math', 'math', 'physics', 'physics']);
});

test('Redação com dois blocos fica junta no dia fixo', () => {
    const result = generate();
    assert.equal(result.valid, true, result.errors.join(' / '));
    const essay = result.blocks.filter(block => block.subjectId === 'essay');
    assert.equal(essay.length, 2);
    assert.ok(essay.every(block => block.day === 5));
    assert.equal(essay[1].order, essay[0].order + 1);
});

test('domingo e dias desligados não recebem blocos', () => {
    const two = subjects.slice(0, 2);
    const result = generate(two, { studyDays: [2, 7] });
    assert.equal(result.valid, true, result.errors.join(' / '));
    assert.deepEqual([...new Set(result.blocks.map(block => block.day))], [2, 7]);
});

test('a Agenda reduz o dia sem estender o limite', () => {
    const result = generate(subjects, { studyDays: [1] }, { busyByDay: { 1: [{ start: '15:00', end: '16:00' }] } });
    assert.equal(result.valid, true, result.errors.join(' / '));
    assert.equal(result.blocks.length, 3);
    assert.ok(result.blocks.every(block => block.end <= '18:30'));
    assert.match(result.warnings.join(' '), /Agenda/i);
});

test('mais matérias que blocos gera fila explícita sem remover matéria', () => {
    const many = Array.from({ length: 5 }, (_, index) => ({ id: `s${index}`, subject: `Matéria ${index}`, schedule: { weeklyBlocks: 1 } }));
    const result = generate(many, { studyDays: [1] });
    assert.equal(result.valid, true, result.errors.join(' / '));
    assert.equal(result.blocks.length, 4);
    assert.equal(result.unscheduled.reduce((sum, item) => sum + item.blocks, 0), 1);
    assert.match(result.warnings.join(' '), /matérias para 4 blocos/i);
});

test('texto contraditório é identificado mesmo se a resposta da IA ocultar o conflito', () => {
    const plans = UserStudyPreferences.normalize(subjects, rules).subjects;
    const result = AIScheduleAssistant.interpret({ requestedBlocksPerDay: 4 }, 'Quero 6 blocos de matemática hoje', rules, plans);
    assert.equal(result.errors.length, 0);
    assert.equal(result.targetBlocksPerDay, 6);
    assert.match(result.warnings.join(' '), /meta diária será 6 blocos/i);
    const time = AIScheduleAssistant.interpret({ requestedEndTime: '18:30' }, 'Essa semana só consigo estudar até 18h', rules, plans);
    assert.equal(time.errors.length, 0);
    assert.equal(time.targetEndTime, '18:00');
    assert.match(time.warnings.join(' '), /terminará até 18:00/i);
    const later = AIScheduleAssistant.interpret({ requestedEndTime: '19:00' }, '', rules, plans);
    assert.match(later.errors.join(' '), /nunca amplia o horário/i);
});

test('validador independente recusa bloco extra, duração trocada e matéria fora da seleção', () => {
    const result = generate();
    const extra = { ...result, blocks: [...result.blocks, { ...result.blocks[0], id: 'extra', order: 4 }] };
    assert.equal(ScheduleValidator.validate(extra, rules, subjects).valid, false);
    const shifted = { ...result, blocks: result.blocks.map((block, index) => index ? block : { ...block, start: '14:05' }) };
    assert.equal(ScheduleValidator.validate(shifted, rules, subjects).valid, false);
    const unknown = { ...result, blocks: result.blocks.map((block, index) => index ? block : { ...block, subjectId: 'unknown' }) };
    assert.equal(ScheduleValidator.validate(unknown, rules, subjects).valid, false);
});

test('mesmas regras e matérias produzem a mesma distribuição', () => {
    const shape = plan => plan.blocks.map(({ day, order, start, end, subjectId }) => ({ day, order, start, end, subjectId }));
    assert.deepEqual(shape(generate()), shape(generate()));
});

test('tempo desde o último estudo desempata matérias com mesma carga', () => {
    const equallyRanked = [
        { id: 'a', subject: 'Álgebra', schedule: { weeklyBlocks: 2, consecutive: true } },
        { id: 'b', subject: 'Biologia', schedule: { weeklyBlocks: 2, consecutive: true } }
    ];
    const monday = new Date('2026-09-28T12:00:00').getTime();
    const result = generate(equallyRanked, { studyDays: [1] }, { lastStudiedBySubject: { a: monday, b: monday - 14 * 86400000 } });
    assert.equal(result.valid, true, result.errors.join(' / '));
    assert.equal(result.blocks[0].subjectId, 'b');
});

test('limpeza geral remove blocos de todas as semanas sem apagar check-ins ou histórico externo', () => {
    const weeks = {
        '2026-09-21': { blocks: [{ id: 1 }], dailyClosures: { 1: { notes: 'Estudei' } }, strict: true },
        '2026-09-28': { blocks: [{ id: 2 }, { id: 3 }], dailyClosures: {}, strict: true }
    };
    const history = [{ id: 'sessao', tempoSegundos: 3000 }];
    assert.equal(Core.clearAllBlocks(weeks), 3);
    assert.equal(weeks['2026-09-21'].blocks.length, 0);
    assert.equal(weeks['2026-09-28'].blocks.length, 0);
    assert.equal(weeks['2026-09-21'].dailyClosures[1].notes, 'Estudei');
    assert.equal(history.length, 1);
    assert.equal(weeks['2026-09-21'].strict, false);
    const html = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');
    const ui = fs.readFileSync(new URL('../schedule.js', import.meta.url), 'utf8');
    assert.match(html, /Apagar todos os blocos/);
    assert.match(ui, /if \(!confirm\(`Apagar todos os/);
});
