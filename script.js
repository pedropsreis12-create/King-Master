const XP_LAB_SESSION_KEY = 'kingMasterXpLabUnlocked';
let XP_LAB_ATIVO = sessionStorage.getItem(XP_LAB_SESSION_KEY) === 'true';
document.documentElement.dataset.xpLab = String(XP_LAB_ATIVO);

const defaultAppData = {
    totalStudySeconds: 0, 
    weeklyChart: [0, 0, 0, 0, 0, 0, 0], 
    cycleItems: [], 
    historyItems: [], 
    agendaItems: [], 
    agendamentoItems: [],
    simuladosItems: [],
    redacaoItems: [],
    revisoesItems: [],
    revisaoTags: [],
    cadernoErrosItems: [],
    dailyGoalMinutes: 240,
    lastWeekStart: '', 
    themeColor: '', 
    themeColorRgb: '', 
    darkMode: false,
    visualMode: 'futuristic',
    rankVisualMode: 'militar',
    piorAreaGargalo: null,
    xpLoginDates: [],
    frasesMotivacionaisFila: [],
    ultimaFraseMotivacional: null,
    profileName: 'Estudante',
    profileBio: 'Construindo meu caminho até o ENEM, um foco de cada vez.',
    profilePhoto: '',
    xpResetOffset: 0,
    selectedFrames: { militar: '', aura: '' },
    frameVaultOpen: false,
    onboardingCompleted: false,
    accessibility: { fontScale: 'normal', highContrast: false, motionMode: 'auto' },
    studyLogging: { autoReview: true, reviewDelayDays: 1 },
    aiSettings: { retentionDays: 7 },
    aiConversation: [],
    pendingStudySession: null,
    reminder: { enabled: false, time: '19:00', lastShown: '' },
    lastModifiedAt: 0
};

let appData;
let timerPersistenceReady = false;
try {
    appData = { ...defaultAppData, ...(JSON.parse(localStorage.getItem('qg_pedro_data')) || {}) };
} catch (error) {
    appData = { ...defaultAppData };
    console.warn('Os dados locais estavam ilegíveis. O King Master iniciou com uma base segura.', error);
}

try {
    appData = window.KingTimerRecovery.recover(appData, JSON.parse(localStorage.getItem(window.KingTimerRecovery.KEY)));
} catch { /* Um checkpoint incompleto não deve impedir o acesso ao progresso salvo. */ }

const getMonday = (d) => { const dt = new Date(d); const day = dt.getDay(); const diff = dt.getDate() - day + (day === 0 ? -6 : 1); return new Date(dt.setDate(diff)).toDateString(); };
if (appData.lastWeekStart !== getMonday(new Date())) {
    appData.weeklyChart = [0, 0, 0, 0, 0, 0, 0];
    appData.lastWeekStart = getMonday(new Date());
}

if (!appData.weeklyChart || appData.weeklyChart.length !== 7) appData.weeklyChart = [0, 0, 0, 0, 0, 0, 0];
if (!appData.cycleItems) appData.cycleItems = [];
if (!appData.historyItems) appData.historyItems = [];
if (!appData.agendaItems) appData.agendaItems = [];
if (!appData.agendamentoItems) appData.agendamentoItems = [];
if (!appData.simuladosItems) appData.simuladosItems = [];
if (!appData.redacaoItems) appData.redacaoItems = [];
if (!appData.revisoesItems) appData.revisoesItems = [];
if (!appData.revisaoTags) appData.revisaoTags = [];
if (!Array.isArray(appData.cadernoErrosItems)) appData.cadernoErrosItems = [];
if (!appData.xpLoginDates) appData.xpLoginDates = [];
if (!Number.isFinite(Number(appData.xpResetOffset))) appData.xpResetOffset = 0;
if (!Array.isArray(appData.frasesMotivacionaisFila)) appData.frasesMotivacionaisFila = [];
if (!Number.isInteger(appData.ultimaFraseMotivacional)) appData.ultimaFraseMotivacional = null;
if (typeof appData.profileName !== 'string' || !appData.profileName.trim()) appData.profileName = 'Estudante';
if (typeof appData.profileBio !== 'string') appData.profileBio = '';
appData.profileName = appData.profileName.trim().slice(0, 32);
appData.profileBio = appData.profileBio.trim().slice(0, 190);
if (typeof appData.profilePhoto !== 'string') appData.profilePhoto = '';
if (!appData.visualMode) appData.visualMode = 'futuristic';
if (!['militar', 'aura'].includes(appData.rankVisualMode)) appData.rankVisualMode = 'militar';
if (!appData.selectedFrames || typeof appData.selectedFrames !== 'object') appData.selectedFrames = { militar: '', aura: '' };
if (typeof appData.selectedFrames.militar !== 'string') appData.selectedFrames.militar = '';
if (typeof appData.selectedFrames.aura !== 'string') appData.selectedFrames.aura = '';
if (typeof appData.frameVaultOpen !== 'boolean') appData.frameVaultOpen = false;
if (!appData.accessibility || typeof appData.accessibility !== 'object') appData.accessibility = { ...defaultAppData.accessibility };
if (!appData.accessibility.motionMode) appData.accessibility.motionMode = appData.accessibility.reduceMotion ? 'reduced' : 'auto';
appData.accessibility = { ...defaultAppData.accessibility, ...appData.accessibility };
if (!['auto', 'full', 'reduced', 'off'].includes(appData.accessibility.motionMode)) appData.accessibility.motionMode = 'auto';
delete appData.accessibility.reduceMotion;
if (!appData.studyLogging || typeof appData.studyLogging !== 'object') appData.studyLogging = { ...defaultAppData.studyLogging };
appData.studyLogging = { ...defaultAppData.studyLogging, ...appData.studyLogging };
appData.studyLogging.autoReview = appData.studyLogging.autoReview !== false;
appData.studyLogging.reviewDelayDays = [1, 3, 7, 14, 30].includes(Number(appData.studyLogging.reviewDelayDays)) ? Number(appData.studyLogging.reviewDelayDays) : 1;
if (!appData.aiSettings || typeof appData.aiSettings !== 'object') appData.aiSettings = { ...defaultAppData.aiSettings };
appData.aiSettings = { ...defaultAppData.aiSettings, ...appData.aiSettings };
appData.aiSettings.retentionDays = [1, 7, 30].includes(Number(appData.aiSettings.retentionDays)) ? Number(appData.aiSettings.retentionDays) : 7;
if (!Array.isArray(appData.aiConversation)) appData.aiConversation = [];
if (!appData.pendingStudySession || typeof appData.pendingStudySession !== 'object') appData.pendingStudySession = null;
if (!appData.reminder || typeof appData.reminder !== 'object') appData.reminder = { ...defaultAppData.reminder };
appData.reminder = { ...defaultAppData.reminder, ...appData.reminder };
if (!Number.isFinite(Number(appData.lastModifiedAt))) appData.lastModifiedAt = 0;

if(appData.darkMode) document.documentElement.setAttribute('data-theme', 'dark');
document.documentElement.setAttribute('data-visual', appData.visualMode === 'classic' ? 'classic' : 'futuristic');
document.documentElement.setAttribute('data-rank-mode', appData.rankVisualMode);
if(appData.themeColor) { 
    document.documentElement.style.setProperty('--accent-color', appData.themeColor); 
    document.documentElement.style.setProperty('--accent-rgb', appData.themeColorRgb); 
}

function saveAppData() { 
    if (timerPersistenceReady) appData.timerState = captureTimerState();
    const previousRevision = appData.lastModifiedAt;
    appData.lastModifiedAt = Date.now();
    try { localStorage.setItem('qg_pedro_data', JSON.stringify(appData)); }
    catch (error) { appData.lastModifiedAt = previousRevision; persistTimerCheckpoint(); throw error; }
    window.dispatchEvent(new CustomEvent('king-master-data-changed', { detail: { updatedAt: appData.lastModifiedAt } }));
    if (timerPersistenceReady) persistTimerCheckpoint();
    updateDashboardStats(); 
    atualizarIndicadoresNavegacao();
}

window.kingMasterCloudBridge = {
    exportData: () => JSON.parse(JSON.stringify(appData)),
    resetForAccount: profileName => {
        const fresh = { ...defaultAppData, profileName: String(profileName || 'Estudante').trim().slice(0, 32) || 'Estudante', lastModifiedAt: Date.now() };
        localStorage.setItem('qg_pedro_data', JSON.stringify(fresh));
        timerPersistenceReady = false;
        localStorage.removeItem(window.KingTimerRecovery.KEY);
        window.location.reload();
    },
    importData: dados => {
        if (!dados || typeof dados !== 'object') return;
        localStorage.setItem('qg_pedro_data', JSON.stringify({ ...defaultAppData, ...dados }));
        // O fechamento causado pela importação não pode sobrescrever a versão da nuvem.
        timerPersistenceReady = false;
        localStorage.removeItem(window.KingTimerRecovery.KEY);
        window.location.reload();
    }
};

function fecharMenuMovel() {
    const menu = document.getElementById('mainNavigation');
    const botao = document.getElementById('mobileNavToggle');
    const botaoMais = document.getElementById('dockMoreButton');
    menu?.classList.remove('mobile-open');
    document.documentElement.classList.remove('mobile-menu-open');
    document.body.classList.remove('mobile-menu-open');
    if (botao) {
        botao.setAttribute('aria-expanded', 'false');
        botao.setAttribute('aria-label', 'Abrir menu de navegação');
        const icone = botao.querySelector('span');
        if (icone) icone.textContent = '☰';
    }
    botaoMais?.setAttribute('aria-expanded', 'false');
}

function toggleMobileNav() {
    const menu = document.getElementById('mainNavigation');
    const botao = document.getElementById('mobileNavToggle');
    const botaoMais = document.getElementById('dockMoreButton');
    if (!menu || !botao) return;
    const aberto = menu.classList.toggle('mobile-open');
    document.documentElement.classList.toggle('mobile-menu-open', aberto);
    document.body.classList.toggle('mobile-menu-open', aberto);
    botao.setAttribute('aria-expanded', String(aberto));
    botao.setAttribute('aria-label', aberto ? 'Fechar menu de navegação' : 'Abrir menu de navegação');
    const icone = botao.querySelector('span');
    if (icone) icone.textContent = aberto ? '×' : '☰';
    botaoMais?.setAttribute('aria-expanded', String(aberto));
}

const FRASES_MOTIVACIONAIS = [
    'O resultado de amanhã começa no minuto de foco de hoje.',
    'Não espere a motivação chegar: comece, e ela alcançará você.',
    'Uma questão compreendida vale mais que dez páginas apenas lidas.',
    'Seu ritmo pode variar; sua direção precisa permanecer.',
    'Todo conteúdo difícil fica menor quando você volta a ele.',
    'A aprovação é construída em sessões que ninguém aplaude.',
    'Disciplina é continuar mesmo quando o entusiasmo descansa.',
    'O estudo de hoje é um voto na pessoa que você quer se tornar.',
    'Você não precisa vencer o dia inteiro, apenas o próximo bloco.',
    'Cada erro corrigido é uma armadilha a menos na prova.',
    'Constância transforma minutos comuns em resultados extraordinários.',
    'O cansaço pede pausa; o objetivo pede que você retorne.',
    'Começar pequeno ainda é começar na direção certa.',
    'O assunto que assusta hoje pode ser seu ponto forte amanhã.',
    'Revisar é encontrar de novo aquilo que você decidiu não perder.',
    'Sua maior vantagem é poder tentar mais uma vez com mais experiência.',
    'Um dia consistente supera uma semana de promessas.',
    'Foco não é fazer tudo; é proteger o que importa agora.',
    'A dúvida anotada hoje pode virar segurança no dia da prova.',
    'Quando o plano estiver pesado, reduza o passo, não abandone o caminho.',
    'A mente aprende melhor quando a coragem aceita errar.',
    'Cada simulado é treino para manter a calma quando valer de verdade.',
    'O progresso silencioso também conta — e conta muito.',
    'Sua meta não exige perfeição; exige presença repetida.',
    'Estudar cansado com equilíbrio ainda é avançar.',
    'A confiança vem depois das repetições, não antes delas.',
    'Você não está atrasado enquanto continuar se movendo.',
    'Uma revisão bem feita devolve força ao conhecimento.',
    'A concentração cresce quando você dá a ela alguns minutos sem interrupção.',
    'O próximo acerto pode nascer exatamente do erro que você quase ignorou.',
    'Transforme ansiedade em uma tarefa pequena e executável.',
    'A prova mede respostas; sua rotina constrói a capacidade de encontrá-las.',
    'Nenhum minuto focado desaparece: ele se acumula em domínio.',
    'Você não precisa sentir vontade para honrar seu plano.',
    'Persistir também é saber descansar e voltar inteiro.',
    'Conhecimento forte nasce de encontros repetidos com o mesmo tema.',
    'A sua versão aprovada agradecerá por esta sessão.',
    'Hoje é um ótimo dia para tornar uma fraqueza menos fraca.',
    'Faça o possível com atenção; amanhã, o possível será maior.',
    'O cronômetro registra tempo, mas sua dedicação registra transformação.',
    'A rotina certa deixa menos espaço para a dúvida vencer.',
    'Cada tópico dominado abre espaço mental para o próximo.',
    'Paciência também é uma estratégia de alto desempenho.',
    'A dificuldade não é um aviso para parar; é um mapa do que treinar.',
    'O estudo rende quando você troca pressa por presença.',
    'Uma sessão honesta vale mais que um plano perfeito nunca iniciado.',
    'Seu futuro não precisa de um milagre hoje; precisa de continuidade.',
    'Quando você mede o progresso, percebe que o esforço já está falando.',
    'Aprender é permitir que a repetição faça o trabalho profundo.',
    'A cada retorno, o conteúdo encontra uma mente mais preparada.',
    'Não negocie com a distração durante o tempo que pertence ao seu sonho.',
    'O objetivo parece distante até que a constância encurta o caminho.',
    'Você pode não controlar a prova, mas controla a preparação de agora.',
    'A coragem acadêmica começa com a pergunta que você decide enfrentar.',
    'Seu desempenho não é uma sentença; é um retrato que o treino pode mudar.',
    'A repetição consciente transforma informação em ferramenta.',
    'Um bloco concluído é uma promessa cumprida consigo mesmo.',
    'A clareza chega para quem permanece tempo suficiente diante da dúvida.',
    'Não compare bastidores de estudo com resultados prontos de outra pessoa.',
    'O conteúdo não precisa ser fácil para se tornar familiar.',
    'Pequenas vitórias diárias formam uma grande vantagem no fim.',
    'Toda vez que você volta, sua disciplina fica mais confiável.',
    'A aprovação gosta de quem aparece também nos dias comuns.',
    'O foco de uma hora pode mudar a confiança de uma semana.',
    'Descobrir onde errou é uma forma concreta de avançar.',
    'Sua preparação ganha força quando o plano vira prática.',
    'O melhor momento para recuperar o ritmo é o próximo minuto.',
    'A matéria difícil não define seu limite; revela seu próximo treino.',
    'Um pouco todos os dias deixa de ser pouco depois de algum tempo.',
    'A constância faz parecer inevitável aquilo que antes parecia impossível.',
    'Estude para entender; a memória seguirá o caminho da compreensão.',
    'O hábito protege seu objetivo nos dias em que a emoção oscila.',
    'Cada questão resolvida treina conhecimento, atenção e decisão.',
    'A pausa certa conserva energia; o retorno certo conserva o sonho.',
    'Progresso real é conseguir hoje aquilo que ontem exigia mais esforço.',
    'Não tema recomeçar: você recomeça com tudo o que já aprendeu.',
    'Faça desta sessão uma evidência de que você leva seu objetivo a sério.',
    'Sua disciplina de hoje pode ser a tranquilidade do dia da prova.',
    'Mais importante que estudar muito uma vez é voltar muitas vezes.',
    'O caminho fica mais nítido quando você cumpre a próxima tarefa.'
].map(texto => ({ texto, autor: 'King Master' }));

function embaralharFrasesMotivacionais() {
    const indices = FRASES_MOTIVACIONAIS.map((_, indice) => indice);
    for (let i = indices.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [indices[i], indices[j]] = [indices[j], indices[i]];
    }
    if (indices.length > 1 && indices[0] === appData.ultimaFraseMotivacional) {
        [indices[0], indices[1]] = [indices[1], indices[0]];
    }
    return indices;
}

function mostrarFraseMotivacional() {
    const fraseElemento = document.getElementById('frase-motivacional');
    const autorElemento = document.getElementById('frase-motivacional-autor');
    if (!fraseElemento || !autorElemento || !FRASES_MOTIVACIONAIS.length) return;

    let fila = appData.frasesMotivacionaisFila.filter(indice => Number.isInteger(indice) && FRASES_MOTIVACIONAIS[indice]);
    if (!fila.length) fila = embaralharFrasesMotivacionais();
    if (fila.length > 1 && fila[0] === appData.ultimaFraseMotivacional) {
        [fila[0], fila[1]] = [fila[1], fila[0]];
    }

    const indice = fila.shift();
    const frase = FRASES_MOTIVACIONAIS[indice];
    fraseElemento.textContent = frase.texto;
    autorElemento.textContent = `— ${frase.autor}`;
    appData.frasesMotivacionaisFila = fila;
    appData.ultimaFraseMotivacional = indice;
    localStorage.setItem('qg_pedro_data', JSON.stringify(appData));
}

function showSection(sectionId) {
    const secao = document.getElementById(sectionId);
    if (!secao?.classList.contains('content-section')) return;
    fecharMenuMovel();
    document.getElementById('settingsPanel')?.classList.remove('active');
    document.getElementById('settingsToggleBtn')?.setAttribute('aria-expanded', 'false');
    document.querySelectorAll('.content-section').forEach(s => {
        const ativa = s.id === sectionId;
        s.classList.toggle('active', ativa);
        s.setAttribute('aria-hidden', String(!ativa));
    });
    let abaAtiva = null;
    document.querySelectorAll('.menu-btn[data-section]').forEach(b => {
        const ativa = b.dataset.section === sectionId;
        b.classList.toggle('active', ativa);
        if (ativa) {
            b.setAttribute('aria-current', 'page');
            if (b.closest('.nav-tabs')) abaAtiva = b;
        } else {
            b.removeAttribute('aria-current');
        }
    });
    const secoesDock = new Set(['dashboard', 'planejamento', 'agendamento', 'revisoes']);
    document.querySelectorAll('.dock-btn[data-section]').forEach(b => {
        const ativa = b.dataset.section === sectionId;
        b.classList.toggle('active', ativa);
        if (ativa) b.setAttribute('aria-current', 'page');
        else b.removeAttribute('aria-current');
    });
    const botaoMais = document.getElementById('dockMoreButton');
    botaoMais?.classList.toggle('active', !secoesDock.has(sectionId));
    if (abaAtiva && window.innerWidth > 1100) requestAnimationFrame(() => abaAtiva.scrollIntoView({ behavior: 'smooth', block: 'nearest' }));
    sessionStorage.setItem('kingMasterActiveSection', sectionId);
    const tituloAba = abaAtiva?.querySelector('strong')?.textContent || 'King Master';
    document.title = `${tituloAba} · King Master`;
    document.querySelector('main')?.scrollTo?.({ top: 0, behavior: 'auto' });
    
    if(sectionId === 'historico') renderizarHistorico();
    if(sectionId === 'planejamento') renderizarCiclo();
    if(sectionId === 'escola-provas') renderizarAgenda();
    if(sectionId === 'agendamento') renderizarAgendamento();
    if(sectionId === 'revisoes') renderizarRevisoes();
    if(sectionId === 'caderno-erros') renderizarCadernoErros();
    if(sectionId === 'simulados') renderizarSimulados();
    if(sectionId === 'redacao') renderizarRedacoes();
    if(sectionId === 'perfil') renderGamificacao();
    atualizarIndicadoresNavegacao();
}

function atualizarIndicadoresNavegacao() {
    const hoje = typeof dataLocalISO === 'function' ? dataLocalISO() : new Date().toISOString().slice(0, 10);
    const compromissosHoje = (Array.isArray(appData.agendamentoItems) ? appData.agendamentoItems : [])
        .filter(item => !item.completed && item.date === hoje).length;
    const revisoesDevidas = (Array.isArray(appData.revisoesItems) ? appData.revisoesItems : [])
        .filter(item => ['pendente', 'fraco'].includes(item.status) && (!item.dataAlvo || item.dataAlvo <= hoje)).length;
    const errosDevidos = (Array.isArray(appData.cadernoErrosItems) ? appData.cadernoErrosItems : [])
        .filter(item => item?.status !== 'dominado' && (!item?.proximaRevisao || item.proximaRevisao <= hoje)).length;
    const aplicar = (id, total) => {
        const badge = document.getElementById(id);
        if (!badge) return;
        badge.textContent = total > 99 ? '99+' : String(total);
        badge.hidden = total < 1;
    };
    aplicar('navAgendaBadge', compromissosHoje);
    aplicar('navReviewBadge', revisoesDevidas);
    aplicar('navErrorBadge', errosDevidos);
}

function toggleSettings() {
    const painel = document.getElementById('settingsPanel');
    const botao = document.getElementById('settingsToggleBtn');
    const menu = document.getElementById('mainNavigation');
    const revelador = document.getElementById('navReveal');
    const aberto = painel.classList.toggle('active');
    botao?.setAttribute('aria-expanded', String(aberto));
    if (aberto) {
        menu?.classList.add('is-revealed');
        revelador?.setAttribute('aria-expanded', 'true');
        syncSettingsUI();
    } else {
        fecharMenuMovel();
        menu?.classList.remove('is-revealed');
        revelador?.setAttribute('aria-expanded', 'false');
    }
}

function syncSettingsUI() {
    const escuro = document.documentElement.getAttribute('data-theme') === 'dark';
    const texto = document.getElementById('themeToggleText');
    const dica = document.getElementById('themeToggleHint');
    const botao = document.getElementById('themeToggleBtn');
    const seletor = document.getElementById('colorPicker');
    if (texto) texto.textContent = escuro ? 'Modo claro' : 'Modo escuro';
    if (dica) dica.textContent = escuro ? 'Usar interface clara' : 'Usar interface escura';
    if (botao) botao.classList.toggle('is-dark', escuro);
    if (seletor) seletor.value = appData.themeColor || '#007aff';
}

function previewTheme(hex) { 
    hex = hex.replace('#', ''); 
    const r = parseInt(hex.substring(0, 2), 16), g = parseInt(hex.substring(2, 4), 16), b = parseInt(hex.substring(4, 6), 16); 
    document.documentElement.style.setProperty('--accent-color', '#' + hex); 
    document.documentElement.style.setProperty('--accent-rgb', `${r}, ${g}, ${b}`); 
}

function setTheme(hex, rgb) { 
    document.documentElement.style.setProperty('--accent-color', hex); 
    document.documentElement.style.setProperty('--accent-rgb', rgb); 
    appData.themeColor = hex; 
    appData.themeColorRgb = rgb; 
    saveAppData(); 
    syncSettingsUI();
}

function handleColorPicker(hex) { 
    hex = hex.replace('#', ''); 
    const r = parseInt(hex.substring(0, 2), 16), g = parseInt(hex.substring(2, 4), 16), b = parseInt(hex.substring(4, 6), 16); 
    setTheme('#' + hex, `${r}, ${g}, ${b}`); 
}

function toggleDarkMode() { 
    const html = document.documentElement; 
    html.setAttribute('data-theme', html.getAttribute('data-theme') === 'dark' ? 'light' : 'dark'); 
    appData.darkMode = html.getAttribute('data-theme') === 'dark'; 
    saveAppData(); 
    syncSettingsUI();
}

function syncVisualModeControl() {
    const isFuturistic = appData.visualMode !== 'classic';
    const control = document.getElementById('visualModeSwitch');
    const label = document.getElementById('visualModeLabel');
    if (control) control.setAttribute('aria-checked', String(isFuturistic));
    if (label) label.textContent = isFuturistic ? 'Visual futurista' : 'Visual clássico';
}

function toggleVisualMode() {
    appData.visualMode = appData.visualMode === 'classic' ? 'futuristic' : 'classic';
    document.documentElement.setAttribute('data-visual', appData.visualMode);
    saveAppData();
    syncVisualModeControl();
    showToast(appData.visualMode === 'classic' ? 'Visual clássico ativado.' : 'Visual futurista ativado.');
}

// ==========================================
// LÓGICA DE MODAIS E EXCLUSÕES
// ==========================================
let itemToDelete = null, deleteType = '';

function fecharModal(id) { document.getElementById(id)?.classList.remove('active'); }

function abrirModalDeletar(tipo, id, titulo, msg) { 
    itemToDelete = id; 
    deleteType = tipo; 
    document.getElementById('deleteConfirmTitle').textContent = titulo; 
    document.getElementById('deleteConfirmMessage').textContent = msg; 
    document.getElementById('deleteConfirmModal').classList.add('active'); 
}

function fecharModalDeletar() { 
    fecharModal('deleteConfirmModal'); 
    itemToDelete = null; 
    deleteType = ''; 
}

function confirmarDelecao() {
    const tipo = deleteType; 
    const id = itemToDelete;
    fecharModalDeletar(); 
    
    if (tipo === 'cycle') { 
        appData.cycleItems = appData.cycleItems.filter(i => i.id !== id); 
        saveAppData(); renderizarCiclo(); 
        showToast('🗑️ Matéria removida!'); 
    }
    else if (tipo === 'history') { 
        const sessaoApagada = appData.historyItems.find(i => i.id === id);
        if (sessaoApagada) {
            appData.totalStudySeconds = Math.max(0, appData.totalStudySeconds - sessaoApagada.tempoSegundos);
            const idxMateria = appData.cycleItems.findIndex(m => m.subject === sessaoApagada.materia);
            if (idxMateria > -1) {
                let minutosParaEstornar = sessaoApagada.tempoSegundos / 60;
                appData.cycleItems[idxMateria].executedMin = Math.max(0, appData.cycleItems[idxMateria].executedMin - minutosParaEstornar);
            }
            const dataSessao = new Date(sessaoApagada.id);
            if (getMonday(dataSessao) === appData.lastWeekStart) {
                const diaSemana = dataSessao.getDay(); 
                const indexChart = diaSemana === 0 ? 6 : diaSemana - 1; 
                appData.weeklyChart[indexChart] = Math.max(0, appData.weeklyChart[indexChart] - sessaoApagada.tempoSegundos);
            }
        }
        appData.historyItems = appData.historyItems.filter(i => i.id !== id); 
        saveAppData(); 
        renderizarHistorico(); 
    }
    else if (tipo === 'clearCycle') { 
        appData.cycleItems = []; 
        saveAppData(); renderizarCiclo(); 
        showToast('🧹 Tudo apagado!'); 
    }
    else if (tipo === 'agenda') { 
        appData.agendaItems = appData.agendaItems.filter(i => i.id !== id); 
        saveAppData(); renderizarAgenda(); 
        showToast('🗑️ Agendamento removido!'); 
    }
    else if (tipo === 'agendamentoTab') { 
        appData.agendamentoItems = appData.agendamentoItems.filter(i => i.id !== id); 
        saveAppData(); renderizarAgendamento(); 
        showToast('🗑️ Compromisso removido!'); 
    }
    else if (tipo === 'simulado') { 
        appData.simuladosItems = appData.simuladosItems.filter(i => i.id !== id); 
        saveAppData(); renderizarSimulados(); 
        showToast('🗑️ Registo de simulado removido!'); 
    }
    else if (tipo === 'redacao') { 
        appData.redacaoItems = appData.redacaoItems.filter(i => i.id !== id); 
        saveAppData(); renderizarRedacoes(); 
        showToast('🗑️ Redação removida do histórico!'); 
    }
    else if (tipo === 'revisao') {
        appData.revisoesItems = appData.revisoesItems.filter(i => i.id !== id);
        saveAppData(); renderizarRevisoes();
        showToast('🗑️ Revisão removida!');
    }
    else if (tipo === 'cadernoErro') {
        const removido = appData.cadernoErrosItems.find(i => i.id === id);
        appData.cadernoErrosItems = appData.cadernoErrosItems.filter(i => i.id !== id);
        saveAppData(); renderizarCadernoErros();
        (removido?.imagens || []).forEach(imagem => {
            cadernoErroImagemCache.delete(imagem.id);
            window.kingCloud?.deleteErrorImage?.(imagem.id).catch(() => {});
        });
        showToast('Erro removido do caderno.');
    }
}

