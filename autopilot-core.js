/* Plano diário determinístico. Nunca altera dados nem presume que tempo equivale a domínio. */
(function (root, factory) {
    const api = factory();
    if (typeof module !== 'undefined' && module.exports) module.exports = api;
    root.KingAutopilotCore = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
    const pad = value => String(value).padStart(2, '0');
    const iso = date => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
    const localDate = value => {
        const [year, month, day] = String(value || '').split('-').map(Number);
        const date = new Date(year, month - 1, day, 12);
        return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day ? date : null;
    };
    const monday = value => {
        const date = localDate(value); if (!date) return '';
        date.setDate(date.getDate() - ((date.getDay() + 6) % 7)); return iso(date);
    };
    const dayNumber = value => { const date = localDate(value); return date ? ((date.getDay() + 6) % 7) + 1 : 0; };
    const key = value => String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('pt-BR').trim();
    const clamp = (value, min, max) => Math.min(max, Math.max(min, Number(value) || min));
    const priority = value => ({ alta: 3, media: 2, baixa: 1 })[key(value)] || 2;

    function dueCounts(data, date, now = Date.now()) {
        const reviews = (data.revisoesItems || []).filter(item => ['pendente', 'fraco'].includes(item?.status) && (!item.dataAlvo || item.dataAlvo <= date)).length;
        const errors = (data.cadernoErrosItems || []).filter(item => item?.status !== 'dominado' && (!item?.proximaRevisao || item.proximaRevisao <= date)).length;
        const activeDecks = new Set((data.flashcards?.decks || []).map(deck => String(deck.id)));
        const cards = (data.flashcards?.cards || []).filter(card => {
            if (!activeDecks.has(String(card.deckId))) return false;
            const state = data.flashcards?.states?.[card.id] || {};
            return !Number.isFinite(Number(state.lastReviewedAt)) || Number(state.lastReviewedAt) <= 0
                || !Number.isFinite(Number(state.dueAt)) || Number(state.dueAt) <= now;
        }).length;
        return { reviews, errors, cards, total: reviews + errors + cards };
    }

    function rankTopics(data) {
        const results = [];
        const history = new Map();
        for (const item of data.historyItems || []) {
            const id = `${key(item.materia)}|${key(item.assunto)}`;
            const previous = history.get(id) || { questions: 0, errors: 0 };
            previous.questions += Math.max(0, Number(item.questoes) || 0);
            previous.errors += Math.max(0, Number(item.erros) || 0);
            history.set(id, previous);
        }
        (data.cycleItems || []).forEach(subject => {
            (subject.topicos || []).forEach((topic, topicIndex) => {
                const level = clamp(topic.nivelDominio ?? 0, 0, 3);
                if (level >= 3 || !String(topic.nome || '').trim()) return;
                const { questions, errors } = history.get(`${key(subject.subject)}|${key(topic.nome)}`) || { questions: 0, errors: 0 };
                const weight = clamp(data.autopilot?.subjectWeights?.[subject.id] ?? 2, 1, 5);
                const score = (3 - level) * 12 + priority(topic.prioridade) * 5 + weight * 2 + (questions ? Math.round(errors / questions * 15) : 0);
                const reason = questions ? `${errors} erro${errors === 1 ? '' : 's'} em ${questions} questões registradas`
                    : level === 0 ? 'Ainda sem prática registrada' : 'Retomar e praticar este conteúdo';
                results.push({ subjectId: String(subject.id), subject: String(subject.subject || ''), topic: String(topic.nome).slice(0, 100), topicIndex, level, score, reason });
            });
        });
        return results.sort((a, b) => b.score - a.score || a.subject.localeCompare(b.subject, 'pt-BR') || a.topic.localeCompare(b.topic, 'pt-BR'));
    }

    function daysSinceLastSession(data, date) {
        const today = localDate(date); if (!today) return null;
        const previous = (data.historyItems || []).map(item => localDate(item.dataISO)).filter(day => day && day < today)
            .sort((a, b) => b - a)[0];
        return previous ? Math.round((today - previous) / 86400000) : null;
    }

    function paceSummary(data, date) {
        const end = localDate(date);
        if (!end) return [];
        const start = new Date(end); start.setDate(start.getDate() - 6);
        const areas = [
            { name: 'Matemática', pattern: /matematica/, target: 200 },
            { name: 'Natureza', pattern: /fisica|quimica|biologia|ciencias da natureza/, target: 200 },
            { name: 'Humanas', pattern: /historia|geografia|filosofia|sociologia|ciencias humanas/, target: 180 },
            { name: 'Linguagens', pattern: /gramatica|lingua|portugues|literatura|ingles|espanhol|redacao|linguagens/, target: 180 }
        ];
        const totals = areas.map(area => ({ area: area.name, targetSeconds: area.target, seconds: 0, questions: 0 }));
        for (const session of data.practiceSessions || []) {
            const day = localDate(session.data);
            if (!day || day < start || day > end) continue;
            const areaIndex = areas.findIndex(area => area.pattern.test(key(session.subject)));
            if (areaIndex < 0) continue;
            for (const question of session.questions || []) {
                const seconds = Number(question.seconds);
                if (question.choice == null || !Number.isFinite(seconds) || seconds <= 0 || seconds > 3600) continue;
                totals[areaIndex].seconds += seconds; totals[areaIndex].questions++;
            }
        }
        return totals.filter(row => row.questions).map(row => ({ ...row, averageSeconds: Math.round(row.seconds / row.questions), overTarget: row.seconds / row.questions > row.targetSeconds }));
    }

    function completedFor(data, subject, topic, date) {
        const rows = (data.historyItems || []).filter(item => item.dataISO === date && key(item.materia) === key(subject) && key(item.assunto) === key(topic));
        return { seconds: rows.reduce((sum, item) => sum + Math.max(0, Number(item.tempoSegundos) || 0), 0),
            questions: rows.reduce((sum, item) => sum + Math.max(0, Number(item.questoes) || 0), 0) };
    }

    function buildDailyPlan(data, date, options = {}) {
        const budget = clamp(options.budgetMinutes ?? data.autopilot?.dailyMinutes ?? data.dailyGoalMinutes ?? 240, 30, 480);
        const due = dueCounts(data, date, options.now);
        const gap = daysSinceLastSession(data, date);
        const comeback = gap !== null && gap >= 3;
        const ranks = rankTopics(data);
        const week = data.studySchedule?.weeks?.[monday(date)];
        const blocks = (week?.blocks || []).filter(item => Number(item.day) === dayNumber(date))
            .sort((a, b) => (a.order ?? 999) - (b.order ?? 999) || String(a.start || '').localeCompare(String(b.start || '')));
        const tasks = []; let remaining = comeback ? Math.min(45, budget) : budget;
        const memoryCategories = [due.reviews, due.errors, due.cards].filter(Boolean).length;
        let memoryBudget = Math.min(remaining, comeback ? 20 : 30, Math.max(memoryCategories * 5, due.total * 4));
        const memoryTasks = [
            ['revisoes', 'Revisões vencidas', due.reviews],
            ['caderno-erros', 'Erros para retomar', due.errors],
            ['flashcards', 'Cartões para recordar', due.cards]
        ].filter(item => item[2]);
        for (let index = 0; index < memoryTasks.length; index++) {
            const [category, title, count] = memoryTasks[index];
            const reserved = (memoryTasks.length - index - 1) * 5;
            const minutes = Math.min(memoryBudget - reserved, Math.max(5, count * 4));
            tasks.push({ type: 'memory', section: category, title, detail: `${count} ${count === 1 ? 'item' : 'itens'} para revisar`, minutes, done: false });
            memoryBudget -= minutes; remaining -= minutes;
        }
        if (comeback) {
            const known = ranks.find(item => item.level >= 2) || ranks[0];
            if (known && remaining > 0) tasks.push({ type: 'study', title: known.topic, subject: known.subject, subjectId: known.subjectId,
                topicIndex: known.topicIndex, detail: 'Recomeço leve: avance sem tentar compensar os dias perdidos', minutes: Math.min(25, remaining),
                done: completedFor(data, known.subject, known.topic, date).seconds >= 25 * 60 });
            return { date, budget, usedMinutes: tasks.reduce((sum, item) => sum + item.minutes, 0), comeback: true, gap, due, tasks, source: 'recomeço' };
        }
        if (blocks.length) {
            for (const block of blocks) {
                if (remaining < 5) break;
                const subject = (data.cycleItems || []).find(item => String(item.id) === String(block.subjectId));
                if (!subject) continue;
                const minutes = Math.min(remaining, clamp(block.duration, 5, 240));
                tasks.push({ type: 'block', blockId: String(block.id), title: String(block.topic || 'Bloco de estudo'), subject: subject.subject,
                    detail: `${block.start || 'Horário livre'} · ${block.kind === 'questoes' ? 'Questões' : 'Estudo'}`, minutes,
                    done: block.status === 'completed' });
                remaining -= minutes;
            }
            return { date, budget, usedMinutes: tasks.reduce((sum, item) => sum + item.minutes, 0), comeback: false, gap, due, tasks, source: 'cronograma' };
        }
        const chosen = [];
        for (const candidate of ranks) {
            if (chosen.some(item => item.subjectId === candidate.subjectId)) continue;
            chosen.push(candidate);
            if (chosen.length >= 2) break;
        }
        for (const candidate of chosen) {
            if (remaining < 20) break;
            const studied = completedFor(data, candidate.subject, candidate.topic, date);
            const studyMinutes = Math.min(remaining, 50);
            tasks.push({ type: 'study', title: candidate.topic, subject: candidate.subject, subjectId: candidate.subjectId,
                topicIndex: candidate.topicIndex, detail: candidate.reason, minutes: studyMinutes, done: studied.seconds >= studyMinutes * 60 });
            remaining -= studyMinutes;
            if (remaining >= 25) {
                const practiceMinutes = Math.min(remaining, 45);
                tasks.push({ type: 'practice', title: `Praticar ${candidate.topic}`, subject: candidate.subject, subjectId: candidate.subjectId,
                    topic: candidate.topic, detail: 'Até 10 questões geradas por IA; confira o gabarito e registre os erros', minutes: practiceMinutes, done: studied.questions >= 10 });
                remaining -= practiceMinutes;
            }
        }
        return { date, budget, usedMinutes: tasks.reduce((sum, item) => sum + item.minutes, 0), comeback: false, gap, due, tasks,
            source: chosen.length ? 'assuntos' : 'vazio' };
    }

    return { iso, monday, dueCounts, rankTopics, daysSinceLastSession, paceSummary, buildDailyPlan };
});
