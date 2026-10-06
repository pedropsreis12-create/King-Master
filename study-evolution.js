(function () {
    const core = window.KingStudyEvolutionCore;
    const byId = id => document.getElementById(id);
    const safe = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' })[char]);
    const names = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
    const deadlineTypes = { isencao: ['Pedido de isenção', 10], justificativa: ['Justificativa de ausência', 10], inscricao: ['Inscrição', 7], pagamento: ['Pagamento da taxa', 5], local: ['Cartão de confirmação / local de prova', 3], prova: ['Prova', 30], gabarito: ['Gabarito', 1], resultado: ['Resultado', 3], sisu: ['SISU', 7], prouni: ['ProUni', 7], fies: ['FIES', 7], matricula: ['Matrícula', 5], outro: ['Outro', 7] };
    const enemSubjects = ['Matemática', 'Física', 'Química', 'Biologia', 'História', 'Geografia', 'Filosofia', 'Sociologia', 'Gramática', 'Literatura', 'Inglês', 'Espanhol', 'Redação'];
    const defaultSelectedSubjects = enemSubjects.filter(name => name !== 'Espanhol');
    const defaultWeight = name => /matem[aá]tica|reda[cç][aã]o/i.test(name) ? 5 : /f[ií]sica|qu[ií]mica|biologia|gram[aá]tica|literatura/i.test(name) ? 3 : 2;
    let profileStep = 0, profileDraft = null, adjusting = false, annualYear = new Date().getFullYear();
    const dateDiff = (a, b) => Math.round((new Date(`${a}T12:00:00`) - new Date(`${b}T12:00:00`)) / 86400000);
    function formatMinutes(minutes) { const n = Math.max(0, Math.round(Number(minutes) || 0)); return n >= 60 ? `${Math.floor(n / 60)}h${String(n % 60).padStart(2, '0')}` : `${n}m`; }
    function profile() { return appData.studentPlan || {}; }
    function openProfile() {
        profileDraft = structuredClone({ ...{ configured: false, goal: 'enem', weights: {}, rhythm: 'equilibrado', minutesByWeekday: [0, 240, 240, 240, 240, 240, 120] }, ...profile() });
        profileStep = 0; renderProfile(); byId('studyProfileModal').classList.add('active');
    }
    function collectStep() {
        if (!profileDraft) return;
        if (profileStep === 0) {
            profileDraft.goal = byId('profileGoal')?.value || 'enem'; profileDraft.course = byId('profileCourse')?.value.trim().slice(0, 80) || '';
            profileDraft.target = byId('profileTarget')?.value.trim().slice(0, 30) || '';
            profileDraft.examName = byId('profileExamName')?.value.trim().slice(0, 80) || '';
        } else if (profileStep === 1) {
            for (const input of byId('studyProfileBody').querySelectorAll('[data-profile-weight]')) profileDraft.weights[input.dataset.profileWeight] = Math.max(1, Math.min(5, Number(input.value) || 1));
            profileDraft.selectedDefaultSubjects = [...byId('studyProfileBody').querySelectorAll('[data-enem-subject]:checked')].map(input => input.value);
            profileDraft.customSubject = byId('profileCustomSubject')?.value.trim().slice(0, 60) || '';
        } else if (profileStep === 2) {
            profileDraft.examDate = byId('profileExamDate')?.value || ''; profileDraft.examDate2 = byId('profileExamDate2')?.value || '';
            profileDraft.rhythm = byId('profileRhythm')?.value || 'equilibrado';
            for (const checkbox of byId('studyProfileBody').querySelectorAll('[data-profile-day]')) if (!checkbox.checked) profileDraft.minutesByWeekday[Number(checkbox.dataset.profileDay)] = 0;
                else if (!profileDraft.minutesByWeekday[Number(checkbox.dataset.profileDay)]) profileDraft.minutesByWeekday[Number(checkbox.dataset.profileDay)] = 120;
        } else {
            for (const input of byId('studyProfileBody').querySelectorAll('[data-profile-minutes]')) profileDraft.minutesByWeekday[Number(input.dataset.profileMinutes)] = Math.max(0, Math.min(720, Number(input.value) || 0));
        }
    }
    function renderProfile() {
        const labels = ['1 · Objetivo', '2 · Matérias', '3 · Ritmo e prazo', '4 · Carga horária'];
        byId('studyProfileSteps').innerHTML = labels.map((label, index) => `<button type="button" data-profile-step="${index}" aria-selected="${index === profileStep}">${label}</button>`).join('');
        const draft = profileDraft;
        const weights = draft.weights || {};
        const content = [
            `<div class="evolution-form-grid"><label>Objetivo<select id="profileGoal" class="cycle-input"><option value="enem" ${draft.goal === 'enem' ? 'selected' : ''}>ENEM</option><option value="vestibular" ${draft.goal === 'vestibular' ? 'selected' : ''}>Vestibular</option></select></label><label>Nome da prova (se vestibular)<input id="profileExamName" class="cycle-input" maxlength="80" value="${safe(draft.examName || '')}" placeholder="Ex.: Vestibular UESC"></label><label>Curso desejado<input id="profileCourse" class="cycle-input" maxlength="80" value="${safe(draft.course || '')}" placeholder="Ex.: Direito"></label><label>Nota ou % de acerto desejado<input id="profileTarget" class="cycle-input" maxlength="30" value="${safe(draft.target || '')}" placeholder="Ex.: 800 pontos"></label></div>`,
            `<p>Defina o peso de 1 a 5. Sem questões registradas, o sistema não inventa uma taxa de acerto.</p><div class="evolution-weight-list">${(appData.cycleItems || []).map(subject => `<label>${safe(subject.subject)}<select class="cycle-input" data-profile-weight="${safe(subject.id)}">${[1,2,3,4,5].map(weight => `<option value="${weight}" ${(Number(weights[subject.id]) || defaultWeight(subject.subject)) === weight ? 'selected' : ''}>Peso ${weight}</option>`).join('')}</select></label>`).join('') || `<p>Matérias do ENEM para começar (escolha Inglês ou Espanhol):</p>${enemSubjects.map(name => `<label><input type="checkbox" data-enem-subject value="${safe(name)}" ${(draft.selectedDefaultSubjects || defaultSelectedSubjects).includes(name) ? 'checked' : ''}> ${safe(name)}</label>`).join('')}`}</div><label class="evolution-custom-subject">Adicionar matéria própria<input id="profileCustomSubject" class="cycle-input" maxlength="60" value="${safe(draft.customSubject || '')}" placeholder="Ex.: História da Bahia"></label>`,
            `<div class="evolution-form-grid"><label>Data da prova<input type="date" class="cycle-input" id="profileExamDate" value="${safe(draft.examDate || '')}"></label><label>Segundo dia (opcional)<input type="date" class="cycle-input" id="profileExamDate2" value="${safe(draft.examDate2 || '')}"></label><label>Ritmo<select class="cycle-input" id="profileRhythm"><option value="intenso" ${draft.rhythm === 'intenso' ? 'selected' : ''}>Plano intenso</option><option value="equilibrado" ${draft.rhythm === 'equilibrado' ? 'selected' : ''}>Equilibrado</option><option value="leve" ${draft.rhythm === 'leve' ? 'selected' : ''}>Leve</option></select></label></div><div class="evolution-days">${names.map((name, index) => `<label><input type="checkbox" data-profile-day="${index}" ${draft.minutesByWeekday[index] > 0 ? 'checked' : ''}> ${name}</label>`).join('')}</div>`,
            `<p>Informe os minutos disponíveis em cada dia. Zero significa folga, não falha.</p><div class="evolution-minutes">${names.map((name, index) => `<label>${name}<input type="number" class="cycle-input" min="0" max="720" step="5" data-profile-minutes="${index}" value="${Number(draft.minutesByWeekday[index]) || 0}"></label>`).join('')}</div><strong id="profileWeeklyTotal">${formatMinutes(draft.minutesByWeekday.reduce((sum, item) => sum + (Number(item) || 0), 0))} por semana</strong>`
        ];
        byId('studyProfileBody').innerHTML = content[profileStep];
        byId('studyProfileBack').hidden = profileStep === 0;
        byId('studyProfileNext').hidden = profileStep === 3;
        byId('studyProfileSave').hidden = profileStep !== 3;
    }
    function saveProfile(event) {
        event.preventDefault(); collectStep();
        for (const name of profileDraft.selectedDefaultSubjects || []) if (!appData.cycleItems.some(item => core.key(item.subject) === core.key(name))) {
            const subject = { id: Date.now() + appData.cycleItems.length, subject: name, color: '#3478e9', topicos: [], temas: [], questoes: 0, acertos: 0, erros: 0 };
            appData.cycleItems.push(subject);
            profileDraft.weights[subject.id] = defaultWeight(name);
        }
        if (profileDraft.customSubject && !(appData.cycleItems || []).some(item => core.key ? core.key(item.subject) === core.key(profileDraft.customSubject) : item.subject.toLowerCase() === profileDraft.customSubject.toLowerCase())) {
            appData.cycleItems.push({ id: Date.now(), subject: profileDraft.customSubject, color: '#3478e9', topicos: [], temas: [], questoes: 0, acertos: 0, erros: 0 });
        }
        delete profileDraft.customSubject;
        delete profileDraft.selectedDefaultSubjects;
        profileDraft.configured = true;
        appData.studentPlan = profileDraft;
        appData.onboardingCompleted = true;
        saveAppData(); fecharModal('studyProfileModal'); render();
        showToast('Plano atualizado. Seu histórico foi preservado.');
    }
    function historyInWeek(weekDates) {
        const start = weekDates[0], end = weekDates[6];
        return (appData.historyItems || []).filter(item => {
            const day = dataHistoricoISO(item);
            return day >= start && day <= end;
        });
    }
    function weeklyActual(dates) {
        const amounts = {};
        for (const item of historyInWeek(dates)) {
            const subject = appData.cycleItems.find(entry => String(entry.id) === String(item.subjectId) || entry.subject === item.materia);
            if (subject) amounts[subject.id] = (amounts[subject.id] || 0) + Math.max(0, Number(item.tempoSegundos || item.segundos) || 0) / 60;
        }
        return amounts;
    }
    function buildWeekly(iso = core.localIso(new Date())) {
        const dates = core.weekDates(iso), key = core.isoWeek(iso);
        const previous = core.weekDates(core.addDays(dates[0], -7));
        const base = core.weeklyAllocation(appData.cycleItems, profile(), appData.historyItems, iso, appData.dailyGoalMinutes);
        const allocation = previous[6] < core.localIso(new Date()) ? core.reinforce(base, weeklyActual(previous)) : base;
        const hasRecentExam = (appData.simuladosItems || []).some(item => Number(item.id || item.criadoEm) > Date.now() - 21 * 86400000);
        const tasks = [{ id: 'flashcards', title: 'Flashcards todos os dias, 15 a 25 min', done: false },
            { id: 'essay', title: `Redação: ${allocation.stage === 'reta-final' ? 2 : 1} ${allocation.stage === 'reta-final' ? 'textos' : 'texto'}`, done: false },
            { id: 'review', title: 'Revisão semanal de 30 min: ver desempenho e ajustar', done: false }];
        if (allocation.stage === 'reta-final' || !hasRecentExam) tasks.push({ id: 'exam', title: 'Simulado completo', done: false });
        const upcoming = (appData.prazos || []).filter(item => item.data && item.data >= dates[0] && item.data <= core.addDays(dates[6], 7) && !item.concluido).map(item => item.titulo);
        return { key, createdAt: Date.now(), status: 'proposta', allocation, tasks, note: allocation.note, upcoming };
    }
    function currentWeekly() {
        if (!profile().configured) return null;
        const key = core.isoWeek(core.localIso(new Date()));
        if (appData.planosSemanais[key]?.status === 'proposta' && core.localIso(new Date(appData.planosSemanais[key].createdAt)) < core.weekDates(core.localIso(new Date()))[0]) appData.planosSemanais[key] = buildWeekly();
        if (!appData.planosSemanais[key]) {
            appData.planosSemanais[key] = buildWeekly();
            const ordered = Object.keys(appData.planosSemanais).sort();
            while (ordered.length > 12) delete appData.planosSemanais[ordered.shift()];
            saveAppData();
        }
        return appData.planosSemanais[key];
    }
    function renderWeekly() {
        const target = byId('studyWeeklyCard'); if (!target) return;
        if (!profile().configured) { target.innerHTML = '<span class="workspace-kicker">CICLO DA SEMANA</span><h2>Um plano que cabe na sua vida</h2><p>Informe seu objetivo e os horários livres. O histórico existente continuará intacto.</p><button type="button" class="cycle-btn primary" data-evolution-action="profile">Personalizar meu plano</button>'; return; }
        const plan = currentWeekly();
        const today = core.localIso(new Date());
        let nextWeekMessage = '';
        if (new Date().getDay() >= 5) {
            const nextMonday = core.addDays(core.weekDates(today)[6], 1), nextKey = core.isoWeek(nextMonday);
            if (!appData.planosSemanais[nextKey]) { appData.planosSemanais[nextKey] = buildWeekly(nextMonday); saveAppData(); }
            nextWeekMessage = ' · A proposta da próxima semana já está preparada.';
        }
        const actual = weeklyActual(core.weekDates(core.localIso(new Date())));
        const targets = plan.allocation.subjects;
        const next = [...targets].sort((a, b) => (b.minutes - (actual[b.id] || 0)) - (a.minutes - (actual[a.id] || 0)))[0];
        target.innerHTML = `<div class="section-list-heading"><div><span class="workspace-kicker">CICLO DA SEMANA</span><h2>${plan.status === 'aceita' ? 'Sua semana está pronta' : 'Proposta para sua semana'}</h2></div><span>${formatMinutes(plan.allocation.total)} de meta</span></div><p>Próximo bloco: <strong>${safe(next?.name || 'defina suas matérias')}</strong>${plan.note ? ` · ${safe(plan.note)}` : ''}${nextWeekMessage}</p><div class="evolution-weekly-bars">${targets.map(item => `<div><label>${safe(item.name)}<small>Feito ${formatMinutes(actual[item.id] || 0)} de ${formatMinutes(item.minutes)}</small></label><span><i style="width:${item.minutes ? Math.min(100, Math.round((actual[item.id] || 0) / item.minutes * 100)) : 0}%"></i></span>${adjusting ? `<input type="number" min="0" step="5" data-weekly-minutes="${safe(item.id)}" value="${item.minutes}" aria-label="Meta semanal de ${safe(item.name)} em minutos">` : ''}</div>`).join('')}</div><p>Redação ${formatMinutes(plan.allocation.essayMinutes)} · Revisão e simulados ${formatMinutes(plan.allocation.reviewMinutes)}</p>${plan.upcoming?.length ? `<p>Prazos próximos: ${safe(plan.upcoming.join(', '))}</p>` : ''}<div class="evolution-weekly-actions"><button type="button" class="cycle-btn primary" data-evolution-action="accept">Aceitar</button><button type="button" class="cycle-btn" data-evolution-action="adjust">${adjusting ? 'Salvar ajustes' : 'Ajustar'}</button><button type="button" class="cycle-btn" data-evolution-action="redo">Refazer</button><button type="button" class="cycle-btn" data-evolution-action="schedule">Abrir organizador do Cronograma</button></div>${plan.status === 'aceita' ? `<div class="evolution-weekly-tasks">${plan.tasks.map(task => `<label><input type="checkbox" data-weekly-task="${task.id}" ${task.done ? 'checked' : ''}> ${safe(task.title)}</label>`).join('')}</div>` : ''}`;
    }
    function deadlineLabel(item, today) {
        if (!item.data) return 'Data a confirmar no edital oficial';
        const days = dateDiff(item.data, today);
        return days === 0 ? 'Hoje' : days === 1 ? 'Amanhã' : days < 0 ? `há ${-days} dias (atrasado)` : `em ${days} dias`;
    }
    function googleLink(item) {
        if (!item.data) return '';
        const start = item.data.replace(/-/g, ''), end = core.addDays(item.data, 1).replace(/-/g, '');
        return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(item.titulo)}&dates=${start}/${end}&details=${encodeURIComponent('Confira a data no edital oficial.')}`;
    }
    function renderDeadlines() {
        const list = byId('studyDeadlineList'); if (!list) return;
        const today = core.localIso(new Date());
        const items = [...(appData.prazos || [])].sort((a, b) => Number(Boolean(a.concluido)) - Number(Boolean(b.concluido)) || (a.data || '9999').localeCompare(b.data || '9999'));
        list.innerHTML = items.length ? items.map(item => `<article class="evolution-deadline-row"><div><strong>${safe(item.titulo)}</strong><small>${safe(deadlineTypes[item.tipo]?.[0] || 'Outro')} · ${safe(deadlineLabel(item, today))}${item.prova ? ` · ${safe(item.prova)}` : ''}</small></div><div><button type="button" data-deadline-edit="${Number(item.id)}">Editar</button><button type="button" data-deadline-toggle="${Number(item.id)}">${item.concluido ? 'Reabrir' : 'Concluído'}</button>${item.data ? `<a href="${googleLink(item)}" target="_blank" rel="noopener noreferrer">Adicionar ao Google Agenda</a>` : ''}<button type="button" data-deadline-delete="${Number(item.id)}">Excluir</button></div></article>`).join('') : '<p>Sem prazos cadastrados. Você pode criar um prazo ou começar por modelos sem datas inventadas.</p>';
        const urgent = items.filter(item => !item.concluido && item.data && dateDiff(item.data, today) <= (deadlineTypes[item.tipo]?.[1] || 7));
        const summary = byId('studyDeadlinesToday'); summary.hidden = !urgent.length;
        if (urgent.length) summary.innerHTML = `<span class="workspace-kicker">PRAZOS PRÓXIMOS</span><h2>${urgent.length} ${urgent.length === 1 ? 'prazo merece' : 'prazos merecem'} atenção</h2><p>${safe(urgent.slice(0, 3).map(item => `${item.titulo} · ${deadlineLabel(item, today)}`).join(' · '))}</p><button type="button" class="cycle-btn" onclick="showSection('agendamento')">Ver prazos</button>`;
    }
    function openDeadline(id = null) {
        const item = (appData.prazos || []).find(entry => entry.id === Number(id));
        byId('studyDeadlineTitle').textContent = item ? 'Editar prazo' : 'Novo prazo';
        byId('studyDeadlineId').value = item?.id || '';
        byId('studyDeadlineName').value = item?.titulo || '';
        byId('studyDeadlineType').innerHTML = Object.entries(deadlineTypes).map(([value, [label]]) => `<option value="${value}">${safe(label)}</option>`).join('');
        byId('studyDeadlineType').value = item?.tipo || 'outro';
        byId('studyDeadlineDate').value = item?.data || '';
        byId('studyDeadlineExam').value = item?.prova || '';
        byId('studyDeadlineModal').classList.add('active');
    }
    function addDeadlineTemplates() {
        const year = new Date().getFullYear();
        let added = 0;
        for (const [type, [label]] of Object.entries(deadlineTypes)) {
            if (type === 'outro') continue;
            const title = `ENEM ${year} · ${label}`;
            if (appData.prazos.some(item => item.titulo === title)) continue;
            appData.prazos.push({ id: Date.now() + added, titulo: title, tipo: type, data: '', prova: `ENEM ${year}`, concluido: false, nota: 'Confira a data no edital oficial' });
            added++;
        }
        if (added) saveAppData(); renderDeadlines(); showToast(added ? `${added} modelos adicionados, sem datas inventadas.` : 'Os modelos deste ano já estão na Agenda.');
    }
    function renderHeatmap(targetId) {
        const target = byId(targetId); if (!target) return;
        const map = core.heatmap(appData.historyItems, profile(), core.localIso(new Date()), appData.dailyGoalMinutes, appData.revisoesItems);
        const months = Array.from({ length: 26 }, (_, week) => { const day = map.days[week * 7]; return day.iso.slice(8, 10) <= '07' ? new Date(`${day.iso}T12:00:00`).toLocaleDateString('pt-BR', { month: 'short' }) : ''; });
        target.innerHTML = `<div class="section-list-heading"><div><span class="workspace-kicker">ÚLTIMAS 26 SEMANAS</span><h2>Mapa de calor da constância</h2></div><span>${map.fulfilled} dias com meta cumprida · sequência atual ${map.current} · melhor ${map.best}</span></div><div class="evolution-heat-scroll" role="img" aria-label="Últimas 26 semanas: ${map.fulfilled} dias com meta cumprida"><div class="evolution-heat-months">${months.map(month => `<span>${safe(month)}</span>`).join('')}</div><div class="evolution-heat-body"><div class="evolution-heat-days">Seg<br>Qua<br>Sex</div><div class="evolution-heat-grid">${map.days.map(day => `<span class="heat-${day.state}" title="${safe(day.iso)} · ${formatMinutes(day.minutes)} de ${formatMinutes(day.target)} · ${day.questions} questões · ${day.reviews} revisões" aria-label="${safe(day.iso)}: ${formatMinutes(day.minutes)} de ${formatMinutes(day.target)}, ${day.questions} questões, ${day.reviews} revisões"></span>`).join('')}</div></div></div>`;
    }
    function renderAnnual() {
        const target = byId('studyAnnualHistory'); if (!target) return;
        const years = new Set([new Date().getFullYear(), ...(appData.historyItems || []).map(item => Number(dataHistoricoISO(item).slice(0, 4))).filter(Boolean)]);
        if (!years.has(annualYear)) annualYear = Math.max(...years);
        const result = core.annual(appData.historyItems, annualYear);
        const max = Math.max(...result.months, 1);
        target.innerHTML = `<div class="section-list-heading"><div><span class="workspace-kicker">VISÃO DE LONGO PRAZO</span><h2>Histórico anual</h2></div><label>Ano <select id="evolutionAnnualYear">${[...years].sort((a, b) => b - a).map(year => `<option value="${year}" ${year === annualYear ? 'selected' : ''}>${year}</option>`).join('')}</select></label></div><p>${formatMinutes(result.total / 60)} estudadas · ${result.days} dias de estudo · melhor mês: ${result.total ? new Date(annualYear, result.bestMonth - 1, 1).toLocaleDateString('pt-BR', { month: 'long' }) : '—'}</p><div class="evolution-month-bars">${result.months.map((seconds, index) => `<div><span style="height:${Math.max(2, seconds / max * 100)}%"></span><small>${new Date(annualYear, index, 1).toLocaleDateString('pt-BR', { month: 'short' }).slice(0, 3)}</small></div>`).join('')}</div><div class="evolution-annual-subjects">${result.subjects.map(item => `<span>${safe(item.name)} · ${formatMinutes(item.seconds / 60)} · ${item.questions ? `${Math.round(item.correct / item.questions * 100)}% de acerto` : 'sem questões'}</span>`).join('')}</div>`;
    }
    function render() { renderWeekly(); renderDeadlines(); renderHeatmap('studyHeatmapToday'); renderHeatmap('studyHeatmapHistory'); renderAnnual(); }
    byId('studyProfileSteps')?.addEventListener('click', event => { const button = event.target.closest('[data-profile-step]'); if (button) { collectStep(); profileStep = Number(button.dataset.profileStep); renderProfile(); } });
    byId('studyProfileBack')?.addEventListener('click', () => { collectStep(); profileStep = Math.max(0, profileStep - 1); renderProfile(); });
    byId('studyProfileNext')?.addEventListener('click', () => { collectStep(); profileStep = Math.min(3, profileStep + 1); renderProfile(); });
    byId('studyProfileBody')?.addEventListener('input', event => { if (event.target.matches('[data-profile-minutes]')) byId('profileWeeklyTotal').textContent = `${formatMinutes([...byId('studyProfileBody').querySelectorAll('[data-profile-minutes]')].reduce((sum, input) => sum + (Number(input.value) || 0), 0))} por semana`; });
    byId('studyProfileForm')?.addEventListener('submit', saveProfile);
    byId('studyWeeklyCard')?.addEventListener('click', event => {
        const action = event.target.closest('[data-evolution-action]')?.dataset.evolutionAction;
        if (!action) return;
        if (action === 'profile') return openProfile();
        const plan = currentWeekly(); if (!plan) return;
        if (action === 'accept') plan.status = 'aceita';
        else if (action === 'adjust') {
            if (!adjusting) { adjusting = true; renderWeekly(); return; }
            for (const input of byId('studyWeeklyCard').querySelectorAll('[data-weekly-minutes]')) {
                const subject = plan.allocation.subjects.find(item => String(item.id) === input.dataset.weeklyMinutes);
                if (subject) subject.minutes = Math.max(0, Math.round((Number(input.value) || 0) / 5) * 5);
            }
            adjusting = false;
        } else if (action === 'redo') appData.planosSemanais[plan.key] = buildWeekly();
        else if (action === 'schedule') { showSection('cronograma'); window.KingSchedule?.organizeCurrentWeek?.(); return; }
        saveAppData(); renderWeekly();
    });
    byId('studyWeeklyCard')?.addEventListener('change', event => { const checkbox = event.target.closest('[data-weekly-task]'); if (!checkbox) return; const task = currentWeekly()?.tasks.find(item => item.id === checkbox.dataset.weeklyTask); if (task) { task.done = checkbox.checked; saveAppData(); } });
    byId('studyDeadlineForm')?.addEventListener('submit', event => {
        event.preventDefault();
        const id = Number(byId('studyDeadlineId').value) || Date.now();
        const old = appData.prazos.find(item => item.id === id);
        const value = { id, titulo: byId('studyDeadlineName').value.trim().slice(0, 100), tipo: byId('studyDeadlineType').value, data: byId('studyDeadlineDate').value, prova: byId('studyDeadlineExam').value.trim().slice(0, 80), concluido: old?.concluido || false };
        if (!value.titulo) return;
        if (old) Object.assign(old, value); else appData.prazos.push(value);
        saveAppData(); fecharModal('studyDeadlineModal'); renderDeadlines();
    });
    byId('studyDeadlineList')?.addEventListener('click', event => {
        const edit = event.target.closest('[data-deadline-edit]'); if (edit) return openDeadline(edit.dataset.deadlineEdit);
        const toggle = event.target.closest('[data-deadline-toggle]'); if (toggle) { const item = appData.prazos.find(entry => entry.id === Number(toggle.dataset.deadlineToggle)); if (item) { item.concluido = !item.concluido; saveAppData(); renderDeadlines(); } return; }
        const del = event.target.closest('[data-deadline-delete]'); if (del) abrirModalDeletar('prazo', Number(del.dataset.deadlineDelete), 'Excluir prazo?', 'Este prazo será removido da Agenda.');
    });
    byId('studyAnnualHistory')?.addEventListener('change', event => { if (event.target.id === 'evolutionAnnualYear') { annualYear = Number(event.target.value); renderAnnual(); } });
    window.KingStudyEvolution = { render, openProfile, openDeadline, addDeadlineTemplates, renderDeadlines };
    render();
})();