function showToast(msg, isError = false) {
    const toast = document.getElementById('toastNotification'); 
    if(!toast) return;
    toast.innerHTML = msg;
    if(isError) toast.classList.add('toast-error'); else toast.classList.remove('toast-error');
    toast.classList.add('show'); 
    setTimeout(() => toast.classList.remove('show'), 3500);
}

const formatShortTime = sec => sec === 0 ? '0m' : (sec >= 3600 ? `${Math.floor(sec / 3600)}h ${Math.floor((sec % 3600) / 60)}m` : `${Math.floor((sec % 3600) / 60)}m`);
const formatHistoryTime = sec => `${Math.floor(sec / 3600).toString().padStart(2, '0')}:${Math.floor((sec % 3600) / 60).toString().padStart(2, '0')}:${(sec % 60).toString().padStart(2, '0')}`;

function dataLocalISO(data = new Date()) {
    return `${data.getFullYear()}-${String(data.getMonth() + 1).padStart(2, '0')}-${String(data.getDate()).padStart(2, '0')}`;
}

function dataISOParaLocal(valor) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(valor || '')) return null;
    const [ano, mes, dia] = valor.split('-').map(Number);
    const data = new Date(ano, mes - 1, dia);
    return Number.isNaN(data.getTime()) ? null : data;
}

function dataHistoricoISO(item) {
    if (item.dataISO && dataISOParaLocal(item.dataISO)) return item.dataISO;
    const partes = String(item.dataChave || '').match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
    if (partes) {
        // Os registos antigos guardavam janeiro como mês 0. Mantemos a compatibilidade sem alterar o histórico.
        return dataLocalISO(new Date(Number(partes[1]), Number(partes[2]), Number(partes[3])));
    }
    const dataId = new Date(Number(item.id));
    return Number.isNaN(dataId.getTime()) ? '' : dataLocalISO(dataId);
}

function obterDiasDeEstudo() {
    return new Set(appData.historyItems.filter(item => (item.tempoSegundos || 0) > 0).map(dataHistoricoISO).filter(Boolean));
}

function calcularSequenciaAtual() {
    const estudados = obterDiasDeEstudo();
    const hoje = new Date(); hoje.setHours(12, 0, 0, 0);
    let cursor = new Date(hoje);
    let sequencia = 0;
    for (let i = 0; i < 730; i++) {
        const iso = dataLocalISO(cursor);
        const diaSemana = cursor.getDay();
        const estudou = estudados.has(iso);
        if (diaSemana === 0) {
            // Domingo é neutro: não soma nem quebra.
        } else if (diaSemana === 6) {
            // Sábado é opcional: soma quando usado, mas a ausência não quebra.
            if (estudou) sequencia++;
        } else if (estudou) {
            sequencia++;
        } else if (iso !== dataLocalISO(hoje)) {
            break;
        }
        cursor.setDate(cursor.getDate() - 1);
    }
    return sequencia;
}

function criarMapaSequencias() {
    const diasEstudados = obterDiasDeEstudo();
    const mapa = {};
    if (!diasEstudados.size) return mapa;
    const datas = [...diasEstudados].map(dataISOParaLocal).filter(Boolean).sort((a, b) => a - b);
    const cursor = new Date(datas[0]); cursor.setHours(12, 0, 0, 0);
    const hoje = new Date(); hoje.setHours(12, 0, 0, 0);
    const limite = new Date(Math.max(hoje.getTime(), datas[datas.length - 1].getTime()));
    let sequencia = 0;
    while (cursor <= limite) {
        const iso = dataLocalISO(cursor);
        const estudou = diasEstudados.has(iso);
        if (cursor.getDay() === 0) {
            // Domingo neutro.
        } else if (cursor.getDay() === 6) {
            if (estudou) sequencia++;
        } else if (estudou) {
            sequencia++;
        } else if (iso !== dataLocalISO(hoje)) {
            sequencia = 0;
        }
        mapa[iso] = sequencia;
        cursor.setDate(cursor.getDate() + 1);
    }
    return mapa;
}

function multiplicadorPorSequencia(dias) {
    if (dias >= 30) return 2;
    if (dias >= 15) return 1.5;
    if (dias >= 7) return 1.25;
    if (dias >= 3) return 1.1;
    return 1;
}

function nomeDoMultiplicador(dias) {
    if (dias >= 30) return 'Comando Supremo';
    if (dias >= 15) return 'Operação Total';
    if (dias >= 7) return 'Bônus Estratégico';
    if (dias >= 3) return 'Bônus de Campanha';
    return 'XP Base';
}

const PATENTES_MILITARES = [
    { nivel: 1, xp: 0, titulo: 'Soldado do Foco', tema: 'soldado', simbolo: '⌃', legenda: 'A base da tropa nasce da disciplina diária', referencias: ['Uma Divisa', 'Boina Verde', 'Ordem Unida'] },
    { nivel: 3, xp: 4500, titulo: 'Cabo da Constância', tema: 'cabo', simbolo: '⌃⌃', legenda: 'O primeiro comando nasce do exemplo', referencias: ['Duas Divisas', 'Braçal', 'Esquadrão'] },
    { nivel: 6, xp: 9000, titulo: 'Terceiro-Sargento da Rotina', tema: 'terceiro-sargento', simbolo: '⌃⌃⌃', legenda: 'A rotina agora obedece ao seu comando', referencias: ['Três Divisas', 'Pelotão', 'Instrução'] },
    { nivel: 9, xp: 15000, titulo: 'Segundo-Sargento da Tática', tema: 'segundo-sargento', simbolo: '⌃⌃⌃⌃', legenda: 'Tática e constância avançam em formação', referencias: ['Quatro Divisas', 'Quadro Tático', 'Coordenação'] },
    { nivel: 12, xp: 25000, titulo: 'Primeiro-Sargento da Estratégia', tema: 'primeiro-sargento', simbolo: '≋⌃', legenda: 'Liderança transforma esforço em formação', referencias: ['Divisas de 1º Sargento', 'Liderança', 'Formação'] },
    { nivel: 16, xp: 40000, titulo: 'Subtenente da Persistência', tema: 'subtenente', simbolo: '◇', legenda: 'Experiência, firmeza e presença em campo', referencias: ['Losango', 'Sabre', 'Companhia'] },
    { nivel: 20, xp: 60000, titulo: 'Aspirante-a-Oficial', tema: 'aspirante', simbolo: '★', legenda: 'A estrela do oficialato começa a surgir', referencias: ['Estrela Singela', 'Academia Militar', 'Espadim'] },
    { nivel: 24, xp: 85000, titulo: 'Segundo-Tenente da Execução', tema: 'segundo-tenente', simbolo: '★', legenda: 'Planejamento e ação marcham juntos', referencias: ['Uma Estrela', 'Mapa Tático', 'Pelotão'] },
    { nivel: 28, xp: 115000, titulo: 'Primeiro-Tenente da Precisão', tema: 'primeiro-tenente', simbolo: '★★', legenda: 'Nenhum objetivo fica sem coordenadas', referencias: ['Duas Estrelas', 'Bússola', 'Operação'] },
    { nivel: 32, xp: 155000, titulo: 'Capitão do Cronograma', tema: 'capitao', simbolo: '★★★', legenda: 'O tempo inteiro responde ao seu plano', referencias: ['Três Estrelas', 'Companhia', 'Carta de Comando'] },
    { nivel: 37, xp: 210000, titulo: 'Major da Evolução', tema: 'major', simbolo: '★★✹', legenda: 'Visão de estado-maior sobre cada avanço', referencias: ['Duas Estrelas', 'Roseta', 'Estado-Maior'] },
    { nivel: 42, xp: 280000, titulo: 'Tenente-Coronel da Operação', tema: 'tenente-coronel', simbolo: '★✹✹', legenda: 'Coordena grandes objetivos sem perder precisão', referencias: ['Estrela e Rosetas', 'Batalhão', 'Operações'] },
    { nivel: 47, xp: 370000, titulo: 'Coronel da Excelência', tema: 'coronel', simbolo: '✹✹✹', legenda: 'Excelência deixa de ser meta e vira padrão', referencias: ['Três Rosetas', 'Regimento', 'Comando'] },
    { nivel: 52, xp: 480000, titulo: 'General de Brigada do Saber', tema: 'general-brigada', simbolo: '✺★★', legenda: 'O generalato abre uma nova dimensão de comando', referencias: ['Brasão do Generalato', 'Duas Estrelas', 'Brigada'] },
    { nivel: 58, xp: 610000, titulo: 'General de Divisão da Mestria', tema: 'general-divisao', simbolo: '✺★★★', legenda: 'Três estrelas dominam o campo inteiro', referencias: ['Brasão do Generalato', 'Três Estrelas', 'Divisão'] },
    { nivel: 64, xp: 750000, titulo: 'General de Exército do Saber', tema: 'general-exercito', simbolo: '✺★★★★', legenda: 'Toda a estratégia converge para a vitória', referencias: ['Brasão do Generalato', 'Quatro Estrelas', 'Exército'] },
    { nivel: 70, xp: 1000000, titulo: 'Marechal Supremo do ENEM', tema: 'marechal', simbolo: '✺★★★★★', legenda: 'O mais alto comando do conhecimento', referencias: ['Brasão do Generalato', 'Cinco Estrelas', 'Comando Supremo'] }
];

const TITULOS_AURA = [
    { nivel: 1, xp: 0, titulo: 'Genin do Foco', tema: 'genin', simbolo: '忍', legenda: 'Disciplina em formação', referencias: ['Folha Oculta', 'Kunai', 'Missão D'] },
    { nivel: 3, xp: 4500, titulo: 'Chunin', tema: 'chunin', simbolo: '中', legenda: 'Estratégia e constância', referencias: ['Pergaminho', 'Exame Chunin', 'Estratégia'] },
    { nivel: 6, xp: 9000, titulo: 'Caçador de Oni', tema: 'oni', simbolo: '滅', legenda: 'A lâmina corta a procrastinação', referencias: ['Nichirin', 'Respiração', 'Lua Carmesim'] },
    { nivel: 9, xp: 15000, titulo: 'Gear Second', tema: 'gear2', simbolo: 'Ⅱ', legenda: 'O ritmo entra em sobrecarga', referencias: ['Vapor', 'Batimento', 'Velocidade'] },
    { nivel: 12, xp: 25000, titulo: 'Kaioken', tema: 'kaioken', simbolo: '界', legenda: 'Poder elevado além do limite', referencias: ['Aura Rubra', 'Multiplicador', 'Limite'] },
    { nivel: 16, xp: 40000, titulo: 'Super Saiyajin', tema: 'saiyajin', simbolo: '超', legenda: 'A determinação vira eletricidade', referencias: ['Ki Dourado', 'Relâmpago', 'Ascensão'] },
    { nivel: 20, xp: 60000, titulo: 'Bankai', tema: 'bankai', simbolo: '卍', legenda: 'Liberação total do potencial', referencias: ['Zangetsu', 'Pétalas', 'Liberação'] },
    { nivel: 24, xp: 85000, titulo: 'Expansão de Domínio', tema: 'dominio', simbolo: '領', legenda: 'Seu foco domina todo o espaço', referencias: ['Infinito', 'Vazio', 'Barreira'] },
    { nivel: 28, xp: 115000, titulo: 'Modo Sábio', tema: 'sabio', simbolo: '仙', legenda: 'Conhecimento em equilíbrio perfeito', referencias: ['Monte Myōboku', 'Senjutsu', 'Equilíbrio'] },
    { nivel: 32, xp: 155000, titulo: 'Oito Portões Internos', tema: 'portoes', simbolo: '八', legenda: 'Os limites começam a se romper', referencias: ['Lótus', 'Oito Portões', 'Juventude'] },
    { nivel: 37, xp: 210000, titulo: 'Gear 5 / Sol da Libertação', tema: 'gear5', simbolo: '☀', legenda: 'Liberdade, criatividade e poder', referencias: ['Nika', 'Tambores', 'Liberdade'] },
    { nivel: 42, xp: 280000, titulo: 'Monarca das Sombras', tema: 'monarca', simbolo: '♛', legenda: 'O exército do conhecimento desperta', referencias: ['Erga-se', 'Exército Sombrio', 'Coroa'] },
    { nivel: 47, xp: 370000, titulo: 'Instinto Superior', tema: 'instinto', simbolo: '身', legenda: 'A resposta surge antes da dúvida', referencias: ['Aura Prateada', 'Mente Vazia', 'Movimento'] },
    { nivel: 52, xp: 480000, titulo: 'Titã Fundador', tema: 'tita', simbolo: '巨', legenda: 'Memórias e vontade atravessam gerações', referencias: ['Caminhos', 'Muralhas', 'Coordenada'] },
    { nivel: 58, xp: 610000, titulo: 'Deus da Destruição', tema: 'destruicao', simbolo: '破', legenda: 'O obstáculo desaparece diante da sua energia', referencias: ['Hakai', 'Energia Violeta', 'Equilíbrio Cósmico'] },
    { nivel: 64, xp: 750000, titulo: 'Haki do Rei Supremo', tema: 'haki-rei', simbolo: '覇', legenda: 'A presença vence antes mesmo do confronto', referencias: ['Haki do Rei', 'Raios Negros', 'Vontade Suprema'] },
    { nivel: 70, xp: 1000000, titulo: 'Entidade Absoluta do ENEM', tema: 'entidade', simbolo: '∞', legenda: 'O conhecimento não possui mais fronteiras', referencias: ['Coroa ENEM', 'Constelações', 'Infinito'] }
];

const MARCOS_NIVEL = PATENTES_MILITARES;

const NIVEL_MAXIMO = MARCOS_NIVEL[MARCOS_NIVEL.length - 1].nivel;
const XP_MAXIMO = MARCOS_NIVEL[MARCOS_NIVEL.length - 1].xp;

function criarLimitesDeNivel() {
    const limites = Array(NIVEL_MAXIMO + 1).fill(0);
    for (let indice = 0; indice < MARCOS_NIVEL.length - 1; indice++) {
        const atual = MARCOS_NIVEL[indice];
        const proximo = MARCOS_NIVEL[indice + 1];
        for (let nivel = atual.nivel; nivel <= proximo.nivel; nivel++) {
            const progresso = (nivel - atual.nivel) / (proximo.nivel - atual.nivel);
            limites[nivel] = Math.round(atual.xp + ((proximo.xp - atual.xp) * progresso));
        }
    }
    return limites;
}

const LIMITES_NIVEL = criarLimitesDeNivel();
const formatarNumero = valor => Math.round(valor).toLocaleString('pt-BR');
let xpTesteLocal = null;

function obterNivelAtual(xp) {
    let nivel = 1;
    for (let candidato = 2; candidato <= NIVEL_MAXIMO; candidato++) {
        if (xp >= LIMITES_NIVEL[candidato]) nivel = candidato;
        else break;
    }
    return nivel;
}

function obterTituloAtual(nivel) {
    const trilha = obterTrilhaVisualAtual();
    return [...trilha].reverse().find(marco => nivel >= marco.nivel)?.titulo || trilha[0].titulo;
}

function obterTemaVisualAtual(nivel) {
    const trilha = obterTrilhaVisualAtual();
    return [...trilha].reverse().find(marco => nivel >= marco.nivel) || trilha[0];
}

function obterTrilhaVisualAtual() {
    return appData.rankVisualMode === 'aura' ? TITULOS_AURA : PATENTES_MILITARES;
}

function simboloDaMoldura(moldura) {
    return window.KingMilitaryInsignia?.render(moldura.tema) || moldura.simbolo;
}

function obterMolduraEquipada(dados, temaAtual) {
    const trilha = obterTrilhaVisualAtual();
    const temaSelecionado = appData.selectedFrames?.[appData.rankVisualMode] || '';
    const moldura = trilha.find(item => item.tema === temaSelecionado);
    return moldura && dados.nivel >= moldura.nivel ? moldura : temaAtual;
}

function equiparMoldura(tema) {
    const dados = xpTesteLocal === null ? calcularGamificacao() : criarDadosGamificacaoDeTeste(xpTesteLocal);
    const moldura = obterTrilhaVisualAtual().find(item => item.tema === tema);
    if (!moldura || dados.nivel < moldura.nivel) {
        showToast('🔒 Essa moldura ainda não foi desbloqueada.', true);
        return;
    }
    appData.selectedFrames[appData.rankVisualMode] = tema;
    saveAppData();
    renderGamificacao(true);
    showToast(`✓ Moldura ${moldura.titulo} equipada`);
}

function usarMolduraAutomatica() {
    appData.selectedFrames[appData.rankVisualMode] = '';
    saveAppData();
    renderGamificacao(true);
    showToast('✓ A moldura voltou a acompanhar seu nível');
}

function sincronizarEstadoCofre() {
    const cofre = document.querySelector('.frame-vault');
    const corpo = document.getElementById('frameVaultBody');
    const botao = document.getElementById('frameVaultToggle');
    if (!corpo || !botao) return;
    const aberto = appData.frameVaultOpen === true;
    corpo.hidden = !aberto;
    cofre?.classList.toggle('is-open', aberto);
    botao.setAttribute('aria-expanded', String(aberto));
    const texto = botao.querySelector('.frame-vault-toggle-copy');
    if (texto) texto.textContent = aberto ? 'Fechar molduras' : 'Abrir molduras';
}

function toggleFrameVault() {
    appData.frameVaultOpen = !appData.frameVaultOpen;
    sincronizarEstadoCofre();
    saveAppData();
}

function renderizarGaleriaMolduras(dados, molduraEquipada) {
    const grid = document.getElementById('frameVaultGrid');
    if (!grid) return;
    const trilha = obterTrilhaVisualAtual();
    const liberadas = trilha.filter(item => dados.nivel >= item.nivel);
    const modo = appData.rankVisualMode;
    const selecionada = appData.selectedFrames?.[modo] || '';
    const count = document.getElementById('frameVaultCount');
    const mode = document.getElementById('frameVaultMode');
    if (count) count.textContent = `${liberadas.length} de ${trilha.length} liberadas`;
    if (mode) mode.textContent = modo === 'aura' ? 'Carreira Aura' : 'Carreira Militar';
    sincronizarEstadoCofre();
    grid.innerHTML = trilha.map(item => {
        const desbloqueada = dados.nivel >= item.nivel;
        const equipada = selecionada ? selecionada === item.tema && desbloqueada : molduraEquipada.tema === item.tema;
        return `<button type="button" class="frame-vault-card${desbloqueada ? ' unlocked' : ' locked'}${equipada ? ' equipped' : ''}" onclick="equiparMoldura('${item.tema}')" ${desbloqueada ? '' : 'aria-disabled="true"'}>
            <span class="frame-vault-mini league-frame rank-frame-${item.tema}" aria-hidden="true"><b>${simboloDaMoldura(item)}</b></span>
            <span class="frame-vault-card-copy"><strong>${item.titulo}</strong><small>${desbloqueada ? (equipada ? 'Equipada agora' : `Liberada no nível ${item.nivel}`) : `Desbloqueia no nível ${item.nivel}`}</small></span>
            <span class="frame-vault-state" aria-hidden="true">${equipada ? '✓' : desbloqueada ? 'Usar' : '🔒'}</span>
        </button>`;
    }).join('');
}

function obterLigaAtual(nivel) {
    if (nivel >= 70) return { nome: 'Liga Einstein', classe: 'league-einstein' };
    if (nivel >= 64) return { nome: 'Estrela do Fim', classe: 'league-endstar' };
    if (nivel >= 40) return { nome: 'Liga Esmeralda', classe: 'league-emerald' };
    if (nivel >= 30) return { nome: 'Liga Rubi', classe: 'league-ruby' };
    if (nivel >= 22) return { nome: 'Liga Diamante', classe: 'league-diamond' };
    if (nivel >= 14) return { nome: 'Liga Ouro', classe: 'league-gold' };
    if (nivel >= 8) return { nome: 'Liga Prata', classe: 'league-silver' };
    if (nivel >= 4) return { nome: 'Liga Cobre', classe: 'league-copper' };
    return { nome: 'Liga Bronze', classe: 'league-bronze' };
}

function registrarBonusLoginDiario() {
    const hoje = dataLocalISO();
    if (!appData.xpLoginDates.includes(hoje)) {
        appData.xpLoginDates.push(hoje);
        appData.lastModifiedAt = Date.now();
        localStorage.setItem('qg_pedro_data', JSON.stringify(appData));
    }
}

function calcularGamificacao() {
    const xpBasePorDia = {};
    const adicionar = (data, valor) => {
        if (!data || !Number.isFinite(valor) || valor <= 0) return;
        xpBasePorDia[data] = (xpBasePorDia[data] || 0) + valor;
    };
    appData.historyItems.forEach(item => adicionar(dataHistoricoISO(item), ((item.tempoSegundos || 0) / 60) * 7));
    appData.simuladosItems.forEach(item => adicionar(item.date, (item.acertos || 0) * 30));
    appData.redacaoItems.forEach(item => adicionar(item.date, 1000));
    appData.xpLoginDates.forEach(data => adicionar(data, 150));

    const mapaSequencias = criarMapaSequencias();
    const xpBruto = Math.round(Object.entries(xpBasePorDia).reduce((total, [data, base]) => {
        return total + Math.round(base * multiplicadorPorSequencia(mapaSequencias[data] || 0));
    }, 0));
    const xpTotal = Math.min(XP_MAXIMO, Math.max(0, xpBruto - Number(appData.xpResetOffset || 0)));
    const nivel = obterNivelAtual(xpTotal);
    const sequencia = calcularSequenciaAtual();
    const liga = obterLigaAtual(nivel);
    return { xpTotal, nivel, sequencia, liga, titulo: obterTituloAtual(nivel), multiplicador: multiplicadorPorSequencia(sequencia) };
}

function calcularEstatisticasGlobais() {
    let acertos = 0, total = 0, topicos = 0;
    appData.cycleItems.forEach(materia => {
        acertos += materia.acertos || 0;
        total += (materia.acertos || 0) + (materia.erros || 0);
        topicos += (materia.topicos || []).filter(topico => topico.concluido).length;
    });
    appData.simuladosItems.forEach(simulado => {
        acertos += simulado.acertos || 0;
        total += simulado.total || ((simulado.acertos || 0) + (simulado.erros || 0));
    });
    return { topicos, taxa: total ? Math.round((acertos / total) * 100) : 0 };
}

function obterIniciaisPerfil() {
    return appData.profileName.split(/\s+/).filter(Boolean).slice(0, 2).map(parte => parte[0]).join('').toUpperCase() || 'PR';
}

function aplicarFotoPerfil() {
    const iniciais = obterIniciaisPerfil();
    ['profileAvatarFallback', 'profileIdentityAvatarFallback'].forEach(id => {
        const fallback = document.getElementById(id);
        if (fallback) fallback.textContent = iniciais;
    });
    ['profileAvatarImage', 'profileIdentityAvatarImage'].forEach(id => {
        const imagem = document.getElementById(id);
        if (!imagem) return;
        imagem.alt = `Foto de perfil de ${appData.profileName}`;
        if (appData.profilePhoto) {
            imagem.src = appData.profilePhoto;
            imagem.classList.add('has-photo');
        } else {
            imagem.removeAttribute('src');
            imagem.classList.remove('has-photo');
        }
    });
    document.querySelectorAll('.avatar-core, .profile-identity-avatar').forEach(el => el.setAttribute('aria-label', `Foto de perfil de ${appData.profileName}`));
}

function aplicarIdentidadePerfil() {
    const nome = appData.profileName || 'Estudante';
    const bio = appData.profileBio || 'Sem bio por enquanto.';
    const nomeExibido = document.getElementById('profileDisplayName');
    const bioExibida = document.getElementById('profileDisplayBio');
    const nomeInput = document.getElementById('profileNameInput');
    const bioInput = document.getElementById('profileBioInput');
    if (nomeExibido) nomeExibido.textContent = nome;
    if (bioExibida) bioExibida.textContent = bio;
    if (nomeInput && document.activeElement !== nomeInput) nomeInput.value = nome;
    if (bioInput && document.activeElement !== bioInput) bioInput.value = appData.profileBio || '';
    atualizarContadorBio();
    aplicarFotoPerfil();
}

function atualizarContadorBio() {
    const input = document.getElementById('profileBioInput');
    const contador = document.getElementById('profileBioCount');
    if (input && contador) contador.textContent = String(input.value.length);
}

function toggleEditorPerfil(forcar) {
    const form = document.getElementById('profileIdentityForm');
    const botao = document.getElementById('profileEditToggle');
    if (!form || !botao) return;
    const abrir = typeof forcar === 'boolean' ? forcar : form.hidden;
    form.hidden = !abrir;
    botao.setAttribute('aria-expanded', String(abrir));
    botao.textContent = abrir ? 'Fechar edição' : 'Editar perfil';
    if (abrir) {
        aplicarIdentidadePerfil();
        document.getElementById('profileNameInput')?.focus();
    }
}

function salvarIdentidadePerfil(event) {
    event.preventDefault();
    const nome = document.getElementById('profileNameInput')?.value.trim().replace(/\s+/g, ' ') || '';
    const bio = document.getElementById('profileBioInput')?.value.trim() || '';
    if (nome.length < 2) {
        showToast('O nome precisa ter pelo menos 2 caracteres.', true);
        return;
    }
    appData.profileName = nome.slice(0, 32);
    appData.profileBio = bio.slice(0, 190);
    saveAppData();
    aplicarIdentidadePerfil();
    toggleEditorPerfil(false);
    showToast('✓ Perfil atualizado e salvo automaticamente');
}

function alterarFotoPerfil(event) {
    const input = event.target;
    const arquivo = input.files?.[0];
    if (!arquivo) return;
    if (!arquivo.type.startsWith('image/')) {
        showToast('Escolha um arquivo de imagem válido.', true);
        input.value = '';
        return;
    }
    if (arquivo.size > 15 * 1024 * 1024) {
        showToast('A imagem deve ter no máximo 15 MB.', true);
        input.value = '';
        return;
    }

    const enderecoTemporario = URL.createObjectURL(arquivo);
    const imagemOriginal = new Image();
    imagemOriginal.onload = () => {
        const lado = Math.min(imagemOriginal.naturalWidth, imagemOriginal.naturalHeight);
        const origemX = (imagemOriginal.naturalWidth - lado) / 2;
        const origemY = (imagemOriginal.naturalHeight - lado) / 2;
        const canvas = document.createElement('canvas');
        canvas.width = 512;
        canvas.height = 512;
        const contexto = canvas.getContext('2d');
        contexto.drawImage(imagemOriginal, origemX, origemY, lado, lado, 0, 0, 512, 512);
        appData.profilePhoto = canvas.toDataURL('image/jpeg', 0.82);
        saveAppData();
        aplicarIdentidadePerfil();
        showToast('✓ Foto atualizada e salva automaticamente');
        URL.revokeObjectURL(enderecoTemporario);
        input.value = '';
    };
    imagemOriginal.onerror = () => {
        URL.revokeObjectURL(enderecoTemporario);
        input.value = '';
        showToast('Não foi possível abrir essa imagem.', true);
    };
    imagemOriginal.src = enderecoTemporario;
}

