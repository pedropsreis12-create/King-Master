/* Módulos são grupos de matérias existentes; nenhum assunto é copiado ou movido. */
(() => {
    const $ = id => document.getElementById(id);
    const safe = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
    const modules = () => Array.isArray(appData.subjectModules) ? appData.subjectModules : (appData.subjectModules = []);
    const subjects = () => Array.isArray(appData.cycleItems) ? appData.cycleItems : [];
    const validColor = value => /^#[0-9a-f]{6}$/i.test(String(value)) ? value : '#3288ed';
    const moduleFiles = group => Array.isArray(group?.files) ? group.files : [];
    const fileSize = bytes => Number(bytes) >= 1048576 ? `${(Number(bytes) / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.round(Number(bytes) / 1024))} KB`;
    let selectedModuleId = '';
    let uploading = false;
    let viewerUrl = '';
    let viewerRequest = 0;

    function render() {
        const grid = $('modulesGrid');
        if (!grid) return;
        const groups = modules();
        const existing = new Set(groups.map(group => String(group.id)));
        const ungrouped = subjects().filter(subject => !existing.has(String(subject.moduleId || '')));
        $('modulesSummary').innerHTML = `<div><strong>${groups.length}</strong><span>${groups.length === 1 ? 'módulo' : 'módulos'}</span></div><div><strong>${subjects().length - ungrouped.length}</strong><span>matérias organizadas</span></div><div><strong>${ungrouped.length}</strong><span>sem módulo</span></div>`;
        const cards = groups.map(group => {
            const members = subjects().filter(subject => String(subject.moduleId) === String(group.id));
            return `<article class="module-card widget"><header><div><span class="workspace-kicker">MÓDULO</span><h3>${safe(group.name || 'Sem nome')}</h3><small>${members.length} ${members.length === 1 ? 'matéria' : 'matérias'} · ${moduleFiles(group).length} ${moduleFiles(group).length === 1 ? 'arquivo' : 'arquivos'}</small></div><div class="module-card-actions"><button type="button" data-module-action="edit" data-module-id="${safe(group.id)}" aria-label="Editar módulo ${safe(group.name)}">Editar</button><button type="button" data-module-action="delete" data-module-id="${safe(group.id)}" aria-label="Excluir módulo ${safe(group.name)}">Excluir</button></div></header><div class="module-subject-list">${members.length ? members.map(subject => subjectRow(subject)).join('') : '<p class="module-empty">Nenhuma matéria neste módulo. Use Editar para adicioná-las.</p>'}</div><section class="module-files"><div class="module-files-heading"><strong>Conteúdos anexados</strong><button type="button" data-module-action="upload" data-module-id="${safe(group.id)}">＋ Anexar arquivo</button></div>${moduleFiles(group).length ? moduleFiles(group).map(file => `<div class="module-file-row"><span aria-hidden="true">${file.type === 'application/pdf' ? '▤' : file.type?.startsWith('image/') ? '▧' : '≡'}</span><div><strong>${safe(file.name)}</strong><small>${fileSize(file.size)}</small></div><button type="button" data-module-action="view-file" data-module-id="${safe(group.id)}" data-file-id="${safe(file.id)}" aria-label="Abrir ${safe(file.name)}">Abrir</button><button type="button" data-module-action="remove-file" data-module-id="${safe(group.id)}" data-file-id="${safe(file.id)}" aria-label="Remover ${safe(file.name)}">×</button></div>`).join('') : '<p class="module-empty">Anexe PDF, imagem ou texto deste módulo para consultar quando quiser.</p>'}</section></article>`;
        });
        if (!groups.length) cards.push('<div class="module-start widget"><span aria-hidden="true">▣</span><h3>Seus módulos começam aqui</h3><p>Crie um grupo para reunir matérias que você quer ver juntas.</p><button type="button" class="cycle-btn primary" data-module-action="create">Criar primeiro módulo</button></div>');
        if (ungrouped.length) cards.push(`<article class="module-card module-ungrouped widget"><header><div><span class="workspace-kicker">AINDA SEM GRUPO</span><h3>Matérias não organizadas</h3><small>Elas continuam disponíveis normalmente.</small></div></header><div class="module-subject-list">${ungrouped.map(subject => subjectRow(subject)).join('')}</div></article>`);
        if (!subjects().length && groups.length) cards.push('<p class="module-hint">Cadastre matérias para adicioná-las aos módulos.</p>');
        grid.innerHTML = cards.join('');
    }

    function subjectRow(subject) {
        const total = Array.isArray(subject.topicos) ? subject.topicos.length : 0;
        const mastered = (subject.topicos || []).filter(topic => obterNivelDominioTopico(topic) === 3).length;
        return `<button type="button" class="module-subject" data-module-action="subject" data-subject-id="${safe(subject.id)}"><i style="background:${validColor(subject.color)}" aria-hidden="true"></i><span><strong>${safe(subject.subject || 'Matéria')}</strong><small>${mastered}/${total} assuntos dominados</small></span><span class="module-subject-arrow" aria-hidden="true">↗</span></button>`;
    }

    function open(id = '', preselectSubjectId = '') {
        const group = modules().find(item => String(item.id) === String(id));
        $('subjectModuleForm').reset();
        $('subjectModuleId').value = group?.id || '';
        $('subjectModuleName').value = group?.name || '';
        $('subjectModuleModalTitle').textContent = group ? 'Editar módulo' : 'Criar módulo';
        $('moduleSubjects').innerHTML = subjects().length ? subjects().map(subject => {
            const selected = (Boolean(group) && String(subject.moduleId) === String(group.id)) || (Boolean(preselectSubjectId) && String(subject.id) === String(preselectSubjectId));
            const other = modules().find(item => String(item.id) === String(subject.moduleId) && String(item.id) !== String(group?.id || ''));
            return `<label class="module-subject-option"><input type="checkbox" name="moduleSubject" value="${safe(subject.id)}" ${selected ? 'checked' : ''}><i style="background:${validColor(subject.color)}" aria-hidden="true"></i><span><strong>${safe(subject.subject || 'Matéria')}</strong>${other ? `<small>Atualmente em ${safe(other.name)}</small>` : ''}</span></label>`;
        }).join('') : '<p class="module-empty">Nenhuma matéria cadastrada ainda. Você pode criar o módulo e adicionar matérias depois.</p>';
        $('subjectModuleModal').classList.add('active');
        $('subjectModuleName').focus();
    }

    function save(event) {
        event.preventDefault();
        const name = $('subjectModuleName').value.trim().slice(0, 70);
        if (!name) return;
        const id = $('subjectModuleId').value;
        const group = modules().find(item => String(item.id) === id);
        if (modules().some(item => String(item.id) !== id && String(item.name).toLocaleLowerCase('pt-BR') === name.toLocaleLowerCase('pt-BR'))) return showToast('Já existe um módulo com esse nome.', true);
        const previousGroups = structuredClone(modules());
        const previousAssignments = subjects().map(subject => subject.moduleId);
        const targetId = group?.id || `modulo-${crypto.randomUUID()}`;
        if (group) group.name = name;
        else modules().push({ id: targetId, name, createdAt: Date.now() });
        const selected = new Set([...$('moduleSubjects').querySelectorAll('input:checked')].map(input => input.value));
        subjects().forEach(subject => {
            if (selected.has(String(subject.id))) subject.moduleId = targetId;
            else if (String(subject.moduleId) === String(targetId)) delete subject.moduleId;
        });
        try {
            saveAppData();
            fecharModal('subjectModuleModal');
            render();
            showToast(group ? 'Módulo atualizado.' : 'Módulo criado.');
        } catch {
            appData.subjectModules = previousGroups;
            subjects().forEach((subject, index) => { if (previousAssignments[index] == null) delete subject.moduleId; else subject.moduleId = previousAssignments[index]; });
            showToast('Não foi possível salvar o módulo. Tente novamente.', true);
        }
    }

    function requestDelete(id) {
        const group = modules().find(item => String(item.id) === String(id));
        if (!group) return;
        abrirModalDeletar('subjectModule', group.id, 'Excluir este módulo?', `“${group.name}” será removido${moduleFiles(group).length ? ` junto com ${moduleFiles(group).length} arquivo(s) anexado(s)` : ''}. As matérias, os assuntos e o progresso permanecerão salvos.`, 'Excluir módulo');
    }

    function confirmDelete(id) {
        const removed = modules().find(item => String(item.id) === String(id));
        if (!removed) return;
        const previousGroups = structuredClone(modules());
        const previousAssignments = subjects().map(subject => subject.moduleId);
        appData.subjectModules = modules().filter(item => String(item.id) !== String(id));
        subjects().forEach(subject => { if (String(subject.moduleId) === String(id)) delete subject.moduleId; });
        try { saveAppData(); render(); showToast('Módulo excluído. As matérias foram mantidas.'); moduleFiles(removed).forEach(file => window.kingCloud?.deleteModuleFile?.(removed.id, file.id).catch(() => showToast('Um arquivo antigo não pôde ser removido da nuvem.', true))); }
        catch {
            appData.subjectModules = previousGroups;
            subjects().forEach((subject, index) => { if (previousAssignments[index] == null) delete subject.moduleId; else subject.moduleId = previousAssignments[index]; });
            showToast('Não foi possível excluir o módulo.', true);
        }
    }

    function setUploadStatus(message = '', error = false) {
        const status = $('moduleUploadStatus');
        status.hidden = !message;
        status.textContent = message;
        status.classList.toggle('error', error);
    }
    function chooseFile(id) {
        if (uploading) return;
        const group = modules().find(item => String(item.id) === String(id));
        if (!group) return;
        selectedModuleId = String(group.id);
        $('moduleFileInput').value = '';
        $('moduleFileInput').click();
    }
    async function selectFile(event) {
        const file = event.target.files?.[0];
        if (!file || uploading) return;
        const group = modules().find(item => String(item.id) === selectedModuleId);
        const type = /\.md$/i.test(file.name) ? 'text/plain' : file.type;
        if (!group) return setUploadStatus('Módulo não encontrado. Tente novamente.', true);
        if (!/^(application\/pdf|image\/(png|jpeg|webp)|text\/plain)$/.test(type)) return setUploadStatus('Use PDF, imagem PNG/JPG/WebP, TXT ou Markdown.', true);
        if (!file.size || file.size > 6 * 1024 * 1024) return setUploadStatus('Escolha um arquivo de até 6 MB.', true);
        if (moduleFiles(group).some(item => item.name === file.name && item.size === file.size)) return setUploadStatus('Este arquivo já foi anexado a esse módulo.', true);
        if (!window.kingCloud?.uploadModuleFile) return setUploadStatus('A conexão com os arquivos ainda não está pronta. Aguarde e tente novamente.', true);
        uploading = true;
        const fileId = `arquivo-${crypto.randomUUID()}`;
        setUploadStatus(`Enviando ${file.name}… Não feche a página.`);
        try {
            const saved = await window.kingCloud.uploadModuleFile(group.id, fileId, file, type);
            if (!modules().some(item => String(item.id) === String(group.id))) throw new Error('O módulo foi removido durante o envio.');
            group.files = [...moduleFiles(group), saved];
            try { saveAppData(); } catch (error) { group.files = moduleFiles(group).filter(item => item.id !== saved.id); throw error; }
            render(); setUploadStatus(`${file.name} anexado ao módulo.`);
        } catch (error) {
            window.kingCloud?.deleteModuleFile?.(group.id, fileId).catch(() => {});
            setUploadStatus(error?.message || 'Não foi possível enviar o arquivo. Confira a conexão e tente novamente.', true);
        } finally { uploading = false; event.target.value = ''; }
    }
    async function viewFile(moduleId, fileId) {
        const group = modules().find(item => String(item.id) === String(moduleId));
        const file = moduleFiles(group).find(item => String(item.id) === String(fileId));
        if (!file || !window.kingCloud?.getModuleFile) return showToast('O arquivo não está disponível nesta conta.', true);
        closeFile();
        const request = viewerRequest;
        $('moduleFileViewer').classList.add('active');
        $('moduleFileViewerTitle').textContent = file.name;
        $('moduleFileViewerStatus').textContent = 'Abrindo arquivo privado…';
        try {
            const blob = await window.kingCloud.getModuleFile(group.id, file.id);
            if (request !== viewerRequest || !$('moduleFileViewer').classList.contains('active')) return;
            viewerUrl = URL.createObjectURL(blob);
            $('moduleFileFrame').src = viewerUrl;
            $('moduleFileFrame').hidden = false;
            $('moduleFileDownload').href = viewerUrl;
            $('moduleFileDownload').download = file.name;
            $('moduleFileDownload').hidden = false;
            $('moduleFileViewerStatus').textContent = '';
        } catch (error) { $('moduleFileViewerStatus').textContent = error?.message || 'Não foi possível abrir o arquivo.'; }
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
    async function removeFile(moduleId, fileId) {
        const group = modules().find(item => String(item.id) === String(moduleId));
        const file = moduleFiles(group).find(item => String(item.id) === String(fileId));
        if (!file || !confirm(`Remover “${file.name}” deste módulo? O arquivo será apagado da nuvem.`)) return;
        const previous = moduleFiles(group);
        group.files = previous.filter(item => item.id !== file.id);
        try { saveAppData(); } catch { group.files = previous; return showToast('Não foi possível salvar a remoção. O arquivo foi mantido.', true); }
        render();
        try { await window.kingCloud?.deleteModuleFile?.(group.id, file.id); showToast('Arquivo removido do módulo.'); }
        catch { showToast('O arquivo saiu do módulo, mas não foi possível limpar a cópia antiga da nuvem.', true); }
    }

    $('modulesGrid')?.addEventListener('click', event => {
        const button = event.target.closest('[data-module-action]');
        if (!button) return;
        const action = button.dataset.moduleAction;
        if (action === 'create') open();
        if (action === 'edit') open(button.dataset.moduleId);
        if (action === 'delete') requestDelete(button.dataset.moduleId);
        if (action === 'subject') { alternarAbasHub('dominio'); abrirCadernosMateria(button.dataset.subjectId); }
        if (action === 'upload') chooseFile(button.dataset.moduleId);
        if (action === 'view-file') viewFile(button.dataset.moduleId, button.dataset.fileId);
        if (action === 'remove-file') removeFile(button.dataset.moduleId, button.dataset.fileId);
    });

    window.KingModules = { render, open, save, requestDelete, confirmDelete, selectFile, closeFile };
})();
