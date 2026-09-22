import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { runInNewContext } from 'node:vm';

const source = await readFile(new URL('../schedule.js', import.meta.url), 'utf8');
const start = source.indexOf('    function reconcileStudiedBlocks()');
const end = source.indexOf('    function organizeCurrentWeek()', start);
assert.ok(start >= 0 && end > start);
const reconcileSource = source.slice(start, end);

function runPhysicsStudy(minutes, grammarAutoCompleted = false) {
    const block = (id, subjectId) => ({ id, subjectId, day: 2, duration: 50, status: 'pending', order: Number(id.slice(-1)) });
    const blocks = [block('fisica-1', 'fisica'), block('fisica-2', 'fisica'), block('gramatica-1', 'gramatica'), block('gramatica-2', 'gramatica')];
    if (grammarAutoCompleted) {
        blocks[2].status = 'completed';
        blocks[2].registered = true;
        blocks[2].result = { autoCompleted: true, actualMinutes: 45 };
    }
    const appData = {
        cycleItems: [{ id: 'fisica', subject: 'Física' }, { id: 'gramatica', subject: 'Gramática' }],
        historyItems: [{ subjectId: 'fisica', materia: 'Física', tempoSegundos: minutes * 60, date: '2026-09-22' }],
        studySchedule: { weeks: { '2026-09-21': { blocks } } }
    };
    let saves = 0;
    runInNewContext(`${reconcileSource}\nreconcileStudiedBlocks();`, {
        appData,
        Core: { iso: () => '2026-09-22' },
        dateForDay: () => '2026-09-22',
        subject: id => appData.cycleItems.find(item => item.id === id),
        dataHistoricoISO: item => item.date,
        settings: () => ({ blockMinutes: 50 }),
        saveAppData: () => { saves++; }
    });
    return { blocks, saves };
}

test('50 minutos de Física concluem somente um bloco de Física', () => {
    const { blocks } = runPhysicsStudy(50);
    assert.deepEqual(blocks.map(item => item.status), ['completed', 'pending', 'pending', 'pending']);
});

test('1h40 de Física concluem dois blocos de 50 minutos, sem marcar Gramática', () => {
    const { blocks } = runPhysicsStudy(100);
    assert.deepEqual(blocks.map(item => item.status), ['completed', 'completed', 'pending', 'pending']);
});

test('a reconciliação desfaz uma conclusão antiga indevida de outra matéria', () => {
    const { blocks, saves } = runPhysicsStudy(50, true);
    assert.equal(blocks[2].status, 'pending');
    assert.equal(blocks[2].registered, false);
    assert.ok(saves > 0);
});
