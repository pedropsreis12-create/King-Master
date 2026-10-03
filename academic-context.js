/* Contexto acadêmico mínimo para a IA. Nunca executa alterações. */
(() => {
    const norm = value => String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('pt-BR');
    const short = (value, max = 180) => String(value || '').replace(/\s+/g, ' ').trim().slice(0, max);
    function build(data, request = '', today = '') {
        const ask = norm(request);
        const subjects = Array.isArray(data.cycleItems) ? data.cycleItems : [];
        const explicit = subjects.filter(item => ask.includes(norm(item.subject)));
        const selected = explicit.length ? explicit.slice(0, 4) : subjects.slice(0, 4);
        const names = new Set(selected.map(item => norm(item.subject)));
        const belongs = value => !explicit.length || names.has(norm(value));
        const noteBelongs = note => !explicit.length || belongs(note.subject) || (note.subjectIds || []).some(id => selected.some(item => String(item.id) === String(id)));
        const reviewBelongs = review => !explicit.length || belongs(review.materia) || (review.materiaIds || []).some(id => selected.some(item => String(item.id) === String(id)));
        const interesting = /erro|quest|desempenho|pior|dificuldade|revis|simulad|estudo|plano|hoje|flashcard/.test(ask);
        const includeText = /erro|esqueci|flashcard|anota|nota|caderno|resum|questao/.test(ask);
        const result = { materiasSelecionadas: selected.map(item => item.subject) };
        if (interesting) {
            result.erros = (data.cadernoErrosItems || []).filter(item => belongs(item.materia)).slice(-12).reverse().map(item => ({
                materia: short(item.materia, 50), assunto: short(item.assunto, 100), causa: short(item.tipo || item.causa, 70),
                ...(includeText ? { regra: short(item.regra || item.regraAntiErro, 240), questao: short(item.questao, 180) } : {})
            }));
            result.revisoes = (data.revisoesItems || []).filter(item => item.status !== 'revisado' && reviewBelongs(item)).sort((a, b) => String(a.dataAlvo).localeCompare(String(b.dataAlvo))).slice(0, 8).map(item => ({ materia: short(item.materia, 50), assunto: short(item.assunto, 100), data: item.dataAlvo, ...(includeText ? { observacao: short(item.observacao, 180) } : {}) }));
        }
        if (/nota|anota|caderno|flashcard|resum/.test(ask)) {
            result.notas = (data.quickNotes || []).filter(noteBelongs).slice(-6).reverse().map(item => ({ titulo: short(item.title, 80), texto: short(item.text, 300), data: item.createdAt }));
            result.flashcards = (data.flashcards?.decks || []).filter(deck => !explicit.length || (deck.subjectIds || [deck.subjectId]).some(id => selected.some(item => String(item.id) === String(id)))).slice(0, 8).map(deck => ({ nome: short(deck.name, 80), assunto: short(deck.topic, 100), cartoes: (data.flashcards?.cards || []).filter(card => card.deckId === deck.id).length }));
        }
        if (/simulad|quest|desempenho|pior|estudo|plano/.test(ask)) result.simulados = (data.simuladosItems || []).slice(-4).reverse().map(item => ({ titulo: short(item.title, 80), data: item.date, acertos: item.acertos, total: item.total }));
        if (/hoje|estud|desempenho|pior|quest|flashcard|plano/.test(ask)) {
            result.sessoesRecentes = (data.historyItems || []).filter(item => belongs(item.materia) && (!/hoje/.test(ask) || item.dataISO === today))
                .slice(-10).reverse().map(item => ({ materia: short(item.materia, 50), assunto: short(item.assunto, 100), data: item.dataISO,
                    minutos: Math.max(0, Math.round(Number(item.tempoSegundos || 0) / 60)), questoes: Math.max(0, Number(item.questoes || 0)),
                    acertos: Math.max(0, Number(item.acertos || 0)), ...(includeText ? { resumo: short(item.comentario, 180) } : {}) }));
        }
        if (/hoje|plano|cronograma|agenda|estud/.test(ask)) {
            const weeks = Object.values(data.studySchedule?.weeks || {});
            const current = weeks.find(week => Array.isArray(week.blocks) && week.blocks.some(block => {
                const start = new Date(`${week.key}T12:00:00`); start.setDate(start.getDate() + Number(block.day || 1) - 1);
                return `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, '0')}-${String(start.getDate()).padStart(2, '0')}` === today;
            }));
            result.blocosHoje = (current?.blocks || []).filter(block => {
                const start = new Date(`${current.key}T12:00:00`); start.setDate(start.getDate() + Number(block.day || 1) - 1);
                return `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, '0')}-${String(start.getDate()).padStart(2, '0')}` === today;
            }).slice(0, 8).map(block => ({ materia: subjects.find(item => String(item.id) === String(block.subjectId))?.subject || '', assunto: short(block.topic, 100), inicio: block.start, minutos: block.duration, estado: block.status }));
        }
        if (/habito|disciplina|rotina|procrastin/.test(ask)) result.habitosDeEstudo = (data.personalDevelopment?.spaces || []).flatMap(space => space.items || []).filter(item => item.type === 'habit' && /estud|revis|quest|redac|simulad|leitura/i.test(item.name)).slice(0, 10).map(item => ({ nome: short(item.name, 90), cumpridoHoje: item.checkins?.[today] === true || item.checkins?.[today]?.status === 'done' }));
        return result;
    }
    window.KingAcademicContext = { build };
})();
