(() => {
    const data = globalThis.KingPeriodicData;
    const core = globalThis.KingPeriodicCore;
    const section = document.getElementById('periodic-table');
    if (!section || !Array.isArray(data) || !core) return;

    const grid = document.getElementById('periodicGrid');
    const detail = document.getElementById('periodicDetail');
    const dock = document.getElementById('periodicDetailDock');
    const scrollArea = document.getElementById('periodicTableScroll');
    const search = document.getElementById('periodicSearch');
    const suggestions = document.getElementById('periodicSuggestions');
    const clear = document.getElementById('periodicClear');
    const count = document.getElementById('periodicResultCount');
    const legend = document.getElementById('periodicLegend');
    const hangingArt = document.getElementById('periodicSpiderHanging');
    if ([grid, detail, dock, scrollArea, search, suggestions, clear, count, legend, hangingArt].some(node => !node)) return;

    const elementsByNumber = new Map(data.map(element => [element.number, element]));
    const familyTotals = Object.values(core.FAMILIES).map(family => ({ ...family,
        count: data.filter(element => core.FAMILIES[element.category]?.key === family.key).length
    }));
    let selectedNumber = 0;
    let activeFamily = '';
    let filteredElements = data;
    let initialized = false;
    const escapeHTML = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
    const formatConfiguration = value => escapeHTML(value || '—').replace(/\](?=\d)/g, '] ').replace(/([spdf])(\d+)(?=\s|$)/gi, '$1<sup>$2</sup>');

    function elementMarkup(element) {
        const position = core.position(element.number);
        const familyKey = core.FAMILIES[element.category]?.key || 'unknown';
        const displayRow = position.row >= 8 ? position.row + 2 : position.row + 1;
        return `<button type="button" class="periodic-element periodic-element--${familyKey}" data-element="${element.number}" style="grid-column:${position.column + 1};grid-row:${displayRow}" aria-label="${escapeHTML(element.name)}, símbolo ${escapeHTML(element.symbol)}, número atômico ${element.number}" aria-pressed="false">
            <span class="periodic-element-number">${element.number}</span><strong>${escapeHTML(element.symbol)}</strong><span class="periodic-element-name">${escapeHTML(element.name)}</span>
        </button>`;
    }

    function detailMarkup(element) {
        const position = core.position(element.number);
        const family = core.FAMILIES[element.category] || { key: 'unknown', label: 'Família não informada' };
        const group = position.group ? `Grupo ${position.group}` : 'Série interna';
        const block = String(element.configuration || '').match(/([spdf])\d*$/i)?.[1]?.toLowerCase();
        const mass = String(element.mass || '—').replace('.', ',');
        const current = filteredElements.findIndex(item => item.number === element.number);
        const positionLabel = current < 0 ? 'Fora do filtro' : `${current + 1} de ${filteredElements.length}`;
        return `<div class="periodic-detail-header">
                <div class="periodic-detail-identity periodic-element--${family.key}"><span>${element.number}</span><strong>${escapeHTML(element.symbol)}</strong></div>
                <div class="periodic-detail-heading"><span class="periodic-detail-kicker">ELEMENTO EM FOCO · ${positionLabel}</span><h3>${escapeHTML(element.name)}</h3><p><i class="periodic-family-dot periodic-element--${family.key}" aria-hidden="true"></i>${escapeHTML(family.label)}</p><div class="periodic-detail-tags"><span>${group}</span><span>Período ${position.period}</span>${block ? `<span>Bloco ${block}</span>` : ''}</div></div>
                <div class="periodic-detail-nav"><button type="button" data-step="-1" aria-label="Elemento anterior">‹</button><button type="button" data-step="1" aria-label="Próximo elemento">›</button><button type="button" class="periodic-detail-close" data-close-detail aria-label="Fechar detalhes">×</button></div>
            </div>
            <div class="periodic-facts"><div><span>Número atômico</span><strong>${element.number}</strong></div><div><span>Massa atômica</span><strong>${escapeHTML(mass)} u</strong></div><div><span>Estado padrão</span><strong>${escapeHTML(core.stateLabel(element.state))}</strong></div><div class="periodic-config-fact"><span>Configuração eletrônica <button type="button" class="periodic-config-help" data-config-help aria-controls="periodicConfigHelpText" aria-expanded="false" aria-label="Entenda a configuração eletrônica">?</button></span><strong>${formatConfiguration(element.configuration)}</strong></div></div>
            <p class="periodic-config-explainer" id="periodicConfigHelpText" hidden>Esta notação mostra onde estão os elétrons: o número antes da letra é o nível; s, p, d e f são subníveis; o número em cima é a quantidade de elétrons. O símbolo entre colchetes resume os elétrons internos de um gás nobre.${element.symbol === 'Fe' ? ' No ferro, [Ar] representa 18 elétrons; 4s² adiciona 2 e 3d⁶ adiciona 6, totalizando 26.' : ''}</p>
            <a class="periodic-source-link" href="https://pubchem.ncbi.nlm.nih.gov/element/${encodeURIComponent(element.englishName.toLowerCase())}" target="_blank" rel="noopener noreferrer">Ficha completa na PubChem <span aria-hidden="true">↗</span></a>`;
    }

    function placeDetail() {
        const roomForInlineCard = section.classList.contains('active') && scrollArea.clientWidth >= 850;
        const destination = roomForInlineCard ? grid : dock;
        if (detail.parentElement !== destination) destination.append(detail);
        detail.classList.toggle('is-inline', roomForInlineCard);
    }

    function bringTileIntoView(number) {
        const tile = grid.querySelector(`[data-element="${number}"]`);
        if (!tile) return;
        const tileLeft = tile.offsetLeft;
        const tileRight = tileLeft + tile.offsetWidth;
        const visibleLeft = scrollArea.scrollLeft;
        const visibleRight = visibleLeft + scrollArea.clientWidth;
        if (tileLeft < visibleLeft + 12 || tileRight > visibleRight - 12) {
            scrollArea.scrollTo({ left: Math.max(0, tileLeft - scrollArea.clientWidth / 2 + tile.offsetWidth / 2), behavior: 'smooth' });
        }
    }

    function select(number, { reveal = false } = {}) {
        const element = elementsByNumber.get(Number(number));
        if (!element) return;
        selectedNumber = element.number;
        section.classList.add('has-selection');
        detail.hidden = false;
        grid.querySelectorAll('[data-element]').forEach(button => {
            const active = Number(button.dataset.element) === selectedNumber;
            button.classList.toggle('is-selected', active);
            button.setAttribute('aria-pressed', String(active));
        });
        detail.innerHTML = detailMarkup(element);
        if (reveal) {
            bringTileIntoView(selectedNumber);
            if (!detail.classList.contains('is-inline')) detail.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    }

    function clearSelection() {
        selectedNumber = 0;
        section.classList.remove('has-selection');
        detail.hidden = true;
        grid.querySelectorAll('[data-element]').forEach(button => {
            button.classList.remove('is-selected');
            button.setAttribute('aria-pressed', 'false');
        });
    }

    function renderSuggestions() {
        const term = core.normalize(search.value);
        const rank = element => core.normalize(element.symbol) === term || core.normalize(element.name) === term ? 0 : core.normalize(element.name).startsWith(term) ? 1 : 2;
        const matches = term ? [...filteredElements].sort((a, b) => rank(a) - rank(b) || a.number - b.number).slice(0, 6) : [];
        suggestions.hidden = !term;
        search.setAttribute('aria-expanded', String(Boolean(term)));
        if (!term) { suggestions.innerHTML = ''; return; }
        if (!matches.length) { suggestions.innerHTML = '<p class="periodic-no-results">Nenhum elemento encontrado. Tente outro nome, símbolo ou número.</p>'; return; }
        suggestions.innerHTML = matches.map(element => {
            const family = core.FAMILIES[element.category];
            return `<button type="button" role="option" data-suggestion="${element.number}"><span class="periodic-suggestion-symbol periodic-element--${family?.key || 'unknown'}">${escapeHTML(element.symbol)}</span><span><strong>${escapeHTML(element.name)}</strong><small>${escapeHTML(family?.label || '')}</small></span><em>${element.number}</em></button>`;
        }).join('');
    }

    function applyFilter() {
        filteredElements = data.filter(element => core.matches(element, search.value, activeFamily));
        const matchingNumbers = new Set(filteredElements.map(element => element.number));
        grid.querySelectorAll('[data-element]').forEach(button => button.classList.toggle('is-dimmed', !matchingNumbers.has(Number(button.dataset.element))));
        legend.querySelectorAll('[data-family]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.family === activeFamily)));
        count.textContent = `${filteredElements.length} ${filteredElements.length === 1 ? 'elemento' : 'elementos'}`;
        clear.hidden = !search.value && !activeFamily;
        renderSuggestions();
        if (!filteredElements.length && selectedNumber) {
            detail.innerHTML = '<div class="periodic-empty"><strong>Nenhum elemento encontrado</strong><span>Tente outro nome ou escolha uma família diferente.</span></div>';
        } else if (filteredElements.length && selectedNumber && !matchingNumbers.has(selectedNumber)) {
            select(filteredElements[0].number);
        } else if (selectedNumber) {
            detail.innerHTML = detailMarkup(elementsByNumber.get(selectedNumber));
        }
    }

    function renderLegend() {
        legend.innerHTML = `<button type="button" class="periodic-family-filter periodic-family-filter--all" data-family="" aria-pressed="true">Todas <span>${data.length}</span></button>` + familyTotals.map(family => `<button type="button" class="periodic-family-filter periodic-element--${family.key}" data-family="${family.key}" aria-pressed="false"><i aria-hidden="true"></i>${escapeHTML(family.label)} <span>${family.count}</span></button>`).join('');
    }

    function step(direction) {
        const items = filteredElements.length ? filteredElements : data;
        const current = items.findIndex(element => element.number === selectedNumber);
        const next = items[(current + direction + items.length) % items.length] || items[0];
        select(next.number, { reveal: true });
    }

    function initialize() {
        if (initialized) { placeDetail(); return; }
        initialized = true;
        renderLegend();
        const groups = Array.from({ length: 18 }, (_, index) => `<span class="periodic-axis periodic-axis--group" style="grid-column:${index + 2};grid-row:1">${index + 1}</span>`).join('');
        const periods = Array.from({ length: 7 }, (_, index) => `<span class="periodic-axis periodic-axis--period" style="grid-column:1;grid-row:${index + 2}">${index + 1}</span>`).join('');
        const series = `<button type="button" class="periodic-series-link" data-jump="57" style="grid-column:4;grid-row:7" aria-label="Ir para os lantanídeos">57–71 <span>↓</span></button><button type="button" class="periodic-series-link" data-jump="89" style="grid-column:4;grid-row:8" aria-label="Ir para os actinídeos">89–103 <span>↓</span></button><span class="periodic-series-label" style="grid-column:1 / span 4;grid-row:10">Lantanídeos</span><span class="periodic-series-label" style="grid-column:1 / span 4;grid-row:11">Actinídeos</span>`;
        const key = `<div class="periodic-neon-key" aria-label="Explore os elementos" style="grid-column:7 / 14;grid-row:2 / 5"><img src="assets/periodic-spider-symbol.svg" alt="" aria-hidden="true"><span class="periodic-neon-key-title">118 ELEMENTOS</span><strong>UM UNIVERSO PARA EXPLORAR</strong><small>Selecione um elemento para investigar</small></div>`;
        grid.innerHTML = `${groups}${periods}${series}${key}${data.map(elementMarkup).join('')}`;
        grid.append(hangingArt);
        grid.addEventListener('click', event => {
            const elementButton = event.target.closest('[data-element]');
            if (elementButton) {
                if (elementButton.classList.contains('is-dimmed')) { search.value = ''; activeFamily = ''; applyFilter(); }
                return select(elementButton.dataset.element, { reveal: !detail.classList.contains('is-inline') });
            }
            const jump = event.target.closest('[data-jump]');
            if (jump) select(jump.dataset.jump, { reveal: true });
        });
        detail.addEventListener('click', event => {
            if (event.target.closest('[data-close-detail]')) return clearSelection();
            const help = event.target.closest('[data-config-help]');
            if (help) {
                const explanation = detail.querySelector('.periodic-config-explainer');
                explanation.hidden = !explanation.hidden;
                help.setAttribute('aria-expanded', String(!explanation.hidden));
                return;
            }
            const button = event.target.closest('[data-step]');
            if (button) step(Number(button.dataset.step));
        });
        legend.addEventListener('click', event => {
            const button = event.target.closest('[data-family]');
            if (!button) return;
            activeFamily = button.dataset.family;
            applyFilter();
        });
        search.addEventListener('input', applyFilter);
        search.addEventListener('keydown', event => {
            if (event.key === 'Escape') { suggestions.hidden = true; search.setAttribute('aria-expanded', 'false'); return; }
            if (event.key === 'ArrowDown' && !suggestions.hidden) { event.preventDefault(); suggestions.querySelector('button')?.focus(); return; }
            if (event.key !== 'Enter' || !filteredElements.length) return;
            event.preventDefault();
            const exact = filteredElements.find(element => core.normalize(element.symbol) === core.normalize(search.value) || String(element.number) === search.value.trim());
            select((exact || filteredElements[0]).number, { reveal: true });
            suggestions.hidden = true;
            search.setAttribute('aria-expanded', 'false');
        });
        suggestions.addEventListener('click', event => {
            const button = event.target.closest('[data-suggestion]');
            if (!button) return;
            select(button.dataset.suggestion, { reveal: true });
            suggestions.hidden = true;
            search.setAttribute('aria-expanded', 'false');
        });
        suggestions.addEventListener('keydown', event => {
            if (event.key === 'Escape') { suggestions.hidden = true; search.setAttribute('aria-expanded', 'false'); search.focus(); }
        });
        clear.addEventListener('click', () => { search.value = ''; activeFamily = ''; applyFilter(); search.focus(); });
        section.addEventListener('keydown', event => {
            if (!['ArrowLeft', 'ArrowRight'].includes(event.key) || event.target === search || event.target.closest('a')) return;
            if (event.target.closest('.periodic-grid, .periodic-detail')) { event.preventDefault(); step(event.key === 'ArrowRight' ? 1 : -1); }
        });
        document.addEventListener('click', event => {
            if (!event.target.closest('.periodic-search-wrap')) { suggestions.hidden = true; search.setAttribute('aria-expanded', 'false'); }
        });
        if ('ResizeObserver' in window) new ResizeObserver(placeDetail).observe(scrollArea);
        window.addEventListener('resize', placeDetail, { passive: true });
        if (selectedNumber) select(selectedNumber);
        applyFilter();
        placeDetail();
    }

    globalThis.KingPeriodic = { render: initialize, select };
    if (section.classList.contains('active')) initialize();
})();
