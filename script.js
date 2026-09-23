const XP_LAB_SESSION_KEY = 'kingMasterXpLabUnlocked';
let XP_LAB_ATIVO = sessionStorage.getItem(XP_LAB_SESSION_KEY) === 'true';
document.documentElement.dataset.xpLab = String(XP_LAB_ATIVO);

const REVISAO_MOTIVOS = {
    'errei-questao': 'Errei questão',
    'nao-entendi': 'Não entendi',
    'demorei': 'Demorei demais',
    'interpretacao': 'Problema de interpretação',
    'esqueci-conceito': 'Esqueci conceito',
    'esqueci-formula': 'Esqueci fórmula',
    'erro-calculo': 'Erro de cálculo',
    'reforcar': 'Quero reforçar'
};

const defaultAppData = {
    totalStudySeconds: 0, 
    weeklyChart: [0, 0, 0, 0, 0, 0, 0], 
    cycleItems: [], 
    historyItems: [], 
    agendaItems: [], 
    agendamentoItems: [],
    calendarDeletedIds: [],
    simuladosItems: [],
    redacaoItems: [],
    revisoesItems: [],
    revisaoTags: [],
    cadernoErrosItems: [],
    quickNotes: [],
    quickNoteBooks: [],
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
    profileBanner: '',
    xpResetOffset: 0,
    selectedFrames: { militar: '', aura: '' },
    frameVaultOpen: false,
    onboardingCompleted: false,
    accessibility: { fontScale: 'normal', highContrast: false, dyslexiaMode: false, motionMode: 'auto' },
    studyLogging: { autoReview: true, reviewDelayDays: 1 },
    studySchedule: { settings: { startTime: '14:00', studyDays: [1, 2, 3, 4, 5, 6], dailyCapacityMinutes: 240, blockMinutes: 50, pauseMinutes: 15, closingMinutes: 5, maxSubjectsPerDay: 2 }, weeks: {}, suggestions: [] },
    personalDevelopment: {
        commitment: '',
        checkins: {},
        spaces: [],
        version: 2
    },
    activeScheduleBlock: null,
    aiSettings: { retentionDays: 7 },
    aiConversation: [],
    pendingStudySession: null,
    pendingStudySessions: [],
    resolvedStudySessionIds: [],
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
if (!Array.isArray(appData.calendarDeletedIds)) appData.calendarDeletedIds = [];
if (!appData.simuladosItems) appData.simuladosItems = [];
if (!appData.redacaoItems) appData.redacaoItems = [];
if (!Array.isArray(appData.revisoesItems)) appData.revisoesItems = [];
if (!Array.isArray(appData.quickNotes)) appData.quickNotes = [];
if (!Array.isArray(appData.quickNoteBooks)) appData.quickNoteBooks = [];
if (appData.quickNotes.some(nota => !nota.bookId)) {
    const legacyId = 'notas-anteriores';
    if (!appData.quickNoteBooks.some(caderno => caderno.id === legacyId)) appData.quickNoteBooks.push({ id: legacyId, title: 'Anotações anteriores', createdAt: Date.now() });
    appData.quickNotes.forEach(nota => { if (!nota.bookId) { nota.bookId = legacyId; nota.title = String(nota.title || nota.text || 'Anotação').split('\n')[0].slice(0, 80); } });
}
appData.revisoesItems = appData.revisoesItems.map(normalizarItemRevisao);
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
if (typeof appData.profileBanner !== 'string') appData.profileBanner = '';
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
if (!appData.studySchedule || typeof appData.studySchedule !== 'object') appData.studySchedule = { ...defaultAppData.studySchedule };
if (!appData.studySchedule.settings || typeof appData.studySchedule.settings !== 'object') appData.studySchedule.settings = { ...defaultAppData.studySchedule.settings };
appData.studySchedule.settings = { ...defaultAppData.studySchedule.settings, ...appData.studySchedule.settings };
if (!appData.studySchedule.weeks || typeof appData.studySchedule.weeks !== 'object' || Array.isArray(appData.studySchedule.weeks)) appData.studySchedule.weeks = {};
if (!Array.isArray(appData.studySchedule.suggestions)) appData.studySchedule.suggestions = [];
if (!appData.personalDevelopment || typeof appData.personalDevelopment !== 'object') appData.personalDevelopment = { ...defaultAppData.personalDevelopment };
appData.personalDevelopment = { ...defaultAppData.personalDevelopment, ...appData.personalDevelopment };
if (!appData.personalDevelopment.checkins || typeof appData.personalDevelopment.checkins !== 'object' || Array.isArray(appData.personalDevelopment.checkins)) appData.personalDevelopment.checkins = {};
appData.personalDevelopment.commitment = String(appData.personalDevelopment.commitment || '').slice(0, 280);
if (!Array.isArray(appData.personalDevelopment.spaces)) appData.personalDevelopment.spaces = [];
if (!appData.activeScheduleBlock || typeof appData.activeScheduleBlock !== 'object') appData.activeScheduleBlock = null;
if (!appData.aiSettings || typeof appData.aiSettings !== 'object') appData.aiSettings = { ...defaultAppData.aiSettings };
appData.aiSettings = { ...defaultAppData.aiSettings, ...appData.aiSettings };
appData.aiSettings.retentionDays = [1, 7, 30].includes(Number(appData.aiSettings.retentionDays)) ? Number(appData.aiSettings.retentionDays) : 7;
if (!Array.isArray(appData.aiConversation)) appData.aiConversation = [];
if (!appData.pendingStudySession || typeof appData.pendingStudySession !== 'object') appData.pendingStudySession = null;
if (!Array.isArray(appData.pendingStudySessions)) appData.pendingStudySessions = [];
if (!Array.isArray(appData.resolvedStudySessionIds)) appData.resolvedStudySessionIds = [];
appData.resolvedStudySessionIds = appData.resolvedStudySessionIds.map(String).filter(Boolean).slice(-40);
const sessoesPendentesMigradas = [...appData.pendingStudySessions, ...(appData.pendingStudySession ? [appData.pendingStudySession] : [])];
appData.pendingStudySessions = sessoesPendentesMigradas.filter((pendente, indice, lista) => {
    if (!pendente || Number(pendente.seconds) < 5) return false;
    const materiaPendente = appData.cycleItems.find(item => String(item.id) === String(pendente.subjectId));
    const duplicadaPorId = pendente.id && (appData.resolvedStudySessionIds.includes(String(pendente.id))
        || appData.historyItems.some(item => String(item.sourceSessionId || '') === String(pendente.id)));
    const criadaEm = Number(pendente.createdAt || 0);
    const duplicadaLegada = !pendente.id && criadaEm > 0 && appData.historyItems.some(item => {
        const idHistorico = Number(item.id || 0);
        const mesmaDuracao = Math.abs(Number(item.tempoSegundos || 0) - Number(pendente.seconds || 0)) < 1;
        const mesmaMateria = String(item.materia || '').trim().toLocaleLowerCase('pt-BR') === String(materiaPendente?.subject || 'Sem matéria').trim().toLocaleLowerCase('pt-BR');
        return mesmaDuracao && mesmaMateria && idHistorico >= criadaEm && idHistorico - criadaEm < 6 * 60 * 60 * 1000;
    });
    const id = String(pendente.id || `legado-${pendente.createdAt || indice}`);
    const repetidaNaFila = lista.findIndex(item => String(item?.id || '') === id) !== indice;
    return !duplicadaPorId && !duplicadaLegada && !repetidaNaFila;
}).map(pendente => ({ ...pendente, id: String(pendente.id || `sessao-legada-${pendente.createdAt || Date.now()}`) }));
appData.pendingStudySession = appData.pendingStudySessions[0] || null;
if (!appData.reminder || typeof appData.reminder !== 'object') appData.reminder = { ...defaultAppData.reminder };
appData.reminder = { ...defaultAppData.reminder, ...appData.reminder };
if (!Number.isFinite(Number(appData.lastModifiedAt))) appData.lastModifiedAt = 0;

if(appData.darkMode) document.documentElement.setAttribute('data-theme', 'dark');
document.documentElement.setAttribute('data-visual', appData.visualMode === 'classic' ? 'classic' : 'futuristic');
document.documentElement.setAttribute('data-rank-mode', appData.rankVisualMode);
aplicarCorDoSistema(appData.themeColor || '#007aff');

function saveAppData() { 
    sincronizarFilaSessoesPendentes();
    if (timerPersistenceReady) appData.timerState = captureTimerState();
    const previousRevision = appData.lastModifiedAt;
    appData.lastModifiedAt = Date.now();
    try { localStorage.setItem('qg_pedro_data', JSON.stringify(appData)); }
    catch (error) { appData.lastModifiedAt = previousRevision; persistTimerCheckpoint(); throw error; }
    window.dispatchEvent(new CustomEvent('king-master-data-changed', { detail: { updatedAt: appData.lastModifiedAt } }));
    if (timerPersistenceReady) persistTimerCheckpoint();
    updateDashboardStats(); 
    atualizarIndicadoresNavegacao();
    window.KingPersonalDevelopment?.render?.();
}

let cadernoNotaAtivoId = '';
function renderizarNotasRapidas() {
    const listaCadernos = document.getElementById('quickNoteBooksList');
    const listaNotas = document.getElementById('quickNotesList');
    if (!listaCadernos || !listaNotas) return;
    const cadernos = appData.quickNoteBooks || [];
    if (!cadernos.some(caderno => caderno.id === cadernoNotaAtivoId)) cadernoNotaAtivoId = cadernos[0]?.id || '';
    listaCadernos.innerHTML = cadernos.length ? cadernos.map(caderno => {
        const count = appData.quickNotes.filter(nota => nota.bookId === caderno.id).length;
        return `<button type="button" class="quick-book-tab${caderno.id === cadernoNotaAtivoId ? ' active' : ''}" onclick="selecionarCadernoNota('${caderno.id}')" aria-current="${caderno.id === cadernoNotaAtivoId ? 'true' : 'false'}"><strong>${escaparRevisaoHtml(caderno.title)}</strong><small>${count} ${count === 1 ? 'anotação' : 'anotações'}</small></button>`;
    }).join('') : '<p class="quick-notes-empty">Nenhum tópico ainda. Crie o primeiro acima.</p>';
    const caderno = cadernos.find(item => item.id === cadernoNotaAtivoId);
    document.getElementById('quickNoteWorkspace').hidden = !caderno;
    document.getElementById('notesNoTopic').hidden = !!caderno;
    if (!caderno) { listaNotas.innerHTML = ''; return; }
    document.getElementById('quickBookCurrentTitle').textContent = caderno.title;
    const notas = appData.quickNotes.filter(nota => nota.bookId === caderno.id).sort((a, b) => (b.updatedAt || b.createdAt) - (a.updatedAt || a.createdAt));
    document.getElementById('quickBookNoteCount').textContent = `${notas.length} ${notas.length === 1 ? 'anotação' : 'anotações'}`;
    listaNotas.innerHTML = notas.length ? notas.map(nota => `<article class="quick-note-item"><div><span>${new Date(nota.createdAt).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}${nota.subject ? ` · ${escaparRevisaoHtml(nota.subject)}` : ''}</span>${nota.title ? `<h3>${escaparRevisaoHtml(nota.title)}</h3>` : ''}${nota.text ? `<p>${escaparRevisaoHtml(nota.text)}</p>` : ''}</div><div class="quick-note-item-actions"><button type="button" onclick="editarNotaRapida('${nota.id}')" aria-label="Editar anotação" title="Editar anotação">✎</button><button type="button" onclick="excluirNotaRapida('${nota.id}')" aria-label="Excluir anotação" title="Excluir anotação">×</button></div></article>`).join('') : '<p class="quick-notes-empty">Nenhuma anotação neste tópico. Escreva a primeira acima.</p>';
}
function abrirNotasRapidas() {
    showSection('notas');
    setTimeout(() => document.getElementById(cadernoNotaAtivoId ? 'quickNoteTitle' : 'quickBookName')?.focus(), 50);
}
function selecionarCadernoNota(id) {
    if (!appData.quickNoteBooks.some(caderno => caderno.id === id)) return;
    if (document.getElementById('quickNoteTitle').value.trim() || document.getElementById('quickNoteText').value.trim()) {
        if (!confirm('Trocar de tópico e descartar a anotação que ainda não foi salva?')) return;
    }
    cancelarEdicaoNotaRapida();
    cadernoNotaAtivoId = id;
    renderizarNotasRapidas();
}
function cancelarEdicaoCadernoNota() {
    document.getElementById('quickNoteBookForm').reset();
    document.getElementById('quickBookEditId').value = '';
    document.getElementById('quickBookSaveButton').textContent = 'Criar tópico';
    document.getElementById('quickBookCancelButton').hidden = true;
}
function salvarCadernoNota(event) {
    event.preventDefault();
    const title = document.getElementById('quickBookName').value.trim();
    const editId = document.getElementById('quickBookEditId').value;
    if (!title) return;
    if (appData.quickNoteBooks.some(caderno => caderno.id !== editId && caderno.title.toLocaleLowerCase('pt-BR') === title.toLocaleLowerCase('pt-BR'))) return showToast('Já existe um tópico com esse nome.', true);
    const previous = JSON.parse(JSON.stringify(appData.quickNoteBooks));
    if (editId) {
        const caderno = appData.quickNoteBooks.find(item => item.id === editId);
        if (caderno) caderno.title = title;
    } else {
        cadernoNotaAtivoId = `caderno-${crypto.randomUUID()}`;
        appData.quickNoteBooks.push({ id: cadernoNotaAtivoId, title, createdAt: Date.now() });
    }
    try { saveAppData(); cancelarEdicaoCadernoNota(); renderizarNotasRapidas(); document.getElementById('quickNoteTitle').focus(); }
    catch { appData.quickNoteBooks = previous; renderizarNotasRapidas(); showToast('Não foi possível salvar o tópico.', true); }
}
function editarCadernoNota() {
    const caderno = appData.quickNoteBooks.find(item => item.id === cadernoNotaAtivoId);
    if (!caderno) return;
    document.getElementById('quickBookEditId').value = caderno.id;
    document.getElementById('quickBookName').value = caderno.title;
    document.getElementById('quickBookSaveButton').textContent = 'Salvar nome';
    document.getElementById('quickBookCancelButton').hidden = false;
    document.getElementById('quickBookName').focus();
}
function excluirCadernoNota() {
    const caderno = appData.quickNoteBooks.find(item => item.id === cadernoNotaAtivoId);
    if (!caderno || !confirm(`Apagar o tópico “${caderno.title}” e todas as anotações dele?`)) return;
    const previousBooks = appData.quickNoteBooks;
    const previousNotes = appData.quickNotes;
    appData.quickNoteBooks = previousBooks.filter(item => item.id !== caderno.id);
    appData.quickNotes = previousNotes.filter(item => item.bookId !== caderno.id);
    try { saveAppData(); cadernoNotaAtivoId = ''; cancelarEdicaoNotaRapida(); cancelarEdicaoCadernoNota(); renderizarNotasRapidas(); }
    catch { appData.quickNoteBooks = previousBooks; appData.quickNotes = previousNotes; showToast('Não foi possível apagar o tópico.', true); }
}
function cancelarEdicaoNotaRapida() {
    document.getElementById('quickNotesForm').reset();
    document.getElementById('quickNoteEditId').value = '';
    document.getElementById('quickNoteSaveButton').textContent = 'Adicionar anotação';
    document.getElementById('quickNoteCancelButton').hidden = true;
}
function editarNotaRapida(id) {
    const nota = appData.quickNotes.find(item => item.id === id && item.bookId === cadernoNotaAtivoId);
    if (!nota) return;
    document.getElementById('quickNoteEditId').value = nota.id;
    document.getElementById('quickNoteTitle').value = nota.title || '';
    document.getElementById('quickNoteText').value = nota.text || '';
    document.getElementById('quickNoteSaveButton').textContent = 'Salvar anotação';
    document.getElementById('quickNoteCancelButton').hidden = false;
    document.getElementById('quickNoteTitle').focus();
}
function salvarNotaRapida(event) {
    event.preventDefault();
    if (!appData.quickNoteBooks.some(item => item.id === cadernoNotaAtivoId)) return;
    const title = document.getElementById('quickNoteTitle').value.trim();
    const text = document.getElementById('quickNoteText').value.trim();
    const editId = document.getElementById('quickNoteEditId').value;
    if (!text) return showToast('Escreva a anotação antes de salvar.', true);
    const previous = JSON.parse(JSON.stringify(appData.quickNotes));
    if (editId) {
        const nota = appData.quickNotes.find(item => item.id === editId && item.bookId === cadernoNotaAtivoId);
        if (!nota) return;
        Object.assign(nota, { title, text, updatedAt: Date.now() });
    } else {
        appData.quickNotes.push({ id: `nota-${crypto.randomUUID()}`, bookId: cadernoNotaAtivoId, title, text, subject: '', createdAt: Date.now() });
    }
    try { saveAppData(); cancelarEdicaoNotaRapida(); renderizarNotasRapidas(); showToast('Anotação salva.'); }
    catch { appData.quickNotes = previous; showToast('Não foi possível guardar a anotação. Copie o texto antes de fechar.', true); }
}
function excluirNotaRapida(id) {
    if (!confirm('Excluir esta anotação?')) return;
    const previous = appData.quickNotes;
    appData.quickNotes = previous.filter(nota => nota.id !== id);
    try { saveAppData(); if (document.getElementById('quickNoteEditId').value === id) cancelarEdicaoNotaRapida(); renderizarNotasRapidas(); }
    catch { appData.quickNotes = previous; showToast('Não foi possível excluir a anotação.', true); }
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
    if (document.getElementById('topic-workspace')?.classList.contains('active') && sectionId !== 'topic-workspace') {
        salvarCadernoPendente();
        salvarContextoEspacoTopico();
    }
    if (sectionId === 'topic-workspace' && !localizarEspacoTopico().topico) {
        document.getElementById('topicNavSlot').hidden = true;
        sessionStorage.removeItem('kingMasterOpenTopic');
        sectionId = 'planejamento';
    }
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
    const secoesDock = new Set(['dashboard', 'planejamento', 'cronograma', 'revisoes']);
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
    window.scrollTo({ top: 0, behavior: 'auto' });
    
    if(sectionId === 'historico') renderizarHistorico();
    if(sectionId === 'planejamento') renderizarCiclo();
    if(sectionId === 'topic-workspace') renderizarEspacoTopico();
    if(sectionId === 'escola-provas') renderizarAgenda();
    if(sectionId === 'agendamento') renderizarAgendamento();
    if(sectionId === 'cronograma') window.KingSchedule?.render();
    if(sectionId === 'revisoes') renderizarRevisoes();
    if(sectionId === 'caderno-erros') renderizarCadernoErros();
    if(sectionId === 'simulados') renderizarSimulados();
    if(sectionId === 'redacao') renderizarRedacoes();
    if(sectionId === 'perfil') renderGamificacao();
    if(sectionId === 'desenvolvimento') window.KingPersonalDevelopment?.render?.();
    if(sectionId === 'notas') renderizarNotasRapidas();
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
    document.querySelectorAll('.theme-circle').forEach(button => {
        button.setAttribute('aria-pressed', String(normalizarCorCss(button.style.backgroundColor) === String(appData.themeColor || '#007aff').toLowerCase()));
    });
}

function normalizarCorCss(cor) {
    const partes = String(cor).match(/\d+/g);
    return partes?.length >= 3 ? `#${partes.slice(0, 3).map(valor => Number(valor).toString(16).padStart(2, '0')).join('')}` : String(cor).toLowerCase();
}

function aplicarCorDoSistema(hex) {
    const limpa = String(hex || '#007aff').replace('#', '').padEnd(6, '0').slice(0, 6);
    const componentes = [0, 2, 4].map(indice => Number.parseInt(limpa.slice(indice, indice + 2), 16));
    if (componentes.some(Number.isNaN)) return aplicarCorDoSistema('#007aff');
    const [r, g, b] = componentes;
    const misturar = (cor, destino, peso) => Math.round(cor * (1 - peso) + destino * peso);
    const paraHex = valores => `#${valores.map(valor => Math.max(0, Math.min(255, valor)).toString(16).padStart(2, '0')).join('')}`;
    const luminancia = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
    const raiz = document.documentElement.style;
    raiz.setProperty('--accent-color', `#${limpa}`);
    raiz.setProperty('--accent-rgb', `${r}, ${g}, ${b}`);
    raiz.setProperty('--accent-ink-light', paraHex(componentes.map(cor => misturar(cor, 0, luminancia > .42 ? .48 : .2))));
    raiz.setProperty('--accent-ink-dark', paraHex(componentes.map(cor => misturar(cor, 255, luminancia < .62 ? .38 : .12))));
    raiz.setProperty('--accent-on-solid', luminancia > .67 ? '#10141c' : '#ffffff');
    return `${r}, ${g}, ${b}`;
}

function previewTheme(hex) { 
    aplicarCorDoSistema(hex);
}

function setTheme(hex, rgb) { 
    const corRgb = aplicarCorDoSistema(hex);
    appData.themeColor = hex; 
    appData.themeColorRgb = corRgb || rgb;
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

function abrirModalDeletar(tipo, id, titulo, msg, rotuloAcao = 'Apagar', perigoso = true) {
    itemToDelete = id; 
    deleteType = tipo; 
    document.getElementById('deleteConfirmTitle').textContent = titulo; 
    document.getElementById('deleteConfirmMessage').textContent = msg; 
    const botao = document.getElementById('deleteConfirmAction');
    if (botao) {
        botao.textContent = rotuloAcao;
        botao.classList.toggle('btn-danger', perigoso);
        botao.classList.toggle('primary', !perigoso);
    }
    document.getElementById('deleteConfirmModal').classList.add('active'); 
}

function fecharModalDeletar() { 
    fecharModal('deleteConfirmModal'); 
    const botao = document.getElementById('deleteConfirmAction');
    if (botao) { botao.textContent = 'Apagar'; botao.classList.add('btn-danger'); botao.classList.remove('primary'); }
    itemToDelete = null; 
    deleteType = ''; 
}

function descontarSessoesDosTotais(sessoes = []) {
    const removido = sessoes.reduce((total, item) => total + Math.max(0, Number(item?.tempoSegundos) || 0), 0);
    appData.totalStudySeconds = Math.max(0, Number(appData.totalStudySeconds || 0) - removido);
    sessoes.forEach(item => {
        const dataISO = dataHistoricoISO(item);
        const data = dataISOParaLocal(dataISO);
        if (!data || getMonday(data) !== appData.lastWeekStart) return;
        const indice = data.getDay() === 0 ? 6 : data.getDay() - 1;
        appData.weeklyChart[indice] = Math.max(0, Number(appData.weeklyChart[indice] || 0) - Math.max(0, Number(item.tempoSegundos) || 0));
    });
    return removido;
}

function renomearMateriaNosRegistros(nomeAnterior, nomeNovo) {
    const antiga = normalizarRevisaoTexto(nomeAnterior);
    if (!antiga || antiga === normalizarRevisaoTexto(nomeNovo)) return;
    appData.historyItems.forEach(item => { if (normalizarRevisaoTexto(item.materia) === antiga) item.materia = nomeNovo; });
    appData.revisoesItems.forEach(item => { if (normalizarRevisaoTexto(item.materia) === antiga) item.materia = nomeNovo; });
    appData.cadernoErrosItems.forEach(item => { if (normalizarRevisaoTexto(item.materia) === antiga) item.materia = nomeNovo; });
}

function removerMateriaComRegistros(id) {
    const materia = appData.cycleItems.find(item => item.id === id);
    if (!materia) return false;
    if (String(cadernoCapituloAtual.materiaId) === String(id)) fecharCadernosDominio();
    const chave = normalizarRevisaoTexto(materia.subject);
    const sessoesRemovidas = appData.historyItems.filter(item => normalizarRevisaoTexto(item.materia) === chave);
    appData.historyItems = appData.historyItems.filter(item => normalizarRevisaoTexto(item.materia) !== chave);
    descontarSessoesDosTotais(sessoesRemovidas);
    const revisoesRemovidas = appData.revisoesItems.filter(item => normalizarRevisaoTexto(item.materia) === chave);
    appData.revisoesItems = appData.revisoesItems.filter(item => normalizarRevisaoTexto(item.materia) !== chave);
    revisoesRemovidas.forEach(item => { if (item.imagem?.id) window.kingCloud?.deleteReviewImage?.(item.imagem.id).catch(() => {}); });
    appData.pendingStudySessions = (appData.pendingStudySessions || []).map(sessao => String(sessao.subjectId) === String(id) ? { ...sessao, subjectId: '' } : sessao);
    if (String(appData.pendingStudySession?.subjectId || '') === String(id)) appData.pendingStudySession = { ...appData.pendingStudySession, subjectId: '' };
    if (String(document.getElementById('activeSubjectSelect')?.value || '') === String(id)) document.getElementById('activeSubjectSelect').value = '';
    appData.cycleItems = appData.cycleItems.filter(item => item.id !== id);
    return true;
}

function confirmarDelecao() {
    const tipo = deleteType; 
    const id = itemToDelete;
    fecharModalDeletar(); 
    
    if (tipo === 'chapterPage') {
        excluirPaginaCaderno(id);
    }
    else if (tipo === 'personalSpace' || tipo === 'personalItem' || tipo === 'personalNote') {
        window.KingPersonalDevelopment?.confirmDelete?.(tipo, id);
    }
    else if (tipo === 'cycle') {
        window.KingSchedule?.removeSubject(id);
        if (!removerMateriaComRegistros(id)) return;
        saveAppData(); renderizarCiclo(); renderizarHistorico(); renderizarRevisoes(); atualizarSeletorDeMaterias();
        showToast('Matéria e registros relacionados foram removidos.');
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
        window.KingSchedule?.clearSubjects();
        appData.cycleItems.map(item => item.id).forEach(removerMateriaComRegistros);
        saveAppData(); renderizarCiclo(); renderizarHistorico(); renderizarRevisoes(); atualizarSeletorDeMaterias();
        showToast('Matérias e registros relacionados foram removidos.');
    }
    else if (tipo === 'agenda') { 
        appData.agendaItems = appData.agendaItems.filter(i => i.id !== id); 
        saveAppData(); renderizarAgenda(); 
        showToast('🗑️ Agendamento removido!'); 
    }
    else if (tipo === 'agendamentoTab') { 
        if (appData.agendamentoItems.some(i => i.id === id)) appData.calendarDeletedIds.push(String(id));
        appData.agendamentoItems = appData.agendamentoItems.filter(i => i.id !== id); 
        saveAppData(); renderizarAgendamento(); 
        window.kingCalendar?.syncIfConnected();
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
        const removida = appData.revisoesItems.find(i => i.id === id);
        appData.revisoesItems = appData.revisoesItems.filter(i => i.id !== id);
        if (removida?.imagem?.id) window.kingCloud?.deleteReviewImage?.(removida.imagem.id).catch(() => {});
        saveAppData(); renderizarRevisoes();
        showToast('Revisão removida da caixa.');
    }
    else if (tipo === 'revisaoTag') {
        appData.revisaoTags = appData.revisaoTags.filter(tag => tag !== id);
        appData.revisoesItems.forEach(revisao => revisao.tags = (revisao.tags || []).filter(tag => tag !== id));
        saveAppData();
        cancelarEdicaoTagRevisao();
        renderGerenciadorTagsRevisao();
        renderTagsRevisaoSelecionaveis(obterTagsSelecionadasFormulario().filter(tag => tag !== id));
        renderizarRevisoes();
        showToast('Tag excluída das revisões.');
    }
    else if (tipo === 'topico') {
        const [materiaId, topicoIndice] = String(id).split(':').map(Number);
        deletarTopico(materiaId, topicoIndice);
    }
    else if (tipo === 'repeatTopicStudy') {
        const [materiaId, topicoIndice] = String(id).split(':').map(Number);
        registrarTopicoEstudado(materiaId, topicoIndice);
    }
    else if (tipo === 'topicReview') {
        const [materiaId, topicoIndice] = String(id).split(':').map(Number);
        removerRevisaoTopico(materiaId, topicoIndice);
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
    else if (tipo === 'pendingSession') confirmarDescarteRegistroSessao(id);
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

function reconciliarHistoricoComMateriasAtuais() {
    let tiposAntigosRemovidos = 0;
    appData.cycleItems = appData.cycleItems.map(item => {
        if (!item) return item;
        const materia = { ...item };
        if (Object.prototype.hasOwnProperty.call(materia, 'type')) { delete materia.type; tiposAntigosRemovidos++; }
        if (Array.isArray(materia.topicos)) materia.topicos = materia.topicos.map(topico => {
            if (!topico || typeof topico !== 'object') return topico;
            const atualizado = { ...topico };
            if (!Number.isInteger(Number(atualizado.nivelDominio))) {
                atualizado.nivelDominio = atualizado.dominio?.dominio ? 3 : (atualizado.dominio?.pratica ? 2 : (atualizado.dominio?.teoria || atualizado.vezesEstudado ? 1 : 0));
                tiposAntigosRemovidos++;
            }
            if (Object.prototype.hasOwnProperty.call(atualizado, 'dominio')) { delete atualizado.dominio; tiposAntigosRemovidos++; }
            atualizado.nivelDominio = Math.max(0, Math.min(3, Number(atualizado.nivelDominio) || 0));
            atualizado.concluido = atualizado.nivelDominio === 3;
            return atualizado;
        });
        return materia;
    });
    const materiasAtuais = new Set(appData.cycleItems.map(item => normalizarRevisaoTexto(item.subject)).filter(Boolean));
    const semMateria = new Set(['estudo livre', 'livre', 'sem materia', 'sem matéria']);
    const removidas = [];
    let normalizadas = 0;
    appData.historyItems = appData.historyItems.filter(item => {
        const chave = normalizarRevisaoTexto(item?.materia);
        if (semMateria.has(chave) || !chave) {
            if (item.materia !== 'Sem matéria' || item.tipo === 'Livre') normalizadas++;
            item.materia = 'Sem matéria';
            if (!item.tipo || item.tipo === 'Livre') item.tipo = 'Estudo';
            return true;
        }
        if (materiasAtuais.has(chave)) return true;
        removidas.push(item);
        return false;
    });
    if (removidas.length) descontarSessoesDosTotais(removidas);
    if (!removidas.length && !normalizadas && !tiposAntigosRemovidos) return false;
    appData.lastModifiedAt = Date.now();
    try { localStorage.setItem('qg_pedro_data', JSON.stringify(appData)); } catch { /* A interface ainda ignora os órfãos nesta execução. */ }
    return true;
}

reconciliarHistoricoComMateriasAtuais();

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
    const banner = document.getElementById('profileBannerImage');
    const bannerCard = document.getElementById('profileIdentityCover');
    const bannerSource = appData.profileBanner || appData.profilePhoto || '';
    if (banner) {
        if (bannerSource) {
            banner.src = bannerSource;
            banner.classList.add('has-banner');
        } else {
            banner.removeAttribute('src');
            banner.classList.remove('has-banner');
        }
    }
    bannerCard?.classList.toggle('has-banner', Boolean(bannerSource));
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

function alterarBannerPerfil(event) {
    const input = event.target;
    const arquivo = input.files?.[0];
    if (!arquivo) return;
    if (!arquivo.type.startsWith('image/') || arquivo.size > 15 * 1024 * 1024) {
        showToast(arquivo.size > 15 * 1024 * 1024 ? 'O banner deve ter no máximo 15 MB.' : 'Escolha uma imagem válida.', true);
        input.value = '';
        return;
    }
    const enderecoTemporario = URL.createObjectURL(arquivo);
    const imagemOriginal = new Image();
    imagemOriginal.onload = () => {
        const proporcao = 1280 / 420;
        let origemX = 0, origemY = 0, largura = imagemOriginal.naturalWidth, altura = imagemOriginal.naturalHeight;
        if (largura / altura > proporcao) {
            largura = altura * proporcao;
            origemX = (imagemOriginal.naturalWidth - largura) / 2;
        } else {
            altura = largura / proporcao;
            origemY = (imagemOriginal.naturalHeight - altura) / 2;
        }
        const canvas = document.createElement('canvas');
        canvas.width = 1280;
        canvas.height = 420;
        canvas.getContext('2d').drawImage(imagemOriginal, origemX, origemY, largura, altura, 0, 0, canvas.width, canvas.height);
        appData.profileBanner = canvas.toDataURL('image/jpeg', 0.76);
        saveAppData();
        aplicarFotoPerfil();
        showToast('✓ Banner atualizado e salvo na sua conta');
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
const alarmAudio = document.getElementById('alarmAudio'), stopAlarmBtn = document.getElementById('stopAlarmBtn'), timerGoalActions = document.getElementById('timerGoalActions'), timeDisplay = document.getElementById('timeDisplay'), playPauseBtn = document.getElementById('playPauseBtn'), progressRing = document.getElementById('progressRing'), circ = 2 * Math.PI * 135;
if(progressRing) progressRing.style.strokeDasharray = circ;

const getTargetSeconds = () => currentMode === 'descanso' ? descansoTempoAtual * 60 : ((parseInt(document.getElementById('inputHours').value) || 0) * 3600) + ((parseInt(document.getElementById('inputMinutes').value) || 0) * 60) + (parseInt(document.getElementById('inputSeconds').value) || 0);
const sincronizarTempo = () => { if (!isRunning) updateProgress(); if (timerPersistenceReady) persistTimerCheckpoint(); };

function captureTimerState() {
    return { mode: currentMode, seconds: currentSeconds, running: isRunning,
        lastTickAt: isRunning ? lastTickTime : 0, goalNotified: alarmTriggered,
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
    let retomado = false;
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
        alarmTriggered = Boolean(saved.goalNotified);
        if (saved.running && Number(saved.lastTickAt) > 0) {
            const agora = Date.now();
            const desde = Math.min(agora, Number(saved.lastTickAt));
            const segundosAusente = Math.max(0, Math.floor((agora - desde) / 1000));
            if (currentMode === 'estudo' && segundosAusente) {
                currentSeconds += segundosAusente;
                window.KingTimerRecovery.creditStudy(appData, desde, desde + segundosAusente * 1000);
            } else if (currentMode === 'descanso' && segundosAusente) currentSeconds = Math.max(0, currentSeconds - segundosAusente);
            lastTickTime = agora;
            isRunning = currentMode === 'estudo' || currentSeconds > 0;
            retomado = isRunning;
            if (retomado) {
                timerInterval = setInterval(tickTimer, 500);
                playPauseBtn.innerHTML = '&#10074;&#10074;';
                const target = getTargetSeconds();
                if (currentMode === 'estudo' && target > 0 && currentSeconds >= target && !alarmTriggered) {
                    alarmTriggered = true;
                    triggerAlarm();
                    notificarMetaTimer();
                }
                showToast('⏱ Cronômetro retomado com o tempo passado fora do app.');
            }
        } else if (currentSeconds > 0) showToast('⏱ Sessão recuperada e pausada. Aperte ▶ para continuar.');
    }
    if (!retomado) isRunning = false;
    timerPersistenceReady = true;
    updateProgress();
    toggleBotaoStopHistorico();
    if (retomado) { try { saveAppData(); } catch { persistTimerCheckpoint(); } }
    else persistTimerCheckpoint();
    renderizarAvisoSessaoPendente();
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

function renderizarAvisoSessaoPendente() {
    const card = document.getElementById('pendingSessionCard');
    if (!card) return;
    const fila = sincronizarFilaSessoesPendentes();
    const pendente = fila[0];
    card.hidden = !(pendente && Number(pendente.seconds) >= 5);
    const titulo = card.querySelector?.('strong');
    const detalhe = card.querySelector?.('small');
    if (titulo && pendente) titulo.textContent = fila.length === 1 ? 'Existe uma sessão protegida' : `${fila.length} sessões protegidas`;
    if (detalhe && pendente) detalhe.textContent = `${formatHistoryTime(pendente.seconds)} aguardando registro${fila.length > 1 ? ` · mais ${fila.length - 1} na fila` : ''}.`;
}

function sincronizarFilaSessoesPendentes() {
    const fila = Array.isArray(appData.pendingStudySessions) ? appData.pendingStudySessions : [];
    const vistos = new Set();
    appData.pendingStudySessions = fila.filter(sessao => {
        const id = String(sessao?.id || '');
        if (!id || vistos.has(id) || Number(sessao?.seconds) < 5 || appData.resolvedStudySessionIds?.includes(id)) return false;
        vistos.add(id);
        return true;
    });
    appData.pendingStudySession = appData.pendingStudySessions[0] || null;
    return appData.pendingStudySessions;
}

function obterSessaoPendenteAtual() {
    return sincronizarFilaSessoesPendentes()[0] || null;
}

function removerSessaoPendente(id) {
    const alvo = String(id || '');
    appData.pendingStudySessions = sincronizarFilaSessoesPendentes().filter(sessao => String(sessao.id) !== alvo);
    appData.pendingStudySession = appData.pendingStudySessions[0] || null;
}

function dataFuturaRegistro(dias = 1) {
    const data = new Date();
    data.setHours(12, 0, 0, 0);
    data.setDate(data.getDate() + Math.max(1, Number(dias) || 1));
    return dataLocalISO(data);
}

function criarRevisaoAutomaticaRegistro(materia, assunto, dias = 1, origem = 'sessao-automatica') {
    const materiaSegura = String(materia || 'Sem matéria').trim();
    const assuntoSeguro = String(assunto || '').trim();
    if (!assuntoSeguro) return false;
    const dataAlvo = dataFuturaRegistro(dias);
    const duplicada = appData.revisoesItems.some(item => item.status !== 'revisado'
        && normalizarRevisaoTexto(item.materia) === normalizarRevisaoTexto(materiaSegura)
        && normalizarRevisaoTexto(item.assunto) === normalizarRevisaoTexto(assuntoSeguro)
        && item.dataAlvo === dataAlvo);
    if (duplicada) return false;
    appData.revisoesItems.push(normalizarItemRevisao({ id: Date.now() + Math.floor(Math.random() * 1000), materia: materiaSegura, assunto: assuntoSeguro,
        motivos: ['reforcar'], dataEstudo: dataLocalISO(new Date()), dataAlvo, origem, tags: [], atualizadoEm: Date.now(), status: 'pendente', criadoEm: Date.now() }));
    return true;
}

function atualizarTopicoAposEstudo(materia, assunto) {
    if (!materia || !assunto) return null;
    if (!Array.isArray(materia.topicos)) materia.topicos = [];
    let topico = materia.topicos.find(item => normalizarRevisaoTexto(item.nome) === normalizarRevisaoTexto(assunto));
    if (!topico) {
        topico = { nome: String(assunto).trim().slice(0, 100), concluido: false, prioridade: 'media', nivelDominio: 1, notas: '' };
        materia.topicos.push(topico);
    }
    topico.nivelDominio = Math.max(1, obterNivelDominioTopico(topico));
    delete topico.dominio;
    topico.concluido = topico.nivelDominio === 3;
    topico.ultimoEstudoEm = Date.now();
    topico.vezesEstudado = (Number(topico.vezesEstudado) || 0) + 1;
    return topico;
}

function criarItemHistoricoRegistro({ segundos = 0, materia = 'Sem matéria', assunto = '', cor = '#515154', tipo = 'Estudo', comentario = '', atividade = 'estudo', registroRapido = false }) {
    const d = new Date();
    return { id: Date.now() + Math.floor(Math.random() * 1000), dataISO: dataLocalISO(d), dataChave: `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`,
        diaNum: d.getDate().toString().padStart(2, '0'), mesAno: `${['JAN', 'FEV', 'MAR', 'ABR', 'MAI', 'JUN', 'JUL', 'AGO', 'SET', 'OUT', 'NOV', 'DEZ'][d.getMonth()]}/${d.getFullYear().toString().slice(-2)}`,
        diaStr: ['DOM', 'SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SÁB'][d.getDay()], materia, assunto, tempoSegundos: Number(segundos) || 0, cor, tipo, comentario, atividade, registroRapido };
}

function registrarSessao(segundos, detalhes = null) {
    if(segundos < 5) return false;
    if (!Array.isArray(appData.resolvedStudySessionIds)) appData.resolvedStudySessionIds = [];
    const sessaoOrigem = detalhes?.pendingSession || obterSessaoPendenteAtual() || null;
    const sourceSessionId = String(sessaoOrigem?.id || '');
    if (sourceSessionId && (appData.resolvedStudySessionIds.includes(sourceSessionId)
        || appData.historyItems.some(item => String(item.sourceSessionId || '') === sourceSessionId))) {
        removerSessaoPendente(sourceSessionId);
        saveAppData();
        renderizarAvisoSessaoPendente();
        showToast('Essa sessão já estava registrada. O lembrete antigo foi removido.');
        return true;
    }
    const snapshot = JSON.parse(JSON.stringify(appData));
    const currentSecondsSnapshot = currentSeconds;
    const activeSubjId = detalhes?.subjectId ?? document.getElementById('activeSubjectSelect').value;
    let nome = 'Sem matéria', cor = '#515154', tipo = 'Estudo', materia = null;
    if (activeSubjId) materia = appData.cycleItems.find(item => String(item.id) === String(activeSubjId)) || null;
    if (materia) {
        nome = materia.subject; cor = materia.color;
        materia.executedMin = (materia.executedMin || 0) + (segundos / 60);
    } else cor = ['#34c759', '#007aff', '#ff9500', '#ff3b30', '#af52de'][Math.floor(Math.random() * 5)];

    const assunto = String(detalhes?.assunto || '').trim();
    const comentario = String(detalhes?.comentario || '').trim();
    const atividade = ['estudo', 'simulado', 'redacao'].includes(detalhes?.atividade) ? detalhes.atividade : 'estudo';
    tipo = { estudo: 'Estudo', simulado: 'Simulado', redacao: 'Redação' }[atividade];
    const pendenteCronograma = sessaoOrigem?.scheduleBlockId ? { ...sessaoOrigem } : null;
    const metricas = atividade === 'estudo' ? detalhes?.study : atividade === 'simulado' ? detalhes?.simulado : null;
    const questoes = Math.max(0, Number(metricas?.questoes ?? metricas?.total) || 0);
    const acertos = Math.max(0, Number(metricas?.acertos) || 0);
    const erros = Math.max(0, Number(metricas?.erros) || 0);
    const historico = criarItemHistoricoRegistro({ segundos, materia: nome, assunto, cor, tipo, comentario, atividade });
    Object.assign(historico, { questoes, acertos, erros, sourceSessionId, subjectId: materia?.id || '' });
    appData.historyItems.push(historico);
    if (materia && questoes) { materia.questoes = Number(materia.questoes || 0) + questoes; materia.acertos = Number(materia.acertos || 0) + acertos; materia.erros = Number(materia.erros || 0) + erros; }
    if (materia && assunto) atualizarTopicoAposEstudo(materia, assunto);
    if (detalhes?.autoReview) criarRevisaoAutomaticaRegistro(nome, assunto, detalhes.reviewDelayDays, `sessao-${atividade}`);

    if (atividade === 'simulado' && detalhes?.simulado) {
        const sim = detalhes.simulado;
        appData.simuladosItems.push({ id: Date.now() + 2, title: sim.title || `${nome} — sessão`, date: dataLocalISO(new Date()),
            tempoMin: Math.max(1, Math.round(segundos / 60)), area: sim.area || 'Geral', format: 'sessao', total: sim.total,
            acertos: sim.acertos, brancos: sim.brancos || 0, erros: sim.erros, mainError: sim.mainError || '',
            nextStep: sim.nextStep || '', attachment: '' });
    }
    if (atividade === 'redacao' && detalhes?.redacao) {
        const red = detalhes.redacao;
        appData.redacaoItems.push({ id: Date.now() + 3, theme: red.theme, date: dataLocalISO(new Date()), tempoMin: Math.max(1, Math.round(segundos / 60)),
            status: red.status || 'awaiting', c1: red.scores[0], c2: red.scores[1], c3: red.scores[2], c4: red.scores[3], c5: red.scores[4],
            nextFocus: red.nextFocus || '', attachment: '', aguardandoCorrecao: red.status !== 'corrected' });
    }

    if (sourceSessionId) removerSessaoPendente(sourceSessionId);
    if (sourceSessionId) appData.resolvedStudySessionIds = [...appData.resolvedStudySessionIds.filter(id => id !== sourceSessionId), sourceSessionId].slice(-40);
    try {
        if (pendenteCronograma) window.KingSchedule?.completeFromSession(pendenteCronograma, { ...detalhes, assunto, comentario, atividade, subjectId: materia?.id || '' });
        if (sessaoOrigem?.holdsTimer && !isRunning) currentSeconds = 0;
        if (String(appData.activeScheduleBlock?.blockId || '') === String(sessaoOrigem?.scheduleBlockId || '')) appData.activeScheduleBlock = null;
        saveAppData();
    } catch (error) {
        appData = snapshot;
        currentSeconds = currentSecondsSnapshot;
        sincronizarFilaSessoesPendentes();
        renderizarAvisoSessaoPendente();
        showToast('Não foi possível concluir o registro. Sua sessão continua protegida para tentar novamente.', true);
        console.error('Falha ao registrar sessão protegida:', error);
        return false;
    }
    renderizarCiclo(); if(document.getElementById('historico').classList.contains('active')) renderizarHistorico();
    if (typeof renderizarRevisoes === 'function') renderizarRevisoes();
    if (atividade === 'simulado' && typeof renderizarSimulados === 'function') renderizarSimulados();
    if (atividade === 'redacao' && typeof renderizarRedacoes === 'function') renderizarRedacoes();
    renderizarAvisoSessaoPendente();
    showToast(detalhes?.autoReview ? '✓ Sessão salva e revisão agendada.' : '✓ Sessão salva no histórico.');
    mostrarFraseMotivacional();
    return true;
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
    const estudo = document.getElementById('sessionStudyFields');
    simulado.hidden = tipo !== 'simulado';
    redacao.hidden = tipo !== 'redacao';
    if (estudo) estudo.hidden = tipo !== 'estudo';
    document.getElementById('sessionSimTitle').required = tipo === 'simulado';
    document.getElementById('sessionSimTotal').required = tipo === 'simulado';
    document.getElementById('sessionEssayTheme').required = tipo === 'redacao';
    const statusRedacao = document.getElementById('sessionEssayStatus')?.value || 'awaiting';
    const grade = document.querySelector('.session-essay-score')?.closest('.form-grid');
    if (grade) grade.hidden = tipo !== 'redacao' || statusRedacao !== 'corrected';
    document.querySelectorAll('.session-essay-score').forEach(input => {
        input.disabled = tipo !== 'redacao' || statusRedacao !== 'corrected';
    });
}

function atualizarRevisaoRegistroSessao() {
    const checkbox = document.getElementById('sessionAutoReview');
    const prazo = document.getElementById('sessionReviewDelay');
    if (prazo) prazo.disabled = !checkbox?.checked;
}

function abrirRegistroSessaoPendente() {
    const pendente = obterSessaoPendenteAtual();
    if (!pendente || Number(pendente.seconds) < 5) return;
    const form = document.getElementById('sessionCompleteForm');
    if (!form || typeof form.reset !== 'function') return;
    form.reset();
    document.getElementById('sessionCompleteTime').textContent = formatHistoryTime(pendente.seconds);
    const select = document.getElementById('sessionSubject');
    select.innerHTML = '<option value="">Sem matéria</option>' + appData.cycleItems.map(item => `<option value="${item.id}">${escaparRevisaoHtml(item.subject)}</option>`).join('');
    select.value = appData.cycleItems.some(item => String(item.id) === String(pendente.subjectId)) ? String(pendente.subjectId) : '';
    const rascunho = pendente.draft || {};
    if (rascunho.subjectId != null && [...select.options].some(option => String(option.value) === String(rascunho.subjectId))) select.value = String(rascunho.subjectId);
    document.getElementById('sessionTopic').value = rascunho.assunto || '';
    document.getElementById('sessionNotes').value = rascunho.comentario || '';
    const tipo = ['estudo', 'simulado', 'redacao'].includes(rascunho.atividade) ? rascunho.atividade : 'estudo';
    const radio = document.querySelector(`input[name="sessionKind"][value="${tipo}"]`);
    if (radio) radio.checked = true;
    document.getElementById('sessionAutoReview').checked = rascunho.autoReview ?? (appData.studyLogging.autoReview !== false);
    document.getElementById('sessionReviewDelay').value = String(rascunho.reviewDelayDays || appData.studyLogging.reviewDelayDays || 1);
    if (rascunho.study) {
        document.getElementById('sessionStudyQuestions').value = rascunho.study.questoes || 0;
        document.getElementById('sessionStudyHits').value = rascunho.study.acertos || 0;
        document.getElementById('sessionStudyErrors').value = rascunho.study.erros || 0;
    }
    if (rascunho.simulado) {
        document.getElementById('sessionSimTitle').value = rascunho.simulado.title || '';
        document.getElementById('sessionSimArea').value = rascunho.simulado.area || 'Geral';
        document.getElementById('sessionSimTotal').value = rascunho.simulado.total || 45;
        document.getElementById('sessionSimHits').value = rascunho.simulado.acertos || 0;
        document.getElementById('sessionSimBlanks').value = rascunho.simulado.brancos || 0;
        document.getElementById('sessionSimMainError').value = rascunho.simulado.mainError || '';
        document.getElementById('sessionSimNextStep').value = rascunho.simulado.nextStep || '';
    }
    if (rascunho.redacao) {
        document.getElementById('sessionEssayTheme').value = rascunho.redacao.theme || '';
        document.getElementById('sessionEssayStatus').value = rascunho.redacao.status || 'awaiting';
        document.querySelectorAll('.session-essay-score').forEach((input, indice) => input.value = rascunho.redacao.scores?.[indice] || '');
        document.getElementById('sessionEssayNextFocus').value = rascunho.redacao.nextFocus || '';
    }
    atualizarTopicosRegistroSessao(); atualizarTipoRegistroSessao(); atualizarRevisaoRegistroSessao();
    document.getElementById('sessionCompleteModal').classList.add('active');
    setTimeout(() => document.getElementById('sessionTopic')?.focus(), 120);
}

function prepararRegistroSessao(segundos = currentSeconds, origem = 'manual') {
    if (Number(segundos) < 5) return false;
    const segundosProtegidos = Math.floor(Number(segundos));
    clearInterval(timerInterval);
    isRunning = false;
    cancelarAvisoMetaTimer();
    stopAlarm();
    playPauseBtn.textContent = '▶';
    const criadaEm = Date.now();
    const nova = { id: `sessao-${criadaEm}-${Math.random().toString(36).slice(2, 8)}`, seconds: segundosProtegidos, subjectId: document.getElementById('activeSubjectSelect').value, origem, createdAt: criadaEm, scheduleWeekKey: appData.activeScheduleBlock?.weekKey || '', scheduleBlockId: appData.activeScheduleBlock?.blockId || '', scheduleCreditNeeded: false, holdsTimer: false };
    // A sessão recém-encerrada sempre abre primeiro. As anteriores continuam protegidas na fila.
    appData.pendingStudySessions = [nova, ...sincronizarFilaSessoesPendentes()];
    appData.pendingStudySession = nova;
    currentSeconds = 0;
    alarmTriggered = false;
    lastTickTime = 0;
    document.title = 'King Master';
    try { saveAppData(); } catch (error) {
        console.error('Falha ao salvar sessão encerrada:', error);
        showToast('A sessão está protegida nesta tela, mas houve uma falha ao salvar no dispositivo.', true);
    }
    updateProgress();
    toggleBotaoStopHistorico();
    renderizarAvisoSessaoPendente();
    abrirRegistroSessaoPendente();
    return true;
}

function guardarTempoAoTrocarContexto(origem) {
    if (currentMode !== 'estudo') return;
    tickTimer();
    clearInterval(timerInterval);
    const segundos = Math.floor(currentSeconds);
    isRunning = false;
    playPauseBtn.textContent = '▶';
    cancelarAvisoMetaTimer();
    stopAlarm();
    if (segundos >= 5) {
        const createdAt = Date.now();
        const pendente = { id: `sessao-${createdAt}-${Math.random().toString(36).slice(2, 8)}`, seconds: segundos,
            subjectId: document.getElementById('activeSubjectSelect').value, origem, createdAt,
            scheduleWeekKey: appData.activeScheduleBlock?.weekKey || '', scheduleBlockId: appData.activeScheduleBlock?.blockId || '',
            scheduleCreditNeeded: false, holdsTimer: false, deferredAt: createdAt };
        appData.pendingStudySessions = [pendente, ...sincronizarFilaSessoesPendentes()];
        appData.pendingStudySession = pendente;
        appData.activeScheduleBlock = null;
        currentSeconds = 0;
        alarmTriggered = false;
        lastTickTime = 0;
        renderizarAvisoSessaoPendente();
        showToast('Tempo protegido para registrar depois. O cronômetro foi pausado.');
    }
    saveAppData(); updateProgress(); toggleBotaoStopHistorico();
}

function adiarRegistroSessao() {
    const pendente = obterSessaoPendenteAtual();
    if (pendente) {
        pendente.deferredAt = Date.now();
        pendente.draft = coletarRascunhoRegistroSessao();
    }
    fecharModal('sessionCompleteModal');
    saveAppData();
    renderizarAvisoSessaoPendente();
    showToast('A sessão continua protegida e não abrirá sozinha.');
}

function descartarRegistroSessao() {
    const pendente = obterSessaoPendenteAtual();
    if (!pendente) return;
    const duracao = formatHistoryTime(Number(pendente.seconds) || 0);
    abrirModalDeletar('pendingSession', pendente.id, 'Descartar esta sessão?', `O tempo de ${duracao} será removido definitivamente. Essa ação só acontece depois desta confirmação.`);
}

function confirmarDescarteRegistroSessao(id) {
    const pendente = sincronizarFilaSessoesPendentes().find(sessao => String(sessao.id) === String(id));
    if (!pendente) return;
    if (pendente?.id) appData.resolvedStudySessionIds = [...appData.resolvedStudySessionIds.filter(id => id !== String(pendente.id)), String(pendente.id)].slice(-40);
    removerSessaoPendente(pendente.id);
    // Compatibilidade com sessões criadas antes da separação entre o relógio e a fila protegida.
    // Nessas sessões, descartar removia a fila, mas deixava o mesmo tempo preso na tela.
    if (pendente.holdsTimer && !isRunning) {
        currentSeconds = 0;
        alarmTriggered = false;
        lastTickTime = 0;
        playPauseBtn.textContent = '▶';
        cancelarAvisoMetaTimer();
        stopAlarm();
        document.title = 'King Master';
    }
    if (String(appData.activeScheduleBlock?.blockId || '') === String(pendente.scheduleBlockId || '')) appData.activeScheduleBlock = null;
    fecharModal('sessionCompleteModal');
    saveAppData();
    updateProgress();
    toggleBotaoStopHistorico();
    renderizarAvisoSessaoPendente();
    showToast('Registro pendente descartado. Ele não aparecerá novamente.');
}

function coletarRascunhoRegistroSessao() {
    const atividade = document.querySelector('input[name="sessionKind"]:checked')?.value || 'estudo';
    return {
        subjectId: document.getElementById('sessionSubject')?.value || '',
        assunto: document.getElementById('sessionTopic')?.value.trim() || '',
        comentario: document.getElementById('sessionNotes')?.value.trim() || '',
        atividade,
        autoReview: document.getElementById('sessionAutoReview')?.checked !== false,
        reviewDelayDays: Number(document.getElementById('sessionReviewDelay')?.value) || 1,
        study: atividade === 'estudo' ? {
            questoes: Math.max(0, Number(document.getElementById('sessionStudyQuestions')?.value) || 0),
            acertos: Math.max(0, Number(document.getElementById('sessionStudyHits')?.value) || 0),
            erros: Math.max(0, Number(document.getElementById('sessionStudyErrors')?.value) || 0)
        } : null,
        simulado: atividade === 'simulado' ? {
            title: document.getElementById('sessionSimTitle')?.value.trim() || '', area: document.getElementById('sessionSimArea')?.value || 'Geral',
            total: Math.max(1, Number(document.getElementById('sessionSimTotal')?.value) || 45), acertos: Math.max(0, Number(document.getElementById('sessionSimHits')?.value) || 0),
            brancos: Math.max(0, Number(document.getElementById('sessionSimBlanks')?.value) || 0), mainError: document.getElementById('sessionSimMainError')?.value || '',
            nextStep: document.getElementById('sessionSimNextStep')?.value.trim() || ''
        } : null,
        redacao: atividade === 'redacao' ? {
            theme: document.getElementById('sessionEssayTheme')?.value.trim() || '', status: document.getElementById('sessionEssayStatus')?.value || 'awaiting',
            scores: [...document.querySelectorAll('.session-essay-score')].map(input => Math.max(0, Math.min(200, Number(input.value) || 0))),
            nextFocus: document.getElementById('sessionEssayNextFocus')?.value.trim() || ''
        } : null
    };
}

function salvarRegistroSessao(event) {
    event.preventDefault();
    const pendente = obterSessaoPendenteAtual();
    if (!pendente || Number(pendente.seconds) < 5) return fecharModal('sessionCompleteModal');
    const atividade = document.querySelector('input[name="sessionKind"]:checked')?.value || 'estudo';
    const assunto = document.getElementById('sessionTopic').value.trim();
    const comentario = document.getElementById('sessionNotes').value.trim();
    if (!assunto) return showToast('Informe o tópico ou assunto estudado. O resumo é opcional.', true);
    const detalhes = { subjectId: document.getElementById('sessionSubject').value, assunto, comentario, atividade,
        autoReview: document.getElementById('sessionAutoReview').checked, reviewDelayDays: Number(document.getElementById('sessionReviewDelay').value) || 1 };
    if (atividade === 'estudo') {
        const questoes = Math.max(0, Number(document.getElementById('sessionStudyQuestions').value) || 0);
        const acertos = Math.max(0, Number(document.getElementById('sessionStudyHits').value) || 0);
        const erros = Math.max(0, Number(document.getElementById('sessionStudyErrors').value) || 0);
        if (acertos + erros > questoes) return showToast('Acertos e erros não podem ultrapassar o total de questões.', true);
        detalhes.study = { questoes, acertos, erros };
    }
    if (atividade === 'simulado') {
        const total = Math.max(1, Number(document.getElementById('sessionSimTotal').value) || 1);
        const acertos = Math.max(0, Number(document.getElementById('sessionSimHits').value) || 0);
        const brancos = Math.max(0, Number(document.getElementById('sessionSimBlanks').value) || 0);
        if (acertos + brancos > total) return showToast('Acertos e questões em branco não podem ultrapassar o total.', true);
        detalhes.simulado = { title: document.getElementById('sessionSimTitle').value.trim(), area: document.getElementById('sessionSimArea').value,
            total, acertos, brancos, erros: Math.max(0, total - acertos - brancos),
            mainError: document.getElementById('sessionSimMainError').value,
            nextStep: document.getElementById('sessionSimNextStep').value.trim() };
    }
    if (atividade === 'redacao') {
        const status = document.getElementById('sessionEssayStatus').value || 'awaiting';
        const scores = status === 'corrected'
            ? [...document.querySelectorAll('.session-essay-score')].map(input => Math.max(0, Math.min(200, Number(input.value) || 0)))
            : [0, 0, 0, 0, 0];
        detalhes.redacao = { theme: document.getElementById('sessionEssayTheme').value.trim(), status, scores,
            nextFocus: document.getElementById('sessionEssayNextFocus').value.trim() };
    }
    detalhes.pendingSession = { ...pendente };
    const salvo = registrarSessao(Number(pendente.seconds), detalhes);
    if (!salvo) return;
    fecharModal('sessionCompleteModal'); stopAlarm(); updateProgress(); toggleBotaoStopHistorico(); document.title = 'King Master';
}

async function prepararAvisoMetaTimer(segundosRestantes) {
    if (!('Notification' in window) || !window.isSecureContext || Number(segundosRestantes) <= 0) return;
    try {
        if (Notification.permission === 'default') await Notification.requestPermission();
        if (Notification.permission !== 'granted') return;
        const registro = await navigator.serviceWorker?.ready;
        if (!registro || typeof window.TimestampTrigger !== 'function') return;
        const existentes = await registro.getNotifications({ tag: 'king-master-timer-goal' });
        existentes.forEach(notificacao => notificacao.close());
        await registro.showNotification('Meta de estudo atingida', {
            body: 'O cronômetro continua contando. Volte quando quiser encerrar e registrar a sessão.',
            icon: './assets/app-icon-192.png', badge: './assets/app-icon-192.png',
            tag: 'king-master-timer-goal', renotify: true,
            showTrigger: new window.TimestampTrigger(Date.now() + Number(segundosRestantes) * 1000)
        });
    } catch { /* O aviso normal do relógio continua sendo o fallback. */ }
}

async function cancelarAvisoMetaTimer() {
    try {
        const registro = await navigator.serviceWorker?.ready;
        const existentes = await registro?.getNotifications?.({ tag: 'king-master-timer-goal' }) || [];
        existentes.forEach(notificacao => notificacao.close());
    } catch { /* Sem impacto no cronômetro. */ }
}

async function notificarMetaTimer() {
    if (!('Notification' in window) || Notification.permission !== 'granted') return;
    try {
        const registro = await navigator.serviceWorker?.ready;
        if (registro) await registro.showNotification('Meta de estudo atingida', {
            body: 'O tempo continua contando. Abra o King Master quando quiser encerrar a sessão.',
            icon: './assets/app-icon-192.png', badge: './assets/app-icon-192.png',
            tag: 'king-master-timer-goal', renotify: true, requireInteraction: true
        });
        else new Notification('Meta de estudo atingida', { body: 'O tempo continua contando no King Master.' });
    } catch { /* O áudio e o aviso visual continuam disponíveis. */ }
}

function toggleTimer() {
    if (isRunning) { 
        tickTimer();
        clearInterval(timerInterval); 
        playPauseBtn.textContent = '▶'; 
        isRunning = false; 
        cancelarAvisoMetaTimer();
        saveAppData(); 
        updateProgress(); 
    } else {
        const sessaoQueSeguraCronometro = sincronizarFilaSessoesPendentes().find(sessao => sessao.holdsTimer);
        if (sessaoQueSeguraCronometro) {
            sessaoQueSeguraCronometro.holdsTimer = false;
            currentSeconds = 0;
            alarmTriggered = false;
        }
        let target = getTargetSeconds();
        if (currentMode === 'descanso' && currentSeconds <= 0) currentSeconds = target;
        if (target <= 0 && currentMode === 'descanso') return showToast('⚠️ Defina um tempo maior que zero.', true);
        
        lastTickTime = Date.now(); 
        
        alarmTriggered = (target > 0 && currentSeconds >= target); 
        
        timerInterval = setInterval(tickTimer, 500);
        playPauseBtn.innerHTML = '&#10074;&#10074;';
        isRunning = true;
        if (currentMode === 'estudo' && target > currentSeconds) prepararAvisoMetaTimer(target - currentSeconds);
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
                        triggerAlarm(); 
                        notificarMetaTimer();
                        showToast('🎯 Meta atingida! O cronômetro continua contando até você encerrar.');
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

// O relógio permanece rodando ao sair. Na volta, a diferença de horário é creditada uma única vez.
window.addEventListener('pagehide', () => {
    if (!timerPersistenceReady) return;
    tickTimer();
    clearInterval(timerInterval);
    updateProgress();
    toggleBotaoStopHistorico();
    try { saveAppData(); } catch { persistTimerCheckpoint(); }
});
window.addEventListener('pageshow', () => {
    if (!timerPersistenceReady || !isRunning) return;
    tickTimer();
    clearInterval(timerInterval);
    timerInterval = setInterval(tickTimer, 500);
    playPauseBtn.innerHTML = '&#10074;&#10074;';
});
document.addEventListener('visibilitychange', () => {
    if (!timerPersistenceReady) return;
    tickTimer();
    if (document.hidden) { try { saveAppData(); } catch { persistTimerCheckpoint(); } }
});

function triggerAlarm() { 
    saveAppData(); 
    timerGoalActions?.classList.add('active');
    if(alarmAudio) {
        alarmAudio.src = "https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3";
        alarmAudio.loop = true;
        alarmAudio.currentTime = 0;
        alarmAudio.play().catch(e => console.log("Áudio bloqueado pelo navegador. Interação manual necessária."));
    }
}

function stopAlarm() { 
    if(alarmAudio) {
        alarmAudio.pause();
        alarmAudio.currentTime = 0;
        alarmAudio.loop = false;
    }
    timerGoalActions?.classList.remove('active');
}

function abrirConfirmReset() { document.getElementById('confirmResetModal').classList.add('active'); }
function executarResetTimer() { fecharModal('confirmResetModal'); clearInterval(timerInterval); cancelarAvisoMetaTimer(); stopAlarm(); isRunning = false; alarmTriggered = false; playPauseBtn.textContent = '▶'; currentSeconds = currentMode === 'estudo' ? 0 : getTargetSeconds(); saveAppData(); updateProgress(); toggleBotaoStopHistorico(); document.title = "King Master"; }
function encerrarSessaoDashboard() {
    // Congela o relógio antes de abrir o registro. Assim nenhum novo segundo, alarme
    // ou clique duplo consegue manter a sessão aparentemente ativa.
    tickTimer();
    const segundosFinais = Math.floor(currentSeconds);
    clearInterval(timerInterval);
    isRunning = false;
    cancelarAvisoMetaTimer();
    stopAlarm();
    playPauseBtn.textContent = '▶';
    if (segundosFinais >= 5) {
        prepararRegistroSessao(segundosFinais, 'manual');
        return;
    }
    showToast('⚠️ Sessão muito curta (mínimo 5s).', true);
    alarmTriggered = false;
    currentSeconds = 0;
    lastTickTime = 0;
    saveAppData();
    updateProgress();
    toggleBotaoStopHistorico();
    document.title = "King Master";
}
function setDescansoTime(mins) { descansoTempoAtual = mins; document.getElementById('btn-descanso-5').classList.remove('primary'); document.getElementById('btn-descanso-10').classList.remove('primary'); document.getElementById(`btn-descanso-${mins}`).classList.add('primary'); executarResetTimer(); }

function setMode(mode) {
    if (mode === currentMode) return;
    if (currentMode === 'estudo' && currentSeconds >= 5) guardarTempoAoTrocarContexto('troca-modo');
    else tickTimer();
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
                        <span class="color-dot" style="background:#515154;"></span>Sem matéria
                    </div>`;
    
    if(appData.cycleItems.length > 0) { 
        htmlOpts += appData.cycleItems.map(i => `<div class="custom-option ${hid.value == i.id ? 'selected' : ''}" data-value="${i.id}"><span class="color-dot" style="background:${i.color};"></span>${i.subject}</div>`).join('');
    }
    
    opts.innerHTML = htmlOpts;
    
    document.querySelectorAll('.custom-option').forEach(opt => opt.addEventListener('click', function() { 
        if(this.dataset.value === undefined) return; 
        if (hid.value !== this.dataset.value && currentMode === 'estudo' && currentSeconds >= 5) guardarTempoAoTrocarContexto('troca-materia');
        hid.value = this.dataset.value; 
        saveAppData();
        trig.innerHTML = this.innerHTML; 
        document.querySelector('.custom-select-wrapper').classList.remove('open'); 
        atualizarSeletorDeMaterias(); 
    }));
    
    if(hid.value) { 
        const sel = appData.cycleItems.find(i => i.id == hid.value); 
        if(sel) trig.innerHTML = `<span class="color-dot" style="background:${sel.color};"></span>${sel.subject}`; 
    } else {
        trig.innerHTML = `<span class="color-dot" style="background:#515154;"></span>Sem matéria`;
    }
}

function toggleCustomSelect() { const wrap = document.querySelector('.custom-select-wrapper'); if(wrap) wrap.classList.toggle('open'); }
document.addEventListener('click', e => { if (!e.target.closest('.custom-select-wrapper')) document.querySelector('.custom-select-wrapper')?.classList.remove('open'); });
function limparSelecaoPresets() {
    document.querySelectorAll('#cycleModal .color-preset').forEach(el => {
        el.classList.remove('selected');
        el.setAttribute('aria-pressed', 'false');
    });
}

function selecionarCorPreset(el, cor) {
    limparSelecaoPresets();
    el.classList.add('selected');
    el.setAttribute('aria-pressed', 'true');
    document.getElementById('cycleColor').value = cor;
    atualizarPreviewMateria();
}

function formatarCargaMateria(blocos) {
    const quantidade = Math.min(30, Math.max(0, Number(blocos) || 0));
    if (!quantidade) return { resumo: 'Fora da organização automática', detalhe: 'Defina uma carga se quiser usar o cronograma.' };
    const minutosBloco = Math.max(1, Number(appData.studySchedule?.settings?.blockMinutes) || 50);
    const minutos = quantidade * minutosBloco;
    const horas = Math.floor(minutos / 60);
    const restante = minutos % 60;
    const tempo = horas ? `${horas}h${restante ? String(restante).padStart(2, '0') : ''}` : `${restante} min`;
    const nomeBloco = quantidade === 1 ? 'bloco' : 'blocos';
    return { resumo: `${quantidade} ${nomeBloco} · ${tempo} por semana`, detalhe: `${quantidade} ${nomeBloco} planejado${quantidade === 1 ? '' : 's'} · cerca de ${tempo} por semana.` };
}

function normalizarListaTopicosMateria(valor) {
    const vistos = new Set();
    return String(valor || '').split(/[\n;]+/).map(item => item.trim()).filter(item => {
        const chave = item.toLocaleLowerCase('pt-BR').replace(/\s+/g, ' ');
        if (!chave || vistos.has(chave)) return false;
        vistos.add(chave);
        return true;
    }).slice(0, 60);
}

function atualizarContagemTopicosMateria() {
    const topicos = normalizarListaTopicosMateria(document.getElementById('cycleInitialTopics')?.value);
    const total = topicos.length;
    const contador = document.getElementById('cycleTopicCount');
    const resumo = document.getElementById('cycleTopicSummary');
    if (contador) contador.textContent = `${total} ${total === 1 ? 'tópico' : 'tópicos'}`;
    if (resumo) resumo.textContent = total ? `${total} ${total === 1 ? 'tópico pronto' : 'tópicos prontos'} para adicionar` : 'Você também pode adicioná-los depois';
}

function ajustarCargaMateria(delta) {
    const input = document.getElementById('cycleWeeklyBlocks');
    if (!input) return;
    input.value = String(Math.min(30, Math.max(0, (Number(input.value) || 0) + Number(delta || 0))));
    atualizarPreviewMateria();
}

function atualizarPreviewMateria() {
    const nome = document.getElementById('cycleSubject')?.value.trim() || 'Nova matéria';
    const icone = document.getElementById('cycleIcon')?.value || '●';
    const cor = document.getElementById('cycleColor')?.value || '#007aff';
    const prioridade = Number(document.getElementById('cyclePriority')?.value) || 2;
    const blocos = Math.min(30, Math.max(0, Number(document.getElementById('cycleWeeklyBlocks')?.value) || 0));
    const carga = formatarCargaMateria(blocos);
    const nomesPrioridade = { 1: 'baixa', 2: 'normal', 3: 'alta' };
    const preview = document.getElementById('cycleLivePreview');
    if (preview) preview.style.setProperty('--subject-preview', cor);
    const mark = document.getElementById('cyclePreviewMark');
    if (mark) { mark.textContent = icone; mark.style.color = cor; mark.style.borderColor = `${cor}55`; mark.style.background = `${cor}18`; }
    const valores = { cyclePreviewIcon: icone, cyclePreviewName: nome, cyclePreviewStatus: blocos ? 'No cronograma semanal' : 'Organização manual', cyclePreviewPriority: `Prioridade ${nomesPrioridade[prioridade]}`, cyclePreviewLoad: carga.detalhe, cyclePlanSummary: carga.resumo };
    Object.entries(valores).forEach(([id, valor]) => { const el = document.getElementById(id); if (el) el.textContent = valor; });
}

function selecionarPresetDaCor(cor) {
    limparSelecaoPresets();
    const preset = [...document.querySelectorAll('#cycleModal .color-preset')].find(el => (el.dataset.color || '').toLowerCase() === String(cor || '').toLowerCase());
    if (preset) { preset.classList.add('selected'); preset.setAttribute('aria-pressed', 'true'); }
}

function abrirModalCiclo() { 
    const modal = document.getElementById('cycleModal');
    const form = document.getElementById('formAddCycle');
    if (!modal || !form) return showToast('Não foi possível abrir o cadastro de matéria.', true);
    form.reset();
    document.getElementById('cycleModalKicker').textContent = 'NOVA ÁREA DE ESTUDO';
    document.getElementById('cycleModalTitle').textContent = 'Adicionar matéria';
    document.getElementById('cycleModalSubtitle').textContent = 'Comece pelo essencial. A organização semanal e os tópicos são opcionais.';
    document.getElementById('cycleSaveButton').textContent = 'Criar matéria';
    document.getElementById('cycleSaveHint').textContent = 'Somente o nome é obrigatório.';
    document.getElementById('cycleEditId').value = "";
    document.getElementById('cycleColor').value = '#007aff';
    document.getElementById('cycleIcon').value = '●';
    document.getElementById('cyclePriority').value = '2';
    document.getElementById('cycleWeeklyBlocks').value = '0';
    document.getElementById('cycleConsecutive').checked = false;
    document.getElementById('cycleInitialTopics').value = '';
    document.getElementById('cycleInitialTopics').placeholder = 'Escreva os conteúdos que deseja estudar';
    document.getElementById('cycleTopicsHelp').textContent = 'Tópicos repetidos serão ignorados.';
    document.getElementById('cyclePlanDetails').open = false;
    document.getElementById('cycleTopicsDetails').open = false;
    selecionarPresetDaCor('#007aff');
    atualizarContagemTopicosMateria();
    atualizarPreviewMateria();
    modal.classList.add('active');
    setTimeout(() => document.getElementById('cycleSubject')?.focus(), 50);
}

function editarMateriaCiclo(id) {
    const mat = appData.cycleItems.find(m => m.id === id);
    if (!mat) return;
    const form = document.getElementById('formAddCycle');
    if (!form) return;
    form.reset();
    document.getElementById('cycleModalKicker').textContent = 'AJUSTAR ÁREA DE ESTUDO';
    document.getElementById('cycleModalTitle').textContent = 'Editar matéria';
    document.getElementById('cycleModalSubtitle').textContent = 'Atualize a identidade ou acrescente novos tópicos sem perder seu progresso.';
    document.getElementById('cycleSaveButton').textContent = 'Salvar alterações';
    document.getElementById('cycleSaveHint').textContent = 'Seu histórico e seus tópicos atuais serão preservados.';
    document.getElementById('cycleEditId').value = mat.id;
    document.getElementById('cycleSubject').value = mat.subject;
    document.getElementById('cycleColor').value = mat.color || '#007aff';
    document.getElementById('cycleIcon').value = mat.schedule?.icon || '●';
    document.getElementById('cyclePriority').value = String(mat.schedule?.priority || 2);
    document.getElementById('cycleWeeklyBlocks').value = String(mat.schedule?.weeklyBlocks || 0);
    document.getElementById('cycleConsecutive').checked = Boolean(mat.schedule?.consecutive);
    document.getElementById('cycleInitialTopics').value = '';
    document.getElementById('cycleInitialTopics').placeholder = 'Acrescente somente os novos conteúdos';
    document.getElementById('cycleTopicsHelp').textContent = `${(mat.topicos || []).length} tópico${(mat.topicos || []).length === 1 ? '' : 's'} já cadastrado${(mat.topicos || []).length === 1 ? '' : 's'}; repetidos serão ignorados.`;
    document.getElementById('cyclePlanDetails').open = Number(mat.schedule?.weeklyBlocks) > 0;
    document.getElementById('cycleTopicsDetails').open = false;
    selecionarPresetDaCor(mat.color || '#007aff');
    atualizarContagemTopicosMateria();
    atualizarPreviewMateria();
    document.getElementById('cycleModal').classList.add('active');
    setTimeout(() => document.getElementById('cycleSubject')?.focus(), 50);
}

function salvarMateriaCiclo(e) {
    e.preventDefault(); 
    const idEdit = document.getElementById('cycleEditId').value;
    const color = document.getElementById('cycleColor').value || '#007aff';
    const subject = document.getElementById('cycleSubject').value.trim();
    const schedule = { icon: document.getElementById('cycleIcon').value || '●', priority: Math.min(3, Math.max(1, Number(document.getElementById('cyclePriority').value) || 2)), weeklyBlocks: Math.min(30, Math.max(0, Number(document.getElementById('cycleWeeklyBlocks').value) || 0)), consecutive: document.getElementById('cycleConsecutive').checked };
    const novosTopicos = normalizarListaTopicosMateria(document.getElementById('cycleInitialTopics').value);
    let quantidadeTopicosAdicionados = novosTopicos.length;
    if (!subject) return showToast('Digite o nome da matéria.', true);
    const duplicada = appData.cycleItems.some(item => item.id != idEdit && (item.subject || '').trim().toLocaleLowerCase('pt-BR') === subject.toLocaleLowerCase('pt-BR'));
    if (duplicada) return showToast('Essa matéria já está cadastrada.', true);
    
    if (idEdit) { 
        const idx = appData.cycleItems.findIndex(i => i.id == idEdit); 
        if (idx > -1) { 
            const atuais = Array.isArray(appData.cycleItems[idx].topicos) ? appData.cycleItems[idx].topicos : [];
            const chavesAtuais = new Set(atuais.map(item => String(item.nome || '').trim().toLocaleLowerCase('pt-BR').replace(/\s+/g, ' ')));
            const adicionados = novosTopicos.filter(nome => !chavesAtuais.has(nome.toLocaleLowerCase('pt-BR').replace(/\s+/g, ' '))).map(nome => ({ nome, concluido: false }));
            quantidadeTopicosAdicionados = adicionados.length;
            const nomeAnterior = appData.cycleItems[idx].subject;
            appData.cycleItems[idx] = { ...appData.cycleItems[idx], color, subject, schedule, topicos: [...atuais, ...adicionados] };
            if (normalizarRevisaoTexto(nomeAnterior) !== normalizarRevisaoTexto(subject)) renomearMateriaNosRegistros(nomeAnterior, subject);
        } 
    } else { 
        appData.cycleItems.push({ id: Date.now(), color, subject, schedule, targetMin: 0, executedMin: 0, topicos: novosTopicos.map(nome => ({ nome, concluido: false })), questoes: 0, acertos: 0, erros: 0 });
    }
    saveAppData(); renderizarCiclo(); renderizarRevisoes(); window.KingSchedule?.render(); fecharModal('cycleModal');
    showToast(quantidadeTopicosAdicionados ? `📚 Matéria salva com ${quantidadeTopicosAdicionados} ${quantidadeTopicosAdicionados === 1 ? 'tópico' : 'tópicos'}!` : '📚 Matéria salva!');
}

let buscaMateriasAtual = '';
let buscaAssuntosAtual = '';
let filtroAssuntosAtual = 'acao';
let ordenacaoAssuntosAtual = 'acao';
let assuntoSelecionadoIndice = null;
let abaDetalheTopicoAtual = 'visao';
let filtroAgendamentoAtual = 'todos';
let filtroRevisoesAtual = 'pendentes';
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
    const dominados = topicos.filter(item => obterNivelDominioTopico(item) === 3).length;
    const definirTexto = (id, texto) => { const elemento = document.getElementById(id); if (elemento) elemento.textContent = texto; };
    definirTexto('materiasTotal', materias.length);
    definirTexto('materiasTopicos', topicos.length);
    definirTexto('materiasDominados', dominados);
    definirTexto('materiasDominio', topicos.length ? `${Math.round(dominados / topicos.length * 100)}%` : '0%');

    const visiveis = materias.filter(item => !buscaMateriasAtual || String(item.subject || '').toLocaleLowerCase('pt-BR').includes(buscaMateriasAtual));
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
        let concluidos = i.topicos ? i.topicos.filter(t => obterNivelDominioTopico(t) === 3).length : 0, totalTopicos = i.topicos ? i.topicos.length : 0;
        const progresso = totalTopicos ? Math.round(concluidos / totalTopicos * 100) : 0;
        const nome = escaparRevisaoHtml(i.subject || 'Sem nome');
        const estado = totalTopicos ? `${progresso}% do conteúdo dominado` : 'Pronta para organizar';
        return `<article class="disc-card" style="--subject-color:${i.color};border-left-color:${i.color};"><div class="disc-card-main"><div class="disc-card-top"><div><strong class="disc-title">${nome}</strong><span class="disc-type">${estado}</span></div><div class="workspace-card-actions"><button type="button" class="workspace-icon-button" onclick="editarMateriaCiclo(${i.id})" aria-label="Editar ${nome}" title="Editar">✎</button><button type="button" class="workspace-icon-button danger" onclick="abrirModalDeletar('cycle', ${i.id}, 'Apagar matéria por completo?', 'A matéria, seus tópicos, revisões e sessões do histórico serão apagados. Esta ação não pode ser desfeita.')" aria-label="Apagar ${nome}" title="Apagar">×</button></div></div><div class="disc-stats-row"><div class="ds-box"><span class="ds-val">${concluidos}/${totalTopicos}</span><span class="ds-lbl">Tópicos</span></div><div class="ds-box"><span class="ds-val" style="color:${i.color};">${txtExec}</span><span class="ds-lbl">Tempo</span></div><div class="ds-box"><span class="ds-val">${(i.acertos||0)+(i.erros||0)}</span><span class="ds-lbl">Questões</span></div></div><div class="disc-progress" aria-label="${progresso}% dos tópicos dominados"><span style="width:${progresso}%"></span></div><button type="button" class="subject-chapters-link" onclick="alternarAbasHub('dominio');abrirCadernosMateria(${i.id})" ${totalTopicos ? '' : 'disabled'}>${totalTopicos ? 'Abrir assuntos e cadernos ↗' : 'Adicione um assunto para começar'}</button></div></article>`;
    }).join('');
}

function filtrarAssuntos(valor = '') {
    buscaAssuntosAtual = String(valor).trim().toLocaleLowerCase('pt-BR');
    const id = Number(document.getElementById('assuntosMateriaId').value);
    renderizarListaAssuntos(id);
}

function definirFiltroAssuntos(filtro = 'acao') {
    filtroAssuntosAtual = filtro;
    document.querySelectorAll('[data-topic-filter]').forEach(botao => {
        const ativo = botao.dataset.topicFilter === filtro;
        botao.classList.toggle('active', ativo);
        botao.setAttribute('aria-pressed', String(ativo));
    });
    renderizarListaAssuntos(Number(document.getElementById('assuntosMateriaId').value));
}

function ordenarAssuntos(ordenacao = 'acao') {
    ordenacaoAssuntosAtual = ordenacao;
    renderizarListaAssuntos(Number(document.getElementById('assuntosMateriaId').value));
}

function obterRevisaoAtivaTopico(materia, topico) {
    return appData.revisoesItems
        .filter(item => item.status !== 'revisado'
            && normalizarRevisaoTexto(item.materia) === normalizarRevisaoTexto(materia.subject)
            && normalizarRevisaoTexto(item.assunto) === normalizarRevisaoTexto(topico.nome))
        .sort((a, b) => (a.dataAlvo || '9999-12-31').localeCompare(b.dataAlvo || '9999-12-31'))[0] || null;
}

function obterNivelDominioTopico(topico) {
    if (Number.isFinite(Number(topico?.nivelDominio))) return Math.max(0, Math.min(3, Number(topico.nivelDominio) || 0));
    if (topico?.dominio) {
        if (topico.dominio.dominio) return 3;
        if (topico.dominio.pratica) return 2;
        if (topico.dominio.teoria) return 1;
        return 0;
    }
    if (topico?.concluido) return 3;
    if (Number(topico?.vezesEstudado) > 0) return 1;
    return 0;
}

function obterEstadoTopicoControle(materia, topico) {
    const revisao = obterRevisaoAtivaTopico(materia, topico);
    const hoje = dataLocalISO(new Date());
    if (revisao?.status === 'fraco' || (revisao?.dataAlvo && revisao.dataAlvo <= hoje)) return 'revisar';
    return ['novo', 'aprendendo', 'consolidando', 'dominado'][obterNivelDominioTopico(topico)];
}

function pontuacaoAcaoTopico(materia, topico) {
    const estado = obterEstadoTopicoControle(materia, topico);
    const prioridade = { alta: 0, media: 1, baixa: 2 }[topico.prioridade || 'media'];
    const base = { revisar: 0, novo: 2, aprendendo: 3, consolidando: 4, dominado: 8 }[estado] ?? 6;
    return base * 10 + prioridade;
}

function rotuloDataRevisao(dataAlvo) {
    if (!dataAlvo) return '';
    const hoje = dataLocalISO(new Date());
    if (dataAlvo < hoje) return 'Revisão atrasada';
    if (dataAlvo === hoje) return 'Revisar hoje';
    const data = dataISOParaLocal(dataAlvo);
    return data ? `Revisar ${data.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }).replace('.', '')}` : '';
}

function obterAnaliseTopico(materia, topico) {
    const materiaChave = normalizarRevisaoTexto(materia?.subject);
    const topicoChave = normalizarRevisaoTexto(topico?.nome);
    const sessoes = (appData.historyItems || []).filter(item => normalizarRevisaoTexto(item.materia) === materiaChave && normalizarRevisaoTexto(item.assunto) === topicoChave);
    const errosCaderno = (appData.cadernoErrosItems || []).filter(item => normalizarRevisaoTexto(item.materia) === materiaChave && normalizarRevisaoTexto(item.assunto) === topicoChave);
    const questoes = sessoes.reduce((total, item) => total + Math.max(0, Number(item.questoes) || 0), 0);
    const acertos = sessoes.reduce((total, item) => total + Math.max(0, Number(item.acertos) || 0), 0);
    const errosQuestoes = sessoes.reduce((total, item) => total + Math.max(0, Number(item.erros) || 0), 0);
    const causas = errosCaderno.reduce((mapa, item) => { mapa[item.tipo || 'conteudo'] = (mapa[item.tipo || 'conteudo'] || 0) + 1; return mapa; }, {});
    const periodosMapa = new Map();
    sessoes.forEach(item => {
        const iso = dataHistoricoISO(item);
        const chave = /^\d{4}-\d{2}-\d{2}$/.test(iso || '') ? iso.slice(0, 7) : 'sem-data';
        if (!periodosMapa.has(chave)) {
            const data = chave === 'sem-data' ? null : dataISOParaLocal(`${chave}-01`);
            periodosMapa.set(chave, {
                chave,
                rotulo: data ? data.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' }).replace('.', '').toUpperCase() : 'SEM DATA',
                segundos: 0,
                sessoes: 0,
                questoes: 0,
                acertos: 0,
                erros: 0
            });
        }
        const periodo = periodosMapa.get(chave);
        periodo.segundos += Math.max(0, Number(item.tempoSegundos) || 0);
        periodo.sessoes += 1;
        periodo.questoes += Math.max(0, Number(item.questoes) || 0);
        periodo.acertos += Math.max(0, Number(item.acertos) || 0);
        periodo.erros += Math.max(0, Number(item.erros) || 0);
    });
    const periodos = [...periodosMapa.values()].sort((a, b) => a.chave.localeCompare(b.chave));
    periodos.forEach(periodo => {
        const respondidas = periodo.acertos + periodo.erros;
        periodo.taxaAcerto = respondidas ? Math.round(periodo.acertos / respondidas * 100) : null;
    });
    const respondidas = acertos + errosQuestoes;
    const segundos = sessoes.reduce((total, item) => total + Math.max(0, Number(item.tempoSegundos) || 0), 0);
    return {
        sessoes: sessoes.length,
        segundos,
        questoes, acertos, errosQuestoes, errosCaderno: errosCaderno.length, causas, periodos,
        respondidas,
        taxaAcerto: respondidas ? Math.round(acertos / respondidas * 100) : null,
        taxaErro: respondidas ? Math.round(errosQuestoes / respondidas * 100) : null,
        mediaSessao: sessoes.length ? Math.round(segundos / sessoes.length) : 0,
        sessoesItens: [...sessoes].sort((a, b) => Number(b.id || 0) - Number(a.id || 0)).slice(0, 40)
    };
}

function htmlAnaliseTopico(analise) {
    const maiorPeriodo = Math.max(60, ...analise.periodos.map(periodo => periodo.segundos));
    const barrasTempo = analise.periodos.map(periodo => `<div class="topic-time-day" title="${periodo.rotulo}: ${formatShortTime(periodo.segundos)} em ${periodo.sessoes} ${periodo.sessoes === 1 ? 'sessão' : 'sessões'}"><span class="topic-time-value">${formatShortTime(periodo.segundos)}</span><span class="topic-time-track"><i style="height:${Math.max(3, Math.round(periodo.segundos / maiorPeriodo * 100))}%"></i></span><span>${periodo.rotulo}</span></div>`).join('');
    const barrasDesempenho = analise.periodos.map(periodo => `<div class="topic-performance-period" title="${periodo.rotulo}: ${periodo.taxaAcerto === null ? 'sem questões registradas' : `${periodo.taxaAcerto}% de acerto`}"><strong>${periodo.taxaAcerto === null ? '—' : `${periodo.taxaAcerto}%`}</strong><span class="topic-performance-track ${periodo.taxaAcerto === null ? 'empty' : ''}"><i style="height:${periodo.taxaAcerto === null ? 0 : periodo.taxaAcerto}%"></i></span><small>${periodo.rotulo}</small></div>`).join('');
    const nomesCausa = { conteudo: 'Conteúdo', interpretacao: 'Interpretação', calculo: 'Cálculo', atencao: 'Atenção', estrategia: 'Estratégia' };
    const maiorCausa = Math.max(1, ...Object.values(analise.causas));
    const causas = Object.entries(analise.causas).sort((a, b) => b[1] - a[1]).map(([tipo, quantidade]) => `<div class="topic-error-cause"><span>${nomesCausa[tipo] || 'Outro padrão'}</span><b>${quantidade}</b><i style="--cause-width:${Math.round(quantidade / maiorCausa * 100)}%"></i></div>`).join('');
    const graficoTempo = barrasTempo ? `<div class="topic-chart-scroll"><div class="topic-time-chart" style="--period-count:${analise.periodos.length}">${barrasTempo}</div></div>` : '<div class="topic-chart-empty">O tempo aparecerá aqui depois da primeira sessão registrada neste assunto.</div>';
    const graficoDesempenho = barrasDesempenho && analise.respondidas ? `<div class="topic-chart-scroll"><div class="topic-performance-chart" style="--period-count:${analise.periodos.length}">${barrasDesempenho}</div></div>` : '<div class="topic-chart-empty">Registre acertos e erros nas sessões para acompanhar sua evolução.</div>';
    const graficoAcertos = analise.respondidas ? `<div class="topic-answer-overview"><div class="topic-answer-ring" style="--hit-rate:${analise.taxaAcerto}"><span><strong>${analise.taxaAcerto}%</strong><small>de acerto</small></span></div><div class="topic-answer-legend"><span class="hit"><i></i><b>Acertos</b><strong>${analise.acertos}</strong></span><span class="miss"><i></i><b>Erros</b><strong>${analise.errosQuestoes}</strong></span><small>${analise.respondidas} questões corrigidas</small></div></div>` : '<div class="topic-chart-empty">Ainda não há questões corrigidas neste assunto.</div>';
    return `<section class="topic-evidence-grid" aria-label="Resumo acumulado do tópico"><div class="topic-evidence-card"><small>Tempo total</small><strong>${formatShortTime(analise.segundos)}</strong></div><div class="topic-evidence-card"><small>Sessões totais</small><strong>${analise.sessoes}</strong></div><div class="topic-evidence-card"><small>Média por sessão</small><strong>${formatShortTime(analise.mediaSessao)}</strong></div><div class="topic-evidence-card success"><small>Taxa de acerto</small><strong>${analise.taxaAcerto === null ? '—' : `${analise.taxaAcerto}%`}</strong></div><div class="topic-evidence-card error"><small>Erros no caderno</small><strong>${analise.errosCaderno}</strong></div></section>
        <section class="topic-analytics-grid" aria-label="Gráficos acumulados do tópico">
            <article class="topic-chart-card wide"><div class="topic-chart-heading"><div><strong>Tempo geral do tópico</strong><small>Todo o histórico, agrupado por mês</small></div><b>${formatShortTime(analise.segundos)} acumulados</b></div>${graficoTempo}</article>
            <article class="topic-chart-card"><div class="topic-chart-heading"><div><strong>Acertos x erros</strong><small>Resultado geral das questões corrigidas</small></div></div>${graficoAcertos}</article>
            <article class="topic-chart-card"><div class="topic-chart-heading"><div><strong>Causas dos erros</strong><small>Padrões encontrados no caderno</small></div><b>${analise.errosCaderno} registros</b></div>${causas ? `<div class="topic-error-causes">${causas}</div>` : '<div class="topic-chart-empty">Registre erros no caderno para descobrir os padrões mais frequentes.</div>'}</article>
            <article class="topic-chart-card wide"><div class="topic-chart-heading"><div><strong>Evolução da precisão</strong><small>Percentual mensal de acertos em todo o histórico</small></div><b>${analise.questoes} questões registradas</b></div>${graficoDesempenho}</article>
        </section>`;
}

function htmlHistoricoTopico(analise) {
    if (!analise.sessoesItens.length) return '<div class="topic-history-empty">As sessões registradas com este assunto aparecerão aqui, com tempo e desempenho.</div>';
    return `<div class="topic-history-list">${analise.sessoesItens.map(item => {
        const data = dataHistoricoISO(item);
        const dataLocal = dataISOParaLocal(data);
        const rotulo = dataLocal ? dataLocal.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' }).replace('.', '') : 'Data não informada';
        const questoes = Math.max(0, Number(item.questoes) || 0), acertos = Math.max(0, Number(item.acertos) || 0), erros = Math.max(0, Number(item.erros) || 0);
        return `<article class="topic-history-item"><time>${rotulo}</time><span><strong>${escaparRevisaoHtml(item.resumo || item.notas || 'Sessão de estudo')}</strong><small>${questoes ? `${questoes} questões · ${acertos} acertos · ${erros} erros` : 'Sem questões registradas'}</small></span><b>${formatShortTime(Math.max(0, Number(item.tempoSegundos) || 0))}</b></article>`;
    }).join('')}</div>`;
}

function renderizarListaAssuntos(id) {
    const mat = appData.cycleItems.find(m => m.id === id), lista = document.getElementById('listaAssuntos');
    if (!mat || !lista) return;
    const topicos = Array.isArray(mat.topicos) ? mat.topicos : [];
    const estudados = topicos.filter(item => [1, 2].includes(obterNivelDominioTopico(item))).length;
    const dominados = topicos.filter(item => obterNivelDominioTopico(item) === 3).length;
    const revisoes = topicos.filter(item => obterEstadoTopicoControle(mat, item) === 'revisar').length;
    const errosRegistrados = (appData.cadernoErrosItems || []).filter(item => normalizarRevisaoTexto(item.materia) === normalizarRevisaoTexto(mat.subject)).length;
    document.getElementById('assuntosTotalValue').textContent = topicos.length;
    document.getElementById('assuntosEstudadosValue').textContent = estudados;
    document.getElementById('assuntosRevisoesValue').textContent = revisoes;
    document.getElementById('assuntosDominadosValue').textContent = dominados;
    document.getElementById('assuntosErrosValue').textContent = errosRegistrados;
    const correspondeFiltro = (topico) => {
        const estado = obterEstadoTopicoControle(mat, topico);
        const nivel = obterNivelDominioTopico(topico);
        if (filtroAssuntosAtual === 'todos') return true;
        if (filtroAssuntosAtual === 'novos') return nivel === 0;
        if (filtroAssuntosAtual === 'estudo') return [1, 2].includes(nivel) && estado !== 'revisar';
        if (filtroAssuntosAtual === 'revisar') return estado === 'revisar';
        if (filtroAssuntosAtual === 'dominados') return nivel === 3;
        return nivel < 3 || estado === 'revisar';
    };
    const prioridadeValor = topico => ({ alta: 0, media: 1, baixa: 2 }[topico.prioridade || 'media']);
    const comparar = (a, b) => {
        if (ordenacaoAssuntosAtual === 'nome') return String(a.topico.nome || '').localeCompare(String(b.topico.nome || ''), 'pt-BR');
        if (ordenacaoAssuntosAtual === 'prioridade') return prioridadeValor(a.topico) - prioridadeValor(b.topico) || pontuacaoAcaoTopico(mat, a.topico) - pontuacaoAcaoTopico(mat, b.topico);
        if (ordenacaoAssuntosAtual === 'revisao') return (obterRevisaoAtivaTopico(mat, a.topico)?.dataAlvo || '9999-12-31').localeCompare(obterRevisaoAtivaTopico(mat, b.topico)?.dataAlvo || '9999-12-31');
        return pontuacaoAcaoTopico(mat, a.topico) - pontuacaoAcaoTopico(mat, b.topico) || prioridadeValor(a.topico) - prioridadeValor(b.topico);
    };
    const visiveis = topicos.map((topico, index) => ({ topico, index }))
        .filter(({ topico }) => {
            const termo = normalizarRevisaoTexto(`${topico.nome || ''} ${topico.notas || ''}`);
            return correspondeFiltro(topico) && (!buscaAssuntosAtual || termo.includes(normalizarRevisaoTexto(buscaAssuntosAtual)));
        }).sort(comparar);
    document.getElementById('assuntosBuscaResultado').textContent = `${visiveis.length} de ${topicos.length}`;
    if (!topicos.length) {
        assuntoSelecionadoIndice = null;
        lista.innerHTML = '<li class="topics-empty"><strong>Nenhum conteúdo cadastrado</strong><small>Adicione o primeiro tópico acima para começar seu mapa de estudos.</small></li>';
        renderizarPainelControleTopico(id, null);
        return;
    }
    if (!visiveis.length) {
        assuntoSelecionadoIndice = null;
        lista.innerHTML = '<li class="topics-empty"><strong>Nenhum tópico neste filtro</strong><small>Troque o filtro, limpe a busca ou adicione um novo conteúdo.</small></li>';
        renderizarPainelControleTopico(id, null);
        return;
    }
    if (!visiveis.some(item => item.index === assuntoSelecionadoIndice)) assuntoSelecionadoIndice = visiveis[0].index;
    lista.innerHTML = visiveis.map(({ topico: t, index: i }) => {
        const nome = escaparRevisaoHtml(t.nome || 'Tópico');
        const vezes = Number(t.vezesEstudado) || 0;
        const nivel = obterNivelDominioTopico(t);
        const estado = obterEstadoTopicoControle(mat, t);
        const revisao = obterRevisaoAtivaTopico(mat, t);
        const ultimaData = t.ultimoEstudoEm ? new Date(t.ultimoEstudoEm).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }).replace('.', '') : '';
        const meta = rotuloDataRevisao(revisao?.dataAlvo) || (vezes ? `${vezes} ${vezes === 1 ? 'estudo' : 'estudos'}${ultimaData ? ` • último ${ultimaData}` : ''}` : 'Ainda não iniciado');
        const prioridade = t.prioridade || 'media';
        const icone = estado === 'revisar' ? '↻' : (nivel === 3 ? '✓' : String(nivel));
        return `<li class="topic-organizer-item state-${estado} ${i === assuntoSelecionadoIndice ? 'selected' : ''}"><button type="button" class="topic-select-button" onclick="selecionarTopicoControle(${id},${i})" aria-pressed="${i === assuntoSelecionadoIndice}"><span class="topic-state-mark">${icone}</span><span class="topic-organizer-copy"><span class="topic-organizer-title"><strong>${nome}</strong>${prioridade !== 'media' ? `<em class="topic-priority-badge ${prioridade}">${prioridade}</em>` : ''}</span><small>${meta}</small><span class="topic-mini-progress" aria-label="Nível ${nivel} de 3"><i class="${nivel >= 1 ? 'done' : ''}"></i><i class="${nivel >= 2 ? 'done' : ''}"></i><i class="${nivel >= 3 ? 'done' : ''}"></i></span></span></button><button type="button" class="topic-quick-study" onclick="solicitarRegistroTopico(${id},${i})" aria-label="Registrar estudo rápido em ${nome}" title="Estudei hoje">+</button></li>`;
    }).join('');
    renderizarPainelControleTopico(id, assuntoSelecionadoIndice);
}

function selecionarTopicoControle(id, indice) {
    assuntoSelecionadoIndice = indice;
    abaDetalheTopicoAtual = 'visao';
    renderizarListaAssuntos(id);
}

function alternarAbaTopicoDetalhe(aba = 'visao') {
    abaDetalheTopicoAtual = ['visao', 'controle', 'registros'].includes(aba) ? aba : 'visao';
    document.querySelectorAll('#topicControlPanel [data-topic-detail-tab]').forEach(botao => {
        const ativo = botao.dataset.topicDetailTab === abaDetalheTopicoAtual;
        botao.classList.toggle('active', ativo); botao.setAttribute('aria-selected', String(ativo));
    });
    document.querySelectorAll('#topicControlPanel [data-topic-pane]').forEach(painel => painel.hidden = painel.dataset.topicPane !== abaDetalheTopicoAtual);
}

function renderizarPainelControleTopico(id, indice) {
    const painel = document.getElementById('topicControlPanel');
    const materia = appData.cycleItems.find(item => item.id === id);
    const topico = Number.isInteger(indice) ? materia?.topicos?.[indice] : null;
    if (!painel) return;
    if (!materia || !topico) {
        painel.innerHTML = '<div class="topics-empty"><strong>Escolha um tópico</strong><small>Os controles de domínio e revisão aparecerão aqui.</small></div>';
        return;
    }
    const nivel = obterNivelDominioTopico(topico);
    const estado = obterEstadoTopicoControle(materia, topico);
    const revisao = obterRevisaoAtivaTopico(materia, topico);
    const rotulosEstado = { novo: 'Não iniciado', aprendendo: 'Aprendendo', consolidando: 'Consolidando', revisar: 'Revisar agora', dominado: 'Dominado' };
    const ultimaData = topico.ultimoEstudoEm ? new Date(topico.ultimoEstudoEm).toLocaleDateString('pt-BR') : 'nenhum registro ainda';
    const hoje = dataLocalISO(new Date());
    const analise = obterAnaliseTopico(materia, topico);
    const revisaoStatus = revisao ? `<div class="topic-review-status"><span><strong>Revisão ativa</strong><small>${rotuloDataRevisao(revisao.dataAlvo) || 'Escolha uma data'}</small></span><button type="button" class="topic-review-remove" onclick="solicitarRemocaoRevisaoTopico(${id},${indice})">Remover revisão</button></div>` : '';
    painel.innerHTML = `<div class="topic-control-header"><div><span class="workspace-kicker">DOSSIÊ DO ASSUNTO</span><h4>${escaparRevisaoHtml(topico.nome || 'Tópico')}</h4><p>${Number(topico.vezesEstudado) || 0} estudos • último: ${ultimaData}</p></div><span class="topic-state-pill">${rotulosEstado[estado]}</span></div>
        <div class="topic-detail-tabs" role="tablist" aria-label="Detalhes do assunto"><button type="button" role="tab" data-topic-detail-tab="visao" onclick="alternarAbaTopicoDetalhe('visao')">Visão geral</button><button type="button" role="tab" data-topic-detail-tab="controle" onclick="alternarAbaTopicoDetalhe('controle')">Controle e revisão</button><button type="button" role="tab" data-topic-detail-tab="registros" onclick="alternarAbaTopicoDetalhe('registros')">Registros</button></div>
        <div class="topic-detail-pane" data-topic-pane="visao">${htmlAnaliseTopico(analise)}</div>
        <div class="topic-detail-pane" data-topic-pane="controle">
        <section class="topic-control-section"><span class="topic-control-label">Nível de domínio</span><div class="topic-mastery-control" role="group" aria-label="Nível de domínio"><button type="button" class="${nivel === 0 ? 'active' : ''}" onclick="definirNivelDominioTopico(${id},${indice},0)"><b>0</b><span>Não iniciado</span></button><button type="button" class="${nivel === 1 ? 'active' : ''}" onclick="definirNivelDominioTopico(${id},${indice},1)"><b>1</b><span>Aprendendo</span></button><button type="button" class="${nivel === 2 ? 'active' : ''}" onclick="definirNivelDominioTopico(${id},${indice},2)"><b>2</b><span>Consolidando</span></button><button type="button" class="${nivel === 3 ? 'active' : ''}" onclick="definirNivelDominioTopico(${id},${indice},3)"><b>✓</b><span>Dominado</span></button></div></section>
        <form class="topic-control-section" onsubmit="salvarDetalhesTopico(event,${id},${indice})"><div class="topic-control-form-grid"><label><span class="topic-control-label">Nome do tópico</span><input class="cycle-input" id="topicControlName" maxlength="100" required value="${escaparRevisaoHtml(topico.nome || '')}"></label><label><span class="topic-control-label">Prioridade</span><select class="cycle-input" id="topicControlPriority"><option value="alta" ${topico.prioridade === 'alta' ? 'selected' : ''}>Alta</option><option value="media" ${!topico.prioridade || topico.prioridade === 'media' ? 'selected' : ''}>Média</option><option value="baixa" ${topico.prioridade === 'baixa' ? 'selected' : ''}>Baixa</option></select></label></div><label><span class="topic-control-label">Anotação de controle</span><textarea class="cycle-input" id="topicControlNotes" maxlength="500" placeholder="Ex.: erro comum, fórmula que falta fixar ou próximo exercício">${escaparRevisaoHtml(topico.notas || '')}</textarea></label><button type="submit" class="cycle-btn">Salvar ajustes</button></form>
        <section class="topic-control-section"><span class="topic-control-label">Próxima revisão</span><div class="topic-review-row"><input type="date" class="cycle-input" id="topicControlReviewDate" min="${hoje}" value="${escaparRevisaoHtml(revisao?.dataAlvo || '')}" onchange="agendarRevisaoTopico(${id},${indice},this.value)"><div class="topic-review-presets"><button type="button" onclick="definirRevisaoTopicoDias(${id},${indice},1)">+1 dia</button><button type="button" onclick="definirRevisaoTopicoDias(${id},${indice},3)">+3</button><button type="button" onclick="definirRevisaoTopicoDias(${id},${indice},7)">+7</button></div></div>${revisaoStatus}</section>
        <section class="topic-recall-box"><header><b>↻</b><span><strong>Depois de tentar lembrar sem olhar</strong><small>Registre o resultado e a próxima revisão será ajustada.</small></span></header><div class="topic-recall-actions"><button type="button" onclick="registrarDesempenhoTopico(${id},${indice},'dificil')">Difícil<small>revisar amanhã</small></button><button type="button" onclick="registrarDesempenhoTopico(${id},${indice},'parcial')">Parcial<small>revisar em 3 dias</small></button><button type="button" onclick="registrarDesempenhoTopico(${id},${indice},'seguro')">Seguro<small>revisar em 7 dias</small></button></div></section>
        <footer class="topic-control-footer"><button type="button" class="cycle-btn topic-delete-button" onclick="solicitarExclusaoTopico(${id},${indice})">Excluir tópico</button><button type="button" class="cycle-btn primary" onclick="solicitarRegistroTopico(${id},${indice})">Estudei hoje</button></footer></div>
        <div class="topic-detail-pane" data-topic-pane="registros">${htmlHistoricoTopico(analise)}</div>`;
    alternarAbaTopicoDetalhe(abaDetalheTopicoAtual);
}

function adicionarTopico(e) {
    e.preventDefault();
    const id = parseInt(document.getElementById('assuntosMateriaId').value), nm = document.getElementById('novoTopicoInput').value.trim().slice(0, 100), idx = appData.cycleItems.findIndex(m => m.id === id);
    if (idx < 0 || !nm) return;
    if (!appData.cycleItems[idx].topicos) appData.cycleItems[idx].topicos = [];
    if (appData.cycleItems[idx].topicos.some(topico => normalizarRevisaoTexto(topico.nome) === normalizarRevisaoTexto(nm))) {
        showToast('Este tópico já está cadastrado.', true); return;
    }
    appData.cycleItems[idx].topicos.push({ nome: nm, concluido: false, prioridade: 'media', nivelDominio: 0, notas: '' });
    assuntoSelecionadoIndice = appData.cycleItems[idx].topicos.length - 1;
    saveAppData(); document.getElementById('novoTopicoInput').value = ''; renderizarListaAssuntos(id); renderizarCiclo();
    showToast('Tópico adicionado à sua rota.');
}

function toggleTopico(id, tIdx) { 
    const materia = appData.cycleItems.find(m => m.id === id), topico = materia?.topicos?.[tIdx];
    if (!topico) return;
    definirNivelDominioTopico(id, tIdx, obterNivelDominioTopico(topico) === 3 ? 0 : 3);
}

function definirNivelDominioTopico(id, tIdx, nivel) {
    const materia = appData.cycleItems.find(item => item.id === id), topico = materia?.topicos?.[tIdx];
    if (!topico) return;
    const valor = Math.max(0, Math.min(3, Number(nivel) || 0));
    topico.nivelDominio = valor;
    delete topico.dominio;
    topico.concluido = valor >= 3;
    saveAppData(); renderizarListaAssuntos(id); renderizarCiclo(); renderizarMapaDominio();
}

function salvarDetalhesTopico(event, id, tIdx) {
    event.preventDefault();
    const materia = appData.cycleItems.find(item => item.id === id), topico = materia?.topicos?.[tIdx];
    if (!topico) return;
    const nomeAnterior = topico.nome;
    const novoNome = document.getElementById('topicControlName').value.trim().slice(0, 100);
    const duplicado = materia.topicos.some((item, indice) => indice !== tIdx && normalizarRevisaoTexto(item.nome) === normalizarRevisaoTexto(novoNome));
    if (!novoNome || duplicado) { showToast(duplicado ? 'Já existe outro tópico com esse nome.' : 'Informe o nome do tópico.', true); return; }
    topico.nome = novoNome;
    topico.prioridade = document.getElementById('topicControlPriority').value;
    topico.notas = document.getElementById('topicControlNotes').value.trim().slice(0, 500);
    appData.revisoesItems.forEach(item => {
        if (item.status !== 'revisado' && normalizarRevisaoTexto(item.materia) === normalizarRevisaoTexto(materia.subject) && normalizarRevisaoTexto(item.assunto) === normalizarRevisaoTexto(nomeAnterior)) item.assunto = novoNome;
    });
    saveAppData(); renderizarListaAssuntos(id); renderizarCiclo(); renderizarRevisoes(); showToast('Controle do tópico atualizado.');
}

function agendarRevisaoTopico(id, tIdx, dataAlvo) {
    const materia = appData.cycleItems.find(item => item.id === id), topico = materia?.topicos?.[tIdx];
    if (!materia || !topico) return;
    let revisao = obterRevisaoAtivaTopico(materia, topico);
    if (!revisao) {
        revisao = normalizarItemRevisao({ id: Date.now() + Math.floor(Math.random() * 1000), materia: materia.subject, assunto: topico.nome, motivos: ['reforcar'], dataEstudo: dataLocalISO(new Date()), dataAlvo: dataAlvo || '', origem: 'controle-topico', tags: [], atualizadoEm: Date.now(), status: 'pendente', criadoEm: Date.now() });
        appData.revisoesItems.push(revisao);
    } else {
        revisao.dataAlvo = dataAlvo || '';
        revisao.status = 'pendente';
        revisao.atualizadoEm = Date.now();
    }
    topico.proximaRevisaoEm = dataAlvo || '';
    saveAppData(); renderizarListaAssuntos(id); renderizarRevisoes();
}

function definirRevisaoTopicoDias(id, tIdx, dias) {
    const data = new Date(); data.setHours(12, 0, 0, 0); data.setDate(data.getDate() + Math.max(1, Number(dias) || 1));
    agendarRevisaoTopico(id, tIdx, dataLocalISO(data));
    showToast(`Revisão agendada para ${data.toLocaleDateString('pt-BR')}.`);
}

function solicitarRegistroTopico(id, tIdx) {
    const materia = appData.cycleItems.find(item => item.id === id), topico = materia?.topicos?.[tIdx];
    if (!materia || !topico) return;
    const revisao = obterRevisaoAtivaTopico(materia, topico);
    if (!revisao) { registrarTopicoEstudado(id, tIdx); return; }
    const data = rotuloDataRevisao(revisao.dataAlvo).toLocaleLowerCase('pt-BR') || 'já agendada';
    abrirModalDeletar('repeatTopicStudy', `${id}:${tIdx}`, 'Registrar novamente?', `“${topico.nome}” já tem uma revisão ativa (${data}). Se continuar, o estudo será registrado outra vez e a revisão será reagendada.`, 'Registrar novamente', false);
}

function solicitarRemocaoRevisaoTopico(id, tIdx) {
    const materia = appData.cycleItems.find(item => item.id === id), topico = materia?.topicos?.[tIdx];
    if (!materia || !topico || !obterRevisaoAtivaTopico(materia, topico)) return;
    abrirModalDeletar('topicReview', `${id}:${tIdx}`, 'Remover esta revisão?', `A revisão ativa de “${topico.nome}” será retirada da agenda. O histórico de estudos continuará preservado.`, 'Remover revisão', true);
}

function removerRevisaoTopico(id, tIdx) {
    const materia = appData.cycleItems.find(item => item.id === id), topico = materia?.topicos?.[tIdx];
    if (!materia || !topico) return;
    const materiaChave = normalizarRevisaoTexto(materia.subject), topicoChave = normalizarRevisaoTexto(topico.nome);
    const quantidadeAnterior = appData.revisoesItems.length;
    appData.revisoesItems = appData.revisoesItems.filter(item => item.status === 'revisado'
        || normalizarRevisaoTexto(item.materia) !== materiaChave
        || normalizarRevisaoTexto(item.assunto) !== topicoChave);
    topico.proximaRevisaoEm = '';
    saveAppData(); renderizarListaAssuntos(id); renderizarRevisoes();
    if (document.getElementById('topic-workspace')?.classList.contains('active')) renderizarEspacoTopico();
    showToast(quantidadeAnterior === appData.revisoesItems.length ? 'Não havia revisão ativa para remover.' : 'Revisão removida da agenda.');
}

function solicitarExclusaoTopico(id, tIdx) {
    const topico = appData.cycleItems.find(item => item.id === id)?.topicos?.[tIdx];
    if (!topico) return;
    abrirModalDeletar('topico', `${id}:${tIdx}`, 'Excluir este tópico?', `“${topico.nome}” sairá da matéria. Seu histórico de estudos será preservado.`);
}

function deletarTopico(id, tIdx) {
    const idx = appData.cycleItems.findIndex(m => m.id === id);
    if (idx < 0 || !appData.cycleItems[idx].topicos?.[tIdx]) return;
    appData.cycleItems[idx].topicos.splice(tIdx, 1);
    assuntoSelecionadoIndice = null;
    saveAppData(); renderizarListaAssuntos(id); renderizarCiclo(); renderizarMapaDominio(); showToast('Tópico removido.');
}

function concluirRevisaoAtivaTopico(materia, topico) {
    const revisao = obterRevisaoAtivaTopico(materia, topico);
    if (!revisao) return;
    revisao.status = 'revisado';
    revisao.revisadoEm = Date.now();
    revisao.atualizadoEm = Date.now();
}

function registrarTopicoEstudado(id, tIdx, diasRevisao = null, desempenho = '') {
    const materia = appData.cycleItems.find(item => item.id === id);
    const topico = materia?.topicos?.[tIdx];
    if (!materia || !topico) return;
    concluirRevisaoAtivaTopico(materia, topico);
    atualizarTopicoAposEstudo(materia, topico.nome);
    appData.historyItems.push(criarItemHistoricoRegistro({ materia: materia.subject, assunto: topico.nome, cor: materia.color, tipo: 'Estudo',
        comentario: desempenho ? `Recuperação ativa: ${desempenho}.` : 'Registro rápido pelo organizador de tópicos.', atividade: 'estudo', registroRapido: true }));
    const intervalo = diasRevisao || appData.studyLogging.reviewDelayDays;
    const revisaoCriada = (diasRevisao !== null || appData.studyLogging.autoReview !== false)
        ? criarRevisaoAutomaticaRegistro(materia.subject, topico.nome, intervalo, desempenho ? 'recuperacao-ativa' : 'topico-rapido') : false;
    const revisao = obterRevisaoAtivaTopico(materia, topico);
    topico.proximaRevisaoEm = revisao?.dataAlvo || '';
    saveAppData(); renderizarListaAssuntos(id); renderizarCiclo(); renderizarRevisoes();
    showToast(revisaoCriada ? '✓ Estudo registrado e revisão agendada.' : '✓ Estudo registrado para hoje.');
}

function registrarDesempenhoTopico(id, tIdx, desempenho) {
    const configuracao = { dificil: { dias: 1, prioridade: 'alta' }, parcial: { dias: 3, prioridade: 'media' }, seguro: { dias: 7, prioridade: 'baixa' } }[desempenho];
    const topico = appData.cycleItems.find(item => item.id === id)?.topicos?.[tIdx];
    if (!configuracao || !topico) return;
    topico.prioridade = configuracao.prioridade;
    registrarTopicoEstudado(id, tIdx, configuracao.dias, desempenho);
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
        const nome = item.materia || 'Sem matéria';
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
            const corTipo = sessao.atividade === 'simulado' ? '#ff9500' : (sessao.atividade === 'redacao' ? '#af52de' : corMateria);
            const materia = escaparRevisaoHtml(sessao.materia || 'Sem matéria');
            const assunto = escaparRevisaoHtml(sessao.assunto || 'Sessão livre');
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

    const minutosSemMateria = appData.historyItems
        .filter(item => ['sem matéria', 'sem materia', 'estudo livre'].includes(normalizarRevisaoTexto(item.materia)))
        .reduce((total, item) => total + Math.max(0, Number(item.tempoSegundos) || 0), 0) / 60;
    if (minutosSemMateria > 0) {
        breakdown.push({ nome: 'Sem matéria', min: minutosSemMateria, cor: '#515154', corOriginal: '#515154', taxa: -1, icon: '⏱', tag: '' });
        totalMinutosExecutados += minutosSemMateria;
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
    const duration = Number(document.getElementById('agendamentoDurationInput').value) || 60;

    if (idEdit) {
        const idx = appData.agendamentoItems.findIndex(i => i.id == idEdit);
        if (idx > -1) appData.agendamentoItems[idx] = { ...appData.agendamentoItems[idx], title, date, time, type, description, duration };
    } else {
        appData.agendamentoItems.push({ id: Date.now(), title, date, time, type, description, duration, completed: false });
    }
    saveAppData(); renderizarAgendamento(); fecharModal('agendamentoModal'); showToast('📅 Agendado com sucesso!');
    window.kingCalendar?.syncIfConnected();
}

function toggleAgendamentoStatus(id) {
    const idx = appData.agendamentoItems.findIndex(i => i.id === id);
    if(idx > -1) {
        appData.agendamentoItems[idx].completed = !appData.agendamentoItems[idx].completed;
        saveAppData(); renderizarAgendamento();
        window.kingCalendar?.syncIfConnected();
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
        document.getElementById('agendamentoDurationInput').value = String(item.duration || 60);
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

function normalizarImagemRevisao(imagem) {
    if (!imagem?.id) return null;
    return {
        id: String(imagem.id).replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 90),
        name: String(imagem.name || 'Foto da revisão').slice(0, 100),
        type: ['image/png', 'image/jpeg', 'image/webp'].includes(imagem.type) ? imagem.type : 'image/webp',
        width: Math.max(1, Math.min(2400, Number(imagem.width) || 1)),
        height: Math.max(1, Math.min(2400, Number(imagem.height) || 1))
    };
}

function normalizarItemRevisao(item = {}) {
    const agora = Date.now();
    const id = Number(item.id) || agora + Math.floor(Math.random() * 1000);
    const criadoEm = Number(item.criadoEm) || (id > 1e11 ? id : agora);
    const motivos = [...new Set((Array.isArray(item.motivos) ? item.motivos : []).filter(motivo => REVISAO_MOTIVOS[motivo]))];
    const status = ['pendente', 'fraco', 'revisado'].includes(item.status) ? item.status : 'pendente';
    const dataCriacao = new Date(criadoEm);
    const materiaRecebida = String(item.materia || '').trim();
    const materiaCadastrada = (Array.isArray(appData?.cycleItems) ? appData.cycleItems : []).find(materia =>
        String(materia.id) === materiaRecebida || normalizarRevisaoTexto(materia.subject) === normalizarRevisaoTexto(materiaRecebida)
    );
    return {
        ...item,
        id,
        materia: String(materiaCadastrada?.subject || materiaRecebida || 'Sem matéria').trim().slice(0, 60),
        assunto: String(item.assunto || '').trim().slice(0, 120),
        motivos,
        observacao: String(item.observacao || '').trim().slice(0, 500),
        questao: String(item.questao || '').trim().slice(0, 1000),
        link: /^https?:\/\//i.test(String(item.link || '').trim()) ? String(item.link).trim().slice(0, 500) : '',
        fonte: String(item.fonte || '').trim().slice(0, 120),
        numeroQuestao: String(item.numeroQuestao || '').trim().slice(0, 30),
        dataEstudo: /^\d{4}-\d{2}-\d{2}$/.test(item.dataEstudo || '') ? item.dataEstudo : dataLocalISO(dataCriacao),
        horaEstudo: /^\d{2}:\d{2}$/.test(item.horaEstudo || '') ? item.horaEstudo : dataCriacao.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
        dataAlvo: /^\d{4}-\d{2}-\d{2}$/.test(item.dataAlvo || '') ? item.dataAlvo : '',
        origem: String(item.origem || 'manual').slice(0, 50),
        scheduleBlockId: String(item.scheduleBlockId || '').slice(0, 100),
        scheduleWeekKey: String(item.scheduleWeekKey || '').slice(0, 20),
        blocoTitulo: String(item.blocoTitulo || '').slice(0, 140),
        imagem: normalizarImagemRevisao(item.imagem),
        tags: [...new Set((Array.isArray(item.tags) ? item.tags : []).map(String).filter(Boolean).slice(0, 12))],
        status,
        estimativaMin: Math.max(1, Math.min(60, Number(item.estimativaMin) || 5)),
        historicoRevisoes: Array.isArray(item.historicoRevisoes) ? item.historicoRevisoes.slice(-20) : [],
        criadoEm,
        atualizadoEm: Number(item.atualizadoEm) || criadoEm,
        revisadoEm: Number(item.revisadoEm) || null
    };
}

function dataRevisaoComDias(dias = 1, base = new Date()) {
    const data = new Date(base);
    data.setHours(12, 0, 0, 0);
    data.setDate(data.getDate() + Number(dias || 0));
    return dataLocalISO(data);
}

function obterBlocoCronogramaRevisao() {
    const ativo = appData.activeScheduleBlock;
    if (!ativo?.weekKey || !ativo?.blockId) return null;
    return appData.studySchedule?.weeks?.[ativo.weekKey]?.blocks?.find(bloco => String(bloco.id) === String(ativo.blockId)) || null;
}

function obterContextoRevisaoRapida() {
    const agora = new Date();
    const bloco = obterBlocoCronogramaRevisao();
    const seletorSessao = document.getElementById('sessionCompleteModal')?.classList.contains('active') ? document.getElementById('sessionSubject')?.value : '';
    const materiaId = bloco?.subjectId || seletorSessao || document.getElementById('activeSubjectSelect')?.value || '';
    const materia = appData.cycleItems.find(item => String(item.id) === String(materiaId)) || null;
    const assuntoSessao = document.getElementById('sessionCompleteModal')?.classList.contains('active') ? document.getElementById('sessionTopic')?.value?.trim() : '';
    return {
        materia,
        assunto: assuntoSessao || bloco?.topic || '',
        dataEstudo: dataLocalISO(agora),
        horaEstudo: agora.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
        scheduleBlockId: bloco?.id || '',
        scheduleWeekKey: appData.activeScheduleBlock?.weekKey || '',
        blocoTitulo: bloco ? `${bloco.start || ''}${bloco.start ? ' · ' : ''}${bloco.topic || bloco.kind || 'Bloco de estudo'}` : ''
    };
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

let revisaoImagemRascunho = null;
let revisaoImagemProcessando = false;
let revisaoImagemOriginalId = '';
const revisaoImagemCache = new Map();

function definirStatusImagemRevisao(mensagem = '', erro = false) {
    const status = document.getElementById('revisaoImagemStatus');
    if (!status) return;
    status.textContent = mensagem;
    status.classList.toggle('error', erro);
}

async function obterImagemRevisao(imageId) {
    if (revisaoImagemCache.has(imageId)) return revisaoImagemCache.get(imageId);
    if (!window.kingCloud?.getReviewImage) throw new Error('A nuvem da foto ainda está sendo preparada.');
    const imagem = await window.kingCloud.getReviewImage(imageId);
    revisaoImagemCache.set(imageId, imagem);
    return imagem;
}

function renderizarPreviaImagemRevisao() {
    const container = document.getElementById('revisaoImagemPreview');
    if (!container) return;
    container.replaceChildren();
    if (!revisaoImagemRascunho) return;
    const figura = document.createElement('figure');
    const img = document.createElement('img');
    img.alt = revisaoImagemRascunho.name || 'Foto da revisão';
    img.hidden = !revisaoImagemRascunho.dataUrl;
    if (revisaoImagemRascunho.dataUrl) img.src = revisaoImagemRascunho.dataUrl;
    const nome = document.createElement('span');
    nome.textContent = revisaoImagemRascunho.name || 'Foto da revisão';
    const remover = document.createElement('button');
    remover.type = 'button';
    remover.textContent = '×';
    remover.setAttribute('aria-label', 'Remover foto da revisão');
    remover.onclick = removerImagemRevisao;
    figura.append(img, nome, remover);
    container.append(figura);
    if (!revisaoImagemRascunho.dataUrl) obterImagemRevisao(revisaoImagemRascunho.id).then(imagem => {
        if (!revisaoImagemRascunho || revisaoImagemRascunho.id !== imagem.id) return;
        revisaoImagemRascunho = { ...revisaoImagemRascunho, dataUrl: imagem.dataUrl };
        img.src = imagem.dataUrl;
        img.hidden = false;
    }).catch(error => definirStatusImagemRevisao(error.message, true));
}

async function selecionarImagemRevisao(event) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file || revisaoImagemProcessando) return;
    const fingerprint = `${file.name}:${file.size}:${file.lastModified}`;
    if (revisaoImagemRascunho?.fingerprint === fingerprint) return definirStatusImagemRevisao('Essa foto já foi selecionada.');
    revisaoImagemProcessando = true;
    definirStatusImagemRevisao('Otimizando a foto para a nuvem…');
    try {
        const imagem = await otimizarImagemCadernoErro(file, 'question');
        revisaoImagemRascunho = { ...imagem, name: file.name || 'Foto da revisão', fingerprint, nova: true };
        renderizarPreviaImagemRevisao();
        definirStatusImagemRevisao('Foto pronta para salvar.');
    } catch (error) {
        definirStatusImagemRevisao(error.message || 'Não foi possível preparar a foto.', true);
    } finally { revisaoImagemProcessando = false; }
}

function removerImagemRevisao() {
    revisaoImagemRascunho = null;
    renderizarPreviaImagemRevisao();
    definirStatusImagemRevisao('A foto será removida ao salvar.');
}

function definirPrazoRevisaoRapida(dias) {
    const input = document.getElementById('revisaoDataAlvo');
    if (!input) return;
    input.value = dataRevisaoComDias(Number(dias) || 0);
    sincronizarPrazoRevisaoRapida();
}

function sincronizarPrazoRevisaoRapida() {
    const valor = document.getElementById('revisaoDataAlvo')?.value || '';
    document.querySelectorAll('[data-review-days]').forEach(botao => {
        const ativo = valor === dataRevisaoComDias(Number(botao.dataset.reviewDays) || 0);
        botao.classList.toggle('active', ativo);
        botao.setAttribute('aria-pressed', String(ativo));
    });
}

function abrirModalRevisao(id = null) {
    if (isRunning && currentMode === 'estudo') toggleTimer();
    const form = document.getElementById('formAddRevisao');
    const select = document.getElementById('revisaoMateria');
    const assunto = document.getElementById('revisaoAssunto');
    const aviso = document.getElementById('revisaoSemMaterias');
    const submit = document.getElementById('revisaoSalvarBotao');
    const itemEncontrado = id ? appData.revisoesItems.find(revisao => revisao.id === Number(id)) : null;
    const item = itemEncontrado ? normalizarItemRevisao(itemEncontrado) : null;
    const contexto = obterContextoRevisaoRapida();
    const temMaterias = appData.cycleItems.length > 0 || Boolean(item);
    form.reset();
    document.getElementById('revisaoModalTitle').textContent = item ? 'Abrir revisão' : 'Revisar depois';
    document.getElementById('revisaoEditId').value = item?.id || '';
    document.getElementById('revisaoOrigem').value = item?.origem || (contexto.scheduleBlockId ? 'cronograma-rapido' : 'captura-rapida');
    document.getElementById('revisaoDataEstudo').value = item?.dataEstudo || contexto.dataEstudo;
    document.getElementById('revisaoHoraEstudo').value = item?.horaEstudo || contexto.horaEstudo;
    document.getElementById('revisaoBlocoId').value = item?.scheduleBlockId || contexto.scheduleBlockId;
    document.getElementById('revisaoSemanaChave').value = item?.scheduleWeekKey || contexto.scheduleWeekKey;
    const materias = appData.cycleItems.map(materia => materia.subject);
    if (item?.materia && !materias.includes(item.materia)) materias.unshift(item.materia);
    select.innerHTML = temMaterias
        ? materias.map(materia => `<option value="${escaparRevisaoHtml(materia)}">${escaparRevisaoHtml(materia)}</option>`).join('')
        : '<option value="">Nenhuma matéria cadastrada</option>';
    const materiaPreferida = item?.materia || contexto.materia?.subject || materias[0] || '';
    select.value = materiaPreferida;
    atualizarAssuntosRevisao();
    assunto.value = item?.assunto || contexto.assunto || '';
    document.getElementById('revisaoDataAlvo').value = item?.dataAlvo || dataRevisaoComDias(1);
    document.getElementById('revisaoObservacao').value = item?.observacao || '';
    document.getElementById('revisaoQuestao').value = item?.questao || '';
    document.getElementById('revisaoFonte').value = item?.fonte || '';
    document.getElementById('revisaoNumeroQuestao').value = item?.numeroQuestao || '';
    document.getElementById('revisaoLink').value = item?.link || '';
    document.querySelectorAll('#revisaoMotivos input[type="checkbox"]').forEach(input => { input.checked = Boolean(item?.motivos?.includes(input.value)); });
    revisaoImagemRascunho = item?.imagem ? { ...item.imagem, nova: false } : null;
    revisaoImagemOriginalId = item?.imagem?.id || '';
    definirStatusImagemRevisao('');
    renderizarPreviaImagemRevisao();
    renderTagsRevisaoSelecionaveis(item?.tags || []);
    const possuiDetalhes = Boolean(item && (item.observacao || item.questao || item.fonte || item.numeroQuestao || item.link || item.imagem || item.tags?.length));
    const detalhes = document.querySelector('#revisaoModal .review-optional-details');
    if (detalhes) detalhes.open = possuiDetalhes;
    select.disabled = !temMaterias;
    assunto.disabled = !temMaterias;
    document.getElementById('revisaoDataAlvo').disabled = !temMaterias;
    submit.disabled = !temMaterias;
    submit.textContent = item ? 'Salvar alterações' : 'Adicionar revisão';
    aviso.style.display = temMaterias ? 'none' : 'block';
    document.getElementById('revisaoContextoTitulo').textContent = item ? 'Registro da revisão' : (contexto.blocoTitulo || 'Captura rápida');
    document.getElementById('revisaoContextoDetalhe').textContent = item
        ? `${item.dataEstudo.split('-').reverse().join('/')} às ${item.horaEstudo}`
        : `${contexto.dataEstudo.split('-').reverse().join('/')} às ${contexto.horaEstudo}${contexto.scheduleBlockId ? ' · vinculado ao bloco atual' : ''}`;
    sincronizarPrazoRevisaoRapida();
    document.getElementById('revisaoModal').classList.add('active');
    setTimeout(() => (assunto.value ? document.querySelector('#revisaoMotivos input') : assunto)?.focus(), 80);
}

function atualizarAssuntosRevisao() {
    const materiaNome = document.getElementById('revisaoMateria')?.value;
    const materia = appData.cycleItems.find(item => normalizarRevisaoTexto(item.subject) === normalizarRevisaoTexto(materiaNome));
    const datalist = document.getElementById('revisaoAssuntosOptions');
    if (!datalist) return;
    datalist.innerHTML = (materia?.topicos || []).map(topico => `<option value="${escaparRevisaoHtml(topico.nome)}"></option>`).join('');
}

async function salvarRevisao(e) {
    e.preventDefault();
    if (document.getElementById('revisaoSalvarBotao')?.disabled) return;
    const idEdit = Number(document.getElementById('revisaoEditId').value) || null;
    if (!appData.cycleItems.length && !idEdit) return;
    const motivos = [...document.querySelectorAll('#revisaoMotivos input[type="checkbox"]:checked')].map(input => input.value).filter(motivo => REVISAO_MOTIVOS[motivo]);
    if (!motivos.length) return showToast('Escolha pelo menos um motivo para a revisão.', true);
    const assunto = document.getElementById('revisaoAssunto').value.trim();
    if (!assunto) return showToast('Informe o assunto que precisa voltar ao foco.', true);
    const submit = document.getElementById('revisaoSalvarBotao');
    const idRegistro = idEdit || Date.now();
    const itemAnterior = idEdit ? appData.revisoesItems.find(item => item.id === idEdit) : null;
    let imagemSalva = revisaoImagemRascunho ? normalizarImagemRevisao(revisaoImagemRascunho) : null;
    submit.disabled = true;
    submit.textContent = revisaoImagemRascunho?.nova ? 'Enviando foto…' : 'Salvando…';
    try {
        if (revisaoImagemRascunho?.nova) {
            if (!window.kingCloud?.saveReviewImage) throw new Error('A nuvem da foto ainda não está disponível. Aguarde e tente novamente.');
            imagemSalva = await window.kingCloud.saveReviewImage({ ...revisaoImagemRascunho, reviewId: idRegistro });
            revisaoImagemCache.set(imagemSalva.id, { ...imagemSalva, dataUrl: revisaoImagemRascunho.dataUrl });
        }
    const dados = {
        materia: document.getElementById('revisaoMateria').value,
        assunto,
        motivos,
        observacao: document.getElementById('revisaoObservacao').value.trim(),
        questao: document.getElementById('revisaoQuestao').value.trim(),
        fonte: document.getElementById('revisaoFonte').value.trim(),
        numeroQuestao: document.getElementById('revisaoNumeroQuestao').value.trim(),
        link: document.getElementById('revisaoLink').value.trim(),
        dataEstudo: document.getElementById('revisaoDataEstudo').value,
        horaEstudo: document.getElementById('revisaoHoraEstudo').value,
        dataAlvo: document.getElementById('revisaoDataAlvo').value,
        origem: document.getElementById('revisaoOrigem').value || 'manual',
        scheduleBlockId: document.getElementById('revisaoBlocoId').value,
        scheduleWeekKey: document.getElementById('revisaoSemanaChave').value,
        blocoTitulo: itemAnterior?.blocoTitulo || obterContextoRevisaoRapida().blocoTitulo,
        imagem: imagemSalva,
        tags: obterTagsSelecionadasFormulario(),
        atualizadoEm: Date.now()
    };
    if (idEdit) {
        const indice = appData.revisoesItems.findIndex(item => item.id === idEdit);
        if (indice < 0) return;
        appData.revisoesItems[indice] = normalizarItemRevisao({ ...appData.revisoesItems[indice], ...dados });
    } else {
        appData.revisoesItems.push(normalizarItemRevisao({ id: idRegistro, ...dados, status: 'pendente', criadoEm: Date.now() }));
    }
    saveAppData();
    renderizarRevisoes();
    fecharModal('revisaoModal');
        if (revisaoImagemOriginalId && revisaoImagemOriginalId !== imagemSalva?.id) {
            revisaoImagemCache.delete(revisaoImagemOriginalId);
            window.kingCloud?.deleteReviewImage?.(revisaoImagemOriginalId).catch(() => {});
        }
        showToast(idEdit ? 'Revisão atualizada.' : '✓ Revisão adicionada. Continue seu estudo.');
    } catch (error) {
        definirStatusImagemRevisao(error.message || 'Não foi possível salvar a revisão.', true);
        showToast(error.message || 'Não foi possível salvar a revisão.', true);
    } finally {
        submit.disabled = false;
        submit.textContent = idEdit ? 'Salvar alterações' : 'Adicionar revisão';
    }
}

function marcarRevisao(id, novoStatus) {
    const item = appData.revisoesItems.find(revisao => revisao.id === id);
    if (!item) return;
    item.status = novoStatus;
    item.atualizadoEm = Date.now();
    item.historicoRevisoes = [...(item.historicoRevisoes || []), { acao: novoStatus === 'revisado' ? 'concluida' : 'ainda-fraca', em: Date.now(), dataAlvo: item.dataAlvo }].slice(-20);
    if (novoStatus === 'revisado') item.revisadoEm = Date.now();
    saveAppData();
    renderizarRevisoes();
    showToast(novoStatus === 'fraco' ? 'Revisão voltou à fila como ainda fraca.' : 'Revisão concluída e preservada no histórico.');
}

function adiarRevisao(id, dias = 1) {
    const item = appData.revisoesItems.find(revisao => revisao.id === Number(id));
    if (!item) return;
    const hoje = dataISOParaLocal(dataLocalISO());
    const atual = dataISOParaLocal(item.dataAlvo);
    const base = atual && atual > hoje ? atual : hoje;
    item.dataAlvo = dataRevisaoComDias(Math.max(1, Number(dias) || 1), base);
    item.status = 'pendente';
    item.atualizadoEm = Date.now();
    item.historicoRevisoes = [...(item.historicoRevisoes || []), { acao: 'adiada', dias: Number(dias) || 1, em: Date.now(), dataAlvo: item.dataAlvo }].slice(-20);
    saveAppData(); renderizarRevisoes();
    showToast(`Revisão adiada para ${new Date(`${item.dataAlvo}T12:00:00`).toLocaleDateString('pt-BR')}.`);
}

function revisarNovamenteRevisao(id) {
    const item = appData.revisoesItems.find(revisao => revisao.id === Number(id));
    if (!item) return;
    item.status = 'pendente';
    item.dataAlvo = dataRevisaoComDias(1);
    item.ultimaRevisaoEm = dataLocalISO();
    item.atualizadoEm = Date.now();
    item.historicoRevisoes = [...(item.historicoRevisoes || []), { acao: 'reaberta', em: Date.now(), dataAlvo: item.dataAlvo }].slice(-20);
    saveAppData(); renderizarRevisoes();
    showToast('Revisão reaberta para amanhã.');
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
    item.historicoRevisoes = [...(item.historicoRevisoes || []), { acao: 'reagendada', em: Date.now(), dataAlvo: item.dataAlvo }].slice(-20);
    saveAppData();
    renderizarRevisoes();
    fecharModal('reagendarRevisaoModal');
    showToast('Nova data de revisão marcada.');
}

function abrirModalTagsRevisao() {
    cancelarEdicaoTagRevisao();
    renderGerenciadorTagsRevisao();
    document.getElementById('tagsRevisaoModal').classList.add('active');
    setTimeout(() => document.getElementById('novaTagRevisao')?.focus(), 50);
}

function renderGerenciadorTagsRevisao() {
    const lista = document.getElementById('revisaoTagsLista');
    if (!lista) return;
    lista.innerHTML = appData.revisaoTags.length
        ? [...appData.revisaoTags].sort((a, b) => a.localeCompare(b, 'pt-BR')).map(tag => `<span class="revision-tag-chip revision-tag-manage"><span>${escaparRevisaoHtml(tag)}</span><button type="button" onclick="editarTagRevisao('${encodeURIComponent(tag)}')" aria-label="Alterar ${escaparRevisaoHtml(tag)}">✎</button><button type="button" onclick="excluirTagRevisao('${encodeURIComponent(tag)}')" aria-label="Excluir ${escaparRevisaoHtml(tag)}">×</button></span>`).join('')
        : '<span class="revision-tag-empty">Crie sua primeira tag para reutilizá-la nas revisões.</span>';
}

let tagRevisaoEmEdicao = '';

function editarTagRevisao(tagCodificada) {
    const tag = decodeURIComponent(tagCodificada || '');
    if (!appData.revisaoTags.includes(tag)) return;
    tagRevisaoEmEdicao = tag;
    document.getElementById('novaTagRevisao').value = tag;
    document.getElementById('salvarTagRevisaoButton').textContent = 'Salvar';
    document.getElementById('cancelarEdicaoTagRevisao').hidden = false;
    document.getElementById('novaTagRevisao').focus();
}

function cancelarEdicaoTagRevisao() {
    tagRevisaoEmEdicao = '';
    const input = document.getElementById('novaTagRevisao');
    if (input) input.value = '';
    const botao = document.getElementById('salvarTagRevisaoButton');
    if (botao) botao.textContent = 'Criar';
    const cancelar = document.getElementById('cancelarEdicaoTagRevisao');
    if (cancelar) cancelar.hidden = true;
}

function excluirTagRevisao(tagCodificada) {
    const tag = decodeURIComponent(tagCodificada || '');
    if (!appData.revisaoTags.includes(tag)) return;
    abrirModalDeletar('revisaoTag', tag, 'Excluir esta tag?', `A tag “${tag}” será retirada também das revisões em que foi usada. As revisões não serão apagadas.`);
}

function salvarTagRevisao(e) {
    e.preventDefault();
    const input = document.getElementById('novaTagRevisao');
    const tag = input.value.trim();
    if (!tag) return;
    if (appData.revisaoTags.some(item => item !== tagRevisaoEmEdicao && normalizarRevisaoTexto(item) === normalizarRevisaoTexto(tag))) {
        return showToast('Essa tag já existe.', true);
    }
    const selecionadas = obterTagsSelecionadasFormulario();
    const tagAntiga = tagRevisaoEmEdicao;
    if (tagRevisaoEmEdicao) {
        const antiga = tagRevisaoEmEdicao;
        appData.revisaoTags = appData.revisaoTags.map(item => item === antiga ? tag : item);
        appData.revisoesItems.forEach(revisao => revisao.tags = (revisao.tags || []).map(item => item === antiga ? tag : item));
    } else appData.revisaoTags.push(tag);
    saveAppData();
    const editada = Boolean(tagRevisaoEmEdicao);
    cancelarEdicaoTagRevisao();
    renderGerenciadorTagsRevisao();
    renderTagsRevisaoSelecionaveis(selecionadas.map(item => editada && item === tagAntiga ? tag : item));
    renderizarRevisoes();
    showToast(editada ? 'Tag alterada em todas as revisões.' : 'Tag criada e pronta para usar.');
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
    appData.revisoesItems.push(normalizarItemRevisao({
        id: Date.now() + 1,
        materia: piorArea,
        assunto: 'Rever a área com pior desempenho nos simulados',
        motivos: ['reforcar'],
        dataEstudo: '',
        dataAlvo: '',
        origem: 'simulado',
        status: 'pendente',
        tags: [],
        criadoEm: Date.now(),
        atualizadoEm: Date.now()
    }));
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

function revisaoEstaAtiva(item) {
    return item?.status !== 'revisado';
}

function revisoesParaHoje() {
    const hoje = dataLocalISO();
    return appData.revisoesItems.filter(item => revisaoEstaAtiva(item) && item.dataAlvo && item.dataAlvo <= hoje);
}

function formatarPrazoRevisao(item) {
    if (!item.dataAlvo) return 'Sem data definida';
    const hoje = dataLocalISO();
    if (item.dataAlvo < hoje) {
        const dias = Math.max(1, Math.round((dataISOParaLocal(hoje) - dataISOParaLocal(item.dataAlvo)) / 86400000));
        return `${dias} ${dias === 1 ? 'dia atrasada' : 'dias atrasada'}`;
    }
    if (item.dataAlvo === hoje) return 'Hoje';
    if (item.dataAlvo === dataRevisaoComDias(1)) return 'Amanhã';
    return new Date(`${item.dataAlvo}T12:00:00`).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' }).replace('.', '');
}

function atualizarResumoRevisoesCronograma() {
    const fila = revisoesParaHoje();
    const minutos = fila.reduce((total, item) => total + (Number(item.estimativaMin) || 5), 0);
    const painel = document.getElementById('scheduleReviewQueue');
    const titulo = document.getElementById('scheduleReviewQueueTitle');
    if (!painel || !titulo) return;
    painel.hidden = !fila.length;
    titulo.textContent = fila.length ? `${pluralizar(fila.length, 'revisão', 'revisões')} para hoje · aproximadamente ${minutos} min` : 'Nenhuma revisão para hoje';
}

function iniciarFilaRevisoesHoje() {
    const fila = revisoesParaHoje();
    showSection('revisoes');
    filtrarRevisoes(fila.length ? 'hoje' : 'pendentes');
    if (!fila.length) showToast('Sua fila de hoje está em dia.');
}

async function abrirImagemRevisao(imageId, nome = 'Foto da revisão') {
    try { nome = decodeURIComponent(nome); } catch (_) { /* nome já estava legível */ }
    const modal = document.getElementById('errorImageViewerModal');
    const conteudo = document.getElementById('errorImageViewerContent');
    const legenda = document.getElementById('errorImageViewerCaption');
    const carregando = document.getElementById('errorImageViewerLoading');
    if (!modal || !conteudo || !carregando) return;
    modal.classList.add('active');
    conteudo.hidden = true;
    carregando.hidden = false;
    carregando.textContent = 'Carregando foto…';
    legenda.textContent = nome;
    try {
        const imagem = await obterImagemRevisao(imageId);
        conteudo.src = imagem.dataUrl;
        conteudo.alt = imagem.name || nome;
        conteudo.hidden = false;
        carregando.hidden = true;
        legenda.textContent = imagem.name || nome;
    } catch (error) {
        carregando.textContent = error.message || 'Não foi possível abrir a foto.';
    }
}

function carregarMiniaturasRevisao() {
    document.querySelectorAll('img[data-review-image-id]').forEach(img => {
        const imageId = img.dataset.reviewImageId;
        obterImagemRevisao(imageId).then(imagem => {
            if (!img.isConnected) return;
            img.src = imagem.dataUrl;
            img.closest('.review-card-image')?.classList.add('loaded');
        }).catch(() => { if (img.isConnected) img.alt = 'Foto indisponível'; });
    });
}

function definirDataRevisaoFechamento(id, dias) {
    const item = appData.revisoesItems.find(revisao => revisao.id === Number(id));
    if (!item) return;
    item.dataAlvo = dataRevisaoComDias(Number(dias) || 0);
    item.status = 'pendente';
    item.atualizadoEm = Date.now();
    saveAppData();
    renderizarRevisoes();
    const dataDoFechamento = document.getElementById('scheduleDayCloseReviews')?.dataset.date || dataLocalISO();
    renderizarRevisoesFechamentoDia(dataDoFechamento);
    showToast(`Revisão organizada para ${formatarPrazoRevisao(item).toLocaleLowerCase('pt-BR')}.`);
}

function renderizarRevisoesFechamentoDia(dataISO = dataLocalISO()) {
    const lista = document.getElementById('scheduleDayCloseReviewsList');
    const contador = document.getElementById('scheduleDayCloseReviewsCount');
    const secao = document.getElementById('scheduleDayCloseReviews');
    if (!lista || !contador || !secao) return;
    secao.dataset.date = dataISO;
    const itens = appData.revisoesItems.filter(item => {
        const criadoEm = Number(item.criadoEm);
        const dataCriacao = criadoEm > 0 ? dataLocalISO(new Date(criadoEm)) : '';
        return item.dataEstudo === dataISO || dataCriacao === dataISO;
    });
    contador.textContent = pluralizar(itens.length, 'revisão registrada', 'revisões registradas');
    secao.classList.toggle('empty', !itens.length);
    if (!itens.length) {
        lista.innerHTML = '<p>Nenhuma revisão foi adicionada neste dia.</p>';
        return;
    }
    lista.innerHTML = itens.map(item => `<article><div><strong>${escaparRevisaoHtml(item.materia)} — ${escaparRevisaoHtml(item.assunto)}</strong><small>${formatarPrazoRevisao(item)}</small></div><span><button type="button" onclick="definirDataRevisaoFechamento(${item.id},1)">Amanhã</button><button type="button" onclick="definirDataRevisaoFechamento(${item.id},3)">+3 dias</button><button type="button" onclick="abrirReagendamentoRevisao(${item.id})">Outra data</button></span></article>`).join('');
}

function filtrarRevisoes(filtro = 'pendentes') {
    filtroRevisoesAtual = ['hoje', 'pendentes', 'proximas', 'concluidas'].includes(filtro) ? filtro : 'pendentes';
    document.querySelectorAll('[data-review-filter]').forEach(botao => botao.setAttribute('aria-pressed', String(botao.dataset.reviewFilter === filtroRevisoesAtual)));
    renderizarRevisoes();
}

function renderizarRevisoes() {
    const lista = document.getElementById('revisoesList');
    if (!lista) return;
    appData.revisoesItems = appData.revisoesItems.map(normalizarItemRevisao);
    const hoje = dataLocalISO();
    const pendentes = appData.revisoesItems.filter(revisaoEstaAtiva);
    const hojeItens = pendentes.filter(item => item.dataAlvo && item.dataAlvo <= hoje);
    const proximas = pendentes.filter(item => item.dataAlvo && item.dataAlvo > hoje);
    const concluidas = appData.revisoesItems.filter(item => item.status === 'revisado');
    const minutosHoje = hojeItens.reduce((total, item) => total + (Number(item.estimativaMin) || 5), 0);

    document.getElementById('rev-hoje').textContent = hojeItens.length;
    document.getElementById('rev-hoje-tempo').textContent = `aprox. ${minutosHoje} min`;
    document.getElementById('rev-pendentes').textContent = pendentes.length;
    document.getElementById('rev-proximas').textContent = proximas.length;
    document.getElementById('rev-concluidas').textContent = concluidas.length;
    const chamadaHoje = document.getElementById('reviewTodayCallout');
    chamadaHoje.hidden = !hojeItens.length;
    document.getElementById('reviewTodayCalloutTitle').textContent = hojeItens.length ? `${pluralizar(hojeItens.length, 'revisão', 'revisões')} para hoje · aproximadamente ${minutosHoje} min` : 'Nenhuma revisão para hoje';
    atualizarResumoRevisoesCronograma();

    if (!appData.revisoesItems.length) {
        const resultado = document.getElementById('revisoesResultado');
        if (resultado) resultado.textContent = '0 revisões';
        lista.innerHTML = '<div class="workspace-empty"><b aria-hidden="true">↻</b><strong>Sua caixa está vazia</strong><p>Quando algo travar seu estudo, use “+ Revisar depois” e continue de onde parou.</p><button type="button" class="cycle-btn primary" onclick="abrirModalRevisao()">+ Revisar depois</button></div>';
        renderDashboardRevisoes();
        return;
    }

    const ordenados = [...appData.revisoesItems].sort((a, b) => {
        const prioridade = item => item.status === 'fraco' ? 0 : (revisaoEstaAtiva(item) && item.dataAlvo && item.dataAlvo < hoje ? 1 : (revisaoEstaAtiva(item) ? 2 : 3));
        const diferenca = prioridade(a) - prioridade(b);
        if (diferenca) return diferenca;
        if (a.status === 'fraco' && b.status === 'fraco') return (b.atualizadoEm || 0) - (a.atualizadoEm || 0);
        const dataA = a.dataAlvo || '9999-12-31';
        const dataB = b.dataAlvo || '9999-12-31';
        return dataA.localeCompare(dataB) || (b.criadoEm || b.id) - (a.criadoEm || a.id);
    });

    const visiveis = ordenados.filter(item => {
        if (filtroRevisoesAtual === 'hoje') return revisaoEstaAtiva(item) && item.dataAlvo && item.dataAlvo <= hoje;
        if (filtroRevisoesAtual === 'pendentes') return revisaoEstaAtiva(item);
        if (filtroRevisoesAtual === 'proximas') return revisaoEstaAtiva(item) && item.dataAlvo && item.dataAlvo > hoje;
        if (filtroRevisoesAtual === 'concluidas') return item.status === 'revisado';
        return revisaoEstaAtiva(item);
    });
    const resultado = document.getElementById('revisoesResultado');
    if (resultado) resultado.textContent = pluralizar(visiveis.length, 'revisão', 'revisões');
    if (!visiveis.length) {
        const mensagens = {
            hoje: ['Nada para revisar hoje', 'Sua fila de hoje está em dia. As próximas revisões continuam guardadas.'],
            proximas: ['Nenhuma revisão futura', 'As revisões com datas futuras aparecerão aqui.'],
            concluidas: ['Nenhuma revisão concluída', 'As revisões finalizadas aparecerão aqui.'],
            pendentes: ['Sua fila ativa está vazia', 'Use “+ Revisar depois” quando um conteúdo precisar voltar ao foco.']
        };
        const mensagem = mensagens[filtroRevisoesAtual] || ['Nenhuma revisão neste filtro', 'Escolha outra visualização.'];
        lista.innerHTML = `<div class="workspace-empty"><b aria-hidden="true">✓</b><strong>${mensagem[0]}</strong><p>${mensagem[1]}</p><button type="button" class="cycle-btn" onclick="filtrarRevisoes('pendentes')">Ver pendentes</button></div>`;
        renderDashboardRevisoes();
        return;
    }

    lista.innerHTML = visiveis.map(item => {
        const estaAtrasada = revisaoEstaAtiva(item) && item.dataAlvo && item.dataAlvo < hoje;
        const paraHoje = revisaoEstaAtiva(item) && item.dataAlvo === hoje;
        const revisado = item.status === 'revisado';
        const aindaFraco = item.status === 'fraco';
        const statusTexto = revisado ? 'Concluída' : (aindaFraco ? 'Ainda fraca' : (estaAtrasada ? 'Atrasada' : (paraHoje ? 'Para hoje' : (item.dataAlvo ? 'Próxima' : 'Pendente'))));
        const statusClasse = revisado ? 'done' : (aindaFraco ? 'weak' : (estaAtrasada ? 'overdue' : (paraHoje ? 'today' : '')));
        const origemTexto = item.scheduleBlockId ? 'Bloco do cronograma' : (item.origem?.includes('simulado') ? 'Simulado' : (item.origem?.includes('sessao') ? 'Sessão de estudo' : 'Captura rápida'));
        const materia = appData.cycleItems.find(registro => normalizarRevisaoTexto(registro.subject) === normalizarRevisaoTexto(item.materia));
        const cor = revisado ? '#34c759' : (aindaFraco || paraHoje ? '#ff9500' : (estaAtrasada ? '#ff3b30' : corSegura(materia?.color)));
        const tagsHtml = (item.tags || []).map(tag => `<span class="revision-tag-chip small">${escaparRevisaoHtml(tag)}</span>`).join('');
        const motivos = item.motivos.length ? item.motivos.map(motivo => `<span>${escaparRevisaoHtml(REVISAO_MOTIVOS[motivo])}</span>`).join('') : '<span>Revisão programada</span>';
        const criado = new Date(item.criadoEm).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }).replace('.', '');
        const detalhes = [item.fonte, item.numeroQuestao ? `Questão ${item.numeroQuestao}` : '', item.blocoTitulo].filter(Boolean).map(valor => `<span>${escaparRevisaoHtml(valor)}</span>`).join('');
        const imagem = item.imagem ? `<button type="button" class="review-card-image" onclick="abrirImagemRevisao('${item.imagem.id}','${encodeURIComponent(item.imagem.name)}')" aria-label="Abrir foto de ${escaparRevisaoHtml(item.assunto)}"><img data-review-image-id="${item.imagem.id}" alt="${escaparRevisaoHtml(item.imagem.name)}" loading="lazy"><span aria-hidden="true">▧</span></button>` : '';
        const link = item.link ? `<a class="review-source-link" href="${escaparRevisaoHtml(item.link)}" target="_blank" rel="noopener noreferrer">Abrir link ↗</a>` : '';
        const acaoPrincipal = revisado
            ? `<button class="cycle-btn primary" onclick="revisarNovamenteRevisao(${item.id})">Revisar novamente</button>`
            : `<button class="cycle-btn primary" onclick="marcarRevisao(${item.id},'revisado')">Concluir</button>`;
        return `<article class="revision-card review-inbox-card ${revisado ? 'reviewed' : ''}" style="--revision-color:${cor};"><div class="review-card-content">${imagem}<div class="revision-card-main"><header><div><span class="review-subject-dot" style="--subject-color:${cor}"></span><strong class="revision-card-title">${escaparRevisaoHtml(item.materia)}</strong><span class="revision-badge ${statusClasse}">${statusTexto}</span></div><small>${criado}</small></header><div class="revision-card-subject">${escaparRevisaoHtml(item.assunto)}</div><div class="review-reasons">${motivos}</div><div class="revision-meta"><span class="revision-badge review-due-badge">${formatarPrazoRevisao(item)}</span></div></div></div><div class="review-card-footer">${acaoPrincipal}<details class="review-card-more"><summary>Mais opções</summary><div>${item.observacao ? `<p class="review-note">“${escaparRevisaoHtml(item.observacao)}”</p>` : ''}${detalhes || link ? `<div class="review-card-details">${detalhes}${link}</div>` : ''}${tagsHtml ? `<div class="revision-tags-inline">${tagsHtml}</div>` : ''}<small>${origemTexto} · adicionada ${criado} às ${escaparRevisaoHtml(item.horaEstudo)}</small><div class="revision-actions">${revisado ? '' : `<button class="cycle-btn" onclick="adiarRevisao(${item.id},1)">Adiar 1 dia</button><button class="cycle-btn" onclick="abrirReagendamentoRevisao(${item.id})">Alterar data</button>`}<button class="cycle-btn" onclick="abrirModalRevisao(${item.id})">Abrir / editar</button><button class="cycle-btn revision-delete-btn" onclick="abrirModalDeletar('revisao', ${item.id}, 'Excluir revisão?', 'Esta revisão e sua foto serão removidas da caixa.')">Excluir</button></div></div></details></div></article>`;
    }).join('');
    carregarMiniaturasRevisao();
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
let cadernoErrosFiltros = { busca: '', materia: 'todas', tipo: 'todos', status: 'ativos' };
let cadernoErroEmRevisaoId = null;
let cadernoErroImagensRascunho = [];
let cadernoErroProcessandoImagens = false;
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
        imagens: (Array.isArray(item?.imagens) ? item.imagens : []).filter(imagem => imagem?.id).slice(0, 8).map(imagem => ({
            id: String(imagem.id).replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 90),
            name: String(imagem.name || 'Imagem da questão').slice(0, 100),
            context: imagem.context === 'rule' ? 'rule' : 'question',
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

function definirStatusImagemCadernoErro(mensagem = '', erro = false, contexto = 'question') {
    const status = document.getElementById(contexto === 'rule' ? 'errorRuleImageStatus' : 'errorImageStatus');
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

async function otimizarImagemCadernoErro(file, contexto = 'question') {
    if (!file?.type?.startsWith('image/')) throw new Error('Selecione apenas imagens.');
    if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) throw new Error('Use imagens PNG, JPG ou WebP.');
    if (file.size > 12 * 1024 * 1024) throw new Error('Cada imagem pode ter no máximo 12 MB antes da otimização.');
    const imagem = await carregarArquivoImagem(file);
    const limite = 1800;
    let escala = Math.min(1, limite / Math.max(imagem.naturalWidth, imagem.naturalHeight));
    let largura = Math.max(1, Math.round(imagem.naturalWidth * escala));
    let altura = Math.max(1, Math.round(imagem.naturalHeight * escala));
    const canvas = document.createElement('canvas');
    const contextoCanvas = canvas.getContext('2d', { alpha: false });
    if (!contextoCanvas) throw new Error('Seu navegador não conseguiu preparar a imagem.');
    let qualidade = .88;
    let dataUrl = '';
    for (let tentativa = 0; tentativa < 8; tentativa += 1) {
        canvas.width = largura;
        canvas.height = altura;
        contextoCanvas.fillStyle = '#ffffff';
        contextoCanvas.fillRect(0, 0, largura, altura);
        contextoCanvas.drawImage(imagem, 0, 0, largura, altura);
        dataUrl = canvas.toDataURL('image/webp', qualidade);
        if (dataUrl.length <= 680000) break;
        largura = Math.max(480, Math.round(largura * .82));
        altura = Math.max(320, Math.round(altura * .82));
        qualidade = Math.max(.58, qualidade - .06);
    }
    if (!dataUrl || dataUrl.length > 680000) throw new Error('A imagem ficou grande demais. Recorte-a e tente novamente.');
    return { id: identificadorImagemCadernoErro(), name: file.name || (contexto === 'rule' ? 'Imagem da regra anti-erro' : 'Imagem da questão'), context: contexto === 'rule' ? 'rule' : 'question', type: 'image/webp', width: largura, height: altura, dataUrl, nova: true };
}

async function processarImagensCadernoErro(files, contexto = 'question') {
    contexto = contexto === 'rule' ? 'rule' : 'question';
    if (cadernoErroProcessandoImagens) return definirStatusImagemCadernoErro('Aguarde o preparo das imagens selecionadas.', false, contexto);
    const imagens = [...(files || [])].filter(file => file?.type?.startsWith('image/'));
    if (!imagens.length) return definirStatusImagemCadernoErro('Nenhuma imagem compatível foi encontrada.', true, contexto);
    const novas = imagens.filter(file => !cadernoErroImagensRascunho.some(imagem => imagem.context === contexto && imagem.fingerprint === `${file.name}:${file.size}:${file.lastModified}`));
    if (!novas.length) return definirStatusImagemCadernoErro('Essa imagem já foi anexada.', false, contexto);
    const vagas = 4 - cadernoErroImagensRascunho.filter(imagem => imagem.context === contexto).length;
    if (vagas <= 0) return definirStatusImagemCadernoErro('Você já anexou o limite de 4 imagens nesta parte.', true, contexto);
    cadernoErroProcessandoImagens = true;
    definirStatusImagemCadernoErro('Otimizando as imagens para a nuvem…', false, contexto);
    try {
        for (const file of novas.slice(0, vagas)) cadernoErroImagensRascunho.push({ ...await otimizarImagemCadernoErro(file, contexto), fingerprint: `${file.name}:${file.size}:${file.lastModified}` });
        renderizarPreviaImagensCadernoErro();
        definirStatusImagemCadernoErro(`${Math.min(imagens.length, vagas)} ${Math.min(imagens.length, vagas) === 1 ? 'imagem pronta' : 'imagens prontas'} para salvar.`, false, contexto);
        if (imagens.length > vagas) showToast(`O limite é de 4 imagens por registro. ${imagens.length - vagas} não ${imagens.length - vagas === 1 ? 'foi adicionada' : 'foram adicionadas'}.`, true);
    } catch (error) {
        definirStatusImagemCadernoErro(error.message || 'Não foi possível preparar a imagem.', true, contexto);
    } finally { cadernoErroProcessandoImagens = false; }
}

function selecionarImagensCadernoErro(event, contexto = 'question') {
    processarImagensCadernoErro(event.target.files, contexto);
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

function receberDropImagensCadernoErro(event, contexto = 'question') {
    event.preventDefault();
    event.currentTarget.classList.remove('dragging');
    processarImagensCadernoErro(event.dataTransfer?.files, contexto);
}

function removerImagemCadernoErro(indice) {
    const contexto = cadernoErroImagensRascunho[Number(indice)]?.context || 'question';
    cadernoErroImagensRascunho.splice(Number(indice), 1);
    renderizarPreviaImagensCadernoErro();
    definirStatusImagemCadernoErro('Imagem retirada. A alteração será confirmada ao salvar.', false, contexto);
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
    ['question', 'rule'].forEach(contexto => {
        const container = document.getElementById(contexto === 'rule' ? 'errorRuleImagePreview' : 'errorImagePreview');
        const contador = document.getElementById(contexto === 'rule' ? 'errorRuleImageCounter' : 'errorImageCounter');
        const imagens = cadernoErroImagensRascunho.map((imagem, indice) => ({ imagem, indice })).filter(item => item.imagem.context === contexto);
        if (contador) contador.textContent = `${imagens.length}/4`;
        if (!container) return;
        container.replaceChildren(...imagens.map(item => criarBotaoImagemCadernoErro(item.imagem, item.indice, true)));
        carregarImagensCadernoErro(container);
    });
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
    definirStatusImagemCadernoErro('', false, 'rule');
    renderizarPreviaImagensCadernoErro();
    document.getElementById('errorNotebookEditId').value = item?.id || '';
    document.getElementById('errorNotebookModalTitle').textContent = item ? 'Editar registro' : 'Registrar um erro';
    const materias = [...new Set([...appData.cycleItems.map(materia => materia.subject), ...(item?.materia ? [item.materia] : [])].filter(Boolean))].sort((a, b) => a.localeCompare(b, 'pt-BR'));
    document.getElementById('errorSubjectInput').innerHTML = '<option value="">Selecione uma matéria cadastrada</option>' + materias.map(materia => `<option value="${escaparRevisaoHtml(materia)}">${escaparRevisaoHtml(materia)}</option>`).join('');
    if (item) {
        document.getElementById('errorSubjectInput').value = item.materia;
        document.getElementById('errorTopicInput').value = item.assunto;
        document.getElementById('errorSourceInput').value = item.origem;
        document.getElementById('errorTypeInput').value = item.tipo;
        document.getElementById('errorQuestionInput').value = item.questao;
        document.getElementById('errorAttemptInput').value = item.minhaResposta;
        document.getElementById('errorCorrectInput').value = item.respostaCorreta;
        document.getElementById('errorRuleInput').value = item.regra;
    }
    document.getElementById('errorNotebookModal').classList.add('active');
    setTimeout(() => document.getElementById('errorSubjectInput')?.focus(), 80);
}

async function salvarCadernoErro(event) {
    event.preventDefault();
    if (document.querySelector('#errorNotebookForm button[type="submit"]')?.disabled) return;
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
        regra: document.getElementById('errorRuleInput').value.trim(),
        atualizadoEm: Date.now()
    };
    if (!dados.materia || !dados.assunto || !dados.questao || !dados.regra) return showToast('Preencha matéria, assunto, questão e regra anti-erro.', true);
    if (submit) { submit.disabled = true; submit.textContent = cadernoErroImagensRascunho.some(imagem => imagem.nova) ? 'Enviando imagens…' : 'Salvando…'; }
    try {
        const imagensSalvas = [];
        for (const imagem of cadernoErroImagensRascunho) {
            if (!imagem.nova) {
                imagensSalvas.push({ id: imagem.id, name: imagem.name, context: imagem.context || 'question', type: imagem.type, width: imagem.width, height: imagem.height });
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
        const correspondeBusca = !busca || normalizarRevisaoTexto([item.materia, item.assunto, item.questao, item.regra, item.origem].join(' ')).includes(busca);
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
        const imagensQuestao = htmlMiniaturasCadernoErro(item.imagens.filter(imagem => imagem.context !== 'rule'), 'card');
        const imagensRegra = htmlMiniaturasCadernoErro(item.imagens.filter(imagem => imagem.context === 'rule'), 'card rule');
        return `<article class="error-card ${dominado ? 'mastered' : ''}">
            <div class="error-card-rail"><span>${tipo.icone}</span></div>
            <div class="error-card-body">
                <div class="error-card-top"><div><span class="error-card-subject">${escaparRevisaoHtml(item.materia)}</span><i>•</i><span>${escaparRevisaoHtml(item.assunto)}</span></div><span class="error-card-date ${dataClasse}">${dataTexto}</span></div>
                <h3>${escaparRevisaoHtml(item.questao)}</h3>${imagensQuestao}
                <div class="error-card-diagnosis"><span><small>PADRÃO DO ERRO</small>${escaparRevisaoHtml(tipo.nome)}</span><span><small>REGRA ANTI-ERRO</small>${escaparRevisaoHtml(item.regra)}${imagensRegra}</span></div>
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
    const imagensQuestao = item.imagens.filter(imagem => imagem.context !== 'rule');
    imagensRevisao.innerHTML = htmlMiniaturasCadernoErro(imagensQuestao, 'review');
    imagensRevisao.hidden = !imagensQuestao.length;
    carregarImagensCadernoErro(imagensRevisao);
    const tentativa = document.querySelector('#errorReviewPreviousAttempt p');
    tentativa.textContent = item.minhaResposta || 'Você não registrou uma resposta anterior.';
    document.getElementById('errorReviewCorrect').textContent = item.respostaCorreta || 'Nenhuma resposta correta foi registrada.';
    document.getElementById('errorReviewCause').textContent = tipo.nome;
    document.getElementById('errorReviewRule').textContent = item.regra;
    const imagensRegra = document.getElementById('errorReviewRuleImages');
    if (imagensRegra) {
        const regra = item.imagens.filter(imagem => imagem.context === 'rule');
        imagensRegra.innerHTML = htmlMiniaturasCadernoErro(regra, 'review rule');
        imagensRegra.hidden = !regra.length;
        carregarImagensCadernoErro(imagensRegra);
    }
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

const SIMULADO_FORMATOS = {
    area: { total: 45, area: '' },
    dia1: { total: 90, area: '1º dia ENEM' },
    dia2: { total: 90, area: '2º dia ENEM' },
    completo: { total: 180, area: 'ENEM completo' },
    personalizado: { total: 45, area: 'Geral' }
};

function selecionarAreaSimulado(valor) {
    const select = document.getElementById('simArea');
    const area = String(valor || 'Geral');
    if (![...select.options].some(option => option.value === area)) select.add(new Option(area, area));
    select.value = area;
}

function atualizarFormatoSimulado(aplicarPadrao = true) {
    const formato = document.getElementById('simFormat').value || 'area';
    const configuracao = SIMULADO_FORMATOS[formato] || SIMULADO_FORMATOS.personalizado;
    document.getElementById('simAreaGroup').hidden = formato !== 'area' && formato !== 'personalizado';
    if (aplicarPadrao) {
        document.getElementById('simTotal').value = configuracao.total;
        if (configuracao.area) selecionarAreaSimulado(configuracao.area);
    }
    atualizarResumoSimulado();
}

function atualizarResumoSimulado() {
    const total = Math.max(1, Number(document.getElementById('simTotal')?.value) || 1);
    const acertos = Math.max(0, Number(document.getElementById('simAcertos')?.value) || 0);
    const brancos = Math.max(0, Number(document.getElementById('simBrancos')?.value) || 0);
    const valido = acertos + brancos <= total;
    document.getElementById('simCalculatedErrors').textContent = valido ? String(total - acertos - brancos) : '—';
    document.getElementById('simLiveScore').textContent = valido ? `${Math.round(acertos / total * 100)}%` : 'Confira';
}

function abrirModalSimulado() {
    document.getElementById('formAddSimulado').reset();
    document.getElementById('simEditId').value = '';
    document.getElementById('simFormat').value = 'area';
    selecionarAreaSimulado('Linguagens, Códigos e suas Tecnologias');
    document.getElementById('simTotal').value = 45;
    document.getElementById('simAcertos').value = 0;
    document.getElementById('simBrancos').value = 0;
    document.getElementById('simCreateReview').checked = true;
    document.getElementById('simFileName').textContent = 'Anexar prova, gabarito ou relatório';
    document.getElementById('simAttachmentData').value = '';
    document.getElementById('simuladoModalTitle').textContent = 'Registrar simulado';
    document.getElementById('simDate').value = dataLocalISO(new Date());
    atualizarFormatoSimulado(false);
    document.getElementById('simuladoModal').classList.add('active');
}

function editarSimulado(id) {
    const sim = appData.simuladosItems.find(i => i.id === id);
    if (!sim) return;
    document.getElementById('formAddSimulado').reset();
    document.getElementById('simEditId').value = sim.id;
    document.getElementById('simTitle').value = sim.title || '';
    document.getElementById('simDate').value = sim.date || dataLocalISO(new Date());
    document.getElementById('simTempo').value = sim.tempoMin || '';
    document.getElementById('simFormat').value = SIMULADO_FORMATOS[sim.format] ? sim.format : 'area';
    selecionarAreaSimulado(sim.area || 'Geral');
    document.getElementById('simTotal').value = sim.total || 45;
    document.getElementById('simAcertos').value = sim.acertos || 0;
    document.getElementById('simBrancos').value = sim.brancos || 0;
    document.getElementById('simPreparation').value = sim.preparation || '';
    document.getElementById('simMainError').value = sim.mainError || '';
    document.getElementById('simWeakTopics').value = sim.weakTopics || '';
    document.getElementById('simNextStep').value = sim.nextStep || '';
    document.getElementById('simCreateReview').checked = false;
    document.getElementById('simAttachmentData').value = sim.attachment || '';
    document.getElementById('simFileName').textContent = sim.attachment ? 'Arquivo anexado — clique para trocar' : 'Anexar prova, gabarito ou relatório';
    document.getElementById('simuladoModalTitle').textContent = 'Editar simulado';
    atualizarFormatoSimulado(false);
    document.getElementById('simuladoModal').classList.add('active');
}

function salvarSimulado(e) {
    e.preventDefault();
    const idEdit = document.getElementById('simEditId').value;
    const title = document.getElementById('simTitle').value.trim();
    const date = document.getElementById('simDate').value;
    const tempoMin = Math.max(1, Number(document.getElementById('simTempo').value) || 1);
    const format = document.getElementById('simFormat').value || 'area';
    const area = format === 'area' || format === 'personalizado' ? document.getElementById('simArea').value : SIMULADO_FORMATOS[format].area;
    const total = Math.max(1, Number(document.getElementById('simTotal').value) || 1);
    const acertos = Math.max(0, Number(document.getElementById('simAcertos').value) || 0);
    const brancos = Math.max(0, Number(document.getElementById('simBrancos').value) || 0);
    if (acertos + brancos > total) return showToast('Acertos e questões em branco não podem ultrapassar o total.', true);
    const registro = {
        title, date, tempoMin, format, area, total, acertos, brancos, erros: total - acertos - brancos,
        preparation: document.getElementById('simPreparation').value,
        mainError: document.getElementById('simMainError').value,
        weakTopics: document.getElementById('simWeakTopics').value.trim(),
        nextStep: document.getElementById('simNextStep').value.trim(),
        attachment: document.getElementById('simAttachmentData').value
    };
    if (idEdit) {
        const index = appData.simuladosItems.findIndex(item => item.id == idEdit);
        if (index > -1) appData.simuladosItems[index] = { ...appData.simuladosItems[index], ...registro };
    } else appData.simuladosItems.push({ id: Date.now(), ...registro });
    const revisaoCriada = document.getElementById('simCreateReview').checked
        ? criarRevisaoAutomaticaRegistro(area, registro.nextStep || registro.weakTopics, 1, 'simulado-reflexao')
        : false;
    saveAppData();
    renderizarSimulados();
    renderizarRevisoes();
    fecharModal('simuladoModal');
    showToast(revisaoCriada ? '🎯 Simulado salvo e próximo foco agendado.' : '🎯 Simulado salvo com seu diagnóstico.');
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
        const brancos = Number(sim.brancos) || 0;
        const total = Number(sim.total) || acertos + erros || 1;
        const percentual = Math.round(acertos / total * 100);
        const cor = percentual >= 70 ? '#34c759' : (percentual >= 50 ? '#ff9500' : '#ff3b30');
        const segundosQuestao = Math.floor((Number(sim.tempoMin) || 0) * 60 / total);
        const titulo = escaparRevisaoHtml(sim.title || 'Simulado');
        const area = escaparRevisaoHtml(sim.area || 'Geral');
        const data = dataISOParaLocal(sim.date);
        const anexo = anexoSeguro(sim.attachment);
        const formato = { area: 'Uma área', dia1: '1º dia', dia2: '2º dia', completo: 'ENEM completo', personalizado: 'Personalizado', sessao: 'Sessão de estudo' }[sim.format] || 'Simulado';
        const causas = { conteudo: 'Lacuna de conteúdo', interpretacao: 'Interpretação', calculo: 'Cálculo ou execução', atencao: 'Atenção', tempo: 'Tempo e estratégia' };
        const diagnostico = [sim.mainError ? causas[sim.mainError] || sim.mainError : '', sim.nextStep ? `Próximo: ${sim.nextStep}` : ''].filter(Boolean);
        return `<article class="agenda-card result-card" style="--urgency-color:${cor};"><div class="result-card-header"><div class="result-card-title"><span class="result-format-chip">${escaparRevisaoHtml(formato)}</span><h3>${titulo}</h3><p>${area} • ${data ? data.toLocaleDateString('pt-BR') : 'Sem data'} • ${formatShortTime((Number(sim.tempoMin) || 0) * 60)}</p></div><div class="result-score">${percentual}%</div></div><div class="result-card-metrics ${brancos ? 'five' : ''}"><div><small>Questões</small><strong>${total}</strong></div><div><small>Acertos</small><strong style="color:#34c759">${acertos}</strong></div><div><small>Erros</small><strong style="color:#ff3b30">${erros}</strong></div>${brancos ? `<div><small>Em branco</small><strong>${brancos}</strong></div>` : ''}<div><small>Por questão</small><strong>${Math.floor(segundosQuestao / 60)}m${String(segundosQuestao % 60).padStart(2,'0')}s</strong></div></div>${diagnostico.length ? `<div class="result-action-note"><span>↗</span><p>${diagnostico.map(texto => escaparRevisaoHtml(texto)).join(' · ')}</p></div>` : ''}<div class="result-card-actions">${anexo ? `<a class="attachment-link" href="${anexo}" download="${titulo}_anexo">↗ Ver anexo</a>` : '<span></span>'}<div><button type="button" class="workspace-icon-button" onclick="editarSimulado(${sim.id})" aria-label="Editar ${titulo}" title="Editar">✎</button><button type="button" class="workspace-icon-button danger" onclick="abrirModalDeletar('simulado', ${sim.id}, 'Apagar simulado?', 'O desempenho será eliminado.')" aria-label="Apagar ${titulo}" title="Apagar">×</button></div></div></article>`;
    }).join('');
}

function prepararNotasRedacao() {
    const opcoes = [0, 40, 80, 120, 160, 200].map(valor => `<option value="${valor}">${valor} pontos</option>`).join('');
    document.querySelectorAll('.red-score-input').forEach(select => {
        if (!select.options.length) select.innerHTML = opcoes;
    });
}

function atualizarTotalRedacao() {
    const total = [...document.querySelectorAll('.red-score-input')].reduce((soma, select) => soma + (Number(select.value) || 0), 0);
    const visor = document.getElementById('redLiveTotal');
    if (visor) visor.textContent = String(total);
}

function atualizarEstadoRedacao() {
    const status = document.querySelector('input[name="redStatus"]:checked')?.value || 'awaiting';
    document.getElementById('redScoresSection').hidden = status !== 'corrected';
    document.getElementById('redReflectionStep').textContent = status === 'corrected' ? '03' : '02';
    atualizarTotalRedacao();
}

function abrirModalRedacao() {
    document.getElementById('formAddRedacao').reset();
    prepararNotasRedacao();
    document.getElementById('redEditId').value = '';
    document.querySelector('input[name="redStatus"][value="awaiting"]').checked = true;
    document.getElementById('redFileName').textContent = 'Anexar redação ou folha de correção';
    document.getElementById('redAttachmentData').value = '';
    document.getElementById('redacaoModalTitle').textContent = 'Registrar redação';
    document.getElementById('redDate').value = dataLocalISO(new Date());
    atualizarEstadoRedacao();
    document.getElementById('redacaoModal').classList.add('active');
}

function editarRedacao(id) {
    const item = appData.redacaoItems.find(i => i.id === id);
    if (!item) return;
    document.getElementById('formAddRedacao').reset();
    prepararNotasRedacao();
    const status = item.status || (item.aguardandoCorrecao ? 'awaiting' : 'corrected');
    document.getElementById('redEditId').value = item.id;
    document.getElementById('redTheme').value = item.theme || '';
    document.getElementById('redDate').value = item.date || dataLocalISO(new Date());
    document.getElementById('redTempo').value = item.tempoMin || '';
    document.querySelector(`input[name="redStatus"][value="${status}"]`).checked = true;
    ['c1', 'c2', 'c3', 'c4', 'c5'].forEach(chave => document.getElementById(`red${chave.toUpperCase()}`).value = String(Number(item[chave]) || 0));
    document.getElementById('redEvaluator').value = item.evaluator || '';
    document.getElementById('redStrengths').value = item.strengths || '';
    document.getElementById('redNextFocus').value = item.nextFocus || '';
    document.getElementById('redAttachmentData').value = item.attachment || '';
    document.getElementById('redFileName').textContent = item.attachment ? 'Arquivo anexado — clique para trocar' : 'Anexar redação ou folha de correção';
    document.getElementById('redacaoModalTitle').textContent = 'Editar redação';
    atualizarEstadoRedacao();
    document.getElementById('redacaoModal').classList.add('active');
}

function salvarRedacao(e) {
    e.preventDefault();
    const idEdit = document.getElementById('redEditId').value;
    const status = document.querySelector('input[name="redStatus"]:checked')?.value || 'awaiting';
    const notas = status === 'corrected'
        ? ['redC1', 'redC2', 'redC3', 'redC4', 'redC5'].map(id => Math.max(0, Math.min(200, Number(document.getElementById(id).value) || 0)))
        : [0, 0, 0, 0, 0];
    const registro = {
        theme: document.getElementById('redTheme').value.trim(), date: document.getElementById('redDate').value,
        tempoMin: Math.max(0, Number(document.getElementById('redTempo').value) || 0), status,
        c1: notas[0], c2: notas[1], c3: notas[2], c4: notas[3], c5: notas[4],
        evaluator: document.getElementById('redEvaluator').value.trim(), strengths: document.getElementById('redStrengths').value.trim(),
        nextFocus: document.getElementById('redNextFocus').value.trim(), attachment: document.getElementById('redAttachmentData').value,
        aguardandoCorrecao: status !== 'corrected'
    };
    if (idEdit) {
        const index = appData.redacaoItems.findIndex(item => item.id == idEdit);
        if (index > -1) appData.redacaoItems[index] = { ...appData.redacaoItems[index], ...registro };
    } else appData.redacaoItems.push({ id: Date.now(), ...registro });
    saveAppData();
    renderizarRedacoes();
    fecharModal('redacaoModal');
    showToast(status === 'corrected' ? '✍️ Redação e devolutiva salvas.' : '✍️ Redação guardada para continuar depois.');
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
    const statusDaRedacao = item => item.status || (item.aguardandoCorrecao ? 'awaiting' : 'corrected');
    const corrigidas = itens.filter(item => statusDaRedacao(item) === 'corrected');
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
        list.innerHTML = '<div class="workspace-empty"><b aria-hidden="true">✎</b><strong>Registre sua primeira redação</strong><p>Você pode guardar um rascunho, aguardar a correção ou analisar as cinco competências.</p><button type="button" class="cycle-btn primary" onclick="abrirModalRedacao()">Registrar redação</button></div>';
        return;
    }

    list.innerHTML = itens.map(redacao => {
        const total = totalDaRedacao(redacao);
        const status = statusDaRedacao(redacao);
        const pendente = status !== 'corrected';
        const rotuloStatus = status === 'draft' ? 'Em produção' : 'Aguardando correção';
        const cor = total >= 900 ? '#34c759' : (total >= 700 ? '#ff9500' : '#ff3b30');
        const tema = escaparRevisaoHtml(redacao.theme || 'Redação sem tema');
        const data = dataISOParaLocal(redacao.date);
        const anexo = anexoSeguro(redacao.attachment);
        const contexto = [redacao.tempoMin ? `${redacao.tempoMin} min` : '', redacao.evaluator ? `Correção: ${redacao.evaluator}` : ''].filter(Boolean).join(' • ');
        const devolutiva = [redacao.strengths ? `Manter: ${redacao.strengths}` : '', redacao.nextFocus ? `Próximo foco: ${redacao.nextFocus}` : ''].filter(Boolean);
        return `<article class="agenda-card result-card" style="--urgency-color:${pendente ? 'var(--accent-color)' : cor};"><div class="result-card-header"><div class="result-card-title"><span class="result-format-chip">${status === 'draft' ? 'Rascunho' : status === 'awaiting' ? 'Na fila de correção' : 'Corrigida'}</span><h3>${tema}</h3><p>${data ? data.toLocaleDateString('pt-BR') : 'Sem data'}${contexto ? ` • ${escaparRevisaoHtml(contexto)}` : ''}</p></div><div class="result-score${pendente ? ' pending' : ''}">${pendente ? rotuloStatus : total}</div></div>${pendente ? `<p class="result-pending-note">${status === 'draft' ? 'Continue a produção quando quiser; o registro já está salvo.' : 'Quando receber as notas, edite para preencher C1 a C5 e a devolutiva.'}</p>` : `<div class="result-card-metrics five">${competencias.map(competencia => `<div><small>${competencia.sigla}</small><strong>${Number(redacao[competencia.chave]) || 0}</strong></div>`).join('')}</div>`}${devolutiva.length ? `<div class="result-action-note"><span>✦</span><p>${devolutiva.map(texto => escaparRevisaoHtml(texto)).join(' · ')}</p></div>` : ''}<div class="result-card-actions">${anexo ? `<a class="attachment-link" href="${anexo}" download="${tema}_redacao">↗ Ver arquivo</a>` : '<span></span>'}<div><button type="button" class="workspace-icon-button" onclick="editarRedacao(${redacao.id})" aria-label="Editar ${tema}" title="Editar">✎</button><button type="button" class="workspace-icon-button danger" onclick="abrirModalDeletar('redacao', ${redacao.id}, 'Apagar redação?', 'O registro será eliminado.')" aria-label="Apagar ${tema}" title="Apagar">×</button></div></div></article>`;
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
    if (ciclo) salvarCadernoPendente();
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

const cadernoCapituloAtual = { materiaId: null, topicoIndice: null, paginaId: null, busca: '', filtro: 'todos', limite: 12 };
let temporizadorCadernoCapitulo = null;
const espacoTopicoAtual = { materiaId: null, topicoIndice: null, nome: '', aba: 'visao' };
let temporizadorContextoTopico = null;

function localizarEspacoTopico() {
    const materia = appData.cycleItems.find(item => String(item.id) === String(espacoTopicoAtual.materiaId));
    const topico = materia?.topicos?.[espacoTopicoAtual.topicoIndice];
    if (!topico || topico.nome !== espacoTopicoAtual.nome) return { materia, topico: null };
    return { materia, topico };
}

function abrirEspacoTopico(materiaId, topicoIndice, aba = 'visao') {
    const materia = appData.cycleItems.find(item => String(item.id) === String(materiaId));
    const topico = materia?.topicos?.[topicoIndice];
    if (!topico) return;
    salvarCadernoPendente();
    salvarContextoEspacoTopico();
    espacoTopicoAtual.materiaId = materia.id;
    espacoTopicoAtual.topicoIndice = topicoIndice;
    espacoTopicoAtual.nome = topico.nome;
    espacoTopicoAtual.aba = ['visao', 'caderno', 'historico'].includes(aba) ? aba : 'visao';
    const slot = document.getElementById('topicNavSlot');
    slot.hidden = false;
    document.getElementById('topicNavTitle').textContent = topico.nome;
    document.getElementById('topicNavSubject').textContent = materia.subject;
    sessionStorage.setItem('kingMasterOpenTopic', JSON.stringify({ materiaId: materia.id, nome: topico.nome, aba: espacoTopicoAtual.aba }));
    showSection('topic-workspace');
}

function renderizarEspacoTopico() {
    const { materia, topico } = localizarEspacoTopico();
    if (!topico) { fecharEspacoTopico(); return; }
    document.getElementById('topicWorkspaceSubject').textContent = materia.subject;
    document.getElementById('topicWorkspaceTitle').textContent = topico.nome;
    document.getElementById('topicNavTitle').textContent = topico.nome;
    document.getElementById('topicNavSubject').textContent = materia.subject;
    document.getElementById('topicWorkspaceContext').value = topico.contexto || '';
    const analise = obterAnaliseTopico(materia, topico);
    document.getElementById('topicWorkspaceAnalytics').innerHTML = htmlAnaliseTopico(analise);
    document.getElementById('topicWorkspaceHistoryList').innerHTML = htmlHistoricoTopico(analise);
    const revisao = obterRevisaoAtivaTopico(materia, topico);
    const concluidas = (appData.revisoesItems || []).filter(item => item.status === 'revisado' && normalizarRevisaoTexto(item.materia) === normalizarRevisaoTexto(materia.subject) && normalizarRevisaoTexto(item.assunto) === normalizarRevisaoTexto(topico.nome)).length;
    document.getElementById('topicWorkspaceReviewState').innerHTML = revisao
        ? `<div class="topic-workspace-review-status"><strong>${escaparRevisaoHtml(rotuloDataRevisao(revisao.dataAlvo) || 'Revisão pendente')}</strong><small>${concluidas} ${concluidas === 1 ? 'revisão concluída' : 'revisões concluídas'} neste assunto</small></div><button type="button" class="topic-workspace-remove-review" onclick="solicitarRemocaoRevisaoTopico(${materia.id},${espacoTopicoAtual.topicoIndice})">Remover agendamento</button>`
        : `<div class="topic-workspace-review-status"><strong>Sem revisão agendada</strong><small>${concluidas ? `${concluidas} ${concluidas === 1 ? 'revisão concluída' : 'revisões concluídas'}` : 'Você pode marcar a primeira para amanhã.'}</small></div>`;
    document.getElementById('topicWorkspaceReviewButton').textContent = revisao ? 'Mudar para amanhã' : 'Revisar amanhã';
    alternarAbaEspacoTopico(espacoTopicoAtual.aba, false);
}

function alternarAbaEspacoTopico(aba, atualizarSessao = true) {
    if (!['visao', 'caderno', 'historico'].includes(aba) || !localizarEspacoTopico().topico) return;
    if (espacoTopicoAtual.aba === 'caderno' && aba !== 'caderno') salvarCadernoPendente();
    if (espacoTopicoAtual.aba === 'visao' && aba !== 'visao') salvarContextoEspacoTopico();
    espacoTopicoAtual.aba = aba;
    for (const [chave, painelId, tabId] of [['visao', 'topicWorkspaceOverview', 'topicWorkspaceTabOverview'], ['caderno', 'topicWorkspaceNotebook', 'topicWorkspaceTabNotebook'], ['historico', 'topicWorkspaceHistory', 'topicWorkspaceTabHistory']]) {
        const ativo = chave === aba;
        document.getElementById(painelId).hidden = !ativo;
        const botao = document.getElementById(tabId);
        botao.setAttribute('aria-selected', String(ativo));
        botao.tabIndex = ativo ? 0 : -1;
    }
    if (aba === 'caderno') inicializarCadernoCapitulo(espacoTopicoAtual.materiaId, espacoTopicoAtual.topicoIndice);
    if (atualizarSessao) sessionStorage.setItem('kingMasterOpenTopic', JSON.stringify({ materiaId: espacoTopicoAtual.materiaId, nome: espacoTopicoAtual.nome, aba }));
}

function atualizarContextoEspacoTopico(valor) {
    const { topico } = localizarEspacoTopico();
    if (!topico) return;
    topico.contexto = String(valor).slice(0, 1500);
    document.getElementById('topicWorkspaceContextStatus').textContent = 'Salvando…';
    clearTimeout(temporizadorContextoTopico);
    temporizadorContextoTopico = setTimeout(salvarContextoEspacoTopico, 650);
}

function salvarContextoEspacoTopico() {
    if (!temporizadorContextoTopico) return;
    clearTimeout(temporizadorContextoTopico);
    temporizadorContextoTopico = null;
    try {
        saveAppData();
        document.getElementById('topicWorkspaceContextStatus').textContent = 'Salvo automaticamente';
    } catch {
        document.getElementById('topicWorkspaceContextStatus').textContent = 'Não foi possível salvar';
        showToast('Não foi possível salvar o contexto deste assunto.', true);
    }
}

function agendarRevisaoEspacoTopico() {
    const { materia, topico } = localizarEspacoTopico();
    if (!topico) return;
    definirRevisaoTopicoDias(materia.id, espacoTopicoAtual.topicoIndice, 1);
    renderizarEspacoTopico();
}

function fecharEspacoTopico() {
    salvarCadernoPendente();
    salvarContextoEspacoTopico();
    document.getElementById('topicNavSlot').hidden = true;
    sessionStorage.removeItem('kingMasterOpenTopic');
    espacoTopicoAtual.materiaId = null;
    espacoTopicoAtual.topicoIndice = null;
    espacoTopicoAtual.nome = '';
    espacoTopicoAtual.aba = 'visao';
    fecharCadernosDominio();
    showSection('planejamento');
}

function localizarCadernoCapitulo() {
    const materia = appData.cycleItems.find(item => String(item.id) === String(cadernoCapituloAtual.materiaId));
    const topico = materia?.topicos?.[cadernoCapituloAtual.topicoIndice];
    return { materia, topico };
}

function salvarAlteracoesCadernoCapitulo() {
    if (temporizadorCadernoCapitulo) clearTimeout(temporizadorCadernoCapitulo);
    temporizadorCadernoCapitulo = null;
    const status = document.getElementById('chapterSaveState');
    try {
        saveAppData();
        if (status) { status.textContent = 'Salvo'; status.classList.remove('is-saving'); }
        renderizarListaPaginasCaderno();
        renderizarMapaDominio();
        return true;
    } catch {
        if (status) { status.textContent = 'Não foi possível salvar'; status.classList.remove('is-saving'); }
        showToast('Não foi possível salvar o caderno. Tente novamente.', true);
        return false;
    }
}

function abrirCadernosMateria(materiaId, opcoes = {}) {
    salvarCadernoPendente();
    const materia = appData.cycleItems.find(item => String(item.id) === String(materiaId));
    if (!materia) return;
    cadernoCapituloAtual.materiaId = materia.id;
    cadernoCapituloAtual.topicoIndice = null;
    cadernoCapituloAtual.paginaId = null;
    cadernoCapituloAtual.busca = opcoes.busca || '';
    cadernoCapituloAtual.filtro = opcoes.filtro || 'todos';
    cadernoCapituloAtual.limite = opcoes.limite || 12;
    document.getElementById('chapterSearchInput').value = cadernoCapituloAtual.busca;
    document.querySelector('.domain-center-subjects').hidden = true;
    document.querySelectorAll('[data-chapter-filter]').forEach(botao => botao.setAttribute('aria-pressed', String(botao.dataset.chapterFilter === cadernoCapituloAtual.filtro)));
    document.getElementById('chapterNotebook').hidden = true;
    document.getElementById('chapterBrowser').hidden = false;
    renderizarListaCapitulosCaderno();
    document.getElementById('chapterBrowser').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function salvarCadernoPendente() {
    if (temporizadorCadernoCapitulo) salvarAlteracoesCadernoCapitulo();
}

function filtrarCadernosCapitulos(valor = '') {
    cadernoCapituloAtual.busca = normalizarRevisaoTexto(valor);
    cadernoCapituloAtual.limite = 12;
    renderizarListaCapitulosCaderno();
}

function definirFiltroCadernosCapitulos(filtro) {
    if (!['todos', 'novo', 'andamento', 'revisar', 'dominado'].includes(filtro)) return;
    cadernoCapituloAtual.filtro = filtro;
    cadernoCapituloAtual.limite = 12;
    document.querySelectorAll('[data-chapter-filter]').forEach(botao => botao.setAttribute('aria-pressed', String(botao.dataset.chapterFilter === filtro)));
    renderizarListaCapitulosCaderno();
}

function mostrarMaisCadernosCapitulos() {
    cadernoCapituloAtual.limite += 12;
    renderizarListaCapitulosCaderno();
}

function renderizarListaCapitulosCaderno() {
    const materia = appData.cycleItems.find(item => String(item.id) === String(cadernoCapituloAtual.materiaId));
    const lista = document.getElementById('chapterList');
    if (!materia || !lista) return;
    document.getElementById('chapterBrowserTitle').textContent = materia.subject || 'Capítulos';
    const todos = materia.topicos || [];
    const emAndamento = todos.filter(topico => [1, 2].includes(obterNivelDominioTopico(topico))).length;
    const paraRevisar = todos.filter(topico => obterEstadoTopicoControle(materia, topico) === 'revisar').length;
    document.getElementById('chapterBrowserSummary').textContent = `${todos.length} assuntos · ${emAndamento} em andamento · ${paraRevisar} para revisar`;
    const topicos = (materia.topicos || []).map((topico, indice) => ({ topico, indice }))
        .filter(({ topico }) => {
            const estado = obterEstadoTopicoControle(materia, topico);
            const nivel = obterNivelDominioTopico(topico);
            const filtro = cadernoCapituloAtual.filtro;
            return (!cadernoCapituloAtual.busca || normalizarRevisaoTexto(topico.nome).includes(cadernoCapituloAtual.busca))
                && (filtro === 'todos' || (filtro === 'revisar' && estado === 'revisar') || (filtro === 'novo' && nivel === 0 && estado !== 'revisar') || (filtro === 'andamento' && [1, 2].includes(nivel) && estado !== 'revisar') || (filtro === 'dominado' && nivel === 3 && estado !== 'revisar'));
        });
    document.getElementById('chapterResultCount').textContent = `${topicos.length} ${topicos.length === 1 ? 'assunto' : 'assuntos'}`;
    document.getElementById('chapterLoadMore').hidden = topicos.length <= cadernoCapituloAtual.limite;
    lista.innerHTML = topicos.length ? topicos.slice(0, cadernoCapituloAtual.limite).map(({ topico, indice }) => {
        const paginas = Array.isArray(topico.caderno?.paginas) ? topico.caderno.paginas.length : 0;
        const total = paginas + (topico.notas && !topico.cadernoMigrado ? 1 : 0);
        const estado = obterEstadoTopicoControle(materia, topico);
        const nivel = obterNivelDominioTopico(topico);
        const rotulo = estado === 'revisar' ? 'Para revisar' : ['Não iniciado', 'Em estudo', 'Consolidando', 'Dominado'][nivel];
        return `<button type="button" class="chapter-item" onclick="abrirEspacoTopico(${materia.id},${indice})"><span class="chapter-item-number">${String(indice + 1).padStart(2, '0')}</span><span class="chapter-item-copy"><strong>${escaparRevisaoHtml(topico.nome || 'Capítulo')}</strong><small>${total ? `${total} ${total === 1 ? 'página' : 'páginas'} no caderno` : 'Abrir espaço do assunto'}</small></span><span class="chapter-item-status is-${estado === 'revisar' ? 'revisar' : nivel}">${rotulo}</span><span class="chapter-item-arrow" aria-hidden="true">↗</span></button>`;
    }).join('') : `<p class="chapter-page-empty">${materia.topicos?.length ? 'Nenhum capítulo encontrado. Tente outra busca.' : 'Esta matéria ainda não tem capítulos. Adicione-os ao editar a matéria.'}</p>`;
}

function abrirCadernoCapitulo(materiaId, topicoIndice) {
    abrirEspacoTopico(materiaId, topicoIndice, 'caderno');
}

function inicializarCadernoCapitulo(materiaId, topicoIndice) {
    salvarCadernoPendente();
    const materia = appData.cycleItems.find(item => String(item.id) === String(materiaId));
    const topico = materia?.topicos?.[topicoIndice];
    if (!topico) return;
    cadernoCapituloAtual.materiaId = materia.id;
    cadernoCapituloAtual.topicoIndice = topicoIndice;
    if (!topico.caderno || typeof topico.caderno !== 'object') topico.caderno = { paginas: [] };
    if (!Array.isArray(topico.caderno.paginas)) topico.caderno.paginas = [];
    if (String(topico.notas || '').trim() && !topico.cadernoMigrado) {
        topico.caderno.paginas.push({ id: `legado-${Date.now()}`, titulo: 'Anotação anterior', texto: String(topico.notas).slice(0, 12000), criadoEm: Date.now(), atualizadoEm: Date.now() });
        topico.cadernoMigrado = true;
        salvarAlteracoesCadernoCapitulo();
    }
    if (!topico.caderno.paginas.some(pagina => pagina.id === cadernoCapituloAtual.paginaId)) cadernoCapituloAtual.paginaId = topico.caderno.paginas[0]?.id || null;
    document.getElementById('chapterBrowser').hidden = true;
    document.getElementById('topicWorkspaceNotebook').append(document.getElementById('chapterNotebook'));
    document.getElementById('chapterNotebook').hidden = false;
    document.getElementById('chapterNotebookSubject').textContent = 'ANOTAÇÕES DO ASSUNTO';
    document.getElementById('chapterNotebookTitle').textContent = 'Meu caderno';
    renderizarCadernoCapitulo();
}

function renderizarListaPaginasCaderno() {
    const { topico } = localizarCadernoCapitulo();
    const lista = document.getElementById('chapterPageList');
    if (!lista) return;
    const paginas = topico?.caderno?.paginas || [];
    const contador = document.getElementById('chapterPageCount');
    if (contador) contador.textContent = `${paginas.length} ${paginas.length === 1 ? 'página' : 'páginas'}`;
    lista.innerHTML = paginas.length ? paginas.map(pagina => `<button type="button" class="chapter-page-button ${pagina.id === cadernoCapituloAtual.paginaId ? 'active' : ''}" onclick="selecionarPaginaCaderno('${pagina.id}')" aria-current="${pagina.id === cadernoCapituloAtual.paginaId ? 'page' : 'false'}"><span>${escaparRevisaoHtml(pagina.titulo || 'Sem título')}</span><small>↗</small></button>`).join('') : '<p class="chapter-page-empty">Nenhuma página ainda. Crie a primeira para começar.</p>';
}

function renderizarCadernoCapitulo() {
    const { topico } = localizarCadernoCapitulo();
    const editor = document.getElementById('chapterEditor');
    renderizarListaPaginasCaderno();
    if (!editor) return;
    const pagina = topico?.caderno?.paginas?.find(item => item.id === cadernoCapituloAtual.paginaId);
    if (!pagina) { editor.innerHTML = '<div class="chapter-editor-empty"><span class="chapter-empty-mark" aria-hidden="true">✎</span><strong>Comece por uma ideia</strong><p>Escreva com suas palavras, guarde um exemplo ou transforme um texto em resumo com o Gemini.</p><div class="chapter-empty-actions"><button type="button" class="cycle-btn primary" onclick="criarPaginaCaderno()">Criar página</button><button type="button" class="cycle-btn" onclick="abrirResumoCaderno()">✦ Resumir texto</button></div></div>'; return; }
    const data = new Date(pagina.atualizadoEm || pagina.criadoEm || Date.now()).toLocaleDateString('pt-BR');
    editor.innerHTML = `<div class="chapter-editor-top"><span>Atualizada em ${data}</span><button type="button" onclick="solicitarExclusaoPaginaCaderno()">Excluir página</button></div><label>TÍTULO<input id="chapterPageTitle" maxlength="90" value="${escaparRevisaoHtml(pagina.titulo || '')}" placeholder="Ex.: Resumo e exemplos" oninput="atualizarPaginaCaderno('titulo',this.value)"></label><label>ANOTAÇÕES<textarea id="chapterPageText" maxlength="12000" placeholder="Escreva com suas palavras: o que é importante lembrar? Como resolver? Qual foi sua dúvida?" oninput="atualizarPaginaCaderno('texto',this.value)">${escaparRevisaoHtml(pagina.texto || '')}</textarea></label><p class="chapter-editor-hint">O texto é salvo automaticamente. Crie outras páginas para separar fórmulas, exemplos e dúvidas.</p>`;
}

function criarPaginaCaderno() {
    salvarCadernoPendente();
    const { topico } = localizarCadernoCapitulo();
    if (!topico) return;
    if (!topico.caderno || !Array.isArray(topico.caderno.paginas)) topico.caderno = { paginas: [] };
    const pagina = { id: `pagina-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, titulo: 'Nova página', texto: '', criadoEm: Date.now(), atualizadoEm: Date.now() };
    topico.caderno.paginas.push(pagina);
    cadernoCapituloAtual.paginaId = pagina.id;
    salvarAlteracoesCadernoCapitulo();
    renderizarCadernoCapitulo();
    document.getElementById('chapterPageTitle')?.select();
}

let resumoCadernoRequisicao = 0;
function abrirResumoCaderno() {
    const { topico } = localizarCadernoCapitulo();
    if (!topico) return;
    resumoCadernoRequisicao++;
    document.getElementById('chapterSummarySource').value = '';
    document.getElementById('chapterSummaryResult').value = '';
    document.getElementById('chapterSummaryPreview').hidden = true;
    document.getElementById('chapterSummaryStatus').textContent = '';
    document.getElementById('chapterSummaryGenerate').disabled = false;
    document.getElementById('chapterSummaryModal').classList.add('active');
    document.getElementById('chapterSummarySource').focus();
}

function fecharResumoCaderno() {
    resumoCadernoRequisicao++;
    fecharModal('chapterSummaryModal');
}

async function gerarResumoCaderno() {
    const fonte = document.getElementById('chapterSummarySource').value.trim();
    const status = document.getElementById('chapterSummaryStatus');
    if (fonte.length < 40) { status.textContent = 'Cole um texto com pelo menos 40 caracteres.'; return; }
    const { materia, topico } = localizarCadernoCapitulo();
    if (!topico) return;
    const idRequisicao = ++resumoCadernoRequisicao;
    const botao = document.getElementById('chapterSummaryGenerate');
    botao.disabled = true;
    document.getElementById('chapterSummaryPreview').hidden = true;
    status.textContent = 'Gemini está preparando o resumo…';
    try {
        await window.kingGeminiReady;
        if (!window.kingGemini?.summarizeText) throw new Error('Gemini indisponível. Verifique sua conexão e tente novamente.');
        const resultado = await window.kingGemini.summarizeText({ text: fonte, subject: materia.subject, topic: topico.nome });
        if (idRequisicao !== resumoCadernoRequisicao) return;
        document.getElementById('chapterSummaryResult').value = resultado;
        document.getElementById('chapterSummaryPreview').hidden = false;
        status.textContent = 'Confira o resumo antes de adicionar.';
    } catch (erro) {
        if (idRequisicao === resumoCadernoRequisicao) status.textContent = erro?.message || 'Não foi possível gerar o resumo. Tente novamente.';
    } finally {
        if (idRequisicao === resumoCadernoRequisicao) botao.disabled = false;
    }
}

function salvarResumoNoCaderno() {
    const texto = document.getElementById('chapterSummaryResult').value.trim();
    const status = document.getElementById('chapterSummaryStatus');
    if (!texto) { status.textContent = 'O resumo está vazio.'; return; }
    const { topico } = localizarCadernoCapitulo();
    if (!topico || !document.getElementById('chapterSummaryModal').classList.contains('active')) return;
    salvarCadernoPendente();
    if (!topico.caderno || !Array.isArray(topico.caderno.paginas)) topico.caderno = { paginas: [] };
    const agora = Date.now();
    const pagina = { id: `resumo-${agora}-${Math.random().toString(36).slice(2, 8)}`, titulo: 'Resumo com Gemini', texto: texto.slice(0, 12000), criadoEm: agora, atualizadoEm: agora };
    topico.caderno.paginas.push(pagina);
    cadernoCapituloAtual.paginaId = pagina.id;
    try {
        if (!salvarAlteracoesCadernoCapitulo()) throw new Error('Falha ao salvar');
        renderizarCadernoCapitulo();
        fecharResumoCaderno();
        showToast('Resumo adicionado ao caderno.');
    } catch {
        topico.caderno.paginas = topico.caderno.paginas.filter(item => item.id !== pagina.id);
        status.textContent = 'Não foi possível salvar o resumo. Tente novamente.';
    }
}

function selecionarPaginaCaderno(paginaId) {
    salvarCadernoPendente();
    const { topico } = localizarCadernoCapitulo();
    if (!topico?.caderno?.paginas?.some(pagina => pagina.id === paginaId)) return;
    cadernoCapituloAtual.paginaId = paginaId;
    renderizarCadernoCapitulo();
}

function atualizarPaginaCaderno(campo, valor) {
    if (!['titulo', 'texto'].includes(campo)) return;
    const { topico } = localizarCadernoCapitulo();
    const pagina = topico?.caderno?.paginas?.find(item => item.id === cadernoCapituloAtual.paginaId);
    if (!pagina) return;
    pagina[campo] = String(valor).slice(0, campo === 'titulo' ? 90 : 12000);
    pagina.atualizadoEm = Date.now();
    const status = document.getElementById('chapterSaveState');
    if (status) { status.textContent = 'Salvando…'; status.classList.add('is-saving'); }
    if (temporizadorCadernoCapitulo) clearTimeout(temporizadorCadernoCapitulo);
    temporizadorCadernoCapitulo = setTimeout(salvarAlteracoesCadernoCapitulo, 650);
}

function solicitarExclusaoPaginaCaderno() {
    const { topico } = localizarCadernoCapitulo();
    if (!topico?.caderno?.paginas?.some(pagina => pagina.id === cadernoCapituloAtual.paginaId)) return;
    const id = `${cadernoCapituloAtual.materiaId}:${cadernoCapituloAtual.topicoIndice}:${cadernoCapituloAtual.paginaId}`;
    abrirModalDeletar('chapterPage', id, 'Excluir esta página?', 'A anotação desta página será apagada. As outras páginas do capítulo continuarão intactas.', 'Excluir página');
}

function excluirPaginaCaderno(id) {
    const [materiaId, indiceTexto, ...partesId] = String(id).split(':');
    const topico = appData.cycleItems.find(item => String(item.id) === materiaId)?.topicos?.[Number(indiceTexto)];
    if (!topico?.caderno?.paginas) return;
    const paginaId = partesId.join(':');
    topico.caderno.paginas = topico.caderno.paginas.filter(pagina => pagina.id !== paginaId);
    if (cadernoCapituloAtual.paginaId === paginaId) cadernoCapituloAtual.paginaId = topico.caderno.paginas[0]?.id || null;
    salvarAlteracoesCadernoCapitulo();
    renderizarCadernoCapitulo();
    showToast('Página excluída do caderno.');
}

function voltarAosCapitulos() {
    salvarCadernoPendente();
    document.getElementById('chapterNotebook').hidden = true;
    const materiaId = espacoTopicoAtual.materiaId;
    const opcoes = { busca: cadernoCapituloAtual.busca, filtro: cadernoCapituloAtual.filtro, limite: cadernoCapituloAtual.limite };
    fecharEspacoTopico();
    alternarAbasHub('dominio');
    if (materiaId != null) abrirCadernosMateria(materiaId, opcoes);
}

function fecharCadernosDominio() {
    salvarCadernoPendente();
    document.getElementById('chapterBrowser').hidden = true;
    document.getElementById('chapterNotebook').hidden = true;
    document.querySelector('.domain-center-subjects').hidden = false;
    cadernoCapituloAtual.materiaId = null;
    cadernoCapituloAtual.topicoIndice = null;
    cadernoCapituloAtual.paginaId = null;
}

window.addEventListener('pagehide', () => { salvarCadernoPendente(); salvarContextoEspacoTopico(); });
document.addEventListener('visibilitychange', () => { if (document.hidden) { salvarCadernoPendente(); salvarContextoEspacoTopico(); } });

function renderizarMapaDominio() {
    const container = document.getElementById('mapaContainer');
    if (!container) return;
    const estatisticas = document.getElementById('domainCenterStats');
    const itens = appData.cycleItems.flatMap(materia => (materia.topicos || []).map(topico => ({ estado: obterEstadoTopicoControle(materia, topico), nivel: obterNivelDominioTopico(topico) })));
    const totais = { novo: 0, aprendendo: 0, consolidando: 0, dominado: 0, revisar: 0 };
    itens.forEach(item => { totais[['novo', 'aprendendo', 'consolidando', 'dominado'][item.nivel]]++; if (item.estado === 'revisar') totais.revisar++; });
    const total = itens.length;
    const pctGeral = total ? Math.round(totais.dominado / total * 100) : 0;
    document.getElementById('global-mapa-pct').textContent = `${pctGeral}%`;
    estatisticas.innerHTML = [
        ['revisar', 'Revisar agora', 'Pendências de revisão'],
        ['novo', 'Não iniciados', 'Prontos para começar'],
        ['aprendendo', 'Em estudo', 'Construindo a base'],
        ['consolidando', 'Consolidando', 'Falta praticar mais'],
        ['dominado', 'Dominados', 'Já conquistados']
    ].map(([chave, rotulo, detalhe]) => `<article class="domain-center-stat is-${chave}"><span>${rotulo}</span><strong>${totais[chave]}</strong><small>${detalhe}</small></article>`).join('');
    if (!appData.cycleItems.length) {
        container.innerHTML = '<div class="domain-center-empty"><strong>Comece com uma matéria</strong><p>Seus dados de estudo e domínio aparecerão aqui, sem precisar cadastrar nada duas vezes.</p><button type="button" class="cycle-btn primary" onclick="alternarAbasHub(\'ciclo\');abrirModalCiclo()">Adicionar matéria</button></div>';
        return;
    }
    container.innerHTML = appData.cycleItems.map(materia => {
        const topicos = materia.topicos || [];
        const concluidos = topicos.filter(topico => obterNivelDominioTopico(topico) === 3).length;
        const revisoes = topicos.filter(topico => obterEstadoTopicoControle(materia, topico) === 'revisar').length;
        const pct = topicos.length ? Math.round(concluidos / topicos.length * 100) : 0;
        const cor = corSegura(materia.color);
        const nomeMateria = escaparRevisaoHtml(materia.subject || 'Matéria');
        const cadernosIniciados = topicos.filter(topico => (topico.caderno?.paginas?.length || 0) > 0 || Boolean(topico.notas && !topico.cadernoMigrado)).length;
        const distribuicao = [0, 1, 2, 3].map(nivel => topicos.filter(topico => obterNivelDominioTopico(topico) === nivel).length);
        const segmentos = distribuicao.map((quantidade, nivel) => quantidade ? `<span class="is-level-${nivel}" style="flex:${quantidade}" title="${['Não iniciados','Em estudo','Consolidando','Dominados'][nivel]}: ${quantidade}"></span>` : '').join('');
        return `<article class="domain-center-subject" style="--subject-color:${cor}"><div class="domain-center-subject-head"><div><strong>${nomeMateria}</strong><small>${concluidos} de ${topicos.length} tópicos dominados${revisoes ? ` · ${revisoes} para revisar` : ''} · ${cadernosIniciados} ${cadernosIniciados === 1 ? 'caderno iniciado' : 'cadernos iniciados'}</small></div><b>${pct}%</b></div><div class="domain-center-distribution" role="img" aria-label="${nomeMateria}: ${distribuicao[0]} não iniciados, ${distribuicao[1]} em estudo, ${distribuicao[2]} consolidando e ${distribuicao[3]} dominados">${segmentos || '<span class="is-empty"></span>'}</div><div><button type="button" onclick="abrirCadernosMateria(${materia.id})">Ver capítulos e cadernos <span aria-hidden="true">↗</span></button><button type="button" onclick="editarMateriaCiclo(${materia.id})">Editar matéria</button></div></article>`;
    }).join('');
}

document.addEventListener('keydown', event => {
    const digitando = event.target instanceof HTMLElement && (event.target.matches('input, textarea, select') || event.target.isContentEditable);
    if (event.altKey && event.key.toLowerCase() === 'r' && !digitando) {
        event.preventDefault();
        abrirModalRevisao();
        return;
    }
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
    const open = () => {
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
    handle.addEventListener('click', () => nav.classList.contains('is-revealed') ? close() : open());
    document.addEventListener('keydown', event => { if (event.key === 'Escape' && nav.classList.contains('is-revealed')) close(); });
    document.addEventListener('pointerdown', event => { if (!nav.contains(event.target) && !handle.contains(event.target)) close(); });
    nav.querySelectorAll('.menu-btn[data-section],.site-brand').forEach(button => button.addEventListener('click', close));
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
try {
    const anterior = JSON.parse(sessionStorage.getItem('kingMasterOpenTopic') || 'null');
    const materia = appData.cycleItems.find(item => String(item.id) === String(anterior?.materiaId));
    const indice = materia?.topicos?.findIndex(topico => topico.nome === anterior?.nome) ?? -1;
    if (indice >= 0) {
        espacoTopicoAtual.materiaId = materia.id;
        espacoTopicoAtual.topicoIndice = indice;
        espacoTopicoAtual.nome = anterior.nome;
        espacoTopicoAtual.aba = ['visao', 'caderno', 'historico'].includes(anterior.aba) ? anterior.aba : 'visao';
        document.getElementById('topicNavSlot').hidden = false;
        document.getElementById('topicNavTitle').textContent = anterior.nome;
        document.getElementById('topicNavSubject').textContent = materia.subject;
    }
} catch { sessionStorage.removeItem('kingMasterOpenTopic'); }
showSection(document.getElementById(secaoInicial)?.classList.contains('content-section') ? secaoInicial : 'dashboard');
