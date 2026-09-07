const config = window.KING_MASTER_FIREBASE_CONFIG;
const loading = document.getElementById('resetLoading');
const form = document.getElementById('resetForm');
const success = document.getElementById('resetSuccess');
const errorPanel = document.getElementById('resetError');
const emailLabel = document.getElementById('resetEmail');
const password = document.getElementById('newPassword');
const confirmation = document.getElementById('confirmPassword');
const submit = document.getElementById('resetSubmit');
const feedback = document.getElementById('resetFeedback');
const rules = document.getElementById('resetRules');

function maskEmail(email = '') {
    const [name = '', domain = ''] = email.split('@');
    const safeName = name.length < 3 ? `${name.slice(0, 1)}••` : `${name.slice(0, 2)}${'•'.repeat(Math.min(5, name.length - 2))}`;
    const [host = '', ...suffix] = domain.split('.');
    return `${safeName}@${host.slice(0, 1)}${'•'.repeat(Math.max(2, Math.min(5, host.length - 1)))}${suffix.length ? `.${suffix.join('.')}` : ''}`;
}

function passwordChecks(value = '') {
    return { length: value.length >= 8, letter: /[A-Za-zÀ-ÿ]/.test(value), number: /\d/.test(value) };
}

function syncRules() {
    const checks = passwordChecks(password.value);
    rules.querySelectorAll('[data-rule]').forEach(rule => rule.classList.toggle('valid', Boolean(checks[rule.dataset.rule])));
    return Object.values(checks).every(Boolean);
}

function showError(message) {
    document.getElementById('resetHero').hidden = true;
    loading.hidden = true;
    form.hidden = true;
    success.hidden = true;
    errorPanel.hidden = false;
    if (message) document.getElementById('resetErrorCopy').textContent = message;
}

document.querySelectorAll('[data-password-target]').forEach(button => button.addEventListener('click', () => {
    const input = document.getElementById(button.dataset.passwordTarget);
    const reveal = input.type === 'password';
    input.type = reveal ? 'text' : 'password';
    button.textContent = reveal ? 'Ocultar' : 'Mostrar';
}));

password.addEventListener('input', syncRules);

if (!config?.apiKey || !config?.projectId) {
    showError('A conexão segura está indisponível agora. Volte ao King Master e solicite um novo link mais tarde.');
} else {
    try {
        const [{ initializeApp }, authSdk] = await Promise.all([
            import('https://www.gstatic.com/firebasejs/12.18.0/firebase-app.js'),
            import('https://www.gstatic.com/firebasejs/12.18.0/firebase-auth.js')
        ]);
        const auth = authSdk.getAuth(initializeApp(config));
        auth.languageCode = 'pt-BR';
        const params = new URLSearchParams(window.location.search);
        const mode = params.get('mode');
        const code = params.get('oobCode');
        if (mode !== 'resetPassword' || !code) throw new Error('invalid-link');
        const email = await authSdk.verifyPasswordResetCode(auth, code);
        emailLabel.textContent = maskEmail(email);
        loading.hidden = true;
        form.hidden = false;
        password.focus();

        form.addEventListener('submit', async event => {
            event.preventDefault();
            feedback.className = 'feedback';
            if (!syncRules()) {
                feedback.textContent = 'Use 8 caracteres ou mais, com pelo menos uma letra e um número.';
                feedback.classList.add('error');
                return;
            }
            if (password.value !== confirmation.value) {
                feedback.textContent = 'As duas senhas precisam ser iguais.';
                feedback.classList.add('error');
                confirmation.focus();
                return;
            }
            submit.disabled = true;
            feedback.textContent = 'Protegendo sua conta…';
            try {
                await authSdk.confirmPasswordReset(auth, code, password.value);
                form.hidden = true;
                document.getElementById('resetHero').hidden = true;
                success.hidden = false;
            } catch (resetError) {
                if (['auth/expired-action-code', 'auth/invalid-action-code'].includes(resetError?.code)) showError();
                else {
                    feedback.textContent = 'Não foi possível salvar agora. Confira sua conexão e tente novamente.';
                    feedback.classList.add('error');
                    submit.disabled = false;
                }
            }
        });
    } catch (error) {
        showError();
    }
}
