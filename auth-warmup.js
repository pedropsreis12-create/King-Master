/* Começa a restaurar a sessão Google enquanto o restante da página é carregado. */
(() => {
    const config = window.KING_MASTER_FIREBASE_CONFIG;
    if (!config?.apiKey || !config?.authDomain || !config?.projectId || !config?.appId) return;

    const ready = Promise.all([
        import('https://www.gstatic.com/firebasejs/12.18.0/firebase-app.js'),
        import('https://www.gstatic.com/firebasejs/12.18.0/firebase-auth.js')
    ]).then(([appSdk, authSdk]) => {
        const app = appSdk.getApps().length ? appSdk.getApp() : appSdk.initializeApp(config);
        const auth = authSdk.getAuth(app);
        auth.languageCode = 'pt-BR';
        return { appSdk, authSdk, app, auth };
    });
    // O tratamento da falha fica no fluxo principal; evita rejeição solta antes dele iniciar.
    ready.catch(() => {});
    window.kingMasterAuthWarmup = ready;
})();
