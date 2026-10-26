(() => {
    const Core = window.KingQuestionPaceCore;
    const section = document.getElementById('question-timer');
    if (!Core || !section) return;
    const byId = id => document.getElementById(id);
    const node = (tag, className = '', label = '') => {
        const element = document.createElement(tag);
        element.className = className;
        element.textContent = label;
        return element;
    };
    const causes = { conteudo: 'Conteúdo', interpretacao: 'Interpretação', calculo: 'Cálculo', atencao: 'Atenção', estrategia: 'Tempo / estratégia' };
    const outcomes = { hit: 'Acerto', miss: 'Erro', skip: 'Pulada' };
    const clockText = seconds => `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;
    let ownedDraftId = '';
    let selectedSessionId = '';
    let awaitingCause = false;

    function draft() {
        const value = appData.questionPaceDraft;
        if (!value || String(value.accountUid || '') !== String(appData.accountUid || '')) return null;
        if (value.status === 'running' && ownedDraftId !== value.id) {
            appData.questionPaceDraft = Core.restore(value, appData.accountUid);
            saveAppData();
        }
        return appData.questionPaceDraft;
    }

    function fillSubjects() {
        const select = byId('questionPaceSubject');
        const current = select.value;
        select.replaceChildren(new Option('Escolha uma matéria', ''));
        (appData.cycleItems || []).forEach(subject => select.add(new Option(subject.subject, String(subject.id))));
        if ([...select.options].some(option => option.value === current)) select.value = current;
        fillTopics();
    }

    function fillTopics() {
        const subject = (appData.cycleItems || []).find(item => String(item.id) === byId('questionPaceSubject').value);
        byId('questionPaceTopics').replaceChildren(...(subject?.topicos || []).map(topic => {
            const option = document.createElement('option'); option.value = String(topic.nome || '').slice(0, 100); return option;
        }));
    }

    function currentTimer() {
        const current = draft();
        if (!current || !['running', 'paused'].includes(current.status)) return;
        if (current.status === 'running' && typeof isRunning !== 'undefined' && isRunning) {
            appData.questionPaceDraft = Core.pause(current);
            saveAppData();
            render();
            showToast('Treino pausado: o cronômetro de estudos foi iniciado para evitar tempo duplicado.');
            return;
        }
        const clock = byId('questionPaceClock');
        clock.textContent = current.hideClock && current.status === 'running' ? '••:••' : clockText(Core.elapsedSeconds(current));
        byId('questionPaceClockHelp').textContent = current.status === 'paused' ? 'Pausado — este tempo não cresce' : current.hideClock ? 'Relógio oculto até você registrar a questão' : 'Tempo desta questão';
    }

    function renderActive(current) {
        byId('questionPaceContext').textContent = `${current.subject} · ${current.topic}`;
        byId('questionPacePosition').textContent = `Questão ${current.records.length + 1} de ${current.count}`;
        byId('questionPaceHint').textContent = current.status === 'paused' ? 'A pausa não entra no tempo da questão.' : 'Marque o resultado quando terminar; a próxima começa automaticamente.';
        byId('questionPaceProgress').style.width = `${Math.round(current.records.length / current.count * 100)}%`;
        byId('questionPaceCauses').hidden = !awaitingCause;
        byId('questionPaceOutcomes').hidden = awaitingCause || current.status === 'paused';
        byId('questionPacePause').textContent = current.status === 'paused' ? 'Retomar questão' : 'Pausar / descansar';
        byId('questionPaceSessionStatus').textContent = awaitingCause ? 'Escolha a causa do erro para continuar. O tempo foi congelado no clique em “Errei”.' : `${current.records.length} ${current.records.length === 1 ? 'questão registrada' : 'questões registradas'}.`;
        currentTimer();
    }

    function resultMetric(label, value, hint = '') {
        const item = node('div', 'question-pace-metric');
        item.append(node('small', '', label), node('strong', '', value));
        if (hint) item.append(node('span', '', hint));
        return item;
    }

    function addErrorButton(session, row, index) {
        if (row.outcome !== 'miss') return null;
        const linked = row.errorId && (appData.cadernoErrosItems || []).some(item => item.id === row.errorId);
        const button = node('button', 'cycle-btn', linked ? 'Editar / anexar foto' : 'Adicionar ao Caderno de Erros');
        button.type = 'button';
        button.dataset.paceError = String(index);
        button.dataset.paceSession = session.id;
        return button;
    }

    function renderSummary(source, saved) {
        const panel = byId('questionPaceSummary'); panel.replaceChildren();
        const rows = source.records || [];
        const info = Core.summary(rows, source.budgetSeconds, source.count);
        const heading = node('div', 'question-pace-panel-head');
        heading.append(node('span', 'workspace-kicker', saved ? 'TREINO SALVO' : 'CONFIRA ANTES DE SALVAR'),
            node('h2', '', `${source.subject} · ${source.topic}`),
            node('p', '', `${info.total} ${info.total === 1 ? 'questão registrada' : 'questões registradas'} · ${clockText(info.totalSeconds)} de tempo líquido`));
        panel.append(heading);
        const metrics = node('div', 'question-pace-metrics');
        metrics.append(resultMetric('Acertos', String(info.hits)), resultMetric('Erros', String(info.misses)),
            resultMetric('Puladas', String(info.skips)), resultMetric('Média / questão', clockText(info.averageSeconds)));
        panel.append(metrics);
        const comparison = node('div', 'question-pace-comparison');
        comparison.append(node('span', '', `Acertos: ${info.hits ? clockText(info.hitAverageSeconds) : '—'} por questão`),
            node('span', '', `Erros: ${info.misses ? clockText(info.missAverageSeconds) : '—'} por questão`));
        if (info.targetSeconds) comparison.append(node('span', '', `${info.overTarget} acima da meta de ${clockText(info.targetSeconds)} por questão`));
        panel.append(comparison);
        const listHeading = node('h3', 'question-pace-list-heading', 'Tempo e resultado por questão'); panel.append(listHeading);
        const list = node('div', 'question-pace-rows');
        const longest = Math.max(info.targetSeconds, ...rows.map(row => Number(row.seconds) || 0), 1);
        rows.forEach((row, index) => {
            const entry = node('article', `question-pace-row ${row.outcome}`);
            const line = node('div', 'question-pace-row-line');
            line.append(node('strong', '', `Questão ${index + 1}${row.reference ? ` · ${row.reference}` : ''}`),
                node('span', '', `${outcomes[row.outcome] || 'Questão'} · ${clockText(row.seconds)}`));
            const bar = node('div', 'question-pace-row-track');
            const fill = node('span'); fill.style.width = `${Math.max(3, Math.round(row.seconds / longest * 100))}%`; bar.append(fill);
            entry.append(line, bar);
            if (row.outcome === 'miss') {
                const note = node('div', 'question-pace-row-detail', `Causa: ${causes[row.cause] || 'A conferir'}`);
                if (saved) note.append(addErrorButton(source, row, index));
                entry.append(note);
            }
            list.append(entry);
        });
        panel.append(list);
        const actions = node('div', 'question-pace-summary-actions');
        if (!saved) {
            const save = node('button', 'cycle-btn primary', 'Salvar treino no histórico'); save.type = 'button'; save.dataset.paceAction = 'save'; actions.append(save);
            if (rows.length < source.count) {
                const resume = node('button', 'cycle-btn', 'Continuar treino'); resume.type = 'button'; resume.dataset.paceAction = 'continue'; actions.append(resume);
            }
        } else {
            const again = node('button', 'cycle-btn primary', 'Novo treino'); again.type = 'button'; again.dataset.paceAction = 'new'; actions.append(again);
            const history = node('button', 'cycle-btn', 'Ver histórico'); history.type = 'button'; history.addEventListener('click', () => showSection('historico')); actions.append(history);
        }
        panel.append(actions);
        if (!saved && info.misses) panel.append(node('p', 'question-pace-note', 'Depois de salvar, você poderá enviar cada erro ao Caderno de Erros e anexar uma foto se quiser.'));
    }

    function renderHistory() {
        const container = byId('questionPaceHistory'); container.replaceChildren();
        const sessions = [...(appData.questionPaceSessions || [])].slice(-8).reverse();
        if (!sessions.length) { container.append(node('p', 'question-pace-empty', 'Seu primeiro treino aparecerá aqui depois de salvo.')); return; }
        sessions.forEach(session => {
            const stats = Core.summary(session.records || []);
            const button = node('button', 'question-pace-history-item'); button.type = 'button'; button.dataset.paceOpen = session.id;
            button.append(node('strong', '', `${session.subject} · ${session.topic}`),
                node('span', '', `${session.date || ''} · ${stats.hits} acertos · ${stats.misses} erros · média ${clockText(stats.averageSeconds)}`));
            container.append(button);
        });
    }

    function render() {
        fillSubjects(); renderHistory();
        const current = draft();
        const session = !current && selectedSessionId ? (appData.questionPaceSessions || []).find(item => item.id === selectedSessionId) : null;
        byId('questionPaceSetup').hidden = Boolean(current || session);
        byId('questionPaceActive').hidden = !current || current.status === 'summary';
        byId('questionPaceSummary').hidden = !(current?.status === 'summary' || session);
        if (current && current.status !== 'summary') renderActive(current);
        else if (current?.status === 'summary') renderSummary(current, false);
        else if (session) renderSummary(session, true);
    }

    function start(event) {
        event.preventDefault();
        if (draft()) return showToast('Encerre o treino atual antes de iniciar outro.', true);
        if (appData.pendingStudySession || (appData.pendingStudySessions || []).length) return showToast('Registre a sessão de estudo pendente antes de começar.', true);
        if (typeof isRunning !== 'undefined' && isRunning) return showToast('Encerre o cronômetro de estudos antes para não contar o mesmo tempo duas vezes.', true);
        const subject = (appData.cycleItems || []).find(item => String(item.id) === byId('questionPaceSubject').value);
        try {
            const id = `questoes-${Date.now()}-${crypto.randomUUID().slice(0, 8)}`;
            const next = Core.start({ id, accountUid: appData.accountUid, subjectId: subject?.id, subject: subject?.subject,
                topic: byId('questionPaceTopic').value, count: byId('questionPaceCount').value,
                budgetMinutes: byId('questionPaceBudget').value, hideClock: byId('questionPaceHideClock').checked });
            appData.questionPaceDraft = next; ownedDraftId = id; selectedSessionId = ''; awaitingCause = false;
            saveAppData(); render();
        } catch (error) { showToast(error.message || 'Não foi possível iniciar o treino.', true); }
    }

    function record(outcome, cause = '') {
        const current = draft();
        if (!current || current.status !== 'running') return;
        const next = Core.record(current, outcome, cause, byId('questionPaceReference').value);
        if (!next) return showToast('Escolha o motivo do erro antes de continuar.', true);
        appData.questionPaceDraft = next; awaitingCause = false;
        byId('questionPaceReference').value = '';
        saveAppData(); render();
    }

    function save() {
        const current = draft();
        if (!current || current.status !== 'summary') return;
        const info = Core.summary(current.records, current.budgetSeconds, current.count);
        if (info.totalSeconds < 5) return showToast('Resolva por pelo menos 5 segundos antes de salvar no histórico.', true);
        if (appData.pendingStudySession || (appData.pendingStudySessions || []).length) return showToast('Registre a sessão pendente antes de salvar este treino.', true);
        const session = { id: current.id, date: dataLocalISO(), createdAt: current.createdAt, subjectId: current.subjectId,
            subject: current.subject, topic: current.topic, count: current.count, budgetSeconds: current.budgetSeconds,
            records: current.records.map(row => ({ ...row })) };
        const success = registrarSessao(info.totalSeconds, { subjectId: current.subjectId, assunto: current.topic, atividade: 'estudo',
            comentario: `Treino cronometrado: ${info.hits} acertos, ${info.misses} erros e ${info.skips} puladas.`,
            study: { questoes: info.attempted, acertos: info.hits, erros: info.misses },
            questionPaceSession: session, externalStudyTime: true });
        if (!success) return showToast('O treino continua guardado para você tentar salvar novamente.', true);
        selectedSessionId = session.id; ownedDraftId = ''; render();
        showToast('Treino salvo. Seus tempos e acertos já estão no histórico.');
    }

    function addError(sessionId, index) {
        const session = (appData.questionPaceSessions || []).find(item => item.id === sessionId);
        const row = session?.records?.[index];
        if (!row || row.outcome !== 'miss') return;
        if (row.errorId && (appData.cadernoErrosItems || []).some(item => item.id === row.errorId)) return abrirModalCadernoErro(row.errorId);
        row.errorId = null;
        const now = Date.now();
        const id = (appData.cadernoErrosItems || []).reduce((max, item) => Math.max(max, Number(item.id) || 0), now) + 1;
        const nextDate = new Date(); nextDate.setDate(nextDate.getDate() + 1);
        const error = normalizarItemCadernoErro({ id, materia: session.subject, assunto: session.topic,
            origem: `Treino cronometrado · ${clockText(row.seconds)}`, tipo: row.cause,
            questao: `Questão ${row.number}${row.reference ? ` · ${row.reference}` : ''}. Enunciado ainda não anexado.`,
            regra: 'Conferir o gabarito e completar minha regra anti-erro.',
            proximaRevisao: dataLocalISO(nextDate), etapaRevisao: 0, status: 'aprendendo', criadoEm: now });
        appData.cadernoErrosItems.push(error); row.errorId = id;
        try { saveAppData(); }
        catch (error) { appData.cadernoErrosItems = appData.cadernoErrosItems.filter(item => item.id !== id); row.errorId = null; return showToast('Não foi possível guardar este erro. Tente novamente.', true); }
        renderizarCadernoErros(); renderizarRevisoes(); render();
        showToast('Erro guardado. Use “Editar / anexar foto” para completar o enunciado quando quiser.');
    }

    function handleAction(action) {
        const current = draft();
        if (action === 'hit' || action === 'skip') return record(action);
        if (action === 'miss') {
            if (current?.status !== 'running') return;
            appData.questionPaceDraft = Core.pause(current);
            awaitingCause = true; saveAppData(); render(); return;
        }
        if (action === 'cancel-miss') {
            awaitingCause = false;
            if (current?.status === 'paused') { appData.questionPaceDraft = Core.resume(current); saveAppData(); }
            render(); return;
        }
        if (action === 'pause' && current) {
            if (awaitingCause) return showToast('Escolha a causa do erro ou volte primeiro.', true);
            appData.questionPaceDraft = current.status === 'running' ? Core.pause(current) : Core.resume(current);
            saveAppData(); render(); return;
        }
        if (action === 'finish' && current) {
            if (awaitingCause) return showToast('Escolha a causa do erro ou volte primeiro.', true);
            const finished = Core.finish(current);
            if (!finished) return showToast('Registre ao menos uma questão antes de encerrar.', true);
            appData.questionPaceDraft = finished; saveAppData(); render(); return;
        }
        if (action === 'continue' && current?.status === 'summary' && current.records.length < current.count) {
            appData.questionPaceDraft = Core.resume({ ...current, status: 'paused' });
            saveAppData(); render(); return;
        }
        if (action === 'save') return save();
        if (action === 'new') { selectedSessionId = ''; render(); return; }
        if (action === 'discard' && current) {
            if (current.records.length && !window.confirm('Descartar este treino e todos os tempos ainda não salvos?')) return;
            appData.questionPaceDraft = null; ownedDraftId = ''; awaitingCause = false;
            saveAppData(); render();
        }
    }

    section.addEventListener('click', event => {
        const cause = event.target.closest('[data-pace-cause]');
        if (cause) {
            const current = draft();
            if (!awaitingCause || current?.status !== 'paused') return;
            const next = Core.record({ ...current, status: 'running', runningSince: 0 }, 'miss', cause.dataset.paceCause,
                byId('questionPaceReference').value, Date.now());
            if (!next) return;
            appData.questionPaceDraft = next; awaitingCause = false;
            byId('questionPaceReference').value = ''; saveAppData(); render(); return;
        }
        const error = event.target.closest('[data-pace-error]');
        if (error) return addError(error.dataset.paceSession, Number(error.dataset.paceError));
        const history = event.target.closest('[data-pace-open]');
        if (history) {
            if (draft()) return showToast('Salve ou descarte o treino atual antes de abrir outro registro.', true);
            selectedSessionId = history.dataset.paceOpen; render(); return;
        }
        const action = event.target.closest('[data-pace-action]');
        if (action) handleAction(action.dataset.paceAction);
    });
    byId('questionPaceSetup').addEventListener('submit', start);
    byId('questionPaceSubject').addEventListener('change', fillTopics);
    window.addEventListener('pagehide', () => {
        const current = appData.questionPaceDraft;
        if (current?.id === ownedDraftId && current.status === 'running') {
            appData.questionPaceDraft = Core.pause(current);
            try { saveAppData(); } catch { /* O último checkpoint permanece salvo. */ }
        }
    });
    window.addEventListener('king-master-auth-ready', () => { ownedDraftId = ''; selectedSessionId = ''; awaitingCause = false; if (section.classList.contains('active')) render(); });
    setInterval(currentTimer, 500);
    window.KingQuestionPace = {
        render,
        openForTopic() {
            const link = localizarEspacoTopico();
            if (!link?.materia || !link.topico) return showToast('Abra primeiro um assunto para iniciar o treino.', true);
            showSection('question-timer');
            if (draft()) return showToast('Seu treino anterior continua guardado. Encerre-o antes de iniciar outro.', true);
            selectedSessionId = ''; render();
            byId('questionPaceSubject').value = String(link.materia.id);
            fillTopics(); byId('questionPaceTopic').value = link.topico.nome;
            byId('questionPaceCount').value = '20';
            byId('questionPaceTopic').focus();
        }
    };
})();
