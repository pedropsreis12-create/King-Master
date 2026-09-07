/* Recursos de rotina: onboarding, missões, backup, acessibilidade e PWA. */
(() => {
    let pendingBackup = null;
    let installPrompt = null;
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

    function applyAccessibility() {
        const prefs = appData.accessibility;
        document.documentElement.dataset.fontScale = prefs.fontScale;
        document.documentElement.classList.toggle('high-contrast', prefs.highContrast);
        document.documentElement.classList.toggle('reduce-motion', prefs.reduceMotion);
        const scale = document.getElementById('fontScaleSelect');
        if (scale) scale.value = prefs.fontScale;
        document.getElementById('contrastToggleBtn')?.setAttribute('aria-pressed', String(prefs.highContrast));
        document.getElementById('motionToggleBtn')?.setAttribute('aria-pressed', String(prefs.reduceMotion));
    }

    function savePreference(key, value) {
        appData.accessibility[key] = value;
        applyAccessibility();
        saveAppData();
    }

    function exportBackup() {
        const payload = JSON.stringify({ format: 'king-master-backup', version: 2, exportedAt: new Date().toISOString(), data: window.kingMasterCloudBridge.exportData() }, null, 2);
        const url = URL.createObjectURL(new Blob([payload], { type: 'application/json' }));
        const link = document.createElement('a');
        link.href = url; link.download = `king-master-backup-${todayIso()}.json`; link.click();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
        showToast('✓ Backup exportado para o seu dispositivo');
    }

    function validBackup(value) {
        const data = value?.format === 'king-master-backup' ? value.data : value;
        if (!data || typeof data !== 'object') return null;
        const lists = ['weeklyChart','cycleItems','historyItems','agendamentoItems','simuladosItems','redacaoItems','revisoesItems'];
        return lists.every(key => Array.isArray(data[key])) && data.weeklyChart.length === 7 ? data : null;
    }

    function selectBackup() { document.getElementById('backupImportInput')?.click(); }
    function cancelBackup() { pendingBackup = null; fecharModal('backupConfirmModal'); const input = document.getElementById('backupImportInput'); if (input) input.value = ''; }
    function confirmBackup() {
        if (!pendingBackup) return cancelBackup();
        const data = { ...pendingBackup, lastModifiedAt: Date.now() };
        pendingBackup = null;
        window.kingMasterCloudBridge.importData(data);
    }

    async function readBackup(event) {
        const file = event.target.files?.[0];
        if (!file) return;
        if (file.size > 8 * 1024 * 1024) { showToast('O backup ultrapassa o limite de 8 MB.', true); return cancelBackup(); }
        try {
            const data = validBackup(JSON.parse(await file.text()));
            if (!data) throw new Error('invalid');
            pendingBackup = data;
            const subjects = data.cycleItems.length;
            const sessions = data.historyItems.length;
            document.getElementById('backupConfirmMessage').textContent = `O arquivo contém ${subjects} matéria(s) e ${sessions} sessão(ões). Ele substituirá os dados atuais e será enviado à sua nuvem.`;
            document.getElementById('backupConfirmModal').classList.add('active');
        } catch { showToast('Este arquivo não é um backup válido do King Master.', true); cancelBackup(); }
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

    window.exportarBackup = exportBackup;
    window.selecionarBackup = selectBackup;
    window.cancelarImportacaoBackup = cancelBackup;
    window.confirmarImportacaoBackup = confirmBackup;
    window.concluirOnboarding = completeOnboarding;

    document.getElementById('backupImportInput')?.addEventListener('change', readBackup);
    document.getElementById('fontScaleSelect')?.addEventListener('change', event => savePreference('fontScale', event.target.value));
    document.getElementById('contrastToggleBtn')?.addEventListener('click', () => savePreference('highContrast', !appData.accessibility.highContrast));
    document.getElementById('motionToggleBtn')?.addEventListener('click', () => savePreference('reduceMotion', !appData.accessibility.reduceMotion));
    document.getElementById('reminderTime')?.addEventListener('change', event => { appData.reminder.time = event.target.value || '19:00'; syncReminderUi(); saveAppData(); });
    document.getElementById('reminderToggleBtn')?.addEventListener('click', setReminderEnabled);
    window.addEventListener('beforeinstallprompt', event => { event.preventDefault(); installPrompt = event; document.getElementById('installAppBtn').hidden = false; });
    document.getElementById('installAppBtn')?.addEventListener('click', async () => { if (!installPrompt) return; await installPrompt.prompt(); installPrompt = null; document.getElementById('installAppBtn').hidden = true; });
    window.addEventListener('appinstalled', () => { installPrompt = null; document.getElementById('installAppBtn').hidden = true; showToast('✓ King Master instalado'); });
    window.addEventListener('king-master-data-changed', () => { renderDailyMissions(); applyAccessibility(); syncReminderUi(); });
    window.addEventListener('king-master-auth-ready', () => setTimeout(maybeShowOnboarding, 250));
    window.addEventListener('resize', () => { if (window.innerWidth > 1100) fecharMenuMovel(); }, { passive: true });
    window.addEventListener('orientationchange', fecharMenuMovel, { passive: true });
    registerPwa(); applyAccessibility(); syncReminderUi(); renderDailyMissions(); checkReminder();
    setInterval(checkReminder, 30000);
})();
