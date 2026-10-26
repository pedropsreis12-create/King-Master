/* Cronometragem por questão, sem DOM ou chamadas externas. */
(function (root, factory) {
    const api = factory();
    if (typeof module === 'object' && module.exports) module.exports = api;
    root.KingQuestionPaceCore = api;
})(typeof globalThis !== 'undefined' ? globalThis : window, function () {
    const outcomes = new Set(['hit', 'miss', 'skip']);
    const causes = new Set(['conteudo', 'interpretacao', 'calculo', 'atencao', 'estrategia']);
    const limit = (value, min, max, fallback) => Number.isFinite(Number(value)) ? Math.min(max, Math.max(min, Math.floor(Number(value)))) : fallback;

    function start(options, now = Date.now()) {
        const subjectId = String(options.subjectId || '').slice(0, 80);
        const subject = String(options.subject || '').trim().slice(0, 60);
        const topic = String(options.topic || '').trim().slice(0, 100);
        if (!subjectId || !subject || !topic) throw new Error('Escolha uma matéria e informe o assunto.');
        return {
            id: String(options.id || `questoes-${now}`).slice(0, 100), accountUid: String(options.accountUid || '').slice(0, 128),
            subjectId, subject, topic, count: limit(options.count, 1, 60, 20),
            budgetSeconds: options.budgetMinutes ? limit(options.budgetMinutes, 1, 240, 0) * 60 : 0,
            hideClock: options.hideClock !== false, createdAt: now, updatedAt: now,
            status: 'running', runningSince: now, elapsedMs: 0, records: []
        };
    }

    function elapsedSeconds(draft, now = Date.now()) {
        if (!draft) return 0;
        const live = draft.status === 'running' && Number(draft.runningSince) > 0
            ? Math.max(0, Number(now) - Number(draft.runningSince)) : 0;
        return Math.max(0, Math.floor((Math.max(0, Number(draft.elapsedMs) || 0) + live) / 1000));
    }

    function pause(draft, now = Date.now()) {
        if (draft?.status !== 'running') return draft;
        return { ...draft, elapsedMs: elapsedSeconds(draft, now) * 1000, runningSince: 0, status: 'paused', updatedAt: now };
    }

    function resume(draft, now = Date.now()) {
        if (draft?.status !== 'paused') return draft;
        return { ...draft, runningSince: now, status: 'running', updatedAt: now };
    }

    function record(draft, outcome, cause = '', reference = '', now = Date.now()) {
        if (draft?.status !== 'running' || !outcomes.has(outcome) || draft.records.length >= draft.count) return null;
        if (outcome === 'miss' && !causes.has(cause)) return null;
        const seconds = Math.max(1, elapsedSeconds(draft, now));
        const records = [...draft.records, {
            number: draft.records.length + 1, seconds, outcome, cause: outcome === 'miss' ? cause : '',
            reference: String(reference || '').trim().slice(0, 120), finishedAt: now
        }];
        return { ...draft, records, status: records.length >= draft.count ? 'summary' : 'running',
            elapsedMs: 0, runningSince: records.length >= draft.count ? 0 : now, updatedAt: now };
    }

    function finish(draft, now = Date.now()) {
        if (!draft?.records?.length) return null;
        return { ...draft, status: 'summary', elapsedMs: 0, runningSince: 0, updatedAt: now };
    }

    function summary(records = [], budgetSeconds = 0, count = 0) {
        const rows = Array.isArray(records) ? records : [];
        const hits = rows.filter(row => row.outcome === 'hit');
        const misses = rows.filter(row => row.outcome === 'miss');
        const skips = rows.filter(row => row.outcome === 'skip');
        const totalSeconds = rows.reduce((sum, row) => sum + Math.max(0, Number(row.seconds) || 0), 0);
        const average = group => group.length ? Math.round(group.reduce((sum, row) => sum + (Number(row.seconds) || 0), 0) / group.length) : 0;
        const targetSeconds = budgetSeconds > 0 && count > 0 ? Math.round(budgetSeconds / count) : 0;
        return {
            total: rows.length, attempted: hits.length + misses.length, hits: hits.length, misses: misses.length, skips: skips.length,
            totalSeconds, averageSeconds: average(rows), hitAverageSeconds: average(hits), missAverageSeconds: average(misses),
            accuracy: hits.length + misses.length ? Math.round(hits.length / (hits.length + misses.length) * 100) : 0,
            targetSeconds, overTarget: targetSeconds ? rows.filter(row => Number(row.seconds) > targetSeconds).length : 0
        };
    }

    function restore(raw, accountUid = '') {
        if (!raw || typeof raw !== 'object' || String(raw.accountUid || '') !== String(accountUid || '')) return null;
        if (!['running', 'paused', 'summary'].includes(raw.status) || !Array.isArray(raw.records)) return null;
        const records = raw.records.slice(0, 60).filter(row => outcomes.has(row.outcome)).map((row, index) => ({
            number: index + 1, seconds: limit(row.seconds, 1, 14400, 1), outcome: row.outcome,
            cause: causes.has(row.cause) ? row.cause : '', reference: String(row.reference || '').slice(0, 120),
            errorId: Number(row.errorId) || null, finishedAt: Number(row.finishedAt) || 0
        }));
        return {
            ...raw, id: String(raw.id || '').slice(0, 100), subjectId: String(raw.subjectId || '').slice(0, 80),
            subject: String(raw.subject || '').slice(0, 60), topic: String(raw.topic || '').slice(0, 100),
            count: limit(raw.count, 1, 60, 20), budgetSeconds: limit(raw.budgetSeconds, 0, 14400, 0),
            hideClock: raw.hideClock !== false, records,
            status: raw.status === 'running' ? 'paused' : raw.status,
            runningSince: 0, elapsedMs: Math.max(0, Number(raw.elapsedMs) || 0)
        };
    }

    return { start, elapsedSeconds, pause, resume, record, finish, summary, restore };
});
