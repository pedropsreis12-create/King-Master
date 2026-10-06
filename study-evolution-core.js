(function (root, factory) {
    const api = factory();
    if (typeof module === 'object' && module.exports) module.exports = api;
    root.KingStudyEvolutionCore = api;
})(typeof globalThis !== 'undefined' ? globalThis : window, function () {
    const DAY = 86400000;
    const key = value => String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('pt-BR').trim();
    const date = iso => new Date(`${iso}T12:00:00`);
    const localIso = value => { const d = value instanceof Date ? value : date(value); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
    const addDays = (iso, days) => { const d = date(iso); d.setDate(d.getDate() + days); return localIso(d); };
    function goalForDay(plan, iso, fallback = 240) {
        const weekday = date(iso).getDay();
        if (!plan?.configured || !Array.isArray(plan.minutesByWeekday)) return Math.max(0, Number(fallback) || 0);
        const minutes = Number(plan.minutesByWeekday[weekday]);
        return Math.max(0, Math.round((Number.isFinite(minutes) ? minutes : fallback) * ({ intenso: 1.2, equilibrado: 1, leve: .75 }[plan.rhythm] || 1)));
    }
    function isoWeek(iso) {
        const d = date(iso); d.setDate(d.getDate() + 4 - (d.getDay() || 7));
        const year = d.getFullYear();
        return `${year}-W${String(Math.ceil((((d - new Date(year, 0, 1, 12)) / DAY) + 1) / 7)).padStart(2, '0')}`;
    }
    function weekDates(iso) {
        const d = date(iso); d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
        const monday = localIso(d);
        return Array.from({ length: 7 }, (_, index) => addDays(monday, index));
    }
    function distribute(total, weighted) {
        const units = Math.max(0, Math.round(total / 5));
        const sum = weighted.reduce((n, item) => n + item.points, 0);
        if (!sum) return weighted.map(item => ({ ...item, minutes: 0 }));
        const raw = weighted.map(item => units * item.points / sum);
        const rounded = raw.map(Math.floor);
        let remaining = units - rounded.reduce((n, value) => n + value, 0);
        const indices = raw.map((value, index) => ({ index, fraction: value - rounded[index] })).sort((a, b) => b.fraction - a.fraction);
        for (let i = 0; i < remaining; i++) rounded[indices[i].index]++;
        return weighted.map((item, index) => ({ ...item, minutes: rounded[index] * 5 }));
    }
    function phase(plan, today) {
        const examDate = [plan?.examDate, plan?.examDate2].filter(value => /^\d{4}-\d{2}-\d{2}$/.test(value || '') && value >= today).sort()[0];
        if (!examDate) return 'base';
        const days = Math.ceil((date(examDate) - date(today)) / DAY);
        return days <= 45 ? 'reta-final' : days <= 120 ? 'aprofundamento' : 'base';
    }
    function weeklyAllocation(subjects, plan, history = [], today = localIso(new Date()), fallback = 240) {
        const total = weekDates(today).reduce((sum, day) => sum + goalForDay(plan, day, fallback), 0);
        const stage = phase(plan, today);
        const fractions = { base: [.75, .15, .10], aprofundamento: [.70, .15, .15], 'reta-final': [.55, .15, .30] }[stage];
        const hasEssay = subjects.some(item => /reda[cç][aã]o/i.test(item.subject));
        const essayMinutes = hasEssay ? Math.round(total * fractions[1] / 5) * 5 : 0;
        const reviewMinutes = Math.round(total * fractions[2] / 5) * 5;
        const subjectMinutes = Math.max(0, total - essayMinutes - reviewMinutes);
        const normal = subjects.filter(item => !/reda[cç][aã]o/i.test(item.subject));
        const weighted = normal.map(subject => {
            const weight = Math.max(1, Math.min(5, Number(plan?.weights?.[subject.id]) || 1));
            const questions = Number(subject.questoes) || 0;
            const accuracy = questions > 0 ? Math.max(0, Math.min(1, (Number(subject.acertos) || 0) / questions)) : null;
            return { id: subject.id, name: subject.subject, points: weight * (accuracy === null ? 1 : .5 + (1 - accuracy)) };
        });
        return { total, stage, subjectMinutes, essayMinutes, reviewMinutes, subjects: distribute(subjectMinutes, weighted) };
    }
    function reinforce(allocation, actualPrevious = null) {
        if (!actualPrevious || !Object.values(actualPrevious).some(value => Number(value) > 0)) return { ...allocation, note: '' };
        const copy = allocation.subjects.map(item => ({ ...item }));
        const weak = copy.filter(item => item.minutes > 0 && Number(actualPrevious[item.id] || 0) < item.minutes / 2);
        if (!weak.length || weak.length === copy.length) return { ...allocation, note: '' };
        const bonus = weak.reduce((sum, item) => sum + Math.round(item.minutes * .15 / 5) * 5, 0);
        const others = copy.filter(item => !weak.includes(item));
        const available = others.reduce((sum, item) => sum + item.minutes, 0);
        if (!available) return { ...allocation, note: '' };
        const actualBonus = Math.min(bonus, available);
        const additions = distribute(actualBonus, weak.map(item => ({ ...item, points: item.minutes })));
        const removals = distribute(actualBonus, others.map(item => ({ ...item, points: item.minutes })));
        for (const item of copy) item.minutes += additions.find(entry => entry.id === item.id)?.minutes || 0;
        for (const item of copy) item.minutes -= removals.find(entry => entry.id === item.id)?.minutes || 0;
        return { ...allocation, subjects: copy, note: `Reforço de 15% em ${weak.map(item => item.name).join(', ')}, abaixo da metade da meta.` };
    }
    function dayState(minutes, target, iso, firstStudyDate, today) {
        if (iso > today || (firstStudyDate ? iso < firstStudyDate : iso < today)) return 'apagado';
        if (!target) return minutes > 0 ? 'extra' : 'livre';
        if (!minutes) return iso === today ? 'pendente' : 'nivel-0';
        const fraction = minutes / target;
        return fraction >= 1 ? 'nivel-3' : fraction >= .5 ? 'nivel-2' : 'nivel-1';
    }
    function heatmap(history, plan, today = localIso(new Date()), fallback = 240, reviews = []) {
        const totals = {}, questions = {}, reviewCounts = {};
        for (const item of history || []) {
            const iso = item.dataISO || (Number(item.id) > 1e11 ? localIso(new Date(item.id)) : '');
            if (/^\d{4}-\d{2}-\d{2}$/.test(iso)) {
                totals[iso] = (totals[iso] || 0) + Math.max(0, Number(item.tempoSegundos || item.segundos || item.durationSeconds || 0)) / 60;
                questions[iso] = (questions[iso] || 0) + Math.max(0, Number(item.questoes) || 0);
            }
        }
        for (const item of reviews || []) if (item.revisadoEm) { const iso = localIso(new Date(item.revisadoEm)); reviewCounts[iso] = (reviewCounts[iso] || 0) + 1; }
        const first = Object.keys(totals).sort()[0] || '';
        const firstDay = addDays(weekDates(today)[0], -25 * 7);
        const days = Array.from({ length: 182 }, (_, index) => addDays(firstDay, index)).map(iso => {
            const minutes = Math.round(totals[iso] || 0);
            const target = goalForDay(plan, iso, fallback);
            return { iso, minutes, target, questions: questions[iso] || 0, reviews: reviewCounts[iso] || 0, state: dayState(minutes, target, iso, first, today) };
        });
        let current = 0, best = 0, fulfilled = 0;
        for (const day of days) {
            if (day.state === 'nivel-3') { current++; fulfilled++; best = Math.max(best, current); }
            else if (day.state === 'livre' || day.state === 'extra' || day.state === 'apagado' || day.state === 'pendente') continue;
            else current = 0;
        }
        return { days, fulfilled, current, best };
    }
    function annual(history, year) {
        const months = Array(12).fill(0), days = new Set(), subjects = new Map();
        for (const item of history || []) {
            const iso = item.dataISO || (Number(item.id) > 1e11 ? localIso(new Date(item.id)) : '');
            if (!iso.startsWith(`${year}-`)) continue;
            const month = Number(iso.slice(5, 7)) - 1;
            if (month < 0 || month > 11) continue;
            const seconds = Math.max(0, Number(item.tempoSegundos || item.segundos || item.durationSeconds || 0));
            months[month] += seconds;
            if (seconds) days.add(iso);
            const key = item.materia || 'Sem matéria';
            const entry = subjects.get(key) || { name: key, seconds: 0, questions: 0, correct: 0 };
            entry.seconds += seconds; entry.questions += Math.max(0, Number(item.questoes) || 0); entry.correct += Math.max(0, Number(item.acertos) || 0);
            subjects.set(key, entry);
        }
        return { months, total: months.reduce((a, b) => a + b, 0), days: days.size, bestMonth: months.indexOf(Math.max(...months)) + 1, subjects: [...subjects.values()].sort((a, b) => b.seconds - a.seconds) };
    }
    return { key, localIso, addDays, isoWeek, weekDates, goalForDay, weeklyAllocation, reinforce, dayState, heatmap, annual };
});