function criarDadosGamificacaoDeTeste(xp) {
    const dadosReais = calcularGamificacao();
    const xpTotal = Math.max(0, Math.min(XP_MAXIMO, Math.round(Number(xp) || 0)));
    const nivel = obterNivelAtual(xpTotal);
    return { ...dadosReais, xpTotal, nivel, liga: obterLigaAtual(nivel), titulo: obterTituloAtual(nivel) };
}

function renderGamificacao(animar = false) {
    const dados = xpTesteLocal === null ? calcularGamificacao() : criarDadosGamificacaoDeTeste(xpTesteLocal);
    const temaVisual = obterTemaVisualAtual(dados.nivel);
    const molduraVisual = obterMolduraEquipada(dados, temaVisual);
    const estatisticas = calcularEstatisticasGlobais();
    const proximoNivelXp = dados.nivel < NIVEL_MAXIMO ? LIMITES_NIVEL[dados.nivel + 1] : XP_MAXIMO;
    const inicioNivelXp = LIMITES_NIVEL[dados.nivel];
    const progressoNivel = dados.nivel >= NIVEL_MAXIMO ? 100 : Math.max(0, Math.min(100, ((dados.xpTotal - inicioNivelXp) / (proximoNivelXp - inicioNivelXp)) * 100));
    const etapaXp = window.KingTimerRecovery.nextLevel(dados.xpTotal, inicioNivelXp, proximoNivelXp, dados.nivel >= NIVEL_MAXIMO);
    const colocarTexto = (id, texto) => { const el = document.getElementById(id); if (el) el.textContent = texto; };
    const colocarLargura = (id, valor) => { const el = document.getElementById(id); if (el) el.style.width = `${valor}%`; };

    colocarTexto('nav-xp-level', `Nível ${dados.nivel}`);
    colocarTexto('nav-xp-streak', `🔥 ${dados.sequencia}`);
    colocarLargura('nav-xp-progress', progressoNivel);
    colocarTexto('profileLeagueName', dados.liga.nome);
    colocarTexto('profileLevelTitle', `Lvl ${dados.nivel} • ${temaVisual.titulo}`);
    colocarTexto('profileNextLevel', dados.nivel >= NIVEL_MAXIMO ? 'Nível máximo alcançado' : `Faltam ${formatarNumero(etapaXp.remaining)} XP para o nível ${dados.nivel + 1}`);
    colocarTexto('profileXpText', dados.nivel >= NIVEL_MAXIMO ? 'Evolução completa' : `${formatarNumero(etapaXp.earned)} / ${formatarNumero(etapaXp.needed)} XP`);
    colocarTexto('profileXpPercent', `${etapaXp.percent.toFixed(1).replace('.', ',')}%`);
    colocarTexto('profileXpNote', dados.nivel >= NIVEL_MAXIMO ? 'Você conquistou o nível máximo' : `Progresso do nível ${dados.nivel} para o ${dados.nivel + 1}`);
    colocarLargura('profileXpBar', etapaXp.percent);
    colocarTexto('profileMultiplierBadge', `${dados.multiplicador.toFixed(2).replace(/0$/, '').replace('.', ',')}x • ${nomeDoMultiplicador(dados.sequencia)}`);
    colocarTexto('profileStreak', `${dados.sequencia} ${dados.sequencia === 1 ? 'dia' : 'dias'}`);
    colocarTexto('profileTotalTime', formatShortTime(appData.totalStudySeconds || 0));
    colocarTexto('profileTopics', estatisticas.topicos);
    colocarTexto('profileAccuracy', `${estatisticas.taxa}%`);
    const frame = document.getElementById('profileLeagueFrame');
    const ligaDaMoldura = obterLigaAtual(molduraVisual.nivel);
    if (frame) frame.className = `league-frame ${ligaDaMoldura.classe} rank-frame-${molduraVisual.tema}`;
    aplicarIdentidadePerfil();
    const perfil = document.getElementById('perfil');
    if (perfil) {
        perfil.dataset.league = dados.liga.classe;
        perfil.dataset.rank = molduraVisual.tema;
    }
    document.documentElement.dataset.xpRank = molduraVisual.tema;
    for (const id of ['profileRankEmblem', 'profileFrameEmblem']) {
        const elemento = document.getElementById(id);
        if (elemento) elemento.innerHTML = simboloDaMoldura(molduraVisual);
    }
    window.KingRankArt?.render(document.querySelector('.profile-hero'), molduraVisual, appData.rankVisualMode);
    colocarTexto('profileFrameTag', `NÍVEL ${dados.nivel}`);
    colocarTexto('profileEvolutionCaption', `${molduraVisual.titulo} • ${molduraVisual.legenda}`);
    const referencias = document.getElementById('profileReferenceStrip');
    if (referencias) referencias.innerHTML = molduraVisual.referencias.map((referencia, indice) => `<span><b>${String(indice + 1).padStart(2, '0')}</b>${referencia}</span>`).join('');
    renderizarGaleriaMolduras(dados, molduraVisual);
    const status = document.getElementById('xpTestStatus');
    if (status) {
        status.textContent = xpTesteLocal === null ? 'XP real' : `Teste: ${formatarNumero(dados.xpTotal)} XP`;
        status.classList.toggle('is-testing', xpTesteLocal !== null);
    }
    document.querySelectorAll('.xp-test-milestone').forEach(botao => botao.classList.toggle('active', Number(botao.dataset.xp) === dados.xpTotal && xpTesteLocal !== null));
    if (animar) {
        const hero = document.querySelector('.profile-hero');
        if (hero) {
            hero.classList.remove('xp-test-flash');
            void hero.offsetWidth;
            hero.classList.add('xp-test-flash');
        }
    }
}

function sincronizarXpTeste(valor) {
    const xp = Math.max(0, Math.min(XP_MAXIMO, Math.round(Number(valor) || 0)));
    const range = document.getElementById('xpTestRange');
    const input = document.getElementById('xpTestInput');
    if (range && document.activeElement !== range) range.value = xp;
    if (input && document.activeElement !== input) input.value = xp;
}

function sincronizarCadeadoXp() {
    const painel = document.getElementById('xpTestPanel');
    const cadeado = document.getElementById('xpLabLock');
    const conteudo = document.getElementById('xpTestContent');
    if (!painel || !cadeado || !conteudo) return;
    painel.classList.toggle('is-locked', !XP_LAB_ATIVO);
    painel.classList.toggle('is-unlocked', XP_LAB_ATIVO);
    cadeado.hidden = XP_LAB_ATIVO;
    conteudo.hidden = !XP_LAB_ATIVO;
    document.documentElement.dataset.xpLab = String(XP_LAB_ATIVO);
}

function abrirCadeadoXp() {
    const form = document.getElementById('xpLabUnlockForm');
    const botao = document.getElementById('xpLabLockButton');
    if (!form || !botao) return;
    const abrir = form.hidden;
    form.hidden = !abrir;
    botao.setAttribute('aria-expanded', String(abrir));
    if (abrir) setTimeout(() => document.getElementById('xpLabPassword')?.focus(), 50);
}

function desbloquearLaboratorioXp(event) {
    event?.preventDefault();
    const campo = document.getElementById('xpLabPassword');
    if (campo?.value !== '1303') {
        campo?.classList.remove('is-invalid');
        void campo?.offsetWidth;
        campo?.classList.add('is-invalid');
        if (campo) { campo.value = ''; campo.focus(); }
        showToast('🔒 Senha incorreta', true);
        return;
    }
    XP_LAB_ATIVO = true;
    sessionStorage.setItem(XP_LAB_SESSION_KEY, 'true');
    if (campo) campo.value = '';
    sincronizarCadeadoXp();
    renderizarAtalhosXpTeste();
    showToast('🔓 Laboratório de XP liberado');
}

function bloquearLaboratorioXp() {
    sairDoModoTesteXp();
    XP_LAB_ATIVO = false;
    sessionStorage.removeItem(XP_LAB_SESSION_KEY);
    const form = document.getElementById('xpLabUnlockForm');
    const botao = document.getElementById('xpLabLockButton');
    if (form) form.hidden = true;
    if (botao) botao.setAttribute('aria-expanded', 'false');
    sincronizarCadeadoXp();
    showToast('🔒 Laboratório fechado; XP real restaurado');
}

// Expõe apenas os controles chamados diretamente pelo HTML.
window.abrirCadeadoXp = abrirCadeadoXp;
window.desbloquearLaboratorioXp = desbloquearLaboratorioXp;
window.bloquearLaboratorioXp = bloquearLaboratorioXp;

function visualizarXpTeste(valor) {
    if (valor !== undefined) sincronizarXpTeste(valor);
    const input = document.getElementById('xpTestInput');
    xpTesteLocal = Math.max(0, Math.min(XP_MAXIMO, Math.round(Number(input?.value) || 0)));
    sincronizarXpTeste(xpTesteLocal);
    renderGamificacao(true);
}

function sairDoModoTesteXp() {
    xpTesteLocal = null;
    const dados = calcularGamificacao();
    sincronizarXpTeste(dados.xpTotal);
    renderGamificacao(true);
}

function renderizarAtalhosXpTeste() {
    const container = document.getElementById('xpTestMilestones');
    if (!container) return;
    const range = document.getElementById('xpTestRange');
    const input = document.getElementById('xpTestInput');
    if (range) range.max = XP_MAXIMO;
    if (input) input.max = XP_MAXIMO;
    container.innerHTML = obterTrilhaVisualAtual().map(marco => `<button type="button" class="xp-test-milestone" data-xp="${marco.xp}" onclick="visualizarXpTeste(${marco.xp})">Lvl ${marco.nivel} · ${marco.titulo}</button>`).join('');
    sincronizarXpTeste(xpTesteLocal === null ? calcularGamificacao().xpTotal : xpTesteLocal);
}

function sincronizarModoPatente() {
    const modoAura = appData.rankVisualMode === 'aura';
    document.documentElement.dataset.rankMode = modoAura ? 'aura' : 'militar';
    const botao = document.getElementById('rankVisualModeToggle');
    if (!botao) return;
    botao.classList.toggle('is-aura', modoAura);
    botao.setAttribute('aria-pressed', String(modoAura));
    botao.innerHTML = modoAura ? '<span aria-hidden="true">✦</span> Modo Aura' : '<span aria-hidden="true">▣</span> Modo Militar';
}

function alternarModoPatente() {
    appData.rankVisualMode = appData.rankVisualMode === 'aura' ? 'militar' : 'aura';
    sincronizarModoPatente();
    saveAppData();
    renderizarAtalhosXpTeste();
    renderGamificacao(true);
    showToast(appData.rankVisualMode === 'aura' ? '✦ Modo Aura ativado' : '▣ Modo Militar ativado');
}

function updateDashboardStats() {
    const tempoSemana = appData.weeklyChart.reduce((total, segundos) => total + (segundos || 0), 0);
    if(document.getElementById('top-time')) document.getElementById('top-time').textContent = formatShortTime(tempoSemana);
    
    let totalAcertos = 0, totalErros = 0, totalQuestoes = 0;

    appData.cycleItems.forEach(mat => {
        if(mat.acertos === undefined) mat.acertos = 0;
        if(mat.erros === undefined) mat.erros = 0;
        totalAcertos += mat.acertos;
        totalErros += mat.erros;
        totalQuestoes += (mat.acertos + mat.erros);
    });

    appData.simuladosItems.forEach(sim => {
        let sAcertos = sim.acertos || 0;
        let sErros = sim.erros || 0;
        totalAcertos += sAcertos;
        totalErros += sErros;
        totalQuestoes += (sim.total || (sAcertos + sErros > 0 ? sAcertos + sErros : 1));
    });

    if(document.getElementById('top-acertos')) document.getElementById('top-acertos').textContent = `${totalAcertos} Acertos`;
    if(document.getElementById('top-erros')) document.getElementById('top-erros').textContent = `${totalErros} Erros`;
    if(document.getElementById('top-perc')) document.getElementById('top-perc').textContent = totalQuestoes > 0 ? `${Math.round((totalAcertos/totalQuestoes)*100)}%` : '0%';
    const chart = document.getElementById('weeklyChart');
    if(chart) {
        const dias = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];
        const maxSec = Math.max(...appData.weeklyChart, 3600);
        const media = tempoSemana / 7;
        const hoje = (new Date().getDay() + 6) % 7;
        const colunas = dias.map((lbl, i) => {
            const segundos = Number(appData.weeklyChart[i]) || 0;
            const pct = segundos ? Math.max(8, Math.min(100, (segundos / maxSec) * 100)) : 3;
            const estado = segundos ? 'com-estudo' : 'sem-estudo';
            return `<button type="button" class="chart-day ${estado} ${i === hoje ? 'hoje' : ''}" aria-label="${lbl}: ${formatShortTime(segundos)} estudados">
                <span class="chart-day-value">${formatShortTime(segundos)}</span>
                <span class="chart-bar-track"><span class="chart-bar-fill" style="--bar-height:${pct}%"></span></span>
                <span class="chart-day-label">${lbl}${i === hoje ? '<small>hoje</small>' : ''}</span>
                <span class="chart-day-popover"><strong>${lbl}</strong><small>${segundos ? `${formatShortTime(segundos)} de foco` : 'Nenhum estudo registrado'}</small></span>
            </button>`;
        }).join('');
        chart.innerHTML = `<div class="chart-summary"><span><small>Total semanal</small><strong>${formatShortTime(tempoSemana)}</strong></span><span><small>Média diária</small><strong>${formatShortTime(Math.round(media))}</strong></span></div><div class="chart-plot" style="--average-pct:${Math.min(100, (media / maxSec) * 100)}%"><span class="chart-average-line"><i>Média</i></span>${colunas}</div>`;
    }
    renderStreak();
    atualizarLinhaMediaSedilhadDynamica();
    renderDashboardRevisoes();
    renderGamificacao();
}

function renderStreak() {
    const streakRow = document.getElementById('streak-row');
    if(!streakRow) return;
    const diasEstudados = obterDiasDeEstudo();
    const hojeISO = dataLocalISO();
    let html = '';
    for(let i = 29; i >= 0; i--) {
        const d = new Date();
        d.setHours(12, 0, 0, 0);
        d.setDate(d.getDate() - i);
        const iso = dataLocalISO(d);
        const estudou = diasEstudados.has(iso);
        const rotulo = d.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' });
        let classe = 'fail', marca = '×', situacao = 'Não houve estudo';
        if (d.getDay() === 0) {
            classe = 'ignored'; marca = '•'; situacao = 'Domingo — descanso da sequência';
        } else if (d.getDay() === 6 && !estudou) {
            classe = 'optional'; marca = '○'; situacao = 'Sábado opcional — não quebra a sequência';
        } else if (estudou) {
            classe = 'ok'; marca = '✓'; situacao = 'Estudo concluído';
        } else if (iso === hojeISO) {
            classe = 'pending'; marca = '·'; situacao = 'Hoje — ainda dá tempo de estudar';
        }
        html += `<button type="button" class="streak-dot ${classe}" aria-label="${rotulo}: ${situacao}" data-streak-date="${rotulo}" data-streak-status="${situacao}"><span class="streak-mark">${marca}</span></button>`;
    }
    streakRow.innerHTML = html;
    configurarTooltipsConstancia(streakRow);
    const sequencia = calcularSequenciaAtual();
    document.getElementById('constancia-texto').innerHTML = `Constância atual: <b>${sequencia} ${sequencia === 1 ? 'dia' : 'dias'}</b>. Domingo não conta e sábado é opcional.`;
}

function configurarTooltipsConstancia(streakRow) {
    let tooltip = document.getElementById('streakTooltip');
    if (!tooltip) {
        tooltip = document.createElement('div');
        tooltip.id = 'streakTooltip';
        tooltip.className = 'streak-tooltip-fixed';
        tooltip.setAttribute('role', 'status');
        document.body.appendChild(tooltip);
    }
    let temporizador;
    const ocultar = () => {
        clearTimeout(temporizador);
        tooltip.classList.remove('show');
    };
    const mostrar = botao => {
        clearTimeout(temporizador);
        tooltip.innerHTML = `<strong>${botao.dataset.streakDate}</strong><small>${botao.dataset.streakStatus}</small>`;
        tooltip.classList.add('show');
        const area = botao.getBoundingClientRect();
        const largura = tooltip.offsetWidth;
        const esquerda = Math.max(12, Math.min(window.innerWidth - largura - 12, area.left + (area.width / 2) - (largura / 2)));
        tooltip.style.left = `${esquerda}px`;
        tooltip.style.top = `${Math.max(12, area.top - tooltip.offsetHeight - 12)}px`;
    };
    streakRow.querySelectorAll('.streak-dot').forEach(botao => {
        botao.addEventListener('pointerenter', () => mostrar(botao));
        botao.addEventListener('pointerleave', () => { if (document.activeElement !== botao) ocultar(); });
        botao.addEventListener('focus', () => mostrar(botao));
        botao.addEventListener('blur', ocultar);
        botao.addEventListener('click', () => {
            mostrar(botao);
            temporizador = setTimeout(ocultar, 2600);
        });
    });
}

function atualizarLinhaMediaSedilhadDynamica() {
    const container = document.getElementById('weeklyChart');
    if(!container) return;

    const totalSemana = appData.weeklyChart.reduce((acc, curr) => acc + curr, 0);
    const media = totalSemana / 7;
    const maxSec = Math.max(...appData.weeklyChart, 3600);
    const pct = maxSec > 0 ? (media / maxSec) * 100 : 0;

    container.style.setProperty('--average-pct', `${Math.min(100, pct)}%`);
}

let timerInterval, isRunning = false, currentMode = 'estudo', currentSeconds = 0, descansoTempoAtual = 5;
let lastTickTime = 0;
let alarmTriggered = false;
let lastTimerCloudSave = 0;
const alarmAudio = document.getElementById('alarmAudio'), stopAlarmBtn = document.getElementById('stopAlarmBtn'), timeDisplay = document.getElementById('timeDisplay'), playPauseBtn = document.getElementById('playPauseBtn'), progressRing = document.getElementById('progressRing'), circ = 2 * Math.PI * 135;
if(progressRing) progressRing.style.strokeDasharray = circ;

const getTargetSeconds = () => currentMode === 'descanso' ? descansoTempoAtual * 60 : ((parseInt(document.getElementById('inputHours').value) || 0) * 3600) + ((parseInt(document.getElementById('inputMinutes').value) || 0) * 60) + (parseInt(document.getElementById('inputSeconds').value) || 0);
const sincronizarTempo = () => { if (!isRunning) updateProgress(); if (timerPersistenceReady) persistTimerCheckpoint(); };

function captureTimerState() {
    return { mode: currentMode, seconds: currentSeconds, running: isRunning,
        restMinutes: descansoTempoAtual, subjectId: document.getElementById('activeSubjectSelect').value,
        target: ['inputHours', 'inputMinutes', 'inputSeconds'].map(id => Math.max(0, Number(document.getElementById(id).value) || 0)) };
}

function persistTimerCheckpoint() {
    if (!timerPersistenceReady) return;
    const status = document.getElementById('timerSaveStatus');
    try {
        localStorage.setItem(window.KingTimerRecovery.KEY, JSON.stringify(window.KingTimerRecovery.capture(appData, captureTimerState())));
        if (status) { status.textContent = isRunning ? '● Tempo protegido automaticamente neste dispositivo' : '● Sessão protegida · você pode fechar e voltar'; status.dataset.state = 'saved'; }
    } catch {
        if (status) { status.textContent = 'Não foi possível salvar neste navegador. Evite fechar a aba e exporte seu progresso.'; status.dataset.state = 'error'; }
    }
}

function restoreTimerSession() {
    const saved = appData.timerState;
    if (window.KingTimerRecovery.validState(saved)) {
        currentMode = saved.mode;
        currentSeconds = Math.floor(saved.seconds);
        descansoTempoAtual = saved.restMinutes;
        ['inputHours', 'inputMinutes', 'inputSeconds'].forEach((id, index) => document.getElementById(id).value = saved.target[index]);
        const subject = document.getElementById('activeSubjectSelect');
        subject.value = appData.cycleItems.some(item => String(item.id) === saved.subjectId) ? saved.subjectId : '';
        atualizarSeletorDeMaterias();
        const option = [...document.querySelectorAll('.custom-option')].find(option => option.dataset.value === subject.value);
        if (option) document.querySelector('#customSelectTrigger span').innerHTML = option.innerHTML;
        document.getElementById('btn-estudo').classList.toggle('active', currentMode === 'estudo');
        document.getElementById('btn-descanso').classList.toggle('active', currentMode === 'descanso');
        document.getElementById('manualTimeGroup').style.display = currentMode === 'estudo' ? 'flex' : 'none';
        document.getElementById('subjectSelectorArea').style.display = currentMode === 'estudo' ? 'flex' : 'none';
        document.getElementById('descansoPresetGroup').style.display = currentMode === 'estudo' ? 'none' : 'flex';
        document.getElementById('labelConfig').textContent = currentMode === 'estudo' ? 'Tocar alarme após' : 'Tempo de Descanso';
        [5, 10].forEach(value => document.getElementById(`btn-descanso-${value}`).classList.toggle('primary', value === descansoTempoAtual));
        if (currentSeconds > 0) showToast('⏱ Sessão recuperada e pausada. Aperte ▶ para continuar.');
    }
    isRunning = false;
    timerPersistenceReady = true;
    updateProgress();
    toggleBotaoStopHistorico();
    persistTimerCheckpoint();
    if (appData.pendingStudySession && Number(appData.pendingStudySession.seconds) >= 5) setTimeout(abrirRegistroSessaoPendente, 350);
}

function updateProgress() {
    if(!timeDisplay) return;
    if (currentSeconds < 0) currentSeconds = 0;
    timeDisplay.textContent = formatHistoryTime(currentSeconds);
    const target = getTargetSeconds();
    let pct = target > 0 ? (currentMode === 'estudo' ? currentSeconds / target : (target - currentSeconds) / target) : (currentMode === 'estudo' ? 0 : 1);
    if(progressRing) progressRing.style.strokeDashoffset = currentMode === 'estudo' ? circ - (Math.max(0, Math.min(1, pct)) * circ) : (circ - (Math.max(0, Math.min(1, pct)) * circ));
    
    if (isRunning) {
        const icone = currentMode === 'estudo' ? '⏱️' : '☕';
        document.title = `${icone} ${formatHistoryTime(currentSeconds)} - King Master`;
    } else {
        document.title = "King Master";
    }
}

function toggleBotaoStopHistorico() {
    const show = currentMode === 'estudo' && currentSeconds > 0;
    ['btnStopHistory', 'endSessionBtnDash'].forEach(id => { if(document.getElementById(id)) document.getElementById(id).style.display = show ? 'flex' : 'none'; });
    if(document.getElementById('btnPauseHistory')) { document.getElementById('btnPauseHistory').style.display = show ? 'flex' : 'none'; document.getElementById('btnPauseHistory').innerHTML = isRunning ? '<span style="font-size:1.2rem;">⏸</span> Pausar' : '<span style="font-size:1.2rem;">▶</span> Retomar'; }
}

function dataFuturaRegistro(dias = 1) {
    const data = new Date();
    data.setHours(12, 0, 0, 0);
    data.setDate(data.getDate() + Math.max(1, Number(dias) || 1));
    return dataLocalISO(data);
}

function criarRevisaoAutomaticaRegistro(materia, assunto, dias = 1, origem = 'sessao-automatica') {
    const materiaSegura = String(materia || 'Estudo Livre').trim();
    const assuntoSeguro = String(assunto || '').trim();
    if (!assuntoSeguro) return false;
    const dataAlvo = dataFuturaRegistro(dias);
    const duplicada = appData.revisoesItems.some(item => item.status !== 'revisado'
        && normalizarRevisaoTexto(item.materia) === normalizarRevisaoTexto(materiaSegura)
        && normalizarRevisaoTexto(item.assunto) === normalizarRevisaoTexto(assuntoSeguro)
        && item.dataAlvo === dataAlvo);
    if (duplicada) return false;
    appData.revisoesItems.push({ id: Date.now() + Math.floor(Math.random() * 1000), materia: materiaSegura, assunto: assuntoSeguro,
        dataEstudo: dataLocalISO(new Date()), dataAlvo, origem, tags: [], atualizadoEm: Date.now(), status: 'pendente', criadoEm: Date.now() });
    return true;
}

function atualizarTopicoAposEstudo(materia, assunto) {
    if (!materia || !assunto) return null;
    if (!Array.isArray(materia.topicos)) materia.topicos = [];
    let topico = materia.topicos.find(item => normalizarRevisaoTexto(item.nome) === normalizarRevisaoTexto(assunto));
    if (!topico) {
        topico = { nome: String(assunto).trim().slice(0, 100), concluido: true };
        materia.topicos.push(topico);
    }
    topico.concluido = true;
    topico.ultimoEstudoEm = Date.now();
    topico.vezesEstudado = (Number(topico.vezesEstudado) || 0) + 1;
    return topico;
}

function criarItemHistoricoRegistro({ segundos = 0, materia = 'Estudo Livre', assunto = '', cor = '#515154', tipo = 'Livre', comentario = '', atividade = 'estudo', registroRapido = false }) {
    const d = new Date();
    return { id: Date.now() + Math.floor(Math.random() * 1000), dataISO: dataLocalISO(d), dataChave: `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`,
        diaNum: d.getDate().toString().padStart(2, '0'), mesAno: `${['JAN', 'FEV', 'MAR', 'ABR', 'MAI', 'JUN', 'JUL', 'AGO', 'SET', 'OUT', 'NOV', 'DEZ'][d.getMonth()]}/${d.getFullYear().toString().slice(-2)}`,
        diaStr: ['DOM', 'SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SÁB'][d.getDay()], materia, assunto, tempoSegundos: Number(segundos) || 0, cor, tipo, comentario, atividade, registroRapido };
}

function registrarSessao(segundos, detalhes = null) {
    if(segundos < 5) return;
    const activeSubjId = detalhes?.subjectId ?? document.getElementById('activeSubjectSelect').value;
    let nome = 'Estudo Livre', cor = '#515154', tipo = 'Livre', materia = null;
    if (activeSubjId) materia = appData.cycleItems.find(item => String(item.id) === String(activeSubjId)) || null;
    if (materia) {
        nome = materia.subject; cor = materia.color; tipo = materia.type || 'Teórica';
        materia.executedMin = (materia.executedMin || 0) + (segundos / 60);
    } else cor = ['#34c759', '#007aff', '#ff9500', '#ff3b30', '#af52de'][Math.floor(Math.random() * 5)];

    const assunto = String(detalhes?.assunto || '').trim();
    const comentario = String(detalhes?.comentario || '').trim();
    const atividade = ['estudo', 'simulado', 'redacao'].includes(detalhes?.atividade) ? detalhes.atividade : 'estudo';
    appData.historyItems.push(criarItemHistoricoRegistro({ segundos, materia: nome, assunto, cor, tipo, comentario, atividade }));
    if (materia && assunto) atualizarTopicoAposEstudo(materia, assunto);
    if (detalhes?.autoReview) criarRevisaoAutomaticaRegistro(nome, assunto, detalhes.reviewDelayDays, `sessao-${atividade}`);

    if (atividade === 'simulado' && detalhes?.simulado) {
        const sim = detalhes.simulado;
        appData.simuladosItems.push({ id: Date.now() + 2, title: sim.title || `${nome} — sessão`, date: dataLocalISO(new Date()),
            tempoMin: Math.max(1, Math.round(segundos / 60)), area: sim.area || 'Geral', total: sim.total, acertos: sim.acertos, erros: sim.erros, attachment: '' });
    }
    if (atividade === 'redacao' && detalhes?.redacao) {
        const red = detalhes.redacao;
        appData.redacaoItems.push({ id: Date.now() + 3, theme: red.theme, date: dataLocalISO(new Date()), c1: red.scores[0], c2: red.scores[1], c3: red.scores[2], c4: red.scores[3], c5: red.scores[4], attachment: '', aguardandoCorrecao: red.scores.every(valor => valor === 0) });
    }

    currentSeconds = 0; // Histórico e rascunho são salvos na mesma escrita, sem duplicar na recuperação.
    appData.pendingStudySession = null;
    saveAppData(); renderizarCiclo(); if(document.getElementById('historico').classList.contains('active')) renderizarHistorico(); 
    if (typeof renderizarRevisoes === 'function') renderizarRevisoes();
    if (atividade === 'simulado' && typeof renderizarSimulados === 'function') renderizarSimulados();
    if (atividade === 'redacao' && typeof renderizarRedacoes === 'function') renderizarRedacoes();
    showToast(detalhes?.autoReview ? '✓ Sessão salva e revisão agendada.' : '✓ Sessão salva no histórico.');
    mostrarFraseMotivacional();
}

