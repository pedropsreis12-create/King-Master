/* Ícones vetoriais consistentes para a navegação lateral e móvel. */
(() => {
    const icons = {
        dashboard: '<path d="M4 11.5 12 5l8 6.5"/><path d="M6.5 10.5V20h11v-9.5"/><path d="M10 20v-5h4v5"/>',
        agendamento: '<rect x="4" y="5.5" width="16" height="14" rx="3"/><path d="M8 3.5v4M16 3.5v4M4 10h16"/><path d="M8 14h3M8 17h6"/>',
        cronograma: '<rect x="3.5" y="4" width="17" height="16" rx="3"/><path d="M8 2.5V6M16 2.5V6M3.5 9h17M8 13h2M14 13h2M8 16.5h2M14 16.5h2"/>',
        planejamento: '<path d="M5 4.5h11a3 3 0 0 1 3 3V20H8a3 3 0 0 1-3-3z"/><path d="M8 4.5V17a3 3 0 0 0 3 3M11 9h5M11 12.5h5"/>',
        revisoes: '<path d="M20 7v5h-5"/><path d="M18.2 16a8 8 0 1 1 .7-8.2L20 12"/><path d="M12 8v4l2.5 1.5"/>',
        flashcards: '<rect x="4" y="5" width="13" height="15" rx="2"/><path d="M8 9h5M8 12h5M8 15h3M17 8h2a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-8"/>',
        'caderno-erros': '<path d="M5 3.5h11.5A2.5 2.5 0 0 1 19 6v14H7.5A2.5 2.5 0 0 1 5 17.5z"/><path d="M9 8h6M9 11.5h4M9 15l1.5 1.5L15 12"/>',
        'question-timer': '<circle cx="12" cy="13" r="8"/><path d="M12 13V8M12 13l3 2M9 2h6M17.5 5.5 19 4"/>',
        simulados: '<circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="4.5"/><path d="M12 8.5V12l2.5 1.5"/>',
        redacao: '<path d="m4 17-.5 3.5L7 20l11-11-3-3z"/><path d="m13.5 7.5 3 3M4 14V4h8"/>',
        historico: '<path d="M4.5 7.5H9V3"/><path d="M5.2 7A8.5 8.5 0 1 1 3.5 12"/><path d="M12 7.5V12l3 2"/>',
        notas: '<rect x="4" y="3" width="16" height="18" rx="2.5"/><path d="M8 3v18M11 8h6M11 12h6M11 16h4"/><path d="M3 7h2M3 12h2M3 17h2"/>',
        notes: '<rect x="4" y="3" width="16" height="18" rx="2.5"/><path d="M8 3v18M11 8h6M11 12h6M11 16h4"/><path d="M3 7h2M3 12h2M3 17h2"/>',
        'area-linguagens': '<path d="M4 19 9 5h1.5l5 14"/><path d="M6 14h7.5"/><path d="M16 12.5c.6-1 1.6-1.5 2.7-1.5 1.5 0 2.3.9 2.3 2.4V19"/><path d="M21 15.5c-3.6 0-5 .7-5 2 0 1 .8 1.6 1.9 1.6 1.6 0 3.1-1.1 3.1-3.1"/>',
        'area-humanas': '<circle cx="12" cy="12" r="8.5"/><path d="M3.5 12h17M12 3.5c2.4 2.3 3.5 5.2 3.5 8.5s-1.1 6.2-3.5 8.5c-2.4-2.3-3.5-5.2-3.5-8.5S9.6 5.8 12 3.5Z"/>',
        'area-natureza': '<path d="M9.5 3.5h5M10.5 3.5v5.2L5 18.2A1.6 1.6 0 0 0 6.4 20.5h11.2a1.6 1.6 0 0 0 1.4-2.3l-5.5-9.5V3.5"/><path d="M7.5 14h9"/>',
        'area-matematica': '<path d="M17.5 5H7l5.5 7L7 19h10.5"/>',
        perfil: '<circle cx="12" cy="8" r="3.5"/><path d="M5.5 20a6.5 6.5 0 0 1 13 0"/>'
    };

    function applySidebarIcons() {
        document.querySelectorAll('.menu-btn[data-section], .menu-btn[data-action]').forEach(button => {
            const holder = button.querySelector('.nav-item-icon');
            const key = button.dataset.enemArea ? `area-${button.dataset.enemArea}` : (button.dataset.section || button.dataset.action);
            const drawing = icons[key];
            if (holder && drawing) holder.innerHTML = `<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">${drawing}</svg>`;
        });

        document.querySelectorAll('.dock-btn[data-section]').forEach(button => {
            const oldIcon = button.querySelector(':scope > span');
            const drawing = icons[button.dataset.section];
            if (oldIcon && drawing) oldIcon.outerHTML = `<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">${drawing}</svg>`;
        });
    }

    applySidebarIcons();
    window.KingSidebarIcons = { apply: applySidebarIcons };
})();
