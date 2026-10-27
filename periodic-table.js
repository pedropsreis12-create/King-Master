(() => {
    const data = globalThis.KingPeriodicData;
    const core = globalThis.KingPeriodicCore;
    const section = document.getElementById('periodic-table');
    if (!section || !Array.isArray(data) || !core) return;

    const grid = document.getElementById('periodicGrid');
    const detail = document.getElementById('periodicDetail');
    const search = document.getElementById('periodicSearch');
    const family = document.getElementById('periodicFamily');
    const count = document.getElementById('periodicResultCount');
    const legend = document.getElementById('periodicLegend');
    const elementsByNumber = new Map(data.map(element => [element.number, element]));
    let selectedNumber = 26;
    let initialized = false;

    function elementMarkup(element) {
        const position = core.position(element.number);
        const familyKey = core.FAMILIES[element.category]?.key || 'unknown';
        const displayRow = position.row >= 8 ? position.row + 2 : position.row + 1;
        return `<button type="button" class="periodic-element periodic-element--${familyKey}" data-element="${element.number}" style="grid-column:${position.column + 1};grid-row:${displayRow}" aria-label="${element.name}, símbolo ${element.symbol}, número atômico ${element.number}">
            <span class="periodic-element-number">${element.number}</span><strong>${element.symbol}</strong><span class="periodic-element-name">${element.name}</span>
        </button>`;
    }

    function detailMarkup(element) {
        const position = core.position(element.number);
        const meta = core.FAMILIES[element.category] || { key: 'unknown', label: 'Família não informada' };
        const group = position.group ? `Grupo ${position.group}` : 'Bloco f';
        const mass = String(element.mass || '—').replace('.', ',');
        return `<div class="periodic-detail-identity periodic-element--${meta.key}"><span>${element.number}</span><strong>${element.symbol}</strong><small>${element.name}</small></div>
            <div class="periodic-detail-main"><span class="periodic-detail-kicker">ELEMENTO ${String(element.number).padStart(3, '0')}</span><h2>${element.name}</h2><p class="periodic-detail-intro">${meta.label} · ${group} · Período ${position.period}</p>
                <div class="periodic-facts"><div><span>Número atômico</span><strong>${element.number}</strong></div><div><span>Massa atômica</span><strong>${mass} u</strong></div><div><span>Estado padrão</span><strong>${core.stateLabel(element.state)}</strong></div><div><span>Configuração eletrônica</span><strong>${element.configuration || '—'}</strong></div></div>
                <a href="https://pubchem.ncbi.nlm.nih.gov/element/${encodeURIComponent(element.englishName.toLowerCase())}" target="_blank" rel="noopener noreferrer">Ver este elemento na PubChem <span aria-hidden="true">↗</span></a>
            </div>`;
    }

    function select(number, { scroll = false } = {}) {
        const element = elementsByNumber.get(Number(number));
        if (!element) return;
        selectedNumber = element.number;
        grid.querySelectorAll('[data-element]').forEach(button => {
            const active = Number(button.dataset.element) === selectedNumber;
            button.classList.toggle('is-selected', active);
            button.setAttribute('aria-pressed', String(active));
        });
        detail.innerHTML = detailMarkup(element);
        if (scroll) detail.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    function applyFilter() {
        const term = search.value;
        const category = family.value;
        let matches = 0;
        grid.querySelectorAll('[data-element]').forEach(button => {
            const match = core.matches(elementsByNumber.get(Number(button.dataset.element)), term, category);
            button.classList.toggle('is-dimmed', !match);
            if (match) matches++;
        });
        count.textContent = `${matches} ${matches === 1 ? 'elemento' : 'elementos'}`;
    }

    function initialize() {
        if (initialized) return;
        initialized = true;
        family.innerHTML = `<option value="">Todas as famílias</option>${Object.values(core.FAMILIES).map(item => `<option value="${item.key}">${item.label}</option>`).join('')}`;
        legend.innerHTML = Object.values(core.FAMILIES).map(item => `<span class="periodic-legend-item periodic-element--${item.key}"><i aria-hidden="true"></i>${item.label}</span>`).join('');
        const groups = Array.from({ length: 18 }, (_, index) => `<span class="periodic-axis periodic-axis--group" style="grid-column:${index + 2};grid-row:1">${index + 1}</span>`).join('');
        const periods = Array.from({ length: 7 }, (_, index) => `<span class="periodic-axis periodic-axis--period" style="grid-column:1;grid-row:${index + 2}">${index + 1}</span>`).join('');
        const series = `<button type="button" class="periodic-series-link" data-jump="57" style="grid-column:4;grid-row:7" aria-label="Ir para os lantanídeos">57–71 <span>↓</span></button><button type="button" class="periodic-series-link" data-jump="89" style="grid-column:4;grid-row:8" aria-label="Ir para os actinídeos">89–103 <span>↓</span></button><span class="periodic-series-label" style="grid-column:1 / span 4;grid-row:10">Lantanídeos</span><span class="periodic-series-label" style="grid-column:1 / span 4;grid-row:11">Actinídeos</span>`;
        grid.innerHTML = `${groups}${periods}${series}${data.map(elementMarkup).join('')}`;
        grid.addEventListener('click', event => {
            const elementButton = event.target.closest('[data-element]');
            if (elementButton) return select(elementButton.dataset.element, { scroll: window.innerWidth < 760 });
            const jump = event.target.closest('[data-jump]');
            if (jump) grid.querySelector(`[data-element="${jump.dataset.jump}"]`)?.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' });
        });
        search.addEventListener('input', applyFilter);
        search.addEventListener('keydown', event => {
            if (event.key !== 'Enter') return;
            const exact = data.find(element => core.normalize(element.symbol) === core.normalize(search.value) || String(element.number) === search.value.trim());
            const first = exact && core.matches(exact, search.value, family.value) ? exact : data.find(element => core.matches(element, search.value, family.value));
            if (!first) return;
            event.preventDefault();
            select(first.number, { scroll: true });
        });
        family.addEventListener('change', applyFilter);
        select(selectedNumber);
        applyFilter();
    }

    globalThis.KingPeriodic = { render: initialize, select };
    if (section.classList.contains('active')) initialize();
})();
