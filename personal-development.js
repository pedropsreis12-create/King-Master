/* Desenvolvimento pessoal: disciplina observável, sem gamificar culpa. */
(() => {
    const CHECKS = [
        ['started', 'Comecei sem negociar', 'Iniciei o primeiro bloco perto do horário combinado.'],
        ['phone', 'Protegi meu ambiente', 'Celular longe e apenas o material necessário aberto.'],
        ['minimum', 'Cumpri o mínimo do dia', 'Quatro horas na meta principal ou duas horas no dia difícil.'],
        ['closed', 'Fechei o ciclo', 'Registrei o que fiz e deixei o próximo passo claro.']
    ];
    const byId = id => document.getElementById(id);
    const dateKey = date => typeof dataLocalISO === 'function' ? dataLocalISO(date) : date.toISOString().slice(0, 10);
    const todayKey = () => dateKey(new Date());
    const state = () => appData.personalDevelopment;

    function ensure() {
        if (!appData.personalDevelopment || typeof appData.personalDevelopment !== 'object') appData.personalDevelopment = { commitment: '', checkins: {}, version: 1 };
        if (!appData.personalDevelopment.checkins || typeof appData.personalDevelopment.checkins !== 'object') appData.personalDevelopment.checkins = {};
        if (!appData.personalDevelopment.checkins[todayKey()]) appData.personalDevelopment.checkins[todayKey()] = {};
    }

    function weeklyEntries() {
        const result = [];
        for (let offset = 6; offset >= 0; offset -= 1) {
            const date = new Date(); date.setHours(12, 0, 0, 0); date.setDate(date.getDate() - offset);
            const key = dateKey(date), checks = state().checkins[key] || {};
            result.push({ key, date, total: CHECKS.filter(([id]) => checks[id]).length });
        }
        return result;
    }

    function nextAction() {
        if (appData.pendingStudySession) return ['Registre a sessão protegida', 'Seu tempo já está salvo. Transforme-o em um registro útil antes de começar outra coisa.', 'Registrar agora', 'pending'];
        const today = todayKey();
        const reviews = (appData.revisoesItems || []).filter(item => item.status !== 'revisado' && (!item.dataAlvo || item.dataAlvo <= today));
        if (reviews.length) return [`Resolva ${reviews.length} ${reviews.length === 1 ? 'revisão pendente' : 'revisões pendentes'}`, 'Uma fila curta evita que a preocupação com revisão fique ocupando sua cabeça.', 'Abrir revisões', 'reviews'];
        const checks = state().checkins[today] || {};
        if (!checks.started) return ['Comece antes de se sentir pronto', 'Escolha uma matéria, defina um assunto e inicie o primeiro bloco. Clareza aparece durante a execução.', 'Preparar o foco', 'focus'];
        if (!checks.phone) return ['Retire a distração do ambiente', 'Deixe o celular fora do alcance antes de continuar o bloco.', 'Marcar ambiente protegido', 'phone'];
        return ['Faça o próximo bloco, não o dia inteiro', 'Concentre-se somente no objetivo que cabe na próxima sessão.', 'Voltar ao foco', 'focus'];
    }

    function render() {
        if (!byId('desenvolvimento')) return;
        ensure();
        const checks = state().checkins[todayKey()] || {};
        const done = CHECKS.filter(([id]) => checks[id]).length;
        byId('growthCheckinCount').textContent = `${done}/${CHECKS.length}`;
        byId('growthChecklist').innerHTML = CHECKS.map(([id, title, hint]) => `<button type="button" class="growth-check ${checks[id] ? 'done' : ''}" aria-pressed="${Boolean(checks[id])}" onclick="KingPersonalDevelopment.toggleCheck('${id}')"><span>${checks[id] ? '✓' : '○'}</span><span><strong>${title}</strong><small>${hint}</small></span></button>`).join('');
        const week = weeklyEntries(), total = week.reduce((sum, item) => sum + item.total, 0), score = Math.round(total / (week.length * CHECKS.length) * 100);
        byId('growthScoreValue').textContent = `${score}%`;
        byId('growthScoreBar').style.width = `${score}%`;
        byId('growthWeekDays').innerHTML = week.map(item => `<div class="${item.total === 4 ? 'complete' : item.total ? 'partial' : ''}"><span>${item.date.toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', '').toUpperCase()}</span><b>${item.date.getDate()}</b><i>${item.total}/4</i></div>`).join('');
        byId('growthCommitmentText').textContent = state().commitment || 'Escreva um compromisso que funcione também em um dia ruim.';
        const action = nextAction();
        byId('growthNextTitle').textContent = action[0]; byId('growthNextHint').textContent = action[1]; byId('growthNextButton').textContent = action[2]; byId('growthNextButton').dataset.action = action[3];
    }

    function toggleCheck(id) {
        ensure();
        if (!CHECKS.some(([key]) => key === id)) return;
        const checks = state().checkins[todayKey()];
        checks[id] = !checks[id];
        saveAppData(); render();
    }

    function doNextAction() {
        const action = byId('growthNextButton')?.dataset.action;
        if (action === 'pending' && typeof abrirRegistroSessaoPendente === 'function') return abrirRegistroSessaoPendente();
        if (action === 'reviews') return showSection('revisoes');
        if (action === 'phone') { toggleCheck('phone'); return; }
        showSection('dashboard');
    }

    function openCommitment() {
        ensure(); byId('growthCommitmentInput').value = state().commitment || ''; byId('growthCommitmentModal').classList.add('active'); byId('growthCommitmentInput').focus();
    }
    function saveCommitment(event) {
        event.preventDefault();
        const value = byId('growthCommitmentInput').value.trim().slice(0, 280);
        if (!value) return;
        state().commitment = value; saveAppData(); fecharModal('growthCommitmentModal'); render(); showToast('Compromisso pessoal atualizado.');
    }

    window.KingPersonalDevelopment = { render, toggleCheck, doNextAction, openCommitment, saveCommitment };
    render();
})();
