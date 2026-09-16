import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFile } from 'node:fs/promises';

const library = await readFile(new URL('../timer-recovery.js', import.meta.url), 'utf8');
const source = await readFile(new URL('../script.js', import.meta.url), 'utf8');
const timerCode = source.slice(source.indexOf('let timerInterval,'), source.indexOf('function atualizarSeletorDeMaterias()'));
const plain = value => JSON.parse(JSON.stringify(value));
function setup() {
    const elements = new Map();
    const storage = new Map();
    const events = {};
    let now = new Date(2026, 8, 7, 12).getTime();
    class Clock extends Date { constructor(...args) { super(...(args.length ? args : [now])); } static now() { return now; } }
    const get = id => {
        if (!elements.has(id)) elements.set(id, { value: id === 'inputMinutes' ? '25' : id === 'activeSubjectSelect' ? '' : '0', style: {}, dataset: {}, textContent: '', classList: { add() {}, remove() {}, toggle() {}, contains() { return false; } }, play: () => Promise.resolve(), pause() {} });
        return elements.get(id);
    };
    const ctx = vm.createContext({ Date: Clock, console, window: { addEventListener: (name, cb) => events[name] = cb },
        document: { getElementById: get, querySelectorAll: () => [], querySelector: () => get('trigger'), addEventListener: (name, cb) => events[name] = cb, hidden: false },
        localStorage: { setItem: (key, value) => storage.set(key, value), getItem: key => storage.get(key) || null },
        setInterval: () => 1, clearInterval() {}, showToast() {}, fecharModal() {}, renderizarCiclo() {}, renderizarHistorico() {}, mostrarFraseMotivacional() {}, atualizarSeletorDeMaterias() {},
        formatHistoryTime: value => String(value), dataLocalISO: () => '2026-09-07',
        timerPersistenceReady: true,
        appData: { lastModifiedAt: 10, lastWeekStart: 'Mon Sep 07 2026', totalStudySeconds: 100, weeklyChart: [100,0,0,0,0,0,0], cycleItems: [], historyItems: [] }
    });
    vm.runInContext(library, ctx);
    vm.runInContext(`function saveAppData() { appData.timerState = captureTimerState(); appData.lastModifiedAt = Date.now(); localStorage.setItem('qg_pedro_data', JSON.stringify(appData)); persistTimerCheckpoint(); }`, ctx);
    vm.runInContext(timerCode, ctx);
    return { ctx, get, events, storage, advance: ms => now += ms, run: code => vm.runInContext(code, ctx), lib: ctx.window.KingTimerRecovery };
}

