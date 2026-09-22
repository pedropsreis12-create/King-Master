/* Regras puras do cronograma: previsíveis, testáveis e sem matérias embutidas. */
(() => {
    const pad = value => String(value).padStart(2, '0');
    const iso = date => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
    const fromIso = value => {
        const [year, month, day] = String(value || '').split('-').map(Number);
        return new Date(year, month - 1, day, 12, 0, 0, 0);
    };
    const monday = value => {
        const date = value instanceof Date ? new Date(value) : fromIso(value);
        date.setHours(12, 0, 0, 0);
        date.setDate(date.getDate() - ((date.getDay() + 6) % 7));
        return iso(date);
    };
    const addDays = (value, days) => {
        const date = fromIso(value);
        date.setDate(date.getDate() + Number(days || 0));
        return iso(date);
    };
    const toMinutes = value => {
        const [hours, minutes] = String(value || '00:00').split(':').map(Number);
        return Math.max(0, (hours || 0) * 60 + (minutes || 0));
    };
    const toClock = total => `${pad(Math.floor(Math.max(0, total) / 60) % 24)}:${pad(Math.max(0, total) % 60)}`;
    const addMinutes = (clock, minutes) => toClock(toMinutes(clock) + Number(minutes || 0));
    const normalizeSettings = input => {
        const days = [...new Set((Array.isArray(input?.studyDays) ? input.studyDays : [1, 2, 3, 4, 5, 6]).map(Number).filter(day => day >= 1 && day <= 6))].sort();
        const pause = Number(input?.pauseMinutes);
        const closing = Number(input?.closingMinutes);
        const capacity = Number(input?.dailyCapacityMinutes);
        return {
            startTime: /^\d{2}:\d{2}$/.test(input?.startTime || '') ? input.startTime : '14:00',
            studyDays: days.length ? days : [1, 2, 3, 4, 5, 6],
            dailyCapacityMinutes: Math.min(720, Math.max(60, Number.isFinite(capacity) ? capacity : 240)),
            blockMinutes: Math.min(240, Math.max(10, Number(input?.blockMinutes) || 50)),
            pauseMinutes: Math.min(90, Math.max(0, Number.isFinite(pause) ? pause : 15)),
            closingMinutes: Math.min(60, Math.max(0, Number.isFinite(closing) ? closing : 5)),
            maxSubjectsPerDay: Math.min(6, Math.max(1, Number(input?.maxSubjectsPerDay) || 2))
        };
    };
    const subjectConfig = subject => ({
        id: subject.id,
        subject: String(subject.subject || '').trim(),
        color: subject.color || '#007aff',
        icon: subject.schedule?.icon || '●',
        priority: Math.min(3, Math.max(1, Number(subject.schedule?.priority) || 2)),
        weeklyBlocks: Math.min(30, Math.max(0, Number(subject.schedule?.weeklyBlocks) || 0)),
        consecutive: Boolean(subject.schedule?.consecutive)
    });
    const arrangeTimes = (blocks, settings, day) => {
        const ordered = blocks.filter(block => Number(block.day) === Number(day)).sort((a, b) => (a.order ?? 999) - (b.order ?? 999) || String(a.start || '').localeCompare(String(b.start || '')) || a.id - b.id);
        let cursor = toMinutes(settings.startTime);
        let runSubject = null;
        let runLength = 0;
        ordered.forEach((block, index) => {
            const same = String(block.subjectId) === String(runSubject);
            if (index && (!same || runLength >= 2)) { cursor += settings.pauseMinutes; runLength = 0; }
            if (block.fixedStart && /^\d{2}:\d{2}$/.test(String(block.start || ''))) {
                cursor = Math.max(cursor, toMinutes(block.start));
            }
            block.start = toClock(cursor);
            block.order = index;
            block.duration = Math.min(240, Math.max(5, Number(block.duration) || settings.blockMinutes));
            cursor += block.duration;
            runLength = same ? runLength + 1 : 1;
            runSubject = block.subjectId;
        });
        return ordered;
    };
    function organize(subjectsInput, settingsInput, weekKey) {
        const settings = normalizeSettings(settingsInput);
        const subjects = (Array.isArray(subjectsInput) ? subjectsInput : []).map(subjectConfig).filter(subject => subject.subject && subject.weeklyBlocks > 0);
        subjects.sort((a, b) => b.priority - a.priority || b.weeklyBlocks - a.weeklyBlocks || a.subject.localeCompare(b.subject, 'pt-BR'));
        const units = [];
        subjects.forEach(subject => {
            let remaining = subject.weeklyBlocks;
            while (remaining > 0) {
                const size = subject.consecutive && remaining >= 2 ? 2 : 1;
                units.push({ subject, size, sequence: units.length });
                remaining -= size;
            }
        });
        const states = settings.studyDays.map(day => ({ day, blocks: [], subjects: new Set() }));
        const subjectDayUse = new Map();
        let idSeed = Date.now();
        units.forEach(unit => {
            const uses = subjectDayUse.get(String(unit.subject.id)) || new Set();
            const ranked = states.map(state => {
                const newSubject = !state.subjects.has(String(unit.subject.id));
                const overPreferred = newSubject && state.subjects.size >= settings.maxSubjectsPerDay;
                const repeatPenalty = uses.has(state.day) ? 34 : 0;
                const adjacentPenalty = uses.has(state.day - 1) || uses.has(state.day + 1) ? 10 : 0;
                const score = (overPreferred ? 1000 : 0) + state.blocks.length * 20 + repeatPenalty + adjacentPenalty + state.day / 100;
                return { state, score };
            }).sort((a, b) => a.score - b.score || a.state.day - b.state.day);
            const chosen = ranked[0]?.state;
            if (!chosen) return;
            for (let index = 0; index < unit.size; index++) {
                chosen.blocks.push({
                    id: idSeed++,
                    subjectId: unit.subject.id,
                    day: chosen.day,
                    duration: settings.blockMinutes,
                    status: 'pending',
                    order: chosen.blocks.length,
                    group: unit.size > 1 ? `${unit.subject.id}-${unit.sequence}` : ''
                });
            }
            chosen.subjects.add(String(unit.subject.id));
            uses.add(chosen.day);
            subjectDayUse.set(String(unit.subject.id), uses);
        });
        const blocks = states.flatMap(state => arrangeTimes(state.blocks, settings, state.day));
        const warnings = states.filter(state => state.subjects.size > settings.maxSubjectsPerDay).map(state => state.day);
        return { key: monday(weekKey || new Date()), blocks, dailyClosures: {}, warnings, generatedAt: Date.now() };
    }
    function copyWeek(week, nextKey) {
        return {
            key: monday(nextKey),
            blocks: (week?.blocks || []).map((block, index) => ({ ...block, id: Date.now() + index, status: 'pending', registered: false, result: null })),
            dailyClosures: {}, warnings: [...(week?.warnings || [])], copiedAt: Date.now()
        };
    }
    globalThis.KingScheduleCore = { iso, fromIso, monday, addDays, toMinutes, toClock, addMinutes, normalizeSettings, subjectConfig, arrangeTimes, organize, copyWeek };
})();
