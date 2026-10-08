/* Frequências e sequências dos hábitos, sem depender da interface. */
(function (root, factory) {
    const api = factory();
    if (typeof module !== 'undefined' && module.exports) module.exports = api;
    root.KingHabitCore = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
    const pad = value => String(value).padStart(2, '0');
    const key = date => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
    const day = value => { const [year, month, date] = String(value).split('-').map(Number); return new Date(year, month - 1, date, 12); };
    const monday = value => { const date = day(value); date.setDate(date.getDate() - ((date.getDay() + 6) % 7)); return key(date); };
    function frequency(item) {
        const value = item?.frequency || {};
        const mode = ['daily', 'weekdays', 'weekly'].includes(value.mode) ? value.mode : 'daily';
        const weekdays = Array.isArray(value.weekdays) ? [...new Set(value.weekdays.map(Number).filter(n => n >= 0 && n <= 6))] : [];
        return { mode, weekdays: mode === 'weekdays' && weekdays.length ? weekdays : [0, 1, 2, 3, 4, 5, 6], timesPerWeek: Math.max(1, Math.min(7, Math.floor(Number(value.timesPerWeek) || 1))) };
    }
    function status(item, dateKey) {
        const value = item?.checkins?.[dateKey];
        if (value === true || value === 'done' || value?.status === 'done') return 'done';
        if (value === false || value === 'missed' || value?.status === 'missed') return 'missed';
        if (value === 'skip' || value?.status === 'skip') return 'skip';
        return '';
    }
    function nextStatus(value) {
        if (value === 'done') return 'missed';
        if (value === 'missed' || value === 'skip') return '';
        return 'done';
    }
    function due(item, dateKey) {
        const rule = frequency(item);
        return rule.mode !== 'weekdays' || rule.weekdays.includes(day(dateKey).getDay());
    }
    function weekProgress(item, today = key(new Date())) {
        const first = day(monday(today));
        const days = Array.from({ length: 7 }, (_, offset) => { const date = new Date(first); date.setDate(first.getDate() + offset); return key(date); });
        const rule = frequency(item);
        const target = rule.mode === 'weekly' ? rule.timesPerWeek : days.filter(dateKey => due(item, dateKey)).length;
        return { done: days.filter(dateKey => status(item, dateKey) === 'done' && (rule.mode === 'weekly' || due(item, dateKey))).length, target };
    }
    function streak(item, today = key(new Date()), limit = 730) {
        const rule = frequency(item);
        let current = 0;
        if (rule.mode === 'weekly') {
            let cursor = day(monday(today));
            for (let step = 0; step < Math.ceil(limit / 7); step++) {
                const weekKey = key(cursor);
                const count = Array.from({ length: 7 }, (_, index) => { const date = new Date(cursor); date.setDate(cursor.getDate() + index); return key(date); })
                    .filter(dateKey => dateKey <= today && status(item, dateKey) === 'done').length;
                if (count >= rule.timesPerWeek) current++;
                else if (step > 0) break;
                cursor.setDate(cursor.getDate() - 7);
            }
            return current;
        }
        const cursor = day(today);
        let started = false;
        for (let step = 0; step < limit; step++) {
            const dateKey = key(cursor);
            if (due(item, dateKey)) {
                const value = status(item, dateKey);
                if (value === 'done') { current++; started = true; }
                else if (value === 'skip') { /* Ausência justificada não soma nem quebra. */ }
                else if (dateKey === today && !value && !started) { /* Hoje ainda pode ser cumprido. */ }
                else break;
            }
            cursor.setDate(cursor.getDate() - 1);
        }
        return current;
    }
    function bestStreak(item) {
        const dates = Object.keys(item?.checkins || {}).sort();
        if (!dates.length) return 0;
        let best = 0;
        for (const dateKey of dates) if (status(item, dateKey) === 'done') best = Math.max(best, streak(item, dateKey));
        return best;
    }
    return { key, day, monday, frequency, status, nextStatus, due, weekProgress, streak, bestStreak };
});
