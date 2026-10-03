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

test('modo adaptativo considera quatro blocos uma meta e não ultrapassa o horário', () => {
    const result = generate(subjects, { endTime: '18:00' });
    assert.equal(result.valid, true, result.errors.join(' / '));
    assert.equal(result.dayPlans[1].targetBlocks, 4);
    assert.equal(result.dayPlans[1].scheduledBlocks, 3);
    assert.equal(result.dayPlans[1].targetStudyMinutes, 200);
    assert.equal(result.dayPlans[1].scheduledStudyMinutes, 150);
    assert.equal(result.dayPlans[1].status, 'adapted');
    assert.ok(result.blocks.every(block => block.registrationEnd <= '18:00'));
});

test('modo rígido avisa quando a meta exata não cabe', () => {
    const result = generate(subjects, { mode: 'rigid', endTime: '18:00' });
    assert.equal(result.valid, false);
    assert.equal(result.blocks.length, 0);
    assert.match(result.errors.join(' '), /modo rígido exige/i);
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

test('compromisso da Agenda reduz a carga sem criar sobreposição', () => {
    const result = generate(subjects, { studyDays: [1] }, { busyByDay: { 1: [{ start: '15:00', end: '16:00' }] } });
    assert.equal(result.valid, true, result.errors.join(' / '));
    assert.ok(result.dayPlans[1].scheduledBlocks < 4);
    assert.ok(result.blocks.every(block => block.registrationEnd <= '15:00' || block.start >= '16:00'));
});

test('bloco já concluído fora das novas janelas fica preservado sem bloquear a prévia', () => {
    const completed = { id: 'old-physics', day: 2, order: 4, subjectId: 'physics', start: '18:25', end: '19:15',
        duration: 50, status: 'completed', registered: true, result: { topic: 'Cinemática', actualMinutes: 50 } };
    const result = generate(subjects.slice(0, 2), { studyDays: [2], endTime: '18:00' }, { reservedBlocks: [completed] });
    assert.equal(result.valid, true, result.errors.join(' / '));
    assert.equal(result.blocks.length, 3);
    assert.equal(result.archivedCompletedBlocks.length, 1);
    assert.equal(result.archivedCompletedBlocks[0].result.topic, 'Cinemática');
    assert.ok(result.blocks.every(block => block.registrationEnd <= '18:00'));
    assert.equal(ScheduleValidator.validate(result, { ...rules, studyDays: [2], endTime: '18:00' }, subjects.slice(0, 2),
        { reservedBlocks: [completed] }).valid, true);
});

test('mais matérias que o limite diário prioriza duas sem ultrapassar a cota semanal', () => {
    const many = Array.from({ length: 5 }, (_, index) => ({ id: `s${index}`, subject: `Matéria ${index}`, schedule: { weeklyBlocks: 1 } }));
    const result = generate(many, { studyDays: [1] });
    assert.equal(result.valid, true, result.errors.join(' / '));
    assert.equal(result.blocks.length, 2);
    assert.equal(new Set(result.blocks.map(block => block.subjectId)).size, 2);
    assert.ok(result.warnings.some(warning => /ficou sem bloco/.test(warning)));
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

test('sábado curto recebe três blocos, enquanto segunda e terça continuam em quatro sem compensação', () => {
    const result = generate(subjects, {
        studyDays: [1, 2, 6], endTime: '18:00', pauseMinutes: 5,
        availability: {
            1: [{ start: '14:00', end: '18:00' }],
            2: [{ start: '14:00', end: '18:00' }],
            6: [{ start: '14:00', end: '17:00' }]
        }
    });
    assert.equal(result.valid, true, result.errors.join(' / '));
    assert.deepEqual([result.dayPlans[1].scheduledBlocks, result.dayPlans[2].scheduledBlocks, result.dayPlans[6].scheduledBlocks], [4, 4, 3]);
    assert.equal(result.dayPlans[6].availableMinutes, 180);
    assert.equal(result.dayPlans[6].scheduledStudyMinutes, 150);
    assert.equal(result.dayPlans[6].status, 'adapted');
    assert.ok(result.blocks.filter(block => block.day === 6).every(block => block.registrationEnd <= '17:00'));
});

test('várias janelas no mesmo dia são usadas sem restringir ao horário padrão', () => {
    const result = generate(subjects.slice(0, 2), {
        studyDays: [1], startTime: '14:00', endTime: '18:00', pauseMinutes: 10,
        availability: { 1: [
            { start: '08:00', end: '10:00' },
            { start: '15:00', end: '17:00' },
            { start: '20:00', end: '21:00' }
        ] }
    });
    assert.equal(result.valid, true, result.errors.join(' / '));
    assert.equal(result.dayPlans[1].availableMinutes, 300);
    assert.deepEqual(Array.from(result.blocks, block => block.start), ['08:00', '09:05', '15:00', '16:05']);
    assert.ok(result.blocks.every(block => [
        ['08:00', '10:00'], ['15:00', '17:00'], ['20:00', '21:00']
    ].some(([start, end]) => block.start >= start && block.registrationEnd <= end)));
});

test('pausa flexível encolhe somente até o mínimo configurado para caber', () => {
    const result = generate(subjects.slice(0, 2), {
        studyDays: [1], startTime: '14:00', endTime: '15:45', targetBlocksPerDay: 2,
        blockMinutes: 50, registrationMinutes: 0, pauseMinutes: 10,
        pauseMode: 'flexible', minPauseMinutes: 5
    });
    assert.equal(result.valid, true, result.errors.join(' / '));
    assert.equal(result.blocks.length, 2);
    assert.equal(result.blocks[1].pauseBefore, 5);
    const rigidPause = generate(subjects.slice(0, 2), {
        studyDays: [1], startTime: '14:00', endTime: '15:45', targetBlocksPerDay: 2,
        blockMinutes: 50, registrationMinutes: 0, pauseMinutes: 10,
        pauseMode: 'fixed'
    });
    assert.equal(rigidPause.dayPlans[1].scheduledBlocks, 1);
});

test('duração flexível usa um bloco final menor sem cair abaixo do mínimo', () => {
    const result = generate(subjects.slice(0, 2), {
        studyDays: [1], startTime: '14:00', endTime: '15:45', targetBlocksPerDay: 2,
        blockMinutes: 50, durationMode: 'flexible', minBlockMinutes: 35, maxBlockMinutes: 50,
        pauseMinutes: 5, registrationMinutes: 5
    });
    assert.equal(result.valid, true, result.errors.join(' / '));
    assert.deepEqual(Array.from(result.blocks, block => block.duration), [50, 40]);
    assert.equal(result.dayPlans[1].scheduledStudyMinutes, 90);
    assert.equal(result.blocks.at(-1).registrationEnd, '15:45');
});

test('até duas matérias por dia é limite obrigatório inclusive num dia de três blocos', () => {
    const third = { id: 'history', subject: 'História', schedule: { weeklyBlocks: 2, priority: 3 } };
    const result = generate([...subjects.slice(0, 2), third], {
        studyDays: [6], startTime: '14:00', endTime: '17:00', pauseMinutes: 5
    });
    assert.equal(result.valid, true, result.errors.join(' / '));
    assert.equal(result.blocks.length, 3);
    assert.ok(new Set(result.blocks.map(block => block.subjectId)).size <= 2);
    const changed = { ...result, blocks: result.blocks.map((block, index) => index === 2 ? { ...block, subjectId: 'history' } : block) };
    if (new Set(changed.blocks.map(block => block.subjectId)).size === 3)
        assert.equal(ScheduleValidator.validate(changed, { ...rules, studyDays: [6], startTime: '14:00', endTime: '17:00', pauseMinutes: 5 }, [...subjects.slice(0, 2), third]).valid, false);
});

test('validador aceita meta parcialmente atingida, mas rejeita pausa curta, duração curta e janela ocupada', () => {
    const constraints = { ...rules, studyDays: [6], endTime: '17:00', pauseMinutes: 5,
        availability: { 6: [{ start: '14:00', end: '17:00' }] } };
    const result = generate(subjects.slice(0, 2), constraints);
    assert.equal(result.valid, true, result.errors.join(' / '));
    assert.equal(ScheduleValidator.validate(result, constraints, subjects.slice(0, 2)).valid, true);
    const short = { ...result, blocks: result.blocks.map((block, index) => index === 0 ? { ...block, duration: 20, end: '14:20' } : block) };
    assert.equal(ScheduleValidator.validate(short, constraints, subjects.slice(0, 2)).valid, false);
    const noPause = { ...result, blocks: result.blocks.map((block, index) => index === 1 ? { ...block, start: '14:51', end: '15:41', registrationEnd: '15:46' } : block) };
    assert.equal(ScheduleValidator.validate(noPause, constraints, subjects.slice(0, 2)).valid, false);
    const busy = { 6: [{ start: result.blocks[0].start, end: result.blocks[0].end }] };
    assert.equal(ScheduleValidator.validate(result, constraints, subjects.slice(0, 2), { busyByDay: busy }).valid, false);
});

test('IA reduz apenas dias pedidos, sem alterar preferências salvas nem inventar horário', () => {
    const preferences = UserStudyPreferences.normalize(subjects, rules).subjects;
    const raw = { dayOverrides: [{ day: 6, maxStudyMinutes: 120 }, { day: 3, reduceLoad: true }], prioritySubjects: ['Física'] };
    const intent = AIScheduleAssistant.interpret(raw, 'Sábado só consigo estudar 2 horas; quarta tenho menos tempo; mais Física',
        { ...rules, studyDays: [1, 3, 6] }, preferences);
    assert.deepEqual(Array.from(intent.priorityIds), ['physics']);
    assert.equal(intent.maxAvailableMinutesByDay[6], 120);
    assert.equal(intent.reducedLoadByDay[3], 3);
    const result = generate(subjects, { studyDays: [1, 3, 6], pauseMinutes: 5 }, { intent });
    assert.equal(result.valid, true, result.errors.join(' / '));
    assert.equal(result.dayPlans[1].scheduledBlocks, 4);
    assert.equal(result.dayPlans[3].scheduledBlocks, 3);
    assert.equal(result.dayPlans[6].scheduledBlocks, 2);
    assert.equal(rules.blocksPerDay, 4);
});

test('comandos simples de vários dias e de hoje funcionam mesmo sem resposta estruturada da IA', () => {
    const preferences = UserStudyPreferences.normalize(subjects, rules).subjects;
    const days = AIScheduleAssistant.interpret({}, 'Sábado só consigo estudar 2 horas; quarta tenho menos tempo',
        { ...rules, studyDays: [1, 3, 6] }, preferences);
    assert.equal(days.maxAvailableMinutesByDay[6], 120);
    assert.equal(days.reducedLoadByDay[3], 3);
    assert.equal(days.maxAvailableMinutesByDay[3], undefined);
    const today = AIScheduleAssistant.interpret({}, 'Hoje estou cansado, reduza a carga',
        { ...rules, currentDay: 2 }, preferences);
    assert.equal(today.reducedLoadByDay[2], 3);
    assert.equal(today.errors.length, 0);
});

test('redução pontual de blocos e término via IA não altera a regra salva', () => {
    const preferences = UserStudyPreferences.normalize(subjects, rules).subjects;
    const settings = { ...rules, studyDays: [1, 6],
        availability: { 1: [{ start: '14:00', end: '18:30' }], 6: [{ start: '14:00', end: '18:30' }] } };
    const intent = AIScheduleAssistant.interpret({ requestedEndTime: '17:00', requestedBlocksPerDay: 2 },
        'Sábado termino às 17h e só 2 blocos', settings, preferences);
    assert.equal(intent.errors.length, 0, intent.errors.join(' / '));
    assert.equal(intent.dayOverrides.find(item => item.day === 6).endTime, '17:00');
    assert.equal(intent.dayOverrides.find(item => item.day === 6).targetBlocks, 2);
    const result = generate(subjects, settings, { intent });
    assert.equal(result.valid, true, result.errors.join(' / '));
    assert.equal(result.dayPlans[1].scheduledBlocks, 4);
    assert.equal(result.dayPlans[6].targetBlocks, 4);
    assert.equal(result.dayPlans[6].scheduledBlocks, 2);
    assert.ok(result.blocks.filter(block => block.day === 6).every(block => block.registrationEnd <= '17:00'));
    assert.equal(settings.blocksPerDay, 4);
});

test('redução pontual é interpretada também sem dados estruturados; aumento fora do limite é conflito', () => {
    const preferences = UserStudyPreferences.normalize(subjects, rules).subjects;
    const settings = { ...rules, studyDays: [6], availability: { 6: [{ start: '14:00', end: '18:00' }] } };
    const reduced = AIScheduleAssistant.interpret({}, 'Sábado só 2 blocos. Termino às 17h', settings, preferences);
    assert.equal(reduced.errors.length, 0, reduced.errors.join(' / '));
    assert.equal(reduced.reducedLoadByDay[6], 2);
    assert.equal(reduced.temporaryAvailability[6][0].end, '17:00');
    const excessiveTime = AIScheduleAssistant.interpret({ requestedEndTime: '19:00' }, 'Sábado termino às 19h', settings, preferences);
    assert.match(excessiveTime.errors.join(' '), /depois da disponibilidade/);
    const excessiveBlocks = AIScheduleAssistant.interpret({ requestedBlocksPerDay: 5 }, 'Sábado só 5 blocos', settings, preferences);
    assert.match(excessiveBlocks.errors.join(' '), /5 blocos/);
});

test('dia desligado recebe status próprio, não blocos ou compensação', () => {
    const result = generate(subjects.slice(0, 2), { studyDays: [2, 6], endTime: '17:00', pauseMinutes: 5 });
    assert.equal(result.valid, true, result.errors.join(' / '));
    assert.equal(result.dayPlans[1].status, 'off');
    assert.equal(result.dayPlans[1].scheduledBlocks, 0);
    assert.equal(result.dayPlans[2].scheduledBlocks, 3);
    assert.equal(result.dayPlans[6].scheduledBlocks, 3);
});

test('modo livre só cria blocos extras quando habilitado explicitamente', () => {
    const normal = generate(subjects.slice(0, 2), { mode: 'free', studyDays: [1], startTime: '08:00', endTime: '16:00', targetBlocksPerDay: 2 });
    const extra = generate(subjects.slice(0, 2), { mode: 'free', allowExtraBlocks: true, studyDays: [1], startTime: '08:00', endTime: '16:00', targetBlocksPerDay: 2 });
    assert.equal(normal.valid, true, normal.errors.join(' / '));
    assert.equal(extra.valid, true, extra.errors.join(' / '));
    assert.equal(normal.blocks.length, 2);
    assert.ok(extra.blocks.length > 2);
    assert.ok(extra.blocks.length <= 8);
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
