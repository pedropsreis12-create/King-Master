(() => {
    'use strict';

    const VERSION = 2;
    const ADAPTER_KEY = 'rankV2Integration';
    const MAX_SEEN_EVIDENCE = 3500;
    const BLOOM_BITS = 65536;
    const BLOOM_BYTES = BLOOM_BITS / 8;
    const BLOOM_HASHES = 4;
    const SCAN_DEBOUNCE_MS = 80;
    const SAVE_DEBOUNCE_MS = 60;

    let initialized = false;
    let readyDispatched = false;
    let scanning = false;
    let rescanRequested = false;
    let persisting = false;
    let persistRequested = false;
    let claimingMission = false;
    let scanTimer = 0;
    let saveTimer = 0;
    let bootTimer = 0;
    let bootAttempts = 0;

    const isObject = value => Boolean(value) && typeof value === 'object' && !Array.isArray(value);
    const asArray = value => Array.isArray(value) ? value : [];
    const finite = (value, fallback = 0) => Number.isFinite(Number(value)) ? Number(value) : fallback;
    const nonNegative = value => Math.max(0, finite(value));
    const text = value => String(value ?? '').replace(/\s+/g, ' ').trim();

    function rankApi() {
        const api = window.KingRankV2;
        return api && typeof api.migrate === 'function' && typeof api.recordBatch === 'function'
            && typeof api.syncAchievements === 'function' && typeof api.claimMission === 'function' ? api : null;
    }

    function readAppData() {
        try {
            if (typeof appData !== 'undefined' && isObject(appData)) return appData;
        } catch { /* O binding global pode ainda não existir durante a carga. */ }
        return null;
    }

    function replaceAppData(next) {
        if (!isObject(next)) return false;
        try {
            if (typeof appData !== 'undefined') {
                appData = next;
                return true;
            }
        } catch { /* Nunca cria uma cópia em window que divergiria do binding lexical. */ }
        return false;
    }

    function localOptions(now = Date.now()) {
        const instant = Number.isFinite(Number(now)) && Number(now) > 0 ? Math.round(Number(now)) : Date.now();
        return {
            now: instant,
            utcOffsetMinutes: -new Date(instant).getTimezoneOffset(),
            allowHistorical: true
        };
    }

    function dispatch(name, detail = {}) {
        try {
            window.dispatchEvent(new CustomEvent(name, { detail }));
        } catch { /* A integração continua funcional mesmo sem um consumidor de UI. */ }
    }

    function toast(message, isError = false) {
        const safeMessage = text(message).slice(0, 240);
        if (!safeMessage) return;
        try {
            if (typeof showToast === 'function') {
                showToast(safeMessage, Boolean(isError));
                return;
            }
        } catch { /* Tenta a propriedade global usada por integrações opcionais. */ }
        try { window.showToast?.(safeMessage, Boolean(isError)); } catch { /* Sem UI de toast. */ }
    }

    function hash(value, seed = 2166136261) {
        let result = seed >>> 0;
        const source = String(value ?? '');
        for (let index = 0; index < source.length; index++) {
            result ^= source.charCodeAt(index);
            result = Math.imul(result, 16777619);
        }
        return result >>> 0;
    }

    function sanitizedToken(value, fallback = 'item') {
        const raw = text(value);
        if (!raw) return `auto-${hash(fallback).toString(36)}`;
        if (/^[\w:.-]{1,100}$/u.test(raw)) return raw;
        const cleaned = raw.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
            .replace(/[^a-zA-Z0-9_.:-]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 72);
        return `${cleaned || 'item'}-${hash(raw).toString(36)}`;
    }

    function itemToken(item, index, fallbackParts = []) {
        const explicit = item?.id ?? item?.uuid ?? item?.key ?? item?._id;
        if (explicit !== undefined && explicit !== null && text(explicit)) return sanitizedToken(explicit, fallbackParts.join('|'));
        return `auto-${hash([...fallbackParts, index].map(text).join('|')).toString(36)}`;
    }

    function eventId(namespace, token, suffix) {
        let id = `${namespace}:${sanitizedToken(token, namespace)}:${suffix}`;
        if (id.length > 180) id = `${namespace}:auto-${hash(id).toString(36)}:${suffix}`;
        return /^[\w:.-]{3,180}$/u.test(id) ? id : `event:auto-${hash(id).toString(36)}:${suffix}`;
    }

    function timestamp(value) {
        if (value instanceof Date) return Number.isNaN(value.getTime()) ? 0 : value.getTime();
        if (typeof value === 'string') {
            const source = value.trim();
            const localDate = source.match(/^(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{2}):(\d{2})(?::(\d{2}))?)?$/);
            if (localDate) {
                const parsed = new Date(Number(localDate[1]), Number(localDate[2]) - 1, Number(localDate[3]),
                    Number(localDate[4] ?? 12), Number(localDate[5] ?? 0), Number(localDate[6] ?? 0), 0);
                return Number.isNaN(parsed.getTime()) ? 0 : parsed.getTime();
            }
            if (source && !/^\d+(?:\.\d+)?$/.test(source)) {
                const parsed = Date.parse(source);
                return Number.isNaN(parsed) ? 0 : parsed;
            }
        }
        let numeric = finite(value, 0);
        if (numeric >= 1000000000 && numeric < 100000000000) numeric *= 1000;
        return numeric >= 946684800000 ? Math.round(numeric) : 0;
    }

    function firstTimestamp(...values) {
        for (const value of values) {
            const parsed = timestamp(value);
            if (parsed > 0) return parsed;
        }
        return 0;
    }

    function legacyHistoryTimestamp(item) {
        const direct = firstTimestamp(item?.completedAt, item?.createdAt, item?.criadoEm, item?.id, item?.dataISO, item?.date);
        if (direct) return direct;
        const legacy = text(item?.dataChave).match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
        if (!legacy) return 0;
        const parsed = new Date(Number(legacy[1]), Number(legacy[2]), Number(legacy[3]), 12, 0, 0, 0);
        return Number.isNaN(parsed.getTime()) ? 0 : parsed.getTime();
    }

    function occurrence(value, now) {
        const parsed = timestamp(value) || now;
        if (parsed <= now) return parsed;
        const candidate = new Date(parsed);
        const current = new Date(now);
        const sameLocalDay = candidate.getFullYear() === current.getFullYear()
            && candidate.getMonth() === current.getMonth() && candidate.getDate() === current.getDate();
        return sameLocalDay ? now : parsed;
    }

    function statusOf(item) {
        return text(item?.status ?? item?.estado).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
    }

    function substantive(item, fields) {
        if (!isObject(item)) return false;
        if (item.id !== undefined && item.id !== null && text(item.id)) return true;
        return fields.some(field => text(item[field]));
    }

    function collectEvidence(data, now, Rank) {
        const events = new Map();
        const options = localOptions(now);
        const add = ({ id, type, quantity = 1, occurredAt, source, meta = {} }) => {
            const units = Math.max(0, Math.round(finite(quantity)));
            if (!units || !Rank.ACTIONS?.[type]) return;
            const at = occurrence(occurredAt, options.now);
            if (!at || at > options.now + 5 * 60000) return;
            const event = { id, type, quantity: units, occurredAt: at, source, meta };
            if (typeof Rank.dateKeyFromTimestamp === 'function') {
                event.dateKey = Rank.dateKeyFromTimestamp(at, options.utcOffsetMinutes);
            }
            if (!events.has(id)) events.set(id, event);
        };

        asArray(data.historyItems).forEach((item, index) => {
            if (!isObject(item)) return;
            const seconds = nonNegative(item.tempoSegundos ?? item.studySeconds ?? item.seconds ?? item.durationSeconds);
            const explicitQuestions = nonNegative(item.questoes ?? item.questions ?? item.total);
            const correct = nonNegative(item.acertos ?? item.hits ?? item.correct);
            const errors = nonNegative(item.erros ?? item.errors ?? item.incorrect);
            const blanks = nonNegative(item.brancos ?? item.blanks);
            const answered = Math.max(explicitQuestions, correct + errors + blanks);
            const realSession = seconds >= 5 || item.registroRapido === true || answered > 0
                || item.completed === true || item.concluido === true;
            if (!realSession) return;
            const token = itemToken(item, index, [item.sourceSessionId, item.dataISO, item.materia, item.assunto, item.tipo]);
            const at = legacyHistoryTimestamp(item) || now;
            const meta = { subjectId: item.subjectId, subject: item.materia ?? item.subject, topic: item.assunto ?? item.topic };
            add({ id: eventId('history', token, 'session'), type: 'study_session', occurredAt: at, source: 'study-history', meta });
            const minutes = Math.floor(seconds / 60);
            if (minutes) add({ id: eventId('history', token, 'minutes'), type: 'study_minutes', quantity: minutes, occurredAt: at, source: 'study-history', meta });
            if (answered) add({ id: eventId('history', token, 'questions'), type: 'questions_answered', quantity: answered, occurredAt: at, source: 'study-history', meta });
            if (correct) add({ id: eventId('history', token, 'correct'), type: 'questions_correct', quantity: Math.min(answered || correct, correct), occurredAt: at, source: 'study-history', meta });
        });

        asArray(data.xpLoginDates).forEach(value => {
            const dateKey = text(value);
            if (!/^\d{4}-\d{2}-\d{2}$/.test(dateKey)) return;
            const at = occurrence(timestamp(`${dateKey}T12:00:00`), now);
            add({
                id: eventId('login', dateKey, 'daily'),
                type: 'daily_login',
                occurredAt: at,
                source: 'daily-login'
            });
        });

        asArray(data.revisoesItems ?? data.reviews).forEach((item, index) => {
            if (!isObject(item)) return;
            const completedAt = firstTimestamp(item.revisadoEm, item.completedAt, item.concluidoEm, item.updatedAt, item.atualizadoEm);
            const completed = completedAt > 0 || item.completed === true || item.done === true || item.concluido === true
                || ['revisado', 'completed', 'done', 'concluido', 'concluida'].includes(statusOf(item));
            if (!completed) return;
            const token = itemToken(item, index, [item.criadoEm, item.materia, item.assunto, item.origem]);
            add({
                id: eventId('review', token, 'completed'), type: 'review_completed', occurredAt: completedAt || firstTimestamp(item.criadoEm, item.id) || now,
                source: 'scheduled-review', meta: { subject: item.materia ?? item.subject, topic: item.assunto ?? item.topic, scheduleBlockId: item.scheduleBlockId }
            });
        });

        asArray(data.flashcards?.reviews ?? data.flashcardReviews).forEach((item, index) => {
            if (!substantive(item, ['cardId', 'rating', 'at'])) return;
            const token = itemToken(item, index, [item.cardId, item.at, item.rating]);
            add({
                id: eventId('flashcard', token, 'reviewed'), type: 'flashcard_reviewed', occurredAt: firstTimestamp(item.at, item.reviewedAt, item.createdAt) || now,
                source: 'flashcards', meta: { result: item.rating, topic: item.topic }
            });
        });

        asArray(data.cadernoErrosItems ?? data.errorNotebookItems).forEach((item, index) => {
            if (!substantive(item, ['materia', 'assunto', 'questao', 'regra'])) return;
            const token = itemToken(item, index, [item.criadoEm, item.materia, item.assunto, item.questao]);
            const meta = { subject: item.materia ?? item.subject, topic: item.assunto ?? item.topic, result: item.tipo ?? item.type };
            add({ id: eventId('error', token, 'logged'), type: 'error_logged', occurredAt: firstTimestamp(item.criadoEm, item.createdAt, item.id) || now, source: 'error-notebook', meta });
            const mastered = item.mastered === true || item.dominado === true || ['dominado', 'mastered'].includes(statusOf(item));
            if (mastered) add({
                id: eventId('error', token, 'mastered'), type: 'error_mastered',
                occurredAt: firstTimestamp(item.ultimaRevisaoEm, item.masteredAt, item.dominadoEm, item.atualizadoEm, item.updatedAt) || now,
                source: 'error-notebook', meta
            });
        });

        asArray(data.redacaoItems ?? data.essays).forEach((item, index) => {
            if (!substantive(item, ['theme', 'tema', 'date', 'data'])) return;
            const token = itemToken(item, index, [item.date, item.data, item.theme, item.tema, item.createdAt]);
            add({
                id: eventId('essay', token, 'completed'), type: 'essay_completed',
                occurredAt: firstTimestamp(item.completedAt, item.date, item.data, item.createdAt, item.id) || now,
                source: 'essay-log', meta: { topic: item.theme ?? item.tema, result: item.status }
            });
        });

        asArray(data.simuladosItems ?? data.mockExams).forEach((item, index) => {
            if (!substantive(item, ['title', 'titulo', 'date', 'area', 'total'])) return;
            const token = itemToken(item, index, [item.date, item.title, item.titulo, item.area, item.createdAt]);
            const at = firstTimestamp(item.completedAt, item.date, item.createdAt, item.id) || now;
            const meta = { subject: item.area ?? item.subject, topic: item.title ?? item.titulo, result: item.format };
            add({ id: eventId('mock', token, 'completed'), type: 'mock_exam_completed', occurredAt: at, source: 'mock-exam-log', meta });
            if (text(item.format).toLowerCase() !== 'sessao') {
                const correct = nonNegative(item.acertos ?? item.hits ?? item.correct);
                const errors = nonNegative(item.erros ?? item.errors ?? item.incorrect);
                const blanks = nonNegative(item.brancos ?? item.blanks);
                const answered = Math.max(nonNegative(item.total ?? item.questoes ?? item.questions), correct + errors + blanks);
                if (answered) add({ id: eventId('mock', token, 'questions'), type: 'questions_answered', quantity: answered, occurredAt: at, source: 'mock-exam-log', meta });
                if (correct) add({ id: eventId('mock', token, 'correct'), type: 'questions_correct', quantity: Math.min(answered || correct, correct), occurredAt: at, source: 'mock-exam-log', meta });
            }
        });

        asArray(data.cycleItems ?? data.subjects).forEach((subject, subjectIndex) => {
            if (!isObject(subject)) return;
            const subjectToken = itemToken(subject, subjectIndex, [subject.subject, subject.name]);
            asArray(subject.topicos ?? subject.topics).forEach((topic, topicIndex) => {
                if (!isObject(topic)) return;
                const mastered = topic.concluido === true || topic.completed === true || topic.mastered === true
                    || nonNegative(topic.nivelDominio ?? topic.masteryLevel) >= 3 || ['dominado', 'mastered'].includes(statusOf(topic));
                if (!mastered) return;
                const token = itemToken(topic, topicIndex, [subjectToken, topic.nome, topic.name]);
                add({
                    id: eventId(`topic-${subjectToken}`, token, 'mastered'), type: 'topic_mastered',
                    occurredAt: firstTimestamp(topic.masteredAt, topic.dominadoEm, topic.updatedAt, topic.atualizadoEm, topic.ultimoEstudoEm) || now,
                    source: 'subject-topics', meta: { subjectId: subject.id, subject: subject.subject ?? subject.name, topic: topic.nome ?? topic.name }
                });
            });
        });

        const scheduleSources = [];
        if (isObject(data.studySchedule?.weeks)) scheduleSources.push(...Object.entries(data.studySchedule.weeks));
        if (isObject(data.scheduleWeeks)) scheduleSources.push(...Object.entries(data.scheduleWeeks));
        if (Array.isArray(data.studySchedule?.blocks)) scheduleSources.push(['legacy', { blocks: data.studySchedule.blocks }]);
        if (Array.isArray(data.scheduleBlocks)) scheduleSources.push(['legacy-blocks', { blocks: data.scheduleBlocks }]);
        const scheduleKeys = new Set();
        scheduleSources.forEach(([weekKey, week]) => {
            asArray(week?.blocks).forEach((block, index) => {
                if (!isObject(block)) return;
                const completed = block.completed === true || block.done === true || block.concluido === true
                    || ['completed', 'done', 'concluido', 'concluida'].includes(statusOf(block));
                if (!completed) return;
                const blockToken = itemToken(block, index, [weekKey, block.day, block.start, block.subjectId, block.topic]);
                const token = sanitizedToken(`${weekKey}.${blockToken}`, `schedule|${weekKey}|${index}`);
                const id = eventId('schedule', token, 'completed');
                if (scheduleKeys.has(id)) return;
                scheduleKeys.add(id);
                add({
                    id, type: 'schedule_block_completed',
                    occurredAt: firstTimestamp(block.result?.completedAt, block.completedAt, block.concluidoEm, block.updatedAt) || now,
                    source: 'study-schedule', meta: { subjectId: block.subjectId, topic: block.result?.topic ?? block.topic, result: block.result?.activity, scheduleBlockId: block.id }
                });
            });
        });

        return [...events.values()];
    }

    function decodeBloom(encoded) {
        if (!encoded) return new Uint8Array(BLOOM_BYTES);
        if (typeof encoded !== 'string' || encoded.length !== BLOOM_BYTES * 2 || !/^[0-9a-f]+$/i.test(encoded)) return null;
        const bytes = new Uint8Array(BLOOM_BYTES);
        for (let index = 0; index < BLOOM_BYTES; index++) bytes[index] = parseInt(encoded.slice(index * 2, index * 2 + 2), 16);
        return bytes;
    }

    function encodeBloom(bytes) {
        let encoded = '';
        for (const byte of bytes) encoded += byte.toString(16).padStart(2, '0');
        return encoded;
    }

    function bloomIndexes(id) {
        const first = hash(id, 2166136261);
        const second = (hash(id, 2246822519) | 1) >>> 0;
        return Array.from({ length: BLOOM_HASHES }, (_, index) => (first + Math.imul(index, second) + index * index) >>> 0)
            .map(value => value % BLOOM_BITS);
    }

    function bloomAdd(bytes, id) {
        bloomIndexes(id).forEach(bit => { bytes[bit >>> 3] |= 1 << (bit & 7); });
    }

    function bloomHas(bytes, id) {
        return bloomIndexes(id).every(bit => Boolean(bytes[bit >>> 3] & (1 << (bit & 7))));
    }

    function uniqueRecent(values, limit = MAX_SEEN_EVIDENCE) {
        const result = [];
        const found = new Set();
        for (let index = values.length - 1; index >= 0 && result.length < limit; index--) {
            const id = text(values[index]);
            if (!id || found.has(id) || !/^[\w:.-]{3,180}$/u.test(id)) continue;
            found.add(id);
            result.push(id);
        }
        return result.reverse();
    }

    function blankAdapterState(now) {
        return { version: VERSION, baselineComplete: true, initializedAt: now, updatedAt: now, seenEvidence: [], seenEvidenceBloom: '' };
    }

    function readAdapterState(data, now) {
        const raw = data?.[ADAPTER_KEY];
        if (!isObject(raw) || Number(raw.version) !== VERSION || raw.baselineComplete !== true || !Array.isArray(raw.seenEvidence)) {
            return { valid: false, changed: false, state: blankAdapterState(now), bloom: new Uint8Array(BLOOM_BYTES) };
        }
        const bloom = decodeBloom(raw.seenEvidenceBloom || '');
        if (!bloom) return { valid: false, changed: false, state: blankAdapterState(now), bloom: new Uint8Array(BLOOM_BYTES) };
        const allSeen = raw.seenEvidence.map(text).filter(Boolean);
        const recent = uniqueRecent(allSeen);
        if (allSeen.length > recent.length) allSeen.forEach(id => bloomAdd(bloom, id));
        const state = {
            version: VERSION,
            baselineComplete: true,
            initializedAt: Math.max(0, Math.round(finite(raw.initializedAt, now))),
            updatedAt: Math.max(0, Math.round(finite(raw.updatedAt, raw.initializedAt || now))),
            seenEvidence: recent,
            seenEvidenceBloom: (raw.seenEvidenceBloom || allSeen.length > recent.length) ? encodeBloom(bloom) : ''
        };
        return { valid: true, changed: JSON.stringify(raw) !== JSON.stringify(state), state, bloom };
    }

    function hasSeen(stateInfo, id) {
        return stateInfo.state.seenEvidence.includes(id)
            || Boolean(stateInfo.state.seenEvidenceBloom && bloomHas(stateInfo.bloom, id));
    }

    function rememberEvidence(stateInfo, ids, now) {
        const additions = uniqueRecent(asArray(ids), Number.MAX_SAFE_INTEGER);
        const combined = [...stateInfo.state.seenEvidence, ...additions];
        const recent = uniqueRecent(combined);
        const needsBloom = Boolean(stateInfo.state.seenEvidenceBloom) || combined.length > MAX_SEEN_EVIDENCE;
        const bloom = stateInfo.bloom || new Uint8Array(BLOOM_BYTES);
        if (needsBloom) combined.forEach(id => bloomAdd(bloom, id));
        return {
            version: VERSION,
            baselineComplete: true,
            initializedAt: stateInfo.state.initializedAt || now,
            updatedAt: now,
            seenEvidence: recent,
            seenEvidenceBloom: needsBloom ? encodeBloom(bloom) : ''
        };
    }

    function schedulePersist() {
        clearTimeout(saveTimer);
        saveTimer = window.setTimeout(() => {
            saveTimer = 0;
            persistNow();
        }, SAVE_DEBOUNCE_MS);
    }

    function persistNow() {
        clearTimeout(saveTimer);
        saveTimer = 0;
        if (persisting) {
            persistRequested = true;
            return false;
        }
        persisting = true;
        let saved = false;
        try {
            if (typeof saveAppData === 'function') {
                saveAppData();
                saved = true;
            }
        } catch (error) {
            console.warn('KingRankV2: não foi possível persistir a integração de ranking.', error);
        } finally {
            persisting = false;
            if (persistRequested) {
                persistRequested = false;
                schedulePersist();
            }
        }
        return saved;
    }

    function applyAchievements(Rank, data, options) {
        try { return Rank.syncAchievements(data, options); }
        catch (error) {
            console.warn('KingRankV2: não foi possível sincronizar conquistas.', error);
            return { appData: data, state: data?.[Rank.STATE_KEY || 'rankV2'], newUnlocks: [] };
        }
    }

    function reconcile(initial = false) {
        if (scanning) {
            rescanRequested = true;
            return;
        }
        const Rank = rankApi();
        const current = readAppData();
        if (!Rank || !current) return;
        scanning = true;
        try {
            const options = localOptions();
            const migration = Rank.migrate(current, options);
            let next = migration.appData;
            let adapter = readAdapterState(next, options.now);
            const evidence = collectEvidence(next, options.now, Rank);
            const firstBaseline = migration.report?.created === true || !adapter.valid;
            let changed = Boolean(migration.report?.changed || adapter.changed);
            let receipts = [];

            if (firstBaseline) {
                adapter = { valid: true, changed: true, state: blankAdapterState(options.now), bloom: new Uint8Array(BLOOM_BYTES) };
                next = { ...next, [ADAPTER_KEY]: rememberEvidence(adapter, evidence.map(item => item.id), options.now) };
                changed = true;
            } else {
                const processed = isObject(next?.[Rank.STATE_KEY || 'rankV2']?.processedEvents)
                    ? next[Rank.STATE_KEY || 'rankV2'].processedEvents : {};
                const fresh = evidence.filter(item => !hasSeen(adapter, item.id) && !processed[item.id]);
                if (fresh.length) {
                    const batch = Rank.recordBatch(next, fresh, options);
                    next = batch.appData;
                    receipts = asArray(batch.receipts);
                    const recordedIds = fresh.filter((item, index) => receipts[index]?.ok === true).map(item => item.id);
                    if (recordedIds.length) {
                        next = { ...next, [ADAPTER_KEY]: rememberEvidence(adapter, recordedIds, options.now) };
                        adapter = readAdapterState(next, options.now);
                        changed = true;
                    } else if (adapter.changed) {
                        next = { ...next, [ADAPTER_KEY]: adapter.state };
                    }
                } else if (adapter.changed) {
                    next = { ...next, [ADAPTER_KEY]: adapter.state };
                }
            }

            const achievements = applyAchievements(Rank, next, options);
            next = achievements.appData;
            if (asArray(achievements.newUnlocks).length) changed = true;

            if (changed && replaceAppData(next)) {
                schedulePersist();
                if (!firstBaseline || asArray(achievements.newUnlocks).length) {
                    dispatch('king-rank-v2-updated', {
                        source: 'rank-integration-v2', reason: firstBaseline ? 'baseline' : 'evidence',
                        receipts, newUnlocks: asArray(achievements.newUnlocks)
                    });
                }
            }

            if (!readyDispatched) {
                readyDispatched = true;
                dispatch('king-rank-v2-ready', { source: 'rank-integration-v2', version: VERSION, baseline: firstBaseline });
            }
        } catch (error) {
            console.warn('KingRankV2: a integração ignorou uma atualização inválida.', error);
        } finally {
            scanning = false;
            if (rescanRequested) {
                rescanRequested = false;
                scheduleScan();
            }
        }
    }

    function scheduleScan() {
        clearTimeout(scanTimer);
        scanTimer = window.setTimeout(() => {
            scanTimer = 0;
            reconcile(false);
        }, SCAN_DEBOUNCE_MS);
    }

    function claimMission(event) {
        const missionId = text(event?.detail?.missionId);
        if (!missionId || claimingMission) return;
        const Rank = rankApi();
        const current = readAppData();
        if (!Rank || !current) {
            toast('O sistema de ranking ainda está carregando. Tente novamente.', true);
            return;
        }
        claimingMission = true;
        let receipt = null;
        let saved = false;
        try {
            const options = localOptions();
            const claimed = Rank.claimMission(current, missionId, options);
            receipt = claimed.receipt;
            const achievements = applyAchievements(Rank, claimed.appData, options);
            if (!replaceAppData(achievements.appData)) throw new Error('Os dados do aplicativo não estão disponíveis.');
            saved = persistNow();

            if (receipt?.status === 'accepted') toast(`Missão resgatada: +${Math.max(0, Math.round(finite(receipt.xp))).toLocaleString('pt-BR')} XP.`);
            else toast(receipt?.reason || 'Não foi possível resgatar esta missão.', receipt?.ok !== true || receipt?.status === 'incomplete');

            dispatch('king-rank-v2-updated', {
                source: 'rank-integration-v2', reason: 'mission-claim', missionId,
                receipt, newUnlocks: asArray(achievements.newUnlocks), persisted: saved
            });
        } catch (error) {
            receipt = { ok: false, status: 'rejected', missionId, reason: 'Não foi possível resgatar esta missão agora.', xp: 0 };
            toast(receipt.reason, true);
            dispatch('king-rank-v2-updated', { source: 'rank-integration-v2', reason: 'mission-claim', missionId, receipt, persisted: false });
            console.warn('KingRankV2: falha ao resgatar missão.', error);
        } finally {
            claimingMission = false;
        }
    }

    function boot() {
        if (initialized) return;
        if (!rankApi() || !readAppData()) {
            if (bootAttempts++ < 12) {
                clearTimeout(bootTimer);
                bootTimer = window.setTimeout(boot, Math.min(1000, 40 * (bootAttempts + 1)));
            }
            return;
        }
        initialized = true;
        reconcile(true);
    }

    window.addEventListener('king-master-data-changed', () => {
        if (persisting) return;
        if (!initialized) boot();
        else scheduleScan();
    });
    window.addEventListener('king-rank-mission-claim', claimMission);
    window.addEventListener('pageshow', () => { if (initialized) scheduleScan(); else boot(); });

    window.KingRankIntegrationV2 = Object.freeze({
        VERSION,
        refresh: scheduleScan,
        getState: () => {
            const data = readAppData();
            const state = data?.[ADAPTER_KEY];
            return isObject(state) ? { version: state.version, baselineComplete: state.baselineComplete === true, seenEvidence: asArray(state.seenEvidence).length } : null;
        }
    });

    boot();
})();
