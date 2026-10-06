import test from 'node:test';
import assert from 'node:assert/strict';
import '../practice-core.js';
const Core = globalThis.KingPracticeCore;
const questions = [
    { stem: 'Quanto é 2 + 2?', choices: ['1', '2', '3', '4', '5'], correctIndex: 3, explanation: 'Some as parcelas. Confira a conta.', topic: 'Aritmética' },
    { stem: 'Quanto é 3 × 3?', choices: ['6', '7', '8', '9', '10'], correctIndex: 3, explanation: 'Multiplique três por três.', topic: 'Aritmética' },
    { stem: 'Quanto é 5 - 1?', choices: ['4', '3', '2', '1', '0'], correctIndex: 0, explanation: 'Subtraia uma unidade.', topic: 'Aritmética' }
];

test('separa acertos, erros e questões puladas sem fabricar respostas', () => {
    const result = Core.calculate(questions, [{ choice: 3, seconds: 60 }, { choice: 0, seconds: 90, cause: 'calculo' }, { choice: null, seconds: 30 }]);
    assert.deepEqual({ total: result.total, hits: result.hits, errors: result.errors, blanks: result.blanks, seconds: result.seconds, average: result.averageSeconds },
        { total: 3, hits: 1, errors: 1, blanks: 1, seconds: 180, average: 60 });
    assert.equal(result.rows[1].cause, 'calculo');
});

test('cria itens de erro apenas das respondidas incorretamente e corta textos nos limites existentes', () => {
    const result = Core.calculate(questions, [{ choice: 3 }, { choice: 0, cause: 'interpretacao' }, { choice: null }]);
    const errors = Core.buildErrors(questions, result, { subject: 'Matemática', topic: 'Aritmética', date: '2026-10-05', tomorrow: '2026-10-06', now: 1 });
    assert.equal(errors.length, 1);
    assert.equal(errors[0].tipo, 'interpretacao');
    assert.equal(errors[0].minhaResposta, '6');
    assert.match(errors[0].respostaCorreta, /^9/);
    assert.equal(errors[0].proximaRevisao, '2026-10-06');
    assert.ok(errors[0].questao.length <= 1200 && errors[0].regra.length <= 240 && errors[0].respostaCorreta.length <= 900);
});
