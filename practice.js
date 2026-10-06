(() => {
    const Core = window.KingPracticeCore;
    const dialog = document.getElementById('practiceModal');
    const exitDialog = document.getElementById('practiceExitDialog');
    if (!Core || !dialog || !exitDialog) return;
    const byId = id => document.getElementById(id);
    const make = (tag, className = '', content = '') => { const node = document.createElement(tag); node.className = className; node.textContent = content; return node; };
    const state = { subjectId: '', subject: '', topic: '', questions: [], answers: [], index: 0, phase: 'idle', startedAt: 0, busy: false, request: 0 };
    let clock = null;
    const elapsed = () => Math.max(0, Math.floor((Date.now() - state.startedAt) / 1000));
    const format = seconds => `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;
    const btn = (label, action, value) => { const node = make('button', 'cycle-btn', label); node.type = 'button'; node.dataset.practiceAction = action; if (value !== undefined) node.dataset.value = String(value); return node; };
    function stopClock() { clearInterval(clock); clock = null; }
    function closeNow() {
        state.request++; stopClock(); state.phase = 'idle'; state.questions = []; state.answers = []; state.busy = false;
        if (exitDialog.open) exitDialog.close(); if (dialog.open) dialog.close();
    }
    function requestClose() {
        if (state.phase === 'loading' || !state.questions.length) return closeNow();
        const progressed = state.answers.some(answer => answer?.choice !== undefined);
        if (!progressed) return closeNow();
        if (!exitDialog.open) exitDialog.showModal();
    }
    function startQuestion() {
        state.startedAt = Date.now();
        stopClock(); clock = setInterval(() => {
            const clockNode = byId('practiceClock');
            if (clockNode && state.phase === 'running' && state.answers[state.index]?.choice === undefined) {
                clockNode.textContent = format(elapsed());
                if (elapsed() >= 240 && !dialog.querySelector('.practice-pace-hint'))
                    byId('practiceContent').append(make('p', 'practice-pace-hint', 'Passou de 4 minutos. Considere pular e voltar depois.'));
            }
        }, 1000);
        render();
    }
    function renderQuestion() {
        const content = byId('practiceContent'); content.replaceChildren();
        const question = state.questions[state.index]; if (!question) return renderSummary();
        const answer = state.answers[state.index];
        const progress = make('div', 'practice-progress', `Questão ${state.index + 1} de ${state.questions.length}`);
        const timer = make('span', 'practice-clock', answer?.seconds != null ? format(answer.seconds) : format(elapsed())); timer.id = 'practiceClock'; progress.append(timer);
        const stem = make('h3', 'practice-stem', question.stem);
        const choices = make('div', 'practice-choices');
        question.choices.forEach((choice, index) => {
            const option = btn(`${'ABCDE'[index]}. ${choice}`, 'answer', index);
            option.classList.add('practice-choice'); option.disabled = answer?.choice !== undefined;
            if (answer?.choice !== undefined && index === question.correctIndex) option.classList.add('correct');
            if (answer?.choice !== undefined && index === answer.choice && index !== question.correctIndex) option.classList.add('wrong');
            choices.append(option);
        });
        content.append(progress, stem, choices);
        if (answer?.choice === undefined && elapsed() >= 240) content.append(make('p', 'practice-pace-hint', 'Passou de 4 minutos. Considere pular e voltar depois.'));
        if (answer?.choice !== undefined) {
            const feedback = make('div', 'practice-feedback');
            feedback.append(make('strong', '', answer.choice === question.correctIndex ? 'Você acertou.' : 'Confira a resposta e a explicação.'), make('p', '', question.explanation));
            if (answer.choice !== null && answer.choice !== question.correctIndex) {
                const reasons = make('div', 'practice-reasons'); reasons.append(make('span', '', 'Por que você errou? Selecione um motivo para continuar.'));
                for (const [value, label] of [['conteudo', 'Conteúdo'], ['interpretacao', 'Interpretação'], ['calculo', 'Cálculo'], ['atencao', 'Atenção'], ['estrategia', 'Estratégia']]) {
                    const reason = btn(label, 'cause', value); reason.classList.toggle('selected', answer.cause === value); reasons.append(reason);
                }
                feedback.append(reasons);
            }
            feedback.append(btn(state.index + 1 === state.questions.length ? 'Ver resultado' : 'Próxima', 'next'));
            content.append(feedback);
        } else content.append(btn('Pular', 'skip'));
    }
    function renderSummary() {
        state.phase = 'summary'; stopClock();
        const result = Core.calculate(state.questions, state.answers);
        const content = byId('practiceContent'); content.replaceChildren();
        const summary = make('div', 'practice-summary');
        summary.append(make('span', 'workspace-kicker', 'TREINO CONCLUÍDO'), make('h3', '', `${result.hits} de ${result.total} acertos`),
            make('p', '', `${result.percent}% de acerto · ${result.errors} erro${result.errors === 1 ? '' : 's'} · ${result.blanks} pulada${result.blanks === 1 ? '' : 's'} · média de ${format(result.averageSeconds)} por questão.`));
        const wrong = state.questions.filter((_, index) => result.rows[index]?.choice !== null && !result.rows[index]?.correct);
        if (wrong.length) {
            const list = make('ul', 'practice-wrong-list');
            wrong.forEach(item => list.append(make('li', '', item.stem.slice(0, 160))));
            summary.append(make('strong', '', 'Erros que vão para seu caderno'), list);
        }
        const actions = make('div', 'practice-actions'); actions.append(btn('Salvar e fechar', 'save'), btn('Descartar treino', 'close')); summary.append(actions); content.append(summary);
    }
    function render() {
        if (state.phase === 'running') renderQuestion();
        else if (state.phase === 'summary') renderSummary();
    }
    async function open(options = {}) {
        if (dialog.open) return;
        if (appData.pendingStudySession || (appData.pendingStudySessions || []).length) return showToast('Registre primeiro a sessão de estudo pendente para não misturar os tempos.', true);
        if (isRunning) return showToast('Encerre e registre o cronômetro antes do treino para não contar o mesmo tempo duas vezes.', true);
        const subject = (appData.cycleItems || []).find(item => String(item.id) === String(options.subjectId));
        if (!subject || !String(options.topic || '').trim()) return showToast('Escolha uma matéria e um assunto para treinar.', true);
        Object.assign(state, { subjectId: String(subject.id), subject: subject.subject, topic: String(options.topic).trim().slice(0, 100),
            questions: [], answers: [], index: 0, phase: 'loading', startedAt: 0, busy: true });
        const request = ++state.request;
        byId('practiceTitle').textContent = `Treino: ${state.topic}`;
        byId('practiceSubtitle').textContent = `${state.subject} · até 10 questões inéditas · confira as explicações da IA`;
        byId('practiceContent').replaceChildren(make('p', 'practice-loading', 'Gerando questões inéditas…'), btn('Cancelar', 'close'));
        byId('practiceStatus').textContent = '';
        dialog.showModal();
        try {
            await window.kingGeminiReady;
            if (!window.kingGemini?.generateMockQuestions) throw new Error('O treino com IA não está disponível agora. Use o cronômetro e registre as questões manualmente.');
            const recent = (appData.practiceSessions || []).filter(item => String(item.subjectId) === state.subjectId && item.topic === state.topic).slice(-3);
            const avoid = recent.flatMap(item => (item.questions || []).map(question => question.stem)).slice(-20);
            const generated = await window.kingGemini.generateMockQuestions({ subjects: [state.subject], topics: [state.topic], count: 10, level: 'enem', avoid });
            if (request !== state.request) return;
            if (!Array.isArray(generated) || generated.length < 3) throw new Error('A IA gerou menos de três questões válidas. Tente novamente mais tarde.');
            state.questions = generated.slice(0, 10); state.phase = 'running'; state.busy = false; startQuestion();
        } catch (error) {
            if (request !== state.request) return;
            state.busy = false; state.phase = 'error';
            byId('practiceContent').replaceChildren(make('p', 'practice-error', String(error.message || 'Não foi possível gerar questões.').slice(0, 300)), btn('Fechar', 'close'));
        }
    }
    function answer(index) {
        if (state.phase !== 'running' || state.answers[state.index]?.choice !== undefined || index < 0 || index > 4) return;
        state.answers[state.index] = { choice: index, seconds: elapsed(), cause: '' };
        stopClock(); render();
    }
    function next(skipped = false) {
        if (state.phase !== 'running') return;
        if (skipped && state.answers[state.index]?.choice === undefined) state.answers[state.index] = { choice: null, seconds: elapsed(), cause: '' };
        if (state.answers[state.index]?.choice === undefined) return;
        if (state.answers[state.index].choice !== null && state.answers[state.index].choice !== state.questions[state.index].correctIndex && !state.answers[state.index].cause) {
            showToast('Marque por que errou antes de avançar.', true); return;
        }
        state.index++;
        if (state.index >= state.questions.length) renderSummary(); else startQuestion();
    }
    function save(partial = false) {
        if (state.busy || !state.questions.length) return;
        const count = partial ? Math.max(0, state.index + (state.answers[state.index]?.choice !== undefined ? 1 : 0)) : state.questions.length;
        if (!count) return showToast('Responda pelo menos uma questão antes de salvar.', true);
        const questions = state.questions.slice(0, count), answers = state.answers.slice(0, count);
        const result = Core.calculate(questions, answers);
        if (!result.rows.some(row => row.choice !== null)) return showToast('Não há respostas para registrar.', true);
        if (result.rows.some(row => row.choice !== null && !row.correct && !answers[row.index]?.cause))
            return showToast('Marque o motivo de cada erro antes de salvar.', true);
        state.busy = true;
        const tomorrow = new Date(); tomorrow.setDate(tomorrow.getDate() + 1);
        const now = Date.now(), date = dataLocalISO();
        const errors = Core.buildErrors(questions, result, { subject: state.subject, topic: state.topic, date, tomorrow: dataLocalISO(tomorrow), now });
        const practiceSession = { id: `treino-${now}`, data: date, subjectId: state.subjectId, subject: state.subject, topic: state.topic,
            total: result.total, hits: result.hits, errors: result.errors, seconds: result.seconds,
            questions: questions.map((question, index) => ({ stem: question.stem.slice(0, 300), choice: result.rows[index].choice, correctIndex: question.correctIndex, seconds: result.rows[index].seconds })) };
        const success = registrarSessao(Math.max(5, result.seconds), { subjectId: state.subjectId, assunto: state.topic, atividade: 'estudo',
            comentario: 'Treino de questões geradas por IA; explicações devem ser conferidas.',
            study: { questoes: result.total, acertos: result.hits, erros: result.errors }, autoReview: true, reviewDelayDays: 1,
            errorItems: errors, practiceSession, externalStudyTime: true });
        state.busy = false;
        if (success) { closeNow(); showToast(`Treino salvo: ${result.hits}/${result.total} acertos e ${errors.length} erros no caderno.`); }
        else byId('practiceStatus').textContent = 'Não foi possível salvar. Suas respostas continuam abertas para tentar novamente.';
    }
    dialog.addEventListener('click', event => {
        const target = event.target.closest('[data-practice-action]'); if (!target) return;
        const action = target.dataset.practiceAction;
        if (action === 'close') requestClose();
        else if (action === 'answer') answer(Number(target.dataset.value));
        else if (action === 'skip') next(true);
        else if (action === 'next') next();
        else if (action === 'cause') { const answer = state.answers[state.index]; if (answer) { answer.cause = target.dataset.value; render(); } }
        else if (action === 'save') save();
    });
    dialog.addEventListener('cancel', event => { event.preventDefault(); requestClose(); });
    exitDialog.addEventListener('click', event => {
        const action = event.target.closest('[data-practice-exit]')?.dataset.practiceExit;
        if (action === 'cancel') exitDialog.close();
        else if (action === 'discard') closeNow();
        else if (action === 'save') save(true);
    });
    exitDialog.addEventListener('cancel', event => { event.preventDefault(); exitDialog.close(); });
    window.KingPractice = { open, close: requestClose };
})();