function atualizarTopicosRegistroSessao() {
    const select = document.getElementById('sessionSubject');
    const datalist = document.getElementById('sessionTopicOptions');
    if (!select || !datalist) return;
    const materia = appData.cycleItems.find(item => String(item.id) === String(select.value));
    datalist.innerHTML = (materia?.topicos || []).map(topico => `<option value="${escaparRevisaoHtml(topico.nome)}"></option>`).join('');
}

function atualizarTipoRegistroSessao() {
    const tipo = document.querySelector('input[name="sessionKind"]:checked')?.value || 'estudo';
    const simulado = document.getElementById('sessionSimuladoFields');
    const redacao = document.getElementById('sessionRedacaoFields');
    simulado.hidden = tipo !== 'simulado';
    redacao.hidden = tipo !== 'redacao';
    document.getElementById('sessionSimTitle').required = tipo === 'simulado';
    document.getElementById('sessionSimTotal').required = tipo === 'simulado';
    document.getElementById('sessionEssayTheme').required = tipo === 'redacao';
}

function atualizarRevisaoRegistroSessao() {
    const checkbox = document.getElementById('sessionAutoReview');
    const prazo = document.getElementById('sessionReviewDelay');
    if (prazo) prazo.disabled = !checkbox?.checked;
}

function abrirRegistroSessaoPendente() {
    const pendente = appData.pendingStudySession;
    if (!pendente || Number(pendente.seconds) < 5) return;
    const form = document.getElementById('sessionCompleteForm');
    if (!form || typeof form.reset !== 'function') return;
    form.reset();
    document.getElementById('sessionCompleteTime').textContent = formatHistoryTime(pendente.seconds);
    const select = document.getElementById('sessionSubject');
    select.innerHTML = '<option value="">Estudo Livre</option>' + appData.cycleItems.map(item => `<option value="${item.id}">${escaparRevisaoHtml(item.subject)}</option>`).join('');
    select.value = appData.cycleItems.some(item => String(item.id) === String(pendente.subjectId)) ? String(pendente.subjectId) : '';
    document.getElementById('sessionAutoReview').checked = appData.studyLogging.autoReview !== false;
    document.getElementById('sessionReviewDelay').value = String(appData.studyLogging.reviewDelayDays || 1);
    atualizarTopicosRegistroSessao(); atualizarTipoRegistroSessao(); atualizarRevisaoRegistroSessao();
    document.getElementById('sessionCompleteModal').classList.add('active');
    setTimeout(() => document.getElementById('sessionTopic')?.focus(), 120);
}

function prepararRegistroSessao(segundos = currentSeconds, origem = 'manual') {
    if (Number(segundos) < 5) return false;
    clearInterval(timerInterval); isRunning = false; playPauseBtn.textContent = '▶';
    appData.pendingStudySession = { seconds: Math.floor(segundos), subjectId: document.getElementById('activeSubjectSelect').value, origem, createdAt: Date.now() };
    saveAppData(); updateProgress(); toggleBotaoStopHistorico(); abrirRegistroSessaoPendente();
    return true;
}

function adiarRegistroSessao() {
    fecharModal('sessionCompleteModal');
    showToast('A sessão continua protegida. Você pode retomá-la ou registrá-la depois.');
}

function salvarRegistroSessao(event) {
    event.preventDefault();
    const pendente = appData.pendingStudySession;
    if (!pendente || Number(pendente.seconds) < 5) return fecharModal('sessionCompleteModal');
    const atividade = document.querySelector('input[name="sessionKind"]:checked')?.value || 'estudo';
    const assunto = document.getElementById('sessionTopic').value.trim();
    const comentario = document.getElementById('sessionNotes').value.trim();
    if (!assunto || !comentario) return showToast('Preencha o assunto e o resumo da sessão.', true);
    const detalhes = { subjectId: document.getElementById('sessionSubject').value, assunto, comentario, atividade,
        autoReview: document.getElementById('sessionAutoReview').checked, reviewDelayDays: Number(document.getElementById('sessionReviewDelay').value) || 1 };
    if (atividade === 'simulado') {
        const total = Math.max(1, Number(document.getElementById('sessionSimTotal').value) || 1);
        const acertos = Math.max(0, Number(document.getElementById('sessionSimHits').value) || 0);
        const erros = Math.max(0, Number(document.getElementById('sessionSimErrors').value) || 0);
        if (acertos + erros > total) return showToast('Acertos e erros não podem ultrapassar o total de questões.', true);
        detalhes.simulado = { title: document.getElementById('sessionSimTitle').value.trim(), area: document.getElementById('sessionSimArea').value, total, acertos, erros };
    }
    if (atividade === 'redacao') {
        detalhes.redacao = { theme: document.getElementById('sessionEssayTheme').value.trim(), scores: [...document.querySelectorAll('.session-essay-score')].map(input => Math.max(0, Math.min(200, Number(input.value) || 0))) };
    }
    fecharModal('sessionCompleteModal'); stopAlarm(); registrarSessao(Number(pendente.seconds), detalhes); updateProgress(); toggleBotaoStopHistorico(); document.title = 'King Master';
}

function toggleTimer() {
    if (isRunning) { 
        tickTimer();
        clearInterval(timerInterval); 
        playPauseBtn.textContent = '▶'; 
        isRunning = false; 
        saveAppData(); 
        updateProgress(); 
    } else {
        if (appData.pendingStudySession) appData.pendingStudySession = null;
        let target = getTargetSeconds();
        if (currentMode === 'descanso' && currentSeconds <= 0) currentSeconds = target;
        if (target <= 0 && currentMode === 'descanso') return showToast('⚠️ Defina um tempo maior que zero.', true);
        
        lastTickTime = Date.now(); 
        
        alarmTriggered = (target > 0 && currentSeconds >= target); 
        
        timerInterval = setInterval(tickTimer, 500);
        playPauseBtn.innerHTML = '&#10074;&#10074;';
        isRunning = true;
        lastTimerCloudSave = Date.now();
        saveAppData();
        updateProgress();
    }
    toggleBotaoStopHistorico();
}

function tickTimer() {
            if (!isRunning) return;
            let now = Date.now();
            let deltaSecs = Math.floor((now - lastTickTime) / 1000);
            
            if (deltaSecs >= 1) {
                lastTickTime = lastTickTime + (deltaSecs * 1000); 
                const target = getTargetSeconds();
                
                if (currentMode === 'estudo') {
                    currentSeconds += deltaSecs; 
                    window.KingTimerRecovery.creditStudy(appData, lastTickTime - deltaSecs * 1000, lastTickTime);
                    
                    updateProgress();
                    
                    if (target > 0 && currentSeconds >= target && !alarmTriggered) { 
                        alarmTriggered = true; 
                        document.title = "⏰ META ATINGIDA! - King Master";
                        clearInterval(timerInterval);
                        isRunning = false;
                        playPauseBtn.textContent = '▶';
                        triggerAlarm(); 
                        showToast('🎯 Meta atingida! Registre o que você estudou.');
                        setTimeout(() => { stopAlarm(); prepararRegistroSessao(currentSeconds, 'meta'); }, 1600);
                    }
                } else { 
                    currentSeconds -= deltaSecs;
                    if (currentSeconds <= 0) { 
                        currentSeconds = 0; 
                        clearInterval(timerInterval); 
                        isRunning = false; 
                        playPauseBtn.textContent = '▶'; 
                        document.title = "⏰ DE VOLTA À MISSÃO! - King Master";
                        updateProgress(); 
                        triggerAlarm(); 
                        toggleBotaoStopHistorico(); 
                    } else {
                        updateProgress();
                    }
                }
                toggleBotaoStopHistorico();
                persistTimerCheckpoint();
                if (now - lastTimerCloudSave >= 15000) {
                    lastTimerCloudSave = now;
                    try { saveAppData(); } catch { /* O checkpoint pequeno continua preservando o relógio. */ }
                }
            }
}

// pagehide também cobre navegação e o cache de voltar/avançar, sem impedir o fechamento.
window.addEventListener('pagehide', () => {
    if (!timerPersistenceReady) return;
    tickTimer();
    clearInterval(timerInterval);
    isRunning = false;
    playPauseBtn.textContent = '▶';
    updateProgress();
    toggleBotaoStopHistorico();
    try { saveAppData(); } catch { persistTimerCheckpoint(); }
});
document.addEventListener('visibilitychange', () => {
    if (!timerPersistenceReady) return;
    tickTimer();
    if (document.hidden) { try { saveAppData(); } catch { persistTimerCheckpoint(); } }
});

function triggerAlarm() { 
    saveAppData(); 
    if(!alarmAudio) return;
    alarmAudio.src = "https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3"; 
    alarmAudio.loop = true; 
    alarmAudio.currentTime = 0; 
    alarmAudio.play().catch(e => console.log("Áudio bloqueado pelo navegador. Interação manual necessária.")); 
    stopAlarmBtn.style.display = 'block'; 
}

function stopAlarm() { 
    if(!alarmAudio) return;
    alarmAudio.pause(); 
    alarmAudio.currentTime = 0; 
    alarmAudio.loop = false; 
    stopAlarmBtn.style.display = 'none'; 
}

function abrirConfirmReset() { document.getElementById('confirmResetModal').classList.add('active'); }
function executarResetTimer() { fecharModal('confirmResetModal'); clearInterval(timerInterval); isRunning = false; alarmTriggered = false; playPauseBtn.textContent = '▶'; currentSeconds = currentMode === 'estudo' ? 0 : getTargetSeconds(); saveAppData(); updateProgress(); toggleBotaoStopHistorico(); document.title = "King Master"; }
function encerrarSessaoDashboard() { tickTimer(); if (currentSeconds >= 5) prepararRegistroSessao(currentSeconds, 'manual'); else { showToast('⚠️ Sessão muito curta (mínimo 5s).', true); clearInterval(timerInterval); isRunning = false; alarmTriggered = false; playPauseBtn.textContent = '▶'; currentSeconds = 0; saveAppData(); updateProgress(); toggleBotaoStopHistorico(); document.title = "King Master"; } }
function setDescansoTime(mins) { descansoTempoAtual = mins; document.getElementById('btn-descanso-5').classList.remove('primary'); document.getElementById('btn-descanso-10').classList.remove('primary'); document.getElementById(`btn-descanso-${mins}`).classList.add('primary'); executarResetTimer(); }

function setMode(mode) {
    tickTimer();
    if (mode !== currentMode && currentMode === 'estudo' && currentSeconds >= 5) { prepararRegistroSessao(currentSeconds, 'troca-modo'); return; }
    currentMode = mode;
    alarmTriggered = false;
    document.getElementById('btn-estudo').classList.remove('active'); document.getElementById('btn-descanso').classList.remove('active'); document.getElementById(`btn-${mode}`).classList.add('active');
    document.getElementById('manualTimeGroup').style.display = mode === 'estudo' ? 'flex' : 'none';
    document.getElementById('subjectSelectorArea').style.display = mode === 'estudo' ? 'flex' : 'none';
    document.getElementById('descansoPresetGroup').style.display = mode === 'estudo' ? 'none' : 'flex';
    document.getElementById('labelConfig').textContent = mode === 'estudo' ? 'Tocar alarme após' : 'Tempo de Descanso';
    if(progressRing) progressRing.style.stroke = mode === 'estudo' ? 'var(--accent-color)' : '#ff4757'; 
    clearInterval(timerInterval); isRunning = false; playPauseBtn.textContent = '▶'; currentSeconds = mode === 'estudo' ? 0 : getTargetSeconds(); updateProgress(); toggleBotaoStopHistorico();
    saveAppData();
}

function atualizarSeletorDeMaterias() {
    const opts = document.getElementById('customOptions'), trig = document.querySelector('#customSelectTrigger span'), hid = document.getElementById('activeSubjectSelect');
    if(!opts || !trig || !hid) return;
    
    let htmlOpts = `<div class="custom-option ${hid.value === '' ? 'selected' : ''}" data-value="">
                        <span class="color-dot" style="background:#515154;"></span>Estudo Livre
                    </div>`;
    
    if(appData.cycleItems.length > 0) { 
        htmlOpts += appData.cycleItems.map(i => `<div class="custom-option ${hid.value == i.id ? 'selected' : ''}" data-value="${i.id}"><span class="color-dot" style="background:${i.color};"></span>${i.subject}</div>`).join('');
    }
    
    opts.innerHTML = htmlOpts;
    
    document.querySelectorAll('.custom-option').forEach(opt => opt.addEventListener('click', function() { 
        if(this.dataset.value === undefined) return; 
        hid.value = this.dataset.value; 
        persistTimerCheckpoint();
        trig.innerHTML = this.innerHTML; 
        document.querySelector('.custom-select-wrapper').classList.remove('open'); 
        atualizarSeletorDeMaterias(); 
    }));
    
    if(hid.value) { 
        const sel = appData.cycleItems.find(i => i.id == hid.value); 
        if(sel) trig.innerHTML = `<span class="color-dot" style="background:${sel.color};"></span>${sel.subject}`; 
    } else {
        trig.innerHTML = `<span class="color-dot" style="background:#515154;"></span>Estudo Livre`;
    }
}

function toggleCustomSelect() { const wrap = document.querySelector('.custom-select-wrapper'); if(wrap) wrap.classList.toggle('open'); }
document.addEventListener('click', e => { if (!e.target.closest('.custom-select-wrapper')) document.querySelector('.custom-select-wrapper')?.classList.remove('open'); });
function limparSelecaoPresets() { document.querySelectorAll('.color-preset').forEach(el => el.classList.remove('selected')); }
function selecionarCorPreset(el, cor) { limparSelecaoPresets(); el.classList.add('selected'); document.getElementById('cycleColor').value = cor; }

function abrirModalCiclo() { 
    const modal = document.getElementById('cycleModal');
    const form = document.getElementById('formAddCycle');
    if (!modal || !form) return showToast('Não foi possível abrir o cadastro de matéria.', true);
    form.reset();
    document.getElementById('cycleModalTitle').textContent = "Adicionar Matéria";
    document.getElementById('cycleEditId').value = "";
    document.getElementById('cycleColor').value = '#007aff';
    const firstPreset = document.querySelector('.color-preset');
    limparSelecaoPresets();
    if(firstPreset) firstPreset.classList.add('selected');
    modal.classList.add('active');
    setTimeout(() => document.getElementById('cycleSubject')?.focus(), 50);
}

function editarMateriaCiclo(id) {
    const mat = appData.cycleItems.find(m => m.id === id);
    if (!mat) return;
    document.getElementById('cycleModalTitle').textContent = "Editar Matéria";
    document.getElementById('cycleEditId').value = mat.id;
    document.getElementById('cycleSubject').value = mat.subject;
    document.getElementById('cycleType').value = mat.type || 'Teórica';
    document.getElementById('cycleColor').value = mat.color;
    limparSelecaoPresets();
    document.getElementById('cycleModal').classList.add('active');
}

function salvarMateriaCiclo(e) {
    e.preventDefault(); 
    const idEdit = document.getElementById('cycleEditId').value;
    const color = document.getElementById('cycleColor').value || '#007aff';
    const subject = document.getElementById('cycleSubject').value.trim();
    const type = document.getElementById('cycleType').value;
    if (!subject) return showToast('Digite o nome da matéria.', true);
    const duplicada = appData.cycleItems.some(item => item.id != idEdit && (item.subject || '').trim().toLocaleLowerCase('pt-BR') === subject.toLocaleLowerCase('pt-BR'));
    if (duplicada) return showToast('Essa matéria já está cadastrada.', true);
    
    if (idEdit) { 
        const idx = appData.cycleItems.findIndex(i => i.id == idEdit); 
        if (idx > -1) { 
            appData.cycleItems[idx] = { ...appData.cycleItems[idx], color, subject, type, targetMin: 0 }; 
        } 
    } else { 
        appData.cycleItems.push({ id: Date.now(), color, subject, type, targetMin: 0, executedMin: 0, topicos: [], questoes: 0, acertos: 0, erros: 0 }); 
    }
    saveAppData(); renderizarCiclo(); renderizarRevisoes(); fecharModal('cycleModal'); showToast('📚 Matéria salva!');
}

let buscaMateriasAtual = '';
let buscaAssuntosAtual = '';
let filtroAgendamentoAtual = 'todos';
let filtroRevisoesAtual = 'ativas';
let filtroSimuladosAtual = 'todas';
let filtroHistoricoAtual = { busca: '', periodo: 'tudo' };

function pluralizar(total, singular, plural = `${singular}s`) {
    return `${total} ${total === 1 ? singular : plural}`;
}

function corSegura(valor, fallback = 'var(--accent-color)') {
    return /^#[0-9a-f]{3,8}$/i.test(String(valor || '')) ? valor : fallback;
}

function anexoSeguro(valor) {
    return /^data:(image\/(png|jpeg|webp|gif)|application\/pdf);base64,/i.test(String(valor || '')) ? valor : '';
}

function filtrarMaterias(valor = '') {
    buscaMateriasAtual = String(valor).trim().toLocaleLowerCase('pt-BR');
    renderizarCiclo();
}

function renderizarCiclo() {
    atualizarSeletorDeMaterias();
    const grid = document.getElementById('disciplinasGrid');
    if(!grid) return;

    const materias = Array.isArray(appData.cycleItems) ? appData.cycleItems : [];
    const topicos = materias.flatMap(item => Array.isArray(item.topicos) ? item.topicos : []);
    const dominados = topicos.filter(item => item.concluido || item.dominio?.dominio).length;
    const definirTexto = (id, texto) => { const elemento = document.getElementById(id); if (elemento) elemento.textContent = texto; };
    definirTexto('materiasTotal', materias.length);
    definirTexto('materiasTopicos', topicos.length);
    definirTexto('materiasDominados', dominados);
    definirTexto('materiasDominio', topicos.length ? `${Math.round(dominados / topicos.length * 100)}%` : '0%');

    const visiveis = materias.filter(item => !buscaMateriasAtual || `${item.subject || ''} ${item.type || ''}`.toLocaleLowerCase('pt-BR').includes(buscaMateriasAtual));
    definirTexto('materiasResultado', pluralizar(visiveis.length, 'matéria'));

    if(materias.length === 0) {
        grid.innerHTML = '<div class="workspace-empty"><b aria-hidden="true">▦</b><strong>Comece pela primeira matéria</strong><p>Crie uma matéria e depois adicione os tópicos que pretende estudar.</p><button type="button" class="cycle-btn primary" onclick="abrirModalCiclo()">Adicionar matéria</button></div>';
        return; 
    }
    if (!visiveis.length) {
        grid.innerHTML = '<div class="workspace-empty"><b aria-hidden="true">⌕</b><strong>Nenhuma matéria encontrada</strong><p>Tente outro termo ou limpe a busca para ver todas as matérias.</p><button type="button" class="cycle-btn" onclick="document.getElementById(\'materiasBusca\').value=\'\';filtrarMaterias(\'\')">Limpar busca</button></div>';
        return;
    }

    grid.innerHTML = visiveis.map(i => {
        let exec = i.executedMin || 0; 
        let txtExec = exec >= 60 ? `${Math.floor(exec/60)}h${Math.floor(exec%60).toString().padStart(2,'0')}m` : `${Math.floor(exec%60)}m`;
        let concluidos = i.topicos ? i.topicos.filter(t => t.concluido).length : 0, totalTopicos = i.topicos ? i.topicos.length : 0;
        const progresso = totalTopicos ? Math.round(concluidos / totalTopicos * 100) : 0;
        const nome = escaparRevisaoHtml(i.subject || 'Sem nome');
        const tipo = escaparRevisaoHtml(i.type || 'Teórica');
        return `<article class="disc-card" style="--subject-color:${i.color};border-left-color:${i.color};"><div class="disc-card-main"><div class="disc-card-top"><div><button type="button" class="disc-title-button" onclick="abrirModalAssuntos(${i.id})">${nome}</button><span class="disc-type">${tipo}</span></div><div class="workspace-card-actions"><button type="button" class="workspace-icon-button" onclick="editarMateriaCiclo(${i.id})" aria-label="Editar ${nome}" title="Editar">✎</button><button type="button" class="workspace-icon-button danger" onclick="abrirModalDeletar('cycle', ${i.id}, 'Apagar matéria?', 'Isto vai excluir a matéria e seus tópicos.')" aria-label="Apagar ${nome}" title="Apagar">×</button></div></div><div class="disc-stats-row"><div class="ds-box"><span class="ds-val">${concluidos}/${totalTopicos}</span><span class="ds-lbl">Tópicos</span></div><div class="ds-box"><span class="ds-val" style="color:${i.color};">${txtExec}</span><span class="ds-lbl">Tempo</span></div><div class="ds-box"><span class="ds-val">${(i.acertos||0)+(i.erros||0)}</span><span class="ds-lbl">Questões</span></div></div><div class="disc-progress" aria-label="${progresso}% dos tópicos dominados"><span style="width:${progresso}%"></span></div></div><button type="button" class="disc-open-row" onclick="abrirModalAssuntos(${i.id})"><span>Ver e organizar tópicos</span><span aria-hidden="true">›</span></button></article>`;
    }).join('');
}

function abrirModalAssuntos(id) {
    const mat = appData.cycleItems.find(m => m.id === id); if (!mat) return;
    document.getElementById('assuntosMateriaId').value = id; document.getElementById('assuntosModalTitle').textContent = mat.subject;
    buscaAssuntosAtual = '';
    document.getElementById('assuntosBuscaInput').value = '';
    let segs = 0; appData.historyItems.forEach(h => { if(h.materia.trim().toLowerCase() === mat.subject.trim().toLowerCase()) segs += h.tempoSegundos; });
    document.getElementById('assuntosModalTimeValue').textContent = `${Math.floor(segs/3600)}h ${Math.floor((segs%3600)/60).toString().padStart(2,'0')}m`;
    renderizarListaAssuntos(id); document.getElementById('assuntosModal').classList.add('active');
}

function filtrarAssuntos(valor = '') {
    buscaAssuntosAtual = String(valor).trim().toLocaleLowerCase('pt-BR');
    const id = Number(document.getElementById('assuntosMateriaId').value);
    renderizarListaAssuntos(id);
}

function renderizarListaAssuntos(id) {
    const mat = appData.cycleItems.find(m => m.id === id), lista = document.getElementById('listaAssuntos');
    if (!mat || !lista) return;
    const topicos = Array.isArray(mat.topicos) ? mat.topicos : [];
    const estudados = topicos.filter(item => item.concluido || Number(item.vezesEstudado) > 0).length;
    const revisoes = appData.revisoesItems.filter(item => item.status !== 'revisado' && normalizarRevisaoTexto(item.materia) === normalizarRevisaoTexto(mat.subject)).length;
    document.getElementById('assuntosTotalValue').textContent = topicos.length;
    document.getElementById('assuntosEstudadosValue').textContent = estudados;
    document.getElementById('assuntosRevisoesValue').textContent = revisoes;
    const visiveis = topicos.map((topico, index) => ({ topico, index })).filter(({ topico }) => !buscaAssuntosAtual || normalizarRevisaoTexto(topico.nome).includes(normalizarRevisaoTexto(buscaAssuntosAtual)));
    document.getElementById('assuntosBuscaResultado').textContent = buscaAssuntosAtual ? `${visiveis.length} encontrado${visiveis.length === 1 ? '' : 's'}` : 'Todos';
    if (!topicos.length) { lista.innerHTML = '<li class="topics-empty"><strong>Nenhum conteúdo cadastrado</strong><small>Adicione o primeiro tópico acima para começar seu mapa de estudos.</small></li>'; return; }
    if (!visiveis.length) { lista.innerHTML = '<li class="topics-empty"><strong>Nenhum tópico encontrado</strong><small>Tente outro termo ou adicione este conteúdo à matéria.</small></li>'; return; }
    lista.innerHTML = visiveis.map(({ topico: t, index: i }) => {
        const nome = escaparRevisaoHtml(t.nome || 'Tópico');
        const vezes = Number(t.vezesEstudado) || 0;
        const ultimaData = t.ultimoEstudoEm ? new Date(t.ultimoEstudoEm).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }).replace('.', '') : '';
        const meta = vezes ? `${vezes} ${vezes === 1 ? 'registro' : 'registros'}${ultimaData ? ` • último em ${ultimaData}` : ''}` : 'Ainda não registrado como estudado';
        return `<li class="topic-organizer-item ${t.concluido ? 'completed' : ''}"><button type="button" class="topic-check-button" onclick="toggleTopico(${id},${i})" aria-pressed="${Boolean(t.concluido)}" aria-label="${t.concluido ? 'Reabrir' : 'Marcar como concluído'} ${nome}">${t.concluido ? '✓' : '○'}</button><div class="topic-organizer-copy"><strong>${nome}</strong><small>${meta}</small></div><button type="button" class="topic-studied-button" onclick="registrarTopicoEstudado(${id},${i})">Estudei hoje</button><button type="button" class="workspace-icon-button danger" onclick="deletarTopico(${id},${i})" aria-label="Excluir ${nome}" title="Excluir">×</button></li>`;
    }).join('');
}

function adicionarTopico(e) { e.preventDefault(); const id = parseInt(document.getElementById('assuntosMateriaId').value), nm = document.getElementById('novoTopicoInput').value, idx = appData.cycleItems.findIndex(m => m.id === id); if (idx > -1 && nm.trim()) { if (!appData.cycleItems[idx].topicos) appData.cycleItems[idx].topicos = []; appData.cycleItems[idx].topicos.push({ nome: nm, concluido: false }); saveAppData(); document.getElementById('novoTopicoInput').value = ''; renderizarListaAssuntos(id); renderizarCiclo(); } }

function toggleTopico(id, tIdx) { 
    const idx = appData.cycleItems.findIndex(m => m.id === id); 
    if (idx > -1) { 
        appData.cycleItems[idx].topicos[tIdx].concluido = !appData.cycleItems[idx].topicos[tIdx].concluido;
        saveAppData(); renderizarListaAssuntos(id); renderizarCiclo();
    } 
}

function deletarTopico(id, tIdx) { const idx = appData.cycleItems.findIndex(m => m.id === id); if (idx > -1) { appData.cycleItems[idx].topicos.splice(tIdx, 1); saveAppData(); renderizarListaAssuntos(id); renderizarCiclo(); showToast('🗑️ Assunto removido!'); } }

