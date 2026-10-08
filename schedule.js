/* Cronograma v2: uma visão semanal ampla e uma agenda diária realmente utilizável. */
(() => {
    const Core = window.KingScheduleCore;
    if (!Core) return;
    const Planner = window.KingSchedulePlanner;

    const DAYS = [1, 2, 3, 4, 5, 6, 7];
    const DAY_NAMES = { 1: 'Segunda-feira', 2: 'Terça-feira', 3: 'Quarta-feira', 4: 'Quinta-feira', 5: 'Sexta-feira', 6: 'Sábado', 7: 'Domingo' };
    const DAY_SHORT = { 1: 'SEG', 2: 'TER', 3: 'QUA', 4: 'QUI', 5: 'SEX', 6: 'SÁB', 7: 'DOM' };
    const KINDS = {
        teoria: { label: 'Teoria', icon: '◇' }, questoes: { label: 'Questões', icon: '◎' },
        revisao: { label: 'Revisão', icon: '↻' }, simulado: { label: 'Simulado', icon: '▦' }, redacao: { label: 'Redação', icon: '✎' }
    };
    const STATUS = {
        pending: { label: 'Planejado', icon: '○' }, running: { label: 'Em andamento', icon: '▶' },
        completed: { label: 'Concluído', icon: '✓' }, missed: { label: 'Não realizado', icon: '×' }
    };
    let visibleWeek = Core.monday(new Date());
    let selectedDay = new Date().getDay() || 7;
    let draggedBlockId = null;
    let touchDrag = null;
    let plannerDraft = null;
    let plannerIntent = {};

    const byId = id => document.getElementById(id);
    const escape = value => typeof escaparRevisaoHtml === 'function'
        ? escaparRevisaoHtml(String(value ?? ''))
        : String(value ?? '').replace(/[&<>'"]/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[char]);
    const safeColor = value => /^#[0-9a-f]{6}$/i.test(String(value || '')) ? value : '#007aff';
    const safeId = value => String(value ?? '').replace(/[^a-zA-Z0-9_-]/g, '');
    const toast = (message, error = false) => typeof showToast === 'function' && showToast(message, error);
    const currentWeekKey = () => Core.monday(new Date());
    const settings = () => Core.normalizeSettings(appData.studySchedule?.settings);
    const dateForDay = (weekKey, day) => Core.addDays(weekKey, Number(day) - 1);
    const dayDate = (weekKey, day) => Core.fromIso(dateForDay(weekKey, day));
    const isToday = (weekKey, day) => dateForDay(weekKey, day) === Core.iso(new Date());
    const minutesText = minutes => {
        const value = Math.max(0, Math.round(Number(minutes) || 0));
        const hours = Math.floor(value / 60), rest = value % 60;
        return hours ? `${hours}h${rest ? ` ${rest}min` : ''}` : `${rest}min`;
    };

    function ensureData() {
        if (!appData.studySchedule || typeof appData.studySchedule !== 'object') appData.studySchedule = {};
        appData.studySchedule.settings = Core.normalizeSettings(appData.studySchedule.settings);
        if (!appData.studySchedule.weeks || typeof appData.studySchedule.weeks !== 'object' || Array.isArray(appData.studySchedule.weeks)) appData.studySchedule.weeks = {};
        if (!Array.isArray(appData.studySchedule.suggestions)) appData.studySchedule.suggestions = [];
        appData.cycleItems.forEach(item => {
            item.schedule = {
                icon: item.schedule?.icon || '●',
                priority: Math.min(3, Math.max(1, Number(item.schedule?.priority) || 2)),
                weeklyBlocks: Math.min(30, Math.max(0, Number(item.schedule?.weeklyBlocks) || 0)),
                consecutive: Boolean(item.schedule?.consecutive),
                difficulty: Math.min(3, Math.max(1, Number(item.schedule?.difficulty) || 2)),
                contentLoad: Math.min(3, Math.max(1, Number(item.schedule?.contentLoad) || 2)),
                weeklyMinutes: item.schedule?.weeklyMinutes == null ? null : Math.min(1800, Math.max(0, Math.round(Number(item.schedule.weeklyMinutes) || 0))),
                preferredDay: Math.min(7, Math.max(0, Number(item.schedule?.preferredDay) || 0))
            };
        });
        Object.values(appData.studySchedule.weeks).forEach(value => {
            if (!value || typeof value !== 'object') return;
            if (!Array.isArray(value.blocks)) value.blocks = [];
            if (!value.dailyClosures || typeof value.dailyClosures !== 'object') value.dailyClosures = {};
            if (!Array.isArray(value.warnings)) value.warnings = [];
            if (!Array.isArray(value.unscheduled)) value.unscheduled = [];
            value.blocks.forEach(block => {
                block.kind = KINDS[block.kind] ? block.kind : 'teoria';
                block.topic = String(block.topic || block.result?.topic || '').slice(0, 120);
                block.status = STATUS[block.status] ? block.status : 'pending';
                block.duration = Math.min(240, Math.max(5, Number(block.duration) || settings().blockMinutes));
            });
        });
        if (!DAYS.includes(selectedDay)) selectedDay = settings().studyDays[0] || 1;
    }

    function week(create = true, key = visibleWeek) {
        ensureData();
        if (!appData.studySchedule.weeks[key] && create) appData.studySchedule.weeks[key] = { key, blocks: [], dailyClosures: {}, warnings: [] };
        return appData.studySchedule.weeks[key] || null;
    }
    const subject = id => appData.cycleItems.find(item => String(item.id) === String(id));
    const findBlock = (id, key = visibleWeek) => week(false, key)?.blocks.find(block => String(block.id) === String(id));
    function detachLinksForRemovedBlocks(removedWeeks) {
        const removed = Object.entries(removedWeeks || {}).filter(([, entry]) => entry?.blocks?.length);
        if (!removed.length) return 0;
        const isRemoved = link => {
            if (!link?.blockId && !link?.scheduleBlockId) return false;
            const weekKey = String(link.weekKey || link.scheduleWeekKey || '');
            return removed.some(([key, entry]) => (!weekKey || key === weekKey)
                && entry.blocks.some(block => String(block.id) === String(link.blockId || link.scheduleBlockId)));
        };
        const pending = [...(appData.pendingStudySessions || []), appData.pendingStudySession]
            .filter(session => isRemoved(session));
        const count = Core.detachPendingSessions(removedWeeks, pending);
        if (isRemoved(appData.activeScheduleBlock)) appData.activeScheduleBlock = null;
        return count;
    }
    const getDayBlocks = (day, key = visibleWeek) => [...(week(false, key)?.blocks || [])]
        .filter(block => Number(block.day) === Number(day))
        .sort((a, b) => (a.order ?? 999) - (b.order ?? 999) || Core.toMinutes(a.start) - Core.toMinutes(b.start));

    function formatRange(key) {
        const start = Core.fromIso(key), end = Core.fromIso(Core.addDays(key, 6));
        const month = date => date.toLocaleDateString('pt-BR', { month: 'long' });
        return start.getMonth() === end.getMonth()
            ? `${start.getDate()} – ${end.getDate()} de ${month(end)}`
            : `${start.getDate()} de ${month(start)} – ${end.getDate()} de ${month(end)}`;
    }
    function formatDayTitle(day) {
        const date = dayDate(visibleWeek, day);
        return `${DAY_NAMES[day]}, ${date.getDate()} de ${date.toLocaleDateString('pt-BR', { month: 'long' })}`;
    }
    function recomputeDay(day, key = visibleWeek) {
        const target = week(false, key);
        if (!target || !DAYS.includes(Number(day))) return;
        Core.arrangeTimes(target.blocks, settings(), day).forEach((block, index) => block.order = index);
    }
    function nextStart(day, key = visibleWeek) {
        const list = getDayBlocks(day, key);
        if (!list.length) return settings().availability[day]?.[0]?.start || settings().startTime;
        const last = list.at(-1);
        return Core.addMinutes(last.start, Number(last.duration) + settings().pauseMinutes);
    }
    function allMetrics() {
        const blocks = week(false)?.blocks || [];
        const completed = blocks.filter(block => block.status === 'completed');
        const plannedMinutes = blocks.reduce((sum, block) => sum + Number(block.duration || 0), 0);
        const completedMinutes = completed.reduce((sum, block) => sum + Number(block.result?.actualMinutes || block.duration || 0), 0);
        return { blocks, completed, plannedMinutes, completedMinutes, percent: blocks.length ? Math.round(completed.length / blocks.length * 100) : 0 };
    }
    function agendaBusyByDay() {
        const busyByDay = {};
        DAYS.forEach(day => {
            const date = dateForDay(visibleWeek, day);
            busyByDay[day] = (appData.agendamentoItems || []).filter(item => item.date === date && /^([01]\d|2[0-3]):[0-5]\d$/.test(item.time || ''))
                .map(item => ({ start: item.time, end: Core.toClock(Math.min(1439, Core.toMinutes(item.time) + Math.max(1, Number(item.duration) || 60))) }));
        });
        return busyByDay;
    }

    function renderSummary() {
        const data = allMetrics();
        const capacity = Planner?.ScheduleConstraints.slots(settings(), agendaBusyByDay());
        const targetMinutes = capacity?.dayPlans
            ? Object.values(capacity.dayPlans).reduce((sum, day) => sum + (Number(day.availableStudyMinutes) || 0), 0)
            : Core.availableMinutes(settings(), agendaBusyByDay());
        const loadPercent = targetMinutes ? Math.round(data.plannedMinutes / targetMinutes * 100) : data.plannedMinutes ? 999 : 0;
        byId('scheduleProgressText').textContent = `${data.percent}%`;
        byId('scheduleProgressRing').style.setProperty('--schedule-progress', `${data.percent * 3.6}deg`);
        byId('scheduleBlockCount').textContent = `${data.completed.length}/${data.blocks.length}`;
        byId('schedulePlannedHours').textContent = minutesText(data.plannedMinutes);
        byId('scheduleTargetHours').textContent = minutesText(targetMinutes);
        byId('scheduleCompletedHours').textContent = minutesText(data.completedMinutes);
        const headline = data.percent === 100 ? 'Semana concluída' : data.percent >= 70 ? 'Você está na reta final' : data.percent >= 30 ? 'Ritmo em construção' : data.blocks.length ? 'Um bloco de cada vez' : 'Sua semana começa aqui';
        const hint = data.percent === 100 ? 'Feche a semana, reconheça o que funcionou e leve só o necessário adiante.'
            : data.blocks.length ? `${data.blocks.length - data.completed.length} ${data.blocks.length - data.completed.length === 1 ? 'bloco ainda pode' : 'blocos ainda podem'} avançar nesta semana.`
                : 'Monte os blocos e deixe o King Master cuidar da visão geral.';
        byId('scheduleProgressHeadline').textContent = headline;
        byId('scheduleProgressHint').textContent = hint;
        byId('scheduleLoadFill').style.width = `${Math.min(100, loadPercent)}%`;
        byId('scheduleLoadPlanned').textContent = `${minutesText(data.plannedMinutes)} planejadas`;
        byId('scheduleLoadTarget').textContent = `${minutesText(targetMinutes)} disponíveis`;
        const gap = targetMinutes - data.plannedMinutes;
        byId('scheduleLoadHeadline').textContent = !data.blocks.length ? `Até ${minutesText(targetMinutes)} líquidos cabem nesta semana`
            : gap > settings().blockMinutes ? `${minutesText(gap)} permanecem livres no seu horário`
                : gap < -settings().blockMinutes ? `Sua semana excede a disponibilidade em ${minutesText(Math.abs(gap))}`
                    : 'Carga planejada compatível com seu tempo';
        byId('scheduleLoadHint').textContent = !data.blocks.length ? `${settings().studyDays.length} dias configurados com horários livres próprios. Pausas e compromissos reduzem o espaço real para blocos.`
            : loadPercent > 110 ? 'Revise os blocos que passaram das janelas livres.'
                : loadPercent < 70 ? 'Tempo livre não é obrigação. A meta diária continua flexível.'
                    : 'A carga planejada está dentro da disponibilidade informada.';
        byId('scheduleLoadGuide').classList.toggle('overloaded', loadPercent > 110);
    }

    function orderedPendingBlocks() {
        const blocks = week(false)?.blocks || [];
        const today = new Date().getDay();
        return blocks.filter(block => ['pending', 'running'].includes(block.status)).sort((a, b) => {
            if (a.status === 'running' && b.status !== 'running') return -1;
            if (b.status === 'running' && a.status !== 'running') return 1;
            const aPast = visibleWeek === currentWeekKey() && Number(a.day) < today;
            const bPast = visibleWeek === currentWeekKey() && Number(b.day) < today;
            if (aPast !== bPast) return aPast ? 1 : -1;
            return Number(a.day) - Number(b.day) || Core.toMinutes(a.start) - Core.toMinutes(b.start);
        });
    }

    function renderNext() {
        const container = byId('scheduleNextBlock');
        const block = orderedPendingBlocks()[0];
        if (!block) {
            container.innerHTML = `<div class="schedule-next-empty"><span>✓</span><strong>${allMetrics().blocks.length ? 'Nada pendente nesta semana' : 'Nenhum bloco planejado'}</strong><p>${allMetrics().blocks.length ? 'Use este espaço para revisar ou descansar sem culpa.' : 'Adicione um bloco ou organize sua carga semanal.'}</p><button type="button" class="cycle-btn" onclick="KingSchedule.openBlock()">Planejar bloco</button></div>`;
            return;
        }
        const mat = subject(block.subjectId), kind = KINDS[block.kind] || KINDS.teoria;
        const day = isToday(visibleWeek, block.day) ? 'Hoje' : DAY_NAMES[block.day];
        container.innerHTML = `<div class="schedule-next-subject" style="--block-color:${safeColor(mat?.color)}"><span>${escape(mat?.schedule?.icon || kind.icon)}</span><div><small>${escape(day)} · ${escape(block.start)} · ${block.duration} min</small><strong>${escape(mat?.subject || 'Matéria removida')}</strong><p>${escape(block.topic || kind.label)}</p></div></div><div class="schedule-next-actions"><button type="button" class="cycle-btn primary" onclick="KingSchedule.startBlock('${safeId(block.id)}')">${block.status === 'running' ? 'Retomar foco' : 'Estudar agora'}</button><button type="button" class="cycle-btn" onclick="KingSchedule.selectDay(${block.day})">Ver o dia</button></div>`;
    }

    function renderBalance() {
        const container = byId('scheduleBalanceList');
        const blocks = week(false)?.blocks || [];
        const grouped = new Map();
        blocks.forEach(block => {
            const key = String(block.subjectId);
            if (!grouped.has(key)) grouped.set(key, { total: 0, done: 0 });
            const item = grouped.get(key); item.total += 1; if (block.status === 'completed') item.done += 1;
        });
        const entries = [...grouped.entries()].map(([id, data]) => ({ mat: subject(id), ...data })).filter(item => item.mat).sort((a, b) => b.total - a.total || a.mat.subject.localeCompare(b.mat.subject, 'pt-BR'));
        byId('scheduleSubjectsCount').textContent = String(entries.length);
        if (!entries.length) {
            container.innerHTML = '<div class="schedule-balance-empty">A carga aparece quando a semana ganha blocos.</div>';
            return;
        }
        container.innerHTML = entries.slice(0, 6).map(item => {
            const percent = Math.round(item.done / item.total * 100);
            const minutes = blocks.filter(block => String(block.subjectId) === String(item.mat.id)).reduce((sum, block) => sum + Number(block.duration || 0), 0);
            return `<div class="schedule-balance-row" style="--subject-color:${safeColor(item.mat.color)}"><span>${escape(item.mat.schedule?.icon || '●')}</span><div><p><strong>${escape(item.mat.subject)}</strong><small>${minutesText(minutes)} · ${item.done}/${item.total}</small></p><i><b style="width:${percent}%"></b></i></div></div>`;
        }).join('');
    }

    function dayProgress(day) {
        const blocks = getDayBlocks(day);
        const done = blocks.filter(block => block.status === 'completed').length;
        return { blocks, done, percent: blocks.length ? Math.round(done / blocks.length * 100) : 0 };
    }
    function renderDayStrip() {
        const activeDays = new Set(settings().studyDays);
        byId('scheduleDayStrip').innerHTML = DAYS.map(day => {
            const date = dayDate(visibleWeek, day), data = dayProgress(day), active = selectedDay === day;
            const plan = week(false)?.dayPlans?.[day];
            const adapted = plan?.status === 'adapted';
            const classes = [active ? 'active' : '', isToday(visibleWeek, day) ? 'today' : '', activeDays.has(day) ? '' : 'rest-day', adapted ? 'schedule-day-adapted' : ''].filter(Boolean).join(' ');
            const load = plan ? `<small class="schedule-day-load">${data.blocks.length}/${plan.targetBlocks} · ${minutesText(data.blocks.reduce((sum, block) => sum + Number(block.duration || 0), 0))}</small>` : '';
            return `<button type="button" role="tab" aria-selected="${active}" class="${classes}" data-drop-day="${day}" style="--day-progress:${data.percent * 3.6}deg" onclick="KingSchedule.selectDay(${day})" ondragover="KingSchedule.dragOverDay(event)" ondragleave="KingSchedule.dragLeaveDay(event)" ondrop="KingSchedule.dropToDay(event,${day})"><span><b>${DAY_SHORT[day]}</b><small>${date.getDate()}</small></span><i><em>${data.done}/${data.blocks.length}</em></i>${load}</button>`;
        }).join('');
    }

    function renderWeekMatrix() {
        const container = byId('scheduleWeekMatrix');
        if (!container) return;
        const blocks = week(false)?.blocks || [];
        if (!appData.cycleItems.length) {
            container.innerHTML = '<div class="schedule-matrix-empty"><span>＋</span><strong>O quadro nasce das suas matérias</strong><p>Cadastre uma matéria para começar, sem conteúdo pronto ou grade imposta.</p><button type="button" class="cycle-btn primary" onclick="showSection(\'planejamento\');abrirModalCiclo()">Adicionar matéria</button></div>';
            return;
        }
        if (!blocks.length) {
            container.innerHTML = '<div class="schedule-matrix-empty"><span>▤</span><strong>Construa sua própria grade</strong><p>Adicione blocos manualmente ou use a organização automática com a carga que você definiu.</p><div><button type="button" class="cycle-btn primary" onclick="KingSchedule.openBlock()">Criar primeiro bloco</button><button type="button" class="cycle-btn" onclick="KingSchedule.openSettings()">Configurar carga</button></div></div>';
            return;
        }
        const horarios = [...new Set(blocks.map(block => block.start).filter(Boolean))].sort((a, b) => Core.toMinutes(a) - Core.toMinutes(b));
        const cabecalho = `<div class="schedule-matrix-corner"><span>HORÁRIO</span></div>${DAYS.map(day => `<button type="button" class="schedule-matrix-day ${selectedDay === day ? 'active' : ''}" onclick="KingSchedule.selectDay(${day})"><strong>${DAY_SHORT[day]}</strong><small>${dayDate(visibleWeek, day).getDate()}</small></button>`).join('')}`;
        const linhas = horarios.map(horario => {
            const rotuloFim = blocks.filter(block => block.start === horario).reduce((maior, block) => Math.max(maior, Core.toMinutes(block.start) + Number(block.duration || 0)), 0);
            const fim = rotuloFim ? `${String(Math.floor(rotuloFim / 60)).padStart(2, '0')}:${String(rotuloFim % 60).padStart(2, '0')}` : '';
            const celulas = DAYS.map(day => {
                const block = blocks.find(item => Number(item.day) === day && item.start === horario);
                if (!block) return `<button type="button" class="schedule-matrix-cell empty" data-drop-day="${day}" data-drop-start="${escape(horario)}" onclick="KingSchedule.openBlock(null,${day},'${escape(horario)}')" ondragover="KingSchedule.dragOverBlock(event)" ondragleave="KingSchedule.dragLeaveBlock(event)" ondrop="KingSchedule.dropOnSlot(event,${day},'${escape(horario)}')" aria-label="Adicionar bloco em ${DAY_NAMES[day]} às ${escape(horario)}"><span>＋</span></button>`;
                const mat = subject(block.subjectId), kind = KINDS[block.kind] || KINDS.teoria, state = STATUS[block.status] || STATUS.pending;
                return `<div class="schedule-matrix-cell status-${block.status}" data-drop-block-id="${safeId(block.id)}" style="--block-color:${safeColor(mat?.color)}" draggable="true" ondragstart="KingSchedule.dragStart(event,'${safeId(block.id)}')" ondragend="KingSchedule.dragEnd(event)" ondragover="KingSchedule.dragOverBlock(event)" ondragleave="KingSchedule.dragLeaveBlock(event)" ondrop="KingSchedule.dropOnBlock(event,'${safeId(block.id)}')"><button type="button" class="schedule-matrix-main" onclick="KingSchedule.openBlock('${safeId(block.id)}')" aria-label="Editar bloco de ${escape(mat?.subject || 'matéria removida')}"><span class="schedule-matrix-icon">${escape(mat?.schedule?.icon || kind.icon)}</span><span><strong>${escape(mat?.subject || 'Matéria removida')}</strong><small>${escape(block.topic || kind.label)}</small></span><i title="${escape(state.label)}">${state.icon}</i></button><button type="button" class="schedule-matrix-duplicate" onclick="KingSchedule.duplicateBlock('${safeId(block.id)}')" aria-label="Duplicar bloco de ${escape(mat?.subject || 'matéria removida')}" title="Duplicar bloco">⧉</button></div>`;
            }).join('');
            return `<div class="schedule-matrix-time"><strong>${escape(horario)}</strong><small>${escape(fim)}</small></div>${celulas}`;
        }).join('');
        container.innerHTML = `<div class="schedule-matrix-grid">${cabecalho}${linhas}</div>`;
    }

    function blockHtml(block) {
        const mat = subject(block.subjectId), color = safeColor(mat?.color), kind = KINDS[block.kind] || KINDS.teoria, state = STATUS[block.status] || STATUS.pending;
        const end = Core.addMinutes(block.start, block.duration), id = safeId(block.id);
        const action = block.status === 'completed'
            ? `<span class="schedule-block-registered">✓ Registrado</span>`
            : block.status === 'missed'
                ? `<button type="button" class="cycle-btn" onclick="KingSchedule.setStatus('${id}','pending')">Replanejar</button>`
                : `<button type="button" class="cycle-btn primary" onclick="KingSchedule.startBlock('${id}')">${block.status === 'running' ? 'Retomar' : 'Estudar'}</button><button type="button" class="cycle-btn" onclick="KingSchedule.openComplete('${id}')">Concluir</button>`;
        return `<div class="schedule-timeline-row"><div class="schedule-time-rail"><strong>${escape(block.start)}</strong><span></span><small>${escape(end)}</small></div><article class="schedule-focus-block status-${block.status}" draggable="true" data-block-id="${id}" data-drop-block-id="${id}" style="--block-color:${color}" onpointerdown="KingSchedule.pointerDown(event,'${id}')" ondragstart="KingSchedule.dragStart(event,'${id}')" ondragend="KingSchedule.dragEnd(event)" ondragover="KingSchedule.dragOverBlock(event)" ondragleave="KingSchedule.dragLeaveBlock(event)" ondrop="KingSchedule.dropOnBlock(event,'${id}')"><header><span class="schedule-focus-icon">${escape(mat?.schedule?.icon || kind.icon)}</span><div><span>${escape(kind.label)}</span><strong>${escape(mat?.subject || 'Matéria removida')}</strong></div><em class="schedule-status-chip">${state.icon} ${state.label}</em></header><h3>${escape(block.topic || `Bloco de ${kind.label.toLocaleLowerCase('pt-BR')}`)}</h3>${block.result?.notes ? `<p class="schedule-result-note">${escape(block.result.notes)}</p>` : ''}<footer><span>${block.duration} min${block.result?.questions ? ` · ${block.result.questions} questões` : ''}</span><div>${action}<button type="button" class="schedule-more-button" onclick="KingSchedule.duplicateBlock('${id}')" aria-label="Duplicar bloco" title="Duplicar bloco">⧉</button><button type="button" class="schedule-more-button" onclick="KingSchedule.openBlock('${id}')" aria-label="Editar bloco">•••</button></div></footer></article></div>`;
    }
    function pauseHtml(minutes) {
        const plannedInterval = settings().pauseMinutes + settings().registrationMinutes;
        const longGap = minutes > plannedInterval + 10;
        return `<div class="schedule-timeline-pause"><span></span><div><b>☕</b><strong>${longGap ? 'Janela livre' : 'Pausa e registro'}</strong><small>${minutes} minutos até o próximo bloco</small></div></div>`;
    }
    function renderTimeline() {
        const blocks = getDayBlocks(selectedDay), container = byId('scheduleTimeline');
        byId('scheduleSelectedDayEyebrow').textContent = isToday(visibleWeek, selectedDay) ? 'HOJE' : visibleWeek === currentWeekKey() ? 'NESTA SEMANA' : 'DIA PLANEJADO';
        byId('scheduleSelectedDayTitle').textContent = formatDayTitle(selectedDay);
        const completed = blocks.filter(block => block.status === 'completed').length;
        const dayPlan = week(false)?.dayPlans?.[selectedDay];
        const netMinutes = blocks.reduce((sum, block) => sum + Number(block.duration || 0), 0);
        byId('scheduleSelectedDaySummary').textContent = blocks.length
            ? `${blocks.length}${dayPlan ? `/${dayPlan.targetBlocks} da meta` : ''} ${blocks.length === 1 ? 'bloco planejado' : 'blocos planejados'} · ${minutesText(netMinutes)} líquidos · ${completed} concluído${completed === 1 ? '' : 's'}${dayPlan?.status === 'adapted' ? ' · carga adaptada ao horário' : ''}`
            : 'Dia livre para respirar ou reorganizar.';
        if (!appData.cycleItems.length) {
            container.innerHTML = `<div class="schedule-timeline-empty"><span>＋</span><h3>Cadastre sua primeira matéria</h3><p>O cronograma usa somente o que você criar no Hub de Matérias.</p><button type="button" class="cycle-btn primary" onclick="showSection('planejamento');abrirModalCiclo()">Adicionar matéria</button></div>`;
            return;
        }
        if (!blocks.length) {
            container.innerHTML = `<div class="schedule-timeline-empty"><span>○</span><h3>Este dia está livre</h3><p>Você pode mantê-lo assim ou criar um bloco leve e realista.</p><div><button type="button" class="cycle-btn primary" onclick="KingSchedule.openBlock(null,${selectedDay})">Adicionar bloco</button><button type="button" class="cycle-btn" onclick="KingSchedule.openSettings()">Planejar carga</button></div></div>`;
            return;
        }
        const parts = [];
        blocks.forEach((block, index) => {
            if (index) {
                const previous = blocks[index - 1];
                const gap = Core.toMinutes(block.start) - (Core.toMinutes(previous.start) + Number(previous.duration));
                if (gap > 0) parts.push(pauseHtml(gap));
            }
            parts.push(blockHtml(block));
        });
        container.innerHTML = parts.join('');
    }

    function dailySummary(day, key = visibleWeek) {
        const blocks = getDayBlocks(day, key), completed = blocks.filter(block => block.status === 'completed');
        const result = completed.reduce((summary, block) => {
            summary.minutes += Number(block.result?.actualMinutes || block.duration || 0);
            summary.questions += Number(block.result?.questions || 0);
            summary.hits += Number(block.result?.hits || 0);
            summary.errors += Number(block.result?.errors || 0);
            return summary;
        }, { minutes: 0, questions: 0, hits: 0, errors: 0 });
        return { ...result, planned: blocks.length, blocks: completed.length, subjects: [...new Set(completed.map(block => subject(block.subjectId)?.subject).filter(Boolean))] };
    }
    function renderDayPanel() {
        const summary = dailySummary(selectedDay), closure = week(false)?.dailyClosures?.[selectedDay];
        byId('scheduleDayMetrics').innerHTML = `<div><span>Progresso</span><strong>${summary.blocks}/${summary.planned}</strong></div><div><span>Tempo feito</span><strong>${minutesText(summary.minutes)}</strong></div><div><span>Questões</span><strong>${summary.questions}</strong></div><div><span>Precisão</span><strong>${summary.questions ? `${Math.round(summary.hits / Math.max(1, summary.hits + summary.errors) * 100)}%` : '—'}</strong></div>`;
        const button = byId('scheduleDayCloseButton');
        button.disabled = summary.blocks === 0;
        button.textContent = closure ? '✓ Resumo do dia salvo' : summary.blocks === summary.planned && summary.planned ? 'Fechar dia agora' : 'Registrar resumo do dia';
        button.classList.toggle('is-saved', Boolean(closure));
    }

    function renderNotice() {
        const notice = byId('scheduleNotice');
        const overloaded = settings().studyDays.filter(day => new Set(getDayBlocks(day).map(block => String(block.subjectId))).size > settings().maxSubjectsPerDay);
        const unscheduled = week(false)?.unscheduled || [];
        const adaptedDays = Object.values(week(false)?.dayPlans || {}).filter(day => day.status === 'adapted');
        const archivedCount = week(false)?.archivedCompletedBlocks?.length || 0;
        if (!overloaded.length && !unscheduled.length && !adaptedDays.length && !archivedCount) { notice.hidden = true; return; }
        notice.hidden = false;
        notice.classList.toggle('schedule-notice-adapted', !overloaded.length && settings().mode !== 'rigid');
        const missing = unscheduled.reduce((sum, item) => sum + Number(item.blocks || 0), 0);
        const adapted = adaptedDays.length ? `<strong>Plano ajustado por dia.</strong> ${adaptedDays.map(day => `${DAY_NAMES[day.day]} ${day.scheduledBlocks}/${day.targetBlocks}`).join(' · ')}. Nenhum bloco extra foi criado para compensar.` : '';
        const remaining = missing ? `<strong>${missing} ${missing === 1 ? 'bloco desejado ficou' : 'blocos desejados ficaram'} fora desta semana.</strong> ${unscheduled.map(item => `${escape(item.subject)} (${item.blocks})`).join(', ')}. A disponibilidade real foi respeitada.` : '';
        const limit = overloaded.length ? `<strong>Há matérias demais em um dia.</strong> Revise ${overloaded.map(day => DAY_NAMES[day]).join(', ')}.` : '';
        const archived = archivedCount ? `<strong>${archivedCount} ${archivedCount === 1 ? 'bloco concluído anterior foi preservado' : 'blocos concluídos anteriores foram preservados'}.</strong> Ele não ocupa uma nova janela do cronograma.` : '';
        notice.innerHTML = `<span aria-hidden="true">${overloaded.length ? '!' : 'i'}</span><p>${[adapted, remaining, limit, archived].filter(Boolean).join(' ')}</p>`;
    }
    function renderReplanButton() {
        const today = new Date().getDay();
        const overdue = visibleWeek === currentWeekKey() && DAYS.includes(today) && (week(false)?.blocks || []).some(block => Number(block.day) < today && ['pending', 'missed'].includes(block.status));
        byId('scheduleReplanButton').hidden = !overdue;
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
        box.innerHTML = `<span class="schedule-suggestion-mark">✦</span><div><small>SUGESTÃO, NÃO ALTERAÇÃO</small><strong>${escape(weak.item.subject)} pode receber mais atenção</strong><p>Sua precisão acumulada está em ${Math.round(weak.rate)}%. Quer marcar a matéria como prioridade alta para a próxima organização?</p></div><div><button type="button" class="cycle-btn primary" onclick="KingSchedule.applySuggestion('${safeId(weak.item.id)}')">Aplicar</button><button type="button" class="cycle-btn" onclick="KingSchedule.ignoreSuggestion('${safeId(weak.item.id)}')">Ignorar</button></div>`;
    }

    function render() {
        ensureData();
        if (!byId('scheduleTimeline')) return;
        reconcileStudiedBlocks();
        byId('scheduleWeekRange').textContent = formatRange(visibleWeek);
        byId('scheduleWeekEyebrow').textContent = visibleWeek === currentWeekKey() ? 'SEMANA ATUAL' : visibleWeek < currentWeekKey() ? 'SEMANA ANTERIOR' : 'PRÓXIMA SEMANA';
        renderSummary(); renderNext(); renderBalance(); renderWeekMatrix(); renderDayStrip(); renderTimeline(); renderDayPanel(); renderNotice(); renderReplanButton(); performanceSuggestion();
        renderViewMode();
        if (typeof atualizarResumoRevisoesCronograma === 'function') atualizarResumoRevisoesCronograma();
    }

    function renderViewMode() {
        const flexible = appData.studySchedule.viewMode === 'load';
        byId('cronograma').classList.toggle('is-load-mode', flexible);
        byId('scheduleFixedViewButton')?.setAttribute('aria-pressed', String(!flexible));
        byId('scheduleLoadViewButton')?.setAttribute('aria-pressed', String(flexible));
        byId('scheduleFixedBoard').hidden = flexible;
        byId('scheduleDayStrip').hidden = flexible;
        byId('scheduleFixedDayLayout').hidden = flexible;
        byId('scheduleLoadBoard').hidden = !flexible;
        byId('scheduleQuickPause').value = String(settings().pauseMinutes);
        if (flexible) renderLoadSubjects();
    }

    function renderLoadSubjects() {
        const root = byId('scheduleLoadSubjects');
        if (!root) return;
        const lastDate = Core.addDays(visibleWeek, 6);
        let targetTotal = 0, doneTotal = 0;
        const entries = (appData.historyItems || []).filter(item => {
            const date = typeof dataHistoricoISO === 'function' ? dataHistoricoISO(item) : item.dataISO;
            return date >= visibleWeek && date <= lastDate;
        });
        root.innerHTML = appData.cycleItems.length ? appData.cycleItems.map(item => {
            const target = item.schedule.weeklyMinutes == null ? item.schedule.weeklyBlocks * settings().blockMinutes : item.schedule.weeklyMinutes;
            const seconds = entries.reduce((sum, entry) => {
                const same = entry.subjectId ? String(entry.subjectId) === String(item.id)
                    : String(entry.materia || '').trim().toLocaleLowerCase('pt-BR') === String(item.subject).trim().toLocaleLowerCase('pt-BR');
                return same ? sum + Math.max(0, Number(entry.tempoSegundos) || 0) : sum;
            }, 0);
            const done = Math.floor(seconds / 60);
            targetTotal += target;
            doneTotal += done;
            const percent = target ? Math.min(100, Math.round(done / target * 100)) : 0;
            return `<article class="schedule-load-subject" style="--subject-color:${safeColor(item.color)}"><div class="schedule-load-subject__head"><span class="schedule-load-subject__icon">${escape(item.schedule.icon)}</span><div><strong>${escape(item.subject)}</strong><small>${minutesText(done)} estudados nesta semana${target ? ` · ${percent}% da meta` : ' · defina uma meta'}</small></div><button type="button" class="cycle-btn" onclick="KingSchedule.startLoadSubject('${safeId(item.id)}')">Estudar</button></div><div class="schedule-load-subject__bar" role="progressbar" aria-label="Carga cumprida de ${escape(item.subject)}" aria-valuemin="0" aria-valuemax="${Math.max(1, target)}" aria-valuenow="${Math.min(done, Math.max(1, target))}"><span style="width:${percent}%"></span></div><label>Meta semanal <input type="number" min="0" max="1800" step="10" value="${target}" onchange="KingSchedule.setSubjectLoad('${safeId(item.id)}',this.value)"> min</label></article>`;
        }).join('') : '<p class="schedule-load-empty">Adicione uma matéria para definir a carga semanal.</p>';
        byId('scheduleLoadTotals').textContent = `${minutesText(doneTotal)} estudados de ${minutesText(targetTotal)} planejados nesta semana`;
    }

    function setViewMode(mode) {
        if (!['fixed', 'load'].includes(mode)) return;
        appData.studySchedule.viewMode = mode;
        saveAppData(); render();
    }

    function setPause(value) {
        const minutes = Number(value);
        if (!Number.isInteger(minutes) || minutes < 0 || minutes > 90) {
            byId('scheduleQuickPause').value = String(settings().pauseMinutes);
            return toast('Escolha uma pausa entre 0 e 90 minutos.', true);
        }
        const current = settings();
        appData.studySchedule.settings = Core.normalizeSettings({ ...current, pauseMinutes: minutes,
            pauseMode: minutes === 0 ? 'fixed' : current.pauseMode,
            minPauseMinutes: Math.min(current.minPauseMinutes, minutes) });
        saveAppData(); render(); toast(`Pausa entre blocos: ${minutes} min. Os blocos já concluídos não mudaram.`);
    }

    function setSubjectLoad(id, value) {
        const item = subject(id), minutes = Number(value);
        if (!item || !Number.isInteger(minutes) || minutes < 0 || minutes > 1800) return toast('Informe de 0 a 1.800 minutos por semana.', true);
        item.schedule.weeklyMinutes = minutes;
        item.schedule.weeklyBlocks = Math.min(30, Math.ceil(minutes / settings().blockMinutes));
        saveAppData(); render();
    }

    function startLoadSubject(id) {
        const item = subject(id); if (!item) return;
        if (appData.pendingStudySession) return toast('Registre ou descarte a sessão pendente antes de começar.', true);
        if (typeof isRunning !== 'undefined' && isRunning) return toast('Pause ou conclua o cronômetro atual antes de trocar de matéria.', true);
        if (typeof currentSeconds !== 'undefined' && currentSeconds >= 5) return toast('Registre ou proteja o tempo da sessão atual antes de iniciar outra matéria.', true);
        byId('activeSubjectSelect').value = String(item.id);
        appData.activeScheduleBlock = null;
        if (typeof setMode === 'function') setMode('estudo');
        if (typeof atualizarSeletorDeMaterias === 'function') atualizarSeletorDeMaterias();
        saveAppData(); showSection('dashboard'); toast(`${item.subject}: o tempo estudado contará para sua carga semanal.`);
    }

    function reconcileStudiedBlocks() {
        const today = Core.iso(new Date());
        let changed = false;
        for (const [key, scheduleWeek] of Object.entries(appData.studySchedule.weeks)) {
            const groups = new Map();
            for (const block of scheduleWeek.blocks || []) {
                const date = dateForDay(key, block.day);
                if (date > today) continue;
                const groupKey = `${date}|${block.subjectId}`;
                if (!groups.has(groupKey)) groups.set(groupKey, { date, subjectId: block.subjectId, blocks: [] });
                groups.get(groupKey).blocks.push(block);
            }
            for (const group of groups.values()) {
                const mat = subject(group.subjectId);
                if (!mat) continue;
                const seconds = appData.historyItems.reduce((sum, item) => {
                    if (dataHistoricoISO(item) !== group.date) return sum;
                    const sameSubject = item.subjectId
                        ? String(item.subjectId) === String(mat.id)
                        : String(item.materia || '').trim().toLocaleLowerCase('pt-BR') === String(mat.subject || '').trim().toLocaleLowerCase('pt-BR');
                    if (!sameSubject) return sum;
                    return sum + Math.max(0, Number(item.tempoSegundos) || 0);
                }, 0);
                const sorted = group.blocks.sort((a, b) => (a.order ?? 999) - (b.order ?? 999));
                const needed = block => Math.max(5, Number(block.duration) || settings().blockMinutes) * 60;
                // Blocos concluídos pelo usuário já têm prioridade sobre a distribuição automática.
                const reserved = sorted.filter(block => block.status === 'completed' && !block.result?.autoCompleted)
                    .reduce((sum, block) => sum + needed(block), 0);
                let remaining = Math.max(0, seconds - reserved);
                for (const block of sorted) {
                    if (block.status === 'completed' && !block.result?.autoCompleted) continue;
                    if (remaining >= needed(block)) {
                        remaining -= needed(block);
                        if (block.status === 'completed') continue;
                        block.status = 'completed'; block.registered = true;
                        block.result = { ...(block.result || {}), activity: 'estudo', actualMinutes: block.duration,
                            completedAt: Date.now(), autoCompleted: true, notes: `Concluído automaticamente após ${block.duration} minutos nesta matéria.` };
                        changed = true;
                    } else if (block.result?.autoCompleted) {
                        // Corrige blocos marcados pela regra antiga com tempo de outra matéria.
                        block.status = 'pending'; block.registered = false; delete block.result;
                        changed = true;
                    }
                }
            }
        }
        if (changed) saveAppData();
    }

    function plannerOptions() {
        const lastStudiedBySubject = {};
        for (const entry of (appData.historyItems || [])) {
            const matched = appData.cycleItems.find(item => String(item.id) === String(entry.subjectId || '')
                || String(item.subject).toLocaleLowerCase('pt-BR') === String(entry.materia || '').toLocaleLowerCase('pt-BR'));
            if (!matched) continue;
            const timestamp = Number(entry.id) > 1e12 ? Number(entry.id) : Date.parse(`${entry.dataChave || ''}T12:00:00`);
            if (Number.isFinite(timestamp)) lastStudiedBySubject[String(matched.id)] = Math.max(lastStudiedBySubject[String(matched.id)] || 0, timestamp);
        }
        return { reservedBlocks: (week(false)?.blocks || []).filter(block => block.status === 'completed'), busyByDay: agendaBusyByDay(), intent: plannerIntent, lastStudiedBySubject };
    }
    function renderPlanner() {
        if (!plannerDraft) return;
        const value = plannerDraft.constraints;
        const target = value.targetBlocksPerDay ?? value.blocksPerDay;
        const modeLabel = { adaptive: 'Adaptativo', rigid: 'Rígido', free: 'Livre' }[value.mode] || 'Adaptativo';
        const modeKicker = byId('schedulePlannerModal')?.querySelector('.schedule-planner-header .workspace-kicker');
        if (modeKicker) modeKicker.textContent = `PLANEJADOR DA SEMANA · ${modeLabel.toLocaleUpperCase('pt-BR')}`;
        const durationLabel = value.durationMode === 'flexible' ? `${value.minBlockMinutes}–${value.maxBlockMinutes} min` : `${value.blockMinutes} min`;
        const pauseLabel = value.pauseMode === 'flexible' ? `${value.minPauseMinutes}–${value.pauseMinutes} min` : `${value.pauseMinutes} min`;
        byId('schedulePlannerRules').innerHTML = `<div><span>Modo</span><strong>${modeLabel}</strong></div><div><span>Horário-base</span><strong>${escape(value.startTime)}–${escape(value.endTime)}</strong></div><div><span>Meta ideal</span><strong>${target} blocos/dia</strong></div><div><span>Cada bloco</span><strong>${durationLabel}</strong></div><div><span>Pausa</span><strong>${pauseLabel}</strong></div><div><span>Registro</span><strong>${value.registrationMinutes} min após bloco</strong></div><div><span>Dias ativos</span><strong>${value.studyDays.map(day => DAY_SHORT[day]).join(' · ')}</strong></div>`;
        const check = plannerDraft.blocks.length ? Planner.ScheduleValidator.validate(plannerDraft, value, appData.cycleItems, plannerOptions()) : { valid: false, errors: plannerDraft.errors || [], warnings: plannerDraft.warnings || [] };
        const errors = [...new Set([...(plannerDraft.errors || []), ...check.errors])];
        const warnings = [...new Set([...(plannerDraft.warnings || []), ...check.warnings])];
        const valid = !errors.length && check.valid;
        const dayPlans = plannerDraft.dayPlans || {};
        const adaptedDays = Object.values(dayPlans).filter(day => day.status === 'adapted').length;
        const scheduled = plannerDraft.blocks.length;
        const ideal = target * value.studyDays.length;
        byId('schedulePlannerStatus').innerHTML = errors.length
            ? `<div class="schedule-plan-errors"><strong>Há conflitos antes de aplicar.</strong>${errors.map(item => `<p>${escape(item)}</p>`).join('')}</div>`
            : `<div class="schedule-plan-valid"><strong>✓ ${scheduled}/${ideal} blocos ideais nesta semana · sem ultrapassar os horários livres</strong><span>${adaptedDays ? `${adaptedDays} ${adaptedDays === 1 ? 'dia foi adaptado' : 'dias foram adaptados'} ao tempo disponível. ` : ''}${warnings.length ? `${warnings.length} preferência(s) para conferir.` : 'Menos blocos não são falha quando falta tempo.'}</span></div>${warnings.length ? `<div class="schedule-plan-warnings">${warnings.map(item => `<p>${escape(item)}</p>`).join('')}</div>` : ''}`;
        byId('scheduleApplyPreview').disabled = !valid;
        byId('schedulePlannerFooterHint').textContent = valid ? 'Os horários estão validados. Somente “Aplicar cronograma” altera a semana.' : 'Ajuste as regras ou o pedido; o cronograma atual permanece intacto.';
        const subjects = Planner.UserStudyPreferences.normalize(appData.cycleItems, value).subjects;
        byId('schedulePlannerPreview').innerHTML = !plannerDraft.blocks.length ? '<div class="schedule-plan-empty">Nenhum bloco pôde ser planejado nas janelas informadas. Seu cronograma atual continua intacto.</div>'
            : `<div class="schedule-plan-days">${value.studyDays.map(day => {
                const blocks = plannerDraft.blocks.filter(block => Number(block.day) === day).sort((a, b) => a.order - b.order);
                const daily = dayPlans[day] || {};
                const dailyTarget = Number(daily.targetBlocks ?? target);
                const netPlanned = blocks.reduce((sum, block) => sum + Number(block.duration || 0), 0);
                const adapted = daily.status === 'adapted' || blocks.length < dailyTarget;
                const statusText = adapted ? (daily.reason || 'Carga adaptada ao horário') : 'Meta diária completa';
                return `<article class="schedule-plan-day ${adapted ? 'schedule-plan-adapted' : ''}"><header><strong>${DAY_NAMES[day]}</strong><small>${blocks.length}/${dailyTarget} blocos · ${statusText}</small></header><div class="schedule-plan-load"><span>Meta <strong>${minutesText(Number(daily.targetStudyMinutes) || dailyTarget * value.blockMinutes)}</strong></span><span>Disponível <strong>${minutesText(Number(daily.availableStudyMinutes) || 0)}</strong></span><span>Planejado <strong>${minutesText(netPlanned)}</strong></span></div>${blocks.map(block => `<div class="schedule-plan-slot"><time>${escape(block.start)}<span>–</span>${escape(block.end)}</time><label><span>Bloco ${block.order + 1}${block.status === 'completed' ? ' · concluído' : ''}</span><select data-plan-block="${escape(block.id)}" aria-label="Matéria do bloco ${block.order + 1} de ${DAY_NAMES[day]}" ${block.status === 'completed' ? 'disabled' : ''}><option value="">Escolha a matéria</option>${subjects.map(item => `<option value="${escape(item.id)}" ${String(block.subjectId) === item.id ? 'selected' : ''}>${escape(item.name)}</option>`).join('')}</select></label></div>`).join('')}</article>`;
            }).join('')}</div>`;
    }
    function refreshPlanner() {
        if (!Planner) return toast('O planejador ainda não está disponível. Atualize a página.', true);
        plannerDraft = Planner.ScheduleGenerator.generate(appData.cycleItems, settings(), visibleWeek, plannerOptions());
        renderPlanner();
    }
    function organizeCurrentWeek() {
        ensureData();
        if (!Planner) return toast('O planejador ainda não está disponível. Atualize a página.', true);
        if (!appData.cycleItems.some(item => Number(item.schedule?.weeklyBlocks) > 0)) { toast('Defina a carga semanal das matérias primeiro.', true); return openSettings(); }
        plannerIntent = {};
        byId('scheduleAiMessage').value = '';
        byId('scheduleAiFeedback').textContent = 'As preferências só valem para esta prévia. As regras salvas continuam iguais.';
        byId('schedulePlannerModal').classList.add('active');
        refreshPlanner();
    }
    function closePlanner() { fecharModal('schedulePlannerModal'); plannerDraft = null; }
    function editPlannerRules() { closePlanner(); openSettings(); }
    async function interpretPlannerRequest() {
        const message = byId('scheduleAiMessage').value.trim();
        if (!message) { plannerIntent = {}; refreshPlanner(); return; }
        const preferences = Planner.UserStudyPreferences.normalize(appData.cycleItems, settings());
        const currentDay = new Date().getDay() || 7;
        const interpretationContext = { ...settings(), currentDay };
        const direct = Planner.AIScheduleAssistant.interpret({}, message, interpretationContext, preferences.subjects);
        if (direct.errors.length) {
            plannerDraft.errors = direct.errors;
            renderPlanner();
            byId('scheduleAiFeedback').textContent = direct.errors.join(' ');
            return;
        }
        const button = byId('scheduleAiRequest');
        button.disabled = true;
        byId('scheduleApplyPreview').disabled = true;
        byId('scheduleAiFeedback').textContent = 'A IA está interpretando seu pedido. Nenhum bloco será alterado agora.';
        try {
            await window.kingGeminiReady;
            if (!window.kingGemini?.interpretScheduleRequest) throw new Error('A IA não está disponível no momento. A prévia sem texto continua funcionando.');
            const raw = await window.kingGemini.interpretScheduleRequest({ message, subjects: preferences.subjects.map(item => item.name), constraints: settings(), currentDay });
            const interpreted = Planner.AIScheduleAssistant.interpret(raw, message, interpretationContext, preferences.subjects);
            if (interpreted.errors.length) {
                plannerDraft.errors = interpreted.errors;
                renderPlanner();
                byId('scheduleAiFeedback').textContent = interpreted.errors.join(' ');
                return;
            }
            plannerIntent = interpreted;
            refreshPlanner();
            byId('scheduleAiFeedback').textContent = interpreted.explanation || 'Pedido interpretado. Confira a prévia antes de aplicar.';
        } catch {
            const recognized = direct.dayOverrides?.length || direct.priorityIds?.length || direct.pairSubjectIds?.length
                || Object.keys(direct.preferredDays || {}).length || direct.avoidSameDay?.length;
            if (recognized) {
                plannerIntent = direct;
                refreshPlanner();
                byId('scheduleAiFeedback').textContent = 'A IA não respondeu. Usei apenas os ajustes simples reconhecidos no seu texto; confira a prévia antes de aplicar.';
            } else {
                plannerDraft.errors = ['Não foi possível interpretar o pedido. Nenhuma sugestão da IA foi aplicada.'];
                renderPlanner();
                byId('scheduleAiFeedback').textContent = 'A IA não respondeu. Tente de novo ou apague o pedido para usar apenas suas regras salvas.';
            }
        }
        finally { button.disabled = false; }
    }
    function applyPlannerPreview() {
        if (!plannerDraft?.blocks?.length) return;
        const check = Planner.ScheduleValidator.validate(plannerDraft, plannerDraft.constraints || settings(), appData.cycleItems, plannerOptions());
        if (plannerDraft.errors?.length || !check.valid) { renderPlanner(); return toast('Resolva os conflitos antes de aplicar.', true); }
        const current = week(false);
        const replacing = (current?.blocks || []).filter(block => block.status !== 'completed').length;
        if (replacing && !confirm(`Substituir os ${replacing} blocos não concluídos desta semana pela prévia validada? Os registros de estudo serão mantidos.`)) return;
        detachLinksForRemovedBlocks({ [visibleWeek]: { blocks: (current?.blocks || []).filter(block => block.status !== 'completed') } });
        appData.studySchedule.weeks[visibleWeek] = { key: visibleWeek, blocks: plannerDraft.blocks.map(block => ({ ...block })),
            dailyClosures: { ...(current?.dailyClosures || {}) }, warnings: [...check.warnings], unscheduled: [],
            archivedCompletedBlocks: [...(current?.archivedCompletedBlocks || []), ...(plannerDraft.archivedCompletedBlocks || [])]
                .filter((block, index, list) => list.findIndex(other => String(other.id) === String(block.id)) === index),
            dayPlans: structuredClone(plannerDraft.dayPlans || {}), mode: settings().mode, generatedAt: Date.now(), strict: true };
        saveAppData(); closePlanner(); render(); toast('Cronograma adaptado e aplicado sem ultrapassar seus horários.');
    }
    function clearAllBlocks() {
        ensureData();
        const entries = Object.values(appData.studySchedule.weeks);
        const count = entries.reduce((sum, item) => sum + (item?.blocks?.length || 0) + (item?.archivedCompletedBlocks?.length || 0), 0);
        if (!count) return toast('Não há blocos para apagar.');
        if (!confirm(`Apagar todos os ${count} blocos do cronograma, inclusive os incompletos, em todas as semanas? Seu cronômetro, as sessões aguardando registro e o histórico serão preservados, mas deixarão de estar vinculados aos blocos apagados.`)) return;
        const snapshot = {
            weeks: structuredClone(appData.studySchedule.weeks),
            pendingStudySessions: structuredClone(appData.pendingStudySessions || []),
            pendingStudySession: appData.pendingStudySession ? structuredClone(appData.pendingStudySession) : null,
            activeScheduleBlock: appData.activeScheduleBlock ? { ...appData.activeScheduleBlock } : null
        };
        let protectedCount = 0;
        try {
            protectedCount = detachLinksForRemovedBlocks(appData.studySchedule.weeks);
            appData.activeScheduleBlock = null;
            Core.clearAllBlocks(appData.studySchedule.weeks);
            saveAppData();
        } catch (error) {
            appData.studySchedule.weeks = snapshot.weeks;
            appData.pendingStudySessions = snapshot.pendingStudySessions;
            appData.pendingStudySession = snapshot.pendingStudySession;
            appData.activeScheduleBlock = snapshot.activeScheduleBlock;
            console.error('Não foi possível apagar os blocos com segurança:', error);
            return toast('Não foi possível salvar a exclusão. Nenhum bloco foi apagado.', true);
        }
        render();
        toast(`${count} blocos apagados. ${protectedCount ? `${protectedCount} sessão(ões) protegida(s) para registrar depois.` : 'Seu histórico foi preservado.'}`);
    }
    function changeWeek(direction) { visibleWeek = Core.addDays(visibleWeek, Number(direction) * 7); selectedDay = settings().studyDays[0] || 1; render(); }
    function goCurrentWeek() { visibleWeek = currentWeekKey(); selectedDay = new Date().getDay() || 7; render(); }
    function selectDay(day) { selectedDay = DAYS.includes(Number(day)) ? Number(day) : 1; renderWeekMatrix(); renderDayStrip(); renderTimeline(); renderDayPanel(); }
    function copyToNextWeek() {
        const source = week(false);
        if (!source?.blocks?.length) return toast('Monte esta semana antes de copiá-la.', true);
        const next = Core.addDays(visibleWeek, 7);
        if (week(false, next)?.blocks?.length && !confirm('A semana seguinte já possui blocos. Deseja substituí-los?')) return;
        detachLinksForRemovedBlocks({ [next]: { blocks: week(false, next)?.blocks || [] } });
        appData.studySchedule.weeks[next] = Core.copyWeek(source, next);
        saveAppData(); visibleWeek = next; selectedDay = settings().studyDays[0] || 1; render(); toast('✓ Estrutura copiada; o progresso começou zerado.');
    }
    function replanOverdue() {
        if (week(false)?.strict) { toast('Use “Montar com IA” para conferir a prévia antes de reorganizar os horários.'); return organizeCurrentWeek(); }
        const today = new Date().getDay();
        if (visibleWeek !== currentWeekKey() || !DAYS.includes(today)) return;
        const targetDay = settings().studyDays.find(day => day >= today) || today;
        const target = week(false); let moved = 0;
        const affected = new Set([targetDay]);
        target.blocks.forEach(block => {
            if (Number(block.day) < today && ['pending', 'missed'].includes(block.status)) {
                affected.add(Number(block.day)); block.day = targetDay; block.status = 'pending'; block.fixedStart = false; block.order = 999; moved += 1;
            }
        });
        affected.forEach(day => recomputeDay(day));
        saveAppData(); selectedDay = targetDay; render(); toast(`${moved} ${moved === 1 ? 'bloco foi replanejado' : 'blocos foram replanejados'} sem apagar nada.`);
    }

    function availabilityRow(day, range) {
        return `<div class="schedule-availability-slot"><label><span>Das</span><input type="time" class="cycle-input" data-range="start" value="${escape(range.start)}"></label><label><span>Até</span><input type="time" class="cycle-input" data-range="end" value="${escape(range.end)}"></label><button type="button" class="cycle-btn" onclick="KingSchedule.removeAvailabilityRange(this)" aria-label="Remover horário livre">×</button></div>`;
    }
    function renderAvailabilityEditor(value) {
        let editor = byId('scheduleAvailabilityEditor');
        if (!editor) {
            editor = document.createElement('div');
            editor.id = 'scheduleAvailabilityEditor';
            editor.className = 'schedule-availability-editor';
            document.querySelector('#scheduleSettingsModal .schedule-day-options').after(editor);
        }
        editor.innerHTML = `<div class="schedule-availability-heading"><div><strong>Horários realmente livres</strong><small>Inclua manhã, tarde ou noite separadamente. Compromissos com horário na Agenda também serão respeitados.</small></div><button type="button" class="cycle-btn" onclick="KingSchedule.applyAvailabilityTemplate()">Aplicar horário-base aos dias</button></div><div class="schedule-availability-days">${DAYS.map(day => `<div class="schedule-availability-day" data-availability-day="${day}"><div class="schedule-availability-day-title"><strong>${DAY_NAMES[day]}</strong><button type="button" class="cycle-btn" onclick="KingSchedule.addAvailabilityRange(${day})">+ Horário livre</button></div><div class="schedule-availability-slots">${(value.availability[day] || []).map(range => availabilityRow(day, range)).join('')}</div></div>`).join('')}</div><p class="schedule-availability-note">No modo adaptativo, um dia com menos tempo recebe menos blocos sem virar uma falha nem ocupar outro dia.</p>`;
    }
    function addAvailabilityRange(day) {
        const container = document.querySelector(`[data-availability-day="${day}"] .schedule-availability-slots`);
        if (!container) return;
        const previous = container.querySelector('.schedule-availability-slot:last-child [data-range="end"]')?.value;
        const start = previous && Core.toMinutes(previous) + 30 < 1380 ? Core.addMinutes(previous, 30) : byId('scheduleStartTime').value || '14:00';
        const end = Core.toClock(Math.min(1439, Core.toMinutes(start) + 120));
        container.insertAdjacentHTML('beforeend', availabilityRow(day, { start, end }));
        container.lastElementChild.querySelector('[data-range="start"]').focus();
    }
    function removeAvailabilityRange(button) { button.closest('.schedule-availability-slot')?.remove(); }
    function applyAvailabilityTemplate() {
        if (!confirm('Substituir os horários livres dos dias selecionados pelo horário-base?')) return;
        const start = byId('scheduleStartTime').value;
        const end = byId('scheduleEndTime')?.value || Core.toClock(Math.min(1439, Core.toMinutes(start) + Number(byId('scheduleDailyCapacity').value)));
        document.querySelectorAll('#scheduleSettingsModal .schedule-day-options input:checked').forEach(input => {
            const container = document.querySelector(`[data-availability-day="${input.value}"] .schedule-availability-slots`);
            if (container) container.innerHTML = availabilityRow(Number(input.value), { start, end });
        });
    }
    function readAvailability(days) {
        const availability = {};
        for (const day of days) {
            const ranges = [...document.querySelectorAll(`[data-availability-day="${day}"] .schedule-availability-slot`)].map(row => ({ start: row.querySelector('[data-range="start"]').value, end: row.querySelector('[data-range="end"]').value }));
            if (!ranges.length) { toast(`Informe pelo menos um horário livre em ${DAY_NAMES[day]}.`, true); return null; }
            const ordered = ranges.sort((a, b) => Core.toMinutes(a.start) - Core.toMinutes(b.start));
            if (ordered.some((range, index) => !range.start || !range.end || Core.toMinutes(range.end) - Core.toMinutes(range.start) < 10 || (index && Core.toMinutes(range.start) < Core.toMinutes(ordered[index - 1].end)))) {
                toast(`Revise os horários de ${DAY_NAMES[day]}: cada intervalo precisa ter ao menos 10 min e não pode sobrepor outro.`, true); return null;
            }
            availability[day] = ordered;
        }
        return availability;
    }
    function ensureStrictSettingsControls() {
        if (byId('scheduleEndTime')) return;
        byId('scheduleStartTime').closest('.cycle-form-group').insertAdjacentHTML('afterend', '<div class="cycle-form-group"><label class="cycle-label" for="scheduleEndTime">Terminar até</label><input type="time" class="cycle-input" id="scheduleEndTime" required></div>');
        byId('scheduleDailyCapacity').closest('.cycle-form-group').hidden = true;
        byId('scheduleBlockMinutes').closest('.cycle-form-group').insertAdjacentHTML('beforebegin', '<div class="cycle-form-group"><label class="cycle-label" for="scheduleBlocksPerDay">Meta ideal de blocos por dia</label><input type="number" class="cycle-input" id="scheduleBlocksPerDay" min="1" max="8" required></div>');
        byId('schedulePauseMinutes').closest('.cycle-form-group').insertAdjacentHTML('afterend', '<div class="cycle-form-group"><label class="cycle-label" for="scheduleRegistrationMinutes">Registro após cada bloco</label><select class="cycle-input" id="scheduleRegistrationMinutes"><option value="0">Sem tempo extra</option><option value="5">5 minutos</option><option value="10">10 minutos</option><option value="15">15 minutos</option></select></div>');
        byId('scheduleClosingMinutes').closest('.cycle-form-group').hidden = true;
        document.querySelector('#scheduleSettingsModal .schedule-day-options').insertAdjacentHTML('beforeend', '<label><input type="checkbox" value="7"><span><b>DOM</b><small>Domingo</small></span></label>');
    }
    function updateFlexControls() {
        const freeMode = byId('scheduleMode')?.value === 'free';
        const extras = byId('scheduleExtraRow');
        if (extras) extras.hidden = !freeMode;
        const pauseFlexible = byId('schedulePauseMode')?.value === 'flexible';
        const durationFlexible = byId('scheduleDurationMode')?.value === 'flexible';
        const pauseGroup = byId('scheduleMinPauseMinutes')?.closest('.cycle-form-group');
        const minDurationGroup = byId('scheduleMinBlockMinutes')?.closest('.cycle-form-group');
        const maxDurationGroup = byId('scheduleMaxBlockMinutes')?.closest('.cycle-form-group');
        if (pauseGroup) pauseGroup.hidden = !pauseFlexible;
        if (minDurationGroup) minDurationGroup.hidden = !durationFlexible;
        if (maxDurationGroup) maxDurationGroup.hidden = !durationFlexible;
    }
    function openSettings() {
        ensureData();
        ensureStrictSettingsControls();
        const value = settings();
        const submit = byId('scheduleSettingsForm')?.querySelector('button[type="submit"]');
        if (submit) submit.textContent = 'Salvar planejamento';
        byId('scheduleStartTime').value = value.startTime;
        byId('scheduleEndTime').value = value.endTime;
        byId('scheduleBlocksPerDay').value = String(value.targetBlocksPerDay);
        byId('scheduleMode').value = value.mode;
        byId('scheduleAllowExtraBlocks').checked = Boolean(value.allowExtraBlocks);
        byId('schedulePauseMode').value = value.pauseMode;
        byId('scheduleMinPauseMinutes').value = String(value.minPauseMinutes);
        byId('scheduleDurationMode').value = value.durationMode;
        byId('scheduleMinBlockMinutes').value = String(value.minBlockMinutes);
        byId('scheduleMaxBlockMinutes').value = String(value.maxBlockMinutes);
        byId('scheduleRegistrationMinutes').value = String(value.registrationMinutes);
        setSelectValue(byId('scheduleDailyCapacity'), value.dailyCapacityMinutes);
        byId('scheduleBlockMinutes').value = String(value.blockMinutes);
        byId('schedulePauseMinutes').value = String(value.pauseMinutes);
        byId('scheduleClosingMinutes').value = String(value.closingMinutes);
        byId('scheduleMaxSubjects').value = String(value.maxSubjectsPerDay);
        updateFlexControls();
        document.querySelectorAll('#scheduleSettingsModal .schedule-day-options input').forEach(input => input.checked = value.studyDays.includes(Number(input.value)));
        document.querySelector('label[for="scheduleStartTime"]')?.replaceChildren(document.createTextNode('Começar às'));
        document.querySelector('label[for="scheduleDailyCapacity"]')?.replaceChildren(document.createTextNode('Duração-base'));
        renderAvailabilityEditor(value);
        byId('scheduleSubjectPlans').innerHTML = appData.cycleItems.length ? appData.cycleItems.map(item => `<article class="schedule-subject-plan" data-subject-id="${safeId(item.id)}" style="--subject-color:${safeColor(item.color)}"><span class="schedule-plan-icon">${escape(item.schedule.icon)}</span><div class="schedule-plan-name"><strong>${escape(item.subject)}</strong><small>${escape(item.type || 'Estudo')}</small></div><label><span>Blocos desejados/semana</span><input type="number" class="cycle-input" data-plan="blocks" min="0" max="30" value="${item.schedule.weeklyBlocks}"></label><label><span>Prioridade</span><select class="cycle-input" data-plan="priority"><option value="1" ${item.schedule.priority === 1 ? 'selected' : ''}>Baixa</option><option value="2" ${item.schedule.priority === 2 ? 'selected' : ''}>Normal</option><option value="3" ${item.schedule.priority === 3 ? 'selected' : ''}>Alta</option></select></label><label class="schedule-plan-consecutive"><input type="checkbox" data-plan="consecutive" ${item.schedule.consecutive ? 'checked' : ''}><span><b>Priorizar pares</b><small>Dois blocos juntos</small></span></label><details class="schedule-subject-advanced"><summary>Mais critérios para ${escape(item.subject)}</summary><div><label><span>Dificuldade</span><select class="cycle-input" data-plan="difficulty"><option value="1" ${item.schedule.difficulty === 1 ? 'selected' : ''}>Baixa</option><option value="2" ${item.schedule.difficulty === 2 ? 'selected' : ''}>Média</option><option value="3" ${item.schedule.difficulty === 3 ? 'selected' : ''}>Alta</option></select></label><label><span>Carga de conteúdo</span><select class="cycle-input" data-plan="contentLoad"><option value="1" ${item.schedule.contentLoad === 1 ? 'selected' : ''}>Leve</option><option value="2" ${item.schedule.contentLoad === 2 ? 'selected' : ''}>Média</option><option value="3" ${item.schedule.contentLoad === 3 ? 'selected' : ''}>Alta</option></select></label><label><span>Dia fixo, se houver</span><select class="cycle-input" data-plan="preferredDay"><option value="0">Qualquer dia</option>${DAYS.map(day => `<option value="${day}" ${item.schedule.preferredDay === day ? 'selected' : ''}>${DAY_NAMES[day]}</option>`).join('')}</select></label></div></details></article>`).join('') : '<div class="schedule-settings-empty"><strong>Nenhuma matéria ainda</strong><p>Crie matérias no Hub para montar sua carga semanal.</p></div>';
        byId('scheduleSettingsModal').classList.add('active');
    }
    function saveSettings(event) {
        event.preventDefault();
        const startTime = byId('scheduleStartTime').value, endTime = byId('scheduleEndTime').value;
        const targetBlocks = Number(byId('scheduleBlocksPerDay').value);
        const blockMinutes = Number(byId('scheduleBlockMinutes').value);
        const pauseMinutes = Number(byId('schedulePauseMinutes').value);
        const minPauseMinutes = Number(byId('scheduleMinPauseMinutes').value);
        const minBlockMinutes = Number(byId('scheduleMinBlockMinutes').value);
        const maxBlockMinutes = Number(byId('scheduleMaxBlockMinutes').value);
        const pauseMode = byId('schedulePauseMode').value;
        const durationMode = byId('scheduleDurationMode').value;
        const mode = byId('scheduleMode').value;
        const allowExtraBlocks = mode === 'free' && byId('scheduleAllowExtraBlocks').checked;
        if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(startTime) || !/^([01]\d|2[0-3]):[0-5]\d$/.test(endTime) || Core.toMinutes(endTime) <= Core.toMinutes(startTime))
            return toast('O horário de término precisa ser posterior ao início. Nada foi alterado.', true);
        if (!Number.isInteger(targetBlocks) || targetBlocks < 1 || targetBlocks > 8)
            return toast('Escolha uma meta entre 1 e 8 blocos por dia.', true);
        if (pauseMode === 'flexible' && (!Number.isInteger(minPauseMinutes) || minPauseMinutes < 1 || minPauseMinutes > pauseMinutes))
            return toast('A pausa mínima precisa ser positiva e não pode superar a pausa padrão.', true);
        if (durationMode === 'flexible' && (!Number.isInteger(minBlockMinutes) || !Number.isInteger(maxBlockMinutes)
            || minBlockMinutes < 10 || minBlockMinutes > blockMinutes || maxBlockMinutes < blockMinutes || maxBlockMinutes > 240))
            return toast('A duração flexível deve ter mínimo até o bloco padrão e máximo igual ou maior que ele.', true);
        const days = [...document.querySelectorAll('#scheduleSettingsModal .schedule-day-options input:checked')].map(input => Number(input.value));
        if (!days.length) return toast('Escolha pelo menos um dia disponível.', true);
        const availability = readAvailability(days);
        if (!availability) return;
        const proposed = Core.normalizeSettings({
            startTime, endTime, studyDays: days,
            mode, allowExtraBlocks, targetBlocksPerDay: targetBlocks, blockMinutes,
            durationMode, minBlockMinutes, maxBlockMinutes,
            pauseMinutes, pauseMode, minPauseMinutes, registrationMinutes: byId('scheduleRegistrationMinutes').value,
            closingMinutes: byId('scheduleRegistrationMinutes').value, maxSubjectsPerDay: byId('scheduleMaxSubjects').value, availability
        });
        const feasibility = Planner?.ScheduleConstraints.slots(proposed);
        appData.studySchedule.settings = proposed;
        document.querySelectorAll('#scheduleSubjectPlans .schedule-subject-plan').forEach(card => {
            const item = subject(card.dataset.subjectId); if (!item) return;
            const newBlocks = Math.min(30, Math.max(0, Number(card.querySelector('[data-plan="blocks"]').value) || 0));
            if (newBlocks !== item.schedule.weeklyBlocks) item.schedule.weeklyMinutes = newBlocks * proposed.blockMinutes;
            item.schedule.weeklyBlocks = newBlocks;
            item.schedule.priority = Math.min(3, Math.max(1, Number(card.querySelector('[data-plan="priority"]').value) || 2));
            item.schedule.consecutive = card.querySelector('[data-plan="consecutive"]').checked;
            item.schedule.difficulty = Number(card.querySelector('[data-plan="difficulty"]').value) || 2;
            item.schedule.contentLoad = Number(card.querySelector('[data-plan="contentLoad"]').value) || 2;
            item.schedule.preferredDay = Number(card.querySelector('[data-plan="preferredDay"]').value) || 0;
        });
        saveAppData(); fecharModal('scheduleSettingsModal'); render(); renderizarCiclo();
        toast(feasibility?.errors?.length && mode === 'rigid'
            ? 'Meta rígida salva. Alguns dias não comportam todos os blocos; veja a prévia antes de aplicar.'
            : 'Meta e horários salvos. A prévia mostrará a carga possível em cada dia.');
    }

    function fillBlockSelects(selectedSubject, day) {
        byId('scheduleBlockSubject').innerHTML = appData.cycleItems.map(item => `<option value="${safeId(item.id)}">${escape(item.schedule?.icon || '●')} ${escape(item.subject)}</option>`).join('');
        if (selectedSubject != null) byId('scheduleBlockSubject').value = String(selectedSubject);
        byId('scheduleBlockDay').innerHTML = DAYS.map(value => `<option value="${value}">${DAY_NAMES[value]}</option>`).join('');
        byId('scheduleBlockDay').value = String(day);
        updateTopicSuggestions();
    }
    function updateTopicSuggestions() {
        const item = subject(byId('scheduleBlockSubject').value);
        const topics = Array.isArray(item?.topicos) ? item.topicos : [];
        byId('scheduleTopicSuggestions').innerHTML = topics.map(topic => `<option value="${escape(typeof topic === 'string' ? topic : topic?.nome || topic?.name || '')}"></option>`).join('');
    }
    function setSelectValue(select, value) {
        if (![...select.options].some(option => String(option.value) === String(value))) select.add(new Option(`${value} min`, String(value)));
        select.value = String(value);
    }
    function openBlock(id = null, requestedDay = null, requestedStart = null, allowStrictDuplicate = false) {
        ensureData();
        if (week(false)?.strict && !allowStrictDuplicate) {
            toast('Esta semana foi validada. Altere a matéria na prévia do planejador.');
            return organizeCurrentWeek();
        }
        if (!appData.cycleItems.length) { toast('Adicione uma matéria antes de criar o bloco.', true); showSection('planejamento'); return abrirModalCiclo(); }
        const block = id != null ? findBlock(id) : null;
        const day = Number(block?.day || requestedDay || selectedDay || settings().studyDays[0]);
        byId('scheduleBlockForm').reset();
        byId('scheduleBlockForm').dataset.unlockStrict = allowStrictDuplicate ? 'true' : '';
        byId('scheduleBlockModalTitle').textContent = block ? 'Editar bloco' : 'Planejar estudo';
        byId('scheduleBlockId').value = block?.id || '';
        byId('scheduleBlockWeek').value = visibleWeek;
        fillBlockSelects(block?.subjectId, day);
        byId('scheduleBlockKind').value = block?.kind || 'teoria';
        byId('scheduleBlockTopic').value = block?.topic || '';
        byId('scheduleBlockStart').value = block?.start || (/^\d{2}:\d{2}$/.test(String(requestedStart || '')) ? requestedStart : nextStart(day));
        setSelectValue(byId('scheduleBlockDuration'), block?.duration || settings().blockMinutes);
        byId('scheduleBlockStatus').value = block?.status || 'pending';
        byId('scheduleDeleteBlock').hidden = !block;
        byId('scheduleBlockModal').classList.add('active');
    }
    function duplicateSlot(source) {
        const value = settings(), duration = Number(source.duration) || value.blockMinutes;
        const orderedDays = [...DAYS.filter(day => day >= Number(source.day)), ...DAYS.filter(day => day < Number(source.day))];
        const agenda = agendaBusyByDay();
        for (const day of orderedDays) {
            if (!value.studyDays.includes(day)) continue;
            const occupied = [
                ...getDayBlocks(day).map(block => ({ start: Core.toMinutes(block.start), end: Core.toMinutes(block.start) + Number(block.duration) + value.pauseMinutes })),
                ...(agenda[day] || []).map(entry => ({ start: Core.toMinutes(entry.start), end: Core.toMinutes(entry.end) + value.pauseMinutes }))
            ].sort((a, b) => a.start - b.start);
            for (const range of value.availability[day] || []) {
                let cursor = Math.max(Core.toMinutes(range.start), day === Number(source.day)
                    ? Core.toMinutes(source.start) + duration + value.pauseMinutes : 0);
                const limit = Core.toMinutes(range.end);
                for (const entry of occupied) {
                    if (entry.end <= cursor) continue;
                    if (entry.start >= cursor + duration) break;
                    cursor = Math.max(cursor, entry.end);
                }
                if (cursor + duration <= limit) return { day, start: Core.toClock(cursor) };
            }
        }
        return null;
    }
    function duplicateBlock(id) {
        const source = findBlock(id); if (!source) return;
        const slot = duplicateSlot(source);
        openBlock(null, slot?.day || source.day, slot?.start || nextStart(source.day), Boolean(week(false)?.strict));
        byId('scheduleBlockModalTitle').textContent = 'Duplicar bloco';
        byId('scheduleBlockSubject').value = String(source.subjectId);
        byId('scheduleBlockKind').value = source.kind;
        byId('scheduleBlockTopic').value = source.topic || '';
        setSelectValue(byId('scheduleBlockDuration'), source.duration);
        byId('scheduleBlockStatus').value = 'pending';
        updateTopicSuggestions();
        if (!slot) toast('Não há espaço livre nesta semana para outro bloco. Escolha outro horário antes de salvar.', true);
    }
    function saveBlock(event) {
        event.preventDefault();
        const key = byId('scheduleBlockWeek').value || visibleWeek, target = week(true, key), rawId = byId('scheduleBlockId').value;
        if (target.strict && byId('scheduleBlockForm').dataset.unlockStrict !== 'true') return toast('Esta semana foi validada. Faça alterações na prévia de “Montar com IA”.', true);
        if (target.strict) { target.strict = false; target.dayPlans = {}; target.unscheduled = []; }
        const day = Number(byId('scheduleBlockDay').value), existing = rawId ? target.blocks.find(item => String(item.id) === String(rawId)) : null;
        const statusValue = byId('scheduleBlockStatus').value;
        const values = {
            subjectId: byId('scheduleBlockSubject').value, kind: KINDS[byId('scheduleBlockKind').value] ? byId('scheduleBlockKind').value : 'teoria',
            topic: byId('scheduleBlockTopic').value.trim().slice(0, 120), day, start: byId('scheduleBlockStart').value,
            duration: Math.min(240, Math.max(5, Number(byId('scheduleBlockDuration').value) || settings().blockMinutes)),
            status: statusValue === 'completed' && !existing?.registered ? 'pending' : statusValue, fixedStart: true
        };
        const oldDay = existing?.day, oldStart = existing?.start;
        if (existing) Object.assign(existing, values);
        else target.blocks.push({ id: `bloco-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, order: getDayBlocks(day, key).length, registered: false, ...values });
        if (oldDay && Number(oldDay) !== day) recomputeDay(oldDay, key);
        if (!existing || Number(oldDay) !== day || oldStart !== values.start) {
            target.blocks.filter(item => Number(item.day) === day).sort((a, b) => Core.toMinutes(a.start) - Core.toMinutes(b.start) || (a.order ?? 999) - (b.order ?? 999)).forEach((item, index) => item.order = index);
        }
        recomputeDay(day, key);
        saveAppData(); fecharModal('scheduleBlockModal'); selectedDay = day; render(); toast('✓ Bloco salvo na semana.');
    }
    function deleteEditingBlock() {
        const id = byId('scheduleBlockId').value, key = byId('scheduleBlockWeek').value || visibleWeek, target = week(false, key);
        if (target?.strict) return toast('Esta semana foi validada. Use “Apagar todos os blocos” para esvaziar o cronograma ou gere uma nova prévia.', true);
        const block = target?.blocks.find(item => String(item.id) === String(id)); if (!block) return;
        if (block.registered && !confirm('O histórico do estudo será mantido. Retirar somente o bloco do cronograma?')) return;
        detachLinksForRemovedBlocks({ [key]: { blocks: [block] } });
        target.blocks = target.blocks.filter(item => String(item.id) !== String(id));
        recomputeDay(block.day, key); saveAppData(); fecharModal('scheduleBlockModal'); render(); toast('Bloco retirado do cronograma.');
    }

    function setStatus(id, status) {
        if (status === 'completed') return openComplete(id);
        const block = findBlock(id); if (!block || !STATUS[status]) return;
        block.status = status;
        if (status !== 'running' && String(appData.activeScheduleBlock?.blockId) === String(block.id)) appData.activeScheduleBlock = null;
        saveAppData(); render();
    }
    function startBlock(id) {
        const block = findBlock(id), mat = subject(block?.subjectId); if (!block || !mat) return;
        if (appData.pendingStudySession) return toast('Há uma sessão sem resumo. Registre ou descarte esse lembrete no painel Hoje.', true);
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
        saveAppData(); showSection('dashboard'); toast(`${mat.subject}: ${block.duration} minutos preparados no cronômetro.`);
    }
    function openComplete(id) {
        const block = findBlock(id), mat = subject(block?.subjectId); if (!block || !mat) return;
        const linked = String(appData.activeScheduleBlock?.blockId) === String(block.id);
        if (linked && typeof isRunning !== 'undefined' && isRunning) return toast('Pause o cronômetro antes de concluir o bloco.', true);
        if (linked && typeof currentSeconds !== 'undefined' && currentSeconds >= 5) return prepararRegistroSessao(currentSeconds, 'cronograma');
        if (!linked && typeof currentSeconds !== 'undefined' && currentSeconds >= 5) return toast('Registre ou zere a sessão atual antes de concluir outro bloco.', true);
        if (appData.pendingStudySession) return toast('Existe outro registro pendente no painel Hoje.', true);
        const createdAt = Date.now();
        appData.pendingStudySession = { id: `sessao-${createdAt}-${Math.random().toString(36).slice(2, 8)}`, seconds: block.duration * 60, subjectId: String(mat.id), origem: 'cronograma-manual', createdAt, scheduleWeekKey: visibleWeek, scheduleDay: Number(block.day), scheduleBlockId: block.id, scheduleCreditNeeded: true };
        appData.pendingStudySessions = [appData.pendingStudySession, ...(appData.pendingStudySessions || [])];
        saveAppData(); renderizarAvisoSessaoPendente(); abrirRegistroSessaoPendente();
        if (block.topic) byId('sessionTopic').value = block.topic;
        const desiredKind = block.kind === 'simulado' ? 'simulado' : block.kind === 'redacao' ? 'redacao' : 'estudo';
        const radio = document.querySelector(`input[name="sessionKind"][value="${desiredKind}"]`); if (radio) { radio.checked = true; atualizarTipoRegistroSessao(); }
    }
    function completeFromSession(pending, details) {
        if (!pending?.scheduleBlockId) return false;
        const block = findBlock(pending.scheduleBlockId, pending.scheduleWeekKey); if (!block) return false;
        if (String(details?.subjectId || '') !== String(block.subjectId)) return false;
        const generic = details?.atividade === 'estudo' ? details.study || {} : details?.simulado || {};
        const seconds = Number(pending.seconds) || block.duration * 60;
        const completed = seconds >= block.duration * 60;
        block.status = completed ? 'completed' : 'pending'; block.registered = completed;
        block.result = { topic: details?.assunto || block.topic || '', questions: Number(generic.total ?? generic.questoes) || 0, hits: Number(generic.acertos) || 0, errors: Number(generic.erros) || 0, notes: details?.comentario || '', activity: details?.atividade || 'estudo', actualMinutes: Math.max(1, Math.min(block.duration, Math.round(seconds / 60))), completedAt: Date.now() };
        if (pending.scheduleCreditNeeded) {
            appData.totalStudySeconds = Number(appData.totalStudySeconds || 0) + seconds;
            if (pending.scheduleWeekKey === currentWeekKey()) appData.weeklyChart[Number(block.day) - 1] = Number(appData.weeklyChart[Number(block.day) - 1] || 0) + seconds;
        }
        if (String(appData.activeScheduleBlock?.blockId) === String(block.id)) appData.activeScheduleBlock = null;
        setTimeout(() => { render(); toast(block.status === 'completed' ? 'Bloco concluído; o restante do tempo fica para o próximo bloco da mesma matéria.' : `Sessão registrada. Este bloco precisa de ${block.duration} minutos nesta matéria.`); }, 80);
        return true;
    }

    function openDayClose(day, key = visibleWeek) {
        const blocks = getDayBlocks(day, key); if (!blocks.length) return toast('Este dia ainda não possui blocos.', true);
        const summary = dailySummary(day, key), saved = week(false, key)?.dailyClosures?.[day];
        byId('scheduleDayCloseWeek').value = key; byId('scheduleDayCloseDay').value = day;
        byId('scheduleDayCloseNotes').value = saved?.notes || '';
        byId('scheduleDayCloseSummary').innerHTML = `<article><span>Matérias</span><strong>${escape(summary.subjects.join(', ') || 'Nenhuma concluída')}</strong></article><article><span>Blocos</span><strong>${summary.blocks}/${summary.planned}</strong></article><article><span>Tempo feito</span><strong>${minutesText(summary.minutes)}</strong></article><article><span>Questões</span><strong>${summary.questions}</strong></article><article><span>Acertos</span><strong>${summary.hits}</strong></article><article><span>Erros</span><strong>${summary.errors}</strong></article>`;
        if (typeof renderizarRevisoesFechamentoDia === 'function') renderizarRevisoesFechamentoDia(dateForDay(key, day));
        byId('scheduleDayCloseModal').classList.add('active');
    }
    function closeDayLater() { fecharModal('scheduleDayCloseModal'); }
    function saveDayClose(event) {
        event.preventDefault();
        const key = byId('scheduleDayCloseWeek').value, day = Number(byId('scheduleDayCloseDay').value), target = week(true, key);
        target.dailyClosures[day] = { ...dailySummary(day, key), notes: byId('scheduleDayCloseNotes').value.trim(), savedAt: Date.now() };
        saveAppData(); fecharModal('scheduleDayCloseModal'); render(); toast('✓ Check-in do dia salvo.');
    }

    function dragStart(event, id) { draggedBlockId = String(id); event.dataTransfer.effectAllowed = 'move'; event.dataTransfer.setData('text/plain', draggedBlockId); event.currentTarget.classList.add('dragging'); }
    function clearDragTargets() { document.querySelectorAll('.drag-over, .dragging').forEach(item => item.classList.remove('drag-over', 'dragging')); }
    function dragEnd() { draggedBlockId = null; clearDragTargets(); }
    function dragOverDay(event) { event.preventDefault(); event.currentTarget.classList.add('drag-over'); event.dataTransfer.dropEffect = 'move'; }
    function dragLeaveDay(event) { if (!event.currentTarget.contains(event.relatedTarget)) event.currentTarget.classList.remove('drag-over'); }
    function dragOverBlock(event) { if (!draggedBlockId) return; event.preventDefault(); event.currentTarget.classList.add('drag-over'); event.dataTransfer.dropEffect = 'move'; }
    function dragLeaveBlock(event) { if (!event.currentTarget.contains(event.relatedTarget)) event.currentTarget.classList.remove('drag-over'); }
    function pointerDown(event, id) {
        if (event.pointerType === 'mouse' || event.target.closest('button, input, select, a')) return;
        const startX = event.clientX, startY = event.clientY, source = event.currentTarget;
        const state = { id, source, active: false, timer: null };
        touchDrag = state;
        state.timer = setTimeout(() => { if (touchDrag !== state) return; state.active = true; source.classList.add('dragging'); navigator.vibrate?.(20); }, 350);
        const move = moveEvent => {
            if (touchDrag !== state) return;
            if (!state.active && Math.hypot(moveEvent.clientX - startX, moveEvent.clientY - startY) > 12) { finish(); return; }
            if (!state.active) return;
            moveEvent.preventDefault();
            document.querySelectorAll('.drag-over').forEach(item => item.classList.remove('drag-over'));
            document.elementFromPoint(moveEvent.clientX, moveEvent.clientY)?.closest('[data-drop-block-id], [data-drop-day], [data-drop-start]')?.classList.add('drag-over');
        };
        const finish = endEvent => {
            clearTimeout(state.timer);
            document.removeEventListener('pointermove', move);
            document.removeEventListener('pointerup', finish);
            document.removeEventListener('pointercancel', finish);
            if (touchDrag !== state) return;
            touchDrag = null;
            if (state.active && endEvent?.type === 'pointerup') {
                const hit = document.elementFromPoint(endEvent.clientX, endEvent.clientY)?.closest('[data-drop-block-id], [data-drop-day], [data-drop-start]');
                if (hit?.dataset.dropBlockId) moveBlock(id, findBlock(hit.dataset.dropBlockId)?.day, hit.dataset.dropBlockId);
                else if (hit?.dataset.dropStart) moveBlock(id, hit.dataset.dropDay, null, hit.dataset.dropStart);
                else if (hit?.dataset.dropDay) moveBlock(id, hit.dataset.dropDay);
            }
            clearDragTargets();
        };
        document.addEventListener('pointermove', move, { passive: false });
        document.addEventListener('pointerup', finish);
        document.addEventListener('pointercancel', finish);
    }
    function moveBlock(id, day, targetId = null, start = null) {
        if (week(false)?.strict) return toast('Para manter seus limites de horário, altere a matéria na prévia de “Montar com IA”.', true);
        const block = findBlock(id), target = targetId ? findBlock(targetId) : null;
        if (!block || (targetId && !target) || String(block.id) === String(targetId) || !DAYS.includes(Number(day))) return;
        const oldDay = Number(block.day), destination = Number(day);
        const oldList = getDayBlocks(oldDay).filter(item => item !== block);
        const destinationList = oldDay === destination ? oldList : getDayBlocks(destination);
        let index = target ? destinationList.findIndex(item => item === target) : destinationList.findIndex(item => Core.toMinutes(item.start) >= Core.toMinutes(start || '23:59'));
        if (index < 0) index = destinationList.length;
        destinationList.splice(index, 0, block);
        block.day = destination;
        oldList.forEach((item, position) => { item.order = position; item.fixedStart = false; });
        destinationList.forEach((item, position) => { item.order = position; item.fixedStart = false; });
        if (oldDay !== destination) recomputeDay(oldDay);
        recomputeDay(destination);
        saveAppData(); selectedDay = destination; render();
        toast('✓ Posição do bloco atualizada.');
    }
    function dropOnBlock(event, id) { event.preventDefault(); event.stopPropagation(); const source = draggedBlockId || event.dataTransfer?.getData('text/plain'); clearDragTargets(); moveBlock(source, findBlock(id)?.day, id); draggedBlockId = null; }
    function dropOnSlot(event, day, start) { event.preventDefault(); event.stopPropagation(); const source = draggedBlockId || event.dataTransfer?.getData('text/plain'); clearDragTargets(); moveBlock(source, day, null, start); draggedBlockId = null; }
    function dropToDay(event, day) {
        event.preventDefault(); event.currentTarget.classList.remove('drag-over');
        const id = draggedBlockId || event.dataTransfer.getData('text/plain'); moveBlock(id, day); draggedBlockId = null;
    }

    function applySuggestion(id) { const item = subject(id); if (!item) return; item.schedule.priority = 3; appData.studySchedule.suggestions.push({ subjectId: item.id, status: 'applied', at: Date.now() }); saveAppData(); render(); toast(`${item.subject} ganhou prioridade alta para a próxima organização.`); }
    function ignoreSuggestion(id) { appData.studySchedule.suggestions.push({ subjectId: id, status: 'ignored', at: Date.now() }); saveAppData(); render(); }
    function removeSubject(id) {
        ensureData();
        const removed = Object.fromEntries(Object.entries(appData.studySchedule.weeks).map(([key, item]) =>
            [key, { blocks: (item.blocks || []).filter(block => String(block.subjectId) === String(id)) }]));
        detachLinksForRemovedBlocks(removed);
        Object.values(appData.studySchedule.weeks).forEach(item => {
            item.blocks = (item.blocks || []).filter(block => String(block.subjectId) !== String(id));
            item.unscheduled = (item.unscheduled || []).filter(entry => String(entry.subjectId) !== String(id));
            item.dayPlans = {}; item.strict = false;
        });
    }
    function clearSubjects() {
        ensureData();
        detachLinksForRemovedBlocks(appData.studySchedule.weeks);
        Object.values(appData.studySchedule.weeks).forEach(item => {
            item.blocks = []; item.unscheduled = []; item.dayPlans = {}; item.strict = false;
        });
    }

    window.KingSchedule = {
        render, organizeCurrentWeek, changeWeek, goCurrentWeek, selectDay, copyToNextWeek, replanOverdue,
        closePlanner, editPlannerRules, refreshPlanner, interpretPlannerRequest, applyPlannerPreview, clearAllBlocks,
        openSettings, saveSettings, addAvailabilityRange, removeAvailabilityRange, applyAvailabilityTemplate, openBlock, duplicateBlock, saveBlock, deleteEditingBlock, setStatus, startBlock, openComplete,
        setViewMode, setPause, setSubjectLoad, startLoadSubject,
        completeFromSession, openDayClose, closeDayLater, saveDayClose, dragStart, dragEnd, dragOverDay, dragLeaveDay,
        dropToDay, dragOverBlock, dragLeaveBlock, dropOnBlock, dropOnSlot, pointerDown, updateTopicSuggestions,
        applySuggestion, ignoreSuggestion, removeSubject, clearSubjects,
        getVisibleWeek: () => visibleWeek, getSelectedDay: () => selectedDay
    };
    byId('scheduleBlockSubject')?.addEventListener('change', updateTopicSuggestions);
    byId('schedulePauseMode')?.addEventListener('change', updateFlexControls);
    byId('scheduleDurationMode')?.addEventListener('change', updateFlexControls);
    byId('scheduleMode')?.addEventListener('change', updateFlexControls);
    byId('schedulePlannerPreview')?.addEventListener('change', event => {
        const input = event.target.closest('[data-plan-block]');
        if (!input || !plannerDraft) return;
        const block = plannerDraft.blocks.find(item => String(item.id) === input.dataset.planBlock);
        if (!block || block.status === 'completed') return;
        block.subjectId = input.value;
        plannerDraft.errors = [];
        renderPlanner();
    });
    byId('scheduleAiMessage')?.addEventListener('input', event => {
        if (!plannerDraft) return;
        if (!event.target.value.trim()) { plannerIntent = {}; refreshPlanner(); return; }
        plannerDraft.errors = ['Interprete seu pedido antes de aplicar. A prévia acima ainda não considera esse texto.'];
        renderPlanner();
    });
    ensureData();
    if (byId('cronograma')?.classList.contains('active')) render();
})();
