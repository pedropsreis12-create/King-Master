/* Interface do cronograma semanal integrada às matérias, ao timer e ao histórico existentes. */
(() => {
    const Core = window.KingScheduleCore;
    if (!Core) return;

    const DAY_NAMES = { 1: 'Segunda', 2: 'Terça', 3: 'Quarta', 4: 'Quinta', 5: 'Sexta', 6: 'Sábado' };
    const DAY_SHORT = { 1: 'SEG', 2: 'TER', 3: 'QUA', 4: 'QUI', 5: 'SEX', 6: 'SÁB' };
    const STATUS = {
        pending: { label: 'Não iniciado', icon: '○' },
        running: { label: 'Em andamento', icon: '▶' },
        completed: { label: 'Concluído', icon: '✓' },
        missed: { label: 'Não realizado', icon: '×' }
    };
    let visibleWeek = Core.monday(new Date());
    let mobileDay = Math.min(6, Math.max(1, new Date().getDay() || 1));
    let draggedBlockId = null;

    const escape = value => typeof escaparRevisaoHtml === 'function'
        ? escaparRevisaoHtml(String(value ?? ''))
        : String(value ?? '').replace(/[&<>'"]/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[char]);
    const safeColor = value => /^#[0-9a-f]{6}$/i.test(String(value || '')) ? value : '#007aff';
    const byId = id => document.getElementById(id);
    const toast = (message, error = false) => typeof showToast === 'function' && showToast(message, error);
    const currentWeekKey = () => Core.monday(new Date());
    const dateForDay = (weekKey, day) => Core.addDays(weekKey, Number(day) - 1);
    const dayDate = (weekKey, day) => Core.fromIso(dateForDay(weekKey, day));
    const minutesText = minutes => {
        const value = Math.max(0, Math.round(Number(minutes) || 0));
        const hours = Math.floor(value / 60), rest = value % 60;
        return hours ? `${hours}h${rest ? ` ${rest}m` : ''}` : `${rest}m`;
    };
    const settings = () => Core.normalizeSettings(appData.studySchedule?.settings);

    function ensureData() {
        if (!appData.studySchedule || typeof appData.studySchedule !== 'object') appData.studySchedule = {};
        appData.studySchedule.settings = Core.normalizeSettings(appData.studySchedule.settings);
        if (!appData.studySchedule.weeks || typeof appData.studySchedule.weeks !== 'object' || Array.isArray(appData.studySchedule.weeks)) appData.studySchedule.weeks = {};
        if (!Array.isArray(appData.studySchedule.suggestions)) appData.studySchedule.suggestions = [];
        appData.cycleItems.forEach(subject => {
            subject.schedule = {
                icon: subject.schedule?.icon || '●',
                priority: Math.min(3, Math.max(1, Number(subject.schedule?.priority) || 2)),
                weeklyBlocks: Math.min(30, Math.max(0, Number(subject.schedule?.weeklyBlocks) || 0)),
                consecutive: Boolean(subject.schedule?.consecutive)
            };
        });
    }
    function week(create = true, key = visibleWeek) {
        ensureData();
        if (!appData.studySchedule.weeks[key] && create) appData.studySchedule.weeks[key] = { key, blocks: [], dailyClosures: {}, warnings: [] };
        const value = appData.studySchedule.weeks[key];
        if (value) {
            if (!Array.isArray(value.blocks)) value.blocks = [];
            if (!value.dailyClosures || typeof value.dailyClosures !== 'object') value.dailyClosures = {};
            if (!Array.isArray(value.warnings)) value.warnings = [];
        }
        return value;
    }
    const subject = id => appData.cycleItems.find(item => String(item.id) === String(id));
    const findBlock = (id, key = visibleWeek) => week(false, key)?.blocks.find(block => String(block.id) === String(id));

    function formatRange(key) {
        const start = Core.fromIso(key), end = Core.fromIso(Core.addDays(key, 5));
        const month = date => date.toLocaleDateString('pt-BR', { month: 'long' });
        if (start.getMonth() === end.getMonth()) return `${start.getDate()} – ${end.getDate()} de ${month(end)}`;
        return `${start.getDate()} de ${month(start)} – ${end.getDate()} de ${month(end)}`;
    }
    function getDayBlocks(day, key = visibleWeek) {
        return [...(week(false, key)?.blocks || [])].filter(block => Number(block.day) === Number(day)).sort((a, b) => (a.order ?? 999) - (b.order ?? 999) || Core.toMinutes(a.start) - Core.toMinutes(b.start));
    }
    function recomputeDay(day, key = visibleWeek) {
        const target = week(false, key);
        if (!target) return;
        const arranged = Core.arrangeTimes(target.blocks, settings(), day);
        arranged.forEach((block, index) => block.order = index);
    }
    function nextStart(day) {
        const list = getDayBlocks(day);
        if (!list.length) return settings().startTime;
        const last = list.at(-1);
        return Core.addMinutes(last.start, Number(last.duration) + settings().pauseMinutes);
    }

    function renderSummary() {
        const blocks = week(false)?.blocks || [];
        const completed = blocks.filter(block => block.status === 'completed');
        const plannedMinutes = blocks.reduce((sum, block) => sum + Number(block.duration || 0), 0);
        const completedMinutes = completed.reduce((sum, block) => sum + Number(block.duration || 0), 0);
        const percent = blocks.length ? Math.round(completed.length / blocks.length * 100) : 0;
        const studied = new Set(completed.map(block => String(block.subjectId))).size;
        byId('schedulePlannedHours').textContent = minutesText(plannedMinutes);
        byId('scheduleCompletedHours').textContent = minutesText(completedMinutes);
        byId('scheduleBlockCount').textContent = `${completed.length} / ${blocks.length}`;
        byId('scheduleProgressText').textContent = `${percent}%`;
        byId('scheduleProgressBar').style.width = `${percent}%`;
        byId('scheduleSubjectsCount').textContent = String(studied);
    }
    function renderMobileDays() {
        const activeDays = settings().studyDays;
        if (!activeDays.includes(mobileDay)) mobileDay = activeDays[0];
        byId('scheduleMobileDays').innerHTML = activeDays.map(day => {
            const date = dayDate(visibleWeek, day);
            return `<button type="button" role="tab" aria-selected="${day === mobileDay}" class="${day === mobileDay ? 'active' : ''}" onclick="KingSchedule.selectMobileDay(${day})"><strong>${DAY_SHORT[day]}</strong><small>${String(date.getDate()).padStart(2, '0')}</small></button>`;
        }).join('');
    }
    function blockHtml(block) {
        const mat = subject(block.subjectId);
        const color = safeColor(mat?.color);
        const status = STATUS[block.status] || STATUS.pending;
        const end = Core.addMinutes(block.start, block.duration);
        const result = block.result?.topic ? `<small class="schedule-block-topic">${escape(block.result.topic)}</small>` : '';
        const primary = block.status === 'completed'
            ? '<span class="schedule-block-done">Registrado</span>'
            : block.status === 'missed'
                ? `<button type="button" onclick="KingSchedule.setStatus('${block.id}','pending')">Reabrir</button>`
                : `<button type="button" onclick="KingSchedule.startBlock('${block.id}')">Estudar</button><button type="button" class="complete" onclick="KingSchedule.openComplete('${block.id}')">Concluir</button>`;
        return `<article class="schedule-block status-${block.status}" draggable="true" data-block-id="${block.id}" style="--block-color:${color}" ondragstart="KingSchedule.dragStart(event,'${block.id}')" ondragend="KingSchedule.dragEnd(event)"><div class="schedule-block-time"><strong>${escape(block.start)}</strong><small>${escape(end)}</small></div><div class="schedule-block-copy"><span class="schedule-block-icon" aria-hidden="true">${escape(mat?.schedule?.icon || '●')}</span><div><strong>${escape(mat?.subject || 'Matéria removida')}</strong><small>${block.duration} min · ${status.icon} ${status.label}</small>${result}</div></div><div class="schedule-block-actions">${primary}<button type="button" class="edit" onclick="KingSchedule.openBlock('${block.id}')" aria-label="Editar bloco">•••</button></div></article>`;
    }
    function dayHtml(day) {
        const blocks = getDayBlocks(day);
        const date = dayDate(visibleWeek, day);
        const distinct = new Set(blocks.map(block => String(block.subjectId))).size;
        const warning = distinct > settings().maxSubjectsPerDay;
        const items = [];
        blocks.forEach((block, index) => {
            if (index) {
                const previous = blocks[index - 1];
                const gap = Core.toMinutes(block.start) - (Core.toMinutes(previous.start) + Number(previous.duration));
                if (gap > 0) items.push(`<div class="schedule-pause"><span></span><small>${gap} min de pausa</small><span></span></div>`);
            }
            items.push(blockHtml(block));
        });
        const closing = week(false)?.dailyClosures?.[day];
        if (blocks.length) items.push(`<button type="button" class="schedule-closing ${closing ? 'saved' : ''}" onclick="KingSchedule.openDayClose(${day})"><span>✓</span><div><strong>${closing ? 'Dia registrado' : 'Registro no King Master'}</strong><small>${settings().closingMinutes} min · ${closing ? 'Resumo salvo' : 'Fechamento do dia'}</small></div></button>`);
        const empty = `<div class="schedule-day-empty"><span>＋</span><strong>Dia livre</strong><small>Adicione ou arraste um bloco para cá.</small></div>`;
        return `<section class="schedule-day ${day === mobileDay ? 'mobile-active' : ''}" data-day="${day}" ondragover="KingSchedule.dragOver(event)" ondrop="KingSchedule.drop(event,${day})"><header><div><span>${DAY_SHORT[day]}</span><strong>${date.getDate()}</strong></div><small>${blocks.length} ${blocks.length === 1 ? 'bloco' : 'blocos'}</small><button type="button" onclick="KingSchedule.openBlock(null,${day})" aria-label="Adicionar bloco na ${DAY_NAMES[day]}">+</button></header>${warning ? '<p class="schedule-day-warning">Mais de duas matérias neste dia</p>' : ''}<div class="schedule-day-list">${items.join('') || empty}</div></section>`;
    }
    function renderNotice() {
        const notice = byId('scheduleNotice');
        const days = settings().studyDays.filter(day => new Set(getDayBlocks(day).map(block => String(block.subjectId))).size > settings().maxSubjectsPerDay);
        if (days.length) {
            notice.hidden = false;
            notice.innerHTML = `<span aria-hidden="true">!</span><p><strong>Distribuição ajustada</strong> Para encaixar todas as matérias nesta semana, ${days.length === 1 ? `${DAY_NAMES[days[0]]} precisou` : 'alguns dias precisaram'} ter mais de ${settings().maxSubjectsPerDay} matérias.</p>`;
        } else notice.hidden = true;
    }
    function performanceSuggestion() {
        const ignored = new Set(appData.studySchedule.suggestions.filter(item => item.status === 'ignored').map(item => String(item.subjectId)));
        const weak = appData.cycleItems.map(item => {
            const total = Number(item.acertos || 0) + Number(item.erros || 0);
            return { item, total, rate: total ? Number(item.acertos || 0) / total * 100 : 100 };
        }).filter(entry => entry.total >= 10 && entry.rate < 60 && !ignored.has(String(entry.item.id))).sort((a, b) => a.rate - b.rate)[0];
        const box = byId('scheduleSuggestion');
        if (!weak) { box.hidden = true; return; }
        box.hidden = false;
        box.innerHTML = `<div class="schedule-suggestion-mark">✦</div><div><span>SUGESTÃO</span><strong>${escape(weak.item.subject)} merece atenção</strong><p>Seu desempenho recente está em ${Math.round(weak.rate)}%. Deseja aumentar a prioridade na próxima organização?</p></div><div><button type="button" class="cycle-btn primary" onclick="KingSchedule.applySuggestion('${weak.item.id}')">Aplicar</button><button type="button" class="cycle-btn" onclick="KingSchedule.ignoreSuggestion('${weak.item.id}')">Ignorar</button></div>`;
    }
    function render() {
        ensureData();
        const board = byId('scheduleBoard');
        if (!board) return;
        byId('scheduleWeekRange').textContent = formatRange(visibleWeek);
        byId('scheduleWeekEyebrow').textContent = visibleWeek === currentWeekKey() ? 'SEMANA ATUAL' : visibleWeek < currentWeekKey() ? 'SEMANA ANTERIOR' : 'PRÓXIMA SEMANA';
        renderSummary(); renderMobileDays(); renderNotice(); performanceSuggestion();
        const days = settings().studyDays;
        const blocks = week(false)?.blocks || [];
        if (!appData.cycleItems.length) {
            board.innerHTML = `<div class="schedule-empty widget"><b>▤</b><h2>Comece pelas suas matérias</h2><p>O cronograma usa apenas o que você cadastrar no King Master. Nenhuma matéria será escolhida por você.</p><button type="button" class="cycle-btn primary" onclick="showSection('planejamento');abrirModalCiclo()">Adicionar primeira matéria</button></div>`;
            return;
        }
        if (!blocks.length) {
            board.innerHTML = `<div class="schedule-empty widget"><b>▤</b><h2>Sua semana está pronta para ser montada</h2><p>Defina a carga semanal das matérias e organize automaticamente, ou adicione cada bloco à mão.</p><div><button type="button" class="cycle-btn" onclick="KingSchedule.openSettings()">Definir carga semanal</button><button type="button" class="cycle-btn primary" onclick="KingSchedule.organizeCurrentWeek()">Organizar semana</button></div></div>`;
            return;
        }
        board.innerHTML = days.map(dayHtml).join('');
    }

    function organizeCurrentWeek() {
        ensureData();
        const configured = appData.cycleItems.filter(item => Number(item.schedule?.weeklyBlocks) > 0);
        if (!configured.length) { toast('Defina quantos blocos semanais cada matéria terá.', true); return openSettings(); }
        const existing = week(false)?.blocks || [];
        if (existing.some(block => ['running', 'completed'].includes(block.status))) return toast('Esta semana já possui progresso. Use edição manual para não perder registros.', true);
        appData.studySchedule.weeks[visibleWeek] = Core.organize(appData.cycleItems, settings(), visibleWeek);
        saveAppData(); render(); toast('✓ Semana organizada pelas suas regras.');
    }
    function changeWeek(direction) { visibleWeek = Core.addDays(visibleWeek, Number(direction) * 7); render(); }
    function goCurrentWeek() { visibleWeek = currentWeekKey(); mobileDay = Math.min(6, Math.max(1, new Date().getDay() || 1)); render(); }
    function selectMobileDay(day) { mobileDay = Number(day); render(); }
    function copyToNextWeek() {
        const source = week(false);
        if (!source?.blocks?.length) return toast('Monte esta semana antes de copiá-la.', true);
        const next = Core.addDays(visibleWeek, 7);
        if (week(false, next)?.blocks?.length && !confirm('A próxima semana já tem blocos. Deseja substituí-los?')) return;
        appData.studySchedule.weeks[next] = Core.copyWeek(source, next);
        saveAppData(); visibleWeek = next; render(); toast('✓ Cronograma copiado. Você pode editar tudo normalmente.');
    }

    function openSettings() {
        ensureData();
        const value = settings();
        byId('scheduleStartTime').value = value.startTime;
        byId('scheduleBlockMinutes').value = value.blockMinutes;
        byId('schedulePauseMinutes').value = value.pauseMinutes;
        byId('scheduleClosingMinutes').value = value.closingMinutes;
        byId('scheduleMaxSubjects').value = value.maxSubjectsPerDay;
        document.querySelectorAll('#scheduleSettingsModal .schedule-day-options input').forEach(input => input.checked = value.studyDays.includes(Number(input.value)));
        byId('scheduleSubjectPlans').innerHTML = appData.cycleItems.length ? appData.cycleItems.map(item => `<article class="schedule-subject-plan" data-subject-id="${item.id}" style="--subject-color:${safeColor(item.color)}"><span class="schedule-plan-icon">${escape(item.schedule.icon)}</span><div><strong>${escape(item.subject)}</strong><small>${escape(item.type || 'Estudo')}</small></div><label><span>Blocos</span><input type="number" class="cycle-input" data-plan="blocks" min="0" max="30" value="${item.schedule.weeklyBlocks}"></label><label><span>Prioridade</span><select class="cycle-input" data-plan="priority"><option value="1" ${item.schedule.priority === 1 ? 'selected' : ''}>Baixa</option><option value="2" ${item.schedule.priority === 2 ? 'selected' : ''}>Normal</option><option value="3" ${item.schedule.priority === 3 ? 'selected' : ''}>Alta</option></select></label><label class="schedule-plan-consecutive"><input type="checkbox" data-plan="consecutive" ${item.schedule.consecutive ? 'checked' : ''}><span>Juntos</span></label></article>`).join('') : '<div class="schedule-settings-empty">Nenhuma matéria cadastrada.</div>';
        byId('scheduleSettingsModal').classList.add('active');
    }
    function saveSettings(event) {
        event.preventDefault();
        const days = [...document.querySelectorAll('#scheduleSettingsModal .schedule-day-options input:checked')].map(input => Number(input.value));
        if (!days.length) return toast('Escolha pelo menos um dia de estudo.', true);
        appData.studySchedule.settings = Core.normalizeSettings({ startTime: byId('scheduleStartTime').value, studyDays: days, blockMinutes: byId('scheduleBlockMinutes').value, pauseMinutes: byId('schedulePauseMinutes').value, closingMinutes: byId('scheduleClosingMinutes').value, maxSubjectsPerDay: byId('scheduleMaxSubjects').value });
        document.querySelectorAll('#scheduleSubjectPlans .schedule-subject-plan').forEach(card => {
            const item = subject(card.dataset.subjectId); if (!item) return;
            item.schedule.weeklyBlocks = Math.min(30, Math.max(0, Number(card.querySelector('[data-plan="blocks"]').value) || 0));
            item.schedule.priority = Number(card.querySelector('[data-plan="priority"]').value) || 2;
            item.schedule.consecutive = card.querySelector('[data-plan="consecutive"]').checked;
        });
        saveAppData(); fecharModal('scheduleSettingsModal'); render(); renderizarCiclo(); toast('✓ Configurações do cronograma salvas.');
    }

    function fillBlockSelects(selectedSubject, selectedDay) {
        const subjectSelect = byId('scheduleBlockSubject');
        subjectSelect.innerHTML = appData.cycleItems.map(item => `<option value="${item.id}">${escape(item.schedule?.icon || '●')} ${escape(item.subject)}</option>`).join('');
        if (selectedSubject != null) subjectSelect.value = String(selectedSubject);
        const daySelect = byId('scheduleBlockDay');
        daySelect.innerHTML = settings().studyDays.map(day => `<option value="${day}">${DAY_NAMES[day]}</option>`).join('');
        daySelect.value = String(selectedDay || mobileDay || settings().studyDays[0]);
    }
    function openBlock(id = null, requestedDay = null) {
        ensureData();
        if (!appData.cycleItems.length) { toast('Adicione uma matéria antes de criar o bloco.', true); showSection('planejamento'); return abrirModalCiclo(); }
        const block = id != null ? findBlock(id) : null;
        const day = block?.day || requestedDay || mobileDay || settings().studyDays[0];
        byId('scheduleBlockForm').reset();
        byId('scheduleBlockModalTitle').textContent = block ? 'Editar bloco' : 'Novo bloco';
        byId('scheduleBlockId').value = block?.id || '';
        byId('scheduleBlockWeek').value = visibleWeek;
        fillBlockSelects(block?.subjectId, day);
        byId('scheduleBlockStart').value = block?.start || nextStart(day);
        byId('scheduleBlockDuration').value = block?.duration || settings().blockMinutes;
        byId('scheduleBlockStatus').value = block?.status || 'pending';
        byId('scheduleDeleteBlock').hidden = !block;
        byId('scheduleBlockModal').classList.add('active');
    }
    function saveBlock(event) {
        event.preventDefault();
        const key = byId('scheduleBlockWeek').value || visibleWeek;
        const target = week(true, key);
        const id = byId('scheduleBlockId').value;
        const day = Number(byId('scheduleBlockDay').value);
        let block = id ? target.blocks.find(item => String(item.id) === String(id)) : null;
        const selectedStatus = byId('scheduleBlockStatus').value;
        const values = { subjectId: byId('scheduleBlockSubject').value, day, start: byId('scheduleBlockStart').value, duration: Math.min(240, Math.max(5, Number(byId('scheduleBlockDuration').value) || settings().blockMinutes)), status: selectedStatus === 'completed' && !block?.registered ? 'pending' : selectedStatus };
        const oldDay = block?.day;
        if (block) Object.assign(block, values);
        else { block = { id: Date.now(), order: getDayBlocks(day, key).length, registered: false, ...values }; target.blocks.push(block); }
        if (oldDay && Number(oldDay) !== day) recomputeDay(oldDay, key);
        target.blocks.filter(item => Number(item.day) === day).sort((a, b) => Core.toMinutes(a.start) - Core.toMinutes(b.start)).forEach((item, index) => item.order = index);
        saveAppData(); fecharModal('scheduleBlockModal'); render(); toast('✓ Bloco salvo no cronograma.');
    }
    function deleteEditingBlock() {
        const id = byId('scheduleBlockId').value, key = byId('scheduleBlockWeek').value || visibleWeek;
        const target = week(false, key); if (!target) return;
        const block = target.blocks.find(item => String(item.id) === String(id));
        if (block?.registered && !confirm('O registro no histórico será mantido. Deseja retirar apenas o bloco do cronograma?')) return;
        target.blocks = target.blocks.filter(item => String(item.id) !== String(id));
        if (block) recomputeDay(block.day, key);
        saveAppData(); fecharModal('scheduleBlockModal'); render(); toast('Bloco removido do cronograma.');
    }

    function setStatus(id, status) {
        if (status === 'completed') return openComplete(id);
        const block = findBlock(id); if (!block || !STATUS[status]) return;
        block.status = status;
        if (status !== 'running' && appData.activeScheduleBlock?.blockId == block.id) appData.activeScheduleBlock = null;
        saveAppData(); render();
    }
    function startBlock(id) {
        const block = findBlock(id), mat = subject(block?.subjectId); if (!block || !mat) return;
        if (appData.pendingStudySession) return toast('Finalize primeiro o registro de estudo que está pendente.', true);
        if (typeof isRunning !== 'undefined' && isRunning) return toast('Pause ou conclua o cronômetro atual antes de iniciar outro bloco.', true);
        (week(false)?.blocks || []).filter(item => item.status === 'running').forEach(item => item.status = 'pending');
        block.status = 'running';
        appData.activeScheduleBlock = { weekKey: visibleWeek, blockId: block.id };
        byId('activeSubjectSelect').value = String(mat.id);
        byId('inputHours').value = Math.floor(block.duration / 60);
        byId('inputMinutes').value = block.duration % 60;
        byId('inputSeconds').value = 0;
        if (typeof setMode === 'function') setMode('estudo');
        if (typeof atualizarSeletorDeMaterias === 'function') atualizarSeletorDeMaterias();
        if (typeof sincronizarTempo === 'function') sincronizarTempo();
        saveAppData(); showSection('dashboard'); toast(`${mat.subject}: bloco de ${block.duration} minutos preparado.`);
    }
    function openComplete(id) {
        const block = findBlock(id), mat = subject(block?.subjectId); if (!block || !mat) return;
        const linkedTimer = appData.activeScheduleBlock?.blockId == block.id;
        if (linkedTimer && typeof isRunning !== 'undefined' && isRunning) return toast('Pause ou encerre o cronômetro antes de concluir este bloco.', true);
        if (linkedTimer && typeof currentSeconds !== 'undefined' && currentSeconds >= 5) return prepararRegistroSessao(currentSeconds, 'cronograma');
        if (!linkedTimer && typeof currentSeconds !== 'undefined' && currentSeconds >= 5) return toast('Registre ou zere a sessão atual antes de concluir outro bloco.', true);
        if (appData.pendingStudySession && appData.pendingStudySession.scheduleBlockId != block.id) return toast('Finalize primeiro o registro de estudo que já está pendente.', true);
        appData.pendingStudySession = { seconds: block.duration * 60, subjectId: String(mat.id), origem: 'cronograma-manual', createdAt: Date.now(), scheduleWeekKey: visibleWeek, scheduleBlockId: block.id, scheduleCreditNeeded: true };
        saveAppData(); abrirRegistroSessaoPendente();
    }
    function completeFromSession(pending, details) {
        if (!pending?.scheduleBlockId) return;
        const block = findBlock(pending.scheduleBlockId, pending.scheduleWeekKey);
        if (!block) return;
        block.status = 'completed'; block.registered = true;
        const generic = details?.atividade === 'estudo' ? details.study || {} : details?.simulado || {};
        block.result = { topic: details?.assunto || '', questions: Number(generic.total ?? generic.questoes) || 0, hits: Number(generic.acertos) || 0, errors: Number(generic.erros) || 0, notes: details?.comentario || '', activity: details?.atividade || 'estudo', completedAt: Date.now() };
        if (pending.scheduleCreditNeeded) {
            const seconds = Number(pending.seconds) || block.duration * 60;
            appData.totalStudySeconds = Number(appData.totalStudySeconds || 0) + seconds;
            if (pending.scheduleWeekKey === currentWeekKey()) appData.weeklyChart[Number(block.day) - 1] = Number(appData.weeklyChart[Number(block.day) - 1] || 0) + seconds;
        }
        if (appData.activeScheduleBlock?.blockId == block.id) appData.activeScheduleBlock = null;
        setTimeout(() => { render(); maybeOpenDayClose(block.day, pending.scheduleWeekKey); }, 80);
    }

    function dailySummary(day, key = visibleWeek) {
        const blocks = getDayBlocks(day, key), completed = blocks.filter(block => block.status === 'completed');
        const result = completed.reduce((summary, block) => {
            summary.minutes += Number(block.duration || 0); summary.questions += Number(block.result?.questions || 0); summary.hits += Number(block.result?.hits || 0); summary.errors += Number(block.result?.errors || 0); return summary;
        }, { minutes: 0, questions: 0, hits: 0, errors: 0 });
        return { ...result, blocks: completed.length, subjects: [...new Set(completed.map(block => subject(block.subjectId)?.subject).filter(Boolean))] };
    }
    function maybeOpenDayClose(day, key = visibleWeek) {
        const blocks = getDayBlocks(day, key);
        if (!blocks.length || blocks.some(block => ['pending', 'running'].includes(block.status)) || week(false, key)?.dailyClosures?.[day]) return;
        openDayClose(day, key);
    }
    function openDayClose(day, key = visibleWeek) {
        const blocks = getDayBlocks(day, key); if (!blocks.length) return;
        const summary = dailySummary(day, key), saved = week(false, key)?.dailyClosures?.[day];
        byId('scheduleDayCloseWeek').value = key; byId('scheduleDayCloseDay').value = day;
        byId('scheduleDayCloseNotes').value = saved?.notes || '';
        byId('scheduleDayCloseSummary').innerHTML = `<article><span>Matérias</span><strong>${escape(summary.subjects.join(', ') || 'Nenhuma concluída')}</strong></article><article><span>Blocos concluídos</span><strong>${summary.blocks}</strong></article><article><span>Tempo total</span><strong>${minutesText(summary.minutes)}</strong></article><article><span>Questões</span><strong>${summary.questions}</strong></article><article><span>Acertos</span><strong>${summary.hits}</strong></article><article><span>Erros</span><strong>${summary.errors}</strong></article>`;
        byId('scheduleDayCloseModal').classList.add('active');
    }
    function closeDayLater() { fecharModal('scheduleDayCloseModal'); toast('O resumo continua disponível no final desse dia.'); }
    function saveDayClose(event) {
        event.preventDefault(); const key = byId('scheduleDayCloseWeek').value, day = Number(byId('scheduleDayCloseDay').value), target = week(true, key);
        target.dailyClosures[day] = { ...dailySummary(day, key), notes: byId('scheduleDayCloseNotes').value.trim(), savedAt: Date.now() };
        saveAppData(); fecharModal('scheduleDayCloseModal'); render(); toast('✓ Resumo do dia salvo.');
    }

    function dragStart(event, id) { draggedBlockId = String(id); event.dataTransfer.effectAllowed = 'move'; event.dataTransfer.setData('text/plain', draggedBlockId); event.currentTarget.classList.add('dragging'); }
    function dragEnd(event) { event.currentTarget.classList.remove('dragging'); draggedBlockId = null; document.querySelectorAll('.schedule-day.drag-over').forEach(item => item.classList.remove('drag-over')); }
    function dragOver(event) { event.preventDefault(); event.currentTarget.classList.add('drag-over'); event.dataTransfer.dropEffect = 'move'; }
    function drop(event, day) {
        event.preventDefault(); event.currentTarget.classList.remove('drag-over');
        const id = draggedBlockId || event.dataTransfer.getData('text/plain'), block = findBlock(id); if (!block) return;
        const oldDay = block.day; block.day = Number(day); block.order = getDayBlocks(day).length;
        recomputeDay(oldDay); recomputeDay(day); saveAppData(); mobileDay = Number(day); render(); toast(`Bloco movido para ${DAY_NAMES[day]}.`);
    }

    function applySuggestion(id) { const item = subject(id); if (!item) return; item.schedule.priority = 3; appData.studySchedule.suggestions.push({ subjectId: item.id, status: 'applied', at: Date.now() }); saveAppData(); render(); toast(`${item.subject} agora tem prioridade alta.`); }
    function ignoreSuggestion(id) { appData.studySchedule.suggestions.push({ subjectId: id, status: 'ignored', at: Date.now() }); saveAppData(); render(); }
    function removeSubject(id) { ensureData(); Object.values(appData.studySchedule.weeks).forEach(item => item.blocks = (item.blocks || []).filter(block => String(block.subjectId) !== String(id))); }
    function clearSubjects() { ensureData(); Object.values(appData.studySchedule.weeks).forEach(item => item.blocks = []); }

    window.KingSchedule = { render, organizeCurrentWeek, changeWeek, goCurrentWeek, selectMobileDay, copyToNextWeek, openSettings, saveSettings, openBlock, saveBlock, deleteEditingBlock, setStatus, startBlock, openComplete, completeFromSession, openDayClose, closeDayLater, saveDayClose, dragStart, dragEnd, dragOver, drop, applySuggestion, ignoreSuggestion, removeSubject, clearSubjects, getVisibleWeek: () => visibleWeek };
    ensureData();
    if (document.getElementById('cronograma')?.classList.contains('active')) render();
    window.addEventListener('resize', () => { if (document.getElementById('cronograma')?.classList.contains('active')) render(); }, { passive: true });
})();
