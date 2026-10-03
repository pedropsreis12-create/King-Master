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
    const validClock = value => /^([01]\d|2[0-3]):[0-5]\d$/.test(String(value || ''));
    const normalizeSettings = input => {
        const days = [...new Set((Array.isArray(input?.studyDays) ? input.studyDays : [1, 2, 3, 4, 5, 6]).map(Number).filter(day => day >= 1 && day <= 7))].sort();
        const pause = Number(input?.pauseMinutes);
        const closing = Number(input?.closingMinutes);
        const capacity = Number(input?.dailyCapacityMinutes);
        const startTime = validClock(input?.startTime) ? input.startTime : '14:00';
        const specifiedEnd = validClock(input?.endTime) && toMinutes(input.endTime) > toMinutes(startTime) ? input.endTime : '';
        const dailyCapacityMinutes = specifiedEnd ? toMinutes(specifiedEnd) - toMinutes(startTime)
            : Math.min(720, Math.max(60, Number.isFinite(capacity) ? capacity : 240));
        const endTime = specifiedEnd || toClock(Math.min(1439, toMinutes(startTime) + dailyCapacityMinutes));
        const blockMinutes = Math.min(240, Math.max(10, Number(input?.blockMinutes) || 50));
        const pauseMinutes = Math.min(90, Math.max(0, Number.isFinite(pause) ? pause : 15));
        const mode = ['adaptive', 'rigid', 'free'].includes(input?.mode) ? input.mode : 'adaptive';
        const pauseMode = input?.pauseMode === 'flexible' ? 'flexible' : 'fixed';
        const minPauseMinutes = pauseMode === 'flexible'
            ? Math.min(pauseMinutes, Math.max(1, Number(input?.minPauseMinutes) || Math.min(5, pauseMinutes))) : pauseMinutes;
        const durationMode = input?.durationMode === 'flexible' ? 'flexible' : 'fixed';
        const minBlockMinutes = durationMode === 'flexible'
            ? Math.min(blockMinutes, Math.max(10, Number(input?.minBlockMinutes) || Math.min(35, blockMinutes))) : blockMinutes;
        const maxBlockMinutes = durationMode === 'flexible'
            ? Math.max(blockMinutes, Math.min(240, Number(input?.maxBlockMinutes) || blockMinutes)) : blockMinutes;
        const registrationMinutes = Math.min(30, Math.max(0, Number(input?.registrationMinutes ?? input?.closingMinutes ?? 5) || 0));
        const inferredBlocks = Math.max(1, Math.floor((dailyCapacityMinutes + pauseMinutes) / (blockMinutes + registrationMinutes + pauseMinutes)));
        const targetBlocksPerDay = Math.min(8, Math.max(1, Number(input?.targetBlocksPerDay ?? input?.blocksPerDay) || inferredBlocks));
        const source = input?.availability && typeof input.availability === 'object' && !Array.isArray(input.availability) ? input.availability : null;
        const availability = {};
        days.forEach(day => {
            const fallback = [{ start: startTime, end: endTime }];
            const ranges = source && Object.hasOwn(source, day) ? source[day] : fallback;
            const ordered = (Array.isArray(ranges) ? ranges : []).filter(range => validClock(range?.start) && validClock(range?.end) && toMinutes(range.end) > toMinutes(range.start))
                .map(range => ({ start: toMinutes(range.start), end: toMinutes(range.end) })).sort((a, b) => a.start - b.start);
            const merged = [];
            ordered.forEach(range => {
                if (merged.length && range.start <= merged.at(-1).end) merged.at(-1).end = Math.max(merged.at(-1).end, range.end);
                else merged.push({ ...range });
            });
            availability[day] = merged.map(range => ({ start: toClock(range.start), end: toClock(range.end) }));
        });
        return {
            startTime,
            endTime,
            studyDays: days.length ? days : [1, 2, 3, 4, 5, 6],
            dailyCapacityMinutes,
            availability,
            mode,
            allowExtraBlocks: mode === 'free' && input?.allowExtraBlocks === true,
            blockMinutes,
            blocksPerDay: targetBlocksPerDay,
            targetBlocksPerDay,
            durationMode,
            minBlockMinutes,
            maxBlockMinutes,
            pauseMinutes,
            pauseMode,
            minPauseMinutes,
            registrationMinutes,
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
    const availableMinutes = (settingsInput, busyByDay = {}) => {
        const settings = normalizeSettings(settingsInput);
        return settings.studyDays.reduce((sum, day) => sum + (settings.availability[day] || []).reduce((total, range) => {
            const start = toMinutes(range.start), end = toMinutes(range.end);
            const busy = (Array.isArray(busyByDay[day]) ? busyByDay[day] : []).filter(item => validClock(item?.start) && validClock(item?.end))
                .map(item => ({ start: Math.max(start, toMinutes(item.start)), end: Math.min(end, toMinutes(item.end)) }))
                .filter(item => item.end > item.start).sort((a, b) => a.start - b.start);
            const merged = [];
            busy.forEach(item => {
                if (merged.length && item.start <= merged.at(-1).end) merged.at(-1).end = Math.max(merged.at(-1).end, item.end);
                else merged.push({ ...item });
            });
            return total + end - start - merged.reduce((minutes, item) => minutes + item.end - item.start, 0);
        }, 0), 0);
    };
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
    function organize(subjectsInput, settingsInput, weekKey, options = {}) {
        const settings = normalizeSettings(settingsInput);
        const subjects = (Array.isArray(subjectsInput) ? subjectsInput : []).map(subjectConfig).filter(subject => subject.subject && subject.weeklyBlocks > 0);
        subjects.sort((a, b) => b.priority - a.priority || b.weeklyBlocks - a.weeklyBlocks || a.subject.localeCompare(b.subject, 'pt-BR'));
        const reserved = Array.isArray(options.reservedBlocks) ? options.reservedBlocks.filter(block => settings.studyDays.includes(Number(block.day)) && validClock(block.start)) : [];
        const busyByDay = options.busyByDay && typeof options.busyByDay === 'object' ? options.busyByDay : {};
        const earliestByDay = options.earliestByDay && typeof options.earliestByDay === 'object' ? options.earliestByDay : {};
        const units = [];
        subjects.forEach(subject => {
            let remaining = Math.max(0, subject.weeklyBlocks - reserved.filter(block => String(block.subjectId) === String(subject.id)).length);
            while (remaining > 0) {
                const size = subject.consecutive && remaining >= 2 ? 2 : 1;
                units.push({ subject, size, sequence: units.length });
                remaining -= size;
            }
        });
        const states = settings.studyDays.map(day => ({ day, blocks: [], subjects: new Set(reserved.filter(block => Number(block.day) === day).map(block => String(block.subjectId))),
            occupied: [
                ...reserved.filter(block => Number(block.day) === day).map(block => ({ start: toMinutes(block.start), end: toMinutes(block.start) + Number(block.duration || settings.blockMinutes) })),
                ...(Array.isArray(busyByDay[day]) ? busyByDay[day] : []).filter(range => validClock(range?.start) && validClock(range?.end)).map(range => ({ start: toMinutes(range.start), end: toMinutes(range.end) }))
            ], reservedCount: reserved.filter(block => Number(block.day) === day).length }));
        const subjectDayUse = new Map();
        reserved.forEach(block => {
            const key = String(block.subjectId);
            if (!subjectDayUse.has(key)) subjectDayUse.set(key, new Set());
            subjectDayUse.get(key).add(Number(block.day));
        });
        let idSeed = Date.now();
        const unscheduled = new Map();
        const findSlot = (state, unit) => {
            const duration = unit.size * settings.blockMinutes;
            const ranges = settings.availability[state.day] || [];
            for (let index = 0; index < ranges.length; index++) {
                const range = ranges[index];
                const limit = toMinutes(range.end) - (index === ranges.length - 1 ? settings.closingMinutes : 0);
                let start = Math.max(toMinutes(range.start), validClock(earliestByDay[state.day]) ? toMinutes(earliestByDay[state.day]) : 0);
                while (start + duration <= limit) {
                    const collision = state.occupied
                        .filter(item => item.end + settings.pauseMinutes > start && item.start - settings.pauseMinutes < start + duration)
                        .sort((a, b) => a.start - b.start)[0];
                    if (!collision) return start;
                    start = Math.max(start + 1, collision.end + settings.pauseMinutes);
                }
            }
            return null;
        };
        units.forEach(unit => {
            const uses = subjectDayUse.get(String(unit.subject.id)) || new Set();
            const ranked = states.map(state => {
                const start = findSlot(state, unit);
                if (start === null) return null;
                const newSubject = !state.subjects.has(String(unit.subject.id));
                const overPreferred = newSubject && state.subjects.size >= settings.maxSubjectsPerDay;
                const repeatPenalty = uses.has(state.day) ? 34 : 0;
                const adjacentPenalty = uses.has(state.day - 1) || uses.has(state.day + 1) ? 10 : 0;
                const capacity = (settings.availability[state.day] || []).reduce((sum, range) => sum + toMinutes(range.end) - toMinutes(range.start), 0);
                const score = (overPreferred ? 1000 : 0) + ((state.blocks.length + state.reservedCount) * settings.blockMinutes / Math.max(1, capacity)) * 100 + repeatPenalty + adjacentPenalty + state.day / 100;
                return { state, score, start };
            }).filter(Boolean).sort((a, b) => a.score - b.score || a.state.day - b.state.day);
            const chosen = ranked[0];
            if (!chosen) { unscheduled.set(unit.subject.id, (unscheduled.get(unit.subject.id) || 0) + unit.size); return; }
            chosen.state.occupied.push({ start: chosen.start, end: chosen.start + unit.size * settings.blockMinutes });
            for (let index = 0; index < unit.size; index++) {
                chosen.state.blocks.push({
                    id: idSeed++,
                    subjectId: unit.subject.id,
                    day: chosen.state.day,
                    start: toClock(chosen.start + index * settings.blockMinutes),
                    duration: settings.blockMinutes,
                    status: 'pending',
                    order: 0,
                    group: unit.size > 1 ? `${unit.subject.id}-${unit.sequence}` : ''
                });
            }
            chosen.state.subjects.add(String(unit.subject.id));
            uses.add(chosen.state.day);
            subjectDayUse.set(String(unit.subject.id), uses);
        });
        const blocks = states.flatMap(state => state.blocks.sort((a, b) => toMinutes(a.start) - toMinutes(b.start)).map((block, index) => ({ ...block, order: index })));
        const warnings = states.filter(state => state.subjects.size > settings.maxSubjectsPerDay).map(state => state.day);
        return { key: monday(weekKey || new Date()), blocks, dailyClosures: {}, warnings,
            unscheduled: subjects.filter(subject => unscheduled.has(subject.id)).map(subject => ({ subjectId: subject.id, subject: subject.subject, blocks: unscheduled.get(subject.id) })), generatedAt: Date.now() };
    }
    function copyWeek(week, nextKey) {
        return {
            key: monday(nextKey),
            blocks: (week?.blocks || []).map((block, index) => ({ ...block, id: Date.now() + index, status: 'pending', registered: false, result: null })),
            dailyClosures: {}, warnings: [...(week?.warnings || [])],
            dayPlans: Object.fromEntries(Object.entries(week?.dayPlans || {}).map(([day, plan]) => [day, { ...plan }])),
            strict: Boolean(week?.strict), copiedAt: Date.now()
        };
    }
    function clearAllBlocks(weeks) {
        let removed = 0;
        for (const entry of Object.values(weeks || {})) {
            if (!entry || typeof entry !== 'object') continue;
            removed += (Array.isArray(entry.blocks) ? entry.blocks.length : 0)
                + (Array.isArray(entry.archivedCompletedBlocks) ? entry.archivedCompletedBlocks.length : 0);
            entry.blocks = [];
            entry.archivedCompletedBlocks = [];
            entry.unscheduled = [];
            entry.warnings = [];
            entry.dayPlans = {};
            entry.strict = false;
        }
        return removed;
    }
    function detachPendingSessions(weeks, sessions) {
        if (!Array.isArray(sessions)) return 0;
        const entries = Object.entries(weeks || {});
        const detached = new Set();
        sessions.forEach(session => {
            if (!session || typeof session !== 'object') return;
            const blockId = String(session.scheduleBlockId ?? '').trim();
            if (!blockId) return;
            const preferred = entries.find(([key]) => key === session.scheduleWeekKey);
            const search = preferred ? [preferred, ...entries.filter(([key]) => key !== preferred[0])] : entries;
            const found = search.map(([key, week]) => ({ key, block: (Array.isArray(week?.blocks) ? week.blocks : []).find(block => String(block?.id) === blockId) }))
                .find(item => item.block);
            const day = Number(found?.block?.day);
            session.detachedScheduleDay = Number.isInteger(day) && day >= 1 && day <= 7 ? day : 0;
            if (found) session.scheduleWeekKey = found.key;
            session.scheduleBlockId = '';
            session.detachedFromSchedule = true;
            detached.add(session.id == null ? session : String(session.id));
        });
        return detached.size;
    }
    globalThis.KingScheduleCore = { iso, fromIso, monday, addDays, toMinutes, toClock, addMinutes, normalizeSettings, availableMinutes, subjectConfig, arrangeTimes, organize, copyWeek, clearAllBlocks, detachPendingSessions };
})();
