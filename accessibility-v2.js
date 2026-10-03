/* King Master — seletor de design e acessibilidade local, sem dependências. */
(() => {
    'use strict';

    const STORAGE_KEY = 'king-master.appearance-v2';
    const STORAGE_VERSION = 2;
    const DESIGNS = new Set(['original', 'nebula', 'editorial']);
    const TEXT_SCALES = new Set(['normal', 'large', 'xlarge']);
    const root = document.documentElement;
    const originalThemeColor = document.querySelector('meta[name="theme-color"]')?.content || '#0f1720';
    let injectionQueued = false;

    const clone = value => ({ ...value });
    const boolean = (value, fallback = false) => typeof value === 'boolean' ? value : fallback;

    function normalize(raw = {}, fallback = {}) {
        const design = DESIGNS.has(raw.design) ? raw.design : (DESIGNS.has(fallback.design) ? fallback.design : 'original');
        const textScale = TEXT_SCALES.has(raw.textScale) ? raw.textScale : (TEXT_SCALES.has(fallback.textScale) ? fallback.textScale : 'normal');
        return {
            version: STORAGE_VERSION,
            design,
            dyslexia: boolean(raw.dyslexia, boolean(fallback.dyslexia)),
            highContrast: boolean(raw.highContrast, boolean(fallback.highContrast)),
            textScale,
            reduceMotion: boolean(raw.reduceMotion, boolean(fallback.reduceMotion)),
            strongFocus: boolean(raw.strongFocus, boolean(fallback.strongFocus))
        };
    }

    function preferencesFromDocument() {
        const fontScale = root.dataset.fontScale;
        const motionChoice = root.dataset.motionChoice;
        return normalize({
            design: root.dataset.siteDesign || 'original',
            dyslexia: root.classList.contains('dyslexia-friendly'),
            highContrast: root.classList.contains('high-contrast'),
            textScale: TEXT_SCALES.has(fontScale) ? fontScale : 'normal',
            reduceMotion: motionChoice === 'reduced' || motionChoice === 'off',
            strongFocus: false
        });
    }

    function readStoredPreferences() {
        try {
            const raw = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
            return raw && typeof raw === 'object' ? normalize(raw, preferencesFromDocument()) : null;
        } catch {
            return null;
        }
    }

    function storePreferences(value) {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(value));
        } catch {
            /* O site continua funcional quando o armazenamento local está bloqueado. */
        }
    }

    let state = readStoredPreferences() || preferencesFromDocument();

    function setBooleanAttribute(name, value) {
        root.setAttribute(name, value ? 'true' : 'false');
    }

    function setPressed(id, value) {
        const control = document.getElementById(id);
        if (!control) return;
        control.setAttribute('aria-pressed', String(value));
        control.classList.toggle('is-active', value);
    }

    function describePreferences() {
        const active = [];
        if (state.dyslexia) active.push('leitura para dislexia');
        if (state.highContrast) active.push('alto contraste');
        if (state.textScale !== 'normal') active.push(state.textScale === 'xlarge' ? 'texto muito grande' : 'texto grande');
        if (state.reduceMotion) active.push('movimento reduzido');
        if (state.strongFocus) active.push('foco reforçado');
        return active.length ? `Ativos: ${active.join(', ')}.` : 'Acessibilidade no padrão do dispositivo.';
    }

    function updateControls(announcement = '') {
        document.querySelectorAll('[data-km-design-choice]').forEach(control => {
            const selected = control.dataset.kmDesignChoice === state.design;
            control.setAttribute('aria-checked', String(selected));
            control.classList.toggle('is-selected', selected);
            control.tabIndex = selected ? 0 : -1;
        });

        const scale = document.getElementById('kmTextScale');
        if (scale) scale.value = state.textScale;
        setPressed('kmDyslexiaToggle', state.dyslexia);
        setPressed('kmContrastToggle', state.highContrast);
        setPressed('kmMotionToggle', state.reduceMotion);
        setPressed('kmFocusToggle', state.strongFocus);

        const status = document.getElementById('kmA11yStatus');
        if (status) status.textContent = announcement || describePreferences();
    }

    function updateThemeColor() {
        const meta = document.querySelector('meta[name="theme-color"]');
        if (!meta) return;
        const dark = root.dataset.theme === 'dark';
        if (state.highContrast) meta.content = dark ? '#000000' : '#ffffff';
        else if (state.design === 'nebula') meta.content = dark ? '#070917' : '#eef0ff';
        else if (state.design === 'editorial') meta.content = dark ? '#171916' : '#f1ece2';
        else meta.content = originalThemeColor;
    }

    function syncExistingAccessibility() {
        // Mantém a camada anterior e a nova lendo o mesmo estado, inclusive quando
        // o monitor de desempenho reaplica as preferências depois do carregamento.
        if (typeof appData !== 'undefined' && appData?.accessibility) {
            appData.accessibility.fontScale = state.textScale;
            appData.accessibility.dyslexiaMode = state.dyslexia;
            appData.accessibility.highContrast = state.highContrast;
            appData.accessibility.motionMode = state.reduceMotion
                ? (appData.accessibility.motionMode === 'off' ? 'off' : 'reduced')
                : 'auto';
        }
        root.dataset.fontScale = state.textScale;
        root.dataset.motionChoice = state.reduceMotion ? 'reduced' : 'auto';
        root.classList.toggle('dyslexia-friendly', state.dyslexia);
        root.classList.toggle('high-contrast', state.highContrast);
        root.classList.toggle('reduce-motion', state.reduceMotion);
        root.classList.remove('motion-off');
    }

    function applyPreferences({ persist = true, announce = '', emit = true } = {}) {
        root.dataset.siteDesign = state.design;
        root.dataset.a11yText = state.textScale;
        root.dataset.a11yMotion = state.reduceMotion ? 'reduced' : 'system';
        setBooleanAttribute('data-a11y-dyslexia', state.dyslexia);
        setBooleanAttribute('data-a11y-contrast', state.highContrast);
        setBooleanAttribute('data-a11y-focus', state.strongFocus);
        syncExistingAccessibility();

        /* Mantém compatibilidade com as camadas anteriores sem depender delas. */
        root.dataset.fontScale = state.textScale;
        root.dataset.motionChoice = state.reduceMotion ? 'reduced' : 'auto';
        root.dataset.motionLevel = state.reduceMotion
            ? 'reduced'
            : (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ? 'reduced' : 'full');
        root.classList.toggle('dyslexia-friendly', state.dyslexia);
        root.classList.toggle('high-contrast', state.highContrast);
        root.classList.toggle('reduce-motion', state.reduceMotion || root.dataset.motionLevel === 'reduced');
        root.classList.remove('motion-off');

        if (persist) storePreferences(state);
        updateControls(announce);
        updateThemeColor();

        if (emit) {
            window.dispatchEvent(new CustomEvent('king-master-appearance-changed', {
                detail: clone(state)
            }));
        }
    }

    function updateState(patch, announcement) {
        state = normalize({ ...state, ...patch }, state);
        applyPreferences({ announce: announcement });
    }

    function settingsGroup(panel, label) {
        const normalized = label.toLocaleLowerCase('pt-BR');
        return [...panel.querySelectorAll('.settings-group')].find(group =>
            group.querySelector('h3')?.textContent.toLocaleLowerCase('pt-BR').includes(normalized)
        );
    }

    function designSectionMarkup() {
        return `
            <h3 id="kmDesignHeading"><span aria-hidden="true">◈</span> Design da interface</h3>
            <p class="km-settings-intro">Escolha uma linguagem visual completa. Sua cor personalizada continua valendo em qualquer opção.</p>
            <div class="km-design-options" role="radiogroup" aria-labelledby="kmDesignHeading">
                <button type="button" class="km-design-option" role="radio" aria-checked="false" data-km-design-choice="original">
                    <span class="km-design-preview" aria-hidden="true"><i></i></span>
                    <span class="km-design-option-copy"><strong>Original</strong><small>Mantém o visual atual</small></span>
                </button>
                <button type="button" class="km-design-option" role="radio" aria-checked="false" data-km-design-choice="nebula">
                    <span class="km-design-preview km-design-preview--nebula" aria-hidden="true"><i></i></span>
                    <span class="km-design-option-copy"><strong>Nebula</strong><small>Imersivo e luminoso</small></span>
                </button>
                <button type="button" class="km-design-option" role="radio" aria-checked="false" data-km-design-choice="editorial">
                    <span class="km-design-preview km-design-preview--editorial" aria-hidden="true"><i></i></span>
                    <span class="km-design-option-copy"><strong>Editorial</strong><small>Sóbrio e focado no conteúdo</small></span>
                </button>
            </div>`;
    }

    function accessibilityControlsMarkup() {
        return `
            <p class="km-settings-intro">Recursos independentes que podem ser combinados e ficam salvos somente neste dispositivo.</p>
            <div class="km-a11y-controls">
                <label class="settings-select-row" for="kmTextScale">
                    <span><strong>Tamanho do texto</strong><small>Amplia toda a interface sem usar zoom</small></span>
                    <select id="kmTextScale">
                        <option value="normal">Normal</option>
                        <option value="large">Grande</option>
                        <option value="xlarge">Muito grande</option>
                    </select>
                </label>
                <button class="settings-theme-toggle toggle-btn" id="kmDyslexiaToggle" type="button" aria-pressed="false">
                    <span><strong>Leitura para dislexia</strong><small>Fonte local legível, mais espaço e linhas confortáveis</small></span><i aria-hidden="true"></i>
                </button>
                <button class="settings-theme-toggle toggle-btn" id="kmContrastToggle" type="button" aria-pressed="false">
                    <span><strong>Alto contraste</strong><small>Reforça textos, controles e contornos</small></span><i aria-hidden="true"></i>
                </button>
                <button class="settings-theme-toggle toggle-btn" id="kmMotionToggle" type="button" aria-pressed="false">
                    <span><strong>Reduzir movimento</strong><small>Remove animações decorativas e transições</small></span><i aria-hidden="true"></i>
                </button>
                <button class="settings-theme-toggle toggle-btn" id="kmFocusToggle" type="button" aria-pressed="false">
                    <span><strong>Foco reforçado</strong><small>Destaca com clareza o item usado pelo teclado</small></span><i aria-hidden="true"></i>
                </button>
                <div class="km-a11y-actions">
                    <button type="button" class="km-a11y-reset" id="kmA11yReset">Restaurar acessibilidade</button>
                    <p class="km-a11y-status" id="kmA11yStatus" role="status" aria-live="polite"></p>
                </div>
            </div>`;
    }

    function hideLegacyAccessibilityControls(group) {
        ['fontScaleSelect', 'contrastToggleBtn', 'dyslexiaToggleBtn', 'motionModeSelect'].forEach(id => {
            const control = document.getElementById(id);
            if (!control || !group.contains(control)) return;
            const wrapper = control.matches('button') ? control : control.closest('.settings-select-row, label');
            if (!wrapper) return;
            wrapper.classList.add('km-a11y-legacy-control');
            wrapper.hidden = true;
            wrapper.setAttribute('aria-hidden', 'true');
        });
    }

    function ensureDesignSection(panel) {
        if (panel.querySelector('.km-design-settings')) return;
        const section = document.createElement('section');
        section.className = 'settings-group km-design-settings';
        section.setAttribute('aria-labelledby', 'kmDesignHeading');
        section.innerHTML = designSectionMarkup();

        const colorGroup = settingsGroup(panel, 'Cor do Sistema');
        const cloudGroup = settingsGroup(panel, 'Conta e Nuvem');
        if (colorGroup) colorGroup.insertAdjacentElement('afterend', section);
        else if (cloudGroup) cloudGroup.insertAdjacentElement('beforebegin', section);
        else panel.append(section);
    }

    function ensureAccessibilitySection(panel) {
        let group = settingsGroup(panel, 'Acessibilidade');
        if (!group) {
            group = document.createElement('section');
            group.className = 'settings-group';
            group.innerHTML = '<h3 id="kmAccessibilityHeading"><span aria-hidden="true">◉</span> Acessibilidade</h3>';
            const cloudGroup = settingsGroup(panel, 'Conta e Nuvem');
            if (cloudGroup) cloudGroup.insertAdjacentElement('beforebegin', group);
            else panel.append(group);
        }

        group.classList.add('km-a11y-settings');
        const heading = group.querySelector('h3');
        if (heading && !heading.id) heading.id = 'kmAccessibilityHeading';
        group.setAttribute('role', 'group');
        group.setAttribute('aria-labelledby', heading?.id || 'kmAccessibilityHeading');
        hideLegacyAccessibilityControls(group);

        if (!group.querySelector('.km-a11y-controls')) {
            group.insertAdjacentHTML('beforeend', accessibilityControlsMarkup());
        }
    }

    function ensureSettingsEnhancements() {
        injectionQueued = false;
        const panel = document.getElementById('settingsPanel') || document.querySelector('.settings-panel');
        if (!panel) return;
        ensureDesignSection(panel);
        ensureAccessibilitySection(panel);
        updateControls();
    }

    function queueEnhancement() {
        if (injectionQueued) return;
        injectionQueued = true;
        const run = () => ensureSettingsEnhancements();
        if (typeof requestAnimationFrame === 'function') requestAnimationFrame(run);
        else setTimeout(run, 0);
    }

    function selectDesign(design) {
        if (!DESIGNS.has(design)) return;
        const names = { original: 'Original', nebula: 'Nebula', editorial: 'Editorial' };
        updateState({ design }, `Design ${names[design]} aplicado.`);
    }

    document.addEventListener('click', event => {
        const designButton = event.target.closest('[data-km-design-choice]');
        if (designButton) {
            selectDesign(designButton.dataset.kmDesignChoice);
            return;
        }

        const toggle = event.target.closest('#kmDyslexiaToggle, #kmContrastToggle, #kmMotionToggle, #kmFocusToggle');
        if (toggle) {
            const map = {
                kmDyslexiaToggle: ['dyslexia', 'Modo de leitura atualizado.'],
                kmContrastToggle: ['highContrast', 'Contraste atualizado.'],
                kmMotionToggle: ['reduceMotion', 'Preferência de movimento atualizada.'],
                kmFocusToggle: ['strongFocus', 'Destaque de foco atualizado.']
            };
            const [key, message] = map[toggle.id];
            updateState({ [key]: !state[key] }, message);
            return;
        }

        if (event.target.closest('#kmA11yReset')) {
            state = normalize({ ...state, dyslexia: false, highContrast: false, textScale: 'normal', reduceMotion: false, strongFocus: false });
            applyPreferences({ announce: 'Preferências de acessibilidade restauradas.' });
        }
    });

    document.addEventListener('change', event => {
        if (event.target.id !== 'kmTextScale') return;
        const textScale = TEXT_SCALES.has(event.target.value) ? event.target.value : 'normal';
        updateState({ textScale }, 'Tamanho do texto atualizado.');
    });

    document.addEventListener('keydown', event => {
        const current = event.target.closest('[data-km-design-choice]');
        if (!current || !['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End'].includes(event.key)) return;
        const controls = [...current.closest('[role="radiogroup"]').querySelectorAll('[data-km-design-choice]')];
        const currentIndex = controls.indexOf(current);
        let nextIndex = currentIndex;
        if (event.key === 'Home') nextIndex = 0;
        else if (event.key === 'End') nextIndex = controls.length - 1;
        else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') nextIndex = (currentIndex - 1 + controls.length) % controls.length;
        else nextIndex = (currentIndex + 1) % controls.length;
        event.preventDefault();
        controls[nextIndex].focus();
        selectDesign(controls[nextIndex].dataset.kmDesignChoice);
    });

    window.addEventListener('storage', event => {
        if (event.key !== STORAGE_KEY || !event.newValue) return;
        try {
            state = normalize(JSON.parse(event.newValue), state);
            applyPreferences({ persist: false, announce: 'Preferências sincronizadas com outra aba.' });
        } catch {
            /* Ignora dados externos inválidos. */
        }
    });

    window.addEventListener('king-master-data-changed', () => setTimeout(() => {
        applyPreferences({ persist: false, emit: false });
    }, 0));
    window.addEventListener('DOMContentLoaded', queueEnhancement, { once: true });
    window.addEventListener('load', queueEnhancement, { once: true });

    const observer = new MutationObserver(records => {
        if (records.some(record => record.type === 'attributes' && record.attributeName === 'data-theme')) updateThemeColor();
        if (records.some(record => record.type === 'childList' && record.addedNodes.length)) queueEnhancement();
    });
    observer.observe(root, { subtree: true, childList: true, attributes: true, attributeFilter: ['data-theme'] });

    window.KingMasterAppearanceV2 = Object.freeze({
        getPreferences: () => clone(state),
        setDesign: selectDesign,
        setAccessibility: preferences => {
            if (!preferences || typeof preferences !== 'object') return clone(state);
            state = normalize({ ...state, ...preferences }, state);
            applyPreferences({ announce: 'Preferências de acessibilidade atualizadas.' });
            return clone(state);
        },
        resetAccessibility: () => {
            state = normalize({ ...state, dyslexia: false, highContrast: false, textScale: 'normal', reduceMotion: false, strongFocus: false });
            applyPreferences({ announce: 'Preferências de acessibilidade restauradas.' });
            return clone(state);
        }
    });

    applyPreferences({ persist: false, emit: false });
    queueEnhancement();
})();

