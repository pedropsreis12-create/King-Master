import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const source = fs.readFileSync(new URL('../schedule-core.js', import.meta.url), 'utf8');
const context = vm.createContext({ console, Date, globalThis: {} });
vm.runInContext(source, context);
const Core = context.globalThis.KingScheduleCore;

const subjects = [
    { id: 1, subject: 'Matemática', color: '#007aff', schedule: { weeklyBlocks: 4, priority: 3, consecutive: true } },
    { id: 2, subject: 'Biologia', color: '#34c759', schedule: { weeklyBlocks: 3, priority: 2, consecutive: false } },
    { id: 3, subject: 'Redação', color: '#af52de', schedule: { weeklyBlocks: 2, priority: 1, consecutive: true } }
];
const settings = { startTime: '14:00', studyDays: [1, 2, 3, 4, 5, 6], blockMinutes: 50, pauseMinutes: 15, closingMinutes: 5, maxSubjectsPerDay: 2 };

test('cronograma usa somente as matérias recebidas e respeita a carga semanal', () => {
    const week = Core.organize(subjects, settings, '2026-09-14');
    assert.equal(week.blocks.length, 9);
    assert.deepEqual([...new Set(week.blocks.map(block => block.subjectId))].sort(), [1, 2, 3]);
    assert.equal(week.blocks.filter(block => block.subjectId === 1).length, 4);
    assert.equal(week.blocks.filter(block => block.subjectId === 2).length, 3);
    assert.equal(week.blocks.filter(block => block.subjectId === 3).length, 2);
    assert.ok(week.blocks.every(block => settings.studyDays.includes(block.day)));
});

test('organização é determinística e mantém os pares consecutivos juntos', () => {
    const shape = result => result.blocks.map(({ subjectId, day, order, start, duration, group }) => ({ subjectId, day, order, start, duration, group: Boolean(group) }));
    const first = Core.organize(subjects, settings, '2026-09-14');
    const second = Core.organize(subjects, settings, '2026-09-14');
    assert.deepEqual(shape(first), shape(second));
    for (const subjectId of [1, 3]) {
        const grouped = first.blocks.filter(block => block.subjectId === subjectId && block.group);
        for (const group of new Set(grouped.map(block => block.group))) {
            const pair = grouped.filter(block => block.group === group).sort((a, b) => a.order - b.order);
            assert.equal(pair.length, 2);
            assert.equal(pair[0].day, pair[1].day);
            assert.equal(pair[1].order, pair[0].order + 1);
        }
    }
});

test('horários incluem pausa após uma sequência e a cópia limpa o progresso', () => {
    const blocks = [
        { id: 1, subjectId: 1, day: 1, order: 0, duration: 50 },
        { id: 2, subjectId: 1, day: 1, order: 1, duration: 50 },
        { id: 3, subjectId: 2, day: 1, order: 2, duration: 50, status: 'completed', registered: true }
    ];
    Core.arrangeTimes(blocks, settings, 1);
    assert.deepEqual(blocks.map(block => block.start), ['14:00', '14:50', '15:55']);
    const copied = Core.copyWeek({ blocks, dailyClosures: { 1: { savedAt: 1 } }, warnings: [] }, '2026-09-21');
    assert.ok(copied.blocks.every(block => block.status === 'pending' && block.registered === false && block.result === null));
    assert.equal(Object.keys(copied.dailyClosures).length, 0);
});

test('um horário escolhido manualmente permanece fixo sem quebrar a sequência', () => {
    const blocks = [
        { id: 1, subjectId: 1, day: 2, order: 0, duration: 40 },
        { id: 2, subjectId: 2, day: 2, order: 1, duration: 50, start: '17:30', fixedStart: true },
        { id: 3, subjectId: 2, day: 2, order: 2, duration: 25 }
    ];
    Core.arrangeTimes(blocks, { ...settings, startTime: '14:00', pauseMinutes: 10 }, 2);
    assert.deepEqual(blocks.map(block => block.start), ['14:00', '17:30', '18:20']);
});

test('arrastar para uma célula vazia preserva o horário escolhido e os outros blocos', () => {
    const blocks = [
        { id: 'geo', subjectId: 2, day: 4, order: 2, start: '16:35', duration: 50, status: 'pending' },
        { id: 'mat', subjectId: 1, day: 4, order: 0, start: '14:00', duration: 50, status: 'completed' },
        { id: 'hist', subjectId: 3, day: 3, order: 0, start: '15:45', duration: 50, status: 'pending' }
    ];
    assert.equal(Core.moveBlockToSlot(blocks, 'geo', 3, '17:05').ok, true);
    assert.deepEqual({ day: blocks[0].day, start: blocks[0].start, fixedStart: blocks[0].fixedStart }, { day: 3, start: '17:05', fixedStart: true });
    assert.equal(blocks[1].start, '14:00');
    assert.equal(blocks[2].start, '15:45');
    assert.equal(blocks[0].order, 1);
    assert.equal(blocks[2].order, 0);
    assert.equal(Core.moveBlockToSlot(blocks, 'geo', 4, '14:25').reason, 'protected');
    assert.deepEqual({ day: blocks[0].day, start: blocks[0].start }, { day: 3, start: '17:05' });
});

test('a mesma linha horizontal aceita blocos em dias diferentes', () => {
    const blocks = [
        { id: 'fis', day: 2, start: '14:00', duration: 50, order: 0, status: 'pending' },
        { id: 'geo', day: 4, start: '16:00', duration: 50, order: 0, status: 'pending' }
    ];
    const moved = Core.moveBlockToSlot(blocks, 'geo', 3, '14:00', 5);
    assert.equal(moved.ok, true);
    assert.equal(moved.shifted, 0);
    assert.equal(blocks[0].start, blocks[1].start);
    assert.notEqual(blocks[0].day, blocks[1].day);
});

