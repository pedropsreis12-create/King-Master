/* Recursos de rotina: onboarding, missões, desempenho adaptativo, acessibilidade e PWA. */
(() => {
    let installPrompt = null;
    let runtimeMotionOverride = null;
    let motionSampled = false;
    let motionObserver = null;
    const todayIso = () => dataLocalISO(new Date());
    const weekdayIndex = () => { const day = new Date().getDay(); return day === 0 ? 6 : day - 1; };
    const completedToday = () => appData.historyItems.filter(item => dataHistoricoISO(item) === todayIso() && Number(item.tempoSegundos) > 0);

    function renderDailyMissions() {
        const grid = document.getElementById('dailyMissionsGrid');
        if (!grid) return;
        const seconds = Number(appData.weeklyChart[weekdayIndex()] || 0);
        const sessions = completedToday().length;
        const operationMinutes = Math.min(120, Math.max(30, Number(appData.dailyGoalMinutes || 60)));
        const missions = [
            { icon: '⚡', title: 'Quebrar a inércia', copy: '10 minutos de foco', value: seconds, goal: 600 },
            { icon: '✓', title: 'Bloco concluído', copy: 'Finalizar uma sessão', value: sessions, goal: 1 },
            { icon: '◆', title: 'Operação do dia', copy: `${operationMinutes} minutos estudados`, value: seconds, goal: operationMinutes * 60 }
        ];
        document.getElementById('dailyMissionsScore').textContent = `${missions.filter(item => item.value >= item.goal).length}/3`;
        grid.innerHTML = missions.map(item => {
            const complete = item.value >= item.goal;
            const percent = Math.min(100, item.value / item.goal * 100);
            const progress = item.goal === 1 ? `${Math.min(item.value, 1)}/1 sessão` : `${Math.floor(item.value / 60)}/${Math.floor(item.goal / 60)} min`;
            return `<article class="daily-mission${complete ? ' completed' : ''}"><span class="daily-mission-icon" aria-hidden="true">${complete ? '✓' : item.icon}</span><div><strong>${item.title}</strong><small>${item.copy}</small><div class="daily-mission-progress"><i style="width:${percent}%"></i></div><em>${complete ? 'Concluída' : progress}</em></div></article>`;
        }).join('');
    }

    function detectedMotionLevel() {
        if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return 'reduced';
        const cores = Number(navigator.hardwareConcurrency) || 0;
        const memory = Number(navigator.deviceMemory) || 0;
        const saveData = Boolean(navigator.connection?.saveData);
        const compactTouch = window.matchMedia?.('(max-width: 820px) and (pointer: coarse)').matches;
        if ((memory && memory <= 2) || (cores && cores <= 2)) return 'off';
        const pressure = Number(saveData) + Number(memory > 0 && memory <= 4) + Number(cores > 0 && cores <= 4) + Number(compactTouch && cores > 0 && cores <= 8);
        return pressure >= 2 ? 'reduced' : 'full';
    }

    function resolvedMotionLevel() {
        const choice = appData.accessibility.motionMode || 'auto';
        return choice === 'auto' ? (runtimeMotionOverride || detectedMotionLevel()) : choice;
    }

    function motionLevelLabel(level) {
        return { full: 'Efeitos completos neste aparelho', reduced: 'Efeitos leves para manter a navegação fluida', off: 'Efeitos decorativos desativados' }[level] || '';
    }

    function refreshMotionSurfaces() {
        if (!('IntersectionObserver' in window)) return;
        if (!motionObserver) motionObserver = new IntersectionObserver(entries => entries.forEach(entry => entry.target.classList.toggle('motion-outside-view', !entry.isIntersecting)), { rootMargin: '180px 0px' });
        document.querySelectorAll('.profile-hero,.profile-rank-scene,.frame-vault,.widget,.ai-qg-panel').forEach(element => {
            if (element.dataset.motionObserved) return;
            element.dataset.motionObserved = 'true';
            motionObserver.observe(element);
        });
    }

    function applyAccessibility() {
        const prefs = appData.accessibility;
        const motionLevel = resolvedMotionLevel();
        document.documentElement.dataset.fontScale = prefs.fontScale;
        document.documentElement.dataset.motionChoice = prefs.motionMode;
        document.documentElement.dataset.motionLevel = motionLevel;
        document.documentElement.classList.toggle('high-contrast', prefs.highContrast);
        document.documentElement.classList.toggle('reduce-motion', motionLevel !== 'full');
        document.documentElement.classList.toggle('motion-off', motionLevel === 'off');
        const scale = document.getElementById('fontScaleSelect');
        if (scale) scale.value = prefs.fontScale;
        document.getElementById('contrastToggleBtn')?.setAttribute('aria-pressed', String(prefs.highContrast));
        const motionSelect = document.getElementById('motionModeSelect');
        if (motionSelect) motionSelect.value = prefs.motionMode;
        const hint = document.getElementById('motionModeHint');
        if (hint) hint.textContent = prefs.motionMode === 'auto' ? `Automático: ${motionLevelLabel(motionLevel).toLocaleLowerCase('pt-BR')}` : motionLevelLabel(motionLevel);
        refreshMotionSurfaces();
    }

    function savePreference(key, value) {
        appData.accessibility[key] = value;
        if (key === 'motionMode') runtimeMotionOverride = null;
        applyAccessibility();
        saveAppData();
    }

    function syncStudySettingsUi() {
        document.getElementById('autoReviewToggleBtn')?.setAttribute('aria-pressed', String(appData.studyLogging.autoReview !== false));
        const delay = document.getElementById('autoReviewDelaySelect');
        if (delay) delay.value = String(appData.studyLogging.reviewDelayDays || 1);
        const retention = document.getElementById('aiRetentionSelect');
        if (retention) retention.value = String(appData.aiSettings.retentionDays || 7);
    }

    function sampleMotionPerformance() {
        if (motionSampled || appData.accessibility.motionMode !== 'auto' || document.hidden) return;
        motionSampled = true;
        let frames = 0;
        let start = 0;
        const frame = timestamp => {
            if (!start) start = timestamp;
            frames += 1;
            const elapsed = timestamp - start;
            if (elapsed < 1800) return requestAnimationFrame(frame);
            const fps = frames / (elapsed / 1000);
            if (fps < 24) runtimeMotionOverride = 'off';
            else if (fps < 46 && resolvedMotionLevel() === 'full') runtimeMotionOverride = 'reduced';
            if (runtimeMotionOverride) applyAccessibility();
        };
        requestAnimationFrame(frame);
    }

    function scheduleMotionSample() {
        const start = () => sampleMotionPerformance();
        if ('requestIdleCallback' in window) requestIdleCallback(start, { timeout: 2500 });
        else setTimeout(start, 1600);
    }

    function maybeShowOnboarding() {
        if (appData.onboardingCompleted) return;
        const hasData = Number(appData.totalStudySeconds || 0) > 0 || ['cycleItems','historyItems','agendamentoItems','simuladosItems','redacaoItems','revisoesItems'].some(key => appData[key]?.length);
        if (hasData) { appData.onboardingCompleted = true; saveAppData(); return; }
        document.getElementById('onboardingModal')?.classList.add('active');
    }

    function completeOnboarding(addSubject) {
        appData.onboardingCompleted = true;
        saveAppData();
        fecharModal('onboardingModal');
        if (addSubject) { showSection('planejamento'); abrirModalCiclo(); }
    }

    async function registerPwa() {
        if (!('serviceWorker' in navigator)) return null;
        try { return await navigator.serviceWorker.register('./sw.js?v=20260907-account-5'); }
        catch { return null; }
    }

    function syncReminderUi() {
        const reminder = appData.reminder;
        const time = document.getElementById('reminderTime');
        if (time) time.value = reminder.time;
        document.getElementById('reminderToggleBtn')?.setAttribute('aria-pressed', String(reminder.enabled));
        const hint = document.getElementById('reminderHint');
        if (hint) hint.textContent = reminder.enabled ? `Aviso diário às ${reminder.time}` : 'Notificações desativadas';
    }

    async function setReminderEnabled() {
        if (!('Notification' in window)) return showToast('Este navegador não oferece notificações.', true);
        if (!appData.reminder.enabled) {
            const permission = await Notification.requestPermission();
            if (permission !== 'granted') return showToast('A permissão de notificações não foi concedida.', true);
            const registration = await registerPwa();
            try { await registration?.periodicSync?.register('king-master-daily-reminder', { minInterval: 24 * 60 * 60 * 1000 }); } catch { /* Fallback abaixo enquanto o app está aberto. */ }
            appData.reminder.enabled = true;
        } else appData.reminder.enabled = false;
        syncReminderUi(); saveAppData();
    }

    async function checkReminder() {
        const reminder = appData.reminder;
        if (!('Notification' in window)) return;
        if (!reminder.enabled || Notification.permission !== 'granted' || reminder.lastShown === todayIso()) return;
        const now = new Date();
        if (`${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}` < reminder.time) return;
        const registration = await navigator.serviceWorker?.ready;
        if (registration) await registration.showNotification('King Master', { body: 'Sua próxima missão de estudos está esperando.', icon: './assets/app-icon-192.png', badge: './assets/app-icon-192.png', tag: `king-master-${todayIso()}` });
        reminder.lastShown = todayIso(); saveAppData();
    }

    window.concluirOnboarding = completeOnboarding;

    document.getElementById('fontScaleSelect')?.addEventListener('change', event => savePreference('fontScale', event.target.value));
    document.getElementById('contrastToggleBtn')?.addEventListener('click', () => savePreference('highContrast', !appData.accessibility.highContrast));
    document.getElementById('motionModeSelect')?.addEventListener('change', event => savePreference('motionMode', event.target.value));
    document.getElementById('autoReviewToggleBtn')?.addEventListener('click', () => { appData.studyLogging.autoReview = !appData.studyLogging.autoReview; syncStudySettingsUi(); saveAppData(); });
    document.getElementById('autoReviewDelaySelect')?.addEventListener('change', event => { appData.studyLogging.reviewDelayDays = Number(event.target.value) || 1; syncStudySettingsUi(); saveAppData(); });
    document.getElementById('aiRetentionSelect')?.addEventListener('change', event => { appData.aiSettings.retentionDays = Number(event.target.value) || 7; window.aplicarRetencaoConversaIa?.(); syncStudySettingsUi(); saveAppData(); });
    document.getElementById('reminderTime')?.addEventListener('change', event => { appData.reminder.time = event.target.value || '19:00'; syncReminderUi(); saveAppData(); });
    document.getElementById('reminderToggleBtn')?.addEventListener('click', setReminderEnabled);
    window.addEventListener('beforeinstallprompt', event => { event.preventDefault(); installPrompt = event; document.getElementById('installAppBtn').hidden = false; });
    document.getElementById('installAppBtn')?.addEventListener('click', async () => { if (!installPrompt) return; await installPrompt.prompt(); installPrompt = null; document.getElementById('installAppBtn').hidden = true; });
    window.addEventListener('appinstalled', () => { installPrompt = null; document.getElementById('installAppBtn').hidden = true; showToast('✓ King Master instalado'); });
    window.addEventListener('king-master-data-changed', () => { renderDailyMissions(); applyAccessibility(); syncReminderUi(); syncStudySettingsUi(); });
    window.addEventListener('king-master-auth-ready', () => setTimeout(maybeShowOnboarding, 250));
    window.addEventListener('resize', () => { if (window.innerWidth > 1100) fecharMenuMovel(); }, { passive: true });
    window.addEventListener('orientationchange', fecharMenuMovel, { passive: true });
    document.addEventListener('visibilitychange', () => document.documentElement.classList.toggle('motion-page-hidden', document.hidden));
    registerPwa(); applyAccessibility(); syncReminderUi(); syncStudySettingsUi(); renderDailyMissions(); checkReminder(); scheduleMotionSample();
    setInterval(checkReminder, 30000);
})();
