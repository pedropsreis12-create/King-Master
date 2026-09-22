/* Plano ENEM pessoal: transforma dados existentes em próxima ação, diagnóstico e disciplina. */
(() => {
    const AREAS = {
        matematica: 'Matemática', natureza: 'Ciências da Natureza',
        linguagens: 'Linguagens', humanas: 'Ciências Humanas'
    };
    const CAUSES = { conteudo: 'conteúdo', interpretacao: 'interpretação', calculo: 'cálculo', atencao: 'atenção', tempo: 'tempo e estratégia' };
    const WRITING_STEPS = [
        ['Diagnóstico', 'Escreva sem preparação para descobrir o ponto de partida.'],
        ['Tema e tese', 'Aprenda a recortar o problema e defender uma posição.'],
        ['Repertório', 'Use referências que realmente sustentem o argumento.'],
        ['Introdução', 'Contextualize, apresente a tese e antecipe os eixos.'],
        ['Desenvolvimento', 'Construa causa, consequência e análise.'],
        ['Intervenção', 'Detalhe agente, ação, meio, finalidade e efeito.'],
        ['Redação semanal', 'Una as partes em um texto completo e corrigível.']
    ];
    const DISCIPLINE_ITEMS = [
        ['started', 'Comecei sem negociar', 'Iniciei o estudo perto das 14h.'],
        ['phone', 'Celular fora do alcance', 'Não ficou ao lado durante o bloco.'],
        ['minimum', 'Cumpri a meta do dia', '4h completas ou 2h no dia difícil.'],
        ['closed', 'Fechei o ciclo', 'Corrigi, registrei e deixei amanhã claro.']
    ];
    const ICONS = {
        dashboard: '<path d="M4 11.5 12 5l8 6.5"/><path d="M6.5 10.5V20h11v-9.5"/><path d="M10 20v-5h4v5"/>',
        agendamento: '<rect x="4" y="5.5" width="16" height="14" rx="3"/><path d="M8 3.5v4M16 3.5v4M4 10h16"/><path d="M8 14h3M8 17h6"/>',
        cronograma: '<rect x="3.5" y="4" width="17" height="16" rx="3"/><path d="M8 2.5V6M16 2.5V6M3.5 9h17M8 13h2M14 13h2M8 16.5h2M14 16.5h2"/>',
        'plano-enem': '<circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="3.5"/><path d="m14.5 9.5 4-4M17 5.5h1.5V7"/>',
        planejamento: '<path d="M5 4.5h11a3 3 0 0 1 3 3V20H8a3 3 0 0 1-3-3z"/><path d="M8 4.5V17a3 3 0 0 0 3 3M11 9h5M11 12.5h5"/>',
        revisoes: '<path d="M20 7v5h-5"/><path d="M18.2 16a8 8 0 1 1 .7-8.2L20 12"/><path d="M12 8v4l2.5 1.5"/>',
        'caderno-erros': '<path d="M5 3.5h11.5A2.5 2.5 0 0 1 19 6v14H7.5A2.5 2.5 0 0 1 5 17.5z"/><path d="M9 8h6M9 11.5h4M9 15l1.5 1.5L15 12"/>',
        simulados: '<circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="4.5"/><path d="M12 8.5V12l2.5 1.5"/>',
        redacao: '<path d="m4 17-.5 3.5L7 20l11-11-3-3z"/><path d="m13.5 7.5 3 3M4 14V4h8"/>',
        historico: '<path d="M4.5 7.5H9V3"/><path d="M5.2 7A8.5 8.5 0 1 1 3.5 12"/><path d="M12 7.5V12l3 2"/>',
        perfil: '<circle cx="12" cy="8" r="3.5"/><path d="M5.5 20a6.5 6.5 0 0 1 13 0"/>'
    };

    const byId = id => document.getElementById(id);
    const plan = () => appData.enemPlan;
    const today = () => typeof dataLocalISO === 'function' ? dataLocalISO() : new Date().toISOString().slice(0, 10);
    const esc = value => typeof escaparRevisaoHtml === 'function' ? escaparRevisaoHtml(String(value ?? '')) : String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
    const formatMinutes = minutes => {
        const value = Math.max(0, Math.round(Number(minutes) || 0));
        const hours = Math.floor(value / 60), rest = value % 60;
        return hours ? `${hours}h${rest ? ` ${rest}m` : ''}` : `${rest}m`;
    };
    const todayMinutes = () => Math.round((appData.historyItems || []).filter(item => dataHistoricoISO(item) === today()).reduce((sum, item) => sum + Number(item.tempoSegundos || 0), 0) / 60);
    const currentWeek = () => window.KingScheduleCore?.monday?.(new Date()) || '';
    const todaysBlocks = () => {
        const weekday = new Date().getDay();
        return (appData.studySchedule?.weeks?.[currentWeek()]?.blocks || []).filter(block => Number(block.day) === weekday).sort((a, b) => String(a.start).localeCompare(String(b.start)));
    };
    const isSurvival = () => plan().discipline.survivalDates.includes(today());

    function ensureData() {
        if (!appData.enemPlan) return;
        if (!Array.isArray(plan().diagnosticAttempts)) plan().diagnosticAttempts = [];
        if (!plan().discipline.checkins || typeof plan().discipline.checkins !== 'object') plan().discipline.checkins = {};
        if (!Array.isArray(plan().discipline.survivalDates)) plan().discipline.survivalDates = [];
        if (!plan().discipline.checkins[today()]) plan().discipline.checkins[today()] = {};
    }

    function applyNavigationIcons() {
        document.querySelectorAll('.menu-btn[data-section]').forEach(button => {
            const icon = button.querySelector('.nav-item-icon');
            const drawing = ICONS[button.dataset.section];
            if (icon && drawing) icon.innerHTML = `<svg viewBox="0 0 24 24" focusable="false">${drawing}</svg>`;
        });
        document.querySelectorAll('.dock-btn[data-section]').forEach(button => {
            const old = button.querySelector(':scope > span');
            const drawing = ICONS[button.dataset.section];
            if (old && drawing) old.outerHTML = `<svg viewBox="0 0 24 24" aria-hidden="true">${drawing}</svg>`;
        });
    }

    function nextAction() {
        if (appData.pendingStudySession) return { type: 'pending', title: 'Registre a sessão que já está protegida', hint: 'Seu tempo não foi perdido. Falta apenas transformar o estudo em histórico útil.', label: 'Registrar sessão' };
        if (typeof isRunning !== 'undefined' && isRunning) return { type: 'timer', title: 'Continue o bloco em andamento', hint: 'Não abra outra tarefa agora. Termine o que já começou.', label: 'Voltar ao cronômetro' };
        const reviews = (appData.revisoesItems || []).filter(item => item.status !== 'revisado' && (!item.dataAlvo || item.dataAlvo <= today()));
        if (reviews.length) return { type: 'reviews', title: `${reviews.length} ${reviews.length === 1 ? 'revisão está' : 'revisões estão'} esperando`, hint: `Fila estimada em ${reviews.length * 5} minutos. Ela fica separada dos blocos normais.`, label: 'Abrir revisões' };
        if (!plan().diagnosticAttempts.length) return { type: 'diagnostic', title: 'Comece pelo diagnóstico, não por suposições', hint: 'Registre a primeira área de uma prova anterior para o plano aprender suas prioridades.', label: 'Iniciar diagnóstico' };
        const block = todaysBlocks().find(item => ['pending', 'running'].includes(item.status));
        if (block) {
            const subject = (appData.cycleItems || []).find(item => String(item.id) === String(block.subjectId));
            return { type: 'block', id: block.id, title: `${subject?.subject || 'Próximo bloco'}${block.topic ? ` · ${block.topic}` : ''}`, hint: `${block.start || '14:00'} · ${block.duration || 100} minutos. Comece pelo objetivo e termine com questões.`, label: 'Preparar bloco' };
        }
        const preferred = ['Sociologia', 'Filosofia', 'História'].map(name => (appData.cycleItems || []).find(item => String(item.subject).toLocaleLowerCase('pt-BR').includes(name.toLocaleLowerCase('pt-BR')))).find(Boolean) || appData.cycleItems?.[0];
        if (preferred) return { type: 'subject', subjectId: preferred.id, title: `Transforme ${preferred.subject} em ação concreta`, hint: 'Faça um bloco de 1h40 e encerre com 15–20 questões do assunto.', label: 'Preparar 1h40' };
        return { type: 'subjects', title: 'Cadastre a primeira matéria do seu plano', hint: 'O King Master precisa das suas matérias reais para criar prioridades úteis.', label: 'Adicionar matéria' };
    }

    function renderToday() {
        if (!byId('todayCommandCenter')) return;
        const action = nextAction(), minutes = todayMinutes();
        const goal = isSurvival() ? Number(plan().routine.minimumGoalMinutes) : Number(plan().routine.fullGoalMinutes);
        const pct = Math.min(100, Math.round(minutes / Math.max(1, goal) * 100));
        byId('todayCommandDate').textContent = new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' }).toLocaleUpperCase('pt-BR');
        byId('todayModeBadge').textContent = isSurvival() ? 'DIA DIFÍCIL · META 2H' : 'META COMPLETA · 4H';
        byId('todayCommandTitle').textContent = action.title;
        byId('todayCommandHint').textContent = action.hint;
        byId('todayPrimaryAction').firstChild.textContent = `${action.label} `;
        byId('todaySurvivalAction').textContent = isSurvival() ? 'Voltar à meta completa' : 'Ativar dia difícil';
        byId('todaySurvivalAction').setAttribute('aria-pressed', String(isSurvival()));
        byId('todayStudiedTime').textContent = formatMinutes(minutes);
        byId('todayGoalTime').textContent = formatMinutes(goal);
        byId('todayGoalProgress').style.width = `${pct}%`;
        document.querySelectorAll('[data-routine-step]').forEach((item, index) => item.classList.toggle('done', minutes >= [100, 200, goal][index]));
    }

    function runNextAction() {
        const action = nextAction();
        if (action.type === 'pending') return abrirRegistroSessaoPendente();
        if (action.type === 'timer') return showSection('dashboard');
        if (action.type === 'reviews') return showSection('revisoes');
        if (action.type === 'diagnostic') return openDiagnostic();
        if (action.type === 'block') return window.KingSchedule?.startBlock?.(action.id);
        if (action.type === 'subjects') { showSection('planejamento'); return abrirModalCiclo(); }
        const subject = (appData.cycleItems || []).find(item => String(item.id) === String(action.subjectId));
        if (!subject) return;
        byId('activeSubjectSelect').value = String(subject.id);
        byId('inputHours').value = 1; byId('inputMinutes').value = 40; byId('inputSeconds').value = 0;
        setMode('estudo'); atualizarSeletorDeMaterias(); sincronizarTempo(); showSection('dashboard');
        showToast(`${subject.subject}: bloco de 1h40 preparado.`);
    }

    function toggleSurvivalMode() {
        ensureData();
        const date = today(), list = plan().discipline.survivalDates;
        const index = list.indexOf(date);
        if (index >= 0) list.splice(index, 1); else list.push(date);
        saveAppData(); render();
        showToast(index >= 0 ? 'Meta completa restaurada para hoje.' : 'Dia difícil ativado: cumpra 2 horas e preserve sua constância.');
    }

    function diagnosticByArea() {
        return Object.keys(AREAS).reduce((result, area) => {
            const attempts = plan().diagnosticAttempts.filter(item => item.area === area);
            if (!attempts.length) { result[area] = null; return result; }
            const latest = attempts.sort((a, b) => Number(b.createdAt) - Number(a.createdAt))[0];
            result[area] = { ...latest, score: Math.round((latest.hits - latest.guesses) / Math.max(1, latest.total) * 100) };
            return result;
        }, {});
    }

    function renderDiagnostic() {
        if (!byId('diagnosticAreaList')) return;
        const areas = diagnosticByArea(), completed = Object.values(areas).filter(Boolean).length;
        byId('diagnosticStatus').textContent = completed === 4 ? 'Diagnóstico completo' : `${completed}/4 áreas registradas`;
        byId('diagnosticStatus').classList.toggle('complete', completed === 4);
        byId('diagnosticAreaList').innerHTML = Object.entries(AREAS).map(([key, label]) => {
            const item = areas[key], score = item?.score || 0;
            return `<article style="--area-score:${score}%"><span>${esc(label)}<b>${item ? `${score}%` : '—'}</b></span><i></i><small>${item ? `${item.hits}/${item.total} acertos · ${Math.round(item.minutes / item.total * 60)}s/questão` : 'Etapa ainda não realizada'}</small></article>`;
        }).join('');
        const attempts = plan().diagnosticAttempts;
        if (!attempts.length) byId('diagnosticSummary').textContent = 'Comece por uma área. Não é necessário fazer o ENEM inteiro de uma vez.';
        else {
            const worst = Object.entries(areas).filter(([, item]) => item).sort((a, b) => a[1].score - b[1].score)[0];
            const common = Object.entries(attempts.reduce((map, item) => ({ ...map, [item.cause]: (map[item.cause] || 0) + 1 }), {})).sort((a, b) => b[1] - a[1])[0]?.[0];
            byId('diagnosticSummary').textContent = `Prioridade atual: ${AREAS[worst?.[0]] || 'continuar o diagnóstico'}. Padrão principal registrado: ${CAUSES[common] || 'ainda sem padrão'}.`;
        }
    }

    function openDiagnostic() {
        byId('diagnosticForm')?.reset();
        byId('diagnosticDate').value = today();
        byId('diagnosticTotal').value = 45; byId('diagnosticTime').value = 90;
        updateDiagnosticPreview(); byId('diagnosticModal').classList.add('active');
    }
    function updateDiagnosticPreview() {
        const total = Math.max(1, Number(byId('diagnosticTotal')?.value) || 0), hits = Math.max(0, Number(byId('diagnosticHits')?.value) || 0);
        if (byId('diagnosticHits')) byId('diagnosticHits').max = String(total);
        if (byId('diagnosticBlanks')) byId('diagnosticBlanks').max = String(total);
        const pct = Math.min(100, Math.round(hits / total * 100));
        if (byId('diagnosticPreview')) byId('diagnosticPreview').innerHTML = `<strong>${pct}%</strong><span>de acertos registrados</span>`;
    }
    function saveDiagnostic(event) {
        event.preventDefault();
        const total = Number(byId('diagnosticTotal').value), hits = Number(byId('diagnosticHits').value), blanks = Number(byId('diagnosticBlanks').value || 0), guesses = Number(byId('diagnosticGuess').value || 0);
        if (hits + blanks > total || guesses > hits) return showToast('Confira acertos, chutes e questões em branco.', true);
        plan().diagnosticAttempts.push({ id: `diag-${Date.now()}`, area: byId('diagnosticArea').value, date: byId('diagnosticDate').value, total, hits, blanks, guesses, errors: Math.max(0, total - hits - blanks), minutes: Number(byId('diagnosticTime').value), cause: byId('diagnosticCause').value, createdAt: Date.now() });
        saveAppData(); fecharModal('diagnosticModal'); render(); showToast('✓ Etapa do diagnóstico salva. O plano já pode usar esse resultado.');
    }

    function renderDiscipline() {
        if (!byId('disciplineChecklist')) return;
        ensureData();
        const checkin = plan().discipline.checkins[today()];
        const goal = isSurvival() ? plan().routine.minimumGoalMinutes : plan().routine.fullGoalMinutes;
        checkin.minimum = todayMinutes() >= goal;
        const completed = DISCIPLINE_ITEMS.filter(([key]) => checkin[key]).length;
        byId('disciplineScore').textContent = `${completed}/4`;
        byId('disciplineCoachMessage').textContent = completed === 4 ? 'Dia fechado. Não invente uma nova obrigação: preserve energia para amanhã.' : completed >= 2 ? 'Você já saiu da inércia. Termine o ciclo sem trocar execução por planejamento.' : 'Não espere vontade. Escolha uma ação pequena e comece por dez minutos.';
        byId('disciplineChecklist').innerHTML = DISCIPLINE_ITEMS.map(([key, title, hint]) => `<label class="discipline-check"><input type="checkbox" ${checkin[key] ? 'checked' : ''} ${key === 'minimum' ? 'disabled' : ''} onchange="KingEnemCoach.toggleDiscipline('${key}',this.checked)"><b>✓</b><span><strong>${esc(title)}</strong><small>${esc(hint)}</small></span></label>`).join('');
        const lastSeven = Array.from({ length: 7 }, (_, index) => { const date = new Date(); date.setDate(date.getDate() - (6 - index)); return dataLocalISO(date); });
        const solid = lastSeven.filter(date => Object.values(plan().discipline.checkins[date] || {}).filter(Boolean).length >= 3).length;
        byId('disciplineStreak').innerHTML = `${lastSeven.map(date => `<span class="${Object.values(plan().discipline.checkins[date] || {}).filter(Boolean).length >= 3 ? 'done' : ''}" title="${date}"></span>`).join('')}<small>${solid}/7 dias sólidos</small>`;
        byId('commitmentText').textContent = plan().discipline.commitment;
    }
    function toggleDiscipline(key, checked) {
        ensureData(); plan().discipline.checkins[today()][key] = Boolean(checked); saveAppData(); renderDiscipline();
    }
    function openCommitmentEditor() { byId('commitmentInput').value = plan().discipline.commitment; byId('commitmentModal').classList.add('active'); }
    function saveCommitment(event) { event.preventDefault(); plan().discipline.commitment = byId('commitmentInput').value.trim().slice(0, 280); saveAppData(); fecharModal('commitmentModal'); render(); showToast('Compromisso atualizado.'); }

    function renderWriting() {
        if (!byId('writingPathSteps')) return;
        const stage = Math.max(0, Math.min(WRITING_STEPS.length - 1, Number(plan().writing.stage) || 0));
        byId('writingPathSteps').innerHTML = WRITING_STEPS.map(([title], index) => `<article class="writing-path-step ${index < stage ? 'done' : ''} ${index === stage ? 'current' : ''}"><b>${index < stage ? '✓' : String(index + 1).padStart(2, '0')}</b><strong>${esc(title)}</strong></article>`).join('');
        byId('writingNextStep').textContent = WRITING_STEPS[stage][0]; byId('writingNextHint').textContent = WRITING_STEPS[stage][1];
        const monday = window.KingScheduleCore?.monday?.(new Date()) || today();
        const count = (appData.redacaoItems || []).filter(item => String(item.date || item.data || '') >= monday && String(item.date || item.data || '') <= today()).length;
        byId('writingWeeklyStatus').textContent = `${Math.min(count, 1)}/1 nesta semana`;
    }
    function advanceWritingPath() {
        const current = Number(plan().writing.stage) || 0;
        if (current >= WRITING_STEPS.length - 1) { showSection('redacao'); return abrirModalRedacao(); }
        plan().writing.stage = current + 1; saveAppData(); renderWriting(); showToast(`Próxima etapa: ${WRITING_STEPS[current + 1][0]}.`);
    }
    function askCoach() { if (typeof usarSugestaoIa === 'function') usarSugestaoIa('Atue como meu treinador firme. Analise meus dados de hoje, diga sem rodeios onde estou falhando e me dê uma única próxima ação concreta.'); }

    function render() { if (!appData?.enemPlan) return; ensureData(); renderToday(); renderDiagnostic(); renderDiscipline(); renderWriting(); }
    window.KingEnemCoach = { render, runNextAction, toggleSurvivalMode, openDiagnostic, updateDiagnosticPreview, saveDiagnostic, toggleDiscipline, openCommitmentEditor, saveCommitment, advanceWritingPath, askCoach };
    applyNavigationIcons(); render();
})();
