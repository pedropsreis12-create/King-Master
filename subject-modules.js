/* Módulos são grupos de matérias existentes; nenhum assunto é copiado ou movido. */
(() => {
    const $ = id => document.getElementById(id);
    const safe = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
    const modules = () => Array.isArray(appData.subjectModules) ? appData.subjectModules : (appData.subjectModules = []);
    const subjects = () => Array.isArray(appData.cycleItems) ? appData.cycleItems : [];
    const validColor = value => /^#[0-9a-f]{6}$/i.test(String(value)) ? value : '#3288ed';

    function render() {
        const grid = $('modulesGrid');
        if (!grid) return;
        const groups = modules();
        const existing = new Set(groups.map(group => String(group.id)));
        const ungrouped = subjects().filter(subject => !existing.has(String(subject.moduleId || '')));
        $('modulesSummary').innerHTML = `<div><strong>${groups.length}</strong><span>${groups.length === 1 ? 'módulo' : 'módulos'}</span></div><div><strong>${subjects().length - ungrouped.length}</strong><span>matérias organizadas</span></div><div><strong>${ungrouped.length}</strong><span>sem módulo</span></div>`;
        const cards = groups.map(group => {
            const members = subjects().filter(subject => String(subject.moduleId) === String(group.id));
            return `<article class="module-card widget"><header><div><span class="workspace-kicker">MÓDULO</span><h3>${safe(group.name || 'Sem nome')}</h3><small>${members.length} ${members.length === 1 ? 'matéria' : 'matérias'}</small></div><div class="module-card-actions"><button type="button" data-module-action="edit" data-module-id="${safe(group.id)}" aria-label="Editar módulo ${safe(group.name)}">Editar</button><button type="button" data-module-action="delete" data-module-id="${safe(group.id)}" aria-label="Excluir módulo ${safe(group.name)}">Excluir</button></div></header><div class="module-subject-list">${members.length ? members.map(subject => subjectRow(subject)).join('') : '<p class="module-empty">Nenhuma matéria neste módulo. Use Editar para adicioná-las.</p>'}</div></article>`;
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
        abrirModalDeletar('subjectModule', group.id, 'Excluir este módulo?', `“${group.name}” será removido. As matérias, os assuntos e todo o progresso permanecerão salvos.`, 'Excluir módulo');
    }

    function confirmDelete(id) {
        const previousGroups = structuredClone(modules());
        const previousAssignments = subjects().map(subject => subject.moduleId);
        appData.subjectModules = modules().filter(item => String(item.id) !== String(id));
        subjects().forEach(subject => { if (String(subject.moduleId) === String(id)) delete subject.moduleId; });
        try { saveAppData(); render(); showToast('Módulo excluído. As matérias foram mantidas.'); }
        catch {
            appData.subjectModules = previousGroups;
            subjects().forEach((subject, index) => { if (previousAssignments[index] == null) delete subject.moduleId; else subject.moduleId = previousAssignments[index]; });
            showToast('Não foi possível excluir o módulo.', true);
        }
    }

    $('modulesGrid')?.addEventListener('click', event => {
        const button = event.target.closest('[data-module-action]');
        if (!button) return;
        const action = button.dataset.moduleAction;
        if (action === 'create') open();
        if (action === 'edit') open(button.dataset.moduleId);
        if (action === 'delete') requestDelete(button.dataset.moduleId);
        if (action === 'subject') { alternarAbasHub('dominio'); abrirCadernosMateria(button.dataset.subjectId); }
    });

    window.KingModules = { render, open, save, requestDelete, confirmDelete };
})();
