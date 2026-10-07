(function (root, factory) {
    const api = factory();
    if (typeof module === 'object' && module.exports) module.exports = api;
    root.KingLibraryCore = api;
})(typeof globalThis !== 'undefined' ? globalThis : window, function () {
    const escape = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
    const normalize = value => String(value ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('pt-BR').trim();
    const editableFields = ['titulo', 'texto', 'status', 'continuation', 'source', 'edition', 'sourcePage', 'checkedAt', 'linkedPageIds'];
    function collect(data) {
        const rows = [];
        for (const subject of data?.cycleItems || []) {
            const themes = new Map((subject.temas || []).map(theme => [String(theme.id), theme.nome]));
            for (const [topicIndex, topic] of (subject.topicos || []).entries()) {
                for (const page of topic.caderno?.paginas || []) {
                    if (!page?.id) continue;
                    rows.push({ id: String(page.id), subject, topic, topicIndex, page,
                        theme: themes.get(String(topic.temaId)) || 'Conteúdo geral' });
                }
            }
        }
        return rows;
    }
    function migrateLegacy(data, makeId = () => `legado-${Date.now()}`) {
        let changed = 0;
        for (const subject of data?.cycleItems || []) for (const topic of subject.topicos || []) {
            if (!String(topic.notas || '').trim() || topic.cadernoMigrado) continue;
            if (!topic.caderno || typeof topic.caderno !== 'object') topic.caderno = { paginas: [] };
            if (!Array.isArray(topic.caderno.paginas)) topic.caderno.paginas = [];
            const now = Date.now();
            topic.caderno.paginas.push({ id: makeId(), titulo: 'Anotação anterior', texto: String(topic.notas).slice(0, 12000), criadoEm: now, atualizadoEm: now });
            topic.cadernoMigrado = true;
            changed++;
        }
        return changed;
    }
    function metadata(page) {
        return {
            status: page?.status === 'revisado' ? 'revisado' : 'rascunho',
            continuation: String(page?.continuation || ''), source: String(page?.source || ''),
            edition: String(page?.edition || ''), sourcePage: String(page?.sourcePage || ''),
            checkedAt: String(page?.checkedAt || ''), linkedPageIds: Array.isArray(page?.linkedPageIds) ? page.linkedPageIds.map(String) : []
        };
    }
    function snapshot(page, id, savedAt = Date.now()) {
        const value = { id, savedAt, titulo: String(page.titulo || ''), texto: String(page.texto || ''), ...metadata(page) };
        if (!Array.isArray(page.versoes)) page.versoes = [];
        const previous = page.versoes[0];
        if (previous && editableFields.every(field => JSON.stringify(previous[field]) === JSON.stringify(value[field]))) return false;
        page.versoes.unshift(value);
        page.versoes = page.versoes.slice(0, 8);
        return true;
    }
    function restore(page, versionId, newSnapshotId, now = Date.now()) {
        const version = (page?.versoes || []).find(item => String(item.id) === String(versionId));
        if (!version) return false;
        const target = structuredClone(version);
        snapshot(page, newSnapshotId, now);
        for (const field of editableFields) page[field] = structuredClone(target[field] ?? (field === 'linkedPageIds' ? [] : ''));
        page.atualizadoEm = now;
        return true;
    }
    function inline(value) {
        return escape(value).replace(/`([^`]+)`/g, '<code>$1</code>')
            .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
            .replace(/\*([^*]+)\*/g, '<em>$1</em>');
    }
    function markdown(value) {
        const lines = String(value || '').replace(/\r\n?/g, '\n').split('\n');
        const out = []; let list = '', inCode = false, code = [];
        const closeList = () => { if (list) { out.push(`</${list}>`); list = ''; } };
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i], trim = line.trim();
            if (/^```/.test(trim)) {
                closeList();
                if (inCode) { out.push(`<pre><code>${escape(code.join('\n'))}</code></pre>`); code = []; inCode = false; }
                else inCode = true;
                continue;
            }
            if (inCode) { code.push(line); continue; }
            if (!trim) { closeList(); continue; }
            const heading = /^(#{1,4})\s+(.+)$/.exec(trim);
            if (heading) { closeList(); out.push(`<h${heading[1].length}>${inline(heading[2])}</h${heading[1].length}>`); continue; }
            if (trim.includes('|') && /^\|?\s*:?-{3,}/.test(lines[i + 1]?.trim() || '')) {
                closeList();
                const cells = text => text.replace(/^\||\|$/g, '').split('|').map(cell => cell.trim());
                const headers = cells(trim); const rows = [];
                i += 2;
                while (i < lines.length && lines[i].includes('|') && lines[i].trim()) { rows.push(cells(lines[i])); i++; }
                i--;
                out.push(`<table><thead><tr>${headers.map(cell => `<th>${inline(cell)}</th>`).join('')}</tr></thead><tbody>${rows.map(row => `<tr>${headers.map((_, index) => `<td>${inline(row[index] || '')}</td>`).join('')}</tr>`).join('')}</tbody></table>`);
                continue;
            }
            const bullet = /^[-*]\s+(.+)$/.exec(trim), numbered = /^\d+\.\s+(.+)$/.exec(trim);
            if (bullet || numbered) {
                const kind = bullet ? 'ul' : 'ol';
                if (list !== kind) { closeList(); out.push(`<${kind}>`); list = kind; }
                out.push(`<li>${inline((bullet || numbered)[1])}</li>`); continue;
            }
            closeList();
            if (trim.startsWith('> ')) out.push(`<blockquote>${inline(trim.slice(2))}</blockquote>`);
            else out.push(`<p>${inline(trim)}</p>`);
        }
        closeList();
        if (inCode) out.push(`<pre><code>${escape(code.join('\n'))}</code></pre>`);
        return out.join('') || '<p>Este caderno ainda não tem conteúdo.</p>';
    }
    return { escape, normalize, collect, migrateLegacy, metadata, snapshot, restore, markdown };
});
