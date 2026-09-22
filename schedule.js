/* Cronograma v2: uma visão semanal ampla e uma agenda diária realmente utilizável. */
(() => {
    const Core = window.KingScheduleCore;
    if (!Core) return;

    const DAYS = [1, 2, 3, 4, 5, 6];
    const DAY_NAMES = { 1: 'Segunda-feira', 2: 'Terça-feira', 3: 'Quarta-feira', 4: 'Quinta-feira', 5: 'Sexta-feira', 6: 'Sábado' };
    const DAY_SHORT = { 1: 'SEG', 2: 'TER', 3: 'QUA', 4: 'QUI', 5: 'SEX', 6: 'SÁB' };
    const KINDS = {
        teoria: { label: 'Teoria', icon: '◇' }, questoes: { label: 'Questões', icon: '◎' },
        revisao: { label: 'Revisão', icon: '↻' }, simulado: { label: 'Simulado', icon: '▦' }, redacao: { label: 'Redação', icon: '✎' }
    };
    const STATUS = {
        pending: { label: 'Planejado', icon: '○' }, running: { label: 'Em andamento', icon: '▶' },
        completed: { label: 'Concluído', icon: '✓' }, missed: { label: 'Não realizado', icon: '×' }
    };
    let visibleWeek = Core.monday(new Date());
    let selectedDay = Math.min(6, Math.max(1, new Date().getDay() || 1));
    let draggedBlockId = null;

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
                consecutive: Boolean(item.schedule?.consecutive)
            };
        });
        Object.values(appData.studySchedule.weeks).forEach(value => {
            if (!value || typeof value !== 'object') return;
            if (!Array.isArray(value.blocks)) value.blocks = [];
            if (!value.dailyClosures || typeof value.dailyClosures !== 'object') value.dailyClosures = {};
            if (!Array.isArray(value.warnings)) value.warnings = [];
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
    const getDayBlocks = (day, key = visibleWeek) => [...(week(false, key)?.blocks || [])]
        .filter(block => Number(block.day) === Number(day))
        .sort((a, b) => (a.order ?? 999) - (b.order ?? 999) || Core.toMinutes(a.start) - Core.toMinutes(b.start));

    function formatRange(key) {
        const start = Core.fromIso(key), end = Core.fromIso(Core.addDays(key, 5));
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
        if (!list.length) return settings().startTime;
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

    function renderSummary() {
        const data = allMetrics();
        const targetMinutes = settings().studyDays.length * settings().dailyCapacityMinutes;
        const loadPercent = targetMinutes ? Math.round(data.plannedMinutes / targetMinutes * 100) : 0;
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
        byId('scheduleLoadHeadline').textContent = !data.blocks.length ? `Você dispõe de ${minutesText(targetMinutes)} nesta semana`
            : gap > settings().blockMinutes ? `Ainda cabem ${minutesText(gap)} no seu plano`
                : gap < -settings().blockMinutes ? `Sua semana excede a disponibilidade em ${minutesText(Math.abs(gap))}`
                    : 'Carga planejada compatível com seu tempo';
        byId('scheduleLoadHint').textContent = !data.blocks.length ? `${settings().studyDays.length} dias × ${minutesText(settings().dailyCapacityMinutes)} por dia. Distribua somente o que é possível cumprir.`
            : loadPercent > 110 ? 'Reduza ou mova blocos para evitar uma semana impossível.'
                : loadPercent < 70 ? 'Há espaço disponível. Acrescente apenas conteúdos prioritários.'
                    : 'A carga está em uma faixa sustentável para a disponibilidade informada.';
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
            const classes = [active ? 'active' : '', isToday(visibleWeek, day) ? 'today' : '', activeDays.has(day) ? '' : 'rest-day'].filter(Boolean).join(' ');
            return `<button type="button" role="tab" aria-selected="${active}" class="${classes}" style="--day-progress:${data.percent * 3.6}deg" onclick="KingSchedule.selectDay(${day})" ondragover="KingSchedule.dragOverDay(event)" ondragleave="KingSchedule.dragLeaveDay(event)" ondrop="KingSchedule.dropToDay(event,${day})"><span><b>${DAY_SHORT[day]}</b><small>${date.getDate()}</small></span><i><em>${data.done}/${data.blocks.length}</em></i></button>`;
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
                if (!block) return `<button type="button" class="schedule-matrix-cell empty" onclick="KingSchedule.openBlock(null,${day})" aria-label="Adicionar bloco em ${DAY_NAMES[day]}"><span>＋</span></button>`;
                const mat = subject(block.subjectId), kind = KINDS[block.kind] || KINDS.teoria, state = STATUS[block.status] || STATUS.pending;
                return `<button type="button" class="schedule-matrix-cell status-${block.status}" style="--block-color:${safeColor(mat?.color)}" onclick="KingSchedule.openBlock('${safeId(block.id)}')"><span class="schedule-matrix-icon">${escape(mat?.schedule?.icon || kind.icon)}</span><span><strong>${escape(mat?.subject || 'Matéria removida')}</strong><small>${escape(block.topic || kind.label)}</small></span><i title="${escape(state.label)}">${state.icon}</i></button>`;
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
        return `<div class="schedule-timeline-row"><div class="schedule-time-rail"><strong>${escape(block.start)}</strong><span></span><small>${escape(end)}</small></div><article class="schedule-focus-block status-${block.status}" draggable="true" data-block-id="${id}" style="--block-color:${color}" ondragstart="KingSchedule.dragStart(event,'${id}')" ondragend="KingSchedule.dragEnd(event)"><header><span class="schedule-focus-icon">${escape(mat?.schedule?.icon || kind.icon)}</span><div><span>${escape(kind.label)}</span><strong>${escape(mat?.subject || 'Matéria removida')}</strong></div><em class="schedule-status-chip">${state.icon} ${state.label}</em></header><h3>${escape(block.topic || `Bloco de ${kind.label.toLocaleLowerCase('pt-BR')}`)}</h3>${block.result?.notes ? `<p class="schedule-result-note">${escape(block.result.notes)}</p>` : ''}<footer><span>${block.duration} min${block.result?.questions ? ` · ${block.result.questions} questões` : ''}</span><div>${action}<button type="button" class="schedule-more-button" onclick="KingSchedule.openBlock('${id}')" aria-label="Editar bloco">•••</button></div></footer></article></div>`;
    }
    function pauseHtml(minutes) {
        return `<div class="schedule-timeline-pause"><span></span><div><b>☕</b><strong>Pausa</strong><small>${minutes} minutos para recuperar o foco</small></div></div>`;
    }
    function renderTimeline() {
        const blocks = getDayBlocks(selectedDay), container = byId('scheduleTimeline');
        byId('scheduleSelectedDayEyebrow').textContent = isToday(visibleWeek, selectedDay) ? 'HOJE' : visibleWeek === currentWeekKey() ? 'NESTA SEMANA' : 'DIA PLANEJADO';
        byId('scheduleSelectedDayTitle').textContent = formatDayTitle(selectedDay);
        const completed = blocks.filter(block => block.status === 'completed').length;
        byId('scheduleSelectedDaySummary').textContent = blocks.length
            ? `${blocks.length} ${blocks.length === 1 ? 'bloco planejado' : 'blocos planejados'} · ${completed} concluído${completed === 1 ? '' : 's'}`
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
        if (!overloaded.length) { notice.hidden = true; return; }
        notice.hidden = false;
        notice.innerHTML = `<span aria-hidden="true">!</span><p><strong>A semana ficou concentrada demais.</strong> ${overloaded.map(day => DAY_NAMES[day]).join(', ')} ${overloaded.length === 1 ? 'tem' : 'têm'} mais matérias que o limite desejado. Você pode mover os blocos arrastando-os para outro dia.</p>`;
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
        byId('scheduleWeekRange').textContent = formatRange(visibleWeek);
        byId('scheduleWeekEyebrow').textContent = visibleWeek === currentWeekKey() ? 'SEMANA ATUAL' : visibleWeek < currentWeekKey() ? 'SEMANA ANTERIOR' : 'PRÓXIMA SEMANA';
        renderSummary(); renderNext(); renderBalance(); renderWeekMatrix(); renderDayStrip(); renderTimeline(); renderDayPanel(); renderNotice(); renderReplanButton(); performanceSuggestion();
        if (typeof atualizarResumoRevisoesCronograma === 'function') atualizarResumoRevisoesCronograma();
    }

    function organizeCurrentWeek() {
        ensureData();
        const configured = appData.cycleItems.filter(item => Number(item.schedule?.weeklyBlocks) > 0);
        if (!configured.length) { toast('Defina a carga semanal das suas matérias primeiro.', true); return openSettings(); }
        const current = week(false);
        const existingPending = current?.blocks?.some(block => block.status !== 'completed');
        if (existingPending && !confirm('Os blocos ainda não concluídos desta semana serão reorganizados. Continuar?')) return;
        const generated = Core.organize(appData.cycleItems, settings(), visibleWeek);
        const completed = (current?.blocks || []).filter(block => block.status === 'completed');
        const remaining = [...generated.blocks];
        completed.forEach(done => {
            const index = remaining.findIndex(block => String(block.subjectId) === String(done.subjectId));
            if (index >= 0) remaining.splice(index, 1);
        });
        generated.blocks = [...completed, ...remaining];
        generated.dailyClosures = { ...(current?.dailyClosures || {}) };
        appData.studySchedule.weeks[visibleWeek] = generated;
        DAYS.forEach(day => recomputeDay(day));
        saveAppData(); render(); toast(completed.length ? 'Semana reorganizada sem apagar o que já foi concluído.' : '✓ Semana organizada pelas suas escolhas.');
    }
    function changeWeek(direction) { visibleWeek = Core.addDays(visibleWeek, Number(direction) * 7); selectedDay = settings().studyDays[0] || 1; render(); }
    function goCurrentWeek() { visibleWeek = currentWeekKey(); selectedDay = Math.min(6, Math.max(1, new Date().getDay() || 1)); render(); }
    function selectDay(day) { selectedDay = DAYS.includes(Number(day)) ? Number(day) : 1; renderWeekMatrix(); renderDayStrip(); renderTimeline(); renderDayPanel(); }
    function copyToNextWeek() {
        const source = week(false);
        if (!source?.blocks?.length) return toast('Monte esta semana antes de copiá-la.', true);
        const next = Core.addDays(visibleWeek, 7);
        if (week(false, next)?.blocks?.length && !confirm('A semana seguinte já possui blocos. Deseja substituí-los?')) return;
        appData.studySchedule.weeks[next] = Core.copyWeek(source, next);
        saveAppData(); visibleWeek = next; selectedDay = settings().studyDays[0] || 1; render(); toast('✓ Estrutura copiada; o progresso começou zerado.');
    }
    function replanOverdue() {
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

    function openSettings() {
        ensureData();
        const value = settings();
        const submit = byId('scheduleSettingsForm')?.querySelector('button[type="submit"]');
        if (submit) submit.textContent = 'Salvar planejamento';
        byId('scheduleStartTime').value = value.startTime;
        setSelectValue(byId('scheduleDailyCapacity'), value.dailyCapacityMinutes);
        byId('scheduleBlockMinutes').value = String(value.blockMinutes);
        byId('schedulePauseMinutes').value = String(value.pauseMinutes);
        byId('scheduleClosingMinutes').value = String(value.closingMinutes);
        byId('scheduleMaxSubjects').value = String(value.maxSubjectsPerDay);
        document.querySelectorAll('#scheduleSettingsModal .schedule-day-options input').forEach(input => input.checked = value.studyDays.includes(Number(input.value)));
        byId('scheduleSubjectPlans').innerHTML = appData.cycleItems.length ? appData.cycleItems.map(item => `<article class="schedule-subject-plan" data-subject-id="${safeId(item.id)}" style="--subject-color:${safeColor(item.color)}"><span class="schedule-plan-icon">${escape(item.schedule.icon)}</span><div class="schedule-plan-name"><strong>${escape(item.subject)}</strong><small>${escape(item.type || 'Estudo')}</small></div><label><span>Blocos/semana</span><input type="number" class="cycle-input" data-plan="blocks" min="0" max="30" value="${item.schedule.weeklyBlocks}"></label><label><span>Prioridade</span><select class="cycle-input" data-plan="priority"><option value="1" ${item.schedule.priority === 1 ? 'selected' : ''}>Baixa</option><option value="2" ${item.schedule.priority === 2 ? 'selected' : ''}>Normal</option><option value="3" ${item.schedule.priority === 3 ? 'selected' : ''}>Alta</option></select></label><label class="schedule-plan-consecutive"><input type="checkbox" data-plan="consecutive" ${item.schedule.consecutive ? 'checked' : ''}><span><b>Blocos juntos</b><small>Forma pares</small></span></label></article>`).join('') : '<div class="schedule-settings-empty"><strong>Nenhuma matéria ainda</strong><p>Crie matérias no Hub para montar sua carga semanal.</p></div>';
        byId('scheduleSettingsModal').classList.add('active');
    }
    function saveSettings(event) {
        event.preventDefault();
        const days = [...document.querySelectorAll('#scheduleSettingsModal .schedule-day-options input:checked')].map(input => Number(input.value));
        if (!days.length) return toast('Escolha pelo menos um dia disponível.', true);
        appData.studySchedule.settings = Core.normalizeSettings({
            startTime: byId('scheduleStartTime').value, studyDays: days, dailyCapacityMinutes: byId('scheduleDailyCapacity').value, blockMinutes: byId('scheduleBlockMinutes').value,
            pauseMinutes: byId('schedulePauseMinutes').value, closingMinutes: byId('scheduleClosingMinutes').value, maxSubjectsPerDay: byId('scheduleMaxSubjects').value
        });
        document.querySelectorAll('#scheduleSubjectPlans .schedule-subject-plan').forEach(card => {
            const item = subject(card.dataset.subjectId); if (!item) return;
            item.schedule.weeklyBlocks = Math.min(30, Math.max(0, Number(card.querySelector('[data-plan="blocks"]').value) || 0));
            item.schedule.priority = Math.min(3, Math.max(1, Number(card.querySelector('[data-plan="priority"]').value) || 2));
            item.schedule.consecutive = card.querySelector('[data-plan="consecutive"]').checked;
        });
        saveAppData(); fecharModal('scheduleSettingsModal'); render(); renderizarCiclo(); toast('Planejamento salvo. Use “Organizar automaticamente” quando quiser distribuir os blocos.');
    }

    function fillBlockSelects(selectedSubject, day) {
        byId('scheduleBlockSubject').innerHTML = appData.cycleItems.map(item => `<option value="${safeId(item.id)}">${escape(item.schedule?.icon || '●')} ${escape(item.subject)}</option>`).join('');
        if (selectedSubject != null) byId('scheduleBlockSubject').value = String(selectedSubject);
        byId('scheduleBlockDay').innerHTML = DAYS.map(value => `<option value="${value}">${DAY_NAMES[value]}</option>`).join('');
        byId('scheduleBlockDay').value = String(day);
    }
    function setSelectValue(select, value) {
        if (![...select.options].some(option => String(option.value) === String(value))) select.add(new Option(`${value} min`, String(value)));
        select.value = String(value);
    }
    function openBlock(id = null, requestedDay = null) {
        ensureData();
        if (!appData.cycleItems.length) { toast('Adicione uma matéria antes de criar o bloco.', true); showSection('planejamento'); return abrirModalCiclo(); }
        const block = id != null ? findBlock(id) : null;
        const day = Number(block?.day || requestedDay || selectedDay || settings().studyDays[0]);
        byId('scheduleBlockForm').reset();
        byId('scheduleBlockModalTitle').textContent = block ? 'Editar bloco' : 'Planejar estudo';
        byId('scheduleBlockId').value = block?.id || '';
        byId('scheduleBlockWeek').value = visibleWeek;
        fillBlockSelects(block?.subjectId, day);
        byId('scheduleBlockKind').value = block?.kind || 'teoria';
        byId('scheduleBlockTopic').value = block?.topic || '';
        byId('scheduleBlockStart').value = block?.start || nextStart(day);
        setSelectValue(byId('scheduleBlockDuration'), block?.duration || settings().blockMinutes);
        byId('scheduleBlockStatus').value = block?.status || 'pending';
        byId('scheduleDeleteBlock').hidden = !block;
        byId('scheduleBlockModal').classList.add('active');
    }
    function saveBlock(event) {
        event.preventDefault();
        const key = byId('scheduleBlockWeek').value || visibleWeek, target = week(true, key), rawId = byId('scheduleBlockId').value;
        const day = Number(byId('scheduleBlockDay').value), existing = rawId ? target.blocks.find(item => String(item.id) === String(rawId)) : null;
        const statusValue = byId('scheduleBlockStatus').value;
        const values = {
            subjectId: byId('scheduleBlockSubject').value, kind: KINDS[byId('scheduleBlockKind').value] ? byId('scheduleBlockKind').value : 'teoria',
            topic: byId('scheduleBlockTopic').value.trim().slice(0, 120), day, start: byId('scheduleBlockStart').value,
            duration: Math.min(240, Math.max(5, Number(byId('scheduleBlockDuration').value) || settings().blockMinutes)),
            status: statusValue === 'completed' && !existing?.registered ? 'pending' : statusValue, fixedStart: true
        };
        const oldDay = existing?.day;
        if (existing) Object.assign(existing, values);
        else target.blocks.push({ id: `bloco-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, order: getDayBlocks(day, key).length, registered: false, ...values });
        if (oldDay && Number(oldDay) !== day) recomputeDay(oldDay, key);
        target.blocks.filter(item => Number(item.day) === day).sort((a, b) => Core.toMinutes(a.start) - Core.toMinutes(b.start)).forEach((item, index) => item.order = index);
        recomputeDay(day, key);
        saveAppData(); fecharModal('scheduleBlockModal'); selectedDay = day; render(); toast('✓ Bloco salvo na semana.');
    }
    function deleteEditingBlock() {
        const id = byId('scheduleBlockId').value, key = byId('scheduleBlockWeek').value || visibleWeek, target = week(false, key);
        const block = target?.blocks.find(item => String(item.id) === String(id)); if (!block) return;
        if (block.registered && !confirm('O histórico do estudo será mantido. Retirar somente o bloco do cronograma?')) return;
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
        appData.pendingStudySession = { id: `sessao-${createdAt}-${Math.random().toString(36).slice(2, 8)}`, seconds: block.duration * 60, subjectId: String(mat.id), origem: 'cronograma-manual', createdAt, scheduleWeekKey: visibleWeek, scheduleBlockId: block.id, scheduleCreditNeeded: true };
        saveAppData(); renderizarAvisoSessaoPendente(); abrirRegistroSessaoPendente();
        if (block.topic) byId('sessionTopic').value = block.topic;
        const desiredKind = block.kind === 'simulado' ? 'simulado' : block.kind === 'redacao' ? 'redacao' : 'estudo';
        const radio = document.querySelector(`input[name="sessionKind"][value="${desiredKind}"]`); if (radio) { radio.checked = true; atualizarTipoRegistroSessao(); }
    }
    function completeFromSession(pending, details) {
        if (!pending?.scheduleBlockId) return;
        const block = findBlock(pending.scheduleBlockId, pending.scheduleWeekKey); if (!block) return;
        const generic = details?.atividade === 'estudo' ? details.study || {} : details?.simulado || {};
        const seconds = Number(pending.seconds) || block.duration * 60;
        block.status = 'completed'; block.registered = true;
        block.result = { topic: details?.assunto || block.topic || '', questions: Number(generic.total ?? generic.questoes) || 0, hits: Number(generic.acertos) || 0, errors: Number(generic.erros) || 0, notes: details?.comentario || '', activity: details?.atividade || 'estudo', actualMinutes: Math.max(1, Math.round(seconds / 60)), completedAt: Date.now() };
        if (pending.scheduleCreditNeeded) {
            appData.totalStudySeconds = Number(appData.totalStudySeconds || 0) + seconds;
            if (pending.scheduleWeekKey === currentWeekKey()) appData.weeklyChart[Number(block.day) - 1] = Number(appData.weeklyChart[Number(block.day) - 1] || 0) + seconds;
        }
        if (String(appData.activeScheduleBlock?.blockId) === String(block.id)) appData.activeScheduleBlock = null;
        setTimeout(() => { render(); toast('Bloco concluído. O fechamento do dia ficou disponível quando você quiser.'); }, 80);
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
    function dragEnd(event) { event.currentTarget.classList.remove('dragging'); draggedBlockId = null; document.querySelectorAll('.schedule-day-strip button.drag-over').forEach(item => item.classList.remove('drag-over')); }
    function dragOverDay(event) { event.preventDefault(); event.currentTarget.classList.add('drag-over'); event.dataTransfer.dropEffect = 'move'; }
    function dragLeaveDay(event) { if (!event.currentTarget.contains(event.relatedTarget)) event.currentTarget.classList.remove('drag-over'); }
    function dropToDay(event, day) {
        event.preventDefault(); event.currentTarget.classList.remove('drag-over');
        const id = draggedBlockId || event.dataTransfer.getData('text/plain'), block = findBlock(id); if (!block) return;
        const oldDay = Number(block.day); block.day = Number(day); block.fixedStart = false; block.order = getDayBlocks(day).length;
        recomputeDay(oldDay); recomputeDay(Number(day)); saveAppData(); selectedDay = Number(day); render(); toast(`Bloco movido para ${DAY_NAMES[day]}.`);
    }

    function applySuggestion(id) { const item = subject(id); if (!item) return; item.schedule.priority = 3; appData.studySchedule.suggestions.push({ subjectId: item.id, status: 'applied', at: Date.now() }); saveAppData(); render(); toast(`${item.subject} ganhou prioridade alta para a próxima organização.`); }
    function ignoreSuggestion(id) { appData.studySchedule.suggestions.push({ subjectId: id, status: 'ignored', at: Date.now() }); saveAppData(); render(); }
    function removeSubject(id) { ensureData(); Object.values(appData.studySchedule.weeks).forEach(item => item.blocks = (item.blocks || []).filter(block => String(block.subjectId) !== String(id))); }
    function clearSubjects() { ensureData(); Object.values(appData.studySchedule.weeks).forEach(item => item.blocks = []); }

    window.KingSchedule = {
        render, organizeCurrentWeek, changeWeek, goCurrentWeek, selectDay, copyToNextWeek, replanOverdue,
        openSettings, saveSettings, openBlock, saveBlock, deleteEditingBlock, setStatus, startBlock, openComplete,
        completeFromSession, openDayClose, closeDayLater, saveDayClose, dragStart, dragEnd, dragOverDay, dragLeaveDay,
        dropToDay, applySuggestion, ignoreSuggestion, removeSubject, clearSubjects,
        getVisibleWeek: () => visibleWeek, getSelectedDay: () => selectedDay
    };
    ensureData();
    if (byId('cronograma')?.classList.contains('active')) render();
})();
