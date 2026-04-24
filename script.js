// DADOS DO MAPA DE PROGRESSO (Atualizado com Incidência e Complexidade baseados no PDF)
const MAPA_PROGRESSO_DATA = [
    { id: 'mat', title: 'Matemática', color: '#007aff', topics: [
        { name: 'Fundamentos Básicos', inc: 'Alta', comp: 'Baixa' },
        { name: 'Frações e Porcentagem', inc: 'Alta', comp: 'Baixa' },
        { name: 'MMC e MDC', inc: 'Média', comp: 'Baixa' },
        { name: 'Potenciação e Radiciação', inc: 'Média', comp: 'Média' },
        { name: 'Razão, Proporção e Regra de 3', inc: 'Alta', comp: 'Baixa' },
        { name: 'Notação Científica e Escalas', inc: 'Alta', comp: 'Baixa' },
        { name: 'Estatística', inc: 'Alta', comp: 'Baixa' },
        { name: 'Geometria Plana', inc: 'Alta', comp: 'Média' },
        { name: 'Geometria Espacial', inc: 'Alta', comp: 'Alta' },
        { name: 'Geometria Analítica', inc: 'Média', comp: 'Alta' },
        { name: 'Análise Combinatória', inc: 'Alta', comp: 'Alta' },
        { name: 'Probabilidade', inc: 'Alta', comp: 'Alta' },
        { name: 'Função 1º e 2º Grau', inc: 'Alta', comp: 'Média' },
        { name: 'Função Exponencial e Logarítmica', inc: 'Média', comp: 'Alta' },
        { name: 'Trigonometria', inc: 'Média', comp: 'Média' },
        { name: 'Matrizes', inc: 'Baixa', comp: 'Baixa' }
    ] },
    { id: 'fis', title: 'Física', color: '#af52de', topics: [
        { name: 'Cinemática', inc: 'Alta', comp: 'Baixa' },
        { name: 'Dinâmica (Leis de Newton)', inc: 'Alta', comp: 'Média' },
        { name: 'Trabalho, Energia e Potência', inc: 'Alta', comp: 'Média' },
        { name: 'Estática e Equilíbrio', inc: 'Média', comp: 'Média' },
        { name: 'Gravitação', inc: 'Média', comp: 'Baixa' },
        { name: 'Hidrostática', inc: 'Média', comp: 'Média' },
        { name: 'Termologia e Calorimetria', inc: 'Alta', comp: 'Média' },
        { name: 'Gases e Termodinâmica', inc: 'Média', comp: 'Média' },
        { name: 'Ondulatória e Acústica', inc: 'Alta', comp: 'Baixa' },
        { name: 'Óptica Geométrica', inc: 'Média', comp: 'Média' },
        { name: 'Eletrostática', inc: 'Média', comp: 'Alta' },
        { name: 'Eletrodinâmica', inc: 'Alta', comp: 'Média' },
        { name: 'Magnetismo e Eletromagnetismo', inc: 'Média', comp: 'Alta' }
    ] },
    { id: 'qui', title: 'Química', color: '#ff9500', topics: [
        { name: 'Propriedades e Separação de Misturas', inc: 'Alta', comp: 'Baixa' },
        { name: 'Atomística e Tabela Periódica', inc: 'Média', comp: 'Baixa' },
        { name: 'Ligações Químicas e Polaridade', inc: 'Alta', comp: 'Baixa' },
        { name: 'Química Inorgânica', inc: 'Alta', comp: 'Média' },
        { name: 'Estequiometria e Leis Ponderais', inc: 'Alta', comp: 'Alta' },
        { name: 'Gases e Soluções', inc: 'Alta', comp: 'Média' },
        { name: 'Propriedades Coligativas', inc: 'Média', comp: 'Alta' },
        { name: 'Termoquímica', inc: 'Alta', comp: 'Média' },
        { name: 'Cinética Química', inc: 'Alta', comp: 'Baixa' },
        { name: 'Equilíbrio Químico', inc: 'Alta', comp: 'Alta' },
        { name: 'Eletroquímica e Oxirredução', inc: 'Alta', comp: 'Alta' },
        { name: 'Radioatividade', inc: 'Alta', comp: 'Baixa' },
        { name: 'Química Orgânica (Funções)', inc: 'Alta', comp: 'Baixa' },
        { name: 'Reações Orgânicas', inc: 'Média', comp: 'Alta' },
        { name: 'Química Ambiental', inc: 'Alta', comp: 'Baixa' }
    ] },
    { id: 'bio', title: 'Biologia', color: '#34c759', topics: [
        { name: 'Citologia e Moléculas da Vida', inc: 'Alta', comp: 'Baixa' },
        { name: 'Metabolismo Energético', inc: 'Alta', comp: 'Média' },
        { name: 'Biotecnologia', inc: 'Alta', comp: 'Média' },
        { name: 'Evolução (Darwinismo/Lamarckismo)', inc: 'Alta', comp: 'Baixa' },
        { name: 'Ecologia e Impactos Ambientais', inc: 'Alta', comp: 'Baixa' },
        { name: 'Fisiologia Humana', inc: 'Alta', comp: 'Média' },
        { name: 'Fisiomorfologia Comparada', inc: 'Média', comp: 'Média' },
        { name: 'Taxonomia e Reinos', inc: 'Baixa', comp: 'Baixa' },
        { name: 'Botânica', inc: 'Alta', comp: 'Média' },
        { name: 'Genética (Mendeliana e Molecular)', inc: 'Alta', comp: 'Média' },
        { name: 'Doenças e Parasitoses', inc: 'Alta', comp: 'Média' }
    ] },
    { id: 'lin', title: 'Linguagens', color: '#ff3b30', topics: [
        { name: 'Funções da Linguagem', inc: 'Alta', comp: 'Baixa' },
        { name: 'Figuras de Linguagem', inc: 'Alta', comp: 'Média' },
        { name: 'Gêneros e Tipologia Textual', inc: 'Alta', comp: 'Baixa' },
        { name: 'Organização Textual e Coesão', inc: 'Alta', comp: 'Média' },
        { name: 'Campanhas Publicitárias e Mídia', inc: 'Alta', comp: 'Baixa' },
        { name: 'Escolas Literárias', inc: 'Média', comp: 'Média' },
        { name: 'Lirismo e Poesia', inc: 'Média', comp: 'Alta' },
        { name: 'Arte e Crítica Social', inc: 'Média', comp: 'Média' }
    ] },
    { id: 'hum', title: 'Ciências Humanas', color: '#8e44ad', topics: [
        { name: 'História: Antiguidade e Idade Média', inc: 'Baixa', comp: 'Média' },
        { name: 'História: Idade Moderna e Expansão', inc: 'Média', comp: 'Média' },
        { name: 'História: Brasil Colônia e Império', inc: 'Alta', comp: 'Média' },
        { name: 'História: Idade Contemporânea', inc: 'Alta', comp: 'Média' },
        { name: 'História: Século XX (Guerras)', inc: 'Alta', comp: 'Alta' },
        { name: 'Geografia Física e Climatologia', inc: 'Alta', comp: 'Alta' },
        { name: 'Geografia: Hidrografia e Solos', inc: 'Média', comp: 'Média' },
        { name: 'Geopolítica e Geografia Econômica', inc: 'Alta', comp: 'Alta' },
        { name: 'Geografia Agrária e Urbana', inc: 'Alta', comp: 'Média' },
        { name: 'Filosofia Clássica e Moderna', inc: 'Alta', comp: 'Média' },
        { name: 'Sociologia Clássica e do Trabalho', inc: 'Alta', comp: 'Média' },
        { name: 'Sociologia Política e Cultura', inc: 'Alta', comp: 'Média' }
    ] },
    { id: 'red', title: 'Redação', color: '#e74c3c', topics: [
        { name: 'Estrutura Dissertativo-Argumentativa', inc: 'Obrigatório', comp: 'Baixa' },
        { name: 'Interpretação da Proposta', inc: 'Obrigatório', comp: 'Baixa' },
        { name: 'Planejamento Textual (Projeto)', inc: 'Obrigatório', comp: 'Média' },
        { name: 'Engenharia Argumentativa e Tese', inc: 'Obrigatório', comp: 'Alta' },
        { name: 'Coesão e Conectivos', inc: 'Obrigatório', comp: 'Média' },
        { name: 'Gramática e Normas Cultas', inc: 'Recomendado', comp: 'Alta' },
        { name: 'Repertório Sociocultural', inc: 'Obrigatório', comp: 'Média' },
        { name: 'Proposta de Intervenção', inc: 'Obrigatório', comp: 'Baixa' }
    ] }
];

