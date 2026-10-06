(function () {
    const core = window.KingNotebookCore;
    const byId = id => document.getElementById(id);
    const safe = text => String(text || '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' })[char]);
    let visibleLimit = 60;
    let items = [];
    let recallReviewId = null;
    const shownRecallIds = new Set();
    const colorNames = { amarelo: 'Amarelo', verde: 'Verde', azul: 'Azul', rosa: 'Rosa' };
    function renderLegend() {
        const labels = appData.cadernoCentral?.legendaCores || {};
        const legend = byId('notebookLegend');
        if (legend) legend.innerHTML = Object.entries(colorNames).map(([color, name]) => `<span class="notebook-legend-item notebook-legend-${color}"><i aria-hidden="true"></i>${name}: ${safe(labels[color] || name)}</span>`).join('');
        const colorSelect = byId('notebookColor');
        if (colorSelect) for (const option of colorSelect.options) if (colorNames[option.value]) option.textContent = `${colorNames[option.value]} · ${labels[option.value] || colorNames[option.value]}`;
        for (const input of document.querySelectorAll('[data-notebook-color-label]')) {
            if (document.activeElement !== input) input.value = labels[input.dataset.notebookColorLabel] || '';
        }
    }
    function selectOptions() {
        const selectedSubject = byId('notebookSubject').value;
        const selectedTheme = byId('notebookTheme').value;
        byId('notebookSubject').innerHTML = '<option value="todos">Todas</option>' + (appData.cycleItems || []).map(subject => `<option value="${safe(subject.id)}">${safe(subject.subject)}</option>`).join('');
        byId('notebookSubject').value = (appData.cycleItems || []).some(subject => String(subject.id) === selectedSubject) ? selectedSubject : 'todos';
        const themes = (appData.cycleItems || []).filter(subject => selectedSubject === 'todos' || String(subject.id) === selectedSubject).flatMap(subject => subject.temas || []);
        byId('notebookTheme').innerHTML = '<option value="todos">Todos</option>' + themes.map(theme => `<option value="${safe(theme.id)}">${safe(theme.nome)}</option>`).join('');
        byId('notebookTheme').value = themes.some(theme => theme.id === selectedTheme) ? selectedTheme : 'todos';
    }
    function render() {
        if (!byId('notebookResults')) return;
        renderLegend();
        selectOptions();
        const reviewed = appData.cadernoCentral?.revisados || {};
        const all = core.collect(appData);
        items = core.filter(all, {
            search: byId('notebookSearch').value, kind: byId('notebookKind').value, subjectId: byId('notebookSubject').value,
            themeId: byId('notebookTheme').value, source: byId('notebookSource').value, color: byId('notebookColor').value, review: byId('notebookReview').value
        }, reviewed);
        byId('notebookCount').textContent = `${items.length} ${items.length === 1 ? 'registro' : 'registros'}`;
        const groups = core.group(items.slice(0, visibleLimit));
        byId('notebookResults').innerHTML = groups.length ? groups.map(group => `<details class="widget notebook-group" open><summary><strong>${safe(group.subject)} · ${safe(group.theme)}</strong><span>${group.items.length} registros</span></summary><div class="notebook-items">${group.items.map(item => {
            const preview = item.kind === 'card' ? 'Toque para ver a resposta ↻' : String(item.text || '').split('\n').slice(0, 4).join(' ').slice(0, 350);
            const label = { pagina: 'Página', destaque: 'Destaque', erro: 'Regra anti-erro', card: 'Flashcard', nota: 'Nota' }[item.kind];
            const date = item.date ? new Date(item.date).toLocaleDateString('pt-BR') : '';
            return `<article class="notebook-item" data-notebook-id="${safe(item.id)}" style="--notebook-highlight:${{ amarelo: '#f7c948', verde: '#49bc73', azul: '#3987ec', rosa: '#e976aa' }[item.color] || 'transparent'}"><div class="notebook-item-top"><span>${label} · ${safe(item.source)}${date ? ` · ${date}` : ''}</span><small>${safe(item.topic || '')}</small></div><button type="button" ${item.kind === 'card' ? `data-notebook-flip="${safe(item.id)}"` : `data-notebook-open="${safe(item.id)}"`} class="notebook-item-title">${safe(item.title)}</button><p data-notebook-preview="${safe(item.id)}">${safe(preview)}${item.stale ? ' · trecho alterado' : ''}</p><div class="notebook-item-actions"><button type="button" data-notebook-review="${safe(item.id)}">${reviewed[item.id] ? '✓ Revisado' : 'Marcar revisado'}</button><button type="button" data-notebook-open="${safe(item.id)}">Abrir origem ↗</button></div></article>`;
        }).join('')}</div></details>`).join('') : '<div class="widget notebook-empty">Nada neste filtro. Suas anotações, destaques, regras anti-erro e flashcards aparecem aqui automaticamente.</div>';
        byId('notebookMore').hidden = items.length <= visibleLimit;
    }
    function openOriginal(id) {
        const item = core.collect(appData).find(entry => entry.id === id);
        if (!item) return;
        if ((item.kind === 'pagina' || item.kind === 'destaque') && item.topicId) {
            const found = window.KingTopicCore.findById(appData, item.topicId);
            if (found) { abrirEspacoTopico(found.subject.id, found.index, 'caderno'); setTimeout(() => selecionarPaginaCaderno(item.pageId), 50); }
        } else if (item.kind === 'erro') {
            showSection('caderno-erros');
            const search = byId('errorSearchInput');
            if (search) { search.value = item.topic || item.title; atualizarFiltrosCadernoErros(); }
        } else if (item.kind === 'card') {
            showSection('flashcards');
            const deck = [...document.querySelectorAll('[data-flash-deck]')].find(button => button.dataset.flashDeck === item.deckId);
            deck?.click();
        } else if (item.kind === 'nota') {
            abrirNotasRapidas();
            if (item.bookId) selecionarCadernoNota(item.bookId);
        }
    }
    function openRecall(reviewId) {
        const review = (appData.revisoesItems || []).find(item => Number(item.id) === Number(reviewId));
        if (!review?.topicId) return showToast('Esta revisão ainda não tem um assunto vinculado.', true);
        recallReviewId = Number(reviewId);
        shownRecallIds.clear();
        const entries = core.collect(appData).filter(item => String(item.topicId) === String(review.topicId));
        byId('notebookRecallTitle').textContent = `Revisar: ${review.assunto}`;
        byId('notebookRecallList').innerHTML = entries.length ? entries.map(item => `<article class="notebook-recall-item" data-recall-item="${safe(item.id)}"><strong>${safe(item.kind === 'card' ? item.title : item.kind === 'pagina' ? item.title : item.kind === 'erro' ? 'Regra anti-erro' : 'Destaque do caderno')}</strong><p hidden>${safe(item.kind === 'pagina' ? item.text : item.kind === 'destaque' ? `${item.title}${item.text ? ` · ${item.text}` : ''}` : item.kind === 'erro' ? `${item.title} · ${item.text}` : item.text)}</p><button type="button" data-recall-show="${safe(item.id)}">Mostrar</button></article>`).join('') : '<p>Este assunto ainda não tem páginas, regras ou flashcards. Tente lembrar o que estudou antes de dar baixa.</p>';
        byId('notebookRecallModal').classList.add('active');
    }
    function revealRecall(id) {
        const target = [...byId('notebookRecallList').querySelectorAll('[data-recall-item]')].find(node => node.dataset.recallItem === id);
        if (!target) return;
        target.querySelector('p').hidden = false;
        target.querySelector('button').hidden = true;
        shownRecallIds.add(id);
    }
    for (const id of ['notebookSearch', 'notebookKind', 'notebookSubject', 'notebookTheme', 'notebookSource', 'notebookColor', 'notebookReview']) byId(id)?.addEventListener(id === 'notebookSearch' ? 'input' : 'change', () => { visibleLimit = 60; render(); });
    for (const input of document.querySelectorAll('[data-notebook-color-label]')) input.addEventListener('change', () => {
        const color = input.dataset.notebookColorLabel;
        if (!colorNames[color]) return;
        appData.cadernoCentral.legendaCores[color] = input.value.trim().slice(0, 30) || colorNames[color];
        saveAppData();
        renderLegend();
    });
    byId('notebookMore')?.addEventListener('click', () => { visibleLimit += 60; render(); });
    byId('notebookResults')?.addEventListener('click', event => {
        const flip = event.target.closest('[data-notebook-flip]');
        if (flip) {
            const card = core.collect(appData).find(item => item.id === flip.dataset.notebookFlip);
            const preview = byId('notebookResults').querySelectorAll('[data-notebook-preview]');
            const target = [...preview].find(node => node.dataset.notebookPreview === card?.id);
            if (target && card) { target.textContent = target.dataset.revealed === 'true' ? 'Toque para ver a resposta ↻' : card.text; target.dataset.revealed = target.dataset.revealed === 'true' ? 'false' : 'true'; }
            return;
        }
        const reviewedButton = event.target.closest('[data-notebook-review]');
        if (reviewedButton) {
            const id = reviewedButton.dataset.notebookReview;
            if (appData.cadernoCentral.revisados[id]) delete appData.cadernoCentral.revisados[id];
            else appData.cadernoCentral.revisados[id] = dataLocalISO();
            saveAppData(); render(); return;
        }
        const openButton = event.target.closest('[data-notebook-open]');
        if (openButton) openOriginal(openButton.dataset.notebookOpen);
    });
    byId('notebookRecallList')?.addEventListener('click', event => {
        const button = event.target.closest('[data-recall-show]');
        if (button) revealRecall(button.dataset.recallShow);
    });
    byId('notebookRecallShowAll')?.addEventListener('click', () => {
        for (const node of byId('notebookRecallList').querySelectorAll('[data-recall-item]')) revealRecall(node.dataset.recallItem);
    });
    byId('notebookRecallModal')?.addEventListener('click', event => {
        const grade = event.target.closest('[data-recall-grade]');
        if (!grade || recallReviewId === null) return;
        const before = { ...appData.cadernoCentral.revisados };
        for (const id of shownRecallIds) appData.cadernoCentral.revisados[id] = dataLocalISO();
        try {
            marcarRevisao(recallReviewId, grade.dataset.recallGrade);
            fecharModal('notebookRecallModal');
            render();
        } catch {
            appData.cadernoCentral.revisados = before;
            showToast('Não foi possível salvar esta revisão.', true);
        }
    });
    window.KingNotebook = { render, openOriginal, openRecall };
})();