function registrarTopicoEstudado(id, tIdx) {
    const materia = appData.cycleItems.find(item => item.id === id);
    const topico = materia?.topicos?.[tIdx];
    if (!materia || !topico) return;
    atualizarTopicoAposEstudo(materia, topico.nome);
    appData.historyItems.push(criarItemHistoricoRegistro({ materia: materia.subject, assunto: topico.nome, cor: materia.color, tipo: materia.type || 'Teórica',
        comentario: 'Registro rápido pelo organizador de tópicos.', atividade: 'estudo', registroRapido: true }));
    const revisaoCriada = appData.studyLogging.autoReview !== false
        ? criarRevisaoAutomaticaRegistro(materia.subject, topico.nome, appData.studyLogging.reviewDelayDays, 'topico-rapido') : false;
    saveAppData(); renderizarListaAssuntos(id); renderizarCiclo(); renderizarRevisoes();
    showToast(revisaoCriada ? '✓ Estudo registrado e revisão agendada.' : '✓ Estudo registrado para hoje.');
}

function abrirModalEditarHistorico(id) { const h = appData.historyItems.find(i => i.id === id); if(h) { document.getElementById('histEditId').value = h.id; document.getElementById('histSubject').value = h.materia; document.getElementById('histComment').value = h.comentario || ''; document.getElementById('editHistoryModal').classList.add('active'); } }
function salvarEdicaoHistorico(e) { e.preventDefault(); const idx = appData.historyItems.findIndex(h => h.id === parseInt(document.getElementById('histEditId').value)); if(idx > -1) { appData.historyItems[idx].materia = document.getElementById('histSubject').value; appData.historyItems[idx].comentario = document.getElementById('histComment').value; saveAppData(); renderizarHistorico(); fecharModal('editHistoryModal'); showToast('✏️ Histórico atualizado!'); } }

function filtrarHistorico(alteracao = {}) {
    filtroHistoricoAtual = { ...filtroHistoricoAtual, ...alteracao };
    document.querySelectorAll('[data-history-period]').forEach(botao => botao.setAttribute('aria-pressed', String(botao.dataset.historyPeriod === filtroHistoricoAtual.periodo)));
    renderizarHistorico();
}

function renderizarHistorico() {
    toggleBotaoStopHistorico();
    renderizarRaioX();

    const cont = document.getElementById('historyListContainer');
    if(!cont) return;
    const todos = Array.isArray(appData.historyItems) ? appData.historyItems : [];
    const busca = String(filtroHistoricoAtual.busca || '').trim().toLocaleLowerCase('pt-BR');
    let limite = null;
    if (filtroHistoricoAtual.periodo !== 'tudo') {
        limite = new Date(); limite.setHours(0, 0, 0, 0);
        limite.setDate(limite.getDate() - (Number(filtroHistoricoAtual.periodo) - 1));
    }
    const itens = todos.filter(item => {
        const corresponde = !busca || `${item.materia || ''} ${item.assunto || ''} ${item.tipo || ''} ${item.comentario || ''}`.toLocaleLowerCase('pt-BR').includes(busca);
        const data = dataISOParaLocal(dataHistoricoISO(item));
        return corresponde && (!limite || (data && data >= limite));
    }).sort((a, b) => b.id - a.id);

    const totalSecs = itens.reduce((soma, item) => soma + (Number(item.tempoSegundos) || 0), 0);
    const porMateria = itens.reduce((mapa, item) => {
        const nome = item.materia || 'Estudo livre';
        mapa[nome] = (mapa[nome] || 0) + (Number(item.tempoSegundos) || 0);
        return mapa;
    }, {});
    const favorita = Object.keys(porMateria).sort((a, b) => porMateria[b] - porMateria[a])[0];
    const definirTexto = (id, texto) => { const elemento = document.getElementById(id); if (elemento) elemento.textContent = texto; };
    definirTexto('hist-total-time', formatShortTime(totalSecs));
    definirTexto('hist-session-count', itens.length);
    definirTexto('hist-session-average', itens.length ? formatShortTime(Math.round(totalSecs / itens.length)) : '0m');
    definirTexto('hist-favorite-subject', favorita ? `Mais estudada: ${favorita}` : 'Nenhuma matéria ainda');
    definirTexto('historicoResultado', pluralizar(itens.length, 'sessão', 'sessões'));

    if (!todos.length) {
        cont.innerHTML = '<div class="workspace-empty"><b aria-hidden="true">◴</b><strong>Seu histórico começa na primeira sessão</strong><p>Quando você concluir um cronômetro, o tempo e a matéria aparecerão aqui automaticamente.</p><button type="button" class="cycle-btn primary" onclick="showSection(\'dashboard\')">Iniciar uma sessão</button></div>';
        return;
    }
    if (!itens.length) {
        cont.innerHTML = '<div class="workspace-empty"><b aria-hidden="true">⌕</b><strong>Nenhuma sessão neste recorte</strong><p>Altere o período ou a busca para reencontrar seus registros.</p><button type="button" class="cycle-btn" onclick="limparFiltrosHistorico()">Limpar filtros</button></div>';
        return;
    }

    const grupos = {};
    itens.forEach(item => {
        const chave = dataHistoricoISO(item) || item.dataChave || 'sem-data';
        if(!grupos[chave]) grupos[chave] = { itens: [], total: 0 };
        grupos[chave].itens.push(item);
        grupos[chave].total += Number(item.tempoSegundos) || 0;
    });

    cont.innerHTML = Object.entries(grupos).map(([chave, grupo]) => {
        const data = dataISOParaLocal(chave);
        const dia = data ? String(data.getDate()).padStart(2, '0') : '—';
        const mesAno = data ? data.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' }).replace('.', '').toUpperCase() : 'SEM DATA';
        const diaSemana = data ? data.toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', '').toUpperCase() : '';
        const sessoes = grupo.itens.map(sessao => {
            const corMateria = corSegura(sessao.cor);
            const corTipo = sessao.tipo === 'Prática' ? '#ff9500' : (sessao.tipo === 'Teórica e Prática' ? '#007aff' : (sessao.tipo === 'Geral' ? '#515154' : '#8657d6'));
            const materia = escaparRevisaoHtml(sessao.materia || 'Estudo livre');
            const assunto = escaparRevisaoHtml(sessao.assunto || 'Sessão livre');
            const tipo = escaparRevisaoHtml(sessao.tipo || 'Teoria');
            const comentario = escaparRevisaoHtml(sessao.comentario || '');
            const atividade = sessao.registroRapido ? 'Registro rápido' : ({ simulado: 'Simulado', redacao: 'Redação' }[sessao.atividade] || 'Estudo');
            return `<article class="h-session-card" style="border-left-color:${corMateria};"><div class="history-session-main"><div class="hs-info"><b class="hs-title" style="color:${corMateria};">${materia}</b><small>${assunto}</small></div><div class="history-session-meta"><span class="hs-time">${sessao.registroRapido ? '✓ Sem cronômetro' : `⏱ ${formatHistoryTime(Number(sessao.tempoSegundos) || 0)}`}</span><span class="hs-badge" style="background-color:${corTipo};">${atividade}</span><div class="workspace-card-actions"><button type="button" class="workspace-icon-button" onclick="abrirModalEditarHistorico(${sessao.id})" aria-label="Editar sessão de ${materia}" title="Editar">✎</button><button type="button" class="workspace-icon-button danger" onclick="abrirModalDeletar('history', ${sessao.id}, 'Excluir registro?', 'A sessão será removida do histórico.')" aria-label="Excluir sessão de ${materia}" title="Excluir">×</button></div></div></div>${comentario ? `<div class="history-session-note">${comentario}</div>` : ''}</article>`;
        }).join('');
        return `<div class="h-date-header"><div class="h-date-left"><span class="h-date-num">${dia}</span><div class="h-date-text"><span>${mesAno}</span><span>${diaSemana}</span></div></div><div class="h-date-line"></div><div class="h-date-total">⏱ ${formatShortTime(grupo.total)}</div></div>${sessoes}`;
    }).join('');
}

function limparFiltrosHistorico() {
    filtroHistoricoAtual = { busca: '', periodo: 'tudo' };
    const busca = document.getElementById('historicoBusca');
    if (busca) busca.value = '';
    document.querySelectorAll('[data-history-period]').forEach(botao => botao.setAttribute('aria-pressed', String(botao.dataset.historyPeriod === 'tudo')));
    renderizarHistorico();
}

function renderizarRaioX() {
    const totalElement = document.getElementById('lifetime-total-time');
    const barElement = document.getElementById('lifetime-bar');
    const legendElement = document.getElementById('lifetime-legend');
    
    if(!totalElement || !barElement || !legendElement) return;

    totalElement.textContent = formatShortTime(appData.totalStudySeconds);

    let totalMinutosExecutados = 0;
    let breakdown = [];

    appData.cycleItems.forEach(mat => {
        let min = mat.executedMin || 0;
        if(min > 0) {
            let questoesFeitas = (mat.acertos || 0) + (mat.erros || 0);
            let taxaAcerto = questoesFeitas > 0 ? (mat.acertos / questoesFeitas) : -1;
            
            let corAlerta = mat.color; 
            let statusIcon = "✅"; 
            let statusTag = "";

            if (taxaAcerto >= 0 && taxaAcerto < 0.5) {
                corAlerta = "#ff3b30"; 
                statusIcon = "🚨";
                statusTag = " (Gargalo Crítico)";
            } else if (taxaAcerto >= 0.5 && taxaAcerto < 0.7) {
                corAlerta = "#ff9500"; 
                statusIcon = "⚠️";
                statusTag = " (Atenção)";
            } else if (taxaAcerto >= 0.7) {
                corAlerta = "#34c759"; 
                statusIcon = "🏆";
                statusTag = " (Dominado)";
            } else {
                statusIcon = "📊"; 
            }

            breakdown.push({ 
                nome: mat.subject, 
                min: min, 
                cor: corAlerta, 
                corOriginal: mat.color,
                taxa: taxaAcerto,
                icon: statusIcon,
                tag: statusTag
            });
            totalMinutosExecutados += min;
        }
    });

    const totalMinutosGlobais = Math.floor(appData.totalStudySeconds / 60);
    if(totalMinutosGlobais > totalMinutosExecutados) {
        breakdown.push({ nome: "Livre / Deletados", min: (totalMinutosGlobais - totalMinutosExecutados), cor: "#515154", corOriginal: "#515154", taxa: -1, icon: "⏱", tag: "" });
        totalMinutosExecutados = totalMinutosGlobais;
    }

    breakdown.sort((a, b) => b.min - a.min);

    let barHtml = '';
    let legendHtml = '';

    if(totalMinutosExecutados === 0) {
        barElement.innerHTML = '<div style="width: 100%; background: var(--border-color); height: 100%;"></div>';
        legendElement.innerHTML = '<span style="color: var(--text-muted);">A base de dados aguarda informações. Responda questões e estude para gerar a matriz.</span>';
        return;
    }

    breakdown.forEach(item => {
        let pct = (item.min / totalMinutosExecutados) * 100;
        let tempoTexto = item.min >= 60 ? `${Math.floor(item.min/60)}h ${Math.floor(item.min%60)}m` : `${Math.floor(item.min)}m`;
        let taxaTexto = item.taxa >= 0 ? `${Math.round(item.taxa * 100)}% de Acerto` : "Sem questões cadastradas";
        const nomeSeguro = escaparRevisaoHtml(item.nome);
        const cor = corSegura(item.cor, '#515154');
        const corOriginal = corSegura(item.corOriginal, '#515154');

        barHtml += `<div class="lifetime-segment" style="width:${pct}%;background-color:${cor};" title="${nomeSeguro}: ${tempoTexto} | ${taxaTexto}"></div>`;
        
        legendHtml += `
            <div class="legend-item" title="${pct.toFixed(1)}% do tempo investido" style="border-left:3px solid ${cor};display:flex;flex-direction:column;align-items:flex-start;gap:4px;padding:10px;min-width:200px;">
                <div style="display:flex; align-items: center; gap: 6px;">
                    <div class="legend-dot" style="background-color:${corOriginal};"></div>
                    <span style="font-weight:800;color:var(--text-main);font-size:.85rem;">${item.icon} ${nomeSeguro}</span>
                </div>
                <span style="font-size:.75rem;color:${cor};font-weight:700;margin-left:16px;">${item.tag ? item.tag.trim() : ''}</span>
                <span style="font-size: 0.7rem; color: var(--text-muted); margin-left: 16px;">⏱ ${tempoTexto} investidos • 🎯 ${taxaTexto}</span>
            </div>
        `;
    });

    barElement.innerHTML = barHtml;
    legendElement.innerHTML = legendHtml;
}

function abrirModalAgenda() {
    document.getElementById('formAddAgenda').reset();
    document.getElementById('agendaEditId').value = "";
    document.getElementById('agendaModalTitle').textContent = "Novo Agendamento";
    document.getElementById('agendaModal').classList.add('active');
}

function editarAgenda(id) {
    const item = appData.agendaItems.find(i => i.id === id);
    if(item) {
        document.getElementById('agendaEditId').value = item.id;
        document.getElementById('agendaTitle').value = item.title;
        document.getElementById('agendaSubject').value = item.subject;
        document.getElementById('agendaType').value = item.type;
        document.getElementById('agendaDate').value = item.date;
        document.getElementById('agendaDescription').value = item.description || "";
        document.getElementById('agendaModalTitle').textContent = "Editar Agendamento";
        document.getElementById('agendaModal').classList.add('active');
    }
}

function salvarAgendamento(e) {
    e.preventDefault();
    const idEdit = document.getElementById('agendaEditId').value;
    const title = document.getElementById('agendaTitle').value;
    const subject = document.getElementById('agendaSubject').value;
    const type = document.getElementById('agendaType').value;
    const date = document.getElementById('agendaDate').value;
    const description = document.getElementById('agendaDescription').value;

    if (idEdit) {
        const idx = appData.agendaItems.findIndex(i => i.id == idEdit);
        if (idx > -1) appData.agendaItems[idx] = { ...appData.agendaItems[idx], title, subject, type, date, description };
    } else {
        appData.agendaItems.push({ id: Date.now(), title, subject, type, date, description, completed: false });
    }
    saveAppData(); renderizarAgenda(); fecharModal('agendaModal'); showToast('📅 Guardado no Radar!');
}

function toggleAgenda(id) {
    const idx = appData.agendaItems.findIndex(i => i.id === id);
    if(idx > -1) {
        appData.agendaItems[idx].completed = !appData.agendaItems[idx].completed;
        saveAppData(); renderizarAgenda();
        if(appData.agendaItems[idx].completed) showToast('🎉 Desafio Concluído! Excelente!');
    }
}

function renderizarAgenda() {
    const list = document.getElementById('agendaList');
    const highlight = document.getElementById('agendaHighlight');
    if (!list) return;

    if (appData.agendaItems.length === 0) {
        list.innerHTML = '<p style="text-align: center; color: var(--text-muted); padding: 30px; border: 1px dashed var(--border-color); border-radius: 16px;">Nenhum desafio à vista. Aproveite a paz! 🕊️</p>';
        if(highlight) {
            highlight.innerHTML = '<h3 style="margin:0; font-size:1.2rem; color:var(--text-main);">Tudo limpo!</h3><p style="color:var(--text-muted); margin-top:5px;">Nenhum desafio pendente.</p>';
            highlight.style.borderLeftColor = 'var(--border-color)';
        }
        verificarAlertasProximos();
        return;
    }

    const hoje = new Date(); hoje.setHours(0,0,0,0);
    let itens = [...appData.agendaItems].sort((a, b) => new Date(a.date) - new Date(b.date));
    itens.sort((a, b) => (a.completed === b.completed) ? 0 : a.completed ? 1 : -1);

    let html = ''; let proximaPendente = null;

    itens.forEach(item => {
        let d = new Date(item.date + 'T12:00:00'); d.setHours(0,0,0,0);
        let diffDays = Math.ceil((d - hoje) / (1000 * 60 * 60 * 24));
        let txtDias = ''; let corUrgencia = 'var(--accent-color)';

        if(diffDays < 0) { txtDias = "Em atraso!"; corUrgencia = '#515154'; }
        else if(diffDays === 0) { txtDias = "É HOJE!"; corUrgencia = '#ff3b30'; }
        else if(diffDays === 1) { txtDias = "Amanhã"; corUrgencia = '#ff3b30'; }
        else if(diffDays === 2) { txtDias = "Faltam 2 dias"; corUrgencia = '#ff3b30'; }
        else if(diffDays >= 3 && diffDays <= 5) { txtDias = `Faltam ${diffDays} dias`; corUrgencia = '#ff9500'; }
        else { txtDias = `Faltam ${diffDays} dias`; corUrgencia = '#34c759'; }

        if(item.completed) corUrgencia = 'var(--border-color)';
        if(!item.completed && !proximaPendente && diffDays >= 0) proximaPendente = { ...item, txtDias, corUrgencia, diaStr: d.getDate().toString().padStart(2, '0'), mesStr: ['JAN', 'FEV', 'MAR', 'ABR', 'MAI', 'JUN', 'JUL', 'AGO', 'SET', 'OUT', 'NOV', 'DEZ'][d.getMonth()] };

        html += `
        <div class="agenda-card ${item.completed ? 'completed' : ''}" style="--urgency-color: ${corUrgencia};">
            <div class="agenda-actions" style="margin-left: 0; margin-right: 5px;">
                <i class="btn-check-agenda" onclick="toggleAgenda(${item.id})">${item.completed ? '✅' : '⬜'}</i>
            </div>
            <div class="agenda-date-box">
                <span class="day">${d.getDate().toString().padStart(2, '0')}</span>
                <span class="month">${['JAN', 'FEV', 'MAR', 'ABR', 'MAI', 'JUN', 'JUL', 'AGO', 'SET', 'OUT', 'NOV', 'DEZ'][d.getMonth()]}</span>
            </div>
            <div class="agenda-info">
                <div class="agenda-title">${item.title}</div>
                <div class="agenda-subject"><span class="agenda-badge">${item.type}</span> ${item.subject}</div>
                ${item.description ? `<div class="agenda-desc-text" style="font-size: 0.8rem; color: var(--text-muted); margin-top: 4px; line-height: 1.3; font-style: italic;">${item.description}</div>` : ''}
            </div>
            ${!item.completed ? `<div class="agenda-countdown">${txtDias}</div>` : ''}
            <div class="agenda-actions">
                <i onclick="editarAgenda(${item.id})" title="Editar">✏️</i>
                <i onclick="abrirModalDeletar('agenda', ${item.id}, 'Apagar Registo?', 'Isto irá remover o agendamento.')" title="Excluir">🗑️</i>
            </div>
        </div>`;
    });

    list.innerHTML = html;
    if(highlight) {
        if(proximaPendente) {
            highlight.style.borderLeftColor = proximaPendente.corUrgencia;
            highlight.innerHTML = `<div style="display:flex; justify-content:space-between; align-items:center;"><div><h3 style="margin:0; font-size:0.8rem; text-transform:uppercase; color:var(--text-muted); font-weight:700;">Próximo Desafio</h3><div style="font-size:1.5rem; font-weight:800; color:var(--text-main); margin:5px 0;">${proximaPendente.title}</div><div style="font-size:0.9rem; color:${proximaPendente.corUrgencia}; font-weight:700;">🚨 ${proximaPendente.txtDias} (${proximaPendente.subject})</div></div><div class="agenda-date-box" style="--urgency-color: ${proximaPendente.corUrgencia}; transform: scale(1.2); margin-right:10px;"><span class="day">${proximaPendente.diaStr}</span><span class="month">${proximaPendente.mesStr}</span></div></div>`;
        } else {
            highlight.style.borderLeftColor = 'var(--border-color)';
            highlight.innerHTML = '<h3 style="margin:0; font-size:1.2rem; color:var(--text-main);">Tudo em dia!</h3><p style="color:var(--text-muted); margin-top:5px;">Nenhuma avaliação pendente registada.</p>';
        }
    }
    verificarAlertasProximos();
}

function verificarAlertasProximos() {
    const banner = document.getElementById('dashboardUrgencyAlert');
    if (!appData.agendaItems || !banner) return;
    
    const hoje = new Date(); hoje.setHours(0,0,0,0);
    let pendentes = appData.agendaItems.filter(item => !item.completed);
    let tarefasProximas = [];

    pendentes.forEach(item => {
        let d = new Date(item.date + 'T12:00:00'); d.setHours(0,0,0,0);
        let diffDays = Math.ceil((d - hoje) / (1000 * 60 * 60 * 24));
        if(diffDays >= 0 && diffDays <= 2) { tarefasProximas.push({ ...item, diffDays }); }
    });

    if (tarefasProximas.length > 0) {
        tarefasProximas.sort((a, b) => a.diffDays - b.diffDays);
        const prox = tarefasProximas[0];
        let textoDia = prox.diffDays === 0 ? "HOJE" : (prox.diffDays === 1 ? "AMANHÃ" : `em ${prox.diffDays} dias`);
        
        banner.innerHTML = `
            <div class="urgency-banner">
                <div class="urgency-text">
                    <span class="pulse-dot"></span>
                    <span><strong>Urgente • </strong> A avaliação de <b>${prox.subject}</b> (${prox.title}) é ${textoDia}.</span>
                </div>
                <button class="cycle-btn" style="padding: 6px 14px; font-size: 0.8rem; border-color: rgba(255, 59, 48, 0.3); color: #ff3b30; background: transparent;" onclick="showSection('escola-provas')">Aceder ao Radar</button>
            </div>
        `;
        banner.style.display = 'block';
    } else {
        banner.style.display = 'none';
    }
}

function abrirModalAgendamento() {
    document.getElementById('formAddAgendamento').reset();
    document.getElementById('agendamentoEditId').value = "";
    document.getElementById('agendamentoModalTitle').textContent = "Novo Compromisso";
    document.getElementById('agendamentoDateInput').value = new Date().toISOString().split('T')[0];
    document.getElementById('agendamentoModal').classList.add('active');
}

function salvarAgendamentoNovo(e) {
    e.preventDefault();
    const idEdit = document.getElementById('agendamentoEditId').value;
    const title = document.getElementById('agendamentoTitleInput').value;
    const date = document.getElementById('agendamentoDateInput').value;
    const time = document.getElementById('agendamentoTimeInput').value;
    const type = document.getElementById('agendamentoTypeInput').value;
    const description = document.getElementById('agendamentoDescInput').value;

    if (idEdit) {
        const idx = appData.agendamentoItems.findIndex(i => i.id == idEdit);
        if (idx > -1) appData.agendamentoItems[idx] = { ...appData.agendamentoItems[idx], title, date, time, type, description };
    } else {
        appData.agendamentoItems.push({ id: Date.now(), title, date, time, type, description, completed: false });
    }
    saveAppData(); renderizarAgendamento(); fecharModal('agendamentoModal'); showToast('📅 Agendado com sucesso!');
}

function toggleAgendamentoStatus(id) {
    const idx = appData.agendamentoItems.findIndex(i => i.id === id);
    if(idx > -1) {
        appData.agendamentoItems[idx].completed = !appData.agendamentoItems[idx].completed;
        saveAppData(); renderizarAgendamento();
    }
}

function filtrarAgendamento(filtro = 'todos') {
    filtroAgendamentoAtual = ['todos', 'hoje', 'proximos', 'concluidos'].includes(filtro) ? filtro : 'todos';
    document.querySelectorAll('[data-agenda-filter]').forEach(botao => botao.setAttribute('aria-pressed', String(botao.dataset.agendaFilter === filtroAgendamentoAtual)));
    renderizarAgendamento();
}

function editarAgendamentoItem(id) {
    const item = appData.agendamentoItems.find(i => i.id === id);
    if(item) {
        document.getElementById('agendamentoEditId').value = item.id;
        document.getElementById('agendamentoTitleInput').value = item.title;
        document.getElementById('agendamentoDateInput').value = item.date;
        document.getElementById('agendamentoTimeInput').value = item.time;
        document.getElementById('agendamentoTypeInput').value = item.type === 'Treino Físico' ? 'Pessoal' : (item.type === 'Revisão' ? 'Estudo' : item.type);
        document.getElementById('agendamentoDescInput').value = item.description || "";
        document.getElementById('agendamentoModalTitle').textContent = "Editar Compromisso";
        document.getElementById('agendamentoModal').classList.add('active');
    }
}

function renderizarAgendamento() {
    const list = document.getElementById('agendamentoList');
    const highlight = document.getElementById('agendamentoHighlight');
    renderizarResumoAgendamento();
    if (!list) return;

    const todos = Array.isArray(appData.agendamentoItems) ? appData.agendamentoItems : [];
    const hoje = dataLocalISO();
    const agora = new Date();
    const pendentesHoje = todos.filter(item => !item.completed && item.date === hoje).length;
    const atrasados = todos.filter(item => !item.completed && item.date && item.date < hoje).length;
    const concluidos = todos.filter(item => item.completed).length;
    const definirTexto = (id, texto) => { const elemento = document.getElementById(id); if (elemento) elemento.textContent = texto; };
    definirTexto('agendaHojeTotal', pendentesHoje);
    definirTexto('agendaAtrasadosTotal', atrasados);
    definirTexto('agendaConcluidosTotal', concluidos);

    const filtrados = todos.filter(item => {
        if (filtroAgendamentoAtual === 'hoje') return !item.completed && item.date === hoje;
        if (filtroAgendamentoAtual === 'proximos') return !item.completed && item.date > hoje;
        if (filtroAgendamentoAtual === 'concluidos') return item.completed;
        return true;
    });
    let itens = [...filtrados].sort((a, b) => {
        const dtA = new Date(`${a.date}T${a.time}`);
        const dtB = new Date(`${b.date}T${b.time}`);
        return dtA - dtB;
    });

    itens.sort((a, b) => (a.completed === b.completed) ? 0 : a.completed ? 1 : -1);

    definirTexto('agendaResultado', pluralizar(itens.length, 'compromisso'));
    if (!todos.length) {
        list.innerHTML = '<div class="workspace-empty"><b aria-hidden="true">◷</b><strong>Sua agenda está livre</strong><p>Adicione apenas os compromissos que realmente precisam de horário ou data.</p><button type="button" class="cycle-btn primary" onclick="abrirModalAgendamento()">Criar compromisso</button></div>';
    } else if (!itens.length) {
        const textos = { hoje: ['Nada pendente hoje', 'Seu dia está livre ou tudo já foi concluído.'], proximos: ['Nenhum compromisso futuro', 'Você pode planejar o próximo bloco quando quiser.'], concluidos: ['Nada concluído ainda', 'Marque um compromisso como feito para encontrá-lo aqui.'] };
        const mensagem = textos[filtroAgendamentoAtual] || ['Nenhum resultado', 'Escolha outro filtro para ver seus compromissos.'];
        list.innerHTML = `<div class="workspace-empty"><b aria-hidden="true">✓</b><strong>${mensagem[0]}</strong><p>${mensagem[1]}</p><button type="button" class="cycle-btn" onclick="filtrarAgendamento('todos')">Ver todos</button></div>`;
    } else {
        list.innerHTML = itens.map(item => {
            const data = dataISOParaLocal(item.date);
            const dataTexto = data ? data.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }).replace('.', '') : 'Sem data';
            const dataHora = item.date ? new Date(`${item.date}T${item.time || '23:59'}`) : null;
            const atrasado = !item.completed && dataHora && dataHora < agora;
            const titulo = escaparRevisaoHtml(item.title || 'Compromisso');
            const tipo = escaparRevisaoHtml(item.type || 'Estudo');
            const descricao = escaparRevisaoHtml(item.description || '');
            const corUrgencia = item.completed ? 'var(--border-color)' : (atrasado ? '#ff3b30' : 'var(--accent-color)');
            return `<article class="agenda-card agenda-card-pro ${item.completed ? 'completed' : ''}" style="--urgency-color:${corUrgencia};"><button type="button" class="agenda-check" onclick="toggleAgendamentoStatus(${item.id})" aria-label="${item.completed ? 'Reabrir' : 'Concluir'} ${titulo}" aria-pressed="${item.completed}">${item.completed ? '✓' : '○'}</button><div class="agenda-card-copy"><h3>${titulo}</h3><div class="agenda-card-meta"><span>${item.time || 'Sem hora'}</span><span>${dataTexto}</span><span>${tipo}</span>${atrasado ? '<span class="overdue">Atrasado</span>' : ''}</div>${descricao ? `<p>${descricao}</p>` : ''}</div><div class="workspace-card-actions"><button type="button" class="workspace-icon-button" onclick="editarAgendamentoItem(${item.id})" aria-label="Editar ${titulo}" title="Editar">✎</button><button type="button" class="workspace-icon-button danger" onclick="abrirModalDeletar('agendamentoTab', ${item.id}, 'Remover compromisso?', 'Deseja apagar este compromisso?')" aria-label="Apagar ${titulo}" title="Apagar">×</button></div></article>`;
        }).join('');
    }

    const pendentes = todos.filter(item => !item.completed).sort((a, b) => new Date(`${a.date || '9999-12-31'}T${a.time || '23:59'}`) - new Date(`${b.date || '9999-12-31'}T${b.time || '23:59'}`));
    const proximo = pendentes.find(item => new Date(`${item.date}T${item.time || '23:59'}`) >= agora) || pendentes[0];
    if (highlight) {
        if (!proximo) {
            highlight.hidden = true;
        } else {
            highlight.hidden = false;
            const data = dataISOParaLocal(proximo.date);
            const dataTexto = proximo.date === hoje ? 'Hoje' : (data ? data.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }).replace('.', '') : 'Sem data');
            const vencido = proximo.date && new Date(`${proximo.date}T${proximo.time || '23:59'}`) < agora;
            highlight.innerHTML = `<span class="workspace-kicker">${vencido ? 'PRECISA REPLANEJAR' : 'PRÓXIMA AÇÃO'}</span><p>${escaparRevisaoHtml(proximo.title || 'Compromisso')}</p><small>${[dataTexto, proximo.time, proximo.type].filter(Boolean).map(escaparRevisaoHtml).join(' • ')}</small>`;
        }
    }
}

