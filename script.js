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
    dailyGoalMinutes: 240,
    lastWeekStart: '', 
    themeColor: '', 
    themeColorRgb: '', 
    darkMode: false,
    visualMode: 'futuristic',
    piorAreaGargalo: null,
    xpLoginDates: [],
    frasesMotivacionaisFila: [],
    ultimaFraseMotivacional: null,
    profilePhoto: '',
    xpResetOffset: 0
};

let appData;
try {
    appData = { ...defaultAppData, ...(JSON.parse(localStorage.getItem('qg_pedro_data')) || {}) };
} catch (error) {
    appData = { ...defaultAppData };
    console.warn('Os dados locais estavam ilegíveis. O King Master iniciou com uma base segura.', error);
}

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
if (!appData.xpLoginDates) appData.xpLoginDates = [];
if (!Number.isFinite(Number(appData.xpResetOffset))) appData.xpResetOffset = 0;
if (!Array.isArray(appData.frasesMotivacionaisFila)) appData.frasesMotivacionaisFila = [];
if (!Number.isInteger(appData.ultimaFraseMotivacional)) appData.ultimaFraseMotivacional = null;
if (typeof appData.profilePhoto !== 'string') appData.profilePhoto = '';
if (!appData.visualMode) appData.visualMode = 'futuristic';

if(appData.darkMode) document.documentElement.setAttribute('data-theme', 'dark');
document.documentElement.setAttribute('data-visual', appData.visualMode === 'classic' ? 'classic' : 'futuristic');
if(appData.themeColor) { 
    document.documentElement.style.setProperty('--accent-color', appData.themeColor); 
    document.documentElement.style.setProperty('--accent-rgb', appData.themeColorRgb); 
}

function saveAppData() { 
    localStorage.setItem('qg_pedro_data', JSON.stringify(appData)); 
    updateDashboardStats(); 
}

function fecharMenuMovel() {
    const menu = document.querySelector('nav');
    const botao = document.getElementById('mobileNavToggle');
    menu?.classList.remove('mobile-open');
    document.documentElement.classList.remove('mobile-menu-open');
    document.body.classList.remove('mobile-menu-open');
    if (botao) {
        botao.setAttribute('aria-expanded', 'false');
        botao.setAttribute('aria-label', 'Abrir menu de navegação');
        const icone = botao.querySelector('span');
        if (icone) icone.textContent = '☰';
    }
}

function toggleMobileNav() {
    const menu = document.querySelector('nav');
    const botao = document.getElementById('mobileNavToggle');
    if (!menu || !botao) return;
    const aberto = menu.classList.toggle('mobile-open');
    document.documentElement.classList.toggle('mobile-menu-open', aberto);
    document.body.classList.toggle('mobile-menu-open', aberto);
    botao.setAttribute('aria-expanded', String(aberto));
    botao.setAttribute('aria-label', aberto ? 'Fechar menu de navegação' : 'Abrir menu de navegação');
    const icone = botao.querySelector('span');
    if (icone) icone.textContent = aberto ? '×' : '☰';
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
    fecharMenuMovel();
    document.getElementById('settingsPanel')?.classList.remove('active');
    document.getElementById('settingsToggleBtn')?.setAttribute('aria-expanded', 'false');
    document.querySelectorAll('.content-section').forEach(s => s.classList.remove('active'));
    document.querySelectorAll('.menu-btn:not(.toggle-btn)').forEach(b => { 
        b.classList.remove('active'); 
        if(b.getAttribute('onclick')?.includes(sectionId)) b.classList.add('active'); 
    });
    document.getElementById(sectionId).classList.add('active');
    
    if(sectionId === 'historico') renderizarHistorico();
    if(sectionId === 'planejamento') renderizarCiclo();
    if(sectionId === 'escola-provas') renderizarAgenda();
    if(sectionId === 'agendamento') renderizarAgendamento();
    if(sectionId === 'revisoes') renderizarRevisoes();
    if(sectionId === 'simulados') renderizarSimulados();
    if(sectionId === 'redacao') renderizarRedacoes();
    if(sectionId === 'perfil') renderGamificacao();
}

