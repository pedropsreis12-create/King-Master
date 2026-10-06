(() => {
    const Core = window.KingAutopilotCore;
    const panel = document.getElementById('autopilotPanel');
    if (!Core || !panel) return;
    const el = (tag, className = '', content = '') => {
        const node = document.createElement(tag);
        if (className) node.className = className;
        if (content) node.textContent = content;
        return node;
    };
    let queued = false;
    let currentPlan = null;
    function ensure() {
        if (!appData.autopilot || typeof appData.autopilot !== 'object' || Array.isArray(appData.autopilot)) appData.autopilot = {};
        const state = appData.autopilot;
        if (state.enabled !== false) state.enabled = true;
        if (!state.todayBudget || typeof state.todayBudget !== 'object') state.todayBudget = null;
        if (!state.subjectWeights || typeof state.subjectWeights !== 'object' || Array.isArray(state.subjectWeights)) state.subjectWeights = {};
        return state;
    }
    function button(label, action, value = '') {
        const node = el('button', 'cycle-btn', label);
        node.type = 'button'; node.dataset.autopilotAction = action;
        if (value !== '') node.dataset.autopilotValue = String(value);
        return node;
    }
    function render() {
        const state = ensure();
        const date = dataLocalISO();
        const budget = state.todayBudget?.date === date ? Number(state.todayBudget.minutes) : Number(appData.dailyGoalMinutes) || 240;
        currentPlan = Core.buildDailyPlan(appData, date, { budgetMinutes: budget });
        panel.replaceChildren();
        if (!state.enabled) { panel.hidden = true; return; }
        panel.hidden = false;
        const head = el('div', 'autopilot-head');
        const title = el('div');
        title.append(el('span', 'workspace-kicker', 'PLANO DE HOJE'), el('h2', '', currentPlan.comeback ? 'Recomeço leve' : 'Seu próximo passo'));
        const detail = el('p', '', currentPlan.comeback
            ? `Você ficou ${currentPlan.gap} dias sem registrar estudo. Hoje o objetivo é voltar ao ritmo, sem compensar tudo de uma vez.`
            : currentPlan.source === 'cronograma' ? 'O plano abaixo acompanha os blocos que você já colocou no Cronograma.'
                : 'Sugestão baseada nos assuntos, questões e revisões que você registrou. Ajuste se precisar.');
        title.append(detail);
        const budgetLabel = el('label', 'autopilot-budget'); budgetLabel.append(el('span', '', 'Tempo disponível hoje'));
        const select = el('select', 'cycle-input'); select.id = 'autopilotBudget'; select.setAttribute('aria-label', 'Tempo disponível hoje');
        const defaultOption = new Option(`Meta normal (${appData.dailyGoalMinutes || 240} min)`, 'default'); select.add(defaultOption);
        for (const minutes of [30, 60, 90, 120, 240]) if (minutes !== Number(appData.dailyGoalMinutes || 240)) select.add(new Option(`${minutes} min`, String(minutes)));
        select.value = state.todayBudget?.date === date ? String(state.todayBudget.minutes) : 'default';
        if (select.value === '') { select.add(new Option(`${budget} min`, String(budget))); select.value = String(budget); }
        budgetLabel.append(select); head.append(title, budgetLabel); panel.append(head);
        const note = el('p', 'autopilot-load', `${currentPlan.usedMinutes} min planejados · ${currentPlan.due.total} itens de memória para hoje`);
        panel.append(note);
        const pace = Core.paceSummary(appData, date);
        if (pace.length) {
            const rhythm = el('div', 'autopilot-rhythm');
            rhythm.append(el('strong', '', 'Ritmo nas questões · últimos 7 dias'));
            const rows = el('div', 'autopilot-rhythm-grid');
            for (const area of pace) {
                const row = el('div', `autopilot-rhythm-area${area.overTarget ? ' is-slow' : ''}`);
                const mmss = seconds => `${Math.floor(seconds / 60)}m ${String(seconds % 60).padStart(2, '0')}s`;
                row.append(el('span', '', area.area), el('b', '', mmss(area.averageSeconds)),
                    el('small', '', `${area.questions} questões · referência ${mmss(area.targetSeconds)}`));
                rows.append(row);
            }
            rhythm.append(rows, el('small', 'autopilot-rhythm-note', 'Referências de ritmo, não notas. A qualidade da resposta vem primeiro.'));
            panel.append(rhythm);
        }
        if (!currentPlan.tasks.length) {
            const empty = el('div', 'autopilot-empty');
            empty.append(el('strong', '', 'Monte sua base sem pressa'), el('p', '', 'Cadastre matérias e assuntos ou planeje a semana para receber um próximo passo concreto.'), button('Abrir Matérias', 'subjects'));
            panel.append(empty); return;
        }
        const list = el('ol', 'autopilot-tasks');
        currentPlan.tasks.forEach((task, index) => {
            const row = el('li', `autopilot-task${task.done ? ' is-done' : ''}`);
            row.append(el('span', 'autopilot-step', task.done ? '✓' : String(index + 1)));
            const copy = el('div', 'autopilot-task-copy');
            copy.append(el('strong', '', task.title), el('small', '', [task.subject, task.detail].filter(Boolean).join(' · ')));
            row.append(copy, el('span', 'autopilot-minutes', `${task.minutes} min`));
            const action = button(task.done ? 'Ver' : task.type === 'memory' ? 'Revisar' : task.type === 'practice' ? 'Treinar com IA' : 'Abrir', 'task', index);
            action.setAttribute('aria-label', `${action.textContent}: ${task.title}`); row.append(action); list.append(row);
        });
        panel.append(list);
        panel.append(el('p', 'autopilot-disclaimer', 'Tempo registrado não significa domínio. Seu desempenho em questões e revisões ajuda a ajustar o próximo passo.'));
    }
    function openTask(task) {
        if (!task) return;
        if (task.type === 'memory') {
            showSection(task.section);
        } else if (task.type === 'block') {
            window.KingSchedule?.goCurrentWeek?.();
            window.KingSchedule?.startBlock?.(task.blockId);
        } else if (task.type === 'practice') {
            if (window.KingPractice?.open) window.KingPractice.open({ subjectId: task.subjectId, topic: task.topic });
            else window.KingMockExams?.openSetup?.({ subjectId: task.subjectId, topic: task.topic, count: 20 });
        } else if (task.type === 'study') {
            abrirEspacoTopico(task.subjectId, task.topicIndex);
        }
    }
    panel.addEventListener('click', event => {
        const target = event.target.closest('[data-autopilot-action]'); if (!target) return;
        if (target.dataset.autopilotAction === 'subjects') return showSection('planejamento');
        if (target.dataset.autopilotAction === 'task') openTask(currentPlan?.tasks[Number(target.dataset.autopilotValue)]);
    });
    panel.addEventListener('change', event => {
        if (event.target.id !== 'autopilotBudget') return;
        const state = ensure(); const previous = state.todayBudget;
        state.todayBudget = event.target.value === 'default' ? null : { date: dataLocalISO(), minutes: Number(event.target.value) };
        try { saveAppData(); } catch { state.todayBudget = previous; showToast('Não foi possível salvar o ajuste deste dia.', true); render(); }
    });
    window.addEventListener('king-master-data-changed', () => {
        if (queued) return; queued = true;
        requestAnimationFrame(() => { queued = false; render(); });
    });
    window.KingAutopilot = { render, activeTopicFor: () => currentPlan?.tasks.find(task => task.type === 'study' && !task.done) || null };
    render();
})();
