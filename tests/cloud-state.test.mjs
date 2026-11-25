import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFile } from 'node:fs/promises';

const window = {};
vm.runInNewContext(await readFile(new URL('../cloud-state.js', import.meta.url), 'utf8'), { window });
const state = window.KingCloudState;

test('a new device always downloads an existing account before it can upload', () => {
    assert.equal(state.decideInitial({ remoteExists:true, remoteRevision:8, localModifiedAt:999999, identity:null, uid:'pedro' }), 'download');
    assert.equal(state.decideInitial({ remoteExists:true, remoteRevision:8, localModifiedAt:999999, identity:{uid:'other'}, uid:'pedro' }), 'download');
});
test('a brand-new account starts empty even if old anonymous data exists on this device', () => {
    assert.equal(state.decideInitial({ remoteExists:false, localModifiedAt:10, identity:null, uid:'pedro' }), 'reset');
    assert.equal(state.decideInitial({ remoteExists:false, localModifiedAt:10, identity:{uid:'pedro'}, uid:'pedro' }), 'upload');
});
test('switching accounts never copies the previous account into a new cloud document', () => {
    assert.equal(state.decideInitial({ remoteExists:false, localModifiedAt:99, identity:{uid:'conta-a'}, uid:'conta-b' }), 'reset');
});
test('a known device downloads newer cloud revisions and uploads only its own unsaved edit', () => {
    const identity = { uid:'pedro', cloudRevision:5, lastLocalRevision:100 };
    assert.equal(state.decideInitial({ remoteExists:true, remoteRevision:6, localModifiedAt:100, identity, uid:'pedro' }), 'download');
    assert.equal(state.decideInitial({ remoteExists:true, remoteRevision:6, localModifiedAt:150, identity, uid:'pedro' }), 'merge');
    assert.equal(state.decideInitial({ remoteExists:true, remoteRevision:5, localModifiedAt:150, identity, uid:'pedro' }), 'upload');
    assert.equal(state.decideInitial({ remoteExists:true, remoteRevision:5, localModifiedAt:100, identity, uid:'pedro' }), 'ready');
});
test('malformed identity storage cannot authorize a local overwrite', () => {
    const storage = { getItem: () => '{broken' };
    assert.equal(state.parseIdentity(storage), null);
});

const semana = new Date(2026, 10, 23).toDateString();
const baseData = () => ({ lastModifiedAt: 1000, lastWeekStart: semana, weeklyChart: [0, 0, 0, 0, 0, 0, 0], totalStudySeconds: 3600,
    historyItems: [{ id: 1, materia: 'Física', segundos: 3600 }],
    cycleItems: [{ id: 10, subject: 'Matemática', questoes: 20, acertos: 15, erros: 5, topicos: [{ id: 'a', nome: 'Funções' }] }],
    redacaoItems: [], resolvedStudySessionIds: ['s1'], profileName: 'Pedro' });

test('edições feitas em dois aparelhos ao mesmo tempo são somadas, não descartadas', () => {
    const base = baseData();
    const notebook = baseData();
    notebook.lastModifiedAt = 2000;
    notebook.historyItems.push({ id: 2, materia: 'Matemática', segundos: 1800 });
    notebook.cycleItems[0].questoes += 30; notebook.cycleItems[0].acertos += 20; notebook.cycleItems[0].erros += 10;
    notebook.totalStudySeconds += 1800; notebook.weeklyChart[1] += 1800;
    const celular = baseData();
    celular.lastModifiedAt = 2500;
    celular.redacaoItems.push({ id: 50, theme: 'Educação digital' });
    celular.cycleItems[0].questoes += 10; celular.cycleItems[0].acertos += 10;
    celular.totalStudySeconds += 600; celular.weeklyChart[1] += 600;
    celular.profileName = 'Pedro R.';
    const juntos = state.mergeData(base, notebook, celular, 3000);
    assert.deepEqual(juntos.historyItems.map(item => item.id).sort(), [1, 2]);
    assert.equal(juntos.redacaoItems.length, 1);
    assert.equal(juntos.cycleItems[0].questoes, 60);
    assert.equal(juntos.cycleItems[0].acertos, 45);
    assert.equal(juntos.cycleItems[0].erros, 15);
    assert.equal(juntos.totalStudySeconds, 3600 + 1800 + 600);
    assert.equal(juntos.weeklyChart[1], 2400);
    assert.equal(juntos.profileName, 'Pedro R.');
    assert.equal(juntos.lastModifiedAt, 3000);
});

test('itens apagados em um aparelho continuam apagados depois da junção', () => {
    const base = baseData();
    const notebook = baseData(); notebook.historyItems = []; notebook.resolvedStudySessionIds = [];
    const celular = baseData(); celular.redacaoItems = [{ id: 7, theme: 'Novo' }];
    const juntos = state.mergeData(base, notebook, celular, 3000);
    assert.equal(juntos.historyItems.length, 0);
    assert.equal(juntos.resolvedStudySessionIds.length, 0);
    assert.equal(juntos.redacaoItems.length, 1);
});

test('sem base conhecida, nada registrado em nenhum dos aparelhos se perde', () => {
    const notebook = baseData(); notebook.historyItems.push({ id: 2 });
    const celular = baseData(); celular.historyItems.push({ id: 3 }); celular.cycleItems[0].questoes = 25;
    const juntos = state.mergeData(null, notebook, celular, 3000);
    assert.deepEqual(Array.from(juntos.historyItems, item => item.id).sort(), [1, 2, 3]);
    assert.equal(juntos.cycleItems[0].questoes, 25);
});

test('o cronômetro rodando não é somado nem trocado pelo do outro aparelho', () => {
    const base = baseData(); base.timerState = { running: false, seconds: 0 };
    const notebook = baseData(); notebook.timerState = { running: true, seconds: 900 };
    const celular = baseData(); celular.timerState = { running: false, seconds: 30 };
    assert.deepEqual(state.mergeData(base, notebook, celular, 3000).timerState, { running: true, seconds: 900 });
});

test('na virada da semana vale o gráfico da semana mais nova', () => {
    const base = baseData(); base.weeklyChart = [100, 0, 0, 0, 0, 0, 0];
    const notebook = baseData(); notebook.weeklyChart = [100, 50, 0, 0, 0, 0, 0];
    const celular = baseData(); celular.lastWeekStart = new Date(2026, 10, 30).toDateString(); celular.weeklyChart = [40, 0, 0, 0, 0, 0, 0];
    const juntos = state.mergeData(base, notebook, celular, 3000);
    assert.equal(juntos.lastWeekStart, celular.lastWeekStart);
    assert.deepEqual(Array.from(juntos.weeklyChart), [40, 0, 0, 0, 0, 0, 0]);
});