function toggleSettings() {
    const painel = document.getElementById('settingsPanel');
    const botao = document.getElementById('settingsToggleBtn');
    const aberto = painel.classList.toggle('active');
    if (aberto) fecharMenuMovel();
    botao?.setAttribute('aria-expanded', String(aberto));
    if (aberto) syncSettingsUI();
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
// CONTAGEM REGRESSIVA ENEM
// ==========================================
function atualizarContagemEnem() {
    // 📅 ALTERE A DATA DO ENEM AQUI (Formato: YYYY-MM-DDTHH:MM:00)
    const dataEnem = new Date('2026-11-08T13:00:00');
    
    const hoje = new Date();
    const diffTime = Math.max(0, dataEnem - hoje);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    const countdownEl = document.getElementById('enem-countdown');
    
    if (countdownEl) {
        if (diffDays === 0 && hoje.getDate() === dataEnem.getDate() && hoje.getMonth() === dataEnem.getMonth()) {
            countdownEl.textContent = "É HOJE!";
        } else if (diffDays === 0) {
            countdownEl.textContent = "Concluído";
        } else {
            countdownEl.textContent = `${diffDays} DIAS`;
        }
    }
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
    if (dias >= 30) return 'Poder Absoluto';
    if (dias >= 15) return 'Modo Berserk';
    if (dias >= 7) return 'Bônus de 25%';
    if (dias >= 3) return 'Bônus de 10%';
    return 'XP Base';
}

const MARCOS_NIVEL = [
    { nivel: 1, xp: 0, titulo: 'Genin do Foco' },
    { nivel: 2, xp: 1500, titulo: 'Chunin' },
    { nivel: 4, xp: 4500, titulo: 'Caçador de Oni' },
    { nivel: 6, xp: 9000, titulo: 'Gear Second' },
    { nivel: 8, xp: 15000, titulo: 'Kaioken' },
    { nivel: 12, xp: 30000, titulo: 'Super Saiyajin' },
    { nivel: 16, xp: 50000, titulo: 'Bankai' },
    { nivel: 20, xp: 75000, titulo: 'Expansão de Domínio' },
    { nivel: 25, xp: 115000, titulo: 'Modo Sábio' },
    { nivel: 30, xp: 165000, titulo: 'Oito Portões Internos' },
    { nivel: 35, xp: 225000, titulo: 'Gear 5 / Sol da Libertação' },
    { nivel: 40, xp: 300000, titulo: 'Monarca das Sombras' },
    { nivel: 45, xp: 400000, titulo: 'Instinto Superior' },
    { nivel: 50, xp: 520000, titulo: 'Entidade Absoluta do ENEM' }
];

function criarLimitesDeNivel() {
    const limites = Array(51).fill(0);
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

function obterNivelAtual(xp) {
    let nivel = 1;
    for (let candidato = 2; candidato <= 50; candidato++) {
        if (xp >= LIMITES_NIVEL[candidato]) nivel = candidato;
        else break;
    }
    return nivel;
}

function obterTituloAtual(nivel) {
    return [...MARCOS_NIVEL].reverse().find(marco => nivel >= marco.nivel)?.titulo || MARCOS_NIVEL[0].titulo;
}

function obterLigaAtual(nivel) {
    if (nivel >= 50) return { nome: 'Liga Entidade', classe: 'league-entity' };
    if (nivel >= 45) return { nome: 'Mestres do Conhecimento', classe: 'league-master' };
    if (nivel >= 40) return { nome: 'Liga Diamante', classe: 'league-diamond' };
    if (nivel >= 30) return { nome: 'Liga Esmeralda', classe: 'league-emerald' };
    if (nivel >= 20) return { nome: 'Liga Ouro', classe: 'league-gold' };
    if (nivel >= 10) return { nome: 'Liga Prata', classe: 'league-silver' };
    return { nome: 'Liga Bronze', classe: 'league-bronze' };
}

function registrarBonusLoginDiario() {
    const hoje = dataLocalISO();
    if (!appData.xpLoginDates.includes(hoje)) {
        appData.xpLoginDates.push(hoje);
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
    const xpTotal = Math.min(520000, Math.max(0, xpBruto - Number(appData.xpResetOffset || 0)));
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

function aplicarFotoPerfil() {
    const imagem = document.getElementById('profileAvatarImage');
    if (!imagem) return;
    if (appData.profilePhoto) {
        imagem.src = appData.profilePhoto;
        imagem.classList.add('has-photo');
    } else {
        imagem.removeAttribute('src');
        imagem.classList.remove('has-photo');
    }
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
        appData.profilePhoto = canvas.toDataURL('image/jpeg', 0.86);
        localStorage.setItem('qg_pedro_data', JSON.stringify(appData));
        aplicarFotoPerfil();
        showToast('Foto de perfil atualizada!');
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

function renderGamificacao() {
    const dados = calcularGamificacao();
    const estatisticas = calcularEstatisticasGlobais();
    const proximoNivelXp = dados.nivel < 50 ? LIMITES_NIVEL[dados.nivel + 1] : 520000;
    const inicioNivelXp = LIMITES_NIVEL[dados.nivel];
    const progressoNivel = dados.nivel >= 50 ? 100 : Math.max(0, Math.min(100, ((dados.xpTotal - inicioNivelXp) / (proximoNivelXp - inicioNivelXp)) * 100));
    const progressoTotal = Math.min(100, (dados.xpTotal / 520000) * 100);
    const colocarTexto = (id, texto) => { const el = document.getElementById(id); if (el) el.textContent = texto; };
    const colocarLargura = (id, valor) => { const el = document.getElementById(id); if (el) el.style.width = `${valor}%`; };

    colocarTexto('nav-xp-level', `Nível ${dados.nivel}`);
    colocarTexto('nav-xp-streak', `🔥 ${dados.sequencia}`);
    colocarLargura('nav-xp-progress', progressoNivel);
    colocarTexto('profileLeagueName', dados.liga.nome);
    colocarTexto('profileLevelTitle', `Lvl ${dados.nivel} • ${dados.titulo}`);
    colocarTexto('profileNextLevel', dados.nivel >= 50 ? 'Nível máximo alcançado' : `Próximo nível: ${formatarNumero(proximoNivelXp)} XP`);
    colocarTexto('profileXpText', `${formatarNumero(dados.xpTotal)} / 520.000 XP`);
    colocarTexto('profileXpPercent', `${progressoTotal.toFixed(1).replace('.', ',')}%`);
    colocarLargura('profileXpBar', progressoTotal);
    colocarTexto('profileMultiplierBadge', `${dados.multiplicador.toFixed(2).replace(/0$/, '').replace('.', ',')}x • ${nomeDoMultiplicador(dados.sequencia)}`);
    colocarTexto('profileStreak', `${dados.sequencia} ${dados.sequencia === 1 ? 'dia' : 'dias'}`);
    colocarTexto('profileTotalTime', formatShortTime(appData.totalStudySeconds || 0));
    colocarTexto('profileTopics', estatisticas.topicos);
    colocarTexto('profileAccuracy', `${estatisticas.taxa}%`);
    const frame = document.getElementById('profileLeagueFrame');
    if (frame) frame.className = `league-frame ${dados.liga.classe}`;
    aplicarFotoPerfil();
    const perfil = document.getElementById('perfil');
    if (perfil) perfil.dataset.league = dados.liga.classe;
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
        chart.innerHTML = '';
        const maxSec = Math.max(...appData.weeklyChart, 3600); 
        ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'].forEach((lbl, i) => {
            let pct = Math.max(appData.weeklyChart[i] > 0 ? 2 : 0, Math.min(100, (appData.weeklyChart[i] / maxSec) * 100));
            chart.innerHTML += `<div class="chart-col"><div class="chart-tooltip">${formatShortTime(appData.weeklyChart[i])}</div><div class="bar-wrapper"><div class="bar" style="height: ${pct}%;"></div></div><div class="chart-label">${lbl}</div></div>`;
        });
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
        const rotulo = d.toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: '2-digit' });
        if (d.getDay() === 0) {
            html += `<div class="streak-dot ignored" title="${rotulo}: domingo não conta">•</div>`;
        } else if (d.getDay() === 6 && !estudou) {
            html += `<div class="streak-dot optional" title="${rotulo}: sábado opcional">○</div>`;
        } else if (estudou) {
            html += `<div class="streak-dot ok" title="${rotulo}: estudou">✓</div>`;
        } else if (iso === hojeISO) {
            html += `<div class="streak-dot pending" title="${rotulo}: hoje ainda está em aberto">·</div>`;
        } else {
            html += `<div class="streak-dot fail" title="${rotulo}: sem estudo">×</div>`;
        }
    }
    streakRow.innerHTML = html;
    const sequencia = calcularSequenciaAtual();
    document.getElementById('constancia-texto').innerHTML = `Constância atual: <b>${sequencia} ${sequencia === 1 ? 'dia' : 'dias'}</b>. Domingo não conta e sábado é opcional.`;
}

