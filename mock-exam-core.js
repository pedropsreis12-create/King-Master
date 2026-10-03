/* Validação e correção de simulados gerados; não depende da interface nem da IA. */
(function (root, factory) {
    const api = factory();
    if (typeof module !== 'undefined' && module.exports) module.exports = api;
    root.KingMockExamCore = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
    const text = (value, limit) => String(value || '').replace(/\s+/g, ' ').trim().slice(0, limit);
    const key = value => text(value, 500).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('pt-BR');
    function validate(raw, allowedSubjects, limit = 10, previous = []) {
        const source = Array.isArray(raw) ? raw : raw?.questions;
        if (!Array.isArray(source)) return [];
        const allowed = new Map(allowedSubjects.map(item => [key(item.subject || item), text(item.subject || item, 70)]));
        const seen = new Set(previous.map(item => key(item.stem)));
        const result = [];
        for (const candidate of source) {
            if (result.length >= limit) break;
            const stem = text(candidate?.stem || candidate?.enunciado, 850);
            const choices = (Array.isArray(candidate?.choices) ? candidate.choices : candidate?.alternativas || []).map(item => text(item, 240));
            const correctIndex = Number(candidate?.correctIndex ?? candidate?.correta);
            const explanation = text(candidate?.explanation || candidate?.explicacao, 900);
            const subject = allowed.get(key(candidate?.subject || candidate?.materia));
            const topic = text(candidate?.topic || candidate?.assunto, 100);
            if (stem.length < 25 || choices.length !== 5 || choices.some(choice => choice.length < 2)
                || new Set(choices.map(key)).size !== 5 || !Number.isInteger(correctIndex) || correctIndex < 0 || correctIndex > 4
                || explanation.length < 20 || !subject || !topic || seen.has(key(stem))) continue;
            seen.add(key(stem));
            result.push({ stem, choices, correctIndex, explanation, subject, topic });
        }
        return result;
    }
    function grade(questions, answers) {
        const bySubject = Object.create(null);
        const byTopic = Object.create(null);
        let correct = 0, wrong = 0, blank = 0;
        questions.forEach((question, index) => {
            const answer = Number.isInteger(answers?.[index]) ? answers[index] : null;
            const subject = bySubject[question.subject] ||= { correct: 0, wrong: 0, blank: 0 };
            const topic = byTopic[`${question.subject} · ${question.topic}`] ||= { correct: 0, wrong: 0, blank: 0 };
            const outcome = answer === null ? 'blank' : answer === question.correctIndex ? 'correct' : 'wrong';
            if (outcome === 'correct') correct++; else if (outcome === 'wrong') wrong++; else blank++;
            subject[outcome]++; topic[outcome]++;
        });
        return { total: questions.length, correct, wrong, blank, percent: questions.length ? Math.round(correct / questions.length * 100) : 0, bySubject, byTopic };
    }
    return { validate, grade };
});
