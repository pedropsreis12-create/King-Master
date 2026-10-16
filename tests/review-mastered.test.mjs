import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import '../review-trail-core.js';

const script = readFileSync(new URL('../script.js', import.meta.url), 'utf8');
const masterAction = script.match(/function marcarRevisaoDominada\(id\) \{[\s\S]*?(?=\nfunction adiarRevisao\()/)?.[0];
const reopenAction = script.match(/function revisarNovamenteRevisao\(id\) \{[\s\S]*?(?=\nfunction abrirReagendamentoRevisao\()/)?.[0];

function actions(items, topic = null) {
    assert.ok(masterAction && reopenAction);
    const appData = { revisoesItems: items };
    let saves = 0;
    const context = {
        appData,
        Date,
        Number,
        String,
        window: { KingReviewTrailCore: globalThis.KingReviewTrailCore },
        document: { getElementById: () => null },
        dataLocalISO: () => '2026-10-16',
        dataRevisaoComDias: () => '2026-10-17',
        encontrarAssuntoDaTrilha: () => topic ? { subject: { id: 'math', subject: 'Matemática' }, topic } : null,
        sincronizarEspelhoTrilha: (_, target) => {
            const step = globalThis.KingReviewTrailCore.active(target);
            const mirror = items.find(item => item.origem === 'trilha' && item.trilhaEtapa === step?.numero);
            if (mirror) { mirror.status = 'pendente'; mirror.dataAlvo = step.dataPrevista; }
            return mirror;
        },
        saveAppData: () => { saves += 1; },
        renderizarRevisoes: () => {},
        showToast: () => {}
    };
    runInNewContext(`${masterAction}\n${reopenAction}\nthis.actions = { marcarRevisaoDominada, revisarNovamenteRevisao };`, context);
    return { ...context.actions, get saves() { return saves; } };
}

test('revisão manual dominada sai da fila e pode ser reaberta', () => {
    const item = { id: 1, origem: 'manual', status: 'pendente', dataAlvo: '2026-10-16', historicoRevisoes: [] };
    const action = actions([item]);
    action.marcarRevisaoDominada(1);
    assert.equal(item.status, 'revisado');
    assert.equal(item.dataAlvo, '');
    assert.ok(item.dominadoEm);
    assert.equal(item.historicoRevisoes.at(-1).acao, 'dominado');
    action.revisarNovamenteRevisao(1);
    assert.equal(item.status, 'pendente');
    assert.equal(item.dataAlvo, '2026-10-17');
    assert.equal(item.dominadoEm, null);
    assert.equal(action.saves, 2);
});

test('dominar etapa da trilha impede novas revisões e reabrir restaura só a próxima etapa', () => {
    const topic = { id: 'rule-of-three' };
    const trail = globalThis.KingReviewTrailCore;
    trail.start(topic, [1, 7], '2026-10-15');
    trail.resolve(topic, 'bom', '2026-10-16');
    const old = { id: 2, origem: 'trilha', topicId: topic.id, trilhaEtapa: 1, status: 'revisado', dataAlvo: '2026-10-16' };
    const next = { id: 3, origem: 'trilha', topicId: topic.id, trilhaEtapa: 2, status: 'pendente', dataAlvo: '2026-10-23' };
    const action = actions([old, next], topic);
    action.marcarRevisaoDominada(old.id);
    assert.equal(trail.active(topic), null);
    assert.equal(next.status, 'revisado');
    assert.equal(next.dataAlvo, '');
    assert.ok(old.dominadoEm && next.dominadoEm);
    action.revisarNovamenteRevisao(old.id);
    assert.equal(trail.active(topic).numero, 2);
    assert.equal(next.status, 'pendente');
    assert.equal(next.dataAlvo, '2026-10-17');
    assert.equal(old.dominadoEm, null);
    assert.equal(next.dominadoEm, null);
});
