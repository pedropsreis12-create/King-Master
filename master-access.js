// A identidade mestre é concedida fora do navegador. Este módulo só a consulta.
const [{ getApps, initializeApp }, { getAuth, onAuthStateChanged }, { getFirestore, doc, onSnapshot }] = await Promise.all([
    import('https://www.gstatic.com/firebasejs/12.18.0/firebase-app.js'),
    import('https://www.gstatic.com/firebasejs/12.18.0/firebase-auth.js'),
    import('https://www.gstatic.com/firebasejs/12.18.0/firebase-firestore.js')
]);

const app = getApps()[0] || initializeApp(window.KING_MASTER_FIREBASE_CONFIG);
const auth = getAuth(app);
const db = getFirestore(app);
let activeUid = '';
let activeEmail = '';
let unsubscribeRole = null;
let isAdmin = false;

function updateAccess(allowed) {
    isAdmin = Boolean(allowed);
    window.dispatchEvent(new CustomEvent('king-master-access-changed', {
        detail: { allowed: isAdmin, uid: activeUid }
    }));
}

window.KingMasterAccess = Object.freeze({ isAdmin: () => isAdmin });

onAuthStateChanged(auth, user => {
    unsubscribeRole?.();
    unsubscribeRole = null;
    activeUid = user?.uid || '';
    activeEmail = String(user?.email || '').trim().toLowerCase();
    updateAccess(false);
    if (!activeUid || !activeEmail) return;
    unsubscribeRole = onSnapshot(doc(db, 'siteAdminInvites', activeEmail), snapshot => {
        const role = snapshot.exists() ? snapshot.data() : null;
        updateAccess(role?.role === 'owner' && role?.active === true && role?.email === activeEmail);
    }, () => updateAccess(false));
});
