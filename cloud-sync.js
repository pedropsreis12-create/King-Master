const firebaseConfig = window.KING_MASTER_FIREBASE_CONFIG;
const firebaseConfigured = Boolean(firebaseConfig?.apiKey && firebaseConfig?.authDomain && firebaseConfig?.projectId && firebaseConfig?.appId);

const accountCard = document.getElementById('cloudAccountCard');
const accountAvatar = document.getElementById('cloudAccountAvatar');
const accountTitle = document.getElementById('cloudAccountTitle');
const accountStatus = document.getElementById('cloudAccountStatus');
const signInButton = document.getElementById('cloudSignInBtn');
const syncButton = document.getElementById('cloudSyncBtn');
const signOutButton = document.getElementById('cloudSignOutBtn');

function updateCloudUi(state, user = null, message = '') {
    if (accountCard) accountCard.dataset.state = state;
    if (accountAvatar) {
        accountAvatar.textContent = user?.displayName?.split(/\s+/).slice(0, 2).map(part => part[0]).join('').toUpperCase() || 'PR';
        if (user?.photoURL) accountAvatar.style.backgroundImage = `url("${user.photoURL.replace(/"/g, '')}")`;
        else accountAvatar.style.backgroundImage = '';
    }
    if (signInButton) signInButton.hidden = state === 'signed-in' || state === 'syncing' || state === 'setup-required';
    if (syncButton) syncButton.hidden = true;
    if (signOutButton) signOutButton.hidden = state !== 'signed-in';
    if (!accountTitle || !accountStatus) return;
    if (state === 'setup-required') {
        accountTitle.textContent = 'Nuvem pronta para conectar';
        accountStatus.textContent = 'Falta vincular o projeto Firebase antes da publicação.';
    } else if (state === 'signed-out') {
        accountTitle.textContent = 'Progresso somente neste dispositivo';
        accountStatus.textContent = 'Entre com Google para reconhecer sua conta em qualquer aparelho.';
    } else if (state === 'syncing') {
        accountTitle.textContent = user?.displayName || user?.email || 'Sua conta';
        accountStatus.textContent = message || 'Sincronizando seu progresso…';
    } else if (state === 'error') {
        accountTitle.textContent = 'Não foi possível sincronizar';
        accountStatus.textContent = message || 'Tente novamente em alguns instantes.';
    } else {
        accountTitle.textContent = user?.displayName || user?.email || 'Sua conta';
        accountStatus.textContent = message || 'Salvamento automático ativo.';
    }
}

