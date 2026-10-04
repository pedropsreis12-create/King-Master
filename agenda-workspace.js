(() => {
    const byId = id => document.getElementById(id);
    const defaults = [
        { id: 'estudo', name: 'Estudo', color: '#328bdf' },
        { id: 'prova', name: 'Prova', color: '#9b62dd' },
        { id: 'redacao', name: 'Redação', color: '#db7b37' },
        { id: 'pessoal', name: 'Pessoal', color: '#24a882' },
        { id: 'sem-categoria', name: 'Sem categoria', color: '#778196' }
    ];
    const normalize = value => String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('pt-BR').trim();
    const validColor = value => /^#[\da-f]{6}$/i.test(String(value || '')) ? value : '#778196';
    const validDate = value => {
        if (!/^\d{4}-\d{2}-\d{2}$/.test(String(value || ''))) return false;
        const [y, m, d] = value.split('-').map(Number);
        const date = new Date(y, m - 1, d);
        return date.getFullYear() === y && date.getMonth() === m - 1 && date.getDate() === d;
    };
    const validTime = value => !value || /^([01]\d|2[0-3]):[0-5]\d$/.test(value);
    const keyFor = item => `${normalize(item.title)}|${item.date}|${item.time || ''}`;
    const state = { file: null, suggestions: [], request: 0, busy: false };

    function ensureCategories() {
        if (!Array.isArray(appData.agendaCategories)) {
            appData.agendaCategories = defaults.map(item => ({ ...item }));
            for (const item of appData.agendamentoItems || []) {
                const name = String(item.type || '').trim().slice(0, 32);
                if (name && !appData.agendaCategories.some(category => normalize(category.name) === normalize(name))) {
                    appData.agendaCategories.push({ id: `legacy-${appData.agendaCategories.length}`, name, color: '#778196' });
                }
            }
        }
        appData.agendaCategories.splice(50);
        for (let index = appData.agendaCategories.length - 1; index >= 0; index--) {
            const item = appData.agendaCategories[index];
            if (!item || typeof item.id !== 'string' || typeof item.name !== 'string') appData.agendaCategories.splice(index, 1);
            else { item.id = item.id.slice(0, 80); item.name = item.name.slice(0, 32); item.color = validColor(item.color); }
        }
        if (!appData.agendaCategories.some(item => item.id === 'sem-categoria')) appData.agendaCategories.push({ ...defaults[4] });
        return appData.agendaCategories;
    }
    function getCategory(id) { return ensureCategories().find(category => category.id === id) || null; }
    function categoryForItem(item) {
        const categories = ensureCategories();
        return categories.find(category => category.id === item?.categoryId)
            || categories.find(category => normalize(category.name) === normalize(item?.type))
            || getCategory('sem-categoria');
    }
    function categoryFromName(name) {
        return ensureCategories().find(item => normalize(item.name) === normalize(name)) || getCategory('sem-categoria');
    }
    function renderCategorySelect() {
        const categories = ensureCategories();
        for (const id of ['agendamentoTypeInput', 'agendaCategoryFilter']) {
            const select = byId(id);
            if (!select) continue;
            const previous = select.value;
            const options = id === 'agendaCategoryFilter' ? [{ id: '', name: 'Todas as categorias' }, ...categories] : categories;
            if (select.options.length === options.length && options.every((item, index) => select.options[index].value === item.id && select.options[index].textContent === item.name)) continue;
            select.replaceChildren(...options.map(item => new Option(item.name, item.id)));
            if (options.some(item => item.id === previous)) select.value = previous;
        }
    }
    function renderCategories() {
        const list = byId('agendaCategoriesList');
        if (!list) return;
        list.replaceChildren(...ensureCategories().map(category => {
            const row = document.createElement('div'); row.className = 'agenda-category-row';
            const dot = document.createElement('span'); dot.className = 'agenda-category-dot'; dot.style.backgroundColor = validColor(category.color);
            const name = document.createElement('strong'); name.textContent = category.name;
            const count = document.createElement('small'); const total = (appData.agendamentoItems || []).filter(item => categoryForItem(item)?.id === category.id).length;
            count.textContent = `${total} compromisso${total === 1 ? '' : 's'}`;
            const edit = document.createElement('button'); edit.type = 'button'; edit.className = 'cycle-btn'; edit.textContent = 'Editar'; edit.addEventListener('click', () => editCategory(category.id));
            row.append(dot, name, count);
            if (category.id !== 'sem-categoria') {
                const remove = document.createElement('button'); remove.type = 'button'; remove.className = 'cycle-btn agenda-category-remove'; remove.textContent = 'Excluir'; remove.addEventListener('click', () => requestDeleteCategory(category.id, row));
                row.append(edit, remove);
            }
            return row;
        }));
    }
    function openCategories() { renderCategories(); byId('agendaCategoriesModal').classList.add('active'); }
    function closeCategories() { fecharModal('agendaCategoriesModal'); resetCategoryForm(); renderCategorySelect(); renderizarAgendamento(); }
    function resetCategoryForm() { byId('agendaCategoryForm').reset(); byId('agendaCategoryEditId').value = ''; byId('agendaCategorySaveButton').textContent = 'Adicionar'; }
    function editCategory(id) {
        const category = getCategory(id); if (!category) return;
        byId('agendaCategoryEditId').value = id; byId('agendaCategoryName').value = category.name; byId('agendaCategoryColor').value = validColor(category.color);
        byId('agendaCategorySaveButton').textContent = 'Salvar'; byId('agendaCategoryName').focus();
    }
    function saveCategory(event) {
        event.preventDefault();
        const id = byId('agendaCategoryEditId').value;
        const name = byId('agendaCategoryName').value.trim().replace(/\s+/g, ' ').slice(0, 32);
        const color = validColor(byId('agendaCategoryColor').value);
        if (!name || (id === 'sem-categoria')) return;
        const categories = ensureCategories();
        if (categories.some(item => item.id !== id && normalize(item.name) === normalize(name))) return showToast('Esta categoria já existe.', true);
        const snapshot = JSON.stringify({ categories: appData.agendaCategories, items: appData.agendamentoItems });
        if (id) {
            const category = getCategory(id); if (!category) return;
            const affected = new Set((appData.agendamentoItems || []).filter(item => categoryForItem(item)?.id === id).map(item => item.id));
            category.name = name; category.color = color;
            (appData.agendamentoItems || []).filter(item => affected.has(item.id)).forEach(item => { item.categoryId = id; item.type = name; });
        } else {
            if (categories.length >= 50) return showToast('Limite de 50 categorias atingido.', true);
            const newId = `cat-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
            categories.push({ id: newId, name, color });
            byId('agendamentoTypeInput').dataset.pendingCategory = newId;
        }
        try { saveAppData(); } catch {
            const old = JSON.parse(snapshot); appData.agendaCategories = old.categories; appData.agendamentoItems = old.items;
            showToast('Não foi possível salvar a categoria neste dispositivo.', true); return;
        }
        renderCategories(); renderCategorySelect();
        const pending = byId('agendamentoTypeInput').dataset.pendingCategory;
        if (pending) { byId('agendamentoTypeInput').value = pending; delete byId('agendamentoTypeInput').dataset.pendingCategory; }
        renderizarAgendamento(); resetCategoryForm(); showToast('Categoria salva.');
        window.kingCalendar?.syncIfConnected();
    }
    function requestDeleteCategory(id, row) {
        const category = getCategory(id); if (!category || id === 'sem-categoria') return;
        const original = row.querySelector('.agenda-category-remove');
        original.hidden = true;
        const confirmation = document.createElement('span'); confirmation.className = 'agenda-category-confirm';
        const label = document.createElement('small'); label.textContent = 'Manter compromissos sem categoria?';
        const yes = document.createElement('button'); yes.type = 'button'; yes.className = 'cycle-btn btn-danger'; yes.textContent = 'Excluir categoria'; yes.addEventListener('click', () => deleteCategory(id));
        const no = document.createElement('button'); no.type = 'button'; no.className = 'cycle-btn'; no.textContent = 'Cancelar'; no.addEventListener('click', renderCategories);
        confirmation.append(label, yes, no); row.append(confirmation);
    }
    function deleteCategory(id) {
        if (id === 'sem-categoria' || !getCategory(id)) return;
        const snapshot = JSON.stringify({ categories: appData.agendaCategories, items: appData.agendamentoItems });
        const affected = new Set((appData.agendamentoItems || []).filter(item => categoryForItem(item)?.id === id).map(item => item.id));
        appData.agendaCategories = ensureCategories().filter(category => category.id !== id);
        (appData.agendamentoItems || []).forEach(item => {
            if (affected.has(item.id)) { item.categoryId = 'sem-categoria'; item.type = 'Sem categoria'; }
        });
        try { saveAppData(); } catch {
            const old = JSON.parse(snapshot); appData.agendaCategories = old.categories; appData.agendamentoItems = old.items;
            showToast('Não foi possível excluir a categoria.', true); return;
        }
        if (byId('agendaCategoryEditId').value === id) resetCategoryForm();
        renderCategories(); renderCategorySelect(); renderizarAgendamento(); showToast('Categoria excluída; compromissos preservados.');
        window.kingCalendar?.syncIfConnected();
    }
    function moveToToday(id) {
        const item = (appData.agendamentoItems || []).find(entry => entry.id === id);
        if (!item || item.completed) return;
        const previous = item.date; item.date = dataLocalISO();
        try { saveAppData(); } catch { item.date = previous; showToast('Não foi possível reagendar.', true); return; }
        renderizarAgendamento(); showToast('Compromisso movido para hoje.'); window.kingCalendar?.syncIfConnected();
    }

    function openImport() { resetImport(); byId('agendaImportModal').classList.add('active'); }
    function closeImport() { state.request++; state.busy = false; fecharModal('agendaImportModal'); }
    function resetImport() {
        state.request++; state.busy = false; state.file = null; state.suggestions = [];
        byId('agendaImportFile').value = ''; byId('agendaImportInstruction').value = '';
        byId('agendaImportFileSummary').hidden = true; byId('agendaImportPreview').hidden = true;
        byId('agendaImportPreview').replaceChildren(); byId('agendaImportStatus').textContent = '';
        byId('agendaImportAnalyze').disabled = true; byId('agendaImportApply').hidden = true;
    }
    async function selectFile(event) {
        state.request++; state.busy = false; state.file = null; state.suggestions = [];
        const request = state.request;
        const file = event.target.files?.[0];
        byId('agendaImportFileSummary').hidden = true; byId('agendaImportPreview').hidden = true; byId('agendaImportApply').hidden = true;
        byId('agendaImportAnalyze').disabled = true;
        if (!file) return;
        const ext = file.name.toLowerCase().match(/\.(pdf|png|jpe?g|webp)$/)?.[1];
        const expected = { pdf: 'application/pdf', png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', webp: 'image/webp' }[ext];
        if (!expected || file.type !== expected || file.size < 1 || file.size > 7 * 1024 * 1024 || await tipoRealAnexo(file).catch(() => '') !== expected) {
            event.target.value = ''; return showToast('Escolha um PDF ou imagem válido de até 7 MB.', true);
        }
        if (request !== state.request || event.target.files?.[0] !== file) return;
        state.file = file;
        byId('agendaImportFileSummary').textContent = `${file.name} · ${(file.size / 1024 / 1024).toFixed(2)} MB`;
        byId('agendaImportFileSummary').hidden = false; byId('agendaImportAnalyze').disabled = false;
        byId('agendaImportStatus').textContent = 'Pronto para analisar. Nada será adicionado sem sua confirmação.';
    }
    const readDataUrl = file => new Promise((resolve, reject) => {
        const reader = new FileReader(); reader.onload = () => resolve(String(reader.result || '').split(',')[1] || ''); reader.onerror = reject; reader.readAsDataURL(file);
    });
    async function analyze() {
        if (!state.file || state.busy) return;
        state.busy = true; const request = ++state.request; const file = state.file;
        const analyzeButton = byId('agendaImportAnalyze'); analyzeButton.disabled = true; analyzeButton.textContent = 'Analisando…';
        byId('agendaImportStatus').textContent = 'Lendo arquivo e identificando datas. Pode levar alguns segundos.';
        try {
            await window.kingGeminiReady;
            if (!window.kingGemini?.analyzeAgendaDocument) throw new Error('O leitor inteligente ainda não está disponível. Tente novamente em instantes.');
            const payload = { instruction: byId('agendaImportInstruction').value.trim().slice(0, 300), today: dataLocalISO(), categories: ensureCategories().map(item => item.name) };
            if (file.type === 'application/pdf') {
                if (!window.KingSyllabusPdf?.extractAgenda) throw new Error('O leitor de PDF ainda está carregando. Tente novamente.');
                const extracted = await window.KingSyllabusPdf.extractAgenda(file);
                if (extracted.text.length >= 30) payload.text = extracted.text;
                else {
                    byId('agendaImportStatus').textContent = 'O PDF é uma imagem. Lendo visualmente as primeiras páginas…';
                    payload.images = await window.KingSyllabusPdf.renderAgendaImages(file);
                }
            } else payload.images = [{ mimeType: file.type, base64: await readDataUrl(file) }];
            const result = await window.kingGemini.analyzeAgendaDocument(payload);
            if (request !== state.request) return;
            state.suggestions = (result.items || []).slice(0, 25);
            renderPreview();
            byId('agendaImportStatus').textContent = state.suggestions.length ? 'Confira datas e horários. Desmarque o que não quiser importar.' : 'Não encontrei compromissos legíveis com data. Tente uma imagem mais nítida ou outra orientação.';
        } catch (error) {
            if (request === state.request) byId('agendaImportStatus').textContent = `Não foi possível analisar: ${error.message || 'tente novamente.'}`;
        } finally {
            if (request === state.request) { state.busy = false; analyzeButton.textContent = 'Analisar novamente'; analyzeButton.disabled = !state.file; }
        }
    }
    function field(tag, label, value, type = 'text') {
        const wrapper = document.createElement('label'); wrapper.className = 'agenda-preview-field';
        const name = document.createElement('span'); name.textContent = label;
        const input = document.createElement(tag); input.className = 'cycle-input';
        if (tag === 'input') input.type = type;
        input.value = value || ''; wrapper.append(name, input); return { wrapper, input };
    }
    function renderPreview() {
        const container = byId('agendaImportPreview'); container.replaceChildren();
        const known = new Set((appData.agendamentoItems || []).map(keyFor));
        state.suggestions.forEach((suggestion, index) => {
            const card = document.createElement('article'); card.className = 'agenda-preview-card'; card.dataset.index = String(index);
            const header = document.createElement('div'); header.className = 'agenda-preview-card-head';
            const check = document.createElement('input'); check.type = 'checkbox'; check.className = 'agenda-preview-check'; check.checked = !known.has(keyFor(suggestion)); check.setAttribute('aria-label', `Adicionar sugestão ${index + 1}`);
            const number = document.createElement('strong'); number.textContent = `Compromisso ${index + 1}`;
            const warning = document.createElement('small'); warning.textContent = known.has(keyFor(suggestion)) ? 'Já existe na agenda' : (!validDate(suggestion.date) || suggestion.needsReview ? 'Confira os dados antes de salvar' : 'Pronto para revisar');
            if (known.has(keyFor(suggestion))) { check.disabled = true; card.classList.add('agenda-preview-duplicate'); }
            header.append(check, number, warning);
            const title = field('input', 'Compromisso', suggestion.title); title.input.maxLength = 120;
            const date = field('input', 'Data', validDate(suggestion.date) ? suggestion.date : '', 'date');
            const time = field('input', 'Hora (opcional)', validTime(suggestion.time) ? suggestion.time : '', 'time');
            const category = field('select', 'Categoria');
            category.input.replaceChildren(...ensureCategories().map(item => new Option(item.name, item.id)));
            category.input.value = categoryFromName(suggestion.category).id;
            const note = field('textarea', 'Nota (opcional)', suggestion.description); note.input.maxLength = 1000; note.input.rows = 2;
            const grid = document.createElement('div'); grid.className = 'agenda-preview-grid'; grid.append(date.wrapper, time.wrapper, category.wrapper);
            card.append(header, title.wrapper, grid, note.wrapper); container.append(card);
        });
        container.hidden = !state.suggestions.length; byId('agendaImportApply').hidden = !state.suggestions.length;
        byId('agendaImportApply').textContent = 'Adicionar selecionados';
    }
    function apply() {
        const rows = [...byId('agendaImportPreview').querySelectorAll('.agenda-preview-card')];
        const selected = rows.filter(row => row.querySelector('.agenda-preview-check').checked && !row.querySelector('.agenda-preview-check').disabled);
        if (!selected.length) return showToast('Selecione pelo menos um compromisso.', true);
        const existing = new Set((appData.agendamentoItems || []).map(keyFor));
        const staged = []; const now = Date.now();
        for (const row of selected) {
            const [title, date, time, categoryId, description] = [...row.querySelectorAll('.agenda-preview-field :is(input,select,textarea)')].map(input => input.value.trim());
            if (!title || !validDate(date) || !validTime(time) || !getCategory(categoryId)) {
                row.classList.add('agenda-preview-invalid'); row.scrollIntoView({ block: 'center', behavior: 'smooth' });
                byId('agendaImportStatus').textContent = 'Confira o título, a data e a hora do compromisso destacado.';
                return;
            }
            const category = getCategory(categoryId);
            const item = { id: now + staged.length, title: title.slice(0, 120), date, time, type: category.name, categoryId, description: description.slice(0, 1000), duration: 30, completed: false, importSource: String(state.file?.name || '').slice(0, 120) };
            const key = keyFor(item);
            if (existing.has(key)) { row.classList.add('agenda-preview-invalid'); byId('agendaImportStatus').textContent = 'Há um compromisso repetido. Desmarque-o ou altere os dados.'; return; }
            existing.add(key); staged.push(item);
        }
        const usedIds = new Set((appData.agendamentoItems || []).map(item => item.id));
        for (const item of staged) { while (usedIds.has(item.id)) item.id++; usedIds.add(item.id); }
        const previous = [...appData.agendamentoItems]; appData.agendamentoItems.push(...staged);
        try { saveAppData(); } catch { appData.agendamentoItems = previous; showToast('Sem espaço para salvar. Nenhum compromisso foi importado.', true); return; }
        closeImport(); renderizarAgendamento(); showToast(`${staged.length} compromisso${staged.length === 1 ? '' : 's'} adicionado${staged.length === 1 ? '' : 's'} à agenda.`);
        window.kingCalendar?.syncIfConnected();
    }
    window.KingAgenda = { ensureCategories, getCategory, categoryForItem, renderCategorySelect, openCategories, closeCategories, saveCategory, deleteCategory, moveToToday, openImport, closeImport, selectFile, analyze, apply, validDate, validColor, keyFor };
    ensureCategories(); renderCategorySelect(); renderizarAgendamento();
})();