let appData = JSON.parse(localStorage.getItem('qg_pedro_data')) || { 
    totalStudySeconds: 0, 
    weeklyChart: [0, 0, 0, 0, 0, 0, 0], 
    cycleItems: [], 
    historyItems: [], 
    agendaItems: [], 
    agendamentoItems: [],
    simuladosItems: [],
    redacaoItems: [],
    mapaProgressoState: {},
    dailyGoalMinutes: 240,
    lastWeekStart: '', 
    themeColor: '', 
    themeColorRgb: '', 
    darkMode: false 
};

if (!appData.mapaProgressoState) appData.mapaProgressoState = {};
MAPA_PROGRESSO_DATA.forEach(sub => {
    if(!appData.mapaProgressoState[sub.id]) appData.mapaProgressoState[sub.id] = {};
    sub.topics.forEach(top => {
        if(!appData.mapaProgressoState[sub.id][top.name]) {
            appData.mapaProgressoState[sub.id][top.name] = { t: false, p: false, d: false };
        }
    });
});

const getMonday = (d) => { const dt = new Date(d); const day = dt.getDay(); const diff = dt.getDate() - day + (day === 0 ? -6 : 1); return new Date(dt.setDate(diff)).toDateString(); };
if (appData.lastWeekStart !== getMonday(new Date())) {
    appData.weeklyChart = [0, 0, 0, 0, 0, 0, 0];
    appData.lastWeekStart = getMonday(new Date());
}

