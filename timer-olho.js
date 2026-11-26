/* Botão de olho do cronômetro: esconde o tempo e o anel de progresso, para estudar sem olhar o relógio.
   Liga e desliga com um toque; a escolha fica salva neste aparelho. Com o tempo escondido, a aba do navegador
   mostra só "Estudando" ou "Descansando" (ver updateProgress em script.js). */
(() => {
    'use strict';
    const CHAVE = 'km_timer_oculto';
    let escondido = false;
    try { escondido = localStorage.getItem(CHAVE) === '1'; } catch { /* sem armazenamento: começa visível */ }

    function aplicar() {
        window.kingTempoEscondido = escondido;
        const hero = document.getElementById('timeDisplay')?.closest('.timer-hero');
        const botao = document.getElementById('timerEyeBtn');
        hero?.classList.toggle('is-time-hidden', escondido);
        if (botao) {
            const rotulo = escondido ? 'Mostrar o tempo' : 'Esconder o tempo';
            botao.setAttribute('aria-pressed', String(escondido));
            botao.setAttribute('aria-label', rotulo);
            botao.title = rotulo;
        }
    }

    function alternar() {
        escondido = !escondido;
        try { localStorage.setItem(CHAVE, escondido ? '1' : '0'); } catch { /* vale só nesta visita */ }
        aplicar();
        try { window.updateProgress?.(); } catch { /* o título se atualiza no próximo segundo */ }
    }

    window.alternarTempoEscondido = alternar;
    window.kingTempoEscondido = escondido;
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', aplicar, { once: true }); else aplicar();
})();
