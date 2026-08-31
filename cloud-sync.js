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
    const [{ initializeApp }, authSdk, firestoreSdk, appCheckSdk, aiSdk] = await Promise.all([
        import('https://www.gstatic.com/firebasejs/12.18.0/firebase-app.js'),
        import('https://www.gstatic.com/firebasejs/12.18.0/firebase-auth.js'),
        import('https://www.gstatic.com/firebasejs/12.18.0/firebase-firestore.js'),
        import('https://www.gstatic.com/firebasejs/12.18.0/firebase-app-check.js'),
        import('https://www.gstatic.com/firebasejs/12.18.0/firebase-ai.js')
    ]);

    const firebaseApp = initializeApp(firebaseConfig);
    const appCheckDebugKey = 'kingMasterAppCheckDebug';
    if (new URLSearchParams(window.location.search).get('appcheckDebug') === '1') {
        localStorage.setItem(appCheckDebugKey, 'enabled');
    }
    if (localStorage.getItem(appCheckDebugKey) === 'enabled') {
        self.FIREBASE_APPCHECK_DEBUG_TOKEN = true;
    }
    const appCheck = appCheckSdk.initializeAppCheck(firebaseApp, {
        provider: new appCheckSdk.ReCaptchaEnterpriseProvider('6LcR-KEtAAAAAERFmCqsT_x3d7kNkigMaM2uyLbP'),
        isTokenAutoRefreshEnabled: true
    });
    const appCheckReady = appCheckSdk.getToken(appCheck, true).then(() => true);
    const auth = authSdk.getAuth(firebaseApp);
    const db = firestoreSdk.getFirestore(firebaseApp);
    const provider = new authSdk.GoogleAuthProvider();
    let currentUser = null;
    let uploadTimer = null;
    let applyingRemote = false;

    authSdk.setPersistence(auth, authSdk.browserLocalPersistence).catch(() => {});

    const S = aiSdk.Schema;
    const ferramentasGemini = {
        functionDeclarations: [
            {
                name: 'consultar_progresso',
                description: 'Consulta um resumo completo do progresso e uma recomendação de estudo do usuário.',
                parameters: S.object({ properties: {} })
            },
            {
                name: 'listar_materias',
                description: 'Lista as matérias, tópicos e desempenho cadastrados no King Master.',
                parameters: S.object({ properties: {} })
            },
            {
                name: 'adicionar_materia',
                description: 'Adiciona uma matéria nova ao hub de estudos.',
                parameters: S.object({
                    properties: {
                        nome: S.string({ description: 'Nome curto da matéria, por exemplo Física.' }),
                        tipo: S.string({ description: 'Um de: Teórica, Prática, Teórica e Prática, Revisão ou Livre.' }),
                        cor: S.string({ description: 'Cor hexadecimal, por exemplo #007aff.' })
                    },
                    optionalProperties: ['tipo', 'cor']
                })
            },
            {
                name: 'adicionar_topico',
                description: 'Adiciona um tópico ou assunto a uma matéria já existente.',
                parameters: S.object({ properties: { materia: S.string({ description: 'Matéria existente.' }), topico: S.string({ description: 'Nome do tópico.' }) } })
            },
            {
                name: 'concluir_topico',
                description: 'Marca um tópico de uma matéria como concluído.',
                parameters: S.object({ properties: { materia: S.string({ description: 'Matéria existente.' }), topico: S.string({ description: 'Tópico existente.' }) } })
            },
            {
                name: 'agendar_estudo',
                description: 'Cria um compromisso de estudo no agendamento do King Master.',
                parameters: S.object({
                    properties: {
                        materia: S.string({ description: 'Matéria ou atividade que será estudada.' }),
                        data: S.string({ description: 'Data exata no formato YYYY-MM-DD.' }),
                        hora: S.string({ description: 'Hora no formato HH:MM.' }),
                        titulo: S.string({ description: 'Título opcional do compromisso.' }),
                        descricao: S.string({ description: 'Descrição breve opcional.' })
                    },
                    optionalProperties: ['titulo', 'descricao']
                })
            },
            {
                name: 'criar_revisao',
                description: 'Cria uma revisão pendente vinculada a uma matéria.',
                parameters: S.object({ properties: { materia: S.string({ description: 'Matéria existente.' }), assunto: S.string({ description: 'Assunto da revisão.' }), data: S.string({ description: 'Data alvo no formato YYYY-MM-DD.' }) } })
            },
            {
                name: 'preparar_cronometro',
                description: 'Prepara o cronômetro de estudos para uma matéria. Não inicia sozinho.',
                parameters: S.object({ properties: { materia: S.string({ description: 'Matéria existente.' }), minutos: S.number({ description: 'Duração entre 1 e 600 minutos.' }) } })
            },
            {
                name: 'definir_meta_diaria',
                description: 'Altera a meta diária de estudos.',
                parameters: S.object({ properties: { minutos: S.number({ description: 'Meta entre 5 e 1440 minutos.' }) } })
            },
            {
                name: 'atualizar_perfil',
                description: 'Atualiza o nome de usuário e/ou a bio do perfil.',
                parameters: S.object({
                    properties: { nome: S.string({ description: 'Nome de usuário com até 32 caracteres.' }), bio: S.string({ description: 'Bio com até 190 caracteres.' }) },
                    optionalProperties: ['nome', 'bio']
                })
            },
            {
                name: 'alterar_visual',
                description: 'Altera o estilo visual, carreira de títulos ou cor principal do site.',
                parameters: S.object({
                    properties: {
                        visual: S.string({ description: 'classic ou futuristic.' }),
                        carreira: S.string({ description: 'aura ou militar.' }),
                        cor: S.string({ description: 'azul, verde, laranja, roxo, vermelho, amarelo, rosa ou ciano.' })
                    },
                    optionalProperties: ['visual', 'carreira', 'cor']
                })
            },
            {
                name: 'abrir_area',
                description: 'Abre uma área do site: painel, matérias, agenda, revisões, simulados, redações, histórico ou perfil.',
                parameters: S.object({ properties: { area: S.string({ description: 'Nome da área solicitada.' }) } })
            },
            {
                name: 'solicitar_exclusao_materia',
                description: 'Prepara a exclusão de uma matéria. A ação nunca exclui imediatamente e sempre exige confirmação explícita do usuário.',
                parameters: S.object({ properties: { materia: S.string({ description: 'Matéria existente a excluir.' }) } })
            }
        ]
    };

    const firebaseAI = aiSdk.getAI(firebaseApp, { backend: new aiSdk.GoogleAIBackend() });
    const geminiModel = aiSdk.getGenerativeModel(firebaseAI, {
        model: 'gemini-3.6-flash',
        generationConfig: {
            maxOutputTokens: 800,
            thinkingConfig: { thinkingLevel: aiSdk.ThinkingLevel.LOW }
        },
        tools: [ferramentasGemini],
        systemInstruction: `Você é a IA do QG do King Master, assistente pessoal de estudos de Pedro, em português do Brasil.
Converse de forma inteligente, calorosa, objetiva e natural. Analise os dados fornecidos em CONTEXTO ATUAL antes de responder.
Quando o usuário pedir qualquer alteração no site, obrigatoriamente use as ferramentas disponíveis. Você pode combinar várias ferramentas no mesmo pedido.
Nunca diga que executou algo sem receber uma resposta de ferramenta confirmando. Nunca invente matérias, dados ou resultados.
Para datas relativas, use o campo agora do contexto e envie datas exatas no formato YYYY-MM-DD.
Para exclusões, use apenas solicitar_exclusao_materia e informe que falta a confirmação do usuário.
Se faltar um dado indispensável, faça uma pergunta curta. Para orientação de estudos, adapte a resposta ao progresso real do usuário.`
    });
    let geminiChat = geminiModel.startChat();

    window.kingGemini = {
        available: true,
        async send(message, context) {
            if (!window.KingMasterAI?.executeTool) throw new Error('As ferramentas do King Master ainda não estão prontas.');
            await appCheckReady;
            const prompt = `CONTEXTO ATUAL DO KING MASTER:\n${JSON.stringify(context)}\n\nPEDIDO DO USUÁRIO:\n${message}`;
            let result = await geminiChat.sendMessage(prompt);
            const actions = [];
            for (let round = 0; round < 6; round += 1) {
                const calls = result.response.functionCalls();
                if (!calls.length) return { text: result.response.text() || 'Concluído.', actions };
                const responses = [];
                for (const call of calls) {
                    let response;
                    try {
                        response = await window.KingMasterAI.executeTool(call.name, call.args || {});
                    } catch (error) {
                        response = { ok: false, message: error?.message || 'A ação falhou.' };
                    }
                    actions.push(response);
                    responses.push({ functionResponse: { name: call.name, response } });
                }
                result = await geminiChat.sendMessage(responses);
            }
            return { text: 'Executei as ações possíveis, mas o pedido ficou grande demais para uma única rodada. Confira o resultado e continue comigo.', actions };
        },
        reset() { geminiChat = geminiModel.startChat(); }
    };

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