if (!appData.weeklyChart || appData.weeklyChart.length !== 7) appData.weeklyChart = [0, 0, 0, 0, 0, 0, 0];
if (!appData.historyItems) appData.historyItems = [];
if (!appData.agendaItems) appData.agendaItems = [];
if (!appData.agendamentoItems) appData.agendamentoItems = [];
if (!appData.simuladosItems) appData.simuladosItems = [];
if (!appData.redacaoItems) appData.redacaoItems = [];

if(appData.darkMode) document.documentElement.setAttribute('data-theme', 'dark');
if(appData.themeColor) { 
    document.documentElement.style.setProperty('--accent-color', appData.themeColor); 
    document.documentElement.style.setProperty('--accent-rgb', appData.themeColorRgb); 
}

function saveAppData() { 
    localStorage.setItem('qg_pedro_data', JSON.stringify(appData)); 
    updateDashboardStats(); 
}

function showSection(sectionId) {
    document.querySelectorAll('.content-section').forEach(s => s.classList.remove('active'));
    document.querySelectorAll('.menu-btn:not(.toggle-btn)').forEach(b => { 
        b.classList.remove('active'); 
        if(b.getAttribute('onclick')?.includes(sectionId)) b.classList.add('active'); 
    });
    document.getElementById(sectionId).classList.add('active');
    
    if(sectionId === 'historico') renderizarHistorico();
    if(sectionId === 'planejamento') renderizarCiclo();
    if(sectionId === 'mapa-progresso') renderizarMapaProgresso();
    if(sectionId === 'escola-provas') renderizarAgenda();
    if(sectionId === 'agendamento') renderizarAgendamento();
    if(sectionId === 'simulados') renderizarSimulados();
    if(sectionId === 'redacao') renderizarRedacoes();
}

function toggleSettings() { document.getElementById('settingsPanel').classList.toggle('active'); }

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
}

let itemToDelete = null, deleteType = '';

function fecharModal(id) { document.getElementById(id).classList.remove('active'); }

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
        showToast('🗑️ Sessão apagada e gráficos recalculados!'); 
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

function updateDashboardStats() {
    if(document.getElementById('top-time')) document.getElementById('top-time').textContent = formatShortTime(appData.totalStudySeconds);
    
    let totalAcertos = 0, totalErros = 0, totalQuestoes = 0;
    let topicosOk = 0, topicosTotal = 0;

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

    if (typeof MAPA_PROGRESSO_DATA !== 'undefined' && appData.mapaProgressoState) {
        MAPA_PROGRESSO_DATA.forEach(sub => {
            sub.topics.forEach(top => {
                topicosTotal++;
                const state = appData.mapaProgressoState[sub.id]?.[top.name];
                if (state && state.t && state.p && state.d) topicosOk++;
            });
        });
    }

    if(document.getElementById('top-acertos')) document.getElementById('top-acertos').textContent = `${totalAcertos} Acertos`;
    if(document.getElementById('top-erros')) document.getElementById('top-erros').textContent = `${totalErros} Erros`;
    if(document.getElementById('top-perc')) document.getElementById('top-perc').textContent = totalQuestoes > 0 ? `${Math.round((totalAcertos/totalQuestoes)*100)}%` : '0%';
    if(document.getElementById('top-topicos-ok')) document.getElementById('top-topicos-ok').textContent = `${topicosOk} Concluídos`;
    if(document.getElementById('top-topicos-pendentes')) document.getElementById('top-topicos-pendentes').textContent = `${topicosTotal - topicosOk} Pendentes`;
    if(document.getElementById('top-progresso-perc')) document.getElementById('top-progresso-perc').textContent = topicosTotal > 0 ? `${Math.round((topicosOk/topicosTotal)*100)}%` : '0%';

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
}