function atualizarLinhaMediaSedilhadDynamica() {
    const container = document.getElementById('weeklyChart');
    if(!container) return;

    const totalSemana = appData.weeklyChart.reduce((acc, curr) => acc + curr, 0);
    const media = totalSemana / 7;
    const maxSec = Math.max(...appData.weeklyChart, 3600);
    const pct = maxSec > 0 ? (media / maxSec) * 100 : 0;

    const heightTrilhoBarra = 120; 
    const marginRotuloGap = 25; 
    const heightContiner = 180; 

    const centroTrilho = heightContiner - marginRotuloGap - (heightTrilhoBarra / 2);
    const variacao = (pct / 100) * (heightTrilhoBarra / 2);
    const topDinamico = centroTrilho - variacao;

    container.style.setProperty('--dinamico-top-sedilhado', `${topDinamico}px`);
}

let timerInterval, isRunning = false, currentMode = 'estudo', currentSeconds = 0, descansoTempoAtual = 5;
let lastTickTime = 0;
let alarmTriggered = false;
const alarmAudio = document.getElementById('alarmAudio'), stopAlarmBtn = document.getElementById('stopAlarmBtn'), timeDisplay = document.getElementById('timeDisplay'), playPauseBtn = document.getElementById('playPauseBtn'), progressRing = document.getElementById('progressRing'), circ = 2 * Math.PI * 135;
if(progressRing) progressRing.style.strokeDasharray = circ;

const getTargetSeconds = () => currentMode === 'descanso' ? descansoTempoAtual * 60 : ((parseInt(document.getElementById('inputHours').value) || 0) * 3600) + ((parseInt(document.getElementById('inputMinutes').value) || 0) * 60) + (parseInt(document.getElementById('inputSeconds').value) || 0);
const sincronizarTempo = () => { if (!isRunning) updateProgress(); };

function updateProgress() {
    if(!timeDisplay) return;
    if (currentSeconds < 0) currentSeconds = 0;
    timeDisplay.textContent = formatHistoryTime(currentSeconds);
    const target = getTargetSeconds();
    let pct = target > 0 ? (currentMode === 'estudo' ? currentSeconds / target : (target - currentSeconds) / target) : (currentMode === 'estudo' ? 0 : 1);
    if(progressRing) progressRing.style.strokeDashoffset = currentMode === 'estudo' ? circ - (Math.max(0, Math.min(1, pct)) * circ) : (circ - (Math.max(0, Math.min(1, pct)) * circ));
    
    if (isRunning) {
        const icone = currentMode === 'estudo' ? '⏱️' : '☕';
        document.title = `${icone} ${formatHistoryTime(currentSeconds)} - QG de Estudos`;
    } else {
        document.title = "QG de Estudos - Pedro";
    }
}

function toggleBotaoStopHistorico() {
    const show = currentMode === 'estudo' && currentSeconds > 0;
    ['btnStopHistory', 'endSessionBtnDash'].forEach(id => { if(document.getElementById(id)) document.getElementById(id).style.display = show ? 'flex' : 'none'; });
    if(document.getElementById('btnPauseHistory')) { document.getElementById('btnPauseHistory').style.display = show ? 'flex' : 'none'; document.getElementById('btnPauseHistory').innerHTML = isRunning ? '<span style="font-size:1.2rem;">⏸</span> Pausar' : '<span style="font-size:1.2rem;">▶</span> Retomar'; }
}

function registrarSessao(segundos) {
    if(segundos < 5) return; 
    const d = new Date();
    const activeSubjId = document.getElementById('activeSubjectSelect').value;
    let nome = 'Estudo Livre', cor = '#515154', tipo = 'Livre';
    
    if (activeSubjId) {
        const idx = appData.cycleItems.findIndex(i => i.id == activeSubjId);
        if (idx > -1) { nome = appData.cycleItems[idx].subject; cor = appData.cycleItems[idx].color; tipo = appData.cycleItems[idx].type || 'Teórica'; appData.cycleItems[idx].executedMin = (appData.cycleItems[idx].executedMin || 0) + (segundos / 60); }
    } else { cor = ['#34c759', '#007aff', '#ff9500', '#ff3b30', '#af52de'][Math.floor(Math.random() * 5)]; }
    
    appData.historyItems.push({ id: Date.now(), dataISO: dataLocalISO(d), dataChave: `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`, diaNum: d.getDate().toString().padStart(2, '0'), mesAno: `${['JAN', 'FEV', 'MAR', 'ABR', 'MAI', 'JUN', 'JUL', 'AGO', 'SET', 'OUT', 'NOV', 'DEZ'][d.getMonth()]}/${d.getFullYear().toString().slice(-2)}`, diaStr: ['DOM', 'SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SÁB'][d.getDay()], materia: nome, assunto: '', tempoSegundos: segundos, cor: cor, tipo: tipo, comentario: '' });
    saveAppData(); renderizarCiclo(); if(document.getElementById('historico').classList.contains('active')) renderizarHistorico(); 
    showToast('✅ Sessão guardada no histórico!');
    mostrarFraseMotivacional();
}

