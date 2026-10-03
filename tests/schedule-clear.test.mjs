import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const context = vm.createContext({ globalThis: {}, Date, console });
vm.runInContext(fs.readFileSync(new URL('../schedule-core.js', import.meta.url), 'utf8'), context);
const Core = context.globalThis.KingScheduleCore;

test('limpar cronograma remove todos os blocos, inclusive incompletos', () => {
    const weeks = {
        '2026-09-28': {
            blocks: [
                { id: 'one', status: 'pending' },
                { id: 'two', status: 'running' },
                { id: 'three', status: 'completed' }
            ],
            archivedCompletedBlocks: [{ id: 'old', status: 'completed' }],
            dayPlans: { 1: { scheduledBlocks: 3 } },
            unscheduled: [{ subjectId: 'math' }], warnings: ['aviso'], strict: true
        },
        '2026-10-05': { blocks: [{ id: 'four', status: 'pending' }] }
    };
    assert.equal(Core.clearAllBlocks(weeks), 5);
    assert.equal(weeks['2026-09-28'].blocks.length, 0);
    assert.equal(weeks['2026-10-05'].blocks.length, 0);
    assert.equal(weeks['2026-09-28'].archivedCompletedBlocks.length, 0);
    assert.equal(Object.keys(weeks['2026-09-28'].dayPlans).length, 0);
    assert.equal(weeks['2026-09-28'].strict, false);
});

test('desvincular sessões pendentes preserva tempo e crédito ao limpar blocos', () => {
    const weeks = { '2026-09-28': { blocks: [{ id: 7, day: 3, status: 'pending' }] } };
    const pending = {
        id: 'session-1', seconds: 6000, subjectId: 'physics', scheduleWeekKey: '2026-09-28',
        scheduleBlockId: 7, scheduleCreditNeeded: true, note: 'física estudada'
    };
    assert.equal(Core.detachPendingSessions(weeks, [pending]), 1);
    assert.equal(pending.scheduleBlockId, '');
    assert.equal(pending.detachedScheduleDay, 3);
    assert.equal(pending.detachedFromSchedule, true);
    assert.equal(pending.seconds, 6000);
    assert.equal(pending.scheduleCreditNeeded, true);
    assert.equal(pending.subjectId, 'physics');
    assert.equal(pending.note, 'física estudada');
    assert.equal(Core.clearAllBlocks(weeks), 1);
    assert.equal(pending.seconds, 6000);
});

test('cópias do mesmo registro são desvinculadas e contadas uma vez', () => {
    const weeks = { '2026-09-28': { blocks: [{ id: 'a', day: 1 }] } };
    const original = { id: 'same', scheduleBlockId: 'a', scheduleWeekKey: '2026-09-28', seconds: 3000 };
    const copy = { ...original };
    assert.equal(Core.detachPendingSessions(weeks, [original, original, copy]), 1);
    assert.equal(original.scheduleBlockId, '');
    assert.equal(copy.scheduleBlockId, '');
    assert.equal(original.detachedScheduleDay, 1);
    assert.equal(copy.detachedScheduleDay, 1);
});

test('busca bloco em outra semana e também limpa vínculos antigos sem bloco', () => {
    const weeks = { '2026-10-05': { blocks: [{ id: 'b', day: 5 }] } };
    const found = { id: 'found', scheduleBlockId: 'b', scheduleWeekKey: '2026-09-28' };
    const stale = { id: 'stale', scheduleBlockId: 'removed', scheduleCreditNeeded: false };
    const unrelated = { id: 'other', seconds: 120 };
    assert.equal(Core.detachPendingSessions(weeks, [found, stale, unrelated]), 2);
    assert.equal(found.detachedScheduleDay, 5);
    assert.equal(found.scheduleWeekKey, '2026-10-05');
    assert.equal(stale.detachedScheduleDay, 0);
    assert.equal(stale.scheduleBlockId, '');
    assert.equal(unrelated.detachedFromSchedule, undefined);
});

test('todos os caminhos de substituição desvinculam sessões antes de remover blocos', () => {
    const source = fs.readFileSync(new URL('../schedule.js', import.meta.url), 'utf8');
    const section = (start, end) => source.split(`function ${start}(`)[1]?.split(`function ${end}(`)[0] || '';
    for (const [start, end] of [
        ['applyPlannerPreview', 'clearAllBlocks'], ['clearAllBlocks', 'changeWeek'],
        ['copyToNextWeek', 'replanOverdue'], ['deleteEditingBlock', 'setStatus'],
        ['removeSubject', 'clearSubjects']
    ]) assert.match(section(start, end), /detachLinksForRemovedBlocks\(/, start);
    assert.match(source.split('function clearSubjects(')[1]?.split('window.KingSchedule =')[0] || '', /detachLinksForRemovedBlocks\(/);
    const registration = fs.readFileSync(new URL('../script.js', import.meta.url), 'utf8');
    assert.match(registration, /scheduleCreditNeeded && !creditedBySchedule/);
});
