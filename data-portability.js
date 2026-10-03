(function () {
    'use strict';

    const MAX_IMPORT_BYTES = 100 * 1024 * 1024;
    const MAX_IMAGE_DATA_LENGTH = 720000;
    const KNOWN_KEYS = ['cycleItems', 'historyItems', 'studySchedule', 'revisoesItems', 'simuladosItems', 'redacaoItems'];
    const IMAGE_DATA_PATTERN = /^data:image\/(png|jpeg|webp);base64,/i;

    const asArray = value => Array.isArray(value) ? value : [];
    const cleanId = value => String(value || '').replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 90);

    function safeFileDate() {
        return new Date().toISOString().replace(/[:.]/g, '-');
    }

    function downloadJson(value, suffix = '', extras = {}) {
        const payload = {
            format: 'king-master-backup',
            version: 2,
            exportedAt: new Date().toISOString(),
            data: value,
            privateImages: extras.privateImages || { reviews: [], errors: [] },
            warnings: asArray(extras.warnings)
        };
        const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `king-master-${suffix || 'backup'}-${safeFileDate()}.json`;
        document.body.appendChild(link);
        link.click();
        link.remove();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
    }

    function privateImageReferences(data) {
        const reviews = new Map();
        asArray(data?.revisoesItems).forEach(item => {
            const id = cleanId(item?.imagem?.id);
            if (id && !reviews.has(id)) reviews.set(id, { id, reviewId: String(item?.id || '').slice(0, 40) });
        });

        const errors = new Map();
        asArray(data?.cadernoErrosItems).forEach(item => {
            asArray(item?.imagens).forEach(image => {
                const id = cleanId(image?.id);
                if (id && !errors.has(id)) errors.set(id, { id, errorId: String(item?.id || '').slice(0, 40) });
            });
        });
        return { reviews: [...reviews.values()], errors: [...errors.values()] };
    }

    async function mapConcurrent(items, worker, concurrency = 4) {
        const results = new Array(items.length);
        let cursor = 0;
        const runners = Array.from({ length: Math.min(concurrency, Math.max(1, items.length)) }, async () => {
            while (cursor < items.length) {
                const index = cursor++;
                results[index] = await worker(items[index], index);
            }
        });
        await Promise.all(runners);
        return results;
    }

    async function collectPrivateImages(data, { strict = false } = {}) {
        const references = privateImageReferences(data);
        const expected = references.reviews.length + references.errors.length;
        if (!expected) return { privateImages: { reviews: [], errors: [] }, warnings: [] };

        const cloud = window.kingCloud;
        const warnings = [];
        if (typeof cloud?.getReviewImage !== 'function' || typeof cloud?.getErrorImage !== 'function') {
            const message = 'As fotos privadas ainda não estão disponíveis. Entre na conta e aguarde a sincronização.';
            if (strict) throw new Error(message);
            return { privateImages: { reviews: [], errors: [] }, warnings: [message] };
        }

        const reviewImages = await mapConcurrent(references.reviews, async reference => {
            try {
                const image = await cloud.getReviewImage(reference.id);
                return { ...image, id: reference.id, reviewId: reference.reviewId };
            } catch {
                warnings.push(`A foto privada ${reference.id} de uma revisão não pôde ser incluída.`);
                return null;
            }
        });
        const errorImages = await mapConcurrent(references.errors, async reference => {
            try {
                const image = await cloud.getErrorImage(reference.id);
                return { ...image, id: reference.id, errorId: reference.errorId };
            } catch {
                warnings.push(`A imagem privada ${reference.id} do caderno de erros não pôde ser incluída.`);
                return null;
            }
        });

        if (strict && warnings.length) {
            throw new Error('A restauração foi cancelada porque o backup preventivo não conseguiu incluir todas as fotos privadas. Confira a conexão e tente novamente.');
        }
        return {
            privateImages: { reviews: reviewImages.filter(Boolean), errors: errorImages.filter(Boolean) },
            warnings
        };
    }

    async function exportData() {
        const button = document.getElementById('exportKingDataBtn');
        const originalLabel = button?.textContent;
        if (button) { button.disabled = true; button.textContent = 'Preparando dados e fotos…'; }
        try {
            const bundle = await collectPrivateImages(appData);
            downloadJson(appData, '', bundle);
            const imageCount = bundle.privateImages.reviews.length + bundle.privateImages.errors.length;
            if (bundle.warnings.length) {
                showToast(`Backup baixado, mas ${bundle.warnings.length} foto(s) não puderam ser recuperadas da nuvem.`, true);
            } else {
                showToast(imageCount ? `Backup completo baixado com ${imageCount} foto(s) privada(s).` : 'Backup completo baixado neste dispositivo.');
            }
        } catch {
            showToast('Não foi possível criar o backup agora.', true);
        } finally {
            if (button) { button.disabled = false; button.textContent = originalLabel || 'Baixar backup completo'; }
        }
    }

    function normalizeBackupImage(raw, kind) {
        if (!raw || typeof raw !== 'object') throw new Error('O backup contém uma imagem privada inválida.');
        const id = cleanId(raw.id);
        const dataUrl = String(raw.dataUrl || '');
        if (!id || !IMAGE_DATA_PATTERN.test(dataUrl) || dataUrl.length > MAX_IMAGE_DATA_LENGTH) {
            throw new Error('O backup contém uma imagem privada inválida ou grande demais.');
        }
        const base = {
            id,
            name: String(raw.name || 'Imagem restaurada').slice(0, 100),
            type: ['image/png', 'image/jpeg', 'image/webp'].includes(raw.type) ? raw.type : 'image/webp',
            width: Math.max(1, Math.min(2400, Number(raw.width) || 1)),
            height: Math.max(1, Math.min(2400, Number(raw.height) || 1)),
            dataUrl
        };
        if (kind === 'review') return { ...base, reviewId: String(raw.reviewId || '').slice(0, 40) };
        return { ...base, errorId: String(raw.errorId || '').slice(0, 40), context: raw.context === 'rule' ? 'rule' : 'question' };
    }

    function parseBackup(text) {
        const parsed = JSON.parse(text, (key, value) => (
            ['__proto__', 'prototype', 'constructor'].includes(key) ? undefined : value
        ));
        const candidate = parsed?.format === 'king-master-backup' ? parsed.data : parsed;
        if (!candidate || typeof candidate !== 'object' || Array.isArray(candidate)) {
            throw new Error('O arquivo não contém um backup válido.');
        }
        if (!KNOWN_KEYS.some(key => Object.prototype.hasOwnProperty.call(candidate, key))) {
            throw new Error('Este JSON não parece ter sido exportado pelo King Master.');
        }
        const rawImages = parsed?.format === 'king-master-backup' && parsed.privateImages && typeof parsed.privateImages === 'object'
            ? parsed.privateImages : {};
        return {
            data: candidate,
            privateImages: {
                reviews: asArray(rawImages.reviews).map(image => normalizeBackupImage(image, 'review')),
                errors: asArray(rawImages.errors).map(image => normalizeBackupImage(image, 'error'))
            }
        };
    }

    async function restorePrivateImages(privateImages) {
        const reviews = asArray(privateImages?.reviews);
        const errors = asArray(privateImages?.errors);
        if (!reviews.length && !errors.length) return 0;
        const cloud = window.kingCloud;
        if (typeof cloud?.saveReviewImage !== 'function' || typeof cloud?.saveErrorImage !== 'function') {
            throw new Error('Entre na conta e aguarde a conexão com a nuvem antes de restaurar fotos privadas.');
        }
        await mapConcurrent(reviews, image => cloud.saveReviewImage(image), 2);
        await mapConcurrent(errors, image => cloud.saveErrorImage(image), 2);
        return reviews.length + errors.length;
    }

    async function importData(file) {
        if (!file) return;
        if (file.size <= 0 || file.size > MAX_IMPORT_BYTES) {
            showToast('O backup deve ter no máximo 100 MB.', true);
            return;
        }
        try {
            const backup = parseBackup(await file.text());
            const accepted = window.confirm('Restaurar este backup? O King Master baixará uma cópia completa dos dados atuais antes da troca.');
            if (!accepted) return;

            const button = document.getElementById('importKingDataBtn');
            const originalLabel = button?.textContent;
            if (button) { button.disabled = true; button.textContent = 'Protegendo dados atuais…'; }
            try {
                const currentBundle = await collectPrivateImages(appData, { strict: true });
                downloadJson(appData, 'antes-da-restauracao', currentBundle);
                if (button) button.textContent = 'Restaurando dados e fotos…';
                const restoredImages = await restorePrivateImages(backup.privateImages);
                appData = { ...appData, ...backup.data, lastModifiedAt: Date.now() };
                saveAppData();
                showToast(restoredImages ? `Backup restaurado com ${restoredImages} foto(s). Atualizando o painel…` : 'Backup restaurado. Atualizando o painel…');
                setTimeout(() => window.location.reload(), 700);
            } finally {
                if (button) { button.disabled = false; button.textContent = originalLabel || 'Restaurar um backup'; }
            }
        } catch (error) {
            showToast(error?.message || 'Não foi possível ler este backup.', true);
        }
    }

    function mount() {
        const panel = document.getElementById('settingsPanel');
        if (!panel || document.getElementById('kingDataPortability')) return;
        const group = document.createElement('div');
        group.className = 'settings-group';
        group.id = 'kingDataPortability';
        group.innerHTML = `
            <h3><span aria-hidden="true">⇩</span> Seus dados</h3>
            <p class="cloud-account-note">Baixe dados, anexos e fotos privadas em um único arquivo. A restauração cria um backup completo dos dados atuais antes da troca.</p>
            <button type="button" class="cycle-btn primary settings-full-button" id="exportKingDataBtn">Baixar backup completo</button>
            <button type="button" class="cycle-btn settings-full-button" id="importKingDataBtn">Restaurar um backup</button>
            <input type="file" id="importKingDataInput" accept="application/json,.json" hidden aria-label="Escolher backup do King Master">
        `;
        panel.appendChild(group);
        document.getElementById('exportKingDataBtn')?.addEventListener('click', exportData);
        document.getElementById('importKingDataBtn')?.addEventListener('click', () => document.getElementById('importKingDataInput')?.click());
        document.getElementById('importKingDataInput')?.addEventListener('change', event => {
            const input = event.currentTarget;
            importData(input.files?.[0]).finally(() => { input.value = ''; });
        });
    }

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount, { once: true });
    else mount();
    window.KingDataPortability = { exportData };
})();