test('uma célula aparentemente vazia encaixa o bloco e ajusta os próximos pendentes', () => {
    const blocks = [
        { id: 'geo', day: 3, start: '16:00', duration: 50, order: 0, status: 'pending' },
        { id: 'mat', day: 4, start: '14:00', duration: 50, order: 0, status: 'completed', registered: true },
        { id: 'red', day: 4, start: '14:55', duration: 50, order: 1, status: 'pending' },
        { id: 'qui', day: 4, start: '15:50', duration: 50, order: 2, status: 'pending' }
    ];
    const moved = Core.moveBlockToSlot(blocks, 'geo', 4, '15:00', 5);
    assert.equal(moved.ok, true);
    assert.equal(moved.shifted, 2);
    assert.deepEqual(blocks.map(block => block.start), ['15:00', '14:00', '15:55', '16:50']);
    assert.deepEqual(blocks.map(block => block.order), [1, 0, 2, 3]);
});

test('organizador usa múltiplos horários livres e não ultrapassa suas janelas', () => {
    const plan = { ...settings, studyDays: [1, 2], closingMinutes: 0, availability: {
        1: [{ start: '09:00', end: '10:00' }, { start: '15:00', end: '19:00' }],
        2: [{ start: '14:00', end: '19:00' }]
    } };
    const result = Core.organize(subjects, plan, '2026-09-14');
    assert.equal(result.blocks.length, 9);
    for (const block of result.blocks) {
        const start = Core.toMinutes(block.start);
        assert.ok(plan.availability[block.day].some(range => start >= Core.toMinutes(range.start) && start + block.duration <= Core.toMinutes(range.end)));
    }
    for (const day of plan.studyDays) {
        const blocks = result.blocks.filter(block => block.day === day).sort((a, b) => Core.toMinutes(a.start) - Core.toMinutes(b.start));
        for (let index = 1; index < blocks.length; index++) assert.ok(Core.toMinutes(blocks[index].start) >= Core.toMinutes(blocks[index - 1].start) + blocks[index - 1].duration);
    }
});

test('compromissos da agenda e blocos concluídos ocupam horários sem serem apagados', () => {
    const plan = { ...settings, studyDays: [1], closingMinutes: 0, availability: { 1: [{ start: '14:00', end: '18:00' }] } };
    const done = { id: 99, subjectId: 1, day: 1, start: '14:00', duration: 50, status: 'completed' };
    const result = Core.organize(subjects, plan, '2026-09-14', { reservedBlocks: [done], busyByDay: { 1: [{ start: '15:00', end: '16:00' }] } });
    assert.equal(result.blocks.filter(block => block.subjectId === 1).length + 1 + result.unscheduled.filter(item => item.subjectId === 1).reduce((sum, item) => sum + item.blocks, 0), 4);
    assert.ok(result.blocks.every(block => Core.toMinutes(block.start) >= 16 * 60 && Core.toMinutes(block.start) + block.duration <= 18 * 60));
    assert.ok(result.unscheduled.length > 0);
    assert.equal(Core.availableMinutes(plan, { 1: [{ start: '15:00', end: '16:00' }] }), 180);
});

test('carga inviável fica explicitamente não agendada', () => {
    const plan = { ...settings, studyDays: [1], availability: { 1: [{ start: '14:00', end: '15:00' }] } };
    const result = Core.organize(subjects, plan, '2026-09-14');
    assert.ok(result.blocks.every(block => Core.toMinutes(block.start) + block.duration <= 14 * 60 + 55));
    assert.equal(result.blocks.length + result.unscheduled.reduce((sum, item) => sum + item.blocks, 0), 9);
});

test('reorganização no meio da semana não ocupa horários já passados', () => {
    const plan = { ...settings, studyDays: [1, 2], availability: {
        1: [{ start: '14:00', end: '18:00' }], 2: [{ start: '14:00', end: '18:00' }]
    } };
    const result = Core.organize(subjects, plan, '2026-09-14', { earliestByDay: { 1: '23:59', 2: '16:00' } });
    assert.ok(result.blocks.every(block => block.day === 2 && Core.toMinutes(block.start) >= 16 * 60));
    assert.equal(result.blocks.length + result.unscheduled.reduce((sum, item) => sum + item.blocks, 0), 9);
});

test('interface liga cronograma, configuração, arrastar e integração ao registro existente', () => {
    const html = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');
    const ui = fs.readFileSync(new URL('../schedule.js', import.meta.url), 'utf8');
    const app = fs.readFileSync(new URL('../script.js', import.meta.url), 'utf8');
    assert.match(html, /data-section="cronograma"/);
    assert.match(html, /id="scheduleSettingsModal"/);
    assert.match(html, /id="scheduleDayCloseModal"/);
    assert.match(html, /id="scheduleDayStrip"/);
    assert.match(html, /id="scheduleTimeline"/);
    assert.match(html, /id="scheduleWeekMatrix"/);
    assert.match(ui, /function renderWeekMatrix/);
    assert.match(html, /Os blocos abaixo usam somente as matérias que você cadastrou/);
    assert.match(ui, /ondragstart="KingSchedule\.dragStart/);
    assert.match(ui, /abrirRegistroSessaoPendente\(\)/);
    assert.match(app, /KingSchedule\?\.completeFromSession/);
    assert.match(app, /studySchedule: \{ settings:/);
});