function renderizarResumoAgendamento() {
    const title = document.getElementById('dashboardAgendaTitle');
    const meta = document.getElementById('dashboardAgendaMeta');
    const action = document.getElementById('dashboardAgendaAction');
    if (!title || !meta || !action) return;

    const itens = Array.isArray(appData.agendamentoItems) ? appData.agendamentoItems : [];
    const pendentes = itens.filter(item => !item.completed).sort((a, b) => {
        const dataA = new Date(`${a.date || '9999-12-31'}T${a.time || '23:59'}`);
        const dataB = new Date(`${b.date || '9999-12-31'}T${b.time || '23:59'}`);
        return dataA - dataB;
    });

    if (!itens.length) {
        title.textContent = 'Seu dia, no seu ritmo';
        meta.textContent = 'Organize quando quiser, sem pressão.';
        action.textContent = 'Criar agenda';
        return;
    }

    if (!pendentes.length) {
        title.textContent = 'Tudo feito por hoje';
        meta.textContent = 'Seu planejamento está em dia. Aproveite a pausa.';
        action.textContent = 'Ver agenda';
        return;
    }

    const agora = new Date();
    const chaveHoje = `${agora.getFullYear()}-${String(agora.getMonth() + 1).padStart(2, '0')}-${String(agora.getDate()).padStart(2, '0')}`;
    const proximo = pendentes.find(item => item.date === chaveHoje && new Date(`${item.date}T${item.time || '23:59'}`) >= agora)
        || pendentes.find(item => item.date === chaveHoje)
        || pendentes.find(item => new Date(`${item.date || '9999-12-31'}T${item.time || '23:59'}`) >= agora)
        || pendentes[0];
    const data = new Date(`${proximo.date || chaveHoje}T12:00:00`);
    const dataTexto = proximo.date === chaveHoje ? 'Hoje' : data.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }).replace('.', '');
    const detalhes = [dataTexto, proximo.time, proximo.type].filter(Boolean);

    title.textContent = proximo.title || 'Próximo compromisso';
    meta.textContent = detalhes.join(' • ');
    action.textContent = 'Abrir agenda';
}

function normalizarRevisaoTexto(valor) {
    return (valor || '').trim().toLocaleLowerCase('pt-PT');
}

function escaparRevisaoHtml(valor) {
    return String(valor || '').replace(/[&<>"']/g, caractere => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;'
    })[caractere]);
}

function obterTagsSelecionadasFormulario() {
    return [...document.querySelectorAll('#revisaoTagsSelecao input[type="checkbox"]:checked')].map(input => input.value);
}

function renderTagsRevisaoSelecionaveis(selecionadas = []) {
    const container = document.getElementById('revisaoTagsSelecao');
    if (!container) return;
    if (!appData.revisaoTags.length) {
        container.innerHTML = '<span class="revision-tag-empty">Nenhuma tag criada.</span>';
        return;
    }
    container.innerHTML = [...appData.revisaoTags].sort((a, b) => a.localeCompare(b, 'pt-BR')).map(tag => {
        const segura = escaparRevisaoHtml(tag);
        return `<label class="revision-tag-option"><input type="checkbox" value="${segura}" ${selecionadas.includes(tag) ? 'checked' : ''}><span>${segura}</span></label>`;
    }).join('');
}

function abrirModalRevisao(id = null) {
    const form = document.getElementById('formAddRevisao');
    const select = document.getElementById('revisaoMateria');
    const assunto = document.getElementById('revisaoAssunto');
    const dataEstudo = document.getElementById('revisaoDataEstudo');
    const dataAlvo = document.getElementById('revisaoDataAlvo');
    const aviso = document.getElementById('revisaoSemMaterias');
    const submit = form.querySelector('button[type="submit"]');
    const item = id ? appData.revisoesItems.find(revisao => revisao.id === id) : null;
    const temMaterias = appData.cycleItems.length > 0 || Boolean(item);
    form.reset();
    document.getElementById('revisaoModalTitle').textContent = item ? 'Editar Revisão' : 'Nova Revisão';
    document.getElementById('revisaoEditId').value = item?.id || '';
    document.getElementById('revisaoOrigem').value = item?.origem || 'manual';
    const materias = appData.cycleItems.map(materia => materia.subject);
    if (item?.materia && !materias.includes(item.materia)) materias.unshift(item.materia);
    select.innerHTML = temMaterias
        ? materias.map(materia => `<option value="${escaparRevisaoHtml(materia)}">${escaparRevisaoHtml(materia)}</option>`).join('')
        : '<option value="">Nenhuma matéria cadastrada</option>';
    if (item) {
        select.value = item.materia;
        assunto.value = item.assunto || '';
        dataEstudo.value = item.dataEstudo || '';
        dataAlvo.value = item.dataAlvo || '';
    }
    select.disabled = !temMaterias;
    assunto.disabled = !temMaterias;
    dataEstudo.disabled = !temMaterias;
    dataAlvo.disabled = !temMaterias;
    submit.disabled = !temMaterias;
    aviso.style.display = temMaterias ? 'none' : 'block';
    atualizarAssuntosRevisao();
    renderTagsRevisaoSelecionaveis(item?.tags || []);
    document.getElementById('revisaoModal').classList.add('active');
}

function atualizarAssuntosRevisao() {
    const materiaNome = document.getElementById('revisaoMateria')?.value;
    const materia = appData.cycleItems.find(item => item.subject === materiaNome);
    const datalist = document.getElementById('revisaoAssuntosOptions');
    if (!datalist) return;
    datalist.innerHTML = (materia?.topicos || []).map(topico => `<option value="${escaparRevisaoHtml(topico.nome)}"></option>`).join('');
}

function salvarRevisao(e) {
    e.preventDefault();
    const idEdit = Number(document.getElementById('revisaoEditId').value) || null;
    if (!appData.cycleItems.length && !idEdit) return;
    const dados = {
        materia: document.getElementById('revisaoMateria').value,
        assunto: document.getElementById('revisaoAssunto').value.trim(),
        dataEstudo: document.getElementById('revisaoDataEstudo').value,
        dataAlvo: document.getElementById('revisaoDataAlvo').value,
        origem: document.getElementById('revisaoOrigem').value || 'manual',
        tags: obterTagsSelecionadasFormulario(),
        atualizadoEm: Date.now()
    };
    if (idEdit) {
        const indice = appData.revisoesItems.findIndex(item => item.id === idEdit);
        if (indice < 0) return;
        appData.revisoesItems[indice] = { ...appData.revisoesItems[indice], ...dados };
    } else {
        appData.revisoesItems.push({ id: Date.now(), ...dados, status: 'pendente', criadoEm: Date.now() });
    }
    saveAppData();
    renderizarRevisoes();
    fecharModal('revisaoModal');
    showToast(idEdit ? 'Revisão atualizada.' : 'Revisão adicionada à lista.');
}

function marcarRevisao(id, novoStatus) {
    const item = appData.revisoesItems.find(revisao => revisao.id === id);
    if (!item) return;
    item.status = novoStatus;
    item.atualizadoEm = Date.now();
    if (novoStatus === 'revisado') item.revisadoEm = Date.now();
    saveAppData();
    renderizarRevisoes();
    showToast(novoStatus === 'fraco' ? 'Item voltou ao topo como ainda fraco.' : 'Revisão marcada como concluída.');
}

function abrirReagendamentoRevisao(id) {
    const item = appData.revisoesItems.find(revisao => revisao.id === id);
    if (!item) return;
    document.getElementById('reagendarRevisaoId').value = item.id;
    document.getElementById('reagendarRevisaoResumo').textContent = `${item.materia} • ${item.assunto}`;
    document.getElementById('reagendarRevisaoData').value = item.dataAlvo || '';
    document.getElementById('reagendarRevisaoModal').classList.add('active');
}

function salvarReagendamentoRevisao(e) {
    e.preventDefault();
    const id = Number(document.getElementById('reagendarRevisaoId').value);
    const item = appData.revisoesItems.find(revisao => revisao.id === id);
    if (!item) return;
    item.dataAlvo = document.getElementById('reagendarRevisaoData').value;
    item.status = 'pendente';
    item.ultimaRevisaoEm = dataLocalISO();
    item.atualizadoEm = Date.now();
    saveAppData();
    renderizarRevisoes();
    fecharModal('reagendarRevisaoModal');
    showToast('Nova data de revisão marcada.');
}

function abrirModalTagsRevisao() {
    renderGerenciadorTagsRevisao();
    document.getElementById('tagsRevisaoModal').classList.add('active');
    setTimeout(() => document.getElementById('novaTagRevisao')?.focus(), 50);
}

function renderGerenciadorTagsRevisao() {
    const lista = document.getElementById('revisaoTagsLista');
    if (!lista) return;
    lista.innerHTML = appData.revisaoTags.length
        ? [...appData.revisaoTags].sort((a, b) => a.localeCompare(b, 'pt-BR')).map(tag => `<span class="revision-tag-chip">${escaparRevisaoHtml(tag)}</span>`).join('')
        : '<span class="revision-tag-empty">Crie sua primeira tag para reutilizá-la nas revisões.</span>';
}

function salvarTagRevisao(e) {
    e.preventDefault();
    const input = document.getElementById('novaTagRevisao');
    const tag = input.value.trim();
    if (!tag) return;
    if (appData.revisaoTags.some(item => normalizarRevisaoTexto(item) === normalizarRevisaoTexto(tag))) {
        return showToast('Essa tag já existe.', true);
    }
    const selecionadas = obterTagsSelecionadasFormulario();
    appData.revisaoTags.push(tag);
    saveAppData();
    input.value = '';
    renderGerenciadorTagsRevisao();
    renderTagsRevisaoSelecionaveis(selecionadas);
    showToast('Tag criada e pronta para usar.');
}

function obterDesempenhoPorArea() {
    const areas = {};
    appData.simuladosItems.forEach(simulado => {
        const area = simulado.area || 'Geral';
        const total = simulado.total || ((simulado.acertos || 0) + (simulado.erros || 0));
        if (total <= 0) return;
        if (!areas[area]) areas[area] = { acertos: 0, total: 0 };
        areas[area].acertos += simulado.acertos || 0;
        areas[area].total += total;
    });
    return areas;
}

function obterPiorAreaSimulados() {
    const areas = obterDesempenhoPorArea();
    let piorArea = null;
    let piorTaxa = Infinity;
    Object.entries(areas).forEach(([area, dados]) => {
        const taxa = dados.total > 0 ? dados.acertos / dados.total : 1;
        if (taxa < piorTaxa) {
            piorTaxa = taxa;
            piorArea = area;
        }
    });
    return piorArea;
}

function criarRevisaoDoPiorSimulado() {
    const piorArea = obterPiorAreaSimulados();
    if (!piorArea) return false;
    const jaExiste = appData.revisoesItems.some(item =>
        ['pendente', 'fraco'].includes(item.status) && normalizarRevisaoTexto(item.materia) === normalizarRevisaoTexto(piorArea)
    );
    if (jaExiste) return false;
    appData.revisoesItems.push({
        id: Date.now() + 1,
        materia: piorArea,
        assunto: 'Rever a área com pior desempenho nos simulados',
        dataEstudo: '',
        dataAlvo: '',
        origem: 'simulado',
        status: 'pendente',
        tags: [],
        criadoEm: Date.now(),
        atualizadoEm: Date.now()
    });
    return true;
}

function renderDashboardRevisoes() {
    const corpo = document.getElementById('dashboardRevisoesTableBody');
    if (!corpo) return;
    const hoje = new Date(); hoje.setHours(0, 0, 0, 0);
    const pendentes = appData.revisoesItems
        .filter(item => ['pendente', 'fraco'].includes(item.status))
        .sort((a, b) => {
            const prioridade = item => item.status === 'fraco' ? 0 : (item.dataAlvo && new Date(`${item.dataAlvo}T12:00:00`) < hoje ? 1 : 2);
            return prioridade(a) - prioridade(b) || (a.dataAlvo || '9999-12-31').localeCompare(b.dataAlvo || '9999-12-31') || (b.atualizadoEm || b.id) - (a.atualizadoEm || a.id);
        })
        .slice(0, 6);
    if (!pendentes.length) {
        corpo.innerHTML = '<tr><td colspan="3" class="dashboard-review-empty">Nenhum assunto pendente. Sua lista está em dia.</td></tr>';
        return;
    }
    corpo.innerHTML = pendentes.map(item => {
        const data = item.dataAlvo ? new Date(`${item.dataAlvo}T12:00:00`) : null;
        const atrasada = data && data < hoje;
        const dataTexto = data ? data.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }) : 'Sem data';
        return `<tr onclick="showSection('revisoes')" tabindex="0"><td data-label="Assunto"><strong>${escaparRevisaoHtml(item.assunto)}</strong>${item.status === 'fraco' ? '<span class="dashboard-review-weak">Ainda fraco</span>' : ''}</td><td data-label="Matéria">${escaparRevisaoHtml(item.materia)}</td><td data-label="Revisar em" class="${atrasada ? 'dashboard-review-overdue' : ''}">${atrasada ? 'Atrasada • ' : ''}${dataTexto}</td></tr>`;
    }).join('');
}

function filtrarRevisoes(filtro = 'ativas') {
    filtroRevisoesAtual = ['ativas', 'hoje', 'fracas', 'concluidas', 'todas'].includes(filtro) ? filtro : 'ativas';
    document.querySelectorAll('[data-review-filter]').forEach(botao => botao.setAttribute('aria-pressed', String(botao.dataset.reviewFilter === filtroRevisoesAtual)));
    renderizarRevisoes();
}

function renderizarRevisoes() {
    const lista = document.getElementById('revisoesList');
    if (!lista) return;
    const hoje = new Date(); hoje.setHours(0, 0, 0, 0);
    const inicioSemana = new Date(hoje);
    const diaSemana = hoje.getDay() || 7;
    inicioSemana.setDate(hoje.getDate() - diaSemana + 1);
    const fimSemana = new Date(inicioSemana); fimSemana.setDate(inicioSemana.getDate() + 6); fimSemana.setHours(23, 59, 59, 999);
    const pendente = item => ['pendente', 'fraco'].includes(item.status);
    const dataItem = item => item.dataAlvo ? new Date(`${item.dataAlvo}T12:00:00`) : null;
    const atrasada = item => pendente(item) && dataItem(item) && dataItem(item) < hoje;
    const naSemana = item => pendente(item) && dataItem(item) && dataItem(item) >= inicioSemana && dataItem(item) <= fimSemana;

    document.getElementById('rev-pendentes').textContent = appData.revisoesItems.filter(pendente).length;
    document.getElementById('rev-atrasadas').textContent = appData.revisoesItems.filter(atrasada).length;
    document.getElementById('rev-semana').textContent = appData.revisoesItems.filter(naSemana).length;

    if (!appData.revisoesItems.length) {
        const resultado = document.getElementById('revisoesResultado');
        if (resultado) resultado.textContent = '0 revisões';
        lista.innerHTML = '<div class="workspace-empty"><b aria-hidden="true">↻</b><strong>Nenhuma revisão cadastrada</strong><p>Adicione um assunto que precisa voltar ao foco ou registre um simulado para criar revisões automaticamente.</p><button type="button" class="cycle-btn primary" onclick="abrirModalRevisao()">Criar revisão</button></div>';
        renderDashboardRevisoes();
        return;
    }

    const ordenados = [...appData.revisoesItems].sort((a, b) => {
        const prioridade = item => item.status === 'fraco' ? 0 : (atrasada(item) ? 1 : (item.status === 'pendente' ? 2 : 3));
        const diferenca = prioridade(a) - prioridade(b);
        if (diferenca) return diferenca;
        if (a.status === 'fraco' && b.status === 'fraco') return (b.atualizadoEm || 0) - (a.atualizadoEm || 0);
        const dataA = a.dataAlvo || '9999-12-31';
        const dataB = b.dataAlvo || '9999-12-31';
        return dataA.localeCompare(dataB) || (b.criadoEm || b.id) - (a.criadoEm || a.id);
    });

    const visiveis = ordenados.filter(item => {
        if (filtroRevisoesAtual === 'ativas') return pendente(item);
        if (filtroRevisoesAtual === 'hoje') return pendente(item) && dataItem(item) && dataItem(item) <= hoje;
        if (filtroRevisoesAtual === 'fracas') return item.status === 'fraco';
        if (filtroRevisoesAtual === 'concluidas') return item.status === 'revisado';
        return true;
    });
    const resultado = document.getElementById('revisoesResultado');
    if (resultado) resultado.textContent = pluralizar(visiveis.length, 'revisão', 'revisões');
    if (!visiveis.length) {
        const mensagens = {
            hoje: ['Nada para revisar hoje', 'Sua fila com data está em dia. As demais revisões continuam em Ativas.'],
            fracas: ['Nenhum assunto marcado como fraco', 'Quando uma revisão ainda não estiver firme, marque uma nova data.'],
            concluidas: ['Nenhuma revisão concluída', 'As revisões finalizadas aparecerão aqui.'],
            ativas: ['Sua fila ativa está vazia', 'Crie uma revisão quando um conteúdo precisar voltar ao foco.']
        };
        const mensagem = mensagens[filtroRevisoesAtual] || ['Nenhuma revisão neste filtro', 'Escolha outra visualização.'];
        lista.innerHTML = `<div class="workspace-empty"><b aria-hidden="true">✓</b><strong>${mensagem[0]}</strong><p>${mensagem[1]}</p><button type="button" class="cycle-btn" onclick="filtrarRevisoes('todas')">Ver todas</button></div>`;
        renderDashboardRevisoes();
        return;
    }

    lista.innerHTML = visiveis.map(item => {
        const estaAtrasada = atrasada(item);
        const revisado = item.status === 'revisado';
        const aindaFraco = item.status === 'fraco';
        const statusTexto = revisado ? 'Revisado' : (aindaFraco ? 'Revisado, mas ainda fraco' : (estaAtrasada ? 'Atrasado' : 'Pendente'));
        const statusClasse = revisado ? 'done' : (aindaFraco ? 'weak' : (estaAtrasada ? 'overdue' : ''));
        const dataTexto = item.dataAlvo ? new Date(`${item.dataAlvo}T12:00:00`).toLocaleDateString('pt-BR') : 'Sem data para revisar';
        const dataEstudoTexto = item.dataEstudo ? new Date(`${item.dataEstudo}T12:00:00`).toLocaleDateString('pt-BR') : '';
        const ultimaRevisaoTexto = item.ultimaRevisaoEm ? new Date(`${item.ultimaRevisaoEm}T12:00:00`).toLocaleDateString('pt-BR') : '';
        const origemTexto = item.origem === 'simulado' ? 'Veio do simulado' : 'Manual';
        const cor = revisado ? '#34c759' : (aindaFraco ? '#ff9500' : (estaAtrasada ? '#ff3b30' : 'var(--accent-color)'));
        const tagsHtml = (item.tags || []).map(tag => `<span class="revision-tag-chip small">${escaparRevisaoHtml(tag)}</span>`).join('');
        const datasExtras = `${dataEstudoTexto ? `<span class="revision-badge">Estudou: ${dataEstudoTexto}</span>` : ''}${ultimaRevisaoTexto ? `<span class="revision-badge">Última revisão: ${ultimaRevisaoTexto}</span>` : ''}`;
        const acoesDeFluxo = !revisado ? `<button class="cycle-btn" onclick="marcarRevisao(${item.id},'revisado')">Concluir revisão</button><button class="cycle-btn weak-action" onclick="abrirReagendamentoRevisao(${item.id})">Ainda está fraco</button>` : '';
        return `<article class="revision-card ${revisado ? 'reviewed' : ''}" style="--revision-color:${cor};"><div class="revision-card-main"><div class="revision-card-title">${escaparRevisaoHtml(item.materia)}</div><div class="revision-card-subject">${escaparRevisaoHtml(item.assunto)}</div>${tagsHtml ? `<div class="revision-tags-inline">${tagsHtml}</div>` : ''}<div class="revision-meta"><span class="revision-badge ${statusClasse}">${statusTexto}</span><span class="revision-badge">${origemTexto}</span><span class="revision-badge">Revisar: ${dataTexto}</span>${datasExtras}</div></div><div class="revision-actions">${acoesDeFluxo}<button class="cycle-btn" onclick="abrirModalRevisao(${item.id})">Editar</button><button class="cycle-btn revision-delete-btn" onclick="abrirModalDeletar('revisao', ${item.id}, 'Excluir revisão?', 'Esta revisão será removida da sua lista.')">Excluir</button></div></article>`;
    }).join('');
    renderDashboardRevisoes();
}

const CADERNO_ERROS_TIPOS = {
    conteudo: { nome: 'Lacuna de conteúdo', curto: 'Conteúdo', icone: '◇' },
    interpretacao: { nome: 'Interpretação', curto: 'Interpretação', icone: '⌕' },
    calculo: { nome: 'Cálculo ou execução', curto: 'Cálculo', icone: '±' },
    atencao: { nome: 'Atenção', curto: 'Atenção', icone: '!' },
    estrategia: { nome: 'Estratégia ou tempo', curto: 'Estratégia', icone: '⌁' }
};
const CADERNO_ERROS_INTERVALOS = [1, 3, 7, 14, 30];
const CADERNO_ERROS_MATERIAS = ['Matemática', 'Português', 'Literatura', 'Redação', 'Física', 'Química', 'Biologia', 'História', 'Geografia', 'Filosofia', 'Sociologia', 'Inglês', 'Espanhol'];
let cadernoErrosFiltros = { busca: '', materia: 'todas', tipo: 'todos', status: 'ativos' };
let cadernoErroEmRevisaoId = null;
let cadernoErroImagensRascunho = [];
let cadernoErroImagensOriginais = [];
const cadernoErroImagemCache = new Map();

function normalizarItemCadernoErro(item) {
    const agora = Date.now();
    const tipo = CADERNO_ERROS_TIPOS[item?.tipo] ? item.tipo : 'conteudo';
    const etapa = Math.max(0, Math.min(CADERNO_ERROS_INTERVALOS.length, Number(item?.etapaRevisao) || 0));
    const status = item?.status === 'dominado' || etapa >= CADERNO_ERROS_INTERVALOS.length ? 'dominado' : 'aprendendo';
    return {
        id: Number(item?.id) || agora,
        materia: String(item?.materia || 'Sem matéria').slice(0, 50),
        assunto: String(item?.assunto || 'Assunto não informado').slice(0, 80),
        origem: String(item?.origem || '').slice(0, 80),
        tipo,
        questao: String(item?.questao || '').slice(0, 1200),
        minhaResposta: String(item?.minhaResposta || '').slice(0, 700),
        respostaCorreta: String(item?.respostaCorreta || '').slice(0, 900),
        causa: String(item?.causa || '').slice(0, 500),
        regra: String(item?.regra || '').slice(0, 240),
        imagens: (Array.isArray(item?.imagens) ? item.imagens : []).filter(imagem => imagem?.id).slice(0, 4).map(imagem => ({
            id: String(imagem.id).replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 90),
            name: String(imagem.name || 'Imagem da questão').slice(0, 100),
            type: ['image/png', 'image/jpeg', 'image/webp'].includes(imagem.type) ? imagem.type : 'image/webp',
            width: Math.max(1, Math.min(2400, Number(imagem.width) || 1)),
            height: Math.max(1, Math.min(2400, Number(imagem.height) || 1))
        })).filter(imagem => imagem.id),
        etapaRevisao: etapa,
        proximaRevisao: status === 'dominado' ? '' : (item?.proximaRevisao || dataLocalISO()),
        status,
        revisoes: Math.max(0, Number(item?.revisoes) || 0),
        historicoRevisoes: Array.isArray(item?.historicoRevisoes) ? item.historicoRevisoes.slice(-12) : [],
        criadoEm: Number(item?.criadoEm) || agora,
        atualizadoEm: Number(item?.atualizadoEm) || Number(item?.criadoEm) || agora,
        ultimaRevisaoEm: Number(item?.ultimaRevisaoEm) || null
    };
}

function obterItensCadernoErros() {
    appData.cadernoErrosItems = (Array.isArray(appData.cadernoErrosItems) ? appData.cadernoErrosItems : []).map(normalizarItemCadernoErro);
    return appData.cadernoErrosItems;
}

function obterFilaErrosDevidos() {
    const hoje = dataLocalISO();
    return obterItensCadernoErros()
        .filter(item => item.status !== 'dominado' && (!item.proximaRevisao || item.proximaRevisao <= hoje))
        .sort((a, b) => (a.proximaRevisao || '').localeCompare(b.proximaRevisao || '') || a.etapaRevisao - b.etapaRevisao || a.atualizadoEm - b.atualizadoEm);
}

function dataCadernoErroComDias(dias) {
    const data = new Date();
    data.setHours(12, 0, 0, 0);
    data.setDate(data.getDate() + dias);
    return dataLocalISO(data);
}

function formatarDataCadernoErro(valor) {
    if (!valor) return 'Sem nova revisão';
    const data = dataISOParaLocal(valor);
    if (!data) return 'Data a definir';
    const hoje = dataISOParaLocal(dataLocalISO());
    const diferenca = Math.round((data - hoje) / 86400000);
    if (diferenca < 0) return `${Math.abs(diferenca)}d atrasada`;
    if (diferenca === 0) return 'Revisar hoje';
    if (diferenca === 1) return 'Revisar amanhã';
    return `Revisar em ${data.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }).replace('.', '')}`;
}

