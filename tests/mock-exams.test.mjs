import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

await import('../mock-exam-core.js');
const core = globalThis.KingMockExamCore;
const make = (stem, subject = 'Física') => ({ stem, choices: ['A resposta 1', 'A resposta 2', 'A resposta 3', 'A resposta 4', 'A resposta 5'], correctIndex: 2, explanation: 'A terceira alternativa se obtém pela relação indicada no enunciado.', subject, topic: 'Cinemática' });

test('questões geradas inválidas não entram no simulado', () => {
    const valid = make('Um móvel percorre 50 metros em 10 segundos. Qual é sua velocidade média?');
    const repeated = { ...valid };
    const outside = make('Uma outra questão suficientemente longa mas de outra matéria.', 'História');
    const bad = { ...make('Uma terceira questão suficientemente longa, porém com alternativas repetidas.'), choices: ['igual', 'igual', 'igual', 'igual', 'igual'] };
    const result = core.validate({ questions: [valid, repeated, outside, bad] }, ['Física'], 10);
    assert.equal(result.length, 1);
    assert.equal(result[0].subject, 'Física');
});

test('correção separa acertos, erros, brancos e desempenho por matéria e assunto', () => {
    const questions = [make('Uma questão original sobre a velocidade média em um percurso qualquer.'), make('Uma segunda questão original sobre velocidade em outro percurso.'), make('Uma terceira questão original sobre aceleração e tempo decorrido.', 'Química')];
    const result = core.grade(questions, [2, 1, null]);
    assert.equal(result.total, 3);
    assert.equal(result.correct, 1);
    assert.equal(result.wrong, 1);
    assert.equal(result.blank, 1);
    assert.equal(result.percent, 33);
    assert.equal(result.bySubject.Física.correct, 1);
    assert.equal(result.bySubject.Química.blank, 1);
    assert.equal(result.byTopic['Física · Cinemática'].wrong, 1);
});

test('simulado usa os mesmos componentes, oculta gabarito até o fim e entrega arquivos na build', () => {
    const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
    const source = readFileSync(new URL('../mock-exams.js', import.meta.url), 'utf8');
    const build = readFileSync(new URL('../vite.config.js', import.meta.url), 'utf8');
    assert.match(html, /id="mockExamSubjects"/);
    assert.match(html, /mock-exam-core\.js/);
    assert.match(build, /'mock-exam-core\.js', 'mock-exams\.js'/);
    assert.match(source, /exam\.status === 'running'/);
    assert.match(source, /exam\.status === 'done'/);
    assert.match(source, /dataRevisaoComDias\(1\)/);
    assert.match(source, /pendingExam = exam/);
    assert.match(source, /function saveDraft\(\)/);
    assert.match(source, /Prévia das questões/);
    assert.match(source, /Desempenho por assunto/);
});
