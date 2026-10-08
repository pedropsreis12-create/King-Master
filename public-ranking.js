// Placar opt-in. Cada pessoa publica somente um apelido e sua pontuação sazonal.
// Sem backend confiável gratuito, a pontuação é autodeclarada e exibida como não verificada.
const [{ initializeApp }, authSdk, firestoreSdk] = await Promise.all([
    import('https://www.gstatic.com/firebasejs/12.18.0/firebase-app.js'),
    import('https://www.gstatic.com/firebasejs/12.18.0/firebase-auth.js'),
    import('https://www.gstatic.com/firebasejs/12.18.0/firebase-firestore.js')
]);

const app = initializeApp(window.KING_MASTER_FIREBASE_CONFIG);
const auth = authSdk.getAuth(app);
const db = firestoreSdk.getFirestore(app);
let joined = false;
let knownUid = '';
let lastPublished = null;
let lastPublishAt = 0;

function currentIdentity() {
    const user = auth.currentUser;
    if (!user?.uid) throw new Error('Entre na sua conta para acessar o placar.');
    return user;
}

function snapshotForPublication() {
    const rank = window.KingRankV2?.snapshot(appData, { readOnly: true });
    if (!rank?.season?.id || !/^20\d\d-(0[1-9]|1[0-2])$/.test(rank.season.id)) throw new Error('A temporada ainda não está disponível.');
    const profileName = String(appData?.profileName || '').trim().replace(/\s+/g, ' ').slice(0, 32);
    return {
        displayName: profileName.length >= 2 ? profileName : 'Estudante',
        seasonId: rank.season.id,
        score: Math.max(0, Math.min(1000000, Math.round(Number(rank.season.score) || 0))),
        level: Math.max(1, Math.min(100, Math.round(Number(rank.lifetime.level) || 1)))
    };
}

function ownDocument(user = currentIdentity()) {
    return firestoreSdk.doc(db, 'publicRanking', user.uid);
}

function seasonQuery(seasonId) {
    return firestoreSdk.query(
        firestoreSdk.collection(db, 'publicRanking'),
        firestoreSdk.where('seasonId', '==', seasonId),
        firestoreSdk.orderBy('score', 'desc'),
        firestoreSdk.limit(30)
    );
}

async function list() {
    const user = currentIdentity();
    const current = snapshotForPublication();
    const [own, results] = await Promise.all([
        firestoreSdk.getDoc(ownDocument(user)),
        firestoreSdk.getDocs(seasonQuery(current.seasonId))
    ]);
    joined = own.exists();
    knownUid = user.uid;
    return {
        seasonId: current.seasonId,
        joined,
        ownScore: own.exists() ? own.data().score : null,
        uid: user.uid,
        entries: results.docs.map(item => {
            const data = item.data();
            return {
                uid: item.id,
                displayName: String(data.displayName || 'Estudante').slice(0, 32),
                score: Math.max(0, Number(data.score) || 0),
                level: Math.max(1, Number(data.level) || 1)
            };
        })
    };
}

async function join() {
    const user = currentIdentity();
    const current = snapshotForPublication();
    await firestoreSdk.setDoc(ownDocument(user), {
        uid: user.uid,
        ...current,
        updatedAt: firestoreSdk.serverTimestamp()
    });
    joined = true;
    knownUid = user.uid;
    lastPublished = current;
    lastPublishAt = Date.now();
    return list();
}

async function leave() {
    const user = currentIdentity();
    await firestoreSdk.deleteDoc(ownDocument(user));
    joined = false;
    lastPublished = null;
    lastPublishAt = 0;
    return list();
}

async function syncIfJoined() {
    const user = auth.currentUser;
    if (!joined || !user || user.uid !== knownUid || Date.now() - lastPublishAt < 5 * 60_000) return false;
    const current = snapshotForPublication();
    if (JSON.stringify(current) === JSON.stringify(lastPublished)) return false;
    await firestoreSdk.setDoc(ownDocument(user), { uid: user.uid, ...current, updatedAt: firestoreSdk.serverTimestamp() });
    lastPublished = current;
    lastPublishAt = Date.now();
    return true;
}

authSdk.onAuthStateChanged(auth, user => {
    if (user?.uid === knownUid) return;
    joined = false;
    knownUid = user?.uid || '';
    lastPublished = null;
    lastPublishAt = 0;
});

window.KingPublicRanking = { list, join, leave, syncIfJoined };
window.dispatchEvent(new Event('king-public-ranking-ready'));
