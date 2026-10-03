/* Flashcards: UI e recuperação de contexto. O agendador puro fica em flashcards-core.js. */
(() => {
    const core = window.KingFlashcardsCore;
    const el = id => document.getElementById(id);
    const escape = value => String(value ?? '').replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch]);
    const box = () => core.ensure(appData);
    const subject = deck => appData.cycleItems.find(item => String(item.id) === String(deck?.subjectIds?.[0] || deck?.subjectId));
    const subjectNames = deck => (deck?.subjectIds?.length ? deck.subjectIds : [deck?.subjectId])
        .map(subjectId => appData.cycleItems.find(item => String(item.id) === String(subjectId))?.subject)
        .filter(Boolean).join(' · ') || 'Matéria removida';
    const deck = () => box().decks.find(item => item.id === selectedDeckId);
    const card = id => box().cards.find(item => item.id === id);
    const id = prefix => `${prefix}-${crypto.randomUUID()}`;
    const bytes = value => new TextEncoder().encode(JSON.stringify(value)).length;
    let selectedDeckId = '';
    let reviewQueue = [];
    let reviewIndex = 0;
    let candidates = [];
    let candidateSource = '';
    let generating = false;
    let specificErrorId = null;
    let pendingErrorId = null;
    let pendingReviewId = null;
    let menuDeckId = '';
    let subjectPicker;
    const friendlyError = error => error?.code || /https?:|AIza|Bearer|FirebaseError|API key|models\//i.test(String(error?.message || ''))
        ? 'A IA não conseguiu responder agora. Confira a conexão e tente novamente; nenhum cartão foi salvo.'
        : String(error?.message || 'Não foi possível concluir esta ação.').slice(0, 230);

    function persist(message = '') {
        try {
            // O estado principal ainda é um único documento Firestore (limite de 1 MiB).
            if (bytes(appData) > 850000) throw new Error('Seus dados estão perto do limite de sincronização. Não adicione mais cartões antes de liberar espaço ou migrar o armazenamento.');
            saveAppData();
            if (message) showToast(message);
            return true;
        } catch (error) {
            showToast(friendlyError(error), true);
            return false;
        }
    }

    function dashboardStats() {
        const data = box();
        const now = Date.now();
        const states = data.cards.filter(card => data.decks.some(deck => deck.id === card.deckId)).map(card => data.states[card.id] || {});
        const due = states.filter(state => !state.lastReviewedAt || !Number.isFinite(Number(state.dueAt)) || Number(state.dueAt) <= now).length;
        const newCount = states.filter(state => !state.lastReviewedAt).length;
        const difficult = states.filter(state => Number(state.lapses) > 0 || Number(state.ease) < 2).length;
        const reviewed = data.reviews.length;
        const correct = data.reviews.filter(entry => entry.rating !== 'again').length;
        return { due, newCount, difficult, reviewed, correct, mastered: states.filter(state => Number(state.repetitions) >= 4 && Number(state.ease) >= 2).length };
    }

    function updateDashboard() {
        const stats = dashboardStats();
        if (el('flashDashboardDue')) el('flashDashboardDue').textContent = `${stats.due} para revisar`;
        if (el('flashDashboardSummary')) el('flashDashboardSummary').textContent = `${stats.newCount} novos · ${stats.difficult} difíceis · ${box().decks.length} decks`;
        const badge = el('navFlashcardsBadge');
        if (badge) { badge.textContent = String(stats.due); badge.hidden = !stats.due; }
    }

    function renderMetrics() {
        const stats = dashboardStats();
        el('flashMetrics').innerHTML = [
            ['Para revisar', stats.due], ['Novos', stats.newCount], ['Difíceis', stats.difficult],
            ['Taxa de acerto', stats.reviewed ? `${Math.round(stats.correct / stats.reviewed * 100)}%` : '—']
        ].map(([label, value]) => `<div class="flash-metric"><small>${label}</small><strong>${value}</strong></div>`).join('');
    }

    function renderDeckList() {
        const data = box();
        const deckQuery = core.key(el('flashDeckSearch')?.value || '');
        const visible = data.decks.filter(item => !deckQuery || core.key(`${item.name} ${item.topic} ${subjectNames(item)}`).includes(deckQuery));
        el('flashDeckCount').textContent = String(data.decks.length);
        el('flashDeckList').innerHTML = visible.length ? visible.map(item => {
            const stats = core.deckStats(appData, item.id);
            return `<div class="flash-deck-row" data-flash-deck-row="${escape(item.id)}"><button type="button" class="flash-deck-button${item.id === selectedDeckId ? ' active' : ''}" data-flash-deck="${escape(item.id)}" aria-current="${item.id === selectedDeckId ? 'true' : 'false'}"><span><strong>${escape(item.name)}</strong><small>${escape(subjectNames(item))} · ${escape(item.topic || 'Assunto livre')} · ${stats.total} cartões · ${stats.learned} aprendidos</small></span><b aria-label="${stats.due} pendentes">${stats.due}</b></button><button type="button" class="flash-deck-more" data-flash-menu="${escape(item.id)}" aria-label="Opções de ${escape(item.name)}">⋮</button></div>`;
        }).join('') : `<div class="flash-empty">${data.decks.length ? 'Nenhum deck corresponde à busca.' : 'Nenhum deck ainda. Crie um para guardar cartões de um assunto.'}</div>`;
        let trash = el('flashDeckTrash');
        if (!trash) { trash = document.createElement('div'); trash.id = 'flashDeckTrash'; trash.className = 'flash-deck-trash'; el('flashDeckList').after(trash); }
        trash.innerHTML = data.trash.length ? `<details><summary>Lixeira · ${data.trash.length}</summary>${data.trash.map(entry => `<div><span>${escape(entry.deck.name)}</span><button type="button" data-flash-restore="${escape(entry.deck.id)}">Recuperar</button></div>`).join('')}</details>` : '';
    }

    function renderCards() {
        const current = deck();
        el('flashCurrentSubject').textContent = current ? subjectNames(current) : 'ESCOLHA UM DECK';
        el('flashCurrentDeck').textContent = current?.name || 'Seu espaço de cartões';
        el('flashCurrentMeta').textContent = current ? `${current.topic || 'Sem assunto específico'} · ${core.deckStats(appData, current.id).due} para revisar` : 'Selecione ou crie um deck para começar.';
        for (const key of ['flashEditDeck', 'flashStart', 'flashFilters', 'flashCardForm']) el(key).hidden = !current;
        if (!current) { el('flashCardList').innerHTML = '<div class="flash-empty">Escolha um deck à esquerda. Cada cartão ficará vinculado à matéria e ao assunto.</div>'; return; }
        const query = core.key(el('flashSearch').value);
        const status = el('flashStatusFilter').value;
        const now = Date.now();
        const cards = box().cards.filter(item => item.deckId === current.id).filter(item => {
            const state = box().states[item.id] || {};
            if (query && !core.key(`${item.front} ${item.back}`).includes(query)) return false;
            if (status === 'due') return !state.lastReviewedAt || !Number.isFinite(Number(state.dueAt)) || Number(state.dueAt) <= now;
            if (status === 'new') return !state.lastReviewedAt;
            if (status === 'hard') return Number(state.lapses) > 0 || Number(state.ease) < 2;
            if (status === 'wrong') return state.lastRating === 'again';
            if (status === 'mastered') return Number(state.repetitions) >= 4 && Number(state.ease) >= 2;
            return true;
        });
        el('flashCardList').innerHTML = cards.length ? cards.map(item => {
            const state = box().states[item.id] || {};
            const label = !state.lastReviewedAt ? 'Novo' : !Number.isFinite(Number(state.dueAt)) || Number(state.dueAt) <= now ? 'Para revisar' : `Próximo: ${new Date(state.dueAt).toLocaleDateString('pt-BR')}`;
            return `<article class="flash-list-card"><div><strong>${escape(item.front)}</strong><p>${escape(item.back)}</p><small>${label}${item.sourceLabel ? ` · ${escape(item.sourceLabel)}` : ''}</small></div><div class="flash-list-actions"><button type="button" data-flash-edit="${escape(item.id)}">Editar</button><button type="button" data-flash-delete="${escape(item.id)}">Excluir</button></div></article>`;
        }).join('') : '<div class="flash-empty">Nenhum cartão neste filtro. Você pode adicionar outro logo abaixo.</div>';
        el('flashStart').disabled = core.deckStats(appData, current.id).due === 0;
        el('flashCardDeck').innerHTML = box().decks.map(item => `<option value="${escape(item.id)}" ${item.id === current.id ? 'selected' : ''}>${escape(item.name)} · ${escape(subjectNames(item))}</option>`).join('');
    }

    function render() {
        const data = box();
        if (!data.decks.some(item => item.id === selectedDeckId)) selectedDeckId = data.decks[0]?.id || '';
        renderMetrics(); renderDeckList(); renderCards(); updateDashboard();
    }

    function closeDeckPickers() {
        el('flashDeckSubjectOptions').hidden = true;
        el('flashDeckSubjectToggle').setAttribute('aria-expanded', 'false');
        el('flashTopicOptions').hidden = true;
        el('flashDeckTopic').setAttribute('aria-expanded', 'false');
    }
    function fillSubjects(value = '') {
        const subjectSelect = el('flashDeckSubject');
        subjectSelect.innerHTML = '<option value="">Escolha uma matéria cadastrada</option>' + appData.cycleItems.map(item => `<option value="${escape(item.id)}">${escape(item.subject)}</option>`).join('');
        subjectSelect.value = String(value);
        if (!subjectSelect.value) subjectSelect.value = '';
        updateSubjectPicker();
        subjectPicker?.refresh();
    }
    function updateSubjectPicker() {
        const selected = appData.cycleItems.find(item => String(item.id) === el('flashDeckSubject').value);
        el('flashDeckSubjectLabel').textContent = selected?.subject || 'Escolha uma matéria cadastrada';
        el('flashDeckSubjectToggle').classList.toggle('is-selected', !!selected);
        el('flashDeckSubjectOptions').innerHTML = appData.cycleItems.map(item => `<button type="button" class="flash-picker-option${String(item.id) === String(selected?.id) ? ' is-selected' : ''}" data-flash-subject="${escape(item.id)}" aria-pressed="${String(item.id) === String(selected?.id)}"><span class="flash-picker-dot" aria-hidden="true"></span><span>${escape(item.subject)}</span><span class="flash-picker-check" aria-hidden="true">✓</span></button>`).join('');
        fillTopics();
    }
    function selectDeckSubject(value) {
        const previous = el('flashDeckSubject').value;
        el('flashDeckSubject').value = String(value);
        if (previous !== el('flashDeckSubject').value) el('flashDeckTopic').value = '';
        updateSubjectPicker();
        closeDeckPickers();
        el('flashDeckSubjectToggle').focus();
    }
    function fillTopics() {
        const current = appData.cycleItems.find(item => String(item.id) === el('flashDeckSubject').value);
        const query = core.key(el('flashDeckTopic').value);
        const topics = (current?.topicos || []).map(item => item.nome).filter(Boolean)
            .filter(name => !query || core.key(name).includes(query)).slice(0, 6);
        el('flashTopicOptions').innerHTML = topics.map(name => `<button type="button" data-flash-topic="${escape(name)}"><span aria-hidden="true">▣</span>${escape(name)}</button>`).join('');
        return topics.length;
    }
    function showTopicOptions() {
        const hasTopics = fillTopics();
        el('flashTopicOptions').hidden = !hasTopics;
        el('flashDeckTopic').setAttribute('aria-expanded', String(!!hasTopics));
    }
    function openDeckDialog(edit = false) {
        if (!edit && !appData.cycleItems.length) { showToast('Cadastre uma matéria antes de criar um deck.', true); showSection('planejamento'); return; }
        const current = edit ? deck() : null;
        el('flashDeckDialogTitle').textContent = current ? 'Editar deck' : 'Novo deck';
        el('flashDeckId').value = current?.id || '';
        el('flashDeckName').value = current?.name || '';
        fillSubjects(current?.subjectId || '');
        subjectPicker?.set(current?.subjectIds?.length ? current.subjectIds : current?.subjectId ? [current.subjectId] : []);
        el('flashDeckTopic').value = current?.topic || '';
        el('flashDeleteDeck').hidden = !current;
        closeDeckPickers();
        el('flashDeckDialog').showModal();
        el('flashDeckName').focus();
    }
    function saveDeck(event) {
        event.preventDefault();
        const name = core.text(el('flashDeckName').value, 80);
        const subjectIds = subjectPicker?.get() || [el('flashDeckSubject').value].filter(Boolean);
        const subjectId = subjectIds[0] || '';
        const topic = core.text(el('flashDeckTopic').value, 100);
        if (!name) { el('flashDeckName').focus(); return; }
        if (!subjectIds.length || subjectIds.some(id => !appData.cycleItems.some(item => String(item.id) === id))) {
            showToast('Escolha pelo menos uma matéria cadastrada.', true);
            el('flashDeckSubjectsPicker').querySelector('button')?.focus();
            return;
        }
        const data = box();
        const currentId = el('flashDeckId').value;
        if (data.decks.some(item => item.id !== currentId && core.key(item.name) === core.key(name) && core.key(item.topic) === core.key(topic) && subjectIds.some(id => (item.subjectIds || [item.subjectId]).map(String).includes(id)))) { showToast('Já existe um deck igual nesta matéria e assunto.', true); return; }
        const before = structuredClone(data);
        if (currentId) {
            const existing = data.decks.find(item => item.id === currentId);
            if (!existing) return showToast('Este deck não está mais disponível.', true);
            Object.assign(existing, { name, subjectId, subjectIds, topic, updatedAt: Date.now() });
        }
        else { const next = { id: id('deck'), name, subjectId, subjectIds, topic, createdAt: Date.now(), updatedAt: Date.now() }; data.decks.push(next); selectedDeckId = next.id; }
        if (!persist('Deck salvo.')) { appData.flashcards = before; return; }
        const errorId = pendingErrorId;
        const reviewId = pendingReviewId;
        pendingErrorId = null;
        pendingReviewId = null;
        el('flashDeckDialog').close(); render();
        if (errorId !== null) { specificErrorId = errorId; openAiFromError(); }
        if (reviewId !== null) prefillFromReview(reviewId);
    }
    function deleteDeck() {
        const current = deck(); if (!current) return;
        const count = box().cards.filter(item => item.deckId === current.id).length;
        if (!confirm(`Tem certeza que deseja excluir este deck? “${current.name}” contém ${count} ${count === 1 ? 'flashcard' : 'flashcards'}. Você poderá recuperá-lo na lixeira.`)) return;
        const before = structuredClone(box());
        core.archiveDeck(appData, current.id);
        if (!persist('Deck movido para a lixeira.')) { appData.flashcards = before; return; }
        selectedDeckId = ''; if (el('flashDeckDialog').open) el('flashDeckDialog').close(); render();
    }

    function openDeckMenu(deckId) {
        const current = box().decks.find(item => item.id === deckId); if (!current) return;
        menuDeckId = deckId;
        el('flashDeckMenuTitle').textContent = current.name;
        el('flashDeckMenu').showModal();
    }
    function duplicateSelectedDeck() {
        const before = structuredClone(box());
        const copy = core.duplicateDeck(appData, selectedDeckId, id('deck'), () => id('card'));
        if (!persist('Deck duplicado.')) { appData.flashcards = before; return; }
        selectedDeckId = copy.id; render(); openDeckDialog(true);
    }
    function restoreDeck(deckId) {
        const before = structuredClone(box());
        const restored = core.restoreDeck(appData, deckId);
        if (!restored) return showToast('O deck não está mais na lixeira.', true);
        if (!persist('Deck recuperado.')) { appData.flashcards = before; return; }
        selectedDeckId = deckId; render();
    }

    function clearCardForm() {
        el('flashCardId').value = '';
        el('flashFront').value = '';
        el('flashBack').value = '';
        el('flashCardDeck').value = selectedDeckId;
        el('flashCardFormTitle').textContent = 'Adicionar cartão';
    }
    function editCard(cardId) {
        const item = card(cardId); if (!item) return;
        el('flashCardId').value = item.id;
        el('flashFront').value = item.front;
        el('flashBack').value = item.back;
        el('flashCardDeck').value = item.deckId;
        el('flashCardFormTitle').textContent = 'Editar cartão';
        el('flashCardForm').scrollIntoView({ behavior: 'smooth', block: 'center' });
        el('flashFront').focus();
    }
    function saveCard(event) {
        event.preventDefault();
        const candidate = core.normalizeCandidate({ front: el('flashFront').value, back: el('flashBack').value });
        if (!candidate) { showToast('Escreva uma pergunta específica e uma resposta diferente.', true); return; }
        const targetDeck = el('flashCardDeck').value;
        if (!box().decks.some(item => item.id === targetDeck)) return showToast('Escolha um deck válido.', true);
        const currentId = el('flashCardId').value;
        if (box().cards.some(item => item.id !== currentId && item.deckId === targetDeck && core.key(item.front) === core.key(candidate.front))) return showToast('Essa pergunta já existe neste deck.', true);
        const before = structuredClone(box());
        if (currentId) {
            const existing = card(currentId);
            if (!existing) return showToast('Este cartão não está mais disponível.', true);
            Object.assign(existing, { ...candidate, deckId: targetDeck, updatedAt: Date.now() });
        }
        else box().cards.push({ id: id('card'), deckId: targetDeck, ...candidate, sourceLabel: 'Criado por você', createdAt: Date.now(), updatedAt: Date.now() });
        if (!persist('Cartão salvo.')) { appData.flashcards = before; return; }
        selectedDeckId = targetDeck; clearCardForm(); render(); el('flashFront').focus();
    }
    function deleteCard(cardId) {
        const item = card(cardId); if (!item || !confirm('Excluir este cartão e seu histórico de revisão?')) return;
        const before = structuredClone(box());
        box().cards = box().cards.filter(entry => entry.id !== cardId);
        box().reviews = box().reviews.filter(entry => entry.cardId !== cardId);
        delete box().states[cardId];
        if (!persist('Cartão excluído.')) { appData.flashcards = before; return; }
        render();
    }

    function openReview() {
        reviewQueue = core.dueCards(appData, selectedDeckId).map(item => item.id);
        reviewIndex = 0;
        if (!reviewQueue.length) return showToast('Este deck não tem cartões pendentes agora.');
        el('flashReviewDialog').showModal(); renderReview();
    }
    function renderReview() {
        const item = card(reviewQueue[reviewIndex]);
        if (!item) { el('flashReviewDialog').close(); render(); return showToast('Revisão concluída por agora.'); }
        const current = box().decks.find(deck => deck.id === item.deckId);
        el('flashReviewSubject').textContent = subjectNames(current);
        el('flashReviewDeck').textContent = current?.name || 'Flashcards';
        el('flashReviewProgress').textContent = `${reviewIndex + 1} de ${reviewQueue.length}`;
        el('flashReviewFront').textContent = item.front;
        el('flashReviewBack').querySelector('p').textContent = item.back;
        el('flashReviewBack').hidden = true;
        el('flashReveal').hidden = false;
        el('flashRatings').hidden = true;
    }
    function rate(rating) {
        if (el('flashReviewBack').hidden) return;
        const item = card(reviewQueue[reviewIndex]); if (!item) return;
        const before = structuredClone(box());
        const at = Date.now();
        const previous = box().states[item.id] || {};
        const next = core.nextState(previous, rating, at);
        box().states[item.id] = next;
        box().reviews.push({ id: id('review'), cardId: item.id, at, rating, previousIntervalDays: Number(previous.intervalDays) || 0, nextIntervalDays: next.intervalDays });
        if (!persist()) { appData.flashcards = before; return; }
        reviewIndex += 1; renderReview();
    }

    function aiSource() {
        const current = deck(); if (!current) throw new Error('Escolha um deck.');
        const matters = (current.subjectIds || [current.subjectId]).map(subjectId => appData.cycleItems.find(item => String(item.id) === String(subjectId))).filter(Boolean);
        const same = name => matters.some(item => core.key(name) === core.key(item.subject));
        const topicMatches = name => core.key(name) === core.key(current.topic);
        const sourceType = el('flashAiSource').value;
        if (sourceType === 'topic') return { sourceType, sourceLabel: 'Tema informado; sem arquivo do aluno', source: current.topic || current.name };
        if (sourceType === 'text') return { sourceType, sourceLabel: 'Texto colado nesta geração', source: el('flashAiText').value.trim().slice(0, 12000) };
        if (sourceType === 'notes') {
            const pages = matters.flatMap(matter => (matter.topicos?.find(item => topicMatches(item.nome))?.caderno?.paginas || []).map(item => `${matter.subject} — ${item.titulo || ''}: ${item.texto || ''}`)).filter(Boolean).slice(0, 12);
            if (!pages.length) throw new Error('Este assunto ainda não tem páginas no caderno. Escolha outra origem ou escreva uma nota primeiro.');
            return { sourceType, sourceLabel: `Caderno de ${current.topic}`, source: pages.join('\n\n').slice(0, 12000) };
        }
        if (sourceType === 'reviews') {
            const items = (appData.revisoesItems || []).filter(item => same(item.materia) && topicMatches(item.assunto)).slice(0, 12);
            if (!items.length) throw new Error('Não há revisões registradas para este assunto.');
            return { sourceType, sourceLabel: `Revisões de ${current.topic}`, source: items.map(item => `${item.assunto}: ${item.observacao || item.questao || item.motivos?.join(', ') || ''}`).join('\n').slice(0, 12000) };
        }
        if (sourceType === 'errors') {
            const items = (appData.cadernoErrosItems || []).filter(item => same(item.materia) && topicMatches(item.assunto) && (specificErrorId === null || Number(item.id) === specificErrorId)).slice(0, 12);
            if (!items.length) throw new Error('Não há erros registrados para este assunto.');
            return { sourceType, sourceLabel: `Erros de ${current.topic}`, source: items.map(item => `Regra anti-erro: ${item.regra || ''}. Correção: ${item.respostaCorreta || ''}. Contexto: ${item.questao || ''}`).join('\n').slice(0, 12000) };
        }
        return { sourceType, sourceLabel: '', source: '' };
    }
    async function aiFile() {
        const file = el('flashAiFile').files?.[0];
        if (!file || file.size < 1 || file.size > 2 * 1024 * 1024) throw new Error('Escolha um arquivo de 1 byte até 2 MB.');
        const name = file.name.slice(0, 100);
        if (/\.(txt|md)$/i.test(name) && (file.type === 'text/plain' || file.type === 'text/markdown' || !file.type)) {
            const source = (await file.text()).slice(0, 12000);
            if (source.includes('\0')) throw new Error('O arquivo de texto parece inválido. Use TXT ou Markdown em UTF-8.');
            return { sourceType: 'file', sourceLabel: `Arquivo ${name}`, source };
        }
        if (!/\.pdf$/i.test(name) || file.type !== 'application/pdf' || await tipoRealAnexo(file) !== 'application/pdf') throw new Error('Use um TXT, MD ou PDF válido.');
        if (!window.KingSyllabusPdf?.extract) throw new Error('O leitor de PDF ainda está carregando. Tente novamente.');
        const pages = await window.KingSyllabusPdf.extract(file);
        return { sourceType: 'file', sourceLabel: `Arquivo ${name}`, source: pages.join('\n').slice(0, 12000) };
    }
    function syncAiSource() {
        el('flashAiTextField').hidden = el('flashAiSource').value !== 'text';
        el('flashAiFileField').hidden = el('flashAiSource').value !== 'file';
        if (el('flashAiSource').value !== 'errors') specificErrorId = null;
    }
    function openAi() {
        if (!box().decks.length) return showToast('Crie um deck antes de gerar cartões.', true);
        el('flashAiDeck').innerHTML = box().decks.map(item => `<option value="${escape(item.id)}" ${item.id === selectedDeckId ? 'selected' : ''}>${escape(item.name)} · ${escape(subjectNames(item))}</option>`).join('');
        el('flashAiSource').value = 'topic'; syncAiSource();
        el('flashAiHint').textContent = 'A IA receberá somente a origem escolhida. Revise cada cartão antes de adicionar.';
        candidates = []; el('flashAiPreview').replaceChildren(); el('flashAiApproval').hidden = true; el('flashAiStatus').textContent = '';
        el('flashAiDialog').showModal();
    }
    function openAiFromError() {
        const error = (appData.cadernoErrosItems || []).find(item => Number(item.id) === specificErrorId);
        if (!error) { specificErrorId = null; return; }
        const pending = specificErrorId;
        openAi();
        specificErrorId = pending;
        el('flashAiSource').value = 'errors';
        syncAiSource();
        el('flashAiHint').textContent = 'Somente este erro será enviado à IA. Confira a sugestão antes de salvar.';
    }
    function fromError(errorId) {
        const error = (appData.cadernoErrosItems || []).find(item => Number(item.id) === Number(errorId));
        if (!error) return showToast('Este erro não está mais disponível.', true);
        const matter = appData.cycleItems.find(item => core.key(item.subject) === core.key(error.materia));
        if (!matter) return showToast('Cadastre esta matéria novamente antes de criar o flashcard.', true);
        showSection('flashcards');
        const existing = box().decks.find(item => (item.subjectIds || [item.subjectId]).map(String).includes(String(matter.id)) && core.key(item.topic) === core.key(error.assunto));
        if (existing) { specificErrorId = Number(error.id); selectedDeckId = existing.id; render(); openAiFromError(); return; }
        pendingErrorId = Number(error.id);
        openDeckDialog();
        el('flashDeckName').value = `Erros de ${error.assunto}`.slice(0, 80);
        fillSubjects(String(matter.id));
        subjectPicker?.set([String(matter.id)]);
        el('flashDeckTopic').value = error.assunto;
        showToast('Confirme o deck para transformar este erro em flashcard.');
    }
    function prefillFromReview(reviewId) {
        const review = (appData.revisoesItems || []).find(item => Number(item.id) === Number(reviewId));
        if (!review) return;
        clearCardForm();
        el('flashFront').value = `O que preciso lembrar sobre ${review.assunto || 'este assunto'}?`.slice(0, 400);
        el('flashBack').value = String(review.observacao || review.questao || '').slice(0, 800);
        el('flashFront').focus();
        el('flashCardForm').scrollIntoView({ behavior: 'smooth', block: 'center' });
        showToast('Confira a pergunta e resposta antes de salvar o cartão.');
    }
    function fromReview(reviewId) {
        const review = (appData.revisoesItems || []).find(item => Number(item.id) === Number(reviewId));
        if (!review) return showToast('Esta revisão não está mais disponível.', true);
        const related = (review.materiaIds || []).map(subjectId => appData.cycleItems.find(item => String(item.id) === String(subjectId))).filter(Boolean);
        const matter = related[0] || appData.cycleItems.find(item => core.key(item.subject) === core.key(review.materia));
        if (!matter) return showToast('Cadastre a matéria desta revisão antes de criar o flashcard.', true);
        showSection('flashcards');
        const existing = box().decks.find(item => (item.subjectIds || [item.subjectId]).map(String).includes(String(matter.id)) && core.key(item.topic) === core.key(review.assunto));
        if (existing) { selectedDeckId = existing.id; render(); prefillFromReview(reviewId); return; }
        pendingReviewId = Number(review.id);
        openDeckDialog();
        el('flashDeckName').value = `Revisões de ${review.assunto}`.slice(0, 80);
        fillSubjects(String(matter.id)); subjectPicker?.set((related.length ? related : [matter]).map(item => String(item.id)));
        el('flashDeckTopic').value = review.assunto;
        showToast('Confirme o deck para preparar o cartão.');
    }
    async function generate(event) {
        event.preventDefault(); if (generating) return;
        const count = el('flashAiCount').value === 'custom' ? Number(el('flashAiCustomCount').value) : Number(el('flashAiCount').value);
        if (!Number.isInteger(count) || count < 1 || count > 30) return showToast('Escolha de 1 a 30 cartões.', true);
        selectedDeckId = el('flashAiDeck').value;
        const current = deck(); if (!current) return showToast('Escolha um deck válido.', true);
        generating = true; el('flashAiGenerate').disabled = true; el('flashAiStatus').textContent = 'Preparando apenas a fonte escolhida…';
        try {
            const source = el('flashAiSource').value === 'file' ? await aiFile() : aiSource();
            if (source.sourceType !== 'topic' && source.source.length < 30) throw new Error('A fonte tem pouco texto para gerar cartões confiáveis.');
            if (source.sourceType === 'topic' && !source.source) throw new Error('Informe o assunto do deck antes de gerar cartões.');
            await window.kingGeminiReady;
            if (!window.kingGemini?.generateFlashcards) throw new Error('O Gemini não está disponível agora. Você ainda pode criar cartões manualmente.');
            el('flashAiStatus').textContent = 'Gerando prévia. Nada será salvo sem sua aprovação…';
            const result = await window.kingGemini.generateFlashcards({ subject: subjectNames(current), topic: current.topic || current.name, ...source, count, level: el('flashAiLevel').value, type: el('flashAiType').value });
            candidates = core.validateCandidates(result, box().cards.filter(item => item.deckId === current.id), count);
            if (!candidates.length) throw new Error('Todos os cartões gerados já existem ou não passaram na validação.');
            candidateSource = source.sourceLabel;
            el('flashAiStatus').textContent = `${candidates.length} sugestões. Edite ou descarte antes de salvar. Fonte: ${candidateSource}.`;
            renderCandidates();
        } catch (error) { el('flashAiStatus').textContent = friendlyError(error); el('flashAiApproval').hidden = true; }
        finally { generating = false; el('flashAiGenerate').disabled = false; }
    }
    function renderCandidates() {
        el('flashAiPreview').innerHTML = candidates.map((item, index) => `<div class="flash-ai-candidate"><input type="checkbox" data-flash-accept="${index}" checked aria-label="Adicionar cartão ${index + 1}"><div><label>Frente<input type="text" maxlength="400" data-flash-front="${index}" value="${escape(item.front)}"></label><label>Verso<textarea maxlength="800" rows="2" data-flash-back="${index}">${escape(item.back)}</textarea></label></div></div>`).join('');
        el('flashAiApproval').hidden = !candidates.length;
    }
    function addCandidates() {
        const current = box().decks.find(item => item.id === el('flashAiDeck').value);
        if (!current) return showToast('O deck não está mais disponível.', true);
        const accepted = [...el('flashAiPreview').querySelectorAll('[data-flash-accept]:checked')].map(input => {
            const index = Number(input.dataset.flashAccept);
            return core.normalizeCandidate({ front: el('flashAiPreview').querySelector(`[data-flash-front="${index}"]`)?.value, back: el('flashAiPreview').querySelector(`[data-flash-back="${index}"]`)?.value });
        }).filter(Boolean);
        const unique = core.validateCandidates(accepted, box().cards.filter(item => item.deckId === current.id), 30);
        if (!unique.length) return showToast('Selecione e confira pelo menos um cartão novo.', true);
        const before = structuredClone(box());
        const now = Date.now();
        unique.forEach(item => box().cards.push({ id: id('card'), deckId: current.id, ...item, sourceLabel: candidateSource, createdAt: now, updatedAt: now }));
        if (!persist(`${unique.length} cartões adicionados.`)) { appData.flashcards = before; return; }
        selectedDeckId = current.id; el('flashAiDialog').close(); render();
    }

    const deckSearch = document.createElement('input');
    deckSearch.id = 'flashDeckSearch';
    deckSearch.type = 'search';
    deckSearch.className = 'flash-deck-search';
    deckSearch.placeholder = 'Buscar matéria, assunto ou deck';
    deckSearch.setAttribute('aria-label', 'Buscar matéria, assunto ou deck');
    el('flashDeckList')?.before(deckSearch);
    deckSearch.addEventListener('input', renderDeckList);
    subjectPicker = window.KingSubjectPicker.create(el('flashDeckSubjectsPicker'), {
        subjects: () => appData.cycleItems,
        placeholder: 'Escolha uma ou mais matérias',
        onChange: ids => { el('flashDeckSubject').value = ids[0] || ''; fillTopics(); }
    });
    const countSelect = el('flashAiCount');
    countSelect?.add(new Option('Personalizado', 'custom'));
    const customCount = document.createElement('input');
    customCount.id = 'flashAiCustomCount';
    customCount.type = 'number';
    customCount.min = '1';
    customCount.max = '30';
    customCount.value = '10';
    customCount.hidden = true;
    customCount.setAttribute('aria-label', 'Quantidade personalizada de 1 a 30 cartões');
    countSelect?.after(customCount);
    countSelect?.addEventListener('change', () => { customCount.hidden = countSelect.value !== 'custom'; customCount.required = !customCount.hidden; });
    el('flashStatusFilter')?.add(new Option('Errei recentemente', 'wrong'));
    el('flashDeckOpen')?.addEventListener('click', () => openDeckDialog());
    el('flashEditDeck')?.addEventListener('click', () => openDeckDialog(true));
    el('flashDeckSubjectToggle')?.addEventListener('click', () => {
        const options = el('flashDeckSubjectOptions');
        const opening = options.hidden;
        closeDeckPickers();
        options.hidden = !opening;
        el('flashDeckSubjectToggle').setAttribute('aria-expanded', String(opening));
    });
    el('flashDeckSubjectToggle')?.addEventListener('keydown', event => {
        if (event.key === 'ArrowDown' || event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            el('flashDeckSubjectOptions').hidden = false;
            el('flashDeckSubjectToggle').setAttribute('aria-expanded', 'true');
            el('flashDeckSubjectOptions').querySelector('button')?.focus();
        }
    });
    el('flashDeckSubjectOptions')?.addEventListener('click', event => {
        const option = event.target.closest('[data-flash-subject]');
        if (option) selectDeckSubject(option.dataset.flashSubject);
    });
    el('flashDeckSubjectOptions')?.addEventListener('keydown', event => {
        const options = [...el('flashDeckSubjectOptions').querySelectorAll('button')];
        const index = options.indexOf(document.activeElement);
        if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); closeDeckPickers(); el('flashDeckSubjectToggle').focus(); }
        if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
            event.preventDefault();
            options[(index + (event.key === 'ArrowDown' ? 1 : -1) + options.length) % options.length]?.focus();
        }
    });
    el('flashDeckTopic')?.addEventListener('focus', showTopicOptions);
    el('flashDeckTopic')?.addEventListener('input', showTopicOptions);
    el('flashDeckTopic')?.addEventListener('keydown', event => {
        if (event.key === 'Escape' && !el('flashTopicOptions').hidden) { event.preventDefault(); event.stopPropagation(); closeDeckPickers(); }
        if (event.key === 'ArrowDown' && !el('flashTopicOptions').hidden) { event.preventDefault(); el('flashTopicOptions').querySelector('button')?.focus(); }
    });
    el('flashTopicOptions')?.addEventListener('click', event => {
        const option = event.target.closest('[data-flash-topic]');
        if (!option) return;
        el('flashDeckTopic').value = option.dataset.flashTopic;
        el('flashDeckTopic').focus();
        closeDeckPickers();
    });
    el('flashTopicOptions')?.addEventListener('keydown', event => {
        const options = [...el('flashTopicOptions').querySelectorAll('button')];
        const index = options.indexOf(document.activeElement);
        if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); closeDeckPickers(); el('flashDeckTopic').focus(); }
        if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
            event.preventDefault();
            options[(index + (event.key === 'ArrowDown' ? 1 : -1) + options.length) % options.length]?.focus();
        }
    });
    el('flashDeckDialog')?.addEventListener('pointerdown', event => {
        if (!event.target.closest('.flash-picker-field, .flash-topic-field')) closeDeckPickers();
    });
    el('flashDeckForm')?.addEventListener('submit', saveDeck);
    el('flashDeleteDeck')?.addEventListener('click', deleteDeck);
    el('flashDeckList')?.addEventListener('click', event => {
        const menu = event.target.closest('[data-flash-menu]');
        if (menu) return openDeckMenu(menu.dataset.flashMenu);
        const button = event.target.closest('[data-flash-deck]');
        if (button) { selectedDeckId = button.dataset.flashDeck; clearCardForm(); render(); }
    });
    el('flashDeckList')?.addEventListener('contextmenu', event => {
        const row = event.target.closest('[data-flash-deck-row]');
        if (!row) return;
        event.preventDefault(); openDeckMenu(row.dataset.flashDeckRow);
    });
    el('flashDeckList')?.parentElement?.addEventListener('click', event => {
        const button = event.target.closest('[data-flash-restore]'); if (button) restoreDeck(button.dataset.flashRestore);
    });
    el('flashDeckMenu')?.addEventListener('click', event => {
        const action = event.target.closest('[data-deck-action]')?.dataset.deckAction;
        if (!action) return;
        el('flashDeckMenu').close();
        if (action === 'cancel') return;
        selectedDeckId = menuDeckId; render();
        if (action === 'open') return;
        if (action === 'rename' || action === 'edit') { openDeckDialog(true); if (action === 'rename') el('flashDeckName').select(); }
        if (action === 'duplicate') duplicateSelectedDeck();
        if (action === 'delete') deleteDeck();
    });
    el('flashCardForm')?.addEventListener('submit', saveCard);
    el('flashCancelEdit')?.addEventListener('click', clearCardForm);
    el('flashCardList')?.addEventListener('click', event => { const edit = event.target.closest('[data-flash-edit]'); const remove = event.target.closest('[data-flash-delete]'); if (edit) editCard(edit.dataset.flashEdit); if (remove) deleteCard(remove.dataset.flashDelete); });
    el('flashSearch')?.addEventListener('input', renderCards);
    el('flashStatusFilter')?.addEventListener('change', renderCards);
    el('flashStart')?.addEventListener('click', openReview);
    el('flashReveal')?.addEventListener('click', () => { el('flashReviewBack').hidden = false; el('flashReveal').hidden = true; el('flashRatings').hidden = false; });
    el('flashRatings')?.addEventListener('click', event => { const button = event.target.closest('[data-flash-rating]'); if (button) rate(button.dataset.flashRating); });
    el('flashGenerateOpen')?.addEventListener('click', openAi);
    el('flashAiSource')?.addEventListener('change', syncAiSource);
    el('flashAiForm')?.addEventListener('submit', generate);
    el('flashAiRegenerate')?.addEventListener('click', () => el('flashAiForm').requestSubmit());
    el('flashAiAddSelected')?.addEventListener('click', addCandidates);
    document.querySelectorAll('[data-flash-close]').forEach(button => button.addEventListener('click', () => el(button.dataset.flashClose)?.close()));
    for (const dialog of [el('flashDeckDialog'), el('flashReviewDialog'), el('flashAiDialog')]) dialog?.addEventListener('click', event => { if (event.target === dialog) dialog.close(); });
    el('flashDeckDialog')?.addEventListener('close', () => { pendingErrorId = null; pendingReviewId = null; closeDeckPickers(); });
    el('flashAiDialog')?.addEventListener('close', () => { specificErrorId = null; });
    window.KingFlashcards = { render, updateDashboard, openDeck: openDeckDialog, openReview, fromError, fromReview };
    render();
})();