function renderStreak() {
    const streakRow = document.getElementById('streak-row');
    if(!streakRow) return;
    
    let html = '';
    let diasSeguidos = 0;
    let contandoStreak = true;

    for(let i = 29; i >= 0; i--) {
        let d = new Date();
        d.setDate(d.getDate() - i);
        let strData = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
        let estudou = appData.historyItems.some(h => h.dataChave === strData);
        
        if(estudou) {
            html += `<div class="streak-dot ok">✓</div>`;
            if(i === 0 || contandoStreak) diasSeguidos++;
        } else {
            html += `<div class="streak-dot fail">×</div>`;
            if(i === 0) contandoStreak = false; 
        }
    }
    
    streakRow.innerHTML = html;
    document.getElementById('constancia-texto').innerHTML = `Encontra-se com uma constância de <b>${diasSeguidos} dias</b> seguidos.`;
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
const alarmAudio = document.getElementById('alarmAudio'), stopAlarmBtn = document.getElementById('stopAlarmBtn'), timeDisplay = document.getElementById('timeDisplay'), playPauseBtn = document.getElementById('playPauseBtn'), progressRing = document.getElementById('progressRing'), circ = 628;
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
    
    appData.historyItems.push({ id: Date.now(), dataChave: `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`, diaNum: d.getDate().toString().padStart(2, '0'), mesAno: `${['JAN', 'FEV', 'MAR', 'ABR', 'MAI', 'JUN', 'JUL', 'AGO', 'SET', 'OUT', 'NOV', 'DEZ'][d.getMonth()]}/${d.getFullYear().toString().slice(-2)}`, diaStr: ['DOM', 'SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SÁB'][d.getDay()], materia: nome, assunto: '', tempoSegundos: segundos, cor: cor, tipo: tipo, comentario: '' });
    saveAppData(); renderizarCiclo(); if(document.getElementById('historico').classList.contains('active')) renderizarHistorico(); 
    showToast('✅ Sessão guardada no histórico!');
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
    document.getElementById('cycleModalTitle').textContent = "Adicionar Matéria"; 
    document.getElementById('cycleEditId').value = ""; 
    document.getElementById('cycleSubject').value = "";
    document.getElementById('cycleDuration').value = "60";
    document.getElementById('cycleDuration').disabled = false;
    document.getElementById('cycleLivreCheck').checked = false;
    const firstPreset = document.querySelector('.color-preset');
    if(firstPreset) firstPreset.click(); 
    document.getElementById('cycleModal').classList.add('active'); 
}

function editarMateriaCiclo(id) {
    const mat = appData.cycleItems.find(m => m.id === id);
    if (!mat) return;
    document.getElementById('cycleModalTitle').textContent = "Editar Matéria";
    document.getElementById('cycleEditId').value = mat.id;
    document.getElementById('cycleSubject').value = mat.subject;
    document.getElementById('cycleType').value = mat.type || 'Teórica';
    document.getElementById('cycleDuration').value = mat.targetMin > 0 ? mat.targetMin : 60;
    document.getElementById('cycleLivreCheck').checked = mat.targetMin <= 0;
    document.getElementById('cycleDuration').disabled = mat.targetMin <= 0;
    document.getElementById('cycleColor').value = mat.color;
    limparSelecaoPresets();
    document.getElementById('cycleModal').classList.add('active');
}

