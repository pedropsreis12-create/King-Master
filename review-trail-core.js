(function (root, factory) {
    const api = factory();
    if (typeof module === 'object' && module.exports) module.exports = api;
    root.KingReviewTrailCore = api;
})(typeof globalThis !== 'undefined' ? globalThis : window, function () {
    const defaults = [1, 7, 15, 30];
    const validIntervals = value => {
        if (!Array.isArray(value) || value.length < 2 || value.length > 6) return defaults.slice();
        const result = value.map(Number);
        return result.every(days => Number.isInteger(days) && days >= 1 && days <= 120) ? result : defaults.slice();
    };
    function iso(value) {
        if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
        const date = value instanceof Date ? value : new Date(value || Date.now());
        return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    }
    function addDays(date, days) {
        const [year, month, day] = iso(date).split('-').map(Number);
        const result = new Date(year, month - 1, day + Number(days || 0), 12);
        return iso(result);
    }
    function dueDate(base, days, examDate = '') {
        let due = addDays(base, days);
        if (examDate && /^\d{4}-\d{2}-\d{2}$/.test(examDate) && due > examDate && base >= examDate) return examDate;
        if (examDate && /^\d{4}-\d{2}-\d{2}$/.test(examDate) && due > examDate && base < examDate) {
            const remain = Math.max(1, Math.floor((new Date(`${examDate}T12:00:00`) - new Date(`${base}T12:00:00`)) / 86400000));
            due = addDays(base, Math.max(1, Math.floor(remain / 2)));
        }
        return due;
    }
    function start(topic, intervals = defaults, today = iso(), examDate = '') {
        if (topic.trilha?.etapas?.length) return topic.trilha;
        const durations = validIntervals(intervals);
        topic.trilha = {
            intervalos: durations,
            iniciadaEm: iso(today),
            etapas: durations.map((days, index) => ({ numero: index + 1, dataPrevista: index === 0 ? dueDate(today, days, examDate) : '', status: 'pendente', concluidaEm: '', resultado: '', notas: '', tentativasFracas: 0 }))
        };
        return topic.trilha;
    }
    function active(topic) {
        return topic?.trilha?.etapas?.find(step => step.status === 'pendente' && step.dataPrevista) || null;
    }
    function resolve(topic, outcome, today = iso(), examDate = '', notes = '') {
        const step = active(topic);
        if (!step || !['bom', 'fraco'].includes(outcome)) return null;
        const date = iso(today);
        step.notas = String(notes || step.notas || '').slice(0, 300);
        if (outcome === 'fraco') {
            step.status = 'pendente';
            step.resultado = 'fraco';
            step.tentativasFracas = (Number(step.tentativasFracas) || 0) + 1;
            step.dataPrevista = addDays(date, 1);
            if (step.tentativasFracas >= 2) topic.nivelDominio = Math.min(Number(topic.nivelDominio) || 0, 1);
            return { step, next: step, finished: false, weak: true };
        }
        step.status = 'concluida';
        step.resultado = 'bom';
        step.concluidaEm = date;
        const next = topic.trilha.etapas[step.numero] || null;
        if (next) next.dataPrevista = dueDate(date, topic.trilha.intervalos[next.numero - 1], examDate);
        else {
            topic.nivelDominio = Math.max(Number(topic.nivelDominio) || 0, 2);
            let questions = 0, correct = 0;
            for (const entry of [...(topic.desempenhoRecentes || [])].reverse()) {
                const available = Math.max(0, Number(entry.questoes) || 0);
                const counted = Math.min(available, 20 - questions);
                if (!counted) continue;
                questions += counted;
                correct += counted * Math.max(0, Math.min(1, (Number(entry.acertos) || 0) / available));
                if (questions >= 20) break;
            }
            if (questions >= 20 && correct / questions >= .8) topic.nivelDominio = 3;
        }
        return { step, next, finished: !next, weak: false };
    }
    function reschedule(topic, date) {
        const step = active(topic);
        if (!step || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return null;
        step.dataPrevista = date;
        return step;
    }
    function setIntervals(topic, intervals, today = iso(), examDate = '') {
        if (!topic?.trilha?.etapas?.length) return null;
        const durations = validIntervals(intervals);
        if (durations.length !== topic.trilha.etapas.length) return null;
        topic.trilha.intervalos = durations;
        const current = active(topic);
        if (current) {
            const previous = topic.trilha.etapas[current.numero - 2];
            current.dataPrevista = dueDate(previous?.concluidaEm || topic.trilha.iniciadaEm || today, durations[current.numero - 1], examDate);
        }
        return topic.trilha;
    }
    return { defaults, validIntervals, iso, addDays, dueDate, start, active, resolve, reschedule, setIntervals };
});