if (!firebaseConfigured) {
    updateCloudUi('setup-required');
    window.kingCloud = {
        signIn: () => window.showToast?.('☁ A nuvem precisa ser vinculada ao Firebase primeiro.', true),
        signOut: () => {},
        syncNow: () => window.showToast?.('☁ A nuvem ainda não foi vinculada.', true)
    };
} else {
    try {
    const [{ initializeApp }, authSdk, firestoreSdk] = await Promise.all([
        import('https://www.gstatic.com/firebasejs/12.18.0/firebase-app.js'),
        import('https://www.gstatic.com/firebasejs/12.18.0/firebase-auth.js'),
        import('https://www.gstatic.com/firebasejs/12.18.0/firebase-firestore.js')
    ]);

    const firebaseApp = initializeApp(firebaseConfig);
    const auth = authSdk.getAuth(firebaseApp);
    const db = firestoreSdk.getFirestore(firebaseApp);
    const provider = new authSdk.GoogleAuthProvider();
    let currentUser = null;
    let uploadTimer = null;
    let applyingRemote = false;

    authSdk.setPersistence(auth, authSdk.browserLocalPersistence).catch(() => {});

    function describeAuthError(error) {
        const code = error?.code || '';
        if (code === 'auth/unauthorized-domain') return 'Este endereço ainda não está autorizado no Firebase.';
        if (code === 'auth/network-request-failed') return 'A conexão com o Google falhou. Verifique a internet e tente novamente.';
        if (code === 'auth/operation-not-allowed') return 'O login do Google ainda não está habilitado no Firebase.';
        return 'O login não foi concluído.';
    }

    async function startSignIn() {
        provider.setCustomParameters({ prompt: 'select_account' });
        updateCloudUi('syncing', null, 'Abrindo o acesso seguro do Google…');
        try {
            await authSdk.signInWithPopup(auth, provider);
        } catch (error) {
            if (['auth/popup-blocked', 'auth/operation-not-supported-in-this-environment'].includes(error?.code)) {
                await authSdk.signInWithRedirect(auth, provider);
                return;
            }
            throw error;
        }
    }

    authSdk.getRedirectResult(auth).catch(error => {
        console.error('Falha no retorno do login Google.', error);
        updateCloudUi('error', null, describeAuthError(error));
    });

    const userDocument = user => firestoreSdk.doc(db, 'users', user.uid);
    const localSnapshot = () => window.kingMasterCloudBridge?.exportData?.() || null;

    async function uploadLocal(user, explicit = false) {
        const data = localSnapshot();
        if (!user || !data || applyingRemote) return;
        updateCloudUi('syncing', user, explicit ? 'Enviando os dados deste dispositivo…' : 'Salvando alterações…');
        await firestoreSdk.setDoc(userDocument(user), {
            ownerUid: user.uid,
            ownerEmail: user.email || '',
            updatedAtMs: Number(data.lastModifiedAt || Date.now()),
            updatedAt: firestoreSdk.serverTimestamp(),
            data
        }, { merge: true });
        updateCloudUi('signed-in', user, 'Salvamento automático ativo.');
    }

    async function reconcile(user) {
        updateCloudUi('syncing', user, 'Comparando este dispositivo com a nuvem…');
        const remoteSnapshot = await firestoreSdk.getDoc(userDocument(user));
        const local = localSnapshot();
        if (!remoteSnapshot.exists()) {
            await uploadLocal(user, true);
            return;
        }
        const remote = remoteSnapshot.data();
        const remoteData = remote?.data;
        const remoteTime = Number(remote?.updatedAtMs || 0);
        const localTime = Number(local?.lastModifiedAt || 0);
        if (remoteData && remoteTime > localTime) {
            applyingRemote = true;
            updateCloudUi('syncing', user, 'Baixando seu progresso mais recente…');
            window.kingMasterCloudBridge?.importData?.(remoteData);
            return;
        }
        await uploadLocal(user, true);
    }

    window.addEventListener('king-master-data-changed', () => {
        if (!currentUser || applyingRemote) return;
        clearTimeout(uploadTimer);
        uploadTimer = setTimeout(() => uploadLocal(currentUser).catch(error => updateCloudUi('error', currentUser, error.message)), 1400);
    });

    authSdk.onAuthStateChanged(auth, user => {
        currentUser = user;
        if (!user) {
            updateCloudUi('signed-out');
            return;
        }
        reconcile(user).catch(error => updateCloudUi('error', user, error.message));
    });

    window.kingCloud = {
        signIn: async () => {
            try {
                await startSignIn();
            } catch (error) {
                console.error('Falha ao iniciar o login Google.', error);
                updateCloudUi('error', null, describeAuthError(error));
            }
        },
        signOut: () => authSdk.signOut(auth),
        syncNow: () => currentUser ? reconcile(currentUser) : startSignIn().catch(error => updateCloudUi('error', null, describeAuthError(error)))
    };
    } catch (error) {
        updateCloudUi('error', null, 'A conexão com a nuvem não pôde ser iniciada.');
        window.kingCloud = {
            signIn: () => updateCloudUi('error', null, 'A conexão com a nuvem não pôde ser iniciada.'),
            signOut: () => {},
            syncNow: () => updateCloudUi('error', null, 'A conexão com a nuvem não pôde ser iniciada.')
        };
        console.error('Falha ao iniciar a sincronização do King Master.', error);
    }
}