function salvarMateriaCiclo(e) {
    e.preventDefault(); 
    const idEdit = document.getElementById('cycleEditId').value;
    const color = document.getElementById('cycleColor').value;
    const subject = document.getElementById('cycleSubject').value;
    const type = document.getElementById('cycleType').value;
    const isLivre = document.getElementById('cycleLivreCheck').checked;
    const duration = isLivre ? 0 : (parseInt(document.getElementById('cycleDuration').value) || 0);
    
    if (idEdit) { 
        const idx = appData.cycleItems.findIndex(i => i.id == idEdit); 
        if (idx > -1) { 
            appData.cycleItems[idx] = { ...appData.cycleItems[idx], color, subject, type, targetMin: duration }; 
        } 
    } else { 
        appData.cycleItems.push({ id: Date.now(), color, subject, type, targetMin: duration, executedMin: 0, topicos: [], questoes: 0, acertos: 0, erros: 0 }); 
    }
    saveAppData(); renderizarCiclo(); fecharModal('cycleModal'); showToast('📚 Matéria guardada!');
}

function hoverDonut(sub, time, col) { const t = document.getElementById('cycleDonutTotal'); if(t) { t.textContent = time; t.style.color = col; } const l = document.getElementById('cycleDonutLabel'); if(l) l.textContent = sub; }

function resetDonutHover() { 
    const t = document.getElementById('cycleDonutTotal');
    const l = document.getElementById('cycleDonutLabel');
    if(!t || !l) return;
    const tot = appData.cycleItems.reduce((acc, c) => acc + c.targetMin, 0); 
    t.textContent = `${Math.floor(tot/60)}h ${tot%60}m`; 
    t.style.color = 'var(--text-main)'; 
    l.textContent = 'Total da Semana'; 
}

function ajustarMetaDiaria(valor) {
    appData.dailyGoalMinutes = parseInt(valor) || 240;
    saveAppData();
}