function toggleTimer() {
    if (isRunning) { 
        clearInterval(timerInterval); 
        playPauseBtn.textContent = '▶'; 
        isRunning = false; 
        saveAppData(); 
        updateProgress(); 
    } else {
        let target = getTargetSeconds();
        if (currentMode === 'descanso' && currentSeconds <= 0) currentSeconds = target;
        if (target <= 0 && currentMode === 'descanso') return showToast('⚠️ Defina um tempo maior que zero.', true);
        
        lastTickTime = Date.now(); 
        
        alarmTriggered = (target > 0 && currentSeconds >= target); 
        
        timerInterval = setInterval(() => {
            let now = Date.now();
            let deltaSecs = Math.round((now - lastTickTime) / 1000); 
            
            if (deltaSecs >= 1) {
                lastTickTime = lastTickTime + (deltaSecs * 1000); 
                target = getTargetSeconds();
                
                if (currentMode === 'estudo') {
                    currentSeconds += deltaSecs; 
                    appData.totalStudySeconds += deltaSecs;
                    
                    let diaSemana = new Date().getDay() - 1;
                    if(diaSemana === -1) diaSemana = 6;
                    appData.weeklyChart[diaSemana] += deltaSecs;
                    
                    updateProgress();
                    
                    if (target > 0 && currentSeconds >= target && !alarmTriggered) { 
                        alarmTriggered = true; 
                        document.title = "⏰ META ATINGIDA! - QG";
                        triggerAlarm(); 
                        showToast('🎯 Meta de tempo atingida! O cronômetro continua rodando.');
                    }
                } else { 
                    currentSeconds -= deltaSecs;
                    if (currentSeconds <= 0) { 
                        currentSeconds = 0; 
                        clearInterval(timerInterval); 
                        isRunning = false; 
                        playPauseBtn.textContent = '▶'; 
                        document.title = "⏰ DE VOLTA À MISSÃO! - QG";
                        updateProgress(); 
                        triggerAlarm(); 
                        toggleBotaoStopHistorico(); 
                    } else {
                        updateProgress();
                    }
                }
                toggleBotaoStopHistorico();
            }
        }, 500); 
        
        playPauseBtn.innerHTML = '&#10074;&#10074;'; 
        isRunning = true;
        updateProgress(); 
    }
    toggleBotaoStopHistorico();
}

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
function executarResetTimer() { fecharModal('confirmResetModal'); clearInterval(timerInterval); isRunning = false; alarmTriggered = false; playPauseBtn.textContent = '▶'; currentSeconds = currentMode === 'estudo' ? 0 : getTargetSeconds(); saveAppData(); updateProgress(); toggleBotaoStopHistorico(); document.title = "QG de Estudos - Pedro"; }
function encerrarSessaoDashboard() { if (currentSeconds >= 5) registrarSessao(currentSeconds); else showToast('⚠️ Sessão muito curta (mínimo 5s).', true); clearInterval(timerInterval); isRunning = false; alarmTriggered = false; playPauseBtn.textContent = '▶'; currentSeconds = 0; saveAppData(); updateProgress(); toggleBotaoStopHistorico(); document.title = "QG de Estudos - Pedro"; }
function setDescansoTime(mins) { descansoTempoAtual = mins; document.getElementById('btn-descanso-5').classList.remove('primary'); document.getElementById('btn-descanso-10').classList.remove('primary'); document.getElementById(`btn-descanso-${mins}`).classList.add('primary'); executarResetTimer(); }

function setMode(mode) {
    if (currentMode === 'estudo' && currentSeconds >= 5) registrarSessao(currentSeconds);
    currentMode = mode;
    alarmTriggered = false;
    document.getElementById('btn-estudo').classList.remove('active'); document.getElementById('btn-descanso').classList.remove('active'); document.getElementById(`btn-${mode}`).classList.add('active');
    document.getElementById('manualTimeGroup').style.display = mode === 'estudo' ? 'flex' : 'none';
    document.getElementById('subjectSelectorArea').style.display = mode === 'estudo' ? 'flex' : 'none';
    document.getElementById('descansoPresetGroup').style.display = mode === 'estudo' ? 'none' : 'flex';
    document.getElementById('labelConfig').textContent = mode === 'estudo' ? 'Tocar alarme após' : 'Tempo de Descanso';
    if(progressRing) progressRing.style.stroke = mode === 'estudo' ? 'var(--accent-color)' : '#ff4757'; 
    clearInterval(timerInterval); isRunning = false; playPauseBtn.textContent = '▶'; currentSeconds = mode === 'estudo' ? 0 : getTargetSeconds(); updateProgress(); toggleBotaoStopHistorico();
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
    saveAppData(); renderizarCiclo(); renderizarRevisoes(); fecharModal('cycleModal'); showToast('📚 Matéria guardada!');
}

function renderizarCiclo() {
    atualizarSeletorDeMaterias();
    const grid = document.getElementById('disciplinasGrid');
    if(!grid) return;

    if(appData.cycleItems.length === 0) { 
        grid.innerHTML = '<div style="grid-column:1/-1;text-align:center;padding:40px;color:var(--text-muted);background:var(--card-bg);border-radius:16px;border:1px dashed var(--border-color);">Nenhuma matéria registada. Comece adicionando a primeira matéria.</div>'; 
        return; 
    }

    grid.innerHTML = appData.cycleItems.map(i => {
        let exec = i.executedMin || 0; 
        let txtExec = exec >= 60 ? `${Math.floor(exec/60)}h${Math.floor(exec%60).toString().padStart(2,'0')}m` : `${Math.floor(exec%60)}m`;
        let concluidos = i.topicos ? i.topicos.filter(t => t.concluido).length : 0, totalTopicos = i.topicos ? i.topicos.length : 0;
        return `<div class="disc-card" style="border-left-color: ${i.color}; cursor: pointer;" onclick="abrirModalAssuntos(${i.id})"><div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:20px;"><div><div class="disc-title" style="margin-bottom:2px;">${i.subject}</div><span style="font-size:.75rem;color:var(--text-muted);font-weight:600;">${i.type || 'Teórica'}</span></div><div style="display:flex;gap:12px;"><i onclick="event.stopPropagation(); editarMateriaCiclo(${i.id})" style="cursor:pointer;opacity:.4;font-style:normal;font-size:1.1rem;" onmouseover="this.style.opacity='1'" onmouseout="this.style.opacity='.4'" title="Editar Matéria">✏️</i><i onclick="event.stopPropagation(); abrirModalDeletar('cycle', ${i.id}, 'Apagar Matéria?', 'Isto vai excluir a matéria e tópicos.')" style="cursor:pointer;opacity:.4;font-style:normal;font-size:1.1rem;" onmouseover="this.style.opacity='1'" onmouseout="this.style.opacity='.4'" title="Apagar Matéria">🗑️</i></div></div><div class="disc-stats-row"><div class="ds-box"><span class="ds-val">${concluidos}/${totalTopicos}</span><span class="ds-lbl">Tópicos</span></div><div class="ds-box"><span class="ds-val" style="color:${i.color};">${txtExec}</span><span class="ds-lbl">Tempo Real</span></div><div class="ds-box"><span class="ds-val">${(i.acertos||0)+(i.erros||0)}</span><span class="ds-lbl">Questões</span></div></div></div>`;
    }).join('');
}

function abrirModalAssuntos(id) {
    const mat = appData.cycleItems.find(m => m.id === id); if (!mat) return;
    document.getElementById('assuntosMateriaId').value = id; document.getElementById('assuntosModalTitle').textContent = mat.subject;
    let segs = 0; appData.historyItems.forEach(h => { if(h.materia.trim().toLowerCase() === mat.subject.trim().toLowerCase()) segs += h.tempoSegundos; });
    document.getElementById('assuntosModalTimeValue').textContent = `${Math.floor(segs/3600)}h ${Math.floor((segs%3600)/60).toString().padStart(2,'0')}m`;
    renderizarListaAssuntos(id); document.getElementById('assuntosModal').classList.add('active');
}

