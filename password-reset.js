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
const hero = document.getElementById('resetHero');
const actionEyebrow = document.getElementById('actionEyebrow');
const actionTitle = document.getElementById('actionTitle');
const actionCopy = document.getElementById('actionCopy');
const actionConfirm = document.getElementById('actionConfirm');
const actionConfirmTitle = document.getElementById('actionConfirmTitle');
const actionConfirmCopy = document.getElementById('actionConfirmCopy');
const actionConfirmAccount = document.getElementById('actionConfirmAccount');
const actionConfirmAccountLabel = document.getElementById('actionConfirmAccountLabel');
const actionConfirmEmail = document.getElementById('actionConfirmEmail');
const actionConfirmButton = document.getElementById('actionConfirmButton');
const actionFeedback = document.getElementById('actionFeedback');
const successTitle = document.getElementById('actionSuccessTitle');
const successCopy = document.getElementById('actionSuccessCopy');
const errorTitle = document.getElementById('actionErrorTitle');

const ACTIONS = {
    verifyEmail: {
        operation: 'VERIFY_EMAIL', title: 'Confirmar seu e-mail?', copy: 'Confirme para validar este endereço e proteger sua conta King Master.',
        accountLabel: 'E-MAIL A CONFIRMAR', successTitle: 'E-mail confirmado', successCopy: 'Seu endereço foi confirmado. Você já pode voltar aos seus estudos.'
    },
    recoverEmail: {
        operation: 'RECOVER_EMAIL', title: 'Desfazer troca de e-mail?', copy: 'Confirme para restaurar o endereço anterior da sua conta.',
        accountLabel: 'E-MAIL A RESTAURAR', successTitle: 'E-mail restaurado', successCopy: 'A alteração foi desfeita e o endereço anterior voltou a proteger sua conta.'
    },
    verifyAndChangeEmail: {
        operation: 'VERIFY_AND_CHANGE_EMAIL', title: 'Confirmar novo e-mail?', copy: 'Confirme para concluir a troca de endereço da sua conta King Master.',
        accountLabel: 'NOVO E-MAIL', successTitle: 'Novo e-mail confirmado', successCopy: 'A troca de endereço foi concluída com segurança.'
    },
    revertSecondFactorAddition: {
        operation: 'REVERT_SECOND_FACTOR_ADDITION', title: 'Remover verificação adicionada?', copy: 'Confirme apenas se você não reconhece esta alteração de segurança.',
        accountLabel: 'CONTA PROTEGIDA', successTitle: 'Proteção restaurada', successCopy: 'O método de verificação não reconhecido foi removido da sua conta.'
    }
};

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

function setHero(eyebrow, title, copy) {
    actionEyebrow.textContent = eyebrow;
    actionTitle.textContent = title;
    actionCopy.textContent = copy;
}

function showError(message, title = 'Este link não é mais válido') {
    hero.hidden = true;
    loading.hidden = true;
    form.hidden = true;
    actionConfirm.hidden = true;
    success.hidden = true;
    errorPanel.hidden = false;
    errorTitle.textContent = title;
    if (message) document.getElementById('resetErrorCopy').textContent = message;
}

function showSuccess(title, copy) {
    hero.hidden = true;
    loading.hidden = true;
    form.hidden = true;
    actionConfirm.hidden = true;
    errorPanel.hidden = true;
    successTitle.textContent = title;
    successCopy.textContent = copy;
    success.hidden = false;
}

function showFirebaseError(error) {
    if (['auth/expired-action-code', 'auth/invalid-action-code'].includes(error?.code)) return showError();
    if (error?.code === 'auth/user-disabled') return showError('Esta conta está desativada. Entre em contato com o responsável pela conta.', 'Conta indisponível');
    showError('Não foi possível confirmar a alteração agora. Confira sua conexão e tente novamente.', 'Falha de conexão');
}

function showActionConfirmation(action, info, apply) {
    const email = info?.data?.email || '';
    setHero('Confirmação protegida', action.title, action.copy);
    hero.hidden = true;
    loading.hidden = true;
    actionConfirmTitle.textContent = action.title;
    actionConfirmCopy.textContent = action.copy;
    actionConfirmAccountLabel.textContent = action.accountLabel;
    actionConfirmEmail.textContent = email ? maskEmail(email) : 'Conta King Master';
    actionConfirmAccount.hidden = !email;
    actionConfirm.hidden = false;
    actionConfirmButton.onclick = async () => {
        actionConfirmButton.disabled = true;
        actionFeedback.className = 'feedback';
        actionFeedback.textContent = 'Confirmando com o Firebase…';
        try {
            await apply();
            showSuccess(action.successTitle, action.successCopy);
        } catch (error) {
            if (['auth/expired-action-code', 'auth/invalid-action-code'].includes(error?.code)) showFirebaseError(error);
            else {
                actionFeedback.textContent = 'Não foi possível confirmar agora. Confira sua conexão e tente novamente.';
                actionFeedback.classList.add('error');
                actionConfirmButton.disabled = false;
            }
        }
    };
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
        if (!code) throw new Error('invalid-link');

        if (mode === 'resetPassword') {
            const email = await authSdk.verifyPasswordResetCode(auth, code);
            setHero('Nova senha', 'Retome seus estudos', 'Crie uma senha forte para voltar à sua conta King Master.');
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
                    showSuccess('Senha alterada', 'Sua conta já está protegida com a nova senha. Agora é só continuar de onde parou.');
                } catch (resetError) {
                    if (['auth/expired-action-code', 'auth/invalid-action-code'].includes(resetError?.code)) showFirebaseError(resetError);
                    else {
                        feedback.textContent = 'Não foi possível salvar agora. Confira sua conexão e tente novamente.';
                        feedback.classList.add('error');
                        submit.disabled = false;
                    }
                }
            });
        } else if (mode === 'signIn') {
            showError('O King Master não usa entrada por link de e-mail. Volte ao site e entre com Google ou com sua senha.', 'Use a tela de entrada');
        } else {
            const action = ACTIONS[mode];
            if (!action) throw new Error('invalid-link');
            const info = await authSdk.checkActionCode(auth, code);
            if (info.operation !== action.operation) throw new Error('invalid-link');
            showActionConfirmation(action, info, () => authSdk.applyActionCode(auth, code));
        }
    } catch (error) {
        if (error?.message === 'invalid-link') showError();
        else showFirebaseError(error);
    }
}
