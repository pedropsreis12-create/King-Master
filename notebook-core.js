(function (root, factory) {
    const api = factory();
    if (typeof module === 'object' && module.exports) module.exports = api;
    root.KingNotebookCore = api;
})(typeof globalThis !== 'undefined' ? globalThis : window, function () {
    const key = value => String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('pt-BR').trim();
    function collect(data) {
        const results = [];
        const subjects = data.cycleItems || [];
        for (const subject of subjects) for (const topic of subject.topicos || []) {
            const theme = (subject.temas || []).find(item => item.id === topic.temaId);
            for (const page of topic.caderno?.paginas || []) {
                const context = { subject: subject.subject, subjectId: subject.id, theme: theme?.nome || 'Conteúdo geral', themeId: theme?.id || '', topic: topic.nome, topicId: topic.id, source: 'caderno' };
                results.push({ ...context, id: `pagina:${page.id}`, kind: 'pagina', title: page.titulo || 'Página sem título', text: page.texto || '', date: page.atualizadoEm || page.criadoEm || 0, pageId: page.id });
                for (const highlight of page.destaques || []) results.push({ ...context, id: `destaque:${page.id}:${highlight.id}`, kind: 'destaque', title: highlight.trecho || '', text: highlight.comentario || '', color: highlight.cor || 'amarelo', date: highlight.criadoEm || 0, pageId: page.id, stale: !String(page.texto || '').includes(highlight.trecho || '\u0000') });
            }
        }
        for (const error of data.cadernoErrosItems || []) {
            const found = subjects.flatMap(subject => (subject.topicos || []).map(topic => ({ subject, topic }))).find(pair => String(pair.topic.id) === String(error.topicId || '#') || (key(pair.subject.subject) === key(error.materia) && key(pair.topic.nome) === key(error.assunto)));
            const theme = found?.subject.temas?.find(item => item.id === found?.topic.temaId);
            results.push({ id: `erro:${error.id}`, kind: 'erro', title: error.regra || 'Regra anti-erro', text: error.questao || '', subject: error.materia, subjectId: found?.subject.id || '', theme: theme?.nome || 'Conteúdo geral', themeId: theme?.id || '', topic: error.assunto, topicId: found?.topic.id || error.topicId || '', source: 'erros', date: error.atualizadoEm || error.criadoEm || 0, errorId: error.id });
        }
        for (const card of data.flashcards?.cards || []) {
            const deck = (data.flashcards.decks || []).find(item => item.id === card.deckId);
            if (!deck) continue;
            const subject = subjects.find(item => String(item.id) === String(deck.subjectId || deck.subjectIds?.[0]));
            const topic = (subject?.topicos || []).find(item => String(item.id) === String(deck.topicId || '#') || key(item.nome) === key(deck.topic));
            const theme = subject?.temas?.find(item => item.id === topic?.temaId);
            results.push({ id: `card:${card.id}`, kind: 'card', title: card.front || '', text: card.back || '', subject: subject?.subject || 'Sem matéria', subjectId: subject?.id || '', theme: theme?.nome || 'Conteúdo geral', themeId: theme?.id || '', topic: topic?.nome || deck.topic || '', topicId: topic?.id || '', source: 'flashcards', date: card.updatedAt || card.createdAt || 0, deckId: deck.id });
        }
        for (const note of data.quickNotes || []) {
            const subject = subjects.find(item => String(item.id) === String(note.subjectIds?.[0] || '#') || key(item.subject) === key(note.subject));
            results.push({ id: `nota:${note.id}`, kind: 'nota', title: note.title || 'Anotação', text: note.text || '', subject: subject?.subject || note.subject || 'Sem matéria', subjectId: subject?.id || '', theme: 'Conteúdo geral', themeId: '', topic: '', topicId: '', source: 'notas', date: note.updatedAt || note.createdAt || 0, bookId: note.bookId });
        }
        return results;
    }
    function filter(items, filters = {}, reviewed = {}) {
        const search = key(filters.search);
        return items.filter(item => (!search || key([item.title, item.text, item.topic, item.subject].join(' ')).includes(search))
            && (!filters.kind || filters.kind === 'todos' || item.kind === filters.kind)
            && (!filters.subjectId || filters.subjectId === 'todos' || String(item.subjectId) === String(filters.subjectId))
            && (!filters.themeId || filters.themeId === 'todos' || String(item.themeId) === String(filters.themeId))
            && (!filters.source || filters.source === 'todos' || item.source === filters.source)
            && (!filters.color || filters.color === 'todos' || item.color === filters.color)
            && (!filters.review || filters.review === 'todas' || (filters.review === 'revisados' ? Boolean(reviewed[item.id]) : !reviewed[item.id])));
    }
    function group(items) {
        const groups = new Map();
        for (const item of items) {
            const groupKey = `${item.subjectId || item.subject}:${item.themeId || item.theme}`;
            if (!groups.has(groupKey)) groups.set(groupKey, { id: groupKey, subject: item.subject, theme: item.theme, items: [] });
            groups.get(groupKey).items.push(item);
        }
        return [...groups.values()];
    }
    function reanchorHighlights(text, highlights = []) {
        const source = String(text || '');
        return highlights.map(highlight => {
            const snippet = String(highlight.trecho || '');
            const start = Number(highlight.inicio) || 0;
            if (snippet && source.slice(start, start + snippet.length) === snippet) return { ...highlight, inicio: start, fim: start + snippet.length, stale: false };
            const found = snippet ? source.indexOf(snippet) : -1;
            return { ...highlight, inicio: found, fim: found < 0 ? -1 : found + snippet.length, stale: found < 0 };
        });
    }
    return { collect, filter, group, reanchorHighlights, key };
});
