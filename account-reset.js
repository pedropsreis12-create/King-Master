/* Zerar progresso: apaga o que foi registrado e mantém as matérias, os assuntos e os ajustes. */
(() => {
    // Preferências e materiais escritos que continuam depois de zerar.
    const MANTER = ['accountUid', 'profileName', 'profileBio', 'profilePhoto', 'profileBanner', 'themeColor', 'themeColorRgb',
        'darkMode', 'visualMode', 'rankVisualMode', 'accessibility', 'studyLogging', 'aiSettings', 'reminder', 'studentPlan',
        'dailyGoalMinutes', 'onboardingCompleted', 'subjectModules', 'subjectContentModules', 'revisaoTags', 'agendaCategories',
        'quickNotes', 'quickNoteBooks', 'selectedFrames'];
    const copia = value => JSON.parse(JSON.stringify(value));

    function zerarAssunto(topico) {
        const limpo = { ...topico, concluido: false, nivelDominio: 0, vezesEstudado: 0, questoes: 0, acertos: 0, erros: 0, desempenhoRecentes: [] };
        ['dominio', 'ultimoEstudoEm', 'proximaRevisaoEm', 'trilha'].forEach(chave => delete limpo[chave]);
        return limpo;
    }

    function zerarMateria(materia) {
        return { ...materia, executedMin: 0, questoes: 0, acertos: 0, erros: 0,
            topicos: Array.isArray(materia.topicos) ? materia.topicos.map(zerarAssunto) : [] };
    }

    function zerarProgresso(dados, padrao, agora = Date.now()) {
        const novo = copia(padrao);
        for (const chave of MANTER) if (dados[chave] !== undefined) novo[chave] = copia(dados[chave]);
        novo.cycleItems = (Array.isArray(dados.cycleItems) ? dados.cycleItems : []).map(item => zerarMateria(copia(item)));
        if (dados.cadernoCentral?.legendaCores) novo.cadernoCentral = { ...novo.cadernoCentral, legendaCores: copia(dados.cadernoCentral.legendaCores), revisados: {} };
        if (dados.autopilot) novo.autopilot = { ...copia(dados.autopilot), todayBudget: null };
        if (dados.studySchedule?.settings) novo.studySchedule = { ...novo.studySchedule, settings: copia(dados.studySchedule.settings) };
        novo.metas = [];
        novo.temasRedacao = Array.isArray(dados.temasRedacao) ? copia(dados.temasRedacao) : [];
        novo.lastModifiedAt = agora;
        return novo;
    }

    async function confirmarEZerar() {
        const campo = document.getElementById('accountResetConfirm');
        if (String(campo?.value || '').trim().toUpperCase() !== 'ZERAR') {
            window.showToast?.('Digite ZERAR para confirmar.', true);
            campo?.focus();
            return;
        }
        const botao = document.getElementById('accountResetButton');
        if (botao) { botao.disabled = true; botao.textContent = 'Zerando…'; }
        try {
            await window.KingAutoBackup?.snapshot?.('antes-de-zerar');
            if (window.kingMasterCloudBridge?.timerRunning?.()) window.KingAccountReset.pararCronometro?.();
            window.KingAccountReset.aplicar();
            await window.kingCloud?.flushNow?.();
            window.showToast?.('Progresso zerado. Suas matérias e assuntos foram mantidos.');
            setTimeout(() => window.location.reload(), 600);
        } catch (error) {
            console.error('Falha ao zerar o progresso.', error);
            window.showToast?.('Não foi possível zerar agora. Nada foi apagado na nuvem; tente de novo.', true);
            if (botao) { botao.disabled = false; botao.textContent = 'Zerar progresso'; }
        }
    }

    function mount() {
        const panel = document.getElementById('settingsPanel');
        if (!panel || document.getElementById('accountResetGroup')) return;
        const group = document.createElement('div');
        group.className = 'settings-group account-reset-group';
        group.id = 'accountResetGroup';
        group.innerHTML = `<h3><span aria-hidden="true">↺</span> Zerar progresso</h3>
            <p class="km-settings-intro">Recomeça do zero em todos os aparelhos da sua conta. <strong>Apaga:</strong> histórico de estudo, tempo, questões e acertos, redações, simulados, revisões, flashcards, caderno de erros, metas, cronograma e compromissos. <strong>Mantém:</strong> suas matérias e assuntos (zerados), anotações, banco de temas, perfil e ajustes.</p>
            <p class="km-settings-intro">Antes de apagar, uma cópia é guardada em Cópias automáticas, e dá para voltar atrás por lá neste navegador.</p>
            <div class="account-reset-row"><label for="accountResetConfirm">Digite <b>ZERAR</b> para confirmar</label><input id="accountResetConfirm" type="text" autocomplete="off" spellcheck="false" placeholder="ZERAR"><button type="button" id="accountResetButton" class="cycle-btn danger">Zerar progresso</button></div>`;
        // Fica por último em Ajustes, como toda ação que apaga dados.
        panel.append(group);
        group.querySelector('#accountResetButton').addEventListener('click', confirmarEZerar);
    }

    window.KingAccountReset = { zerarProgresso, zerarMateria, zerarAssunto, MANTER };
    if (typeof document !== 'undefined' && document.getElementById) {
        if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount, { once: true }); else mount();
    }
})();