function renderizarCiclo() {
    atualizarSeletorDeMaterias();
    
    const grid = document.getElementById('disciplinasGrid');
    const totalMat = document.getElementById('cycleTotalMatters');
    const progText = document.getElementById('cycleProgressText');
    const progBar = document.getElementById('cycleProgressBar');
    const donutSvg = document.getElementById('cycleDonutSvg');
    const inputMeta = document.getElementById('inputMetaDiaria');

    if(!grid) return;
    if(inputMeta) inputMeta.value = appData.dailyGoalMinutes || 240;

    if(appData.cycleItems.length === 0) { 
        grid.innerHTML = '<div style="grid-column:1/-1;text-align:center;padding:40px;color:var(--text-muted);background:var(--card-bg);border-radius:16px;border:1px dashed var(--border-color);">Nenhuma matéria registada. Comece criando o seu ciclo.</div>'; 
        if(totalMat) totalMat.textContent = 0; 
        if(progText) progText.innerHTML = `<span>0m executados</span><span>0m meta</span>`; 
        if(progBar) progBar.style.width = `0%`; 
        resetDonutHover(); 
        if(donutSvg) donutSvg.innerHTML = ''; 
        return; 
    }
    
    let totalTar = 0, htmlGrid = '', svgHtml = '', offset = 0, circSvg = 2 * Math.PI * 100;
    appData.cycleItems.forEach(i => totalTar += i.targetMin);

    appData.cycleItems.forEach(i => {
        let exec = i.executedMin || 0; 
        let isLivre = i.targetMin <= 0;
        let pct = isLivre ? 100 : Math.min(100, (exec / i.targetMin) * 100);
        
        let txtExec = exec >= 60 ? `${Math.floor(exec/60)}h${Math.floor(exec%60).toString().padStart(2,'0')}m` : `${Math.floor(exec%60)}m`;
        let txtTar = isLivre ? 'Livre' : (i.targetMin >= 60 ? `${Math.floor(i.targetMin/60)}h${(i.targetMin%60).toString().padStart(2,'0')}m` : `${i.targetMin%60}m`);
        let concluidos = i.topicos ? i.topicos.filter(t => t.concluido).length : 0, totalTopicos = i.topicos ? i.topicos.length : 0;

        htmlGrid += `<div class="disc-card" style="border-left-color: ${i.color}; cursor: pointer;" onclick="abrirModalAssuntos(${i.id})"><div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 20px;"><div><div class="disc-title" style="margin-bottom: 2px;">${i.subject}</div><span style="font-size: 0.75rem; color: var(--text-muted); font-weight: 600;">${i.type || 'Teórica'} • Semanal: ${txtTar}</span></div><div style="display: flex; gap: 12px;"><i onclick="event.stopPropagation(); editarMateriaCiclo(${i.id})" style="cursor: pointer; opacity: 0.4; font-style: normal; font-size: 1.1rem;" onmouseover="this.style.opacity='1'" onmouseout="this.style.opacity='0.4'" title="Editar Matéria">✏️</i><i onclick="event.stopPropagation(); abrirModalDeletar('cycle', ${i.id}, 'Apagar Matéria?', 'Isto vai excluir a matéria e tópicos.')" style="cursor: pointer; opacity: 0.4; font-style: normal; font-size: 1.1rem;" onmouseover="this.style.opacity='1'" onmouseout="this.style.opacity='0.4'" title="Apagar Matéria">🗑️</i></div></div><div class="cycle-progress-bg" style="height: 4px; margin-bottom: 15px; border-radius: 2px;"><div class="cycle-progress-fill" style="width: ${pct}%; background: ${isLivre ? 'var(--text-muted)' : i.color}; opacity: ${isLivre ? 0.3 : 1}; border-radius: 2px;"></div></div><div class="disc-stats-row"><div class="ds-box"><span class="ds-val">${concluidos}/${totalTopicos}</span><span class="ds-lbl">Tópicos</span></div><div class="ds-box"><span class="ds-val" style="color: ${i.color};">${txtExec}</span><span class="ds-lbl">Tempo Real</span></div><div class="ds-box"><span class="ds-val">${(i.acertos||0)+(i.erros||0)}</span><span class="ds-lbl">Questões</span></div></div></div>`;
        
        if(!isLivre) {
            let slice = totalTar > 0 ? (i.targetMin / totalTar) * circSvg : 0;
            svgHtml += `<circle class="donut-slice" cx="140" cy="140" r="100" fill="transparent" stroke="${i.color}" stroke-width="40" stroke-dasharray="${slice} ${circSvg}" stroke-dashoffset="${-offset}" onmouseenter="hoverDonut('${i.subject}', '${txtTar}', '${i.color}')" onmouseleave="resetDonutHover()"></circle>`;
            offset += slice;
        }
    });
    
    grid.innerHTML = htmlGrid; 
    if(donutSvg) donutSvg.innerHTML = svgHtml;
    if(totalMat) totalMat.textContent = appData.cycleItems.length;

    const d = new Date();
    const hojeStr = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
    let execHojeSegundos = appData.historyItems.reduce((acc, h) => h.dataChave === hojeStr ? acc + h.tempoSegundos : acc, 0);
    
    let execHojeMin = Math.floor(execHojeSegundos / 60);
    let metaConfig = appData.dailyGoalMinutes || 240; 
    let pctDiario = Math.min(100, (execHojeMin / metaConfig) * 100);
    let txtExecHoje = execHojeMin >= 60 ? `${Math.floor(execHojeMin/60)}h ${Math.floor(execHojeMin%60).toString().padStart(2,'0')}m` : `${execHojeMin}m`;

    if(progText) progText.innerHTML = `<span><b style="color:var(--text-main);">${txtExecHoje}</b> estudados hoje</span><span>${metaConfig}m alvo</span>`;
    if(progBar) progBar.style.width = `${pctDiario}%`; 
    
    resetDonutHover();
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
        const isConcluido = !appData.cycleItems[idx].topicos[tIdx].concluido;
        appData.cycleItems[idx].topicos[tIdx].concluido = isConcluido; 
        
        if(isConcluido) {
            const hoje = new Date();
            const d7 = new Date(hoje); d7.setDate(hoje.getDate() + 7);
            const d30 = new Date(hoje); d30.setDate(hoje.getDate() + 30);
            
            const topNome = appData.cycleItems[idx].topicos[tIdx].nome;
            const matNome = appData.cycleItems[idx].subject;
            
            appData.agendaItems.push({ id: Date.now(), title: `Revisão 7d: ${topNome}`, subject: matNome, type: 'Revisão', date: d7.toISOString().split('T')[0], description: 'Revisão espaçada automática gerada pelo sistema.', completed: false });
            appData.agendaItems.push({ id: Date.now()+1, title: `Revisão 30d: ${topNome}`, subject: matNome, type: 'Revisão', date: d30.toISOString().split('T')[0], description: 'Revisão espaçada automática gerada pelo sistema.', completed: false });
            
            showToast('🧠 Revisões de 7 e 30 dias inseridas no Radar!');
        }
        
        saveAppData(); renderizarListaAssuntos(id); renderizarCiclo(); renderizarAgenda();
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

// ==========================================
// MAPA DE PROGRESSO COMPETITIVO
// ==========================================
function getBadgeStyle(type, level) {
    if(type === 'inc') {
        if(level === 'Alta' || level === 'Obrigatório') return 'background: rgba(255, 59, 48, 0.15); color: #ff3b30; border: 1px solid rgba(255, 59, 48, 0.3);';
        if(level === 'Média') return 'background: rgba(255, 149, 0, 0.15); color: #ff9500; border: 1px solid rgba(255, 149, 0, 0.3);';
        return 'background: rgba(142, 142, 147, 0.15); color: #8e8e93; border: 1px solid rgba(142, 142, 147, 0.3);';
    } else {
        if(level === 'Alta') return 'background: rgba(142, 68, 173, 0.15); color: #8e44ad; border: 1px solid rgba(142, 68, 173, 0.3);';
        if(level === 'Média') return 'background: rgba(0, 122, 255, 0.15); color: #007aff; border: 1px solid rgba(0, 122, 255, 0.3);';
        return 'background: rgba(52, 199, 89, 0.15); color: #34c759; border: 1px solid rgba(52, 199, 89, 0.3);';
    }
}

function renderizarMapaProgresso() {
    const container = document.getElementById('mapaContainer');
    const globalPct = document.getElementById('global-mapa-pct');
    if(!container) return;

    let totalCheckboxes = 0;
    let checkedCheckboxes = 0;
    let html = '';

    MAPA_PROGRESSO_DATA.forEach(sub => {
        let subTotal = sub.topics.length * 3;
        let subChecked = 0;
        let topicsHtml = '';

        sub.topics.forEach(top => {
            const state = appData.mapaProgressoState[sub.id][top.name];
            if(state.t) { subChecked++; checkedCheckboxes++; }
            if(state.p) { subChecked++; checkedCheckboxes++; }
            if(state.d) { subChecked++; checkedCheckboxes++; }
            totalCheckboxes += 3;

            topicsHtml += `
            <div class="mapa-topic-row" style="align-items: flex-start; flex-direction: column; gap: 10px;">
                <div style="display: flex; justify-content: space-between; width: 100%; align-items: center;">
                    <div style="display: flex; flex-direction: column; gap: 6px; flex: 1; padding-right: 15px;">
                        <div class="mapa-topic-name" style="padding: 0; border: none; font-size: 0.9rem;">${top.name}</div>
                        <div style="display: flex; gap: 8px; flex-wrap: wrap;">
                            <span style="font-size: 0.65rem; font-weight: 800; padding: 3px 8px; border-radius: 6px; ${getBadgeStyle('inc', top.inc)}">🎯 INCIDÊNCIA: ${top.inc.toUpperCase()}</span>
                            <span style="font-size: 0.65rem; font-weight: 800; padding: 3px 8px; border-radius: 6px; ${getBadgeStyle('comp', top.comp)}">🧠 COMPLEXIDADE: ${top.comp.toUpperCase()}</span>
                        </div>
                    </div>
                    <div class="mapa-tpd-group">
                        <button class="tpd-btn ${state.t ? 'active' : ''}" style="${state.t ? `background:${sub.color};` : ''}" onclick="toggleMapaItem('${sub.id}', '${top.name}', 't', event)" title="Teoria">T</button>
                        <button class="tpd-btn ${state.p ? 'active' : ''}" style="${state.p ? `background:${sub.color};` : ''}" onclick="toggleMapaItem('${sub.id}', '${top.name}', 'p', event)" title="Prática">P</button>
                        <button class="tpd-btn ${state.d ? 'active' : ''}" style="${state.d ? `background:${sub.color};` : ''}" onclick="toggleMapaItem('${sub.id}', '${top.name}', 'd', event)" title="Domínio (Revisão)">D</button>
                    </div>
                </div>
            </div>`;
        });

        let subPct = Math.round((subChecked / subTotal) * 100);

        html += `
        <div class="mapa-card">
            <div class="mapa-card-header" onclick="toggleMapaAccordion('${sub.id}')">
                <div class="mapa-title-area">
                    <div class="mapa-title" style="color: ${sub.color};">${sub.title}</div>
                    <div class="mapa-progress-bg"><div class="mapa-progress-fill" style="width: ${subPct}%; background: ${sub.color};"></div></div>
                </div>
                <div class="mapa-pct">${subPct}%</div>
            </div>
            <div class="mapa-body" id="mapa-body-${sub.id}">
                ${topicsHtml}
            </div>
        </div>`;
    });

    container.innerHTML = html;
    
    let globalPercentage = totalCheckboxes === 0 ? 0 : Math.round((checkedCheckboxes / totalCheckboxes) * 100);
    if(globalPct) globalPct.textContent = `${globalPercentage}%`;
}

function toggleMapaAccordion(id) {
    const body = document.getElementById(`mapa-body-${id}`);
    if(body) {
        const isOpen = body.classList.contains('open');
        document.querySelectorAll('.mapa-body').forEach(b => b.classList.remove('open'));
        if (!isOpen) {
            body.classList.add('open');
        }
    }
}

function toggleMapaItem(subId, topicName, type, e) {
    e.stopPropagation();
    appData.mapaProgressoState[subId][topicName][type] = !appData.mapaProgressoState[subId][topicName][type];
    saveAppData();
    
    const body = document.getElementById(`mapa-body-${subId}`);
    const scrollPos = body ? body.scrollTop : 0;
    
    renderizarMapaProgresso();
    
    const newBody = document.getElementById(`mapa-body-${subId}`);
    if(newBody) {
        newBody.classList.add('open');
        newBody.scrollTop = scrollPos;
    }
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
        document.getElementById('agendamentoTypeInput').value = item.type;
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

// ==========================================
// 9. SIMULADOS ENEM E REDAÇÃO
// ==========================================
function abrirModalSimulado() {
    document.getElementById('formAddSimulado').reset();
    document.getElementById('simEditId').value = "";
    document.getElementById('simArea').value = "Linguagens, Códigos e suas Tecnologias";
    document.getElementById('simFileName').textContent = "Selecionar Arquivo do Computador";
    document.getElementById('simAttachmentData').value = "";
    document.getElementById('simuladoModalTitle').textContent = "Registar Simulado";
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
    const title = document.getElementById('simTitle').value;
    const date = document.getElementById('simDate').value;
    const tempoMin = parseInt(document.getElementById('simTempo').value) || 0;
    const area = document.getElementById('simArea').value;
    const total = parseInt(document.getElementById('simTotal').value) || 1;
    const acertos = parseInt(document.getElementById('simAcertos').value) || 0;
    const erros = parseInt(document.getElementById('simErros').value) || 0;
    const attachment = document.getElementById('simAttachmentData').value;

    if (idEdit) {
        const idx = appData.simuladosItems.findIndex(i => i.id == idEdit);
        if (idx > -1) appData.simuladosItems[idx] = { ...appData.simuladosItems[idx], title, date, tempoMin, area, total, acertos, erros, attachment };
    } else {
        appData.simuladosItems.push({ id: Date.now(), title, date, tempoMin, area, total, acertos, erros, attachment });
    }
    saveAppData(); renderizarSimulados(); fecharModal('simuladoModal'); showToast('🎯 Simulado registado!');
}

function renderizarSimulados() {
    const list = document.getElementById('listaSimulados');
    if (!list) return;

    if (!appData.simuladosItems || appData.simuladosItems.length === 0) {
        document.getElementById('sim-media-acertos').textContent = "0%";
        document.getElementById('sim-tempo-questao').textContent = "0m 00s";
        document.getElementById('sim-ponto-forte').textContent = "-";
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
        let maxPerc = -1, pontoForte = "-";
        for (let key in areasMap) { if((areasMap[key].acertos / areasMap[key].total) > maxPerc) { maxPerc = areasMap[key].acertos / areasMap[key].total; pontoForte = key.split(',')[0].split(' e ')[0]; } }
        document.getElementById('sim-ponto-forte').textContent = pontoForte;
    }
}

function abrirModalRedacao() {
    document.getElementById('formAddRedacao').reset();
    document.getElementById('redEditId').value = "";
    document.getElementById('redFileName').textContent = "Selecionar Arquivo do Computador";
    document.getElementById('redAttachmentData').value = "";
    document.getElementById('redacaoModalTitle').textContent = "Registar Redação";
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

fecharModalDeletar(); 
updateDashboardStats(); 
executarResetTimer(); 
renderizarCiclo();
renderizarMapaProgresso();
renderizarAgenda();
renderizarAgendamento();
renderizarSimulados();
renderizarRedacoes();