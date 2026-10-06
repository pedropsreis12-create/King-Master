import test from 'node:test';
import assert from 'node:assert/strict';
import '../review-trail-core.js';
const trail = globalThis.KingReviewTrailCore;

test('primeira sessão inicia só R1 e concluir atrasada cria R2 a partir da baixa', () => {
    const topic = { nivelDominio: 1, questoes: 0 };
    trail.start(topic, [1, 7, 15, 30], '2026-10-01');
    assert.equal(trail.active(topic).dataPrevista, '2026-10-02');
    assert.equal(topic.trilha.etapas[1].dataPrevista, '');
    trail.resolve(topic, 'bom', '2026-10-05');
    assert.equal(topic.trilha.etapas[0].concluidaEm, '2026-10-05');
    assert.equal(trail.active(topic).dataPrevista, '2026-10-12');
});

test('duas tentativas fracas repetem etapa e rebaixam domínio', () => {
    const topic = { nivelDominio: 3 };
    trail.start(topic, [1, 7], '2026-10-01');
    trail.resolve(topic, 'fraco', '2026-10-02');
    assert.equal(trail.active(topic).dataPrevista, '2026-10-03');
    trail.resolve(topic, 'fraco', '2026-10-03');
    assert.equal(topic.nivelDominio, 1);
    assert.equal(trail.active(topic).numero, 1);
});

test('fim da trilha consolida ou domina com evidência suficiente', () => {
    const topic = { nivelDominio: 1, questoes: 20, acertos: 17, desempenhoRecentes: [{ questoes: 20, acertos: 17 }] };
    trail.start(topic, [1, 7], '2026-10-01');
    trail.resolve(topic, 'bom', '2026-10-02');
    const result = trail.resolve(topic, 'bom', '2026-10-09');
    assert.equal(result.finished, true);
    assert.equal(topic.nivelDominio, 3);
    assert.equal(trail.active(topic), null);
});

test('histórico agregado antigo sem últimas 20 questões não inventa domínio', () => {
    const topic = { nivelDominio: 1, questoes: 100, acertos: 99 };
    trail.start(topic, [1, 7], '2026-10-01');
    trail.resolve(topic, 'bom', '2026-10-02');
    trail.resolve(topic, 'bom', '2026-10-09');
    assert.equal(topic.nivelDominio, 2);
});

test('prazo da prova antecipa etapa e mudança de intervalo não altera concluída', () => {
    const topic = { nivelDominio: 1 };
    trail.start(topic, [1, 30], '2026-10-01', '2026-10-12');
    trail.resolve(topic, 'bom', '2026-10-02', '2026-10-12');
    assert.equal(trail.active(topic).dataPrevista, '2026-10-07');
    trail.setIntervals(topic, [1, 4], '2026-10-03', '2026-10-12');
    assert.equal(topic.trilha.etapas[0].concluidaEm, '2026-10-02');
    assert.equal(trail.active(topic).dataPrevista, '2026-10-06');
});

test('etapa criada no dia da prova não ultrapassa a data informada', () => {
    assert.equal(trail.dueDate('2026-10-12', 7, '2026-10-12'), '2026-10-12');
});
