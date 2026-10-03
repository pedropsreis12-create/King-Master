(() => {
    'use strict';

    const state = { current: null, opener: new WeakMap(), inerted: new Map(), focusTimer: 0 };
    const focusableSelector = [
        'button:not([disabled])', 'a[href]', 'input:not([disabled]):not([type="hidden"])',
        'select:not([disabled])', 'textarea:not([disabled])', '[tabindex]:not([tabindex="-1"])'
    ].join(',');

    function visible(element) {
        return element instanceof HTMLElement && !element.hidden && element.getClientRects().length > 0;
    }

    function labelModal(modal) {
        modal.setAttribute('role', 'dialog');
        modal.setAttribute('aria-modal', 'true');
        if (modal.hasAttribute('aria-label') || modal.hasAttribute('aria-labelledby')) return;
        const heading = modal.querySelector('h1, h2, h3, .cycle-modal-title, .modal-title');
        if (!heading) {
            modal.setAttribute('aria-label', 'Janela do King Master');
            return;
        }
        if (!heading.id) heading.id = `${modal.id || 'king-modal'}-title`;
        modal.setAttribute('aria-labelledby', heading.id);
    }

    function clearInert() {
        state.inerted.forEach((wasInert, element) => { element.inert = wasInert; });
        state.inerted.clear();
    }

    function isolate(modal) {
        clearInert();
        let branch = modal;
        while (branch?.parentElement) {
            [...branch.parentElement.children].forEach(sibling => {
                if (sibling === branch || ['SCRIPT', 'STYLE', 'LINK'].includes(sibling.tagName)) return;
                if (!state.inerted.has(sibling)) state.inerted.set(sibling, sibling.inert);
                sibling.inert = true;
            });
            branch = branch.parentElement;
        }
    }

    function activeModal() {
        return [...document.querySelectorAll('.modal-overlay.active')].filter(visible).at(-1) || null;
    }

    function sync() {
        const next = activeModal();
        document.querySelectorAll('.modal-overlay').forEach(modal => {
            labelModal(modal);
            modal.setAttribute('aria-hidden', String(!modal.classList.contains('active')));
        });
        if (next === state.current) return;
        const previous = state.current;
        state.current = next;
        window.clearTimeout(state.focusTimer);

        if (next) {
            if (!state.opener.has(next)) state.opener.set(next, document.activeElement instanceof HTMLElement ? document.activeElement : null);
            isolate(next);
            state.focusTimer = window.setTimeout(() => {
                if (state.current !== next || next.contains(document.activeElement)) return;
                const target = [...next.querySelectorAll(focusableSelector)].find(visible) || next.querySelector('.modal-box') || next;
                if (!target.hasAttribute('tabindex') && !target.matches(focusableSelector)) target.setAttribute('tabindex', '-1');
                target.focus({ preventScroll: true });
            }, 30);
        } else {
            clearInert();
            const opener = previous && state.opener.get(previous);
            state.opener.delete(previous);
            if (opener?.isConnected) window.setTimeout(() => opener.focus({ preventScroll: true }), 0);
        }
    }

    function trapFocus(event) {
        if (event.key !== 'Tab' || !state.current) return;
        const focusable = [...state.current.querySelectorAll(focusableSelector)].filter(visible);
        if (!focusable.length) {
            event.preventDefault();
            state.current.focus();
            return;
        }
        const first = focusable[0], last = focusable.at(-1);
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
        else if (!state.current.contains(document.activeElement)) { event.preventDefault(); first.focus(); }
    }

    function init() {
        document.querySelectorAll('.modal-overlay').forEach(labelModal);
        const observer = new MutationObserver(records => {
            if (records.some(record => record.type === 'attributes' && record.attributeName === 'class')) sync();
        });
        document.querySelectorAll('.modal-overlay').forEach(modal => observer.observe(modal, { attributes: true, attributeFilter: ['class'] }));
        document.addEventListener('keydown', trapFocus, true);
        sync();
    }

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
    else init();
})();
