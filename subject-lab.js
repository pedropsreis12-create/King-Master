/* Laboratório de matérias: leitura de edital com conferência humana antes de salvar. */
(() => {
    const byId = id => document.getElementById(id);
    const safe = value => typeof escaparRevisaoHtml === 'function' ? escaparRevisaoHtml(String(value ?? '')) : String(value ?? '');
    const normalized = value => String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('pt-BR').replace(/[^a-z0-9]+/g, ' ').trim();
    const state = { file: null, results: [] };

    function openSyllabus() {
        if (!appData.cycleItems.length) { showToast('Cadastre pelo menos uma matéria antes de importar o edital.', true); return abrirModalCiclo(); }
        reset(); byId('syllabusAiModal').classList.add('active');
    }
    function closeSyllabus() { fecharModal('syllabusAiModal'); }
    function reset() {
        state.file = null; state.results = [];
        if (byId('syllabusFileInput')) byId('syllabusFileInput').value = '';
        if (byId('syllabusInstruction')) byId('syllabusInstruction').value = '';
        byId('syllabusFileSummary').hidden = true; byId('syllabusResults').hidden = true; byId('syllabusActions').hidden = true;
        byId('syllabusAnalyzeButton').disabled = true; byId('syllabusStatus').textContent = '';
    }
    function selectFile(event) {
        const file = event.target.files?.[0];
        if (!file) return reset();
        if (file.size > 7 * 1024 * 1024) { event.target.value = ''; return showToast('O arquivo precisa ter no máximo 7 MB.', true); }
        const accepted = /^(application\/pdf|text\/plain|text\/markdown|image\/(png|jpeg|webp))$/.test(file.type) || /\.(md|txt)$/i.test(file.name);
        if (!accepted) { event.target.value = ''; return showToast('Use PDF, TXT, Markdown, PNG, JPG ou WebP.', true); }
        state.file = file;
        byId('syllabusFileSummary').hidden = false;
        byId('syllabusFileSummary').innerHTML = `<span>✓</span><div><strong>${safe(file.name)}</strong><small>${(file.size / 1024 / 1024).toFixed(2)} MB · pronto para analisar</small></div>`;
        byId('syllabusAnalyzeButton').disabled = false; byId('syllabusStatus').textContent = '';
    }
    const readFile = (file, textMode) => new Promise((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(reader.result); reader.onerror = reject; textMode ? reader.readAsText(file, 'utf-8') : reader.readAsDataURL(file); });
    async function analyze() {
        if (!state.file) return;
        const button = byId('syllabusAnalyzeButton'); button.disabled = true; button.textContent = 'Lendo e organizando…';
        byId('syllabusFileInput').disabled = true;
        byId('syllabusStatus').textContent = 'A IA está separando somente os conteúdos que consegue identificar com segurança.';
        try {
            await window.kingGeminiReady;
            if (!window.kingGemini?.analyzeSyllabus) throw new Error('A leitura inteligente ainda não está disponível.');
            const file = state.file;
            const textMode = /^text\//.test(file.type) || /\.(md|txt)$/i.test(file.name);
            const isPdf = file.type === 'application/pdf' || /\.pdf$/i.test(file.name);
            let parts;
            if (isPdf) {
                if (!window.KingSyllabusPdf?.extract) throw new Error('O leitor de PDF ainda está carregando. Tente novamente em alguns segundos.');
                byId('syllabusStatus').textContent = 'Extraindo o texto do PDF no seu dispositivo…';
                const pages = await window.KingSyllabusPdf.extract(file);
                parts = [];
                let batch = '';
                for (const page of pages) {
                    if (batch && batch.length + page.length > 18000) { parts.push(batch); batch = ''; }
                    batch += `${page}\n`;
                }
                if (batch) parts.push(batch);
            } else if (textMode) {
                const text = String(await readFile(file, true));
                parts = text.match(/[\s\S]{1,18000}/g) || [];
            } else {
                const raw = await readFile(file, false);
                parts = [{ image: String(raw).split(',')[1] || '' }];
            }
            if (!parts.length) throw new Error('O arquivo está vazio.');
            const groups = new Map();
            for (let index = 0; index < parts.length; index++) {
                byId('syllabusStatus').textContent = `Analisando parte ${index + 1} de ${parts.length}… Seus tópicos ainda não serão adicionados.`;
                const payload = typeof parts[index] === 'string'
                    ? { name: file.name, mimeType: 'text/plain', text: parts[index] }
                    : { name: file.name, mimeType: file.type, base64: parts[index].image };
                const response = await window.kingGemini.analyzeSyllabus({ ...payload, subjects: appData.cycleItems.map(item => item.subject), instruction: byId('syllabusInstruction')?.value.trim().slice(0, 500) || '' });
                for (const group of response?.materias || []) {
                    const key = normalized(group.nome);
                    if (!key) continue;
                    if (!groups.has(key)) groups.set(key, { nome: group.nome, topicos: [] });
                    const saved = groups.get(key);
                    const known = new Set(saved.topicos.map(normalized));
                    for (const topic of group.topicos || []) {
                        const topicKey = normalized(topic);
                        if (topicKey && !known.has(topicKey)) { saved.topicos.push(topic); known.add(topicKey); }
                    }
                }
            }
            state.results = [...groups.values()].filter(item => item.topicos.length);
            if (!state.results.length) throw new Error('Não encontrei uma lista clara de conteúdos neste arquivo.');
            renderResults();
            byId('syllabusStatus').textContent = `${state.results.reduce((sum, item) => sum + item.topicos.length, 0)} assuntos encontrados. Confira o destino de cada grupo.`;
        } catch (error) {
            byId('syllabusStatus').textContent = /timeout|timed out|deadline/i.test(error?.message || '')
                ? 'A análise demorou mais que o esperado. O arquivo continua selecionado; tente novamente.'
                : error.message || 'Não foi possível analisar este edital.';
            showToast(byId('syllabusStatus').textContent, true);
        } finally { button.disabled = false; button.textContent = 'Analisar e separar assuntos'; byId('syllabusFileInput').disabled = false; }
    }
    function subjectOptions(resultName) {
        const match = appData.cycleItems.find(item => normalized(item.subject) === normalized(resultName))
            || appData.cycleItems.find(item => normalized(resultName).includes(normalized(item.subject)) || normalized(item.subject).includes(normalized(resultName)));
        return `<option value="">Escolha a matéria</option>${appData.cycleItems.map(item => `<option value="${safe(item.id)}" ${match && String(match.id) === String(item.id) ? 'selected' : ''}>${safe(item.subject)}</option>`).join('')}`;
    }
    function renderResults() {
        byId('syllabusResults').hidden = false; byId('syllabusActions').hidden = false;
        byId('syllabusResults').innerHTML = state.results.map((group, groupIndex) => `<article class="syllabus-group"><header><div><small>GRUPO IDENTIFICADO</small><strong>${safe(group.nome || 'Conteúdos')}</strong></div><label>Adicionar em<select class="cycle-input" data-syllabus-subject="${groupIndex}">${subjectOptions(group.nome)}</select></label></header><div>${group.topicos.map((topic, topicIndex) => `<label class="syllabus-topic"><input type="checkbox" data-syllabus-topic="${groupIndex}:${topicIndex}" checked><span>${safe(topic)}</span></label>`).join('')}</div></article>`).join('');
    }
    function apply() {
        let added = 0, ignored = 0, unmapped = 0;
        state.results.forEach((group, groupIndex) => {
            const select = document.querySelector(`[data-syllabus-subject="${groupIndex}"]`);
            const subject = appData.cycleItems.find(item => String(item.id) === String(select?.value));
            const selected = group.topicos.filter((_, topicIndex) => document.querySelector(`[data-syllabus-topic="${groupIndex}:${topicIndex}"]`)?.checked);
            if (!subject) { if (selected.length) unmapped += selected.length; return; }
            if (!Array.isArray(subject.topicos)) subject.topicos = [];
            const known = new Set(subject.topicos.map(item => normalized(item.nome)));
            selected.forEach(name => {
                const key = normalized(name);
                if (!key || known.has(key)) { ignored += 1; return; }
                subject.topicos.push({ nome: String(name).trim().slice(0, 100), concluido: false, prioridade: 'media', nivelDominio: 0, notas: '', origem: 'edital-ia' });
                known.add(key); added += 1;
            });
        });
        if (!added && unmapped) return showToast('Escolha a matéria de destino dos grupos selecionados.', true);
        if (!added) return showToast('Nenhum tópico novo foi selecionado.', true);
        saveAppData(); renderizarCiclo(); renderizarMapaDominio(); closeSyllabus();
        showToast(`${added} ${added === 1 ? 'tópico adicionado' : 'tópicos adicionados'}${ignored ? ` · ${ignored} repetidos ignorados` : ''}.`);
    }
    window.KingSubjectLab = { openSyllabus, closeSyllabus, reset, selectFile, analyze, apply };
})();
