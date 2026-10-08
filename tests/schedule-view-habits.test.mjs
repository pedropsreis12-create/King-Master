import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

await import('../habit-core.js');
const habit = globalThis.KingHabitCore;
const schedule = await readFile(new URL('../schedule.js', import.meta.url), 'utf8');
const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');
const personal = await readFile(new URL('../personal-development.js', import.meta.url), 'utf8');

test('o hábito percorre cumprido, não cumprido e neutro', () => {
    assert.equal(habit.nextStatus(''), 'done');
    assert.equal(habit.nextStatus('done'), 'missed');
    assert.equal(habit.nextStatus('missed'), '');
    assert.equal(habit.nextStatus(habit.nextStatus(habit.nextStatus(''))), '');
});

test('dias escolhidos determinam quais dos sete quadrados podem ser marcados', () => {
    const item = { frequency: { mode: 'weekdays', weekdays: [1, 3, 5] }, checkins: {} };
    assert.equal(habit.due(item, '2026-10-05'), true);
    assert.equal(habit.due(item, '2026-10-06'), false);
    assert.equal(habit.due(item, '2026-10-07'), true);
    assert.match(personal, /Array\.from\(\{ length: 7 \}/);
    assert.match(personal, /cycleHabitDay/);
});

test('cronograma tem modo fixo, carga por matéria, pausa editável e duplicação explícita', () => {
    assert.match(html, /id="scheduleFixedViewButton"/);
    assert.match(html, /id="scheduleLoadViewButton"/);
    assert.match(html, /id="scheduleQuickPause"/);
    assert.match(schedule, /function renderLoadSubjects\(/);
    assert.match(schedule, /function duplicateSlot\(/);
    assert.match(schedule, /function duplicateBlock\(/);
    assert.match(schedule, /schedule-matrix-duplicate/);
});

test('abas retiradas deixam os registros intactos', () => {
    assert.doesNotMatch(html, /data-section="notas"/);
    assert.doesNotMatch(html, /class="widget evolution-deadline-board"/);
    assert.match(html, /id="quickNoteBooksList"/);
    assert.match(html, /id="studyDeadlineModal"/);
});