function definirStatusImagemCadernoErro(mensagem = '', erro = false) {
    const status = document.getElementById('errorImageStatus');
    if (!status) return;
    status.textContent = mensagem;
    status.classList.toggle('error', erro);
}

function identificadorImagemCadernoErro() {
    return `img_${crypto.randomUUID?.() || `${Date.now()}_${Math.random().toString(36).slice(2)}`}`.replace(/[^a-zA-Z0-9_-]/g, '');
}

function carregarArquivoImagem(file) {
    return new Promise((resolve, reject) => {
        const url = URL.createObjectURL(file);
        const imagem = new Image();
        imagem.onload = () => { URL.revokeObjectURL(url); resolve(imagem); };
        imagem.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Não foi possível ler uma das imagens.')); };
        imagem.src = url;
    });
}

async function otimizarImagemCadernoErro(file) {
    if (!file?.type?.startsWith('image/')) throw new Error('Selecione apenas imagens.');
    if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) throw new Error('Use imagens PNG, JPG ou WebP.');
    if (file.size > 12 * 1024 * 1024) throw new Error('Cada imagem pode ter no máximo 12 MB antes da otimização.');
    const imagem = await carregarArquivoImagem(file);
    const limite = 1800;
    let escala = Math.min(1, limite / Math.max(imagem.naturalWidth, imagem.naturalHeight));
    let largura = Math.max(1, Math.round(imagem.naturalWidth * escala));
    let altura = Math.max(1, Math.round(imagem.naturalHeight * escala));
    const canvas = document.createElement('canvas');
    const contexto = canvas.getContext('2d', { alpha: false });
    if (!contexto) throw new Error('Seu navegador não conseguiu preparar a imagem.');
    let qualidade = .88;
    let dataUrl = '';
    for (let tentativa = 0; tentativa < 8; tentativa += 1) {
        canvas.width = largura;
        canvas.height = altura;
        contexto.fillStyle = '#ffffff';
        contexto.fillRect(0, 0, largura, altura);
        contexto.drawImage(imagem, 0, 0, largura, altura);
        dataUrl = canvas.toDataURL('image/webp', qualidade);
        if (dataUrl.length <= 680000) break;
        largura = Math.max(480, Math.round(largura * .82));
        altura = Math.max(320, Math.round(altura * .82));
        qualidade = Math.max(.58, qualidade - .06);
    }
    if (!dataUrl || dataUrl.length > 680000) throw new Error('A imagem ficou grande demais. Recorte-a e tente novamente.');
    return { id: identificadorImagemCadernoErro(), name: file.name || 'Imagem da questão', type: 'image/webp', width: largura, height: altura, dataUrl, nova: true };
}

async function processarImagensCadernoErro(files) {
    const imagens = [...(files || [])].filter(file => file?.type?.startsWith('image/'));
    if (!imagens.length) return definirStatusImagemCadernoErro('Nenhuma imagem compatível foi encontrada.', true);
    const vagas = 4 - cadernoErroImagensRascunho.length;
    if (vagas <= 0) return definirStatusImagemCadernoErro('Você já anexou o limite de 4 imagens.', true);
    definirStatusImagemCadernoErro('Otimizando as imagens para a nuvem…');
    try {
        for (const file of imagens.slice(0, vagas)) cadernoErroImagensRascunho.push(await otimizarImagemCadernoErro(file));
        renderizarPreviaImagensCadernoErro();
        definirStatusImagemCadernoErro(`${Math.min(imagens.length, vagas)} ${Math.min(imagens.length, vagas) === 1 ? 'imagem pronta' : 'imagens prontas'} para salvar.`);
        if (imagens.length > vagas) showToast(`O limite é de 4 imagens por registro. ${imagens.length - vagas} não ${imagens.length - vagas === 1 ? 'foi adicionada' : 'foram adicionadas'}.`, true);
    } catch (error) {
        definirStatusImagemCadernoErro(error.message || 'Não foi possível preparar a imagem.', true);
    }
}

function selecionarImagensCadernoErro(event) {
    processarImagensCadernoErro(event.target.files);
    event.target.value = '';
}

function colarImagensCadernoErro(event) {
    const imagens = [...(event.clipboardData?.items || [])].filter(item => item.type.startsWith('image/')).map(item => item.getAsFile()).filter(Boolean);
    if (!imagens.length) return;
    event.preventDefault();
    processarImagensCadernoErro(imagens);
}

function prepararDropImagensCadernoErro(event) {
    event.preventDefault();
    event.currentTarget.classList.add('dragging');
}

function encerrarDropImagensCadernoErro(event) {
    if (!event.currentTarget.contains(event.relatedTarget)) event.currentTarget.classList.remove('dragging');
}

function receberDropImagensCadernoErro(event) {
    event.preventDefault();
    event.currentTarget.classList.remove('dragging');
    processarImagensCadernoErro(event.dataTransfer?.files);
}

function removerImagemCadernoErro(indice) {
    cadernoErroImagensRascunho.splice(Number(indice), 1);
    renderizarPreviaImagensCadernoErro();
    definirStatusImagemCadernoErro('Imagem retirada. A alteração será confirmada ao salvar.');
}

function criarBotaoImagemCadernoErro(imagem, indice = null, removivel = false) {
    const figura = document.createElement('figure');
    figura.className = 'error-image-thumb';
    const botao = document.createElement('button');
    botao.type = 'button';
    botao.className = 'error-image-open';
    botao.dataset.imageId = imagem.id;
    botao.setAttribute('aria-label', `Abrir ${imagem.name}`);
    botao.onclick = () => abrirImagemCadernoErro(imagem.id);
    const img = document.createElement('img');
    img.alt = imagem.name;
    img.loading = 'lazy';
    if (imagem.dataUrl) {
        img.src = imagem.dataUrl;
        botao.classList.add('loaded');
    }
    const placeholder = document.createElement('span');
    placeholder.className = 'error-image-placeholder';
    placeholder.textContent = '▧';
    botao.append(img, placeholder);
    const legenda = document.createElement('figcaption');
    legenda.textContent = imagem.name;
    figura.append(botao, legenda);
    if (removivel) {
        const remover = document.createElement('button');
        remover.type = 'button';
        remover.className = 'error-image-remove';
        remover.setAttribute('aria-label', `Remover ${imagem.name}`);
        remover.textContent = '×';
        remover.onclick = () => removerImagemCadernoErro(indice);
        figura.append(remover);
    }
    return figura;
}

function renderizarPreviaImagensCadernoErro() {
    const container = document.getElementById('errorImagePreview');
    const contador = document.getElementById('errorImageCounter');
    if (contador) contador.textContent = `${cadernoErroImagensRascunho.length}/4`;
    if (!container) return;
    container.replaceChildren(...cadernoErroImagensRascunho.map((imagem, indice) => criarBotaoImagemCadernoErro(imagem, indice, true)));
    carregarImagensCadernoErro(container);
}

async function obterImagemCadernoErro(imageId) {
    const rascunho = cadernoErroImagensRascunho.find(imagem => imagem.id === imageId && imagem.dataUrl);
    if (rascunho) return rascunho;
    if (cadernoErroImagemCache.has(imageId)) return cadernoErroImagemCache.get(imageId);
    if (!window.kingCloud?.getErrorImage) throw new Error('A nuvem de imagens ainda está sendo preparada.');
    const imagem = await window.kingCloud.getErrorImage(imageId);
    cadernoErroImagemCache.set(imageId, imagem);
    return imagem;
}

function carregarImagensCadernoErro(container = document) {
    container.querySelectorAll('.error-image-open:not(.loaded):not(.loading)').forEach(botao => {
        botao.classList.add('loading');
        obterImagemCadernoErro(botao.dataset.imageId).then(imagem => {
            const img = botao.querySelector('img');
            if (img) img.src = imagem.dataUrl;
            botao.classList.remove('loading');
            botao.classList.add('loaded');
        }).catch(() => {
            botao.classList.remove('loading');
            botao.classList.add('failed');
            const placeholder = botao.querySelector('.error-image-placeholder');
            if (placeholder) placeholder.textContent = '!';
        });
    });
}

async function abrirImagemCadernoErro(imageId) {
    const modal = document.getElementById('errorImageViewerModal');
    const conteudo = document.getElementById('errorImageViewerContent');
    const carregando = document.getElementById('errorImageViewerLoading');
    const legenda = document.getElementById('errorImageViewerCaption');
    if (!modal || !conteudo || !carregando || !legenda) return;
    modal.classList.add('active');
    conteudo.hidden = true;
    conteudo.removeAttribute('src');
    carregando.hidden = false;
    carregando.textContent = 'Carregando imagem…';
    legenda.textContent = '';
    try {
        const imagem = await obterImagemCadernoErro(imageId);
        conteudo.src = imagem.dataUrl;
        conteudo.alt = imagem.name;
        conteudo.hidden = false;
        carregando.hidden = true;
        legenda.textContent = imagem.name;
    } catch (error) {
        carregando.textContent = error.message || 'Não foi possível abrir a imagem.';
    }
}

function abrirModalCadernoErro(id = null) {
    const form = document.getElementById('errorNotebookForm');
    if (!form) return;
    form.reset();
    const item = id ? obterItensCadernoErros().find(registro => registro.id === Number(id)) : null;
    cadernoErroImagensRascunho = (item?.imagens || []).map(imagem => ({ ...imagem, nova: false }));
    cadernoErroImagensOriginais = (item?.imagens || []).map(imagem => imagem.id);
    definirStatusImagemCadernoErro('');
    renderizarPreviaImagensCadernoErro();
    document.getElementById('errorNotebookEditId').value = item?.id || '';
    document.getElementById('errorNotebookModalTitle').textContent = item ? 'Editar registro' : 'Registrar um erro';
    const materias = [...new Set([...CADERNO_ERROS_MATERIAS, ...appData.cycleItems.map(materia => materia.subject), ...obterItensCadernoErros().map(registro => registro.materia)].filter(Boolean))].sort((a, b) => a.localeCompare(b, 'pt-BR'));
    document.getElementById('errorSubjectOptions').innerHTML = materias.map(materia => `<option value="${escaparRevisaoHtml(materia)}"></option>`).join('');
    if (item) {
        document.getElementById('errorSubjectInput').value = item.materia;
        document.getElementById('errorTopicInput').value = item.assunto;
        document.getElementById('errorSourceInput').value = item.origem;
        document.getElementById('errorTypeInput').value = item.tipo;
        document.getElementById('errorQuestionInput').value = item.questao;
        document.getElementById('errorAttemptInput').value = item.minhaResposta;
        document.getElementById('errorCorrectInput').value = item.respostaCorreta;
        document.getElementById('errorCauseInput').value = item.causa;
        document.getElementById('errorRuleInput').value = item.regra;
    }
    document.getElementById('errorNotebookModal').classList.add('active');
    setTimeout(() => document.getElementById('errorSubjectInput')?.focus(), 80);
}

async function salvarCadernoErro(event) {
    event.preventDefault();
    const idEditado = Number(document.getElementById('errorNotebookEditId').value) || null;
    const idRegistro = idEditado || Date.now();
    const submit = document.querySelector('#errorNotebookForm button[type="submit"]');
    const dados = {
        materia: document.getElementById('errorSubjectInput').value.trim(),
        assunto: document.getElementById('errorTopicInput').value.trim(),
        origem: document.getElementById('errorSourceInput').value.trim(),
        tipo: document.getElementById('errorTypeInput').value,
        questao: document.getElementById('errorQuestionInput').value.trim(),
        minhaResposta: document.getElementById('errorAttemptInput').value.trim(),
        respostaCorreta: document.getElementById('errorCorrectInput').value.trim(),
        causa: document.getElementById('errorCauseInput').value.trim(),
        regra: document.getElementById('errorRuleInput').value.trim(),
        atualizadoEm: Date.now()
    };
    if (!dados.materia || !dados.assunto || !dados.questao || !dados.respostaCorreta || !dados.causa || !dados.regra) return;
    if (submit) { submit.disabled = true; submit.textContent = cadernoErroImagensRascunho.some(imagem => imagem.nova) ? 'Enviando imagens…' : 'Salvando…'; }
    try {
        const imagensSalvas = [];
        for (const imagem of cadernoErroImagensRascunho) {
            if (!imagem.nova) {
                imagensSalvas.push({ id: imagem.id, name: imagem.name, type: imagem.type, width: imagem.width, height: imagem.height });
                continue;
            }
            if (!window.kingCloud?.saveErrorImage) throw new Error('A nuvem de imagens ainda não está disponível. Aguarde um instante e tente novamente.');
            definirStatusImagemCadernoErro(`Enviando ${imagensSalvas.length + 1} de ${cadernoErroImagensRascunho.length}…`);
            const salva = await window.kingCloud.saveErrorImage({ ...imagem, errorId: idRegistro });
            imagensSalvas.push(salva);
            cadernoErroImagemCache.set(salva.id, { ...salva, dataUrl: imagem.dataUrl });
        }
        dados.imagens = imagensSalvas;
        if (idEditado) {
            const indice = obterItensCadernoErros().findIndex(item => item.id === idEditado);
            if (indice < 0) return;
            appData.cadernoErrosItems[indice] = normalizarItemCadernoErro({ ...appData.cadernoErrosItems[indice], ...dados });
        } else {
            appData.cadernoErrosItems.push(normalizarItemCadernoErro({ id: idRegistro, ...dados, etapaRevisao: 0, proximaRevisao: dataLocalISO(), status: 'aprendendo', criadoEm: Date.now() }));
        }
        saveAppData();
        const removidas = cadernoErroImagensOriginais.filter(imageId => !imagensSalvas.some(imagem => imagem.id === imageId));
        removidas.forEach(imageId => {
            cadernoErroImagemCache.delete(imageId);
            window.kingCloud?.deleteErrorImage?.(imageId).catch(() => {});
        });
        renderizarCadernoErros();
        fecharModal('errorNotebookModal');
        showToast(idEditado ? 'Registro atualizado.' : 'Erro guardado e pronto para revisão.');
    } catch (error) {
        definirStatusImagemCadernoErro(error.message || 'Não foi possível salvar as imagens.', true);
        showToast('Não foi possível salvar o registro com as imagens. Seus campos continuam aqui para tentar novamente.', true);
    } finally {
        if (submit) { submit.disabled = false; submit.textContent = 'Salvar no caderno'; }
    }
}

function atualizarFiltrosCadernoErros() {
    cadernoErrosFiltros = {
        busca: document.getElementById('errorSearchInput')?.value.trim() || '',
        materia: document.getElementById('errorSubjectFilter')?.value || 'todas',
        tipo: document.getElementById('errorTypeFilter')?.value || 'todos',
        status: document.getElementById('errorStatusFilter')?.value || 'ativos'
    };
    renderizarCadernoErros();
}

function htmlMiniaturasCadernoErro(imagens = [], contexto = 'card') {
    if (!imagens.length) return '';
    return `<div class="error-saved-images ${contexto}">${imagens.map(imagem => `<button type="button" class="error-image-open" data-image-id="${escaparRevisaoHtml(imagem.id)}" onclick="abrirImagemCadernoErro(this.dataset.imageId)" aria-label="Abrir ${escaparRevisaoHtml(imagem.name)}"><img alt="${escaparRevisaoHtml(imagem.name)}" loading="lazy"><span class="error-image-placeholder" aria-hidden="true">▧</span></button>`).join('')}</div>`;
}

function renderizarCadernoErros() {
    const lista = document.getElementById('errorNotebookList');
    if (!lista) return;
    const itens = obterItensCadernoErros();
    const devidos = obterFilaErrosDevidos();
    const ativos = itens.filter(item => item.status !== 'dominado');
    const dominados = itens.filter(item => item.status === 'dominado');
    const contagemTipos = itens.reduce((acc, item) => ({ ...acc, [item.tipo]: (acc[item.tipo] || 0) + 1 }), {});
    const tipoRecorrente = Object.entries(contagemTipos).sort((a, b) => b[1] - a[1])[0];

    document.getElementById('errorStatDue').textContent = devidos.length;
    document.getElementById('errorStatActive').textContent = ativos.length;
    document.getElementById('errorStatMastered').textContent = dominados.length;
    document.getElementById('errorReviewCountBadge').textContent = devidos.length;
    document.getElementById('errorStatPattern').textContent = tipoRecorrente ? CADERNO_ERROS_TIPOS[tipoRecorrente[0]].curto : '—';
    document.getElementById('errorStatPatternHint').textContent = tipoRecorrente ? `${tipoRecorrente[1]} ${tipoRecorrente[1] === 1 ? 'registro' : 'registros'} com essa causa` : 'registre para descobrir';

    const filtroMateria = document.getElementById('errorSubjectFilter');
    if (filtroMateria) {
        const valorAtual = cadernoErrosFiltros.materia;
        const materias = [...new Set(itens.map(item => item.materia).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'pt-BR'));
        filtroMateria.innerHTML = '<option value="todas">Todas as matérias</option>' + materias.map(materia => `<option value="${escaparRevisaoHtml(materia)}">${escaparRevisaoHtml(materia)}</option>`).join('');
        filtroMateria.value = materias.includes(valorAtual) ? valorAtual : 'todas';
        cadernoErrosFiltros.materia = filtroMateria.value;
    }

    const hoje = dataLocalISO();
    const busca = normalizarRevisaoTexto(cadernoErrosFiltros.busca);
    const filtrados = itens.filter(item => {
        const correspondeBusca = !busca || normalizarRevisaoTexto([item.materia, item.assunto, item.questao, item.causa, item.regra, item.origem].join(' ')).includes(busca);
        const correspondeMateria = cadernoErrosFiltros.materia === 'todas' || item.materia === cadernoErrosFiltros.materia;
        const correspondeTipo = cadernoErrosFiltros.tipo === 'todos' || item.tipo === cadernoErrosFiltros.tipo;
        const correspondeStatus = cadernoErrosFiltros.status === 'todos'
            || (cadernoErrosFiltros.status === 'ativos' && item.status !== 'dominado')
            || (cadernoErrosFiltros.status === 'dominados' && item.status === 'dominado')
            || (cadernoErrosFiltros.status === 'devidos' && item.status !== 'dominado' && (!item.proximaRevisao || item.proximaRevisao <= hoje));
        return correspondeBusca && correspondeMateria && correspondeTipo && correspondeStatus;
    }).sort((a, b) => {
        const prioridade = item => item.status === 'dominado' ? 3 : ((!item.proximaRevisao || item.proximaRevisao <= hoje) ? 0 : 1);
        return prioridade(a) - prioridade(b) || (a.proximaRevisao || '9999-12-31').localeCompare(b.proximaRevisao || '9999-12-31') || b.atualizadoEm - a.atualizadoEm;
    });

    document.getElementById('errorResultsCount').textContent = `${filtrados.length} ${filtrados.length === 1 ? 'registro' : 'registros'}`;
    if (!itens.length) {
        lista.innerHTML = '<div class="error-empty-state"><span aria-hidden="true">↯</span><h3>Seu primeiro erro pode virar seu próximo acerto</h3><p>Registre uma questão que te confundiu. O King Master transforma a correção em revisões curtas e espaçadas.</p><button type="button" class="cycle-btn primary" onclick="abrirModalCadernoErro()">Registrar primeiro erro</button></div>';
        return;
    }
    if (!filtrados.length) {
        lista.innerHTML = '<div class="error-empty-state compact"><span aria-hidden="true">⌕</span><h3>Nenhum registro encontrado</h3><p>Tente retirar um filtro ou buscar outro termo.</p><button type="button" class="cycle-btn" onclick="limparFiltrosCadernoErros()">Limpar filtros</button></div>';
        return;
    }

    lista.innerHTML = filtrados.map(item => {
        const tipo = CADERNO_ERROS_TIPOS[item.tipo];
        const dominado = item.status === 'dominado';
        const devido = !dominado && (!item.proximaRevisao || item.proximaRevisao <= hoje);
        const progresso = Array.from({ length: CADERNO_ERROS_INTERVALOS.length }, (_, indice) => `<i class="${indice < item.etapaRevisao ? 'done' : ''}"></i>`).join('');
        const origem = item.origem ? `<span class="error-card-source">${escaparRevisaoHtml(item.origem)}</span>` : '';
        const dataClasse = dominado ? 'mastered' : (devido ? 'due' : 'scheduled');
        const dataTexto = dominado ? 'Dominado' : formatarDataCadernoErro(item.proximaRevisao);
        const imagens = htmlMiniaturasCadernoErro(item.imagens, 'card');
        return `<article class="error-card ${dominado ? 'mastered' : ''}">
            <div class="error-card-rail"><span>${tipo.icone}</span></div>
            <div class="error-card-body">
                <div class="error-card-top"><div><span class="error-card-subject">${escaparRevisaoHtml(item.materia)}</span><i>•</i><span>${escaparRevisaoHtml(item.assunto)}</span></div><span class="error-card-date ${dataClasse}">${dataTexto}</span></div>
                <h3>${escaparRevisaoHtml(item.questao)}</h3>${imagens}
                <div class="error-card-diagnosis"><span><small>CAUSA</small>${escaparRevisaoHtml(item.causa)}</span><span><small>REGRA ANTI-ERRO</small>${escaparRevisaoHtml(item.regra)}</span></div>
                <div class="error-card-footer"><div><span class="error-type-chip">${tipo.nome}</span>${origem}<span class="error-memory-progress" title="${item.etapaRevisao} de ${CADERNO_ERROS_INTERVALOS.length} etapas concluídas">${progresso}</span></div><div class="error-card-actions"><button type="button" class="cycle-btn ${devido ? 'primary' : ''}" onclick="iniciarRevisaoCadernoErros(${item.id})">${dominado ? 'Treinar de novo' : 'Revisar'}</button><button type="button" class="cycle-btn" onclick="abrirModalCadernoErro(${item.id})">Editar</button><button type="button" class="error-card-delete" onclick="abrirModalDeletar('cadernoErro', ${item.id}, 'Excluir este erro?', 'O registro e todo o histórico de revisão serão removidos.')" aria-label="Excluir registro">×</button></div></div>
            </div>
        </article>`;
    }).join('');
    carregarImagensCadernoErro(lista);
}

function limparFiltrosCadernoErros() {
    const busca = document.getElementById('errorSearchInput');
    const materia = document.getElementById('errorSubjectFilter');
    const tipo = document.getElementById('errorTypeFilter');
    const status = document.getElementById('errorStatusFilter');
    if (busca) busca.value = '';
    if (materia) materia.value = 'todas';
    if (tipo) tipo.value = 'todos';
    if (status) status.value = 'ativos';
    cadernoErrosFiltros = { busca: '', materia: 'todas', tipo: 'todos', status: 'ativos' };
    renderizarCadernoErros();
}

function iniciarRevisaoCadernoErros(id = null) {
    const itens = obterItensCadernoErros();
    const fila = obterFilaErrosDevidos();
    const item = id ? itens.find(registro => registro.id === Number(id)) : fila[0];
    if (!item) return showToast('Sua fila está em dia. Volte quando houver uma revisão.', false);
    cadernoErroEmRevisaoId = item.id;
    const tipo = CADERNO_ERROS_TIPOS[item.tipo];
    const posicao = id ? 'REVISÃO LIVRE' : `1 DE ${fila.length} PARA HOJE`;
    document.getElementById('errorReviewPosition').textContent = posicao;
    document.getElementById('errorReviewStage').textContent = item.status === 'dominado' ? 'Treino de manutenção' : `Etapa ${Math.min(item.etapaRevisao + 1, CADERNO_ERROS_INTERVALOS.length)} de ${CADERNO_ERROS_INTERVALOS.length}`;
    document.getElementById('errorReviewSubject').textContent = item.materia;
    document.getElementById('errorReviewTopic').textContent = item.assunto;
    document.getElementById('errorReviewQuestion').textContent = item.questao;
    const imagensRevisao = document.getElementById('errorReviewImages');
    imagensRevisao.innerHTML = htmlMiniaturasCadernoErro(item.imagens, 'review');
    imagensRevisao.hidden = !item.imagens.length;
    carregarImagensCadernoErro(imagensRevisao);
    const tentativa = document.querySelector('#errorReviewPreviousAttempt p');
    tentativa.textContent = item.minhaResposta || 'Você não registrou uma resposta anterior.';
    document.getElementById('errorReviewCorrect').textContent = item.respostaCorreta;
    document.getElementById('errorReviewCause').textContent = `${tipo.nome}: ${item.causa}`;
    document.getElementById('errorReviewRule').textContent = item.regra;
    document.getElementById('errorRecallInput').value = '';
    document.getElementById('errorReviewAnswer').hidden = true;
    document.getElementById('errorRevealButton').hidden = false;
    document.getElementById('errorReviewModal').classList.add('active');
    setTimeout(() => document.getElementById('errorRecallInput')?.focus(), 80);
}

function revelarCorrecaoCadernoErro() {
    document.getElementById('errorRevealButton').hidden = true;
    document.getElementById('errorReviewAnswer').hidden = false;
    requestAnimationFrame(() => document.getElementById('errorReviewAnswer')?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }));
}

function avaliarRevisaoCadernoErro(resultado) {
    const item = obterItensCadernoErros().find(registro => registro.id === cadernoErroEmRevisaoId);
    if (!item || !['again', 'almost', 'remembered'].includes(resultado)) return;
    let dias = 1;
    if (resultado === 'again') {
        item.etapaRevisao = 0;
        item.status = 'aprendendo';
    } else if (resultado === 'almost') {
        item.etapaRevisao = Math.max(0, item.etapaRevisao - 1);
        item.status = 'aprendendo';
        dias = CADERNO_ERROS_INTERVALOS[item.etapaRevisao];
    } else {
        item.etapaRevisao = Math.min(CADERNO_ERROS_INTERVALOS.length, item.etapaRevisao + 1);
        item.status = item.etapaRevisao >= CADERNO_ERROS_INTERVALOS.length ? 'dominado' : 'aprendendo';
        dias = CADERNO_ERROS_INTERVALOS[Math.min(item.etapaRevisao, CADERNO_ERROS_INTERVALOS.length - 1)];
    }
    item.proximaRevisao = item.status === 'dominado' ? '' : dataCadernoErroComDias(dias);
    item.revisoes += 1;
    item.ultimaRevisaoEm = Date.now();
    item.atualizadoEm = Date.now();
    item.historicoRevisoes = [...item.historicoRevisoes, { em: Date.now(), resultado, etapa: item.etapaRevisao }].slice(-12);
    saveAppData();
    renderizarCadernoErros();

    const proximo = obterFilaErrosDevidos().find(registro => registro.id !== item.id);
    if (proximo) {
        iniciarRevisaoCadernoErros(proximo.id);
        showToast(resultado === 'remembered' ? 'Boa recuperação. Próximo registro.' : 'Diagnóstico salvo. Próximo registro.');
    } else {
        fecharModal('errorReviewModal');
        cadernoErroEmRevisaoId = null;
        showToast(item.status === 'dominado' ? '✓ Erro dominado após várias recuperações.' : `Próxima revisão: ${formatarDataCadernoErro(item.proximaRevisao)}.`);
    }
}

function abrirModalSimulado() {
    document.getElementById('formAddSimulado').reset();
    document.getElementById('simEditId').value = "";
    document.getElementById('simArea').value = "Linguagens, Códigos e suas Tecnologias";
    document.getElementById('simFileName').textContent = "Selecionar Arquivo do Computador";
    document.getElementById('simAttachmentData').value = "";
    document.getElementById('simuladoModalTitle').textContent = "Registrar simulado";
    document.getElementById('simDate').value = new Date().toISOString().split('T')[0];
    document.getElementById('simuladoModal').classList.add('active');
}

