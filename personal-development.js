/* Espaço pessoal configurável. Os dados antigos permanecem guardados, sem impor o painel anterior. */
(() => {
    const byId = id => document.getElementById(id);
    const escape = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
    const today = () => typeof dataLocalISO === 'function' ? dataLocalISO(new Date()) : new Date().toISOString().slice(0, 10);
    const uniqueId = prefix => `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const spaces = () => appData.personalDevelopment.spaces;
    let selectedId = null;

    function ensure() {
        if (!appData.personalDevelopment || typeof appData.personalDevelopment !== 'object') appData.personalDevelopment = { spaces: [], checkins: {}, commitment: '', version: 2 };
        if (!Array.isArray(appData.personalDevelopment.spaces)) appData.personalDevelopment.spaces = [];
        appData.personalDevelopment.spaces.forEach(space => {
            if (!Array.isArray(space.items)) space.items = [];
            if (!Array.isArray(space.notes)) space.notes = [];
            if (!space.id) space.id = uniqueId('area');
        });
    }

    function selected() {
        const index = spaces().findIndex(space => space.id === selectedId);
        return { index, space: spaces()[index] || null };
    }

    function safeColor(value) { return /^#[0-9a-f]{6}$/i.test(String(value)) ? value : '#3288ed'; }
    function persist(success) {
        try { saveAppData(); if (success) showToast(success); return true; }
        catch { showToast('Não foi possível salvar. Verifique o espaço disponível e tente novamente.', true); render(); return false; }
    }

    function render() {
        if (!byId('desenvolvimento')) return;
        ensure();
        if (!spaces().some(space => space.id === selectedId)) selectedId = spaces()[0]?.id || null;
        const habits = spaces().flatMap(space => space.items.filter(item => item.type === 'habit'));
        const goals = spaces().flatMap(space => space.items.filter(item => item.type === 'goal'));
        const notes = spaces().reduce((sum, space) => sum + space.notes.length, 0);
        const doneToday = habits.filter(item => item.checkins?.[today()]).length;
        byId('personalMetrics').innerHTML = [
            [spaces().length, 'áreas criadas'],
            [`${doneToday}/${habits.length}`, 'hábitos hoje'],
            [`${goals.filter(item => Number(item.current) >= Number(item.target)).length}/${goals.length}`, 'metas alcançadas'],
            [notes, 'anotações']
        ].map(([value, label]) => `<div><strong>${value}</strong><span>${label}</span></div>`).join('');
        byId('personalSpaceList').innerHTML = spaces().length ? spaces().map((space, index) => {
            const count = space.items.length;
            return `<button type="button" class="personal-space-tab ${space.id === selectedId ? 'active' : ''}" style="--space-color:${safeColor(space.color)}" onclick="KingPersonalDevelopment.selectSpace(${index})" aria-current="${space.id === selectedId ? 'true' : 'false'}"><span class="personal-space-dot"></span><span><strong>${escape(space.name || 'Sem nome')}</strong><small>${count} ${count === 1 ? 'acompanhamento' : 'acompanhamentos'} · ${space.notes.length} ${space.notes.length === 1 ? 'nota' : 'notas'}</small></span><span aria-hidden="true">›</span></button>`;
        }).join('') : '<p class="personal-list-empty">Nenhuma área criada. Comece por algo importante para você.</p>';
        const { space, index } = selected();
        byId('personalSpaceDetail').innerHTML = space ? renderSpace(space, index) : `<div class="personal-empty widget"><span class="personal-empty-symbol" aria-hidden="true">◇</span><span class="workspace-kicker">SEM MODELO PRONTO</span><h2>O que você quer desenvolver?</h2><p>Crie uma área para qualquer necessidade. Dentro dela, você decide se quer acompanhar hábitos, metas numéricas ou apenas registrar anotações.</p><button type="button" class="cycle-btn primary" onclick="KingPersonalDevelopment.openSpace()">Criar minha primeira área</button></div>`;
    }

    function renderSpace(space, spaceIndex) {
        const color = safeColor(space.color);
        const habits = space.items.map((item, index) => ({ item, index })).filter(({ item }) => item.type === 'habit');
        const goals = space.items.map((item, index) => ({ item, index })).filter(({ item }) => item.type === 'goal');
        const habitHtml = habits.length ? habits.map(({ item, index }) => {
            const checked = Boolean(item.checkins?.[today()]);
            const weekCount = Array.from({ length: 7 }, (_, offset) => {
                const date = new Date(); date.setHours(12, 0, 0, 0); date.setDate(date.getDate() - offset);
                const key = typeof dataLocalISO === 'function' ? dataLocalISO(date) : date.toISOString().slice(0, 10);
                return Boolean(item.checkins?.[key]);
            }).filter(Boolean).length;
            return `<article class="personal-track-card"><button type="button" class="personal-habit-toggle ${checked ? 'checked' : ''}" aria-pressed="${checked}" onclick="KingPersonalDevelopment.toggleHabit(${spaceIndex},${index})"><span aria-hidden="true">${checked ? '✓' : '○'}</span><span>${escape(item.name || 'Hábito')}</span></button><small>${weekCount} de 7 dias recentes</small><div class="personal-track-actions"><button type="button" onclick="KingPersonalDevelopment.openItem(${index})">Editar</button><button type="button" onclick="KingPersonalDevelopment.deleteItem(${index})">Excluir</button></div></article>`;
        }).join('') : '<p class="personal-inline-empty">Sem hábitos. Adicione um se quiser marcar seus dias.</p>';
        const goalHtml = goals.length ? goals.map(({ item, index }) => {
            const current = Math.max(0, Number(item.current) || 0), target = Math.max(1, Number(item.target) || 1);
            const percent = Math.min(100, Math.round(current / target * 100));
            return `<article class="personal-track-card"><div class="personal-goal-head"><strong>${escape(item.name || 'Meta')}</strong><span>${current} / ${target} ${escape(item.unit || '')}</span></div><div class="personal-goal-track" role="progressbar" aria-label="${escape(item.name || 'Meta')}" aria-valuemin="0" aria-valuenow="${Math.min(current, target)}" aria-valuemax="${target}"><span style="width:${percent}%"></span></div><div class="personal-goal-controls"><button type="button" aria-label="Diminuir ${escape(item.name)}" onclick="KingPersonalDevelopment.changeGoal(${spaceIndex},${index},-1)">−</button><input type="number" min="0" max="1000000" step="1" value="${current}" aria-label="Progresso de ${escape(item.name)}" onchange="KingPersonalDevelopment.setGoal(${spaceIndex},${index},this.value)"><button type="button" aria-label="Aumentar ${escape(item.name)}" onclick="KingPersonalDevelopment.changeGoal(${spaceIndex},${index},1)">+</button><button type="button" class="personal-text-action" onclick="KingPersonalDevelopment.openItem(${index})">Editar</button><button type="button" class="personal-text-action" onclick="KingPersonalDevelopment.deleteItem(${index})">Excluir</button></div></article>`;
        }).join('') : '<p class="personal-inline-empty">Sem metas numéricas. Adicione uma apenas se medir ajudar você.</p>';
        const noteHtml = space.notes.length ? [...space.notes].reverse().map((note, reverseIndex) => {
            const index = space.notes.length - 1 - reverseIndex;
            const date = new Date(note.createdAt || Date.now()).toLocaleDateString('pt-BR');
            return `<article class="personal-note"><div><time>${date}</time><div><button type="button" onclick="KingPersonalDevelopment.openNote(${index})">Editar</button><button type="button" onclick="KingPersonalDevelopment.deleteNote(${index})">Excluir</button></div></div><p>${escape(note.text || '').replace(/\n/g, '<br>')}</p></article>`;
        }).join('') : '<p class="personal-inline-empty">Nenhuma anotação nesta área.</p>';
        return `<div class="personal-area-head widget" style="--space-color:${color}"><div><span class="workspace-kicker">MINHA ÁREA</span><h2>${escape(space.name || 'Sem nome')}</h2><p>${space.description ? escape(space.description) : 'Use este espaço do seu jeito. Você pode ajustar o propósito quando quiser.'}</p></div><div class="personal-area-actions"><button type="button" class="cycle-btn" onclick="KingPersonalDevelopment.openSpace(${spaceIndex})">Editar área</button><button type="button" class="cycle-btn personal-delete" onclick="KingPersonalDevelopment.deleteSpace(${spaceIndex})">Excluir área</button></div></div><div class="personal-detail-grid"><section class="widget personal-module"><header><div><span class="workspace-kicker">RITMO</span><h3>Hábitos</h3></div><button type="button" class="cycle-btn" onclick="KingPersonalDevelopment.openItem(null,'habit')">+ Hábito</button></header><div class="personal-module-list">${habitHtml}</div></section><section class="widget personal-module"><header><div><span class="workspace-kicker">AVANÇO</span><h3>Metas</h3></div><button type="button" class="cycle-btn" onclick="KingPersonalDevelopment.openItem(null,'goal')">+ Meta</button></header><div class="personal-module-list">${goalHtml}</div></section></div><section class="widget personal-module personal-notes-module"><header><div><span class="workspace-kicker">REGISTROS LIVRES</span><h3>Anotações</h3></div><button type="button" class="cycle-btn" onclick="KingPersonalDevelopment.openNote()">+ Anotação</button></header><div class="personal-note-list">${noteHtml}</div></section>`;
    }

    function selectSpace(index) { selectedId = spaces()[index]?.id || null; render(); }
    function openSpace(index = null) {
        ensure();
        const space = Number.isInteger(index) ? spaces()[index] : null;
        byId('personalSpaceModalTitle').textContent = space ? 'Editar área' : 'Criar área';
        byId('personalSpaceId').value = space ? String(index) : '';
        byId('personalSpaceName').value = space?.name || '';
        byId('personalSpaceDescription').value = space?.description || '';
        byId('personalSpaceColor').value = safeColor(space?.color);
        byId('personalSpaceModal').classList.add('active');
        byId('personalSpaceName').focus();
    }
    function saveSpace(event) {
        event.preventDefault(); ensure();
        const name = byId('personalSpaceName').value.trim().slice(0, 70);
        if (!name) return;
        const rawIndex = byId('personalSpaceId').value;
        const index = rawIndex === '' ? -1 : Number(rawIndex);
        const current = spaces()[index];
        if (!current && spaces().length >= 24) { showToast('Limite de 24 áreas atingido.', true); return; }
        const space = current || { id: uniqueId('area'), items: [], notes: [] };
        space.name = name;
        space.description = byId('personalSpaceDescription').value.trim().slice(0, 280);
        space.color = safeColor(byId('personalSpaceColor').value);
        if (!current) spaces().push(space);
        selectedId = space.id;
        if (persist(current ? 'Área atualizada.' : 'Área criada.')) fecharModal('personalSpaceModal');
    }

    function updateItemFields() { byId('personalGoalFields').hidden = byId('personalItemType').value !== 'goal'; }
    function openItem(index = null, type = 'habit') {
        const { space } = selected(); if (!space) return;
        const item = Number.isInteger(index) ? space.items[index] : null;
        byId('personalItemModalTitle').textContent = item ? 'Editar acompanhamento' : 'Novo acompanhamento';
        byId('personalItemId').value = item ? String(index) : '';
        byId('personalItemType').value = item?.type || type;
        byId('personalItemName').value = item?.name || '';
        byId('personalItemTarget').value = item?.target || 10;
        byId('personalItemUnit').value = item?.unit || '';
        updateItemFields();
        byId('personalItemModal').classList.add('active');
        byId('personalItemName').focus();
    }
    function saveItem(event) {
        event.preventDefault();
        const { space } = selected(); if (!space) return;
        const name = byId('personalItemName').value.trim().slice(0, 90);
        if (!name) return;
        const rawIndex = byId('personalItemId').value;
        const index = rawIndex === '' ? -1 : Number(rawIndex);
        const current = space.items[index];
        if (!current && space.items.length >= 40) { showToast('Limite de 40 acompanhamentos por área.', true); return; }
        const type = byId('personalItemType').value === 'goal' ? 'goal' : 'habit';
        const item = current || { id: uniqueId('item') };
        if (item.type !== type) { delete item.checkins; delete item.current; }
        item.type = type; item.name = name;
        if (type === 'goal') {
            item.target = Math.min(1000000, Math.max(1, Math.round(Number(byId('personalItemTarget').value) || 1)));
            item.unit = byId('personalItemUnit').value.trim().slice(0, 24);
            item.current = Math.max(0, Number(item.current) || 0);
        } else item.checkins = item.checkins && typeof item.checkins === 'object' ? item.checkins : {};
        if (!current) space.items.push(item);
        if (persist('Acompanhamento salvo.')) fecharModal('personalItemModal');
    }

    function toggleHabit(spaceIndex, itemIndex) {
        const item = spaces()[spaceIndex]?.items?.[itemIndex]; if (item?.type !== 'habit') return;
        if (!item.checkins || typeof item.checkins !== 'object') item.checkins = {};
        if (item.checkins[today()]) delete item.checkins[today()]; else item.checkins[today()] = true;
        persist();
    }
    function setGoal(spaceIndex, itemIndex, value) {
        const item = spaces()[spaceIndex]?.items?.[itemIndex]; if (item?.type !== 'goal') return;
        const number = Number(value); if (!Number.isFinite(number)) return;
        item.current = Math.min(1000000, Math.max(0, Math.round(number)));
        persist();
    }
    function changeGoal(spaceIndex, itemIndex, delta) {
        const item = spaces()[spaceIndex]?.items?.[itemIndex]; if (item?.type !== 'goal') return;
        setGoal(spaceIndex, itemIndex, (Number(item.current) || 0) + delta);
    }

    function openNote(index = null) {
        const { space } = selected(); if (!space) return;
        const note = Number.isInteger(index) ? space.notes[index] : null;
        byId('personalNoteModalTitle').textContent = note ? 'Editar anotação' : 'Nova anotação';
        byId('personalNoteId').value = note ? String(index) : '';
        byId('personalNoteText').value = note?.text || '';
        byId('personalNoteModal').classList.add('active');
        byId('personalNoteText').focus();
    }
    function saveNote(event) {
        event.preventDefault();
        const { space } = selected(); if (!space) return;
        const text = byId('personalNoteText').value.trim().slice(0, 3000);
        if (!text) return;
        const rawIndex = byId('personalNoteId').value;
        const index = rawIndex === '' ? -1 : Number(rawIndex);
        const current = space.notes[index];
        if (!current && space.notes.length >= 100) { showToast('Limite de 100 anotações por área.', true); return; }
        if (current) { current.text = text; current.updatedAt = Date.now(); }
        else space.notes.push({ id: uniqueId('nota'), text, createdAt: Date.now() });
        if (persist('Anotação salva.')) fecharModal('personalNoteModal');
    }

    function deleteSpace(index) {
        const space = spaces()[index]; if (!space) return;
        abrirModalDeletar('personalSpace', index, `Excluir a área “${space.name}”?`, 'Os hábitos, metas e anotações desta área serão removidos. Esta ação não pode ser desfeita.', 'Excluir área');
    }
    function deleteItem(index) {
        const { space, index: spaceIndex } = selected(); if (!space?.items?.[index]) return;
        abrirModalDeletar('personalItem', `${spaceIndex}:${index}`, 'Excluir este acompanhamento?', 'O histórico deste hábito ou o progresso desta meta também será apagado.', 'Excluir');
    }
    function deleteNote(index) {
        const { space, index: spaceIndex } = selected(); if (!space?.notes?.[index]) return;
        abrirModalDeletar('personalNote', `${spaceIndex}:${index}`, 'Excluir esta anotação?', 'O texto será removido desta área.', 'Excluir');
    }
    function confirmDelete(type, id) {
        if (type === 'personalSpace') {
            const index = Number(id); if (!spaces()[index]) return;
            const removedId = spaces()[index].id;
            spaces().splice(index, 1);
            if (selectedId === removedId) selectedId = spaces()[Math.min(index, spaces().length - 1)]?.id || null;
        } else {
            const [spaceIndex, itemIndex] = String(id).split(':').map(Number);
            const collection = type === 'personalItem' ? spaces()[spaceIndex]?.items : spaces()[spaceIndex]?.notes;
            if (!collection?.[itemIndex]) return;
            collection.splice(itemIndex, 1);
        }
        persist('Removido do Desenvolvimento Pessoal.');
    }

    window.KingPersonalDevelopment = { render, selectSpace, openSpace, saveSpace, openItem, saveItem, updateItemFields, toggleHabit, setGoal, changeGoal, openNote, saveNote, deleteSpace, deleteItem, deleteNote, confirmDelete };
    render();
})();
