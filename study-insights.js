/* A second view of completed study sessions, fitted into the weekly card's unused area. */
(function () {
    'use strict';

    const WEEK = 'week';
    let period = WEEK;
    let widget, panel, toggle, resizeObserver, chartObserver;
    let scheduledFrame = 0;
    let lastSignature = '';
    let compactOpen = false;

    function dateKey(value) {
        return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, '0')}-${String(value.getDate()).padStart(2, '0')}`;
    }

    function calendarKey(year, month, day) {
        const date = new Date(year, month, day, 12);
        if (date.getFullYear() !== year || date.getMonth() !== month || date.getDate() !== day) return '';
        return dateKey(date);
    }

    function sessionDate(item) {
        const iso = typeof item.dataISO === 'string' && item.dataISO.match(/^(\d{4})-(\d{2})-(\d{2})$/);
        if (iso) {
            const date = calendarKey(Number(iso[1]), Number(iso[2]) - 1, Number(iso[3]));
            if (date) return date;
        }
        const legacy = String(item.dataChave || '').match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
        if (legacy) {
            const date = calendarKey(Number(legacy[1]), Number(legacy[2]), Number(legacy[3]));
            if (date) return date;
        }
        const timestamp = Number(item.id);
        if (!Number.isFinite(timestamp) || timestamp <= 0) return '';
        const date = new Date(timestamp);
        return Number.isNaN(date.getTime()) ? '' : dateKey(date);
    }

    function aggregate(data, selectedPeriod = WEEK, today = new Date()) {
        const monday = new Date(today);
        monday.setDate(monday.getDate() - (monday.getDay() + 6) % 7);
        const firstDay = dateKey(monday);
        const lastDay = dateKey(today);
        const subjects = new Map();
        for (const item of Array.isArray(data?.cycleItems) ? data.cycleItems : []) {
            if (typeof item?.subject === 'string') subjects.set(item.subject.trim().toLocaleLowerCase('pt-BR'), item);
        }
        const totals = new Map();
        let totalSeconds = 0;
        let sessionCount = 0;
        for (const item of Array.isArray(data?.historyItems) ? data.historyItems : []) {
            if (!item || typeof item !== 'object') continue;
            if (typeof item.tempoSegundos !== 'number' && typeof item.tempoSegundos !== 'string') continue;
            const seconds = Number(item.tempoSegundos);
            if (!Number.isFinite(seconds) || seconds <= 0 || seconds > Number.MAX_SAFE_INTEGER) continue;
            const date = sessionDate(item);
            if (selectedPeriod === WEEK && (!date || date < firstDay || date > lastDay)) continue;
            const name = typeof item.materia === 'string' && item.materia.trim() ? item.materia.trim() : 'Estudo livre';
            const key = name.toLocaleLowerCase('pt-BR');
            const subject = subjects.get(key);
            const group = totals.get(key) || { name: subject?.subject?.trim() || name, seconds: 0, color: subject?.color || item.cor || '', sessions: 0 };
            group.seconds += seconds;
            group.sessions++;
            totals.set(key, group);
            totalSeconds += seconds;
            sessionCount++;
        }
        const allGroups = [...totals.values()].sort((a, b) => b.seconds - a.seconds || a.name.localeCompare(b.name, 'pt-BR'));
        const groups = allGroups.slice(0, allGroups.length > 4 ? 3 : 4);
        if (allGroups.length > 4) {
            groups.push({
                name: 'Outras matérias',
                seconds: allGroups.slice(3).reduce((sum, group) => sum + group.seconds, 0),
                sessions: allGroups.slice(3).reduce((sum, group) => sum + group.sessions, 0),
                color: '',
                names: allGroups.slice(3).map(group => group.name).join(', ')
            });
        }
        return { totalSeconds, sessionCount, subjectCount: allGroups.length, groups };
    }

    function shortTime(seconds) {
        if (seconds > 0 && seconds < 60) return '< 1min';
        const minutes = Math.floor(seconds / 60);
        return minutes >= 60 ? `${Math.floor(minutes / 60)}h${String(minutes % 60).padStart(2, '0')}` : `${minutes}min`;
    }

    function make(tag, className, text) {
        const element = document.createElement(tag);
        if (className) element.className = className;
        if (text !== undefined) element.textContent = text;
        return element;
    }

    function colorFor(group, index) {
        if (/^#[0-9a-f]{3,8}$/i.test(group.color) && CSS.supports('color', group.color)) return group.color;
        return ['var(--accent-color)', 'color-mix(in srgb, var(--accent-color) 56%, #7957cf)', 'color-mix(in srgb, var(--accent-color) 45%, #28b49b)', 'var(--text-muted)'][index];
    }

    function paint(model) {
        const heading = make('div', 'study-insights-heading');
        const labels = make('div');
        const title = make('h3', '', 'Foco por matéria');
        title.id = 'studyInsightsTitle';
        labels.append(title, make('p', '', 'Como você dividiu seu tempo'));
        const select = make('select', 'study-insights-period');
        select.setAttribute('aria-label', 'Período da distribuição por matéria');
        for (const [value, label] of [[WEEK, 'Semana'], ['all', 'Histórico']]) {
            const option = make('option', '', label);
            option.value = value;
            select.append(option);
        }
        select.value = period;
        select.addEventListener('change', () => { period = select.value; render(); });
        const close = make('button', 'study-insights-close', '×');
        close.type = 'button';
        close.setAttribute('aria-label', 'Fechar distribuição por matéria');
        close.addEventListener('click', () => { compactOpen = false; position(); toggle.focus(); });
        heading.append(labels, select, close);

        const body = make('div', 'study-insights-body');
        const ring = make('div', 'study-insights-ring');
        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.setAttribute('viewBox', '0 0 160 160');
        svg.setAttribute('aria-hidden', 'true');
        const circle = document.createElementNS(svg.namespaceURI, 'circle');
        circle.setAttribute('cx', '80'); circle.setAttribute('cy', '80'); circle.setAttribute('r', '62');
        circle.setAttribute('class', 'study-insights-track');
        svg.append(circle);
        const center = make('div', 'study-insights-center');
        const value = make('strong', '', shortTime(model.totalSeconds));
        const description = make('span', '', 'finalizados');
        center.append(value, description);
        const resetHighlight = () => {
            value.textContent = shortTime(model.totalSeconds);
            description.textContent = 'finalizados';
            ring.removeAttribute('data-selected');
            svg.querySelectorAll('.study-insights-arc').forEach(arc => arc.classList.remove('is-selected', 'is-dimmed'));
        };
        const legend = make('ul', 'study-insights-legend');
        let offset = 0;
        const circumference = 2 * Math.PI * 62;
        model.groups.forEach((group, index) => {
            const percent = 100 * group.seconds / model.totalSeconds;
            const segment = circumference * group.seconds / model.totalSeconds;
            const gap = model.groups.length > 1 ? Math.min(4, segment * .18) : 0;
            const arc = circle.cloneNode();
            arc.setAttribute('class', 'study-insights-arc');
            arc.style.setProperty('--subject-color', colorFor(group, index));
            arc.setAttribute('stroke-dasharray', `${segment - gap} ${circumference - segment + gap}`);
            arc.setAttribute('stroke-dashoffset', String(-offset));
            svg.append(arc);
            offset += segment;
            const row = make('li');
            const button = make('button', 'study-insights-subject');
            button.type = 'button';
            button.style.setProperty('--subject-color', colorFor(group, index));
            const roundedPercent = percent < 1 ? '< 1%' : `${Math.round(percent)}%`;
            button.setAttribute('aria-label', `${group.name}: ${shortTime(group.seconds)}, ${roundedPercent} do tempo finalizado${group.names ? `. Inclui ${group.names}` : ''}`);
            button.title = group.names ? `${group.name}: ${group.names}` : group.name;
            const info = make('span', 'study-insights-subject-info');
            info.append(make('span', 'study-insights-subject-name', group.name), make('small', '', shortTime(group.seconds)));
            button.append(make('i', 'study-insights-dot'), info, make('strong', '', roundedPercent));
            const highlight = () => {
                value.textContent = shortTime(group.seconds);
                description.textContent = group.name;
                ring.dataset.selected = String(index);
                svg.querySelectorAll('.study-insights-arc').forEach((item, i) => {
                    item.classList.toggle('is-selected', i === index);
                    item.classList.toggle('is-dimmed', i !== index);
                });
            };
            button.addEventListener('pointerenter', highlight);
            button.addEventListener('pointerleave', () => { if (document.activeElement !== button) resetHighlight(); });
            button.addEventListener('focus', highlight);
            button.addEventListener('blur', resetHighlight);
            button.addEventListener('click', highlight);
            row.append(button);
            legend.append(row);
        });
        ring.append(svg, center);
        body.append(ring);
        if (model.groups.length) {
            body.append(legend);
        } else {
            const empty = make('div', 'study-insights-empty');
            empty.append(make('strong', '', 'Seu próximo foco começa aqui'), make('p', '', period === WEEK ? 'Finalize uma sessão nesta semana para descobrir sua distribuição.' : 'As sessões que você concluir aparecerão aqui.'));
            body.append(empty);
        }
        const footer = make('p', 'study-insights-footer');
        footer.append(make('span', '', model.sessionCount ? `${model.subjectCount} ${model.subjectCount === 1 ? 'matéria' : 'matérias'} · ${model.sessionCount} ${model.sessionCount === 1 ? 'sessão' : 'sessões'}` : 'Nenhuma sessão concluída'));
        footer.append(make('span', '', 'Só sessões finalizadas'));
        panel.replaceChildren(heading, body, footer);
        panel.classList.toggle('is-empty', !model.groups.length);
    }

    function position() {
        scheduledFrame = 0;
        if (!widget || !panel) return;
        const plot = widget.querySelector('#weeklyChart .chart-plot');
        if (!plot || !widget.getClientRects().length) return;
        const cardRect = widget.getBoundingClientRect();
        const plotRect = plot.getBoundingClientRect();
        const style = getComputedStyle(widget);
        const insetLeft = parseFloat(style.paddingLeft) || 20;
        const insetRight = parseFloat(style.paddingRight) || 20;
        const insetBottom = parseFloat(style.paddingBottom) || 20;
        const top = plotRect.bottom - cardRect.top + 20;
        const available = cardRect.height - insetBottom - top;
        const inline = available >= 158;
        panel.dataset.density = available < 208 ? 'compact' : 'comfortable';
        panel.classList.toggle('is-overlay', !inline && compactOpen);
        panel.hidden = !inline && !compactOpen;
        panel.style.left = `${insetLeft}px`;
        panel.style.right = `${insetRight}px`;
        panel.style.top = `${inline ? top : Math.min(76, top)}px`;
        panel.style.bottom = `${inline ? insetBottom : 14}px`;
        toggle.hidden = inline;
        toggle.style.right = `${insetRight}px`;
        toggle.setAttribute('aria-expanded', String(!inline && compactOpen));
        if (inline) compactOpen = false;
    }

    function schedulePosition() {
        if (!scheduledFrame) scheduledFrame = requestAnimationFrame(position);
    }

    function mount() {
        if (panel) return true;
        widget = document.querySelector('.weekly-study-widget');
        if (!widget) return false;
        panel = make('section', 'study-insights');
        panel.id = 'studyInsights';
        panel.hidden = true;
        panel.setAttribute('aria-labelledby', 'studyInsightsTitle');
        toggle = make('button', 'study-insights-toggle', '◔ Ver por matéria');
        toggle.type = 'button';
        toggle.hidden = true;
        toggle.setAttribute('aria-controls', panel.id);
        toggle.setAttribute('aria-expanded', 'false');
        toggle.addEventListener('click', () => {
            compactOpen = !compactOpen;
            position();
            if (compactOpen) panel.querySelector('select')?.focus();
        });
        panel.addEventListener('keydown', event => {
            if (event.key === 'Escape' && compactOpen) {
                compactOpen = false;
                position();
                toggle.focus();
            }
        });
        widget.append(panel, toggle);
        if (typeof ResizeObserver !== 'undefined') {
            resizeObserver = new ResizeObserver(schedulePosition);
            resizeObserver.observe(widget);
        }
        const chart = widget.querySelector('#weeklyChart');
        if (chart) {
            chartObserver = new MutationObserver(schedulePosition);
            chartObserver.observe(chart, { childList: true });
        }
        window.addEventListener('resize', schedulePosition, { passive: true });
        document.fonts?.ready.then(schedulePosition);
        return true;
    }

    function render(data) {
        if (!mount()) return;
        const source = data || window.kingMasterCloudBridge?.exportData?.() || {};
        const model = aggregate(source, period);
        const signature = JSON.stringify([period, model]);
        if (signature !== lastSignature) {
            lastSignature = signature;
            paint(model);
        }
        schedulePosition();
    }

    window.KingMasterStudyInsights = { render, aggregate };
    if (typeof document !== 'undefined') {
        window.addEventListener('king-master-data-changed', () => render());
        if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => render(), { once: true });
        else render();
    }
})();
