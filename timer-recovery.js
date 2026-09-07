/* Checkpoint pequeno e atômico: o relógio e os totais são recuperados juntos. */
(() => {
    const KEY = 'kingMasterTimerCheckpointV1';
    const finite = value => Number.isFinite(value) && value >= 0;
    function validState(state) {
        return state && ['estudo', 'descanso'].includes(state.mode) && finite(state.seconds)
            && typeof state.subjectId === 'string' && [5, 10].includes(state.restMinutes)
            && Array.isArray(state.target) && state.target.length === 3 && state.target.every(finite);
    }
    function capture(data, state) {
        return { version: 1, revision: data.lastModifiedAt, savedAt: Date.now(),
            totalStudySeconds: data.totalStudySeconds, weeklyChart: [...data.weeklyChart],
            lastWeekStart: data.lastWeekStart, state };
    }
    function recover(data, checkpoint) {
        // Uma importação/conta ou edição mais recente invalida o checkpoint antigo.
        if (!checkpoint || checkpoint.version !== 1 || checkpoint.revision !== data.lastModifiedAt
            || !validState(checkpoint.state) || !finite(checkpoint.totalStudySeconds)
            || !Array.isArray(checkpoint.weeklyChart) || checkpoint.weeklyChart.length !== 7
            || !checkpoint.weeklyChart.every(finite)) return data;
        return { ...data, totalStudySeconds: checkpoint.totalStudySeconds,
            weeklyChart: [...checkpoint.weeklyChart], lastWeekStart: checkpoint.lastWeekStart,
            timerState: { ...checkpoint.state, running: false } };
    }
    function nextLevel(xp, start, end, maximum) {
        const needed = Math.max(0, end - start);
        const earned = Math.max(0, Math.min(needed, xp - start));
        return { earned, needed, remaining: Math.max(0, end - xp), percent: maximum ? 100 : needed ? earned / needed * 100 : 0 };
    }
    function monday(time) {
        const date = new Date(time);
        date.setDate(date.getDate() - (date.getDay() + 6) % 7);
        return date.toDateString();
    }
    function creditStudy(data, from, to) {
        if (!finite(from) || !finite(to) || to <= from) return;
        const week = monday(to);
        if (data.lastWeekStart !== week) {
            data.lastWeekStart = week;
            data.weeklyChart = [0, 0, 0, 0, 0, 0, 0];
        }
        data.totalStudySeconds += (to - from) / 1000;
        // Uma aba em segundo plano pode atravessar a meia-noite ou a virada da semana.
        let cursor = from;
        while (cursor < to) {
            const day = new Date(cursor);
            const midnight = new Date(cursor);
            midnight.setHours(24, 0, 0, 0);
            const end = Math.min(to, midnight.getTime());
            if (monday(cursor) === week) data.weeklyChart[(day.getDay() + 6) % 7] += (end - cursor) / 1000;
            cursor = end;
        }
    }
    window.KingTimerRecovery = { KEY, validState, capture, recover, nextLevel, creditStudy };
})();