test('crash checkpoint restores clock and earned totals atomically without offline XP', () => {
    const h = setup();
    h.run('toggleTimer()'); h.advance(7500); h.run('tickTimer()');
    const base = JSON.parse(h.storage.get('qg_pedro_data'));
    const checkpoint = JSON.parse(h.storage.get(h.lib.KEY));
    h.advance(86400000);
    const recovered = h.lib.recover(base, checkpoint);
    assert.equal(recovered.timerState.seconds, 7);
    assert.equal(recovered.timerState.running, true);
    assert.equal(recovered.totalStudySeconds, 107);
    assert.equal(recovered.weeklyChart[0], 107);
    assert.equal(h.lib.recover(recovered, checkpoint).totalStudySeconds, 107);
});
test('pause and resume count elapsed time once, ignoring paused time', () => {
    const h = setup(); h.run('toggleTimer()'); h.advance(2500); h.run('toggleTimer()');
    h.advance(100000); h.run('tickTimer()');
    assert.equal(h.run('currentSeconds'), 2);
    h.run('toggleTimer()'); h.advance(3100); h.run('toggleTimer()');
    assert.equal(h.run('currentSeconds'), 5);
    assert.equal(h.ctx.appData.totalStudySeconds, 105);
});
test('study timer keeps counting after the configured goal is reached', () => {
    const h = setup(); h.get('inputMinutes').value = '0'; h.get('inputSeconds').value = '2';
    h.run('toggleTimer()'); h.advance(3500); h.run('tickTimer()');
    assert.equal(h.run('currentSeconds'), 3);
    assert.equal(h.run('isRunning'), true);
    assert.equal(h.run('alarmTriggered'), true);
});
test('closing flushes the last whole seconds and preserves the running timer', () => {
    const h = setup(); h.run('toggleTimer()'); h.advance(8200); h.events.pagehide();
    assert.equal(h.run('isRunning'), true);
    assert.equal(JSON.parse(h.storage.get('qg_pedro_data')).timerState.seconds, 8);
    h.advance(10000); h.run('restoreTimerSession()');
    assert.equal(h.ctx.appData.totalStudySeconds, 118);
    assert.equal(h.run('currentSeconds'), 18);
});
test('cloud import disables close saving so remote data cannot be overwritten', () => {
    const h = setup(); h.run('toggleTimer()'); h.run('timerPersistenceReady = false');
    h.storage.set('qg_pedro_data', 'remote-snapshot'); h.events.pagehide();
    assert.equal(h.storage.get('qg_pedro_data'), 'remote-snapshot');
    assert.match(source, /timerPersistenceReady = false;\s*localStorage.removeItem\(window.KingTimerRecovery.KEY\);\s*window.location.reload/);
});
test('stale or malformed checkpoints cannot replace imported progress', () => {
    const h = setup(); h.run('toggleTimer()'); h.advance(4000); h.run('tickTimer()');
    const base = plain(h.ctx.appData), cp = JSON.parse(h.storage.get(h.lib.KEY));
    assert.equal(h.lib.recover(base, { ...cp, revision: -1 }), base);
    assert.equal(h.lib.recover(base, { ...cp, totalStudySeconds: -8 }), base);
    assert.equal(h.lib.recover(base, { ...cp, state: { ...cp.state, seconds: Infinity } }), base);
    assert.equal(h.lib.recover(base, null), base);
});
test('rest timer is restored with its preset and never awards study time', () => {
    const h = setup(); h.run("setMode('descanso'); setDescansoTime(10); toggleTimer()");
    h.advance(3200); h.events.pagehide();
    assert.equal(h.ctx.appData.timerState.seconds, 597);
    assert.equal(h.ctx.appData.timerState.restMinutes, 10);
    assert.equal(h.ctx.appData.totalStudySeconds, 100);
    h.run('restoreTimerSession()');
    assert.equal(h.run('currentMode'), 'descanso');
    assert.equal(h.run('currentSeconds'), 597);
    assert.equal(h.run('isRunning'), true);
});
test('ending a session protects the draft until the useful study record is saved', () => {
    const h = setup(); h.run('toggleTimer()'); h.advance(6500); h.run('encerrarSessaoDashboard()');
    let saved = JSON.parse(h.storage.get('qg_pedro_data'));
    assert.equal(saved.historyItems.length, 0);
    assert.equal(saved.pendingStudySession.seconds, 6);
    assert.equal(saved.pendingStudySessions.length, 1);
    assert.equal(saved.timerState.seconds, 6);
    assert.equal(saved.totalStudySeconds, 106);
    h.run('registrarSessao(6)');
    saved = JSON.parse(h.storage.get('qg_pedro_data'));
    assert.equal(saved.historyItems.length, 1);
    assert.equal(saved.historyItems[0].tempoSegundos, 6);
    assert.equal(saved.pendingStudySession, null);
    assert.equal(saved.timerState.seconds, 0);
    h.run('restoreTimerSession(); encerrarSessaoDashboard()');
    assert.equal(h.ctx.appData.historyItems.length, 1);
});
test('starting another timer never erases a deferred protected session', () => {
    const h = setup(); h.run('toggleTimer()'); h.advance(6500); h.run('encerrarSessaoDashboard(); adiarRegistroSessao()');
    h.run('toggleTimer()'); h.advance(2100); h.run('toggleTimer()');
    const saved = JSON.parse(h.storage.get('qg_pedro_data'));
    assert.equal(saved.pendingStudySessions.length, 1);
    assert.equal(saved.pendingStudySessions[0].seconds, 6);
    assert.equal(saved.timerState.seconds, 2);
});
test('a resolved session id cannot be registered or reminded twice', () => {
    const h = setup();
    h.ctx.appData.pendingStudySession = { id: 'session-once', seconds: 90, subjectId: '', createdAt: Date.now() };
    h.run(`registrarSessao(90, { pendingSession: { id: 'session-once', seconds: 90 }, assunto: 'Funções', comentario: 'Exercícios resolvidos', atividade: 'estudo' })`);
    assert.equal(h.ctx.appData.historyItems.length, 1);
    assert.deepEqual(plain(h.ctx.appData.resolvedStudySessionIds), ['session-once']);
    h.run(`registrarSessao(90, { pendingSession: { id: 'session-once', seconds: 90 }, assunto: 'Funções', comentario: 'Exercícios resolvidos', atividade: 'estudo' })`);
    assert.equal(h.ctx.appData.historyItems.length, 1);
    assert.equal(h.ctx.appData.pendingStudySession, null);
});
test('explicit timer reset remains reset after recovery', () => {
    const h = setup(); h.run('toggleTimer()'); h.advance(3500); h.run('tickTimer(); executarResetTimer(); restoreTimerSession()');
    assert.equal(h.run('currentSeconds'), 0);
    assert.equal(h.ctx.appData.totalStudySeconds, 103);
});
test('storage failure shows a visible warning instead of promising a save', () => {
    const h = setup(); h.ctx.localStorage.setItem = () => { throw new Error('quota'); };
    h.run('persistTimerCheckpoint()');
    assert.equal(h.get('timerSaveStatus').dataset.state, 'error');
});
test('next-level progress uses only the current interval and handles maximum rank', () => {
    const h = setup();
    assert.deepEqual(plain(h.lib.nextLevel(3330, 2500, 4500, false)), { earned: 830, needed: 2000, remaining: 1170, percent: 41.5 });
    assert.equal(h.lib.nextLevel(4500, 4500, 7000, false).percent, 0);
    assert.equal(h.lib.nextLevel(1000000, 1000000, 1000000, true).percent, 100);
});
test('background time crossing midnight is split across calendar days', () => {
    const h = setup();
    h.lib.creditStudy(h.ctx.appData, new Date(2026,8,7,23,59,58).getTime(), new Date(2026,8,8,0,0,3).getTime());
    assert.equal(h.ctx.appData.weeklyChart[0], 102);
    assert.equal(h.ctx.appData.weeklyChart[1], 3);
    assert.equal(h.ctx.appData.totalStudySeconds, 105);
});
test('week rollover keeps all-time totals and only the new week in the chart', () => {
    const h = setup();
    h.lib.creditStudy(h.ctx.appData, new Date(2026,8,13,23,59,58).getTime(), new Date(2026,8,14,0,0,3).getTime());
    assert.deepEqual(plain(h.ctx.appData.weeklyChart), [3,0,0,0,0,0,0]);
    assert.equal(h.ctx.appData.totalStudySeconds, 105);
});
