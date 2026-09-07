import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import test from 'node:test';
import assert from 'node:assert/strict';

// Exercise the public aggregation function without a DOM or browser runtime.
const context = vm.createContext({ window: {} });
vm.runInContext(readFileSync(new URL('../study-insights.js', import.meta.url), 'utf8'), context);
const aggregate = (data, period = 'week', today = new Date(2026, 8, 6, 12)) =>
    JSON.parse(JSON.stringify(context.window.KingMasterStudyInsights.aggregate(data, period, today)));
const session = (materia, tempoSegundos, dataISO = '2026-09-02') => ({ materia, tempoSegundos, dataISO });

test('the current week runs Monday through today, including Sunday and excluding future days', () => {
    const result = aggregate({ historyItems: [
        session('Anterior', 100, '2026-08-30'),
        session('Segunda', 120, '2026-08-31'),
        session('Quarta', 180, '2026-09-02'),
        session('Domingo', 240, '2026-09-06'),
        session('Futuro', 300, '2026-09-07')
    ] });
    assert.equal(result.totalSeconds, 540);
    assert.equal(result.sessionCount, 3);
    assert.deepEqual(result.groups.map(group => group.name), ['Domingo', 'Quarta', 'Segunda']);
    const monday = aggregate({ historyItems: [
        session('Hoje', 120, '2026-08-31'), session('Amanhã', 180, '2026-09-01')
    ] }, 'week', new Date(2026, 7, 31, 23));
    assert.equal(monday.totalSeconds, 120);
});

test('legacy dates keep zero-based months, and timestamp IDs provide a local-date fallback', () => {
    const result = aggregate({ historyItems: [
        { materia: 'Agosto', tempoSegundos: 600, dataChave: '2026-7-31' },
        { materia: 'Setembro', tempoSegundos: 1200, dataChave: '2026-8-1' },
        { materia: 'ID', tempoSegundos: 300, id: new Date(2026, 8, 6, 0, 5).getTime() },
        { materia: 'ISO prioritário', tempoSegundos: 180, dataISO: '2026-09-05', dataChave: '2025-0-1' }
    ] });
    assert.equal(result.totalSeconds, 2280);
    assert.equal(result.sessionCount, 4);
});

test('impossible calendar dates are excluded rather than rolling into a different day', () => {
    const result = aggregate({ historyItems: [
        session('Dia impossível', 500, '2026-02-30'),
        { materia: 'Mês inválido', tempoSegundos: 500, dataChave: '2025-13-28' },
        { materia: 'Dia legado impossível', tempoSegundos: 500, dataChave: '2026-1-30' },
        session('Válida', 180, '2026-02-28'),
        { materia: 'Recuperada', tempoSegundos: 60, dataISO: '2026-02-30', dataChave: '2026-1-27' }
    ] }, 'week', new Date(2026, 2, 1, 12));
    assert.equal(result.totalSeconds, 240);
    assert.equal(result.sessionCount, 2);
});

test('the historical filter includes older and undated completed sessions while week requires a valid date', () => {
    const data = { historyItems: [
        session('Atual', 600), session('Antiga', 1200, '2025-01-10'),
        { materia: 'Sem data importada', tempoSegundos: 300 }
    ] };
    assert.equal(aggregate(data).totalSeconds, 600);
    const history = aggregate(data, 'all');
    assert.equal(history.totalSeconds, 2100);
    assert.equal(history.sessionCount, 3);
});

test('subjects merge case-insensitively, use current registered names/colors, and retain historical colors when removed', () => {
    const result = aggregate({
        cycleItems: [{ subject: 'Matemática', color: '#ec4899' }, null, {}],
        historyItems: [
            { ...session(' matemática ', 3600), cor: '#000000' },
            { ...session('MATEMÁTICA', '1800'), cor: '#ffffff' },
            { ...session('História', 1200), cor: '#00aa88' }
        ]
    });
    assert.equal(result.subjectCount, 2);
    assert.deepEqual(result.groups[0], { name: 'Matemática', seconds: 5400, color: '#ec4899', sessions: 2 });
    assert.equal(result.groups[1].color, '#00aa88');
});

test('four subjects remain individually visible; five or more use top three plus an exact remainder', () => {
    const sessions = Array.from({ length: 8 }, (_, i) => session(`Matéria ${i}`, (i + 1) * 60));
    const four = aggregate({ historyItems: sessions.slice(0, 4) });
    assert.equal(four.groups.length, 4);
    assert.ok(four.groups.every(group => group.name !== 'Outras matérias'));
    const eight = aggregate({ historyItems: sessions });
    assert.equal(eight.groups.length, 4);
    assert.equal(eight.subjectCount, 8);
    assert.equal(eight.groups[3].name, 'Outras matérias');
    assert.equal(eight.groups[3].seconds, 900);
    assert.equal(eight.groups[3].sessions, 5);
    assert.equal(eight.groups[3].color, '');
    assert.equal(eight.groups[3].names, 'Matéria 4, Matéria 3, Matéria 2, Matéria 1, Matéria 0');
    assert.equal(eight.groups.reduce((sum, group) => sum + group.seconds, 0), eight.totalSeconds);
    assert.equal(eight.groups.reduce((sum, group) => sum + group.sessions, 0), eight.sessionCount);
});

test('invalid durations and structures cannot create fabricated study time', () => {
    const result = aggregate({ cycleItems: 'invalid', historyItems: [
        null, false, 'text', {},
        ...[0, -120, NaN, Infinity, -Infinity, Number.MAX_VALUE, '', 'abc', true, null, [100], {}].map(value => session('Inválida', value)),
        session('Válida', 10.5), session('Válida', '120')
    ] });
    assert.equal(result.totalSeconds, 130.5);
    assert.equal(result.sessionCount, 2);
    assert.equal(result.subjectCount, 1);
    assert.equal(aggregate({ historyItems: 'invalid' }).totalSeconds, 0);
});

test('empty data stays empty and unnamed sessions appear as Estudo livre', () => {
    assert.deepEqual(aggregate(undefined), { totalSeconds: 0, sessionCount: 0, subjectCount: 0, groups: [] });
    const result = aggregate({ historyItems: [session('', 60), session('  ', 120), session(null, 180)] });
    assert.equal(result.groups[0].name, 'Estudo livre');
    assert.equal(result.totalSeconds, 360);
    assert.equal(result.subjectCount, 1);
});

test('aggregation does not modify persisted study data', () => {
    const data = { cycleItems: [{ subject: 'Biologia', color: '#42b883' }], historyItems: [session('biologia', 1500)] };
    const before = structuredClone(data);
    aggregate(data);
    aggregate(data, 'all');
    assert.deepEqual(data, before);
});
