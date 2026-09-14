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

test('interface liga cronograma, configuração, arrastar e integração ao registro existente', () => {
    const html = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');
    const ui = fs.readFileSync(new URL('../schedule.js', import.meta.url), 'utf8');
    const app = fs.readFileSync(new URL('../script.js', import.meta.url), 'utf8');
    assert.match(html, /data-section="cronograma"/);
    assert.match(html, /id="scheduleSettingsModal"/);
    assert.match(html, /id="scheduleDayCloseModal"/);
    assert.match(html, /id="scheduleDayStrip"/);
    assert.match(html, /id="scheduleTimeline"/);
    assert.match(ui, /ondragstart="KingSchedule\.dragStart/);
    assert.match(ui, /abrirRegistroSessaoPendente\(\)/);
    assert.match(app, /KingSchedule\?\.completeFromSession/);
    assert.match(app, /studySchedule: \{ settings:/);
});
