/* Simulados originais com IA: prévia, prova sem gabarito e correção após finalizar. */
(() => {
    const core = window.KingMockExamCore;
    const el = id => document.getElementById(id);
    const escape = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
    const date = () => typeof dataLocalISO === 'function' ? dataLocalISO() : new Date().toISOString().slice(0, 10);
    const exams = () => Array.isArray(appData.generatedExams) ? appData.generatedExams : (appData.generatedExams = []);
    let subjectPicker;
    let activeId = '';
    let pendingExam = null;
    let questionIndex = 0;
    let generating = false;
    let abortController = null;
    let requestVersion = 0;
    let clock = null;
    let lastAttempt = 0;
    const current = () => pendingExam?.id === activeId ? pendingExam : exams().find(item => item.id === activeId);
    const label = exam => exam.subjectNames.join(' · ');
    const relevantErrors = names => (appData.cadernoErrosItems || []).filter(item => names.includes(item.materia))
        .slice(-5).map(item => `${item.materia}: ${item.assunto || ''} — ${item.tipo || ''}`.slice(0, 120));
    function persist(before) {
        try {
            if (new TextEncoder().encode(JSON.stringify(appData)).length > 850000) throw new Error('Os dados estão perto do limite de sincronização. Libere espaço antes de guardar outro simulado.');
            saveAppData();
            return true;
        } catch (error) {
            appData.generatedExams = before.exams;
            appData.simuladosItems = before.simulados;
            appData.revisoesItems = before.revisoes;
            el('mockExamStatus').textContent = error.message || 'Não foi possível salvar. Nada foi alterado.';
            showToast('Não foi possível guardar o simulado. Seus dados anteriores foram mantidos.', true);
            renderDrafts();
            if (current() && el('mockExamDialog').open) render();
            return false;
        }
    }
    const snapshot = () => ({ exams: structuredClone(exams()), simulados: structuredClone(appData.simuladosItems || []), revisoes: structuredClone(appData.revisoesItems || []) });
    const quotaKey = () => `king_mock_free_quota:${appData.accountUid || 'legacy'}`;
    function quota() {
        try { return JSON.parse(localStorage.getItem(quotaKey()) || '{}'); }
        catch { return {}; }
    }
    function quotaAllows() {
        const saved = quota();
        return saved.date !== date() || (Number(saved.count) || 0) < 3;
    }
    function recordGeneration() {
        const saved = quota();
        try { localStorage.setItem(quotaKey(), JSON.stringify({ date: date(), count: saved.date === date() ? (Number(saved.count) || 0) + 1 : 1 })); }
        catch { /* Cota local é apenas um freio de uso, nunca fonte de dados acadêmicos. */ }
    }
    function openSetup(preset = {}) {
        if (!appData.cycleItems.length) { showToast('Cadastre uma matéria antes de gerar um simulado.', true); showSection('planejamento'); return; }
        if (!subjectPicker) subjectPicker = window.KingSubjectPicker.create(el('mockExamSubjects'), { subjects: () => appData.cycleItems, allowAll: false, placeholder: 'Escolha até cinco matérias' });
        subjectPicker.set(preset.subjectId ? [String(preset.subjectId)] : []);
        el('mockExamForm').reset();
        if (preset.topic) el('mockExamTopics').value = String(preset.topic).slice(0, 100);
        if ([10, 20, 30].includes(Number(preset.count))) el('mockExamCount').value = String(preset.count);
        el('mockExamSetup').hidden = false;
        el('mockExamContent').replaceChildren();
        el('mockExamStatus').textContent = '';
        activeId = '';
        pendingExam = null;
        el('mockExamDialog').showModal();
    }
    async function generate(event) {
        event.preventDefault();
        if (generating) return;
        const ids = subjectPicker.get();
        if (!ids.length || ids.length > 5) return showToast('Escolha de uma a cinco matérias.', true);
        if (!quotaAllows()) return showToast('As 3 gerações de hoje foram usadas. Continue amanhã ou registre um simulado manualmente.', true);
        if (Date.now() - lastAttempt < 45000) return showToast('Aguarde um pouco antes de gerar novamente.', true);
        if (exams().length >= 6) return showToast('Há 6 simulados completos ou em andamento. Exclua um antigo antes de gerar outro.', true);
        const subjectNames = ids.map(id => appData.cycleItems.find(item => String(item.id) === id)?.subject).filter(Boolean);
        const topics = [...new Set(el('mockExamTopics').value.split(',').map(value => value.trim().slice(0, 100)).filter(Boolean))].slice(0, 12);
        const count = Number(el('mockExamCount').value);
        const level = el('mockExamLevel').value;
        if (![10, 20, 30].includes(count)) return showToast('Escolha 10, 20 ou 30 questões.', true);
        generating = true; lastAttempt = Date.now(); abortController = new AbortController();
        const version = ++requestVersion;
        el('mockExamGenerate').disabled = true;
        el('mockExamStatus').textContent = 'Gerando questões originais. A prova ainda não foi salva…';
        try {
            await window.kingGeminiReady;
            if (!window.kingGemini?.generateMockQuestions) throw new Error('A IA não está disponível. Você pode registrar um simulado manualmente.');
            const questions = [];
            for (let batch = 0; batch < count / 10; batch++) {
                if (abortController.signal.aborted || version !== requestVersion) return;
                el('mockExamStatus').textContent = `Gerando parte ${batch + 1} de ${count / 10}…`;
                const result = await window.kingGemini.generateMockQuestions({ subjects: subjectNames, topics, count: 10, level,
                    focus: relevantErrors(subjectNames), avoid: questions.map(item => item.stem).slice(-15), signal: abortController.signal });
                questions.push(...core.validate(result, subjectNames, 10, questions));
            }
            if (abortController.signal.aborted || version !== requestVersion) return;
            if (questions.length < Math.ceil(count * .7)) throw new Error('A IA retornou poucas questões válidas. Nenhuma prova foi salva; tente reduzir os assuntos.');
            const exam = { id: `mock-${crypto.randomUUID()}`, title: `${subjectNames.join(' + ')} · ${level.toUpperCase()}`.slice(0, 100),
                subjectIds: ids, subjectNames, topics, level, questions, answers: Array(questions.length).fill(null), marked: [], reviewedIds: [],
                status: 'ready', createdAt: Date.now(), startedAt: null, elapsedSeconds: 0, finishedAt: null };
            recordGeneration(); pendingExam = exam; activeId = exam.id; questionIndex = 0;
            el('mockExamSetup').hidden = true; render();
            el('mockExamStatus').textContent = questions.length < count ? `${questions.length} questões válidas de ${count} solicitadas. Confira a prévia antes de guardar.` : 'Confira as questões. Nada será salvo até você confirmar.';
        } catch (error) {
            if (!abortController?.signal.aborted) el('mockExamStatus').textContent = /quota|429|resource.exhausted/i.test(`${error?.code || ''} ${error?.message || ''}`)
                ? 'A cota gratuita da IA terminou por agora. Tente mais tarde; nada foi salvo.'
                : String(error?.message || 'A geração falhou. Nada foi salvo.').slice(0, 220);
        } finally { generating = false; abortController = null; el('mockExamGenerate').disabled = false; }
    }
    function openExam(id) {
        if (!exams().some(item => item.id === id)) return showToast('Este simulado não está mais disponível.', true);
        pendingExam = null; activeId = id; questionIndex = 0;
        el('mockExamSetup').hidden = true;
        el('mockExamStatus').textContent = '';
        if (!el('mockExamDialog').open) el('mockExamDialog').showModal();
        render();
    }
    function saveDraft() {
        const exam = current();
        if (!exam || exam.status !== 'ready') return false;
        if (!pendingExam) return true;
        const before = snapshot();
        exams().push(exam);
        if (!persist(before)) return false;
        pendingExam = null;
        renderDrafts();
        el('mockExamStatus').textContent = 'Simulado guardado. Você pode começar agora ou voltar mais tarde.';
        return true;
    }
    function start() {
        const exam = current(); if (!exam || exam.status !== 'ready') return;
        if (!saveDraft()) return;
        const before = snapshot();
        exam.status = 'running'; exam.startedAt = Date.now();
        if (persist(before)) render();
    }
    function saveAnswer(value) {
        const exam = current(); if (exam?.status !== 'running') return;
        const answer = Number(value);
        if (!Number.isInteger(answer) || answer < 0 || answer > 4) return;
        const before = snapshot(); exam.answers[questionIndex] = answer;
        if (persist(before)) render();
    }
    function toggleMark() {
        const exam = current(); if (exam?.status !== 'running') return;
        const before = snapshot();
        exam.marked = exam.marked.includes(questionIndex) ? exam.marked.filter(index => index !== questionIndex) : [...exam.marked, questionIndex];
        if (persist(before)) render();
    }
    function finish() {
        const exam = current(); if (exam?.status !== 'running') return;
        const blank = exam.answers.filter(answer => answer === null).length;
        if (!confirm(`Finalizar simulado? ${blank ? `${blank} questão(ões) ficará(ão) em branco. ` : ''}O gabarito só será mostrado depois de confirmar.`)) return;
        const before = snapshot();
        exam.status = 'done'; exam.finishedAt = Date.now();
        const result = core.grade(exam.questions, exam.answers);
        if (!appData.simuladosItems.some(item => item.generatedExamId === exam.id)) appData.simuladosItems.push({
            id: Date.now() + Math.floor(Math.random() * 1000), generatedExamId: exam.id, subjectIds: exam.subjectIds, title: exam.title, date: date(),
            tempoMin: Math.max(1, Math.ceil(exam.elapsedSeconds / 60)), format: 'gerado-ia', area: label(exam).slice(0, 140),
            total: result.total, acertos: result.correct, erros: result.wrong, brancos: result.blank,
            mainError: '', nextStep: '', attachment: ''
        });
        if (persist(before)) { render(); renderizarSimulados(); renderDrafts(); }
    }
    function addReviews() {
        const exam = current(); if (exam?.status !== 'done') return;
        const eligible = exam.questions.map((question, index) => ({ question, index })).filter(({ question, index }) =>
            (exam.answers[index] !== question.correctIndex || exam.marked.includes(index)) && !exam.reviewedIds.includes(index));
        if (!eligible.length) return showToast('Todas as questões elegíveis já estão na Caixa de Revisões.');
        if (!confirm(`Adicionar ${eligible.length} questão(ões) à Caixa de Revisões para amanhã?`)) return;
        const before = snapshot(); let added = 0;
        eligible.forEach(({ question, index }) => {
            const duplicate = appData.revisoesItems.some(item => item.questao === question.stem && item.sourceExamId === exam.id);
            if (!duplicate) {
                const subject = appData.cycleItems.find(item => item.subject === question.subject);
                appData.revisoesItems.push(normalizarItemRevisao({ id: Date.now() + index + Math.floor(Math.random() * 1000),
                    materia: question.subject, materiaIds: subject ? [String(subject.id)] : [], assunto: question.topic,
                    motivos: [exam.answers[index] !== null && exam.answers[index] !== question.correctIndex ? 'errei-questao' : 'reforcar'], questao: question.stem,
                    observacao: `Confira a resolução: ${question.explanation}`.slice(0, 500), dataEstudo: date(), dataAlvo: dataRevisaoComDias(1),
                    origem: 'simulado-ia', sourceExamId: exam.id, status: 'pendente', criadoEm: Date.now() }));
                added++;
            }
            exam.reviewedIds.push(index);
        });
        if (persist(before)) { render(); renderizarRevisoes(); showToast(`${added} revisão(ões) adicionada(s).`); }
    }
    function deleteExam(id) {
        if (pendingExam?.id === id) {
            if (!confirm('Descartar esta prévia? Ela ainda não foi salva.')) return;
            pendingExam = null; activeId = ''; el('mockExamDialog').close(); return;
        }
        const exam = exams().find(item => item.id === id); if (!exam) return;
        if (!confirm(`Excluir “${exam.title}”? A prova, suas respostas e o resultado serão apagados. Esta ação não pode ser desfeita.`)) return;
        const before = snapshot();
        appData.generatedExams = exams().filter(item => item.id !== id);
        appData.simuladosItems = appData.simuladosItems.filter(item => item.generatedExamId !== id);
        if (persist(before)) { if (activeId === id) { activeId = ''; el('mockExamDialog').close(); } renderDrafts(); renderizarSimulados(); showToast('Simulado excluído.'); }
    }
    function renderDrafts() {
        const root = el('mockExamDrafts'); if (!root) return;
        const drafts = exams().filter(item => item.status !== 'done');
        root.innerHTML = drafts.length ? `<div class="mock-drafts-head"><span class="workspace-kicker">CONTINUE QUANDO QUISER</span><strong>${drafts.length} ${drafts.length === 1 ? 'simulado guardado' : 'simulados guardados'}</strong></div>${drafts.map(item =>
            `<article><div><strong>${escape(item.title)}</strong><small>${item.questions.length} questões · ${item.status === 'running' ? 'em andamento' : 'pronto para começar'}</small></div><div><button type="button" class="cycle-btn primary" data-mock-open="${escape(item.id)}">${item.status === 'running' ? 'Continuar' : 'Abrir prévia'}</button><button type="button" class="cycle-btn" data-mock-delete="${escape(item.id)}">Excluir</button></div></article>`).join('')}` : '';
    }
    function render() {
        const exam = current(); if (!exam) return;
        const root = el('mockExamContent');
        el('mockExamTitle').textContent = exam.status === 'done' ? 'Resultado do simulado' : exam.status === 'running' ? exam.title : 'Prévia do simulado';
        if (exam.status === 'ready') {
            root.innerHTML = `<div class="mock-preview"><span class="workspace-kicker">CONFIRA ANTES DE COMEÇAR</span><h3>${escape(exam.title)}</h3><div class="mock-preview-grid"><div><small>Matérias</small><strong>${escape(label(exam))}</strong></div><div><small>Assuntos</small><strong>${escape(exam.topics.join(' · ') || 'Variados')}</strong></div><div><small>Questões</small><strong>${exam.questions.length} objetivas</strong></div><div><small>Tempo sugerido</small><strong>${Math.round(exam.questions.length * 2.5)} min</strong></div></div><p>Confira os enunciados e alternativas. O gabarito só aparece depois de finalizar. ${pendingExam ? 'Esta prévia ainda não foi salva.' : 'Esta prova está guardada para continuar depois.'}</p><div class="mock-preview-questions"><h4>Prévia das questões</h4>${exam.questions.map((question, index) => `<details><summary>${index + 1}. ${escape(question.topic)} · ${escape(question.stem.slice(0, 90))}${question.stem.length > 90 ? '…' : ''}</summary><p>${escape(question.stem)}</p><ol type="A">${question.choices.map(choice => `<li>${escape(choice)}</li>`).join('')}</ol></details>`).join('')}</div><div class="mock-actions"><button type="button" class="cycle-btn primary" data-mock-action="start">${pendingExam ? 'Salvar e começar' : 'Começar simulado'}</button>${pendingExam ? '<button type="button" class="cycle-btn" data-mock-action="save">Guardar para depois</button><button type="button" class="cycle-btn" data-mock-action="edit-request">Alterar pedido</button>' : ''}<button type="button" class="cycle-btn" data-mock-action="delete">Descartar prova</button></div></div>`;
            return;
        }
        if (exam.status === 'running') {
            const question = exam.questions[questionIndex];
            const answered = exam.answers.filter(answer => answer !== null).length;
            root.innerHTML = `<div class="mock-progress"><span>Questão ${questionIndex + 1} de ${exam.questions.length}</span><span>${answered} respondidas · ${exam.marked.length} marcadas</span></div><div class="mock-progress-track"><span style="width:${Math.round(answered / exam.questions.length * 100)}%"></span></div><article class="mock-question"><small>${escape(question.subject)} · ${escape(question.topic)}</small><h3>${escape(question.stem)}</h3><div class="mock-choices">${question.choices.map((choice, index) => `<label><input type="radio" name="mockAnswer" value="${index}" ${exam.answers[questionIndex] === index ? 'checked' : ''}><span><b>${'ABCDE'[index]}</b>${escape(choice)}</span></label>`).join('')}</div></article><div class="mock-actions"><button type="button" class="cycle-btn" data-mock-action="previous" ${questionIndex === 0 ? 'disabled' : ''}>← Anterior</button><button type="button" class="cycle-btn" data-mock-action="mark">${exam.marked.includes(questionIndex) ? '✓ Marcada' : 'Marcar para revisar'}</button><button type="button" class="cycle-btn primary" data-mock-action="next" ${questionIndex >= exam.questions.length - 1 ? 'disabled' : ''}>Próxima →</button></div><div class="mock-question-nav" aria-label="Ir para questão">${exam.questions.map((_, index) => `<button type="button" data-mock-index="${index}" class="${index === questionIndex ? 'active' : ''} ${exam.marked.includes(index) ? 'marked' : ''}" aria-label="Questão ${index + 1}${exam.answers[index] !== null ? ', respondida' : ''}">${index + 1}</button>`).join('')}</div><button type="button" class="cycle-btn mock-finish" data-mock-action="finish">Finalizar e corrigir</button>`;
            return;
        }
        const result = core.grade(exam.questions, exam.answers);
        const eligible = exam.questions.filter((question, index) => (exam.answers[index] !== question.correctIndex || exam.marked.includes(index)) && !exam.reviewedIds.includes(index)).length;
        root.innerHTML = `<div class="mock-result"><div class="mock-result-hero"><span class="workspace-kicker">SEU RESULTADO</span><strong>${result.percent}%</strong><p>${result.correct} acertos · ${result.wrong} erros · ${result.blank} em branco · ${Math.ceil(exam.elapsedSeconds / 60)} min ativos</p></div><div class="mock-result-breakdown">${Object.entries(result.bySubject).map(([subject, stats]) => `<div><strong>${escape(subject)}</strong><span>${stats.correct}/${stats.correct + stats.wrong + stats.blank} acertos</span></div>`).join('')}</div><div class="mock-actions"><button type="button" class="cycle-btn primary" data-mock-action="reviews" ${eligible ? '' : 'disabled'}>Adicionar ${eligible} à Caixa de Revisões</button><button type="button" class="cycle-btn" data-mock-action="delete">Excluir simulado</button></div><p class="mock-ai-caution">As questões e explicações foram produzidas por IA. Confirme conteúdos duvidosos com seu material de estudo.</p><h3>Correção por questão</h3>${exam.questions.map((question, index) => `<details class="mock-correction"><summary><span>${index + 1}. ${escape(question.topic)}</span><b class="${exam.answers[index] === question.correctIndex ? 'correct' : 'wrong'}">${exam.answers[index] === null ? 'Em branco' : exam.answers[index] === question.correctIndex ? 'Acertou' : 'Errou'}</b></summary><p>${escape(question.stem)}</p><p>Sua resposta: ${exam.answers[index] === null ? 'Em branco' : escape(question.choices[exam.answers[index]])}</p><p>Correta: <strong>${escape(question.choices[question.correctIndex])}</strong></p><p>${escape(question.explanation)}</p></details>`).join('')}</div>`;
        const topics = Object.entries(result.byTopic).sort((a, b) => (a[1].correct / (a[1].correct + a[1].wrong + a[1].blank)) - (b[1].correct / (b[1].correct + b[1].wrong + b[1].blank)));
        if (topics.length) {
            const section = document.createElement('section');
            section.className = 'mock-topic-breakdown';
            const heading = document.createElement('h3');
            heading.textContent = 'Desempenho por assunto';
            section.append(heading);
            topics.forEach(([topic, stats]) => {
                const row = document.createElement('div');
                const title = document.createElement('strong');
                title.textContent = topic;
                const count = document.createElement('span');
                count.textContent = `${stats.correct}/${stats.correct + stats.wrong + stats.blank} acertos`;
                row.append(title, count);
                section.append(row);
            });
            root.querySelector('.mock-result-breakdown').after(section);
        }
    }
    function close() {
        if (pendingExam && !confirm('Esta prévia ainda não foi salva. Fechar e descartá-la?')) return;
        if (generating) { abortController?.abort(); requestVersion++; }
        pendingExam = null;
        el('mockExamDialog').close();
        if (current()?.status === 'running') try { saveAppData(); } catch { showToast('Não foi possível salvar o tempo do simulado.', true); }
    }
    el('mockExamForm')?.addEventListener('submit', generate);
    el('mockExamClose')?.addEventListener('click', close);
    el('mockExamContent')?.addEventListener('click', event => {
        const indexButton = event.target.closest('[data-mock-index]');
        if (indexButton) { questionIndex = Number(indexButton.dataset.mockIndex); render(); return; }
        const action = event.target.closest('[data-mock-action]')?.dataset.mockAction;
        if (action === 'start') start();
        else if (action === 'save') { if (saveDraft()) render(); }
        else if (action === 'edit-request') { pendingExam = null; activeId = ''; el('mockExamSetup').hidden = false; el('mockExamContent').replaceChildren(); el('mockExamStatus').textContent = 'Ajuste o pedido e gere uma nova prévia. Isso usará outra geração gratuita.'; }
        else if (action === 'previous') { questionIndex = Math.max(0, questionIndex - 1); render(); }
        else if (action === 'next') { questionIndex = Math.min(current().questions.length - 1, questionIndex + 1); render(); }
        else if (action === 'mark') toggleMark();
        else if (action === 'finish') finish();
        else if (action === 'reviews') addReviews();
        else if (action === 'delete') deleteExam(activeId);
    });
    el('mockExamContent')?.addEventListener('change', event => { if (event.target.name === 'mockAnswer') saveAnswer(event.target.value); });
    el('mockExamDrafts')?.addEventListener('click', event => {
        const open = event.target.closest('[data-mock-open]'); if (open) openExam(open.dataset.mockOpen);
        const remove = event.target.closest('[data-mock-delete]'); if (remove) deleteExam(remove.dataset.mockDelete);
    });
    el('mockExamDialog')?.addEventListener('cancel', event => { event.preventDefault(); close(); });
    clock = setInterval(() => {
        const exam = current();
        if (exam?.status !== 'running' || !el('mockExamDialog').open || document.visibilityState !== 'visible') return;
        exam.elapsedSeconds = Math.max(0, Number(exam.elapsedSeconds) || 0) + 1;
        if (exam.elapsedSeconds % 15 === 0) try { saveAppData(); } catch { el('mockExamStatus').textContent = 'Tempo ainda não sincronizado. Mantenha esta tela aberta e verifique o armazenamento.'; }
    }, 1000);
    window.KingMockExams = { openSetup, openExam, renderDrafts };
    renderDrafts();
})();
