(() => {
    'use strict';

    const normalize = value => String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('pt-BR').trim();
    const state = { open: false, items: [], filtered: [], active: 0, previousFocus: null };

    function readDestinations() {
        const seen = new Set();
        return [...document.querySelectorAll('#mainNavigation .menu-btn[data-section]')].map(button => {
            const section = button.dataset.section;
            const title = button.querySelector('.nav-item-label strong')?.textContent?.trim() || button.textContent.trim();
            const description = button.querySelector('.nav-item-label small')?.textContent?.trim() || '';
            return { section, title, description, hidden: button.closest('[hidden]') !== null };
        }).filter(item => item.section && item.title && !item.hidden && !seen.has(item.section) && seen.add(item.section));
    }

    function createUi() {
        if (document.getElementById('kmCommandPalette')) return;
        const trigger = document.createElement('button');
        trigger.type = 'button';
        trigger.id = 'kmCommandTrigger';
        trigger.className = 'km-command-trigger';
        trigger.setAttribute('aria-haspopup', 'dialog');
        trigger.setAttribute('aria-controls', 'kmCommandPalette');
        trigger.setAttribute('aria-expanded', 'false');
        trigger.innerHTML = '<span aria-hidden="true">⌕</span><strong>Buscar e navegar</strong><kbd>Ctrl K</kbd>';
        document.querySelector('#mainNavigation .nav-tools')?.prepend(trigger);

        const palette = document.createElement('div');
        palette.id = 'kmCommandPalette';
        palette.className = 'km-command-palette';
        palette.hidden = true;
        palette.innerHTML = `
            <button type="button" class="km-command-backdrop" tabindex="-1" aria-label="Fechar busca"></button>
            <section class="km-command-dialog" role="dialog" aria-modal="true" aria-labelledby="kmCommandTitle">
                <header><span aria-hidden="true">⌕</span><div><h2 id="kmCommandTitle">Onde você quer ir?</h2><p>Pesquise qualquer área do King Master.</p></div><button type="button" class="km-command-close" aria-label="Fechar busca">×</button></header>
                <label class="km-command-search" for="kmCommandInput"><span aria-hidden="true">⌕</span><input id="kmCommandInput" type="search" autocomplete="off" spellcheck="false" placeholder="Ex.: cronograma, revisões, perfil…" role="combobox" aria-autocomplete="list" aria-controls="kmCommandResults" aria-expanded="true" aria-activedescendant=""></label>
                <div class="km-command-results" id="kmCommandResults" role="listbox" aria-label="Destinos"></div>
                <footer><span><kbd>↑</kbd><kbd>↓</kbd> navegar</span><span><kbd>Enter</kbd> abrir</span><span><kbd>Esc</kbd> fechar</span></footer>
            </section>`;
        document.body.appendChild(palette);

        trigger.addEventListener('click', open);
        palette.querySelector('.km-command-backdrop').addEventListener('click', close);
        palette.querySelector('.km-command-close').addEventListener('click', close);
        palette.querySelector('#kmCommandInput').addEventListener('input', event => filter(event.target.value));
        palette.querySelector('#kmCommandResults').addEventListener('click', event => {
            const option = event.target.closest('[data-command-index]');
            if (option) select(Number(option.dataset.commandIndex));
        });
        palette.querySelector('.km-command-dialog').addEventListener('keydown', handleDialogKeys);
    }

    function render() {
        const results = document.getElementById('kmCommandResults');
        const input = document.getElementById('kmCommandInput');
        if (!results || !input) return;
        results.replaceChildren();
        state.filtered.forEach((item, index) => {
            const option = document.createElement('button');
            option.type = 'button';
            option.id = `km-command-option-${index}`;
            option.className = `km-command-option${index === state.active ? ' is-active' : ''}`;
            option.dataset.commandIndex = String(index);
            option.setAttribute('role', 'option');
            option.setAttribute('aria-selected', String(index === state.active));
            const mark = document.createElement('span');
            mark.className = 'km-command-option-mark';
            mark.setAttribute('aria-hidden', 'true');
            mark.textContent = String(index + 1).padStart(2, '0');
            const copy = document.createElement('span');
            copy.className = 'km-command-option-copy';
            const title = document.createElement('strong');
            title.textContent = item.title;
            const description = document.createElement('small');
            description.textContent = item.description || 'Abrir área';
            copy.append(title, description);
            const arrow = document.createElement('span');
            arrow.className = 'km-command-option-arrow';
            arrow.setAttribute('aria-hidden', 'true');
            arrow.textContent = '→';
            option.append(mark, copy, arrow);
            results.appendChild(option);
        });
        if (!state.filtered.length) {
            const empty = document.createElement('p');
            empty.className = 'km-command-empty';
            empty.textContent = 'Nenhuma área encontrada. Tente outro nome.';
            results.appendChild(empty);
            input.removeAttribute('aria-activedescendant');
        } else input.setAttribute('aria-activedescendant', `km-command-option-${state.active}`);
    }

    function filter(query = '') {
        const needle = normalize(query);
        state.filtered = state.items.filter(item => !needle || normalize(`${item.title} ${item.description} ${item.section}`).includes(needle));
        state.active = 0;
        render();
    }

    function open() {
        const palette = document.getElementById('kmCommandPalette');
        if (!palette || state.open) return;
        state.items = readDestinations();
        state.previousFocus = document.activeElement;
        state.open = true;
        palette.hidden = false;
        document.body.classList.add('km-command-open');
        document.getElementById('kmCommandTrigger')?.setAttribute('aria-expanded', 'true');
        const input = document.getElementById('kmCommandInput');
        input.value = '';
        filter('');
        requestAnimationFrame(() => input.focus());
    }

    function close() {
        const palette = document.getElementById('kmCommandPalette');
        if (!palette || !state.open) return;
        state.open = false;
        palette.hidden = true;
        document.body.classList.remove('km-command-open');
        document.getElementById('kmCommandTrigger')?.setAttribute('aria-expanded', 'false');
        if (state.previousFocus?.isConnected) state.previousFocus.focus();
    }

    function select(index) {
        const item = state.filtered[index];
        if (!item) return;
        close();
        if (typeof window.showSection === 'function') window.showSection(item.section);
        else document.querySelector(`#mainNavigation [data-section="${CSS.escape(item.section)}"]`)?.click();
    }

    function handleDialogKeys(event) {
        if (event.key === 'Escape') { event.preventDefault(); close(); return; }
        if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
            event.preventDefault();
            if (!state.filtered.length) return;
            state.active = (state.active + (event.key === 'ArrowDown' ? 1 : -1) + state.filtered.length) % state.filtered.length;
            render();
            document.getElementById(`km-command-option-${state.active}`)?.scrollIntoView({ block: 'nearest' });
            return;
        }
        if (event.key === 'Enter' && document.activeElement?.id === 'kmCommandInput') {
            event.preventDefault();
            select(state.active);
            return;
        }
        if (event.key === 'Tab') {
            const focusable = [...document.querySelectorAll('#kmCommandPalette .km-command-dialog button:not([disabled]), #kmCommandPalette .km-command-dialog input')];
            if (!focusable.length) return;
            const first = focusable[0], last = focusable.at(-1);
            if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
            else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
        }
    }

    document.addEventListener('keydown', event => {
        const typing = event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement || event.target?.isContentEditable;
        if ((event.ctrlKey || event.metaKey) && event.key.toLocaleLowerCase('pt-BR') === 'k') {
            event.preventDefault();
            state.open ? close() : open();
        } else if (event.key === '/' && !typing && !state.open) {
            event.preventDefault();
            open();
        }
    });

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', createUi, { once: true });
    else createUi();
    window.KingCommandPalette = Object.freeze({ open, close });
})();
