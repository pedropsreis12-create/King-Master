/* Identidade e hierarquia dos assuntos; migração aditiva de dados antigos. */
(function (root, factory) {
    const api = factory();
    if (typeof module !== 'undefined' && module.exports) module.exports = api;
    root.KingTopicCore = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
    const key = value => String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('pt-BR').trim();
    const makeId = prefix => `${prefix}-${typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2, 12)}`}`;
    const subjects = data => Array.isArray(data?.cycleItems) ? data.cycleItems : [];
    function findById(data, topicId) {
        if (!topicId) return null;
        for (const subject of subjects(data)) {
            const index = (subject.topicos || []).findIndex(topic => String(topic?.id || '') === String(topicId));
            if (index >= 0) return { subject, topic: subject.topicos[index], index };
        }
        return null;
    }
    function findByName(data, subjectRef, topicName) {
        if (!key(topicName)) return null;
        const matches = subjects(data).filter(subject => String(subject.id) === String(subjectRef)
            || key(subject.subject) === key(subjectRef));
        for (const subject of matches) {
            const index = (subject.topicos || []).findIndex(topic => key(topic?.nome) === key(topicName));
            if (index >= 0) return { subject, topic: subject.topicos[index], index };
        }
        return null;
    }
    function ensureIds(data) {
        let changed = 0;
        const used = new Set();
        subjects(data).forEach(subject => {
            if (!Array.isArray(subject.temas)) { subject.temas = []; changed++; }
            subject.temas.forEach(theme => {
                if (!theme.id || used.has(String(theme.id))) { theme.id = makeId('tema'); changed++; }
                used.add(String(theme.id));
                if (!Number.isFinite(Number(theme.ordem))) { theme.ordem = subject.temas.indexOf(theme); changed++; }
            });
            (subject.topicos || []).forEach(topic => {
                if (!topic || typeof topic !== 'object') return;
                if (!topic.id || used.has(String(topic.id))) { topic.id = makeId('assunto'); changed++; }
                used.add(String(topic.id));
                if (topic.temaId && !subject.temas.some(theme => String(theme.id) === String(topic.temaId))) { topic.temaId = ''; changed++; }
            });
        });
        return changed;
    }
    function linkRecord(data, item, subjectRef, topicName) {
        if (!item || item.topicId || !key(topicName)) return 0;
        const found = findByName(data, subjectRef, topicName);
        if (!found) return 0;
        item.topicId = found.topic.id;
        return 1;
    }
    function migrate(data) {
        let changed = ensureIds(data);
        for (const item of data.historyItems || []) changed += linkRecord(data, item, item.subjectId || item.materia, item.assunto);
        for (const item of data.revisoesItems || []) changed += linkRecord(data, item, item.materiaIds?.[0] || item.materia, item.assunto);
        for (const item of data.cadernoErrosItems || []) changed += linkRecord(data, item, item.materia, item.assunto);
        for (const item of data.practiceSessions || []) changed += linkRecord(data, item, item.subjectId || item.subject, item.topic);
        for (const deck of data.flashcards?.decks || []) changed += linkRecord(data, deck, deck.subjectId || deck.subjectIds?.[0], deck.topic);
        return changed;
    }
    function renameLinked(data, subject, topic, oldName, newName) {
        let changed = 0;
        const collections = [data.historyItems, data.revisoesItems, data.cadernoErrosItems, data.practiceSessions, data.flashcards?.decks];
        for (const collection of collections) for (const item of collection || []) {
            const nameField = Object.prototype.hasOwnProperty.call(item, 'assunto') ? 'assunto' : 'topic';
            const matchById = topic.id && String(item.topicId || '') === String(topic.id);
            const belongs = String(item.subjectId || item.materiaIds?.[0] || '') === String(subject.id)
                || key(item.materia || item.subject) === key(subject.subject);
            const matchLegacy = !item.topicId && belongs && key(item[nameField]) === key(oldName);
            if (!matchById && !matchLegacy) continue;
            item[nameField] = newName;
            item.topicId = topic.id;
            changed++;
        }
        return changed;
    }
    function createTheme(subject, name) {
        const clean = String(name || '').trim().slice(0, 60);
        if (!clean) return null;
        if (!Array.isArray(subject.temas)) subject.temas = [];
        const existing = subject.temas.find(theme => key(theme.nome) === key(clean));
        if (existing) return existing;
        const theme = { id: makeId('tema'), nome: clean, ordem: subject.temas.length };
        subject.temas.push(theme);
        return theme;
    }
    function parseTopicInput(subject, value) {
        const raw = String(value || '').trim().slice(0, 170);
        const colon = raw.indexOf(':');
        if (colon < 1 || colon > 60 || !raw.slice(colon + 1).trim()) return { nome: raw.slice(0, 100), temaId: '' };
        const theme = createTheme(subject, raw.slice(0, colon));
        return { nome: raw.slice(colon + 1).trim().slice(0, 100), temaId: theme?.id || '' };
    }
    return { key, makeId, findById, findByName, ensureIds, migrate, renameLinked, createTheme, parseTopicInput };
});
