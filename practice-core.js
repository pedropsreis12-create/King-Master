/* Resultado do treino sem DOM, rede ou mutação: reutilizável nos testes. */
(function (root, factory) {
    const api = factory();
    if (typeof module !== 'undefined' && module.exports) module.exports = api;
    root.KingPracticeCore = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
    const causes = new Set(['conteudo', 'interpretacao', 'calculo', 'atencao', 'estrategia']);
    const cut = (value, limit) => String(value || '').trim().slice(0, limit);
    function calculate(questions, answers) {
        const rows = (questions || []).map((question, index) => {
            const answer = answers?.[index] || {};
            const choice = Number.isInteger(answer.choice) && answer.choice >= 0 && answer.choice <= 4 ? answer.choice : null;
            const correct = choice !== null && choice === Number(question.correctIndex);
            return { index, choice, correct, seconds: Math.max(0, Math.floor(Number(answer.seconds) || 0)), cause: causes.has(answer.cause) ? answer.cause : 'conteudo' };
        });
        const hits = rows.filter(item => item.correct).length;
        const errors = rows.filter(item => item.choice !== null && !item.correct).length;
        const blanks = rows.filter(item => item.choice === null).length;
        const seconds = rows.reduce((sum, item) => sum + item.seconds, 0);
        return { total: rows.length, hits, errors, blanks, seconds, averageSeconds: rows.length ? Math.round(seconds / rows.length) : 0,
            percent: rows.length ? Math.round(hits / rows.length * 100) : 0, rows };
    }
    function buildErrors(questions, result, context) {
        return result.rows.filter(row => row.choice !== null && !row.correct).map(row => {
            const question = questions[row.index];
            const choices = Array.isArray(question.choices) ? question.choices.slice(0, 5) : [];
            const explanation = cut(question.explanation, 700);
            const firstSentence = explanation.split(/(?<=[.!?])\s+/)[0] || '';
            return {
                materia: cut(context.subject, 50), assunto: cut(context.topic || question.topic, 80),
                origem: cut(`Treino IA ${context.date}`, 80), tipo: row.cause,
                questao: cut(`${question.stem}\n${choices.map((choice, index) => `${'ABCDE'[index]}) ${choice}`).join('\n')}`, 1200),
                minhaResposta: cut(choices[row.choice], 700),
                respostaCorreta: cut(`${choices[question.correctIndex] || ''}${explanation ? ` — ${explanation}` : ''}`, 900),
                regra: cut(firstSentence, 240) || 'Rever a resolução e identificar a regra que faltou.',
                proximaRevisao: context.tomorrow, etapaRevisao: 0, status: 'aprendendo', criadoEm: context.now
            };
        });
    }
    return { calculate, buildErrors };
});
