/* Cópias automáticas dos dados de estudo neste navegador (IndexedDB).
   Guarda uma cópia por dia (últimos 14 dias) e uma cópia recente por hora de uso (últimas 6),
   para desfazer perdas sem depender de um arquivo exportado. Fotos ficam na nuvem e não entram. */
(() => {
    'use strict';
    const DB_NAME = 'king-master-backups';
    const STORE = 'snapshots';
    const DAILY_KEEP = 14;
    const RECENT_KEEP = 6;
    const RECENT_EVERY_MS = 60 * 60 * 1000;
    const DEBOUNCE_MS = 8000;
    let timer = 0;
    let dbPromise = null;

    function openDb() {
        if (!('indexedDB' in window)) return Promise.reject(new Error('Este navegador não guarda cópias automáticas.'));
        dbPromise ||= new Promise((resolve, reject) => {
            const request = indexedDB.open(DB_NAME, 1);
            request.onupgradeneeded = () => {
                const store = request.result.createObjectStore(STORE, { keyPath: 'id' });
                store.createIndex('createdAt', 'createdAt');
            };
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => { dbPromise = null; reject(request.error); };
        });
        return dbPromise;
    }

    async function tx(mode, work) {
        const db = await openDb();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction(STORE, mode);
            const store = transaction.objectStore(STORE);
            const result = work(store);
            transaction.oncomplete = () => resolve(result?.result ?? result);
            transaction.onerror = () => reject(transaction.error);
        });
    }

    const all = () => tx('readonly', store => store.getAll());
    const dayKey = (time = Date.now()) => { const d = new Date(time); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };

    function summary(data) {
        const subjects = Array.isArray(data.cycleItems) ? data.cycleItems : [];
        return {
            materias: subjects.length,
            assuntos: subjects.reduce((total, item) => total + (Array.isArray(item.topicos) ? item.topicos.length : 0), 0),
            revisoes: Array.isArray(data.revisoesItems) ? data.revisoesItems.length : 0,
            sessoes: Array.isArray(data.historyItems) ? data.historyItems.length : 0,
        };
    }

    function currentData() {
        try { return window.kingMasterCloudBridge?.exportData?.() || null; } catch { return null; }
    }

    async function snapshot(reason = 'auto') {
        const data = currentData();
        if (!data) return null;
        const meaningful = summary(data);
        if (!meaningful.materias && !meaningful.revisoes && !meaningful.sessoes) return null;
        const account = String(data.accountUid || '');
        const now = Date.now();
        const list = (await all()).filter(item => item.account === account);
        const day = dayKey(now);
        const writes = [];
        if (!list.some(item => item.kind === 'daily' && item.day === day)) writes.push({ id: `daily:${account}:${day}`, kind: 'daily', day });
        const lastRecent = list.filter(item => item.kind === 'recent').sort((a, b) => b.createdAt - a.createdAt)[0];
        if (reason !== 'auto' || !lastRecent || now - lastRecent.createdAt >= RECENT_EVERY_MS) writes.push({ id: `recent:${account}:${now}`, kind: 'recent', day });
        if (!writes.length) return null;
        await tx('readwrite', store => writes.forEach(item => store.put({ ...item, account, reason, createdAt: now, summary: meaningful, data })));
        await prune(account);
        return writes.length;
    }

    async function prune(account) {
        const list = (await all()).filter(item => item.account === account);
        const extra = kind => list.filter(item => item.kind === kind).sort((a, b) => b.createdAt - a.createdAt).slice(kind === 'daily' ? DAILY_KEEP : RECENT_KEEP);
        const remove = [...extra('daily'), ...extra('recent')];
        if (remove.length) await tx('readwrite', store => remove.forEach(item => store.delete(item.id)));
    }

    async function list() {
        const account = String(currentData()?.accountUid || '');
        return (await all()).filter(item => item.account === account).sort((a, b) => b.createdAt - a.createdAt);
    }

    async function restore(id) {
        const item = (await all()).find(entry => entry.id === id);
        if (!item?.data) throw new Error('Cópia não encontrada.');
        const when = new Date(item.createdAt).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
        if (!window.confirm(`Voltar os seus dados para a cópia de ${when}? (${item.summary.materias} matérias, ${item.summary.assuntos} assuntos, ${item.summary.revisoes} revisões.) Uma cópia do estado atual é guardada antes.`)) return false;
        await snapshot('antes-de-restaurar');
        appData = { ...appData, ...item.data, accountUid: appData.accountUid, lastModifiedAt: Date.now() };
        saveAppData();
        setTimeout(() => window.location.reload(), 500);
        return true;
    }

    function schedule() {
        clearTimeout(timer);
        timer = setTimeout(() => { snapshot().catch(() => {}); }, DEBOUNCE_MS);
    }

    async function renderPanel() {
        const box = document.getElementById('autoBackupList');
        if (!box) return;
        let items = [];
        try { items = await list(); } catch (error) { box.textContent = error?.message || 'Não foi possível ler as cópias.'; return; }
        if (!items.length) { box.innerHTML = '<p class="auto-backup-empty">A primeira cópia é feita alguns segundos depois de você usar o site.</p>'; return; }
        box.replaceChildren(...items.map(item => {
            const row = document.createElement('div');
            row.className = 'auto-backup-row';
            const when = new Date(item.createdAt).toLocaleString('pt-BR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
            const info = document.createElement('span');
            info.innerHTML = `<strong></strong><small></small>`;
            info.querySelector('strong').textContent = `${when}${item.kind === 'daily' ? ' · diária' : ''}`;
            info.querySelector('small').textContent = `${item.summary.materias} matérias · ${item.summary.assuntos} assuntos · ${item.summary.revisoes} revisões`;
            const button = document.createElement('button');
            button.type = 'button';
            button.className = 'cycle-btn';
            button.textContent = 'Restaurar';
            button.addEventListener('click', () => restore(item.id).catch(error => window.showToast?.(error.message, true)));
            row.append(info, button);
            return row;
        }));
    }

    function mount() {
        const panel = document.getElementById('settingsPanel');
        if (!panel || document.getElementById('autoBackupGroup')) return;
        const group = document.createElement('div');
        group.className = 'settings-group';
        group.id = 'autoBackupGroup';
        group.innerHTML = '<h3><span aria-hidden="true">⟲</span> Cópias automáticas</h3><p class="km-settings-intro">Uma cópia por dia e outra a cada hora de uso, guardadas neste navegador. Use para desfazer uma perda de dados.</p><div id="autoBackupList" class="auto-backup-list" aria-live="polite"></div>';
        const anchor = document.getElementById('kingDataPortability');
        if (anchor) anchor.insertAdjacentElement('beforebegin', group); else panel.append(group);
        document.getElementById('settingsToggleBtn')?.addEventListener('click', () => setTimeout(renderPanel, 50));
        renderPanel();
    }

    window.addEventListener('king-master-data-changed', schedule);
    window.addEventListener('king-master-auth-ready', schedule);
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount, { once: true }); else mount();
    window.KingAutoBackup = Object.freeze({ snapshot, list, restore, render: renderPanel });
})();