function renderizarListaAssuntos(id) {
    const mat = appData.cycleItems.find(m => m.id === id), lista = document.getElementById('listaAssuntos');
    if (!mat.topicos || mat.topicos.length === 0) { lista.innerHTML = '<p style="text-align: center; color: var(--text-muted); font-size: 0.9rem; margin-top: 30px;">Nenhum assunto.</p>'; return; }
    lista.innerHTML = mat.topicos.map((t, i) => `<li class="${t.concluido ? 'completed' : ''}" style="justify-content: space-between; padding-right: 5px;"><span onclick="toggleTopico(${id}, ${i})" style="flex: 1;">${t.nome}</span><i onclick="deletarTopico(${id}, ${i})" style="cursor: pointer; font-style: normal; color: #ff3b30; font-size: 0.9rem; opacity: 0.7;" onmouseover="this.style.opacity='1'" onmouseout="this.style.opacity='0.7'">🗑️</i></li>`).join('');
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

function abrirModalEditarHistorico(id) { const h = appData.historyItems.find(i => i.id === id); if(h) { document.getElementById('histEditId').value = h.id; document.getElementById('histSubject').value = h.materia; document.getElementById('histComment').value = h.comentario || ''; document.getElementById('editHistoryModal').classList.add('active'); } }
function salvarEdicaoHistorico(e) { e.preventDefault(); const idx = appData.historyItems.findIndex(h => h.id === parseInt(document.getElementById('histEditId').value)); if(idx > -1) { appData.historyItems[idx].materia = document.getElementById('histSubject').value; appData.historyItems[idx].comentario = document.getElementById('histComment').value; saveAppData(); renderizarHistorico(); fecharModal('editHistoryModal'); showToast('✏️ Histórico atualizado!'); } }

function renderizarHistorico() {
    toggleBotaoStopHistorico(); 
    renderizarRaioX();

    const cont = document.getElementById('historyListContainer');
    if(!cont) return;
    if(!appData.historyItems || appData.historyItems.length === 0) { cont.innerHTML = '<p style="text-align: center; color: var(--text-muted); padding: 40px; border: 1px dashed var(--border-color); border-radius: 24px;">Nenhuma sessão finalizada.</p>'; document.getElementById('hist-total-time').textContent = "0h00min"; return; }
    
    let totalSecs = 0, grupos = {}, html = '';
    [...appData.historyItems].sort((a, b) => b.id - a.id).forEach(i => { totalSecs += i.tempoSegundos; if(!grupos[i.dataChave]) grupos[i.dataChave] = { itens: [], t: 0, hdr: i }; grupos[i.dataChave].itens.push(i); grupos[i.dataChave].t += i.tempoSegundos; });
    const histTotal = document.getElementById('hist-total-time');
    if(histTotal) histTotal.textContent = `${Math.floor(totalSecs/3600)}h${Math.floor((totalSecs%3600)/60).toString().padStart(2,'0')}min`;
    
    for(let k in grupos) {
        const g = grupos[k];
        html += `<div class="h-date-header"><div class="h-date-left"><span class="h-date-num">${g.hdr.diaNum}</span><div class="h-date-text"><span>${g.hdr.mesAno}</span><span>${g.hdr.diaStr}</span></div></div><div class="h-date-line"></div><div class="h-date-total">⏱ ${Math.floor(g.t/3600)}h${Math.floor((g.t%3600)/60).toString().padStart(2,'0')}min</div></div>`;
        g.itens.forEach(s => {
            let cor = s.tipo === 'Prática' ? '#ff9500' : (s.tipo === 'Teórica e Prática' ? '#007aff' : (s.tipo === 'Geral' ? '#515154' : 'var(--badge-purple)'));
            html += `<div class="h-session-card" style="border-left-color: ${s.cor}; flex-direction: column; align-items: stretch; gap: 10px;"><div style="display: flex; justify-content: space-between; align-items: center; width: 100%;"><div class="hs-info"><b class="hs-title" style="color: ${s.cor};">${s.materia}</b></div><div class="hs-actions"><span class="hs-time">⏱ ${formatHistoryTime(s.tempoSegundos)}</span><div class="hs-stats"><span>0</span><span>0</span><span>0</span></div><span class="hs-badge" style="background-color: ${cor};">${s.tipo || 'TEORIA'}</span><div class="hs-icons"><i onclick="abrirModalEditarHistorico(${s.id})" title="Editar">✏️</i> <i onclick="abrirModalDeletar('history', ${s.id}, 'Deletar Registro?', 'A sessão será removida do histórico.')" title="Apagar">🗑️</i></div></div></div>${s.comentario ? `<div class="hs-comment-block" style="display: block;">"${s.comentario}"</div>` : ''}</div>`;
        });
    }
    cont.innerHTML = html;
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
        
        barHtml += `<div class="lifetime-segment" style="width: ${pct}%; background-color: ${item.cor};" title="${item.nome}: ${tempoTexto} | ${taxaTexto}"></div>`;
        
        legendHtml += `
            <div class="legend-item" title="${pct.toFixed(1)}% do tempo investido" style="border-left: 3px solid ${item.cor}; display: flex; flex-direction: column; align-items: flex-start; gap: 4px; padding: 10px; min-width: 200px;">
                <div style="display:flex; align-items: center; gap: 6px;">
                    <div class="legend-dot" style="background-color: ${item.corOriginal};"></div>
                    <span style="font-weight: 800; color: var(--text-main); font-size: 0.85rem;">${item.icon} ${item.nome}</span>
                </div>
                <span style="font-size: 0.75rem; color: ${item.cor}; font-weight: 700; margin-left: 16px;">${item.tag ? item.tag.trim() : ''}</span>
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
    if (!list) return;

    if (!appData.agendamentoItems || appData.agendamentoItems.length === 0) {
        list.innerHTML = '<p style="text-align: center; color: var(--text-muted); padding: 40px; border: 1px dashed var(--border-color); border-radius: 16px;">Nada agendado. Organize suas prioridades!</p>';
        if(highlight) highlight.style.display = 'none';
        return;
    }

    let itens = [...appData.agendamentoItems].sort((a, b) => {
        const dtA = new Date(`${a.date}T${a.time}`);
        const dtB = new Date(`${b.date}T${b.time}`);
        return dtA - dtB;
    });

    itens.sort((a, b) => (a.completed === b.completed) ? 0 : a.completed ? 1 : -1);

    let html = '';
    itens.forEach(item => {
        const d = new Date(`${item.date}T12:00:00`);
        const corUrgencia = item.completed ? 'var(--border-color)' : 'var(--accent-color)';
        
        html += `
        <div class="agenda-card ${item.completed ? 'completed' : ''}" style="--urgency-color: ${corUrgencia};">
            <div class="agenda-actions" style="margin-right: 10px;">
                <i class="btn-check-agenda" onclick="toggleAgendamentoStatus(${item.id})">${item.completed ? '✅' : '⬜'}</i>
            </div>
            <div class="agenda-date-box" style="min-width: 85px;">
                <span style="font-size: 1.2rem;">${item.time}</span>
                <span style="font-size: 0.65rem; opacity: 0.7; text-transform: uppercase;">${d.toLocaleDateString('pt-PT', {day:'2-digit', month:'short'})}</span>
            </div>
            <div class="agenda-info">
                <div class="agenda-title" style="font-size: 1rem; font-weight: 800;">${item.title}</div>
                <div class="agenda-subject"><span class="agenda-badge">${item.type}</span></div>
                ${item.description ? `<div style="font-size: 0.75rem; color: var(--text-muted); margin-top: 4px; font-style: italic;">${item.description}</div>` : ''}
            </div>
            <div class="agenda-actions">
                <i onclick="editarAgendamentoItem(${item.id})" style="cursor:pointer;" title="Editar">✏️</i>
                <i onclick="abrirModalDeletar('agendamentoTab', ${item.id}, 'Remover?', 'Deseja apagar este compromisso?')" style="cursor:pointer;" title="Apagar">🗑️</i>
            </div>
        </div>`;
    });

    list.innerHTML = html;
    
    const proximo = itens.find(i => !i.completed);
    if(proximo && highlight) {
        highlight.style.display = 'block';
        highlight.innerHTML = `<h3 style="margin:0; font-size:0.75rem; color:var(--text-muted); text-transform: uppercase; font-weight: 700;">PRÓXIMO NA LISTA</h3>
                               <div style="font-size:1.3rem; font-weight:800; margin-top:5px; color: var(--text-main);">${proximo.time} - ${proximo.title}</div>`;
    }
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
        lista.innerHTML = '<p style="text-align:center;color:var(--text-muted);padding:40px;border:1px dashed var(--border-color);border-radius:16px;">Nenhuma revisão registada.</p>';
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

    lista.innerHTML = ordenados.map(item => {
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
        const acoesDeFluxo = !revisado ? `<button class="cycle-btn" onclick="marcarRevisao(${item.id},'revisado')">Marcar revisado</button><button class="cycle-btn weak-action" onclick="abrirReagendamentoRevisao(${item.id})">Marcar nova data</button>` : '';
        return `<article class="revision-card ${revisado ? 'reviewed' : ''}" style="--revision-color:${cor};"><div class="revision-card-main"><div class="revision-card-title">${escaparRevisaoHtml(item.materia)}</div><div class="revision-card-subject">${escaparRevisaoHtml(item.assunto)}</div>${tagsHtml ? `<div class="revision-tags-inline">${tagsHtml}</div>` : ''}<div class="revision-meta"><span class="revision-badge ${statusClasse}">${statusTexto}</span><span class="revision-badge">${origemTexto}</span><span class="revision-badge">Revisar: ${dataTexto}</span>${datasExtras}</div></div><div class="revision-actions">${acoesDeFluxo}<button class="cycle-btn" onclick="abrirModalRevisao(${item.id})">Editar</button><button class="cycle-btn revision-delete-btn" onclick="abrirModalDeletar('revisao', ${item.id}, 'Excluir revisão?', 'Esta revisão será removida da sua lista.')">Excluir</button></div></article>`;
    }).join('');
    renderDashboardRevisoes();
}

function abrirModalSimulado() {
    document.getElementById('formAddSimulado').reset();
    document.getElementById('simEditId').value = "";
    document.getElementById('simArea').value = "Linguagens, Códigos e suas Tecnologias";
    document.getElementById('simFileName').textContent = "Selecionar Arquivo do Computador";
    document.getElementById('simAttachmentData').value = "";
    document.getElementById('simuladoModalTitle').textContent = "Registar Simulado";
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
    showToast(revisaoCriada ? '🎯 Simulado registado e revisão criada para a área mais fraca!' : '🎯 Simulado registado!');
}

function renderizarSimulados() {
    const list = document.getElementById('listaSimulados');
    if (!list) return;

    if (!appData.simuladosItems || appData.simuladosItems.length === 0) {
        document.getElementById('sim-media-acertos').textContent = "0%";
        document.getElementById('sim-tempo-questao').textContent = "0m 00s";
        document.getElementById('sim-ponto-forte').textContent = "-";
        
        const fracoDisplay = document.getElementById('sim-ponto-fraco');
        if(fracoDisplay) fracoDisplay.textContent = "-";
        
        appData.piorAreaGargalo = null; 
        
        list.innerHTML = '<p style="text-align: center; color: var(--text-muted); padding: 40px; border: 1px dashed var(--border-color); border-radius: 16px;">Nenhum simulado arquivado. A arena aguarda dados.</p>';
        return;
    }

    let totalAcertosGeral = 0, totalQuestoesGeral = 0, totalTempoMinGeral = 0;
    let areasMap = {}; let html = '';
    const itensOrdenados = [...appData.simuladosItems].sort((a, b) => new Date(b.date) - new Date(a.date));

    itensOrdenados.forEach(sim => {
        let acertos = sim.acertos || 0; let erros = sim.erros || 0;
        let total = sim.total || (acertos + erros > 0 ? acertos + erros : 1);
        let area = sim.area || "Geral";

        totalAcertosGeral += acertos; totalQuestoesGeral += total; totalTempoMinGeral += sim.tempoMin;
        if(!areasMap[area]) areasMap[area] = { acertos: 0, total: 0 };
        areasMap[area].acertos += acertos; areasMap[area].total += total;

        const tempoPorQuestaoSegundos = Math.floor((sim.tempoMin * 60) / total);
        const minQ = Math.floor(tempoPorQuestaoSegundos / 60);
        const segQ = tempoPorQuestaoSegundos % 60;
        const tempoStr = `${minQ}m ${segQ.toString().padStart(2, '0')}s`;

        let percAcerto = Math.round((acertos / total) * 100);
        let corDesempenho = percAcerto >= 70 ? '#34c759' : (percAcerto >= 50 ? '#ff9500' : '#ff3b30');
        
        let anexoBtn = sim.attachment ? `<a href="${sim.attachment}" download="${sim.title}_anexo" class="btn-anexo">📄 Ver Anexo</a>` : '';

        html += `
        <div class="agenda-card" style="--urgency-color: ${corDesempenho}; flex-direction: column; align-items: stretch; cursor: default; gap: 15px;">
            <div style="display: flex; justify-content: space-between; align-items: flex-start; width: 100%;">
                <div style="display: flex; flex-direction: column; gap: 8px;">
                    <div class="agenda-title" style="font-size: 1.3rem; letter-spacing: -0.5px;">${sim.title} ${anexoBtn}</div>
                    <div style="display: flex; flex-wrap: wrap; gap: 10px; align-items: center;">
                        <span style="background: var(--bg-body); border: 1px solid var(--border-color); padding: 4px 10px; border-radius: 8px; font-size: 0.75rem; font-weight: 700; color: var(--text-main); text-transform: uppercase;">📚 ${area}</span>
                        <span style="font-size: 0.8rem; color: var(--text-muted); font-weight: 600;">🕒 Tempo: ${Math.floor(sim.tempoMin/60)}h ${sim.tempoMin%60}m • 🎯 Tempo/Questão: ${tempoStr}</span>
                    </div>
                </div>
                <div class="agenda-actions" style="margin: 0;">
                    <i onclick="editarSimulado(${sim.id})" title="Editar Registo" style="font-size: 1.2rem;">✏️</i>
                    <i onclick="abrirModalDeletar('simulado', ${sim.id}, 'Apagar Simulado?', 'O desempenho será eliminado.')" title="Excluir" style="font-size: 1.2rem;">🗑️</i>
                </div>
            </div>
            <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 15px; text-align: center; background: var(--bg-body); padding: 15px; border-radius: 12px; border: 1px solid var(--border-color);">
                <div style="display: flex; flex-direction: column; gap: 5px;"><span style="font-size: 0.7rem; color: var(--text-muted); font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px;">Questões</span><span style="font-size: 1.5rem; font-weight: 800; color: var(--text-main);">${total}</span></div>
                <div style="display: flex; flex-direction: column; gap: 5px;"><span style="font-size: 0.7rem; color: #34c759; font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px;">Acertos</span><span style="font-size: 1.5rem; font-weight: 800; color: #34c759;">${acertos}</span></div>
                <div style="display: flex; flex-direction: column; gap: 5px;"><span style="font-size: 0.7rem; color: #ff3b30; font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px;">Erros</span><span style="font-size: 1.5rem; font-weight: 800; color: #ff3b30;">${erros}</span></div>
                <div style="display: flex; flex-direction: column; gap: 5px;"><span style="font-size: 0.7rem; color: var(--text-muted); font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px;">Aproveitamento</span><span style="font-size: 1.5rem; font-weight: 800; color: ${corDesempenho};">${percAcerto}%</span></div>
            </div>
        </div>`;
    });

    list.innerHTML = html;
    
    if (totalQuestoesGeral > 0) {
        document.getElementById('sim-media-acertos').textContent = `${Math.round((totalAcertosGeral / totalQuestoesGeral) * 100)}%`;
        const mQG = Math.floor(Math.floor((totalTempoMinGeral * 60) / totalQuestoesGeral) / 60);
        const sQG = Math.floor((totalTempoMinGeral * 60) / totalQuestoesGeral) % 60;
        document.getElementById('sim-tempo-questao').textContent = `${mQG}m ${sQG.toString().padStart(2, '0')}s`;
        
        let maxPerc = -1, minPerc = 101, pontoForte = "-", pontoFraco = "-";
        
        for (let key in areasMap) { 
            let aproveitamento = areasMap[key].acertos / areasMap[key].total;
            if(aproveitamento > maxPerc) { maxPerc = aproveitamento; pontoForte = key; }
            if(aproveitamento < minPerc) { minPerc = aproveitamento; pontoFraco = key; }
        }
        
        let formatadoForte = pontoForte.split(',')[0].split(' e ')[0];
        let formatadoFraco = pontoFraco.split(',')[0].split(' e ')[0];

        document.getElementById('sim-ponto-forte').textContent = formatadoForte;
        
        const fracoDisplay = document.getElementById('sim-ponto-fraco');
        if(fracoDisplay) fracoDisplay.textContent = formatadoFraco;
        
        appData.piorAreaGargalo = pontoFraco; 
    }
}

function abrirModalRedacao() {
    document.getElementById('formAddRedacao').reset();
    document.getElementById('redEditId').value = "";
    document.getElementById('redFileName').textContent = "Selecionar Arquivo do Computador";
    document.getElementById('redAttachmentData').value = "";
    document.getElementById('redacaoModalTitle').textContent = "Registar Redação";
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
        if (idx > -1) appData.redacaoItems[idx] = { ...appData.redacaoItems[idx], theme, date, c1, c2, c3, c4, c5, attachment };
    } else {
        appData.redacaoItems.push({ id: Date.now(), theme, date, c1, c2, c3, c4, c5, attachment });
    }
    saveAppData(); renderizarRedacoes(); fecharModal('redacaoModal'); showToast('✍️ Redação arquivada no Laboratório!');
}

function renderizarRedacoes() {
    const list = document.getElementById('listaRedacoes');
    if (!list) return;

    if (!appData.redacaoItems || appData.redacaoItems.length === 0) {
        document.getElementById('red-media').textContent = "0"; document.getElementById('red-forte').textContent = "-"; document.getElementById('red-gargalo').textContent = "-";
        list.innerHTML = '<p style="text-align: center; color: var(--text-muted); padding: 40px; border: 1px dashed var(--border-color); border-radius: 16px;">Nenhum texto registado. Comece a escrever.</p>';
        return;
    }

    let html = ''; let somaNotas = 0;
    let compAcumuladas = { 'C1 (Escrita)': 0, 'C2 (Tema)': 0, 'C3 (Ideias)': 0, 'C4 (Coesão)': 0, 'C5 (Intervenção)': 0 };
    const itensOrdenados = [...appData.redacaoItems].sort((a, b) => new Date(b.date) - new Date(a.date));

    itensOrdenados.forEach(red => {
        const total = red.c1 + red.c2 + red.c3 + red.c4 + red.c5; somaNotas += total;
        compAcumuladas['C1 (Escrita)'] += red.c1; compAcumuladas['C2 (Tema)'] += red.c2; compAcumuladas['C3 (Ideias)'] += red.c3; compAcumuladas['C4 (Coesão)'] += red.c4; compAcumuladas['C5 (Intervenção)'] += red.c5;

        let corDesempenho = total >= 900 ? '#34c759' : (total >= 700 ? '#ff9500' : '#ff3b30');
        let anexoBtn = red.attachment ? `<a href="${red.attachment}" download="${red.theme}_redacao" class="btn-anexo" style="margin-left:10px;">📄 Ver Arquivo</a>` : '';

        html += `
        <div class="agenda-card" style="--urgency-color: ${corDesempenho}; flex-direction: column; align-items: stretch; cursor: default;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px; width: 100%;">
                <div>
                    <div class="agenda-title" style="font-size: 1.2rem; display:flex; align-items:center;">${red.theme} ${anexoBtn}</div>
                    <div class="agenda-subject" style="margin-top: 5px;">📅 ${new Date(red.date).toLocaleDateString('pt-PT')}</div>
                </div>
                <div style="font-size: 1.8rem; font-weight: 800; color: ${corDesempenho};">${total}</div>
                <div class="agenda-actions">
                    <i onclick="editarRedacao(${red.id})" title="Editar Registo">✏️</i>
                    <i onclick="abrirModalDeletar('redacao', ${red.id}, 'Apagar Redação?', 'O registo será eliminado.')" title="Excluir">🗑️</i>
                </div>
            </div>
            <div style="display: grid; grid-template-columns: repeat(5, 1fr); gap: 8px; text-align: center; background: var(--bg-body); padding: 10px; border-radius: 10px; border: 1px solid var(--border-color);">
                <div><div style="font-size: 0.65rem; color: var(--text-muted); font-weight: 700;">C1</div><div style="font-size: 1rem; font-weight: 800; color: var(--text-main);">${red.c1}</div></div>
                <div><div style="font-size: 0.65rem; color: var(--text-muted); font-weight: 700;">C2</div><div style="font-size: 1rem; font-weight: 800; color: var(--text-main);">${red.c2}</div></div>
                <div><div style="font-size: 0.65rem; color: var(--text-muted); font-weight: 700;">C3</div><div style="font-size: 1rem; font-weight: 800; color: var(--text-main);">${red.c3}</div></div>
                <div><div style="font-size: 0.65rem; color: var(--text-muted); font-weight: 700;">C4</div><div style="font-size: 1rem; font-weight: 800; color: var(--text-main);">${red.c4}</div></div>
                <div><div style="font-size: 0.65rem; color: var(--text-muted); font-weight: 700;">C5</div><div style="font-size: 1rem; font-weight: 800; color: var(--text-main);">${red.c5}</div></div>
            </div>
        </div>`;
    });

    list.innerHTML = html;
    document.getElementById('red-media').textContent = Math.round(somaNotas / itensOrdenados.length);
    document.getElementById('red-forte').textContent = Object.keys(compAcumuladas).reduce((a, b) => compAcumuladas[a] > compAcumuladas[b] ? a : b).split(' ')[0]; 
    document.getElementById('red-gargalo').textContent = Object.keys(compAcumuladas).reduce((a, b) => compAcumuladas[a] < compAcumuladas[b] ? a : b).split(' ')[0];
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
    document.getElementById('aba-ciclo-content').style.display = ciclo ? 'block' : 'none';
    document.getElementById('aba-dominio-content').style.display = ciclo ? 'none' : 'block';
    document.getElementById('tab-ciclo').classList.toggle('primary', ciclo);
    document.getElementById('tab-dominio').classList.toggle('primary', !ciclo);
    if (!ciclo) renderizarMapaDominio();
}

function toggleMapaCard(id) {
    document.getElementById(`mapa-body-${id}`)?.classList.toggle('open');
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
        container.innerHTML = '<p style="grid-column:1/-1;text-align:center;color:var(--text-muted);padding:35px;border:1px dashed var(--border-color);border-radius:16px;">Adicione matérias e tópicos para montar o mapa.</p>';
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
            return `<div class="mapa-topic-row"><span class="mapa-topic-name">${topico.nome}</span><div class="mapa-tpd-group"><button class="tpd-btn ${d.teoria ? 'active' : ''}" style="${d.teoria ? `background:${materia.color}` : ''}" onclick="toggleTopicoDominio(${materia.id},${index},'teoria')">T</button><button class="tpd-btn ${d.pratica ? 'active' : ''}" style="${d.pratica ? `background:${materia.color}` : ''}" onclick="toggleTopicoDominio(${materia.id},${index},'pratica')">P</button><button class="tpd-btn ${d.dominio ? 'active' : ''}" style="${d.dominio ? `background:${materia.color}` : ''}" onclick="toggleTopicoDominio(${materia.id},${index},'dominio')">D</button></div></div>`;
        }).join('') : '<p style="padding:20px;color:var(--text-muted);font-size:.85rem;">Nenhum tópico nesta matéria.</p>';
        return `<article class="mapa-card"><div class="mapa-card-header" onclick="toggleMapaCard(${materia.id})"><div class="mapa-title-area"><div class="mapa-title">${materia.subject}</div><div class="mapa-progress-bg"><div class="mapa-progress-fill" style="width:${pct}%;background:${materia.color}"></div></div></div><span class="mapa-pct">${pct}%</span></div><div class="mapa-body open" id="mapa-body-${materia.id}">${linhas}</div></article>`;
    }).join('');
    document.getElementById('global-mapa-pct').textContent = total ? `${Math.round(completos / total * 100)}%` : '0%';
}

document.addEventListener('keydown', event => {
    if (event.key === 'Escape') document.querySelectorAll('.modal-overlay.active').forEach(modal => modal.classList.remove('active'));
});
document.querySelectorAll('.modal-overlay').forEach(overlay => overlay.addEventListener('mousedown', event => {
    if (event.target === overlay) overlay.classList.remove('active');
}));

// INICIALIZAÇÃO DO APP
fecharModalDeletar(); 
syncVisualModeControl();
syncSettingsUI();
registrarBonusLoginDiario();
updateDashboardStats(); 
mostrarFraseMotivacional();
executarResetTimer(); 
renderizarCiclo();
renderizarAgenda();
renderizarAgendamento();
renderizarRevisoes();
renderizarSimulados();
renderizarRedacoes();

// Dispara contagem do ENEM e atualiza a cada 1 hora em background
atualizarContagemEnem();
setInterval(atualizarContagemEnem, 3600000);

