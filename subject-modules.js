/* Biblioteca de arquivos por matéria. Grupos antigos são mantidos apenas para recuperar anexos. */
(() => {
    const $ = id => document.getElementById(id);
    const safe = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
    const subjects = () => Array.isArray(appData.cycleItems) ? appData.cycleItems : [];
    const libraries = () => appData.subjectContentModules && typeof appData.subjectContentModules === 'object' && !Array.isArray(appData.subjectContentModules) ? appData.subjectContentModules : (appData.subjectContentModules = {});
    const filesFor = id => Array.isArray(libraries()[String(id)]) ? libraries()[String(id)] : [];
    const oldGroups = () => (Array.isArray(appData.subjectModules) ? appData.subjectModules : []).filter(group => Array.isArray(group.files) && group.files.length);
    const subjectById = id => subjects().find(item => String(item.id) === String(id));
    const color = value => /^#[0-9a-f]{6}$/i.test(String(value)) ? value : '#3288ed';
    const fileSize = bytes => Number(bytes) >= 1048576 ? `${(Number(bytes) / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.round(Number(bytes) / 1024))} KB`;
    let selectedSubjectId = '';
    let uploading = false;
    let viewerUrl = '';
    let viewerRequest = 0;

    function fileCard(sourceId, file, legacy = false) {
        const kind = file.type === 'application/pdf' ? 'PDF' : file.type?.startsWith('image/') ? 'IMG' : 'TXT';
        const date = file.uploadedAt ? ` · ${new Date(file.uploadedAt).toLocaleDateString('pt-BR')}` : '';
        return `<article class="module-file-card"><span class="module-file-icon" aria-hidden="true">${kind}</span><div class="module-file-details"><strong>${safe(file.title || file.name)}</strong><small>${safe(file.name)} · ${fileSize(file.size)}${date}</small></div><div class="module-file-actions"><button type="button" class="cycle-btn primary" data-module-action="view" data-source-id="${safe(sourceId)}" data-file-id="${safe(file.id)}" data-legacy="${legacy}">Ler módulo</button>${legacy ? '' : `<button type="button" class="cycle-btn" data-module-action="rename" data-source-id="${safe(sourceId)}" data-file-id="${safe(file.id)}">Renomear</button><button type="button" class="cycle-btn module-delete" data-module-action="delete" data-source-id="${safe(sourceId)}" data-file-id="${safe(file.id)}">Excluir</button>`}</div></article>`;
    }
    function render() {
        const list = $('moduleSubjectsList');
        const grid = $('modulesGrid');
        if (!list || !grid) return;
        const all = subjects();
        if (!subjectById(selectedSubjectId)) selectedSubjectId = all.length ? String(all[0].id) : '';
        const total = all.reduce((sum, subject) => sum + filesFor(subject.id).length, 0);
        $('modulesSummary').innerHTML = `<span><strong>${all.length}</strong> ${all.length === 1 ? 'matéria' : 'matérias'}</span><span><strong>${total}</strong> ${total === 1 ? 'módulo anexado' : 'módulos anexados'}</span><span>PDF, imagem ou texto · até 6 MB por arquivo</span>`;
        list.innerHTML = all.length ? all.map(subject => `<button type="button" class="module-subject-choice ${String(subject.id) === selectedSubjectId ? 'selected' : ''}" data-subject-id="${safe(subject.id)}" aria-pressed="${String(subject.id) === selectedSubjectId}"><i style="background:${color(subject.color)}" aria-hidden="true"></i><span>${safe(subject.subject || 'Matéria')}<small>${filesFor(subject.id).length} ${filesFor(subject.id).length === 1 ? 'módulo' : 'módulos'}</small></span></button>`).join('') : '<p class="module-empty">Cadastre uma matéria primeiro. Os módulos ficarão ligados a ela.</p>';
        const subject = subjectById(selectedSubjectId);
        if (!subject) grid.innerHTML = '<div class="module-start"><span aria-hidden="true">▣</span><h3>Comece pelas matérias</h3><p>Depois de cadastrar uma matéria, você poderá anexar apostilas e ler cada módulo aqui.</p><button type="button" class="cycle-btn primary" data-module-action="subjects">Ir para Minhas matérias</button></div>';
        else {
            const files = filesFor(subject.id);
            grid.innerHTML = `<div class="module-library-heading"><div><span class="workspace-kicker">BIBLIOTECA DA MATÉRIA</span><h3>${safe(subject.subject || 'Matéria')}</h3><p>${files.length ? `${files.length} ${files.length === 1 ? 'módulo para ler' : 'módulos para ler'} dentro do King Master.` : 'Anexe o primeiro módulo desta matéria para começar.'}</p></div><button type="button" class="cycle-btn primary" data-module-action="upload" data-source-id="${safe(subject.id)}">+ Anexar módulo</button></div><div class="module-file-grid">${files.length ? files.map(file => fileCard(subject.id, file)).join('') : `<div class="module-empty-state"><span aria-hidden="true">▤</span><h4>Nenhum módulo de ${safe(subject.subject || 'esta matéria')}</h4><p>Escolha um PDF, uma imagem ou um texto. O arquivo ficará associado somente a esta matéria.</p><button type="button" class="cycle-btn primary" data-module-action="upload" data-source-id="${safe(subject.id)}">Escolher arquivo</button></div>`}</div>`;
        }
        const older = oldGroups();
        const legacy = $('moduleLegacy');
        legacy.hidden = !older.length;
        if (older.length) legacy.innerHTML = `<h3>Anexos anteriores</h3><p>Estes arquivos foram preservados para consulta. Novos módulos ficam diretamente na matéria escolhida.</p><div class="module-file-grid">${older.flatMap(group => group.files.map(file => fileCard(group.id, file, true))).join('')}</div>`;
    }
    function status(message = '', error = false) {
        const node = $('moduleUploadStatus'); node.hidden = !message; node.textContent = message; node.classList.toggle('error', error);
    }
    function errorMessage(error) {
        if (error?.code === 'permission-denied' || /Missing or insufficient permissions/i.test(error?.message || '')) return 'O envio de módulos ainda não está liberado na nuvem desta conta. As regras de acesso precisam ser publicadas.';
        return error?.message || 'Não foi possível acessar o arquivo. Confira a conexão e tente novamente.';
    }
    function chooseFile(id = selectedSubjectId) {
        if (uploading || !subjectById(id)) return;
        selectedSubjectId = String(id);
        $('moduleFileInput').value = '';
        $('moduleFileInput').click();
    }
    async function selectFile(event) {
        const file = event.target.files?.[0];
        if (!file || uploading) return;
        const subject = subjectById(selectedSubjectId);
        const extensionType = /\.pdf$/i.test(file.name) ? 'application/pdf' : /\.(txt|md)$/i.test(file.name) ? 'text/plain' : /\.png$/i.test(file.name) ? 'image/png' : /\.jpe?g$/i.test(file.name) ? 'image/jpeg' : /\.webp$/i.test(file.name) ? 'image/webp' : '';
        const type = extensionType || file.type;
        if (!subject) return status('Selecione uma matéria antes de anexar.', true);
        if (!/^(application\/pdf|image\/(png|jpeg|webp)|text\/plain)$/.test(type)) return status('Use PDF, imagem PNG/JPG/WebP, TXT ou Markdown.', true);
        if (!file.size || file.size > 6 * 1024 * 1024) return status('Escolha um arquivo de até 6 MB.', true);
        if (filesFor(subject.id).some(item => item.name === file.name && item.size === file.size)) return status('Este arquivo já está anexado a essa matéria.', true);
        if (!window.kingCloud?.uploadModuleFile) return status('A conexão com os arquivos ainda não está pronta. Aguarde e tente novamente.', true);
        uploading = true;
        const fileId = `arquivo-${crypto.randomUUID()}`;
        status(`Enviando ${file.name} para ${subject.subject}… Não feche a página.`);
        try {
            const saved = await window.kingCloud.uploadModuleFile(String(subject.id), fileId, file, type);
            if (!subjectById(subject.id)) throw new Error('A matéria foi removida durante o envio.');
            const previous = filesFor(subject.id);
            libraries()[String(subject.id)] = [...previous, { ...saved, title: file.name.replace(/\.[^.]+$/, '').slice(0, 100) }];
            try { saveAppData(); } catch (error) { libraries()[String(subject.id)] = previous; throw error; }
            render(); status(`Módulo anexado a ${subject.subject}.`);
        } catch (error) {
            window.kingCloud?.deleteModuleFile?.(String(subject.id), fileId).catch(() => {});
            status(errorMessage(error), true);
        } finally { uploading = false; event.target.value = ''; }
    }
    function findFile(sourceId, fileId, old = false) {
        return old ? oldGroups().find(group => String(group.id) === String(sourceId))?.files.find(file => String(file.id) === String(fileId)) : filesFor(sourceId).find(file => String(file.id) === String(fileId));
    }
    async function viewFile(sourceId, fileId, old = false) {
        const file = findFile(sourceId, fileId, old);
        if (!file || !window.kingCloud?.getModuleFile) return showToast('O arquivo não está disponível nesta conta.', true);
        closeFile();
        const request = viewerRequest;
        $('moduleFileViewer').classList.add('active');
        $('moduleFileViewerTitle').textContent = file.title || file.name;
        $('moduleFileViewerStatus').textContent = 'Abrindo arquivo privado…';
        try {
            const blob = await window.kingCloud.getModuleFile(String(sourceId), file.id);
            if (request !== viewerRequest || !$('moduleFileViewer').classList.contains('active')) return;
            viewerUrl = URL.createObjectURL(blob);
            $('moduleFileFrame').src = viewerUrl;
            $('moduleFileFrame').hidden = false;
            $('moduleFileDownload').href = viewerUrl;
            $('moduleFileDownload').download = file.name;
            $('moduleFileDownload').hidden = false;
            $('moduleFileViewerStatus').textContent = '';
        } catch (error) { $('moduleFileViewerStatus').textContent = errorMessage(error); }
    }
    function closeFile() {
        viewerRequest += 1;
        $('moduleFileViewer').classList.remove('active');
        $('moduleFileFrame').hidden = true;
        $('moduleFileFrame').removeAttribute('src');
        $('moduleFileDownload').hidden = true;
        $('moduleFileDownload').removeAttribute('href');
        if (viewerUrl) URL.revokeObjectURL(viewerUrl);
        viewerUrl = '';
    }
    function renameFile(sourceId, fileId) {
        const file = findFile(sourceId, fileId);
        if (!file) return;
        $('moduleRenameSubjectId').value = sourceId;
        $('moduleRenameFileId').value = fileId;
        $('moduleRenameTitle').value = file.title || file.name;
        $('moduleRenameModal').classList.add('active');
        $('moduleRenameTitle').focus();
    }
    function saveRename(event) {
        event.preventDefault();
        const file = findFile($('moduleRenameSubjectId').value, $('moduleRenameFileId').value);
        const title = $('moduleRenameTitle').value.trim().slice(0, 100);
        if (!file || !title) return;
        const previous = file.title; file.title = title;
        try { saveAppData(); fecharModal('moduleRenameModal'); render(); showToast('Nome do módulo atualizado.'); }
        catch { file.title = previous; showToast('Não foi possível salvar o nome.', true); }
    }
    function requestDelete(sourceId, fileId) {
        const file = findFile(sourceId, fileId);
        if (file) abrirModalDeletar('subjectContentModule', `${sourceId}|${fileId}`, 'Excluir este módulo?', `“${file.title || file.name}” será removido da matéria e apagado da nuvem.`, 'Excluir módulo');
    }
    async function confirmDelete(key) {
        const [sourceId, fileId] = String(key).split('|');
        const previous = filesFor(sourceId);
        const file = previous.find(item => String(item.id) === fileId);
        if (!file) return;
        libraries()[sourceId] = previous.filter(item => item.id !== file.id);
        try { saveAppData(); } catch { libraries()[sourceId] = previous; return showToast('Não foi possível salvar a remoção. O arquivo foi mantido.', true); }
        render();
        try { await window.kingCloud?.deleteModuleFile?.(sourceId, fileId); showToast('Módulo excluído.'); }
        catch { showToast('O módulo saiu da biblioteca, mas a cópia antiga não pôde ser removida da nuvem.', true); }
    }
    function removeSubject(id) {
        const files = filesFor(id);
        if (!files.length) return;
        delete libraries()[String(id)];
        files.forEach(file => window.kingCloud?.deleteModuleFile?.(String(id), file.id).catch(() => {}));
    }
    function handleAction(event) {
        const button = event.target.closest('[data-module-action]');
        if (!button) return;
        const { moduleAction: action, sourceId, fileId } = button.dataset;
        if (action === 'upload') chooseFile(sourceId);
        if (action === 'view') viewFile(sourceId, fileId, button.dataset.legacy === 'true');
        if (action === 'rename') renameFile(sourceId, fileId);
        if (action === 'delete') requestDelete(sourceId, fileId);
        if (action === 'subjects') alternarAbasHub('ciclo');
    }
    $('modulesGrid')?.addEventListener('click', handleAction);
    $('moduleLegacy')?.addEventListener('click', handleAction);
    $('moduleSubjectsList')?.addEventListener('click', event => {
        const button = event.target.closest('[data-subject-id]');
        if (!button) return;
        selectedSubjectId = button.dataset.subjectId;
        status(); render();
    });
    window.KingModules = { render, chooseFile, selectFile, closeFile, saveRename, confirmDelete, removeSubject };
})();
