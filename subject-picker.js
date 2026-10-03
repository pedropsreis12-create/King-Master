/* Seletor reutilizável de matérias cadastradas. Não cria cópias das matérias. */
(() => {
    function create(root, options = {}) {
        if (!root) throw new Error('O seletor precisa de um elemento de destino.');
        let selected = [];
        let query = '';
        const subjects = () => Array.isArray(options.subjects?.()) ? options.subjects() : [];
        const valid = ids => [...new Set((Array.isArray(ids) ? ids : [ids]).map(String))]
            .filter(id => subjects().some(item => String(item.id) === id));
        root.classList.add('km-subject-picker');
        root.setAttribute('role', 'group');
        if (!root.hasAttribute('aria-labelledby')) root.setAttribute('aria-label', options.label || 'Selecionar matérias');
        const trigger = document.createElement('button');
        trigger.type = 'button'; trigger.className = 'km-subject-trigger';
        trigger.setAttribute('aria-expanded', 'false');
        const chips = document.createElement('div'); chips.className = 'km-subject-chips'; chips.setAttribute('aria-label', 'Matérias selecionadas');
        const prompt = document.createElement('span');
        const arrow = document.createElement('span'); arrow.setAttribute('aria-hidden', 'true'); arrow.textContent = '⌄';
        trigger.append(prompt, arrow);
        const panel = document.createElement('div'); panel.className = 'km-subject-panel'; panel.hidden = true;
        const search = document.createElement('input'); search.type = 'search'; search.placeholder = 'Pesquisar matéria'; search.setAttribute('aria-label', 'Pesquisar matéria');
        const actions = document.createElement('div'); actions.className = 'km-subject-actions';
        const all = document.createElement('button'); all.type = 'button'; all.textContent = 'Selecionar todas';
        all.hidden = options.allowAll === false;
        const clear = document.createElement('button'); clear.type = 'button'; clear.textContent = 'Limpar';
        actions.append(all, clear);
        const list = document.createElement('div'); list.className = 'km-subject-list';
        panel.append(search, actions, list); root.replaceChildren(chips, trigger, panel);
        const norm = value => String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('pt-BR');
        function render() {
            selected = valid(selected);
            chips.replaceChildren();
            chips.hidden = !selected.length;
            prompt.textContent = selected.length ? 'Adicionar ou remover matérias' : options.placeholder || 'Escolha as matérias';
            selected.forEach(id => {
                const name = subjects().find(item => String(item.id) === id)?.subject || '';
                const chip = document.createElement('button'); chip.type = 'button'; chip.className = 'km-subject-chip'; chip.dataset.subjectRemove = id;
                chip.textContent = `${name} ×`; chip.setAttribute('aria-label', `Remover ${name}`); chips.append(chip);
            });
            list.replaceChildren();
            const visible = subjects().filter(item => norm(item.subject).includes(norm(query)));
            if (!visible.length) { const empty = document.createElement('p'); empty.textContent = 'Nenhuma matéria encontrada.'; list.append(empty); }
            visible.forEach(item => {
                const label = document.createElement('label'); label.className = 'km-subject-option';
                const checkbox = document.createElement('input'); checkbox.type = 'checkbox'; checkbox.value = String(item.id); checkbox.checked = selected.includes(String(item.id));
                const name = document.createElement('span'); name.textContent = item.subject;
                label.append(checkbox, name); list.append(label);
            });
        }
        function set(ids, notify = false) { selected = valid(ids); render(); if (notify) options.onChange?.([...selected]); }
        function close() { panel.hidden = true; trigger.setAttribute('aria-expanded', 'false'); }
        trigger.addEventListener('click', () => { panel.hidden = !panel.hidden; trigger.setAttribute('aria-expanded', String(!panel.hidden)); if (!panel.hidden) search.focus(); });
        search.addEventListener('input', () => { query = search.value; render(); });
        list.addEventListener('change', event => {
            if (event.target.type !== 'checkbox') return;
            const next = new Set(selected);
            if (event.target.checked) next.add(event.target.value); else next.delete(event.target.value);
            set([...next], true);
        });
        all.addEventListener('click', () => set(subjects().map(item => item.id), true));
        clear.addEventListener('click', () => set([], true));
        chips.addEventListener('click', event => { const chip = event.target.closest('[data-subject-remove]'); if (chip) set(selected.filter(id => id !== chip.dataset.subjectRemove), true); });
        root.addEventListener('keydown', event => { if (event.key === 'Escape') { close(); trigger.focus(); } });
        document.addEventListener('pointerdown', event => { if (!root.contains(event.target)) close(); });
        set(options.selected || []);
        return { get: () => [...selected], set, refresh: render, close };
    }
    window.KingSubjectPicker = { create };
})();