function editarSimulado(id) {
    const sim = appData.simuladosItems.find(i => i.id === id);
    if(sim) {
        document.getElementById('simEditId').value = sim.id;
        document.getElementById('simTitle').value = sim.title;
        document.getElementById('simDate').value = sim.date;
        document.getElementById('simTempo').value = sim.tempoMin;
        document.getElementById('simArea').value = sim.area || "Linguagens, Códigos e suas Tecnologias";
        document.getElementById('simTotal').value = sim.total || 45;
        document.getElementById('simAcertos').value = sim.acertos || 0;
        document.getElementById('simErros').value = sim.erros || 0;
        document.getElementById('simAttachmentData').value = sim.attachment || "";
        document.getElementById('simFileName').textContent = sim.attachment ? "Arquivo Anexado (Clique para trocar)" : "Selecionar Arquivo do Computador";
        document.getElementById('simuladoModalTitle').textContent = "Editar Desempenho";
        document.getElementById('simuladoModal').classList.add('active');
    }
}

function salvarSimulado(e) {
    e.preventDefault();
    const idEdit = document.getElementById('simEditId').value;
    const novoRegisto = !idEdit;
    const title = document.getElementById('simTitle').value;
    const date = document.getElementById('simDate').value;
    const tempoMin = parseInt(document.getElementById('simTempo').value) || 0;
    const area = document.getElementById('simArea').value;
    const total = parseInt(document.getElementById('simTotal').value) || 1;
    const acertos = parseInt(document.getElementById('simAcertos').value) || 0;
    const erros = parseInt(document.getElementById('simErros').value) || 0;
    const attachment = document.getElementById('simAttachmentData').value;

    if (acertos + erros > total) {
        return showToast('A soma de acertos e erros não pode ultrapassar o total de questões.', true);
    }

    if (idEdit) {
        const idx = appData.simuladosItems.findIndex(i => i.id == idEdit);
        if (idx > -1) appData.simuladosItems[idx] = { ...appData.simuladosItems[idx], title, date, tempoMin, area, total, acertos, erros, attachment };
    } else {
        appData.simuladosItems.push({ id: Date.now(), title, date, tempoMin, area, total, acertos, erros, attachment });
    }
    const revisaoCriada = novoRegisto ? criarRevisaoDoPiorSimulado() : false;
    saveAppData();
    renderizarSimulados();
    renderizarRevisoes();
    fecharModal('simuladoModal');
    showToast(revisaoCriada ? '🎯 Simulado salvo e revisão criada para a área mais fraca!' : '🎯 Simulado salvo!');
}

function filtrarSimulados(area = 'todas') {
    filtroSimuladosAtual = area || 'todas';
    renderizarSimulados();
}

function renderizarSimulados() {
    const list = document.getElementById('listaSimulados');
    const trend = document.getElementById('simuladosTrend');
    if (!list) return;
    const todos = Array.isArray(appData.simuladosItems) ? appData.simuladosItems : [];
    const areas = [...new Set(todos.map(item => item.area || 'Geral'))].sort((a, b) => a.localeCompare(b, 'pt-BR'));
    const seletor = document.getElementById('simuladoAreaFilter');
    if (seletor) {
        seletor.innerHTML = '<option value="todas">Todas as áreas</option>' + areas.map(area => `<option value="${escaparRevisaoHtml(area)}">${escaparRevisaoHtml(area)}</option>`).join('');
        if (!areas.includes(filtroSimuladosAtual)) filtroSimuladosAtual = 'todas';
        seletor.value = filtroSimuladosAtual;
    }

    const totalAcertos = todos.reduce((soma, item) => soma + (Number(item.acertos) || 0), 0);
    const totalQuestoes = todos.reduce((soma, item) => soma + (Number(item.total) || (Number(item.acertos) || 0) + (Number(item.erros) || 0)), 0);
    const totalTempo = todos.reduce((soma, item) => soma + (Number(item.tempoMin) || 0), 0);
    const areasMap = todos.reduce((mapa, item) => {
        const area = item.area || 'Geral';
        if (!mapa[area]) mapa[area] = { acertos: 0, total: 0 };
        mapa[area].acertos += Number(item.acertos) || 0;
        mapa[area].total += Number(item.total) || (Number(item.acertos) || 0) + (Number(item.erros) || 0);
        return mapa;
    }, {});
    const areasOrdenadas = Object.keys(areasMap).filter(area => areasMap[area].total > 0).sort((a, b) => (areasMap[b].acertos / areasMap[b].total) - (areasMap[a].acertos / areasMap[a].total));
    const forte = areasOrdenadas[0] || '-';
    const fraca = areasOrdenadas.at(-1) || '-';
    const tempoQuestao = totalQuestoes ? Math.round(totalTempo * 60 / totalQuestoes) : 0;
    document.getElementById('sim-media-acertos').textContent = totalQuestoes ? `${Math.round(totalAcertos / totalQuestoes * 100)}%` : '0%';
    document.getElementById('sim-tempo-questao').textContent = `${Math.floor(tempoQuestao / 60)}m ${String(tempoQuestao % 60).padStart(2, '0')}s`;
    document.getElementById('sim-ponto-forte').textContent = forte === '-' ? forte : forte.split(',')[0].split(' e ')[0];
    document.getElementById('sim-ponto-fraco').textContent = fraca === '-' ? fraca : fraca.split(',')[0].split(' e ')[0];
    appData.piorAreaGargalo = fraca === '-' ? null : fraca;

    const recentes = [...todos].sort((a, b) => new Date(a.date) - new Date(b.date)).slice(-6);
    if (trend) {
        trend.innerHTML = recentes.length ? recentes.map(item => {
            const total = Number(item.total) || (Number(item.acertos) || 0) + (Number(item.erros) || 0) || 1;
            const percentual = Math.round((Number(item.acertos) || 0) / total * 100);
            const data = dataISOParaLocal(item.date);
            return `<div class="trend-column" title="${escaparRevisaoHtml(item.title || 'Simulado')}: ${percentual}%"><strong>${percentual}%</strong><i style="height:${Math.max(4, percentual)}%"></i><small>${data ? data.toLocaleDateString('pt-BR', { day:'2-digit', month:'short' }).replace('.','') : '—'}</small></div>`;
        }).join('') : '<div class="workspace-empty"><strong>O gráfico aparece após o primeiro simulado</strong><p>Use os resultados para enxergar evolução, não para se comparar com outras pessoas.</p></div>';
    }
    const legenda = document.getElementById('simTrendCaption');
    if (legenda) {
        if (recentes.length < 2) legenda.textContent = recentes.length ? 'Primeiro registro' : 'Sem dados';
        else {
            const nota = item => Math.round((Number(item.acertos) || 0) / (Number(item.total) || (Number(item.acertos) || 0) + (Number(item.erros) || 0) || 1) * 100);
            const diferenca = nota(recentes.at(-1)) - nota(recentes.at(-2));
            legenda.textContent = diferenca === 0 ? 'Estável' : `${diferenca > 0 ? '+' : ''}${diferenca} p.p.`;
        }
    }

    const visiveis = [...todos].filter(item => filtroSimuladosAtual === 'todas' || (item.area || 'Geral') === filtroSimuladosAtual).sort((a, b) => new Date(b.date) - new Date(a.date));
    const resultado = document.getElementById('simuladosResultado');
    if (resultado) resultado.textContent = pluralizar(visiveis.length, 'simulado');
    if (!todos.length) {
        list.innerHTML = '<div class="workspace-empty"><b aria-hidden="true">◎</b><strong>Registre seu primeiro simulado</strong><p>Informe acertos, erros e tempo para descobrir sua tendência e o próximo foco.</p><button type="button" class="cycle-btn primary" onclick="abrirModalSimulado()">Registrar simulado</button></div>';
        return;
    }
    if (!visiveis.length) {
        list.innerHTML = '<div class="workspace-empty"><b aria-hidden="true">⌕</b><strong>Nenhum simulado nesta área</strong><p>Escolha outra área para consultar os resultados.</p><button type="button" class="cycle-btn" onclick="filtrarSimulados(\'todas\')">Ver todos</button></div>';
        return;
    }
    list.innerHTML = visiveis.map(sim => {
        const acertos = Number(sim.acertos) || 0;
        const erros = Number(sim.erros) || 0;
        const total = Number(sim.total) || acertos + erros || 1;
        const percentual = Math.round(acertos / total * 100);
        const cor = percentual >= 70 ? '#34c759' : (percentual >= 50 ? '#ff9500' : '#ff3b30');
        const segundosQuestao = Math.floor((Number(sim.tempoMin) || 0) * 60 / total);
        const titulo = escaparRevisaoHtml(sim.title || 'Simulado');
        const area = escaparRevisaoHtml(sim.area || 'Geral');
        const data = dataISOParaLocal(sim.date);
        const anexo = anexoSeguro(sim.attachment);
        return `<article class="agenda-card result-card" style="--urgency-color:${cor};"><div class="result-card-header"><div class="result-card-title"><h3>${titulo}</h3><p>${area} • ${data ? data.toLocaleDateString('pt-BR') : 'Sem data'} • ${formatShortTime((Number(sim.tempoMin) || 0) * 60)}</p></div><div class="result-score">${percentual}%</div></div><div class="result-card-metrics"><div><small>Questões</small><strong>${total}</strong></div><div><small>Acertos</small><strong style="color:#34c759">${acertos}</strong></div><div><small>Erros</small><strong style="color:#ff3b30">${erros}</strong></div><div><small>Por questão</small><strong>${Math.floor(segundosQuestao / 60)}m${String(segundosQuestao % 60).padStart(2,'0')}s</strong></div></div><div class="result-card-actions">${anexo ? `<a class="attachment-link" href="${anexo}" download="${titulo}_anexo">↗ Ver anexo</a>` : '<span></span>'}<div><button type="button" class="workspace-icon-button" onclick="editarSimulado(${sim.id})" aria-label="Editar ${titulo}" title="Editar">✎</button><button type="button" class="workspace-icon-button danger" onclick="abrirModalDeletar('simulado', ${sim.id}, 'Apagar simulado?', 'O desempenho será eliminado.')" aria-label="Apagar ${titulo}" title="Apagar">×</button></div></div></article>`;
    }).join('');
}

function abrirModalRedacao() {
    document.getElementById('formAddRedacao').reset();
    document.getElementById('redEditId').value = "";
    document.getElementById('redFileName').textContent = "Selecionar Arquivo do Computador";
    document.getElementById('redAttachmentData').value = "";
    document.getElementById('redacaoModalTitle').textContent = "Registrar redação";
    document.getElementById('redDate').value = new Date().toISOString().split('T')[0];
    document.getElementById('redacaoModal').classList.add('active');
}

function editarRedacao(id) {
    const item = appData.redacaoItems.find(i => i.id === id);
    if(item) {
        document.getElementById('redEditId').value = item.id;
        document.getElementById('redTheme').value = item.theme;
        document.getElementById('redDate').value = item.date;
        document.getElementById('redC1').value = item.c1;
        document.getElementById('redC2').value = item.c2;
        document.getElementById('redC3').value = item.c3;
        document.getElementById('redC4').value = item.c4;
        document.getElementById('redC5').value = item.c5;
        document.getElementById('redAttachmentData').value = item.attachment || "";
        document.getElementById('redFileName').textContent = item.attachment ? "Arquivo Anexado (Clique para trocar)" : "Selecionar Arquivo do Computador";
        document.getElementById('redacaoModalTitle').textContent = "Editar Redação";
        document.getElementById('redacaoModal').classList.add('active');
    }
}

function salvarRedacao(e) {
    e.preventDefault();
    const idEdit = document.getElementById('redEditId').value;
    const theme = document.getElementById('redTheme').value;
    const date = document.getElementById('redDate').value;
    const c1 = parseInt(document.getElementById('redC1').value) || 0;
    const c2 = parseInt(document.getElementById('redC2').value) || 0;
    const c3 = parseInt(document.getElementById('redC3').value) || 0;
    const c4 = parseInt(document.getElementById('redC4').value) || 0;
    const c5 = parseInt(document.getElementById('redC5').value) || 0;
    const attachment = document.getElementById('redAttachmentData').value;

    if (idEdit) {
        const idx = appData.redacaoItems.findIndex(i => i.id == idEdit);
        if (idx > -1) appData.redacaoItems[idx] = { ...appData.redacaoItems[idx], theme, date, c1, c2, c3, c4, c5, attachment, aguardandoCorrecao: false };
    } else {
        appData.redacaoItems.push({ id: Date.now(), theme, date, c1, c2, c3, c4, c5, attachment, aguardandoCorrecao: false });
    }
    saveAppData(); renderizarRedacoes(); fecharModal('redacaoModal'); showToast('✍️ Redação salva!');
}

function renderizarRedacoes() {
    const list = document.getElementById('listaRedacoes');
    if (!list) return;

    const itens = [...(Array.isArray(appData.redacaoItems) ? appData.redacaoItems : [])].sort((a, b) => new Date(b.date) - new Date(a.date));
    const competencias = [
        { chave: 'c1', sigla: 'C1', nome: 'Escrita' },
        { chave: 'c2', sigla: 'C2', nome: 'Tema' },
        { chave: 'c3', sigla: 'C3', nome: 'Ideias' },
        { chave: 'c4', sigla: 'C4', nome: 'Coesão' },
        { chave: 'c5', sigla: 'C5', nome: 'Intervenção' }
    ];
    const totalDaRedacao = redacao => competencias.reduce((soma, competencia) => soma + (Number(redacao[competencia.chave]) || 0), 0);
    const corrigidas = itens.filter(item => !item.aguardandoCorrecao);
    const medias = competencias.map(competencia => ({ ...competencia, media: corrigidas.length ? Math.round(corrigidas.reduce((soma, item) => soma + (Number(item[competencia.chave]) || 0), 0) / corrigidas.length) : 0 }));
    const mediaGlobal = corrigidas.length ? Math.round(corrigidas.reduce((soma, item) => soma + totalDaRedacao(item), 0) / corrigidas.length) : 0;
    const ordenadas = [...medias].sort((a, b) => b.media - a.media);
    document.getElementById('red-media').textContent = mediaGlobal;
    document.getElementById('red-forte').textContent = corrigidas.length ? ordenadas[0].sigla : '-';
    document.getElementById('red-gargalo').textContent = corrigidas.length ? ordenadas.at(-1).sigla : '-';
    const resultado = document.getElementById('redacoesResultado');
    if (resultado) resultado.textContent = pluralizar(itens.length, 'redação', 'redações');

    const graficoCompetencias = document.getElementById('redCompetencyChart');
    if (graficoCompetencias) {
        graficoCompetencias.innerHTML = corrigidas.length ? medias.map(competencia => {
            const percentual = Math.round(competencia.media / 200 * 100);
            const cor = percentual >= 75 ? '#34c759' : (percentual >= 55 ? 'var(--accent-color)' : '#ff9500');
            return `<div class="competency-row" title="${competencia.sigla} — ${competencia.nome}: ${competencia.media} de 200"><b>${competencia.sigla}</b><div class="competency-track"><i style="width:${percentual}%;--competency-color:${cor}"></i></div><span>${competencia.media}/200</span></div>`;
        }).join('') : '<div class="workspace-empty"><strong>As competências aparecem aqui</strong><p>Cadastre uma redação corrigida com as notas C1 a C5.</p></div>';
    }

    const recentes = [...corrigidas].reverse().slice(-6);
    const tendencia = document.getElementById('redacoesTrend');
    if (tendencia) {
        tendencia.innerHTML = recentes.length ? recentes.map(redacao => {
            const total = totalDaRedacao(redacao);
            const data = dataISOParaLocal(redacao.date);
            return `<div class="trend-column" title="${escaparRevisaoHtml(redacao.theme || 'Redação')}: ${total} pontos"><strong>${total}</strong><i style="height:${Math.max(4, Math.round(total / 10))}%"></i><small>${data ? data.toLocaleDateString('pt-BR', { day:'2-digit', month:'short' }).replace('.','') : '—'}</small></div>`;
        }).join('') : '<div class="workspace-empty"><strong>O gráfico aparece após a primeira correção</strong><p>Cada nova redação ajuda a revelar sua tendência.</p></div>';
    }
    const legenda = document.getElementById('redTrendCaption');
    if (legenda) {
        if (recentes.length < 2) legenda.textContent = recentes.length ? 'Primeiro texto' : 'Sem dados';
        else {
            const diferenca = totalDaRedacao(recentes.at(-1)) - totalDaRedacao(recentes.at(-2));
            legenda.textContent = diferenca === 0 ? 'Estável' : `${diferenca > 0 ? '+' : ''}${diferenca} pontos`;
        }
    }

    if (!itens.length) {
        list.innerHTML = '<div class="workspace-empty"><b aria-hidden="true">✎</b><strong>Registre sua primeira redação corrigida</strong><p>As notas por competência vão mostrar com clareza onde manter e onde melhorar.</p><button type="button" class="cycle-btn primary" onclick="abrirModalRedacao()">Registrar redação</button></div>';
        return;
    }

    list.innerHTML = itens.map(redacao => {
        const total = totalDaRedacao(redacao);
        const pendente = Boolean(redacao.aguardandoCorrecao);
        const cor = total >= 900 ? '#34c759' : (total >= 700 ? '#ff9500' : '#ff3b30');
        const tema = escaparRevisaoHtml(redacao.theme || 'Redação sem tema');
        const data = dataISOParaLocal(redacao.date);
        const anexo = anexoSeguro(redacao.attachment);
        return `<article class="agenda-card result-card" style="--urgency-color:${pendente ? 'var(--accent-color)' : cor};"><div class="result-card-header"><div class="result-card-title"><h3>${tema}</h3><p>${data ? data.toLocaleDateString('pt-BR') : 'Sem data'}</p></div><div class="result-score${pendente ? ' pending' : ''}">${pendente ? 'Aguardando correção' : total}</div></div>${pendente ? '<p class="result-pending-note">Quando receber as notas, edite este registro para completar C1 a C5.</p>' : `<div class="result-card-metrics five">${competencias.map(competencia => `<div><small>${competencia.sigla}</small><strong>${Number(redacao[competencia.chave]) || 0}</strong></div>`).join('')}</div>`}<div class="result-card-actions">${anexo ? `<a class="attachment-link" href="${anexo}" download="${tema}_redacao">↗ Ver arquivo</a>` : '<span></span>'}<div><button type="button" class="workspace-icon-button" onclick="editarRedacao(${redacao.id})" aria-label="Editar ${tema}" title="Editar">✎</button><button type="button" class="workspace-icon-button danger" onclick="abrirModalDeletar('redacao', ${redacao.id}, 'Apagar redação?', 'O registro será eliminado.')" aria-label="Apagar ${tema}" title="Apagar">×</button></div></div></article>`;
    }).join('');
}

// ==========================================
// SISTEMA DE UPLOAD DE ARQUIVOS (BASE64)
// ==========================================
function handleFileSelect(e, labelId, hiddenDataId) {
    const file = e.target.files[0];
    if(!file) return;
    
    if(file.size > 2 * 1024 * 1024) {
        showToast('⚠️ Arquivo muito grande! Por favor, escolha um arquivo menor que 2MB.', true);
        e.target.value = '';
        return;
    }

    document.getElementById(labelId).textContent = file.name;
    const reader = new FileReader();
    reader.onload = function(event) {
        document.getElementById(hiddenDataId).value = event.target.result;
    };
    reader.readAsDataURL(file);
}

function alternarAbasHub(aba) {
    const ciclo = aba === 'ciclo';
    const painelCiclo = document.getElementById('aba-ciclo-content');
    const painelDominio = document.getElementById('aba-dominio-content');
    const tabCiclo = document.getElementById('tab-ciclo');
    const tabDominio = document.getElementById('tab-dominio');
    if (!painelCiclo || !painelDominio || !tabCiclo || !tabDominio) return;
    painelCiclo.hidden = !ciclo;
    painelDominio.hidden = ciclo;
    tabCiclo.setAttribute('aria-selected', String(ciclo));
    tabDominio.setAttribute('aria-selected', String(!ciclo));
    tabCiclo.tabIndex = ciclo ? 0 : -1;
    tabDominio.tabIndex = ciclo ? -1 : 0;
    if (!ciclo) renderizarMapaDominio();
}

function navegarAbasHub(event) {
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
    const abas = [...event.currentTarget.querySelectorAll('[role="tab"]')];
    const atual = Math.max(0, abas.indexOf(document.activeElement));
    let proxima = event.key === 'Home' ? 0 : (event.key === 'End' ? abas.length - 1 : (atual + (event.key === 'ArrowRight' ? 1 : -1) + abas.length) % abas.length);
    event.preventDefault();
    abas[proxima].focus();
    alternarAbasHub(abas[proxima].id === 'tab-ciclo' ? 'ciclo' : 'dominio');
}

function toggleMapaCard(id) {
    const corpo = document.getElementById(`mapa-body-${id}`);
    const botao = document.querySelector(`[data-mapa-toggle="${id}"]`);
    if (!corpo) return;
    const aberto = corpo.classList.toggle('open');
    botao?.setAttribute('aria-expanded', String(aberto));
}

function toggleTopicoDominio(materiaId, topicoIndex, etapa) {
    const materia = appData.cycleItems.find(item => item.id === materiaId);
    if (!materia?.topicos?.[topicoIndex]) return;
    const topico = materia.topicos[topicoIndex];
    if (!topico.dominio) topico.dominio = { teoria: false, pratica: false, dominio: false };
    topico.dominio[etapa] = !topico.dominio[etapa];
    if (etapa === 'dominio') topico.concluido = topico.dominio[etapa];
    saveAppData();
    renderizarMapaDominio();
    renderizarCiclo();
}

function renderizarMapaDominio() {
    const container = document.getElementById('mapaContainer');
    if (!container) return;
    let total = 0, completos = 0;
    if (!appData.cycleItems.length) {
        container.innerHTML = '<div class="workspace-empty"><b aria-hidden="true">◎</b><strong>Seu mapa ainda está vazio</strong><p>Adicione uma matéria e seus tópicos para acompanhar teoria, prática e domínio.</p><button type="button" class="cycle-btn primary" onclick="alternarAbasHub(\'ciclo\');abrirModalCiclo()">Adicionar matéria</button></div>';
        document.getElementById('global-mapa-pct').textContent = '0%';
        return;
    }
    container.innerHTML = appData.cycleItems.map(materia => {
        const topicos = materia.topicos || [];
        total += topicos.length;
        const concluidos = topicos.filter(t => t.concluido || t.dominio?.dominio).length;
        completos += concluidos;
        const pct = topicos.length ? Math.round(concluidos / topicos.length * 100) : 0;
        const linhas = topicos.length ? topicos.map((topico, index) => {
            const d = topico.dominio || {};
            const cor = corSegura(materia.color);
            const nome = escaparRevisaoHtml(topico.nome || 'Tópico');
            return `<div class="mapa-topic-row"><span class="mapa-topic-name">${nome}</span><div class="mapa-tpd-group" aria-label="Progresso de ${nome}"><button type="button" class="tpd-btn ${d.teoria ? 'active' : ''}" style="${d.teoria ? `background:${cor}` : ''}" onclick="toggleTopicoDominio(${materia.id},${index},'teoria')" aria-pressed="${Boolean(d.teoria)}" title="Teoria estudada">T</button><button type="button" class="tpd-btn ${d.pratica ? 'active' : ''}" style="${d.pratica ? `background:${cor}` : ''}" onclick="toggleTopicoDominio(${materia.id},${index},'pratica')" aria-pressed="${Boolean(d.pratica)}" title="Prática realizada">P</button><button type="button" class="tpd-btn ${d.dominio ? 'active' : ''}" style="${d.dominio ? `background:${cor}` : ''}" onclick="toggleTopicoDominio(${materia.id},${index},'dominio')" aria-pressed="${Boolean(d.dominio)}" title="Tópico dominado">D</button></div></div>`;
        }).join('') : '<div class="workspace-empty"><strong>Nenhum tópico nesta matéria</strong><p>Abra a matéria e adicione o primeiro tópico.</p></div>';
        const cor = corSegura(materia.color);
        const nomeMateria = escaparRevisaoHtml(materia.subject || 'Matéria');
        return `<article class="mapa-card"><button type="button" class="mapa-card-toggle" data-mapa-toggle="${materia.id}" aria-expanded="true" aria-controls="mapa-body-${materia.id}" onclick="toggleMapaCard(${materia.id})"><div class="mapa-title-area"><div class="mapa-title">${nomeMateria}</div><div class="mapa-progress-bg"><div class="mapa-progress-fill" style="width:${pct}%;background:${cor}"></div></div></div><span class="mapa-pct">${pct}%</span><span class="mapa-arrow" aria-hidden="true">⌃</span></button><div class="mapa-body open" id="mapa-body-${materia.id}">${linhas}</div></article>`;
    }).join('');
    document.getElementById('global-mapa-pct').textContent = total ? `${Math.round(completos / total * 100)}%` : '0%';
}

document.addEventListener('keydown', event => {
    if (event.key !== 'Escape') return;
    document.querySelectorAll('.modal-overlay.active').forEach(modal => {
        if (modal.dataset.keepOpen === 'true') adiarRegistroSessao();
        else modal.classList.remove('active');
    });
    if (document.getElementById('settingsPanel')?.classList.contains('active')) toggleSettings();
});
document.querySelectorAll('.modal-overlay').forEach(overlay => overlay.addEventListener('mousedown', event => {
    if (event.target === overlay && overlay.dataset.keepOpen !== 'true') overlay.classList.remove('active');
}));

// INICIALIZAÇÃO DO APP
(() => {
    const nav = document.getElementById('mainNavigation');
    const handle = document.getElementById('navReveal');
    let hideTimer;
    const open = () => {
        clearTimeout(hideTimer);
        nav.classList.add('is-revealed');
        handle.setAttribute('aria-expanded', 'true');
    };
    const close = () => {
        if (document.getElementById('settingsPanel')?.classList.contains('active')) {
            open();
            return;
        }
        nav.classList.remove('is-revealed');
        handle.setAttribute('aria-expanded', 'false');
    };
    const leave = () => { hideTimer = setTimeout(() => { if (!nav.matches(':hover,:focus-within') && !handle.matches(':hover,:focus')) close(); }, 220); };
    handle.addEventListener('pointerenter', open);
    handle.addEventListener('click', () => { open(); nav.querySelector('.menu-btn')?.focus(); });
    handle.addEventListener('pointerleave', leave);
    handle.addEventListener('blur', leave);
    nav.addEventListener('pointerenter', open);
    nav.addEventListener('focusin', open);
    nav.addEventListener('pointerleave', () => {
        // Cliques de mouse não devem prender a barra aberta pelo foco residual.
        if (nav.contains(document.activeElement) && document.activeElement.matches(':focus:not(:focus-visible)')) document.activeElement.blur();
        leave();
    });
    nav.addEventListener('focusout', leave);
    document.addEventListener('keydown', event => { if (event.key === 'Escape' && nav.classList.contains('is-revealed')) { handle.focus(); close(); } });
    document.querySelector('main')?.addEventListener('pointerdown', close);
})();
fecharModalDeletar(); 
syncVisualModeControl();
syncSettingsUI();
registrarBonusLoginDiario();
updateDashboardStats(); 
sincronizarModoPatente();
sincronizarCadeadoXp();
renderizarAtalhosXpTeste();
mostrarFraseMotivacional();
renderizarCiclo();
restoreTimerSession();
renderizarAgenda();
renderizarAgendamento();
renderizarRevisoes();
renderizarCadernoErros();
renderizarSimulados();
renderizarRedacoes();
atualizarIndicadoresNavegacao();
const secaoInicial = sessionStorage.getItem('kingMasterActiveSection');
showSection(document.getElementById(secaoInicial)?.classList.contains('content-section') ? secaoInicial : 'dashboard');
