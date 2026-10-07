(function () {
    'use strict';
    const core = window.KingLibraryCore;
    if (!core) return;
    const $ = id => document.getElementById(id);
    const esc = core.escape;
    const id = prefix => window.KingTopicCore?.makeId?.(prefix) || `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const state = { view: 'acervo', selected: '', editing: false, versions: false, pageEdit: '', subject: '', draftTimer: null, selection: null };
    const rows = () => core.collect(window.appData || appData);
    const row = () => rows().find(item => item.id === state.selected);
    const date = value => !value ? '—' : /^\d{4}-\d{2}-\d{2}$/.test(String(value)) ? String(value).split('-').reverse().join('/') : new Date(value).toLocaleDateString('pt-BR');
    const message = (value, error = false) => window.showToast?.(value, error);
    const draftKey = pageId => `kingMasterLibraryDraft:${pageId}`;
    function persist() { window.saveAppData(); window.KingNotebook?.render?.(); }
    function options(subjectId, themeId, topicId) {
        const subjects = appData.cycleItems || [];
        $('libraryFormSubject').innerHTML = '<option value="">Escolha uma matéria</option>' + subjects.map(item => `<option value="${esc(item.id)}">${esc(item.subject)}</option>`).join('');
        $('libraryFormSubject').value = String(subjectId || subjects[0]?.id || '');
        const subject = subjects.find(item => String(item.id) === $('libraryFormSubject').value);
        const themes = subject?.temas || [];
        $('libraryFormTheme').innerHTML = '<option value="">Conteúdo geral</option>' + themes.map(item => `<option value="${esc(item.id)}">${esc(item.nome)}</option>`).join('');
        $('libraryFormTheme').value = String(themeId || '');
        const chosenTheme = $('libraryFormTheme').value;
        const topics = (subject?.topicos || []).filter(item => !chosenTheme || String(item.temaId || '') === chosenTheme);
        $('libraryFormTopic').innerHTML = '<option value="">Escolha um assunto</option>' + topics.map(item => `<option value="${esc(item.id)}">${esc(item.nome)}</option>`).join('') + '<option value="__new__">+ Criar assunto</option>';
        $('libraryFormTopic').value = String(topicId || '');
        $('libraryNewTopicWrap').hidden = $('libraryFormTopic').value !== '__new__';
        const related = rows().filter(item => item.id !== state.pageEdit && String(item.subject.id) === $('libraryFormSubject').value);
        const original = rows().find(item => item.id === state.pageEdit);
        $('libraryFormRelated').innerHTML = related.length ? related.map(item => `<label><input type="checkbox" value="${esc(item.id)}" ${core.metadata(original?.page).linkedPageIds.includes(item.id) ? 'checked' : ''}><span>${esc(item.page.titulo)} <small>${esc(item.topic.nome)}</small></span></label>`).join('') : '<span class="library-muted">Nenhum outro caderno nesta matéria.</span>';
    }
    function setView(view) {
        state.view = view === 'tudo' ? 'tudo' : 'acervo';
        $('libraryPanel').hidden = state.view !== 'acervo';
        $('notebookCollectionPanel').hidden = state.view !== 'tudo';
        for (const [key, tab] of [['acervo', $('libraryTabAcervo')], ['tudo', $('libraryTabTudo')]]) {
            tab.setAttribute('aria-selected', String(state.view === key));
            tab.tabIndex = state.view === key ? 0 : -1;
        }
        if (state.view === 'tudo') window.KingNotebook?.render?.(); else render();
    }
    function render() {
        if (!$('libraryPanel')) return;
        if (core.migrateLegacy(appData, () => id('pagina'))) persist();
        const all = rows();
        const subjectValue = $('librarySubjectFilter').value || 'todas';
        $('librarySubjectFilter').innerHTML = '<option value="todas">Todas</option>' + (appData.cycleItems || []).map(item => `<option value="${esc(item.id)}">${esc(item.subject)}</option>`).join('');
        $('librarySubjectFilter').value = subjectValue;
        const query = core.normalize($('librarySearch').value);
        const matches = all.filter(item => (subjectValue === 'todas' || String(item.subject.id) === subjectValue) && (!query || core.normalize([item.subject.subject, item.theme, item.topic.nome, item.page.titulo, item.page.texto, item.page.source].join(' ')).includes(query)));
        $('libraryCount').textContent = String(matches.length);
        const bySubject = new Map();
        for (const item of matches) {
            const subject = bySubject.get(item.subject.id) || new Map();
            const theme = subject.get(item.theme) || new Map();
            const pages = theme.get(item.topic.nome) || [];
            pages.push(item); theme.set(item.topic.nome, pages); subject.set(item.theme, theme); bySubject.set(item.subject.id, subject);
        }
        $('libraryOutlineList').innerHTML = bySubject.size ? [...bySubject].map(([subjectId, themes]) => {
            const subject = appData.cycleItems.find(item => item.id === subjectId);
            return `<details class="library-tree-subject" open><summary>${esc(subject?.subject || 'Matéria')} <small>${[...themes.values()].reduce((sum, topics) => sum + [...topics.values()].reduce((total, pages) => total + pages.length, 0), 0)}</small></summary>${[...themes].map(([theme, topics]) => `<details class="library-tree-theme" open><summary>${esc(theme)}</summary>${[...topics].map(([topic, pages]) => `<details class="library-tree-topic" open><summary>${esc(topic)} <small>${pages.length}</small></summary>${pages.map(item => `<button type="button" class="library-page-link ${state.selected === item.id ? 'is-active' : ''}" data-library-page="${esc(item.id)}"><span>${esc(item.page.titulo || 'Sem título')}</span><small>${core.metadata(item.page).status === 'revisado' ? '✓ Revisado' : 'Rascunho'}</small></button>`).join('')}</details>`).join('')}</details>`).join('')}</details>`;
        }).join('') : `<div class="library-empty-list"><strong>${query ? 'Nenhum resultado' : 'Seu acervo começa aqui'}</strong><p>${query ? 'Tente outro termo ou matéria.' : 'Crie uma página para reunir o que você aprende.'}</p><button type="button" class="cycle-btn primary" data-library-action="new">+ Novo caderno</button></div>`;
        if (state.selected && !all.some(item => item.id === state.selected)) state.selected = '';
        renderDetail();
    }
    function open(pageId) {
        if (!rows().some(item => item.id === String(pageId))) return;
        state.selected = String(pageId); state.editing = false; state.versions = false;
        $('libraryPanel').classList.add('has-selection');
        render();
    }
    function detailActions() {
        return `<div class="library-actions"><button type="button" class="cycle-btn primary" data-library-action="topic">Abrir assunto e revisões</button><button type="button" class="cycle-btn" data-library-action="edit">Editar dados</button><button type="button" class="cycle-btn" data-library-action="inline">${state.editing ? 'Leitura' : 'Editar texto'}</button><button type="button" class="cycle-btn" data-library-action="versions">Versões</button><button type="button" class="cycle-btn" data-library-action="word">Exportar Word</button><button type="button" class="cycle-btn" data-library-action="fullscreen">Tela cheia</button><button type="button" class="cycle-btn danger" data-library-action="delete">Excluir</button></div>`;
    }
    function renderDetail() {
        const target = row(), host = $('libraryDetail');
        if (!target) { host.innerHTML = '<div class="library-empty-detail"><span class="library-empty-symbol" aria-hidden="true">▤</span><h2>Escolha um caderno</h2><p>Leia, edite e retome suas anotações no mesmo lugar.</p><button type="button" class="cycle-btn primary" data-library-action="new">Criar caderno</button></div>'; return; }
        const { page, subject, topic, theme } = target, meta = core.metadata(page);
        const linked = meta.linkedPageIds.map(link => rows().find(item => item.id === link)).filter(Boolean);
        host.innerHTML = `<div class="library-detail-top"><button type="button" class="library-back" data-library-action="back">← Sumário</button><span class="library-status ${meta.status}">${meta.status === 'revisado' ? '✓ Revisado' : 'Rascunho'}</span></div><div class="library-breadcrumb">${esc(subject.subject)} <span>›</span> ${esc(theme)} <span>›</span> ${esc(topic.nome)}</div><h2 class="library-document-title">${esc(page.titulo || 'Sem título')}</h2><div class="library-document-meta">Criado em ${date(page.criadoEm)} · Atualizado em ${date(page.atualizadoEm || page.criadoEm)}</div>${detailActions()}${state.editing ? `<div class="library-inline-editor"><label>Título<input id="libraryInlineTitle" class="cycle-input" maxlength="90" value="${esc(page.titulo)}"></label><label>Conteúdo<textarea id="libraryInlineText" class="cycle-input" maxlength="12000" rows="16">${esc(page.texto)}</textarea></label><div class="library-inline-bottom"><span id="libraryDraftStatus">As alterações serão salvas ao clicar em Salvar.</span><button type="button" class="cycle-btn primary" data-library-action="save-inline">Salvar texto</button></div></div>` : `<div class="library-reader" id="libraryReaderBody">${core.markdown(page.texto)}</div><div class="library-highlight-tools" id="libraryHighlightTools" hidden><strong>Destacar trecho</strong>${['amarelo', 'verde', 'azul', 'rosa'].map(color => `<button type="button" class="library-color ${color}" data-library-color="${color}" aria-label="Destacar em ${color}"></button>`).join('')}<label>Comentário<input id="libraryHighlightComment" class="cycle-input" maxlength="300" placeholder="Opcional"></label></div>`}${meta.continuation ? `<section class="library-info-card"><h3>Ficha de continuidade</h3><p>${esc(meta.continuation)}</p></section>` : ''}<div class="library-reference-grid"><section class="library-info-card"><h3>Fonte e conferência</h3><p>${esc(meta.source || 'Fonte não informada')}${meta.edition ? ` · ${esc(meta.edition)}` : ''}${meta.sourcePage ? ` · p. ${esc(meta.sourcePage)}` : ''}</p><small>${meta.checkedAt ? `Conferido em ${date(meta.checkedAt)}` : 'Ainda não conferido'}</small></section><section class="library-info-card"><h3>Cadernos relacionados</h3>${linked.length ? linked.map(item => `<button type="button" data-library-page="${esc(item.id)}">${esc(item.page.titulo)} ↗</button>`).join('') : '<p>Nenhum relacionado.</p>'}</section></div><section class="library-info-card"><h3>Destaques e comentários</h3><div class="library-highlights">${(page.destaques || []).length ? page.destaques.map(highlight => `<div class="library-highlight ${esc(highlight.cor)}"><span>${esc(highlight.trecho || '')}</span>${highlight.comentario ? `<small>${esc(highlight.comentario)}</small>` : ''}<button type="button" data-library-remove-highlight="${esc(highlight.id)}" aria-label="Remover destaque">×</button></div>`).join('') : '<p>Nenhum trecho destacado.</p>'}</div></section>${state.versions ? `<section class="library-info-card library-versions"><h3>Versões anteriores</h3>${(page.versoes || []).length ? page.versoes.map(version => `<div><span>${date(version.savedAt)} · ${esc(version.titulo)}</span><button type="button" class="cycle-btn" data-library-restore="${esc(version.id)}">Restaurar</button></div>`).join('') : '<p>Uma versão é guardada quando você salva mudanças.</p>'}</section>` : ''}`;
        if (!state.editing) paintHighlights(page);
        if (state.editing) {
            const saved = localStorage.getItem(draftKey(page.id));
            if (saved) try { const draft = JSON.parse(saved); $('libraryInlineTitle').value = draft.title; $('libraryInlineText').value = draft.text; $('libraryDraftStatus').textContent = 'Rascunho local recuperado. Salve para sincronizar.'; } catch (_) { /* rascunho inválido */ }
        }
    }
    function paintHighlights(page) {
        if (!window.CSS?.highlights || !window.Highlight) return;
        for (const color of ['amarelo', 'verde', 'azul', 'rosa']) CSS.highlights.delete(`king-library-${color}`);
        const root = $('libraryReaderBody'); if (!root) return;
        const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
        const nodes = []; let node, full = '';
        while ((node = walker.nextNode())) { nodes.push({ node, start: full.length, end: full.length + node.textContent.length }); full += node.textContent; }
        for (const color of ['amarelo', 'verde', 'azul', 'rosa']) {
            const ranges = [];
            for (const item of page.destaques || []) {
                if (item.cor !== color || !item.trecho) continue;
                const start = full.indexOf(item.trecho); if (start < 0) continue;
                const finish = start + item.trecho.length;
                const first = nodes.find(entry => entry.end > start), last = nodes.find(entry => entry.end >= finish);
                if (!first || !last) continue;
                const range = document.createRange();
                range.setStart(first.node, start - first.start); range.setEnd(last.node, finish - last.start); ranges.push(range);
            }
            if (ranges.length) CSS.highlights.set(`king-library-${color}`, new Highlight(...ranges));
        }
    }
    function captureSelection() {
        const root = $('libraryReaderBody'), selection = window.getSelection();
        const text = selection?.toString().trim().slice(0, 600);
        if (!root || !text || !root.contains(selection.anchorNode) || !root.contains(selection.focusNode)) { state.selection = null; if ($('libraryHighlightTools')) $('libraryHighlightTools').hidden = true; return; }
        const current = row(); if (!current) return;
        const start = current.page.texto.indexOf(text);
        state.selection = { trecho: text, inicio: start >= 0 ? start : 0, fim: start >= 0 ? start + text.length : text.length };
        $('libraryHighlightTools').hidden = false;
    }
    function addHighlight(color) {
        const current = row(); if (!current || !state.selection || !['amarelo', 'verde', 'azul', 'rosa'].includes(color)) return;
        const highlight = { id: id('destaque'), ...state.selection, cor: color, comentario: $('libraryHighlightComment')?.value.trim().slice(0, 300) || '', criadoEm: Date.now() };
        current.page.destaques ||= []; current.page.destaques.push(highlight);
        try { persist(); state.selection = null; renderDetail(); message('Trecho destacado.'); }
        catch (_) { current.page.destaques.pop(); message('Não foi possível salvar o destaque.', true); }
    }
    function openEditor(pageId) {
        state.pageEdit = String(pageId || '');
        const current = rows().find(item => item.id === state.pageEdit);
        $('libraryEditorTitle').textContent = current ? 'Editar caderno' : 'Novo caderno';
        $('libraryEditorForm').reset();
        options(current?.subject.id, current?.topic.temaId, current?.topic.id);
        $('libraryFormTitle').value = current?.page.titulo || '';
        $('libraryFormContent').value = current?.page.texto || '';
        const meta = core.metadata(current?.page);
        $('libraryFormStatus').value = meta.status; $('libraryFormContinuation').value = meta.continuation;
        $('libraryFormSource').value = meta.source; $('libraryFormEdition').value = meta.edition;
        $('libraryFormPage').value = meta.sourcePage; $('libraryFormCheckedAt').value = meta.checkedAt;
        $('libraryEditorModal').classList.add('active');
        $('libraryFormTitle').focus();
    }
    function closeEditor() { $('libraryEditorModal').classList.remove('active'); state.pageEdit = ''; }
    function saveEditor(event) {
        event.preventDefault();
        const subject = appData.cycleItems.find(item => String(item.id) === $('libraryFormSubject').value);
        if (!subject) return message('Escolha uma matéria.', true);
        let topic = (subject.topicos || []).find(item => String(item.id) === $('libraryFormTopic').value);
        const title = $('libraryFormTitle').value.trim(), content = $('libraryFormContent').value.trim();
        if (!title || !content) return message('Preencha o título e o conteúdo.', true);
        const before = structuredClone(appData.cycleItems);
        try {
            if ($('libraryFormTopic').value === '__new__') {
                const name = $('libraryFormNewTopic').value.trim();
                if (!name) return message('Dê um nome ao novo assunto.', true);
                if ((subject.topicos || []).some(item => core.normalize(item.nome) === core.normalize(name))) return message('Este assunto já existe. Selecione-o na lista.', true);
                topic = { id: id('assunto'), nome: name, temaId: $('libraryFormTheme').value || undefined, concluido: false, prioridade: 'media', nivelDominio: 0, notas: '' };
                subject.topicos ||= []; subject.topicos.push(topic);
            }
            if (!topic) return message('Escolha um assunto.', true);
            const original = rows().find(item => item.id === state.pageEdit);
            let page = original?.page;
            if (original && original.topic !== topic) original.topic.caderno.paginas = original.topic.caderno.paginas.filter(item => item.id !== page.id);
            if (!page) page = { id: id('pagina'), criadoEm: Date.now(), destaques: [] };
            const next = { titulo: title, texto: content, status: $('libraryFormStatus').value, continuation: $('libraryFormContinuation').value.trim(), source: $('libraryFormSource').value.trim(), edition: $('libraryFormEdition').value.trim(), sourcePage: $('libraryFormPage').value.trim(), checkedAt: $('libraryFormCheckedAt').value, linkedPageIds: [...$('libraryFormRelated').querySelectorAll('input:checked')].map(input => input.value).filter(value => value !== page.id) };
            if (original && Object.entries(next).some(([field, value]) => JSON.stringify(page[field]) !== JSON.stringify(value))) core.snapshot(page, id('versao'));
            Object.assign(page, next, { atualizadoEm: Date.now() });
            topic.caderno ||= { paginas: [] }; topic.caderno.paginas ||= [];
            if (!topic.caderno.paginas.includes(page)) topic.caderno.paginas.push(page);
            persist(); state.selected = page.id; closeEditor(); render(); $('libraryPanel').classList.add('has-selection'); message('Caderno salvo.');
        } catch (error) { appData.cycleItems = before; message('Não foi possível salvar. Verifique o espaço disponível.', true); }
    }
    function saveInline() {
        const current = row(); if (!current) return;
        const title = $('libraryInlineTitle').value.trim(), content = $('libraryInlineText').value.trim();
        if (!title || !content) return message('Preencha título e conteúdo.', true);
        const backup = structuredClone(current.page);
        try {
            if (title !== current.page.titulo || content !== current.page.texto) {
                core.snapshot(current.page, id('versao'));
                current.page.titulo = title; current.page.texto = content; current.page.atualizadoEm = Date.now(); persist();
            }
            localStorage.removeItem(draftKey(current.id)); state.editing = false; render(); message('Texto salvo.');
        } catch (_) { Object.assign(current.page, backup); message('Não foi possível salvar o texto.', true); }
    }
    function restore(versionId) {
        const current = row(); if (!current) return;
        const backup = structuredClone(current.page);
        try { if (!core.restore(current.page, versionId, id('versao'))) return; persist(); render(); message('Versão restaurada. O estado anterior continua no histórico.'); }
        catch (_) { Object.assign(current.page, backup); message('Não foi possível restaurar.', true); }
    }
    function exportWord() {
        const current = row(); if (!current) return;
        const name = (current.page.titulo || 'caderno').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9-]+/gi, '-').slice(0, 70);
        const html = `<!doctype html><html><head><meta charset="utf-8"><title>${esc(current.page.titulo)}</title></head><body><h1>${esc(current.page.titulo)}</h1><p>${esc(current.subject.subject)} › ${esc(current.topic.nome)}</p>${core.markdown(current.page.texto)}</body></html>`;
        const url = URL.createObjectURL(new Blob(['\ufeff', html], { type: 'application/msword;charset=utf-8' }));
        const anchor = document.createElement('a'); anchor.href = url; anchor.download = `${name}.doc`; anchor.click(); setTimeout(() => URL.revokeObjectURL(url), 2000);
    }
    function action(name) {
        const current = row();
        if (name === 'new') return openEditor();
        if (name === 'back') return $('libraryPanel').classList.remove('has-selection');
        if (!current) return;
        if (name === 'topic') return window.abrirEspacoTopico?.(current.subject.id, current.topicIndex, 'caderno');
        if (name === 'edit') return openEditor(current.id);
        if (name === 'inline') { state.editing = !state.editing; renderDetail(); return; }
        if (name === 'save-inline') return saveInline();
        if (name === 'versions') { state.versions = !state.versions; renderDetail(); return; }
        if (name === 'word') return exportWord();
        if (name === 'fullscreen') { $('libraryDetail').classList.toggle('is-fullscreen'); renderDetail(); return; }
        if (name === 'delete') return window.abrirModalDeletar('chapterPage', `${current.subject.id}:${current.topicIndex}:${current.id}`, 'Excluir este caderno?', 'Esta página será removida do assunto. As outras páginas permanecerão intactas.', 'Excluir página');
    }
    function bind() {
        $('librarySearch').addEventListener('input', render);
        $('librarySubjectFilter').addEventListener('change', render);
        $('libraryOutlineList').addEventListener('click', event => { const page = event.target.closest('[data-library-page]'); if (page) open(page.dataset.libraryPage); else if (event.target.closest('[data-library-action]')) action(event.target.closest('[data-library-action]').dataset.libraryAction); });
        $('libraryDetail').addEventListener('click', event => {
            const color = event.target.closest('[data-library-color]'); if (color) return addHighlight(color.dataset.libraryColor);
            const link = event.target.closest('[data-library-page]'); if (link) return open(link.dataset.libraryPage);
            const restoreButton = event.target.closest('[data-library-restore]'); if (restoreButton) return restore(restoreButton.dataset.libraryRestore);
            const remove = event.target.closest('[data-library-remove-highlight]');
            if (remove) { const current = row(); if (!current) return; current.page.destaques = (current.page.destaques || []).filter(item => String(item.id) !== remove.dataset.libraryRemoveHighlight); persist(); renderDetail(); return; }
            const button = event.target.closest('[data-library-action]'); if (button) action(button.dataset.libraryAction);
        });
        $('libraryDetail').addEventListener('mouseup', event => { if (event.target.closest('#libraryReaderBody')) captureSelection(); });
        $('libraryDetail').addEventListener('keyup', event => { if (event.target.closest('#libraryReaderBody')) captureSelection(); });
        $('libraryDetail').addEventListener('input', event => {
            if (!['libraryInlineTitle', 'libraryInlineText'].includes(event.target.id)) return;
            const current = row(); if (!current) return;
            try { localStorage.setItem(draftKey(current.id), JSON.stringify({ title: $('libraryInlineTitle').value, text: $('libraryInlineText').value, updatedAt: Date.now() })); $('libraryDraftStatus').textContent = 'Rascunho preservado neste dispositivo.'; }
            catch (_) { $('libraryDraftStatus').textContent = 'Não foi possível preservar o rascunho local.'; }
        });
        $('libraryFormSubject').addEventListener('change', () => options($('libraryFormSubject').value));
        $('libraryFormTheme').addEventListener('change', () => { const subject = $('libraryFormSubject').value, theme = $('libraryFormTheme').value; options(subject, theme); });
        $('libraryFormTopic').addEventListener('change', () => { $('libraryNewTopicWrap').hidden = $('libraryFormTopic').value !== '__new__'; });
        $('libraryEditorForm').addEventListener('submit', saveEditor);
    }
    if ($('libraryPanel')) bind();
    window.KingLibrary = { render, setView, open, openEditor, closeEditor };
})();
