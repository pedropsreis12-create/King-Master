/* IA do QG: Gemini interpreta a conversa e estas funções executam ações seguras no King Master. */
const estadoIaQg = { pendente: null, ouvindo: false, geminiAtivo: false };

const CORES_IA = {
    azul: ['#007aff', '0, 122, 255'], verde: ['#34c759', '52, 199, 89'],
    laranja: ['#ff9500', '255, 149, 0'], roxo: ['#af52de', '175, 82, 222'],
    vermelho: ['#ff3b30', '255, 59, 48'], amarelo: ['#f4c542', '244, 197, 66'],
    rosa: ['#ff4f9a', '255, 79, 154'], ciano: ['#18b9c9', '24, 185, 201']
};

const ROTAS_IA = {
    painel: 'dashboard', inicio: 'dashboard', cronometro: 'dashboard',
    materias: 'planejamento', materia: 'planejamento', hub: 'planejamento',
    agenda: 'agendamento', agendamento: 'agendamento', calendario: 'agendamento',
    revisoes: 'revisoes', revisao: 'revisoes', simulados: 'simulados', simulado: 'simulados',
    redacoes: 'redacao', redacao: 'redacao', historico: 'historico', perfil: 'perfil'
};

function normalizarIa(texto = '') {
    return String(texto).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('pt-BR').replace(/\s+/g, ' ').trim();
}

function limparTextoIa(texto = '', limite = 100) {
    return String(texto).replace(/[<>{}\[\]]/g, '').replace(/^\s*["“”']|["“”']\s*$/g, '').replace(/[.!?]+$/g, '').replace(/\s+/g, ' ').trim().slice(0, limite);
}

function garantirMemoriaIa() {
    if (!Array.isArray(appData.aiConversation)) appData.aiConversation = [];
    appData.aiConversation = appData.aiConversation.filter(item => item && ['user', 'assistant'].includes(item.role) && typeof item.text === 'string').slice(-36);
}

function horarioMensagemIa(timestamp) {
    return new Date(timestamp || Date.now()).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

function criarMensagemVisualIa(role, text, timestamp, comConfirmacao = false) {
    const artigo = document.createElement('article');
    artigo.className = `ai-qg-message ${role}`;
    const paragrafo = document.createElement('p');
    paragrafo.textContent = text;
    const hora = document.createElement('small');
    hora.textContent = role === 'assistant' ? `IA do QG • ${horarioMensagemIa(timestamp)}` : `Você • ${horarioMensagemIa(timestamp)}`;
    artigo.append(paragrafo, hora);
    if (comConfirmacao) {
        const acoes = document.createElement('div');
        acoes.className = 'ai-qg-message-action';
        const cancelar = document.createElement('button');
        cancelar.type = 'button'; cancelar.textContent = 'Cancelar'; cancelar.onclick = () => confirmarAcaoIa(false);
        const confirmar = document.createElement('button');
        confirmar.type = 'button'; confirmar.className = 'danger'; confirmar.textContent = 'Confirmar exclusão'; confirmar.onclick = () => confirmarAcaoIa(true);
        acoes.append(cancelar, confirmar);
        artigo.appendChild(acoes);
    }
    return artigo;
}

function renderizarConversaIa() {
    garantirMemoriaIa();
    const container = document.getElementById('aiQgMessages');
    if (!container) return;
    container.innerHTML = '';
    const mensagens = appData.aiConversation.length ? appData.aiConversation : [{
        role: 'assistant',
        text: `Olá, ${appData.profileName || 'comandante'}. Sou a inteligência do seu QG. Posso conversar, analisar seus estudos e executar várias ações em um único pedido.`,
        timestamp: Date.now()
    }];
    mensagens.forEach((mensagem, indice) => {
        const ultima = indice === mensagens.length - 1;
        container.appendChild(criarMensagemVisualIa(mensagem.role, mensagem.text, mensagem.timestamp, ultima && mensagem.role === 'assistant' && Boolean(estadoIaQg.pendente)));
    });
    requestAnimationFrame(() => { container.scrollTop = container.scrollHeight; });
}

function registrarMensagemIa(role, text) {
    garantirMemoriaIa();
    appData.aiConversation.push({ role, text: String(text).slice(0, 1200), timestamp: Date.now() });
    appData.aiConversation = appData.aiConversation.slice(-36);
    renderizarConversaIa();
}

function toggleIaQg(forcar) {
    const painel = document.getElementById('aiQgPanel');
    const fundo = document.getElementById('aiQgBackdrop');
    const lancador = document.getElementById('aiQgLauncher');
    if (!painel || !fundo || !lancador) return;
    const abrir = typeof forcar === 'boolean' ? forcar : !painel.classList.contains('open');
    painel.classList.toggle('open', abrir);
    fundo.classList.toggle('open', abrir);
    painel.setAttribute('aria-hidden', String(!abrir));
    lancador.setAttribute('aria-expanded', String(abrir));
    if (abrir) {
        renderizarConversaIa();
        setTimeout(() => document.getElementById('aiQgInput')?.focus(), 180);
    }
}

function atalhoEnviarIa(event) {
    if (event.key === 'Enter' && !event.shiftKey) {
        event.preventDefault();
        document.getElementById('aiQgForm')?.requestSubmit();
    }
}

function usarSugestaoIa(texto) {
    toggleIaQg(true);
    const input = document.getElementById('aiQgInput');
    if (input) input.value = texto;
    processarEntradaIa(texto);
}

function mostrarPensamentoIa(visivel) {
    const elemento = document.getElementById('aiQgThinking');
    if (elemento) elemento.hidden = !visivel;
}

function enviarMensagemIa(event) {
    event.preventDefault();
    const input = document.getElementById('aiQgInput');
    const texto = input?.value.trim() || '';
    if (!texto) return;
    input.value = '';
    processarEntradaIa(texto);
}

async function processarEntradaIa(texto) {
    const comando = String(texto).trim().slice(0, 500);
    if (!comando) return;
    registrarMensagemIa('user', comando);
    mostrarPensamentoIa(true);
    await new Promise(resolve => setTimeout(resolve, 180));
    let resultado;
    if (window.kingGemini?.available) {
        try {
            resultado = await Promise.race([
                window.kingGemini.send(comando, contextoGeminiIa()),
                new Promise((_, reject) => setTimeout(() => reject(new Error('O Gemini demorou mais que 25 segundos para responder.')), 25000))
            ]);
            estadoIaQg.geminiAtivo = true;
        } catch (error) {
            console.warn('Gemini indisponível; usando o modo local seguro.', error);
            resultado = interpretarComandoIa(comando);
            resultado.text = `${resultado.text}\n\nO Gemini está temporariamente indisponível; concluí pelo modo local do QG.`;
        }
    } else {
        resultado = interpretarComandoIa(comando);
    }
    mostrarPensamentoIa(false);
    registrarMensagemIa('assistant', resultado.text);
    const ultimaAcao = Array.isArray(resultado.actions) ? [...resultado.actions].reverse().find(item => item?.section || item?.toast) : null;
    if (resultado.section || ultimaAcao?.section) showSection(resultado.section || ultimaAcao.section);
    saveAppData();
    if (resultado.toast || ultimaAcao?.toast) showToast(resultado.toast || ultimaAcao.toast, resultado.error === true);
}

function contextoGeminiIa() {
    const gamificacao = calcularGamificacao();
    return {
        agora: new Date().toISOString(),
        usuario: { nome: appData.profileName || 'Pedro', bio: appData.profileBio || '' },
        progresso: {
            nivel: gamificacao.nivel,
            xp: gamificacao.xpTotal,
            sequenciaDias: gamificacao.sequencia,
            minutosEstudados: Math.round((appData.totalStudySeconds || 0) / 60),
            metaDiariaMinutos: appData.dailyGoalMinutes || 60
        },
        materias: appData.cycleItems.map(item => ({
            nome: item.subject,
            tipo: item.type,
            minutos: item.executedMin || 0,
            acertos: item.acertos || 0,
            erros: item.erros || 0,
            topicos: (item.topicos || []).map(topico => ({ nome: topico.nome, concluido: Boolean(topico.concluido) }))
        })),
        revisoesPendentes: appData.revisoesItems.filter(item => item.status !== 'revisado').slice(0, 20).map(item => ({ assunto: item.assunto, data: item.dataAlvo })),
        agendamentos: appData.agendamentoItems.filter(item => !item.completed).slice(0, 20).map(item => ({ titulo: item.title, data: item.date, hora: item.time })),
        visual: { modo: appData.visualMode || 'classic', carreira: appData.rankVisualMode || 'aura' }
    };
}

function resultadoFerramentaIa(message, extra = {}) {
    return { ok: true, message, ...extra };
}

function executarFerramentaGeminiIa(nome, args = {}) {
    const texto = chave => limparTextoIa(args?.[chave] ?? '', chave === 'bio' ? 190 : 100);
    if (nome === 'consultar_progresso') return resultadoFerramentaIa(resumoProgressoIa(), { summary: resumoProgressoIa(), recommendation: recomendacaoEstudoIa(), section: 'perfil' });
    if (nome === 'listar_materias') return resultadoFerramentaIa(appData.cycleItems.length ? `Matérias: ${appData.cycleItems.map(item => item.subject).join(', ')}.` : 'Nenhuma matéria cadastrada.', { subjects: contextoGeminiIa().materias });

    if (nome === 'adicionar_materia') {
        const subject = texto('nome');
        if (subject.length < 2) return { ok: false, message: 'O nome da matéria é inválido.' };
        const existente = encontrarMateriaIa(subject);
        if (existente && normalizarIa(existente.subject) === normalizarIa(subject)) return { ok: false, message: `A matéria ${existente.subject} já existe.` };
        const tipo = ['Teórica', 'Prática', 'Teórica e Prática', 'Revisão', 'Livre'].includes(args.tipo) ? args.tipo : 'Teórica';
        appData.cycleItems.push({ id: Date.now() + Math.floor(Math.random() * 1000), color: /^#[0-9a-f]{6}$/i.test(args.cor || '') ? args.cor : '#007aff', subject, type: tipo, targetMin: 0, executedMin: 0, topicos: [], questoes: 0, acertos: 0, erros: 0 });
        renderizarCiclo(); renderizarRevisoes();
        return resultadoFerramentaIa(`Matéria ${subject} adicionada.`, { section: 'planejamento', toast: '✓ Matéria criada pelo Gemini' });
    }

    if (nome === 'adicionar_topico') {
        const materia = encontrarMateriaIa(texto('materia'));
        const topicoNome = texto('topico');
        if (!materia) return { ok: false, message: 'Matéria não encontrada.' };
        if (!topicoNome) return { ok: false, message: 'Tópico inválido.' };
        if ((materia.topicos || []).some(item => normalizarIa(item.nome) === normalizarIa(topicoNome))) return { ok: false, message: `O tópico ${topicoNome} já existe em ${materia.subject}.` };
        if (!Array.isArray(materia.topicos)) materia.topicos = [];
        materia.topicos.push({ nome: topicoNome, concluido: false }); renderizarCiclo();
        return resultadoFerramentaIa(`Tópico ${topicoNome} adicionado em ${materia.subject}.`, { section: 'planejamento', toast: '✓ Tópico criado pelo Gemini' });
    }

    if (nome === 'concluir_topico') {
        const materia = encontrarMateriaIa(texto('materia'));
        if (!materia) return { ok: false, message: 'Matéria não encontrada.' };
        const alvo = normalizarIa(texto('topico'));
        const topico = (materia.topicos || []).find(item => normalizarIa(item.nome) === alvo || normalizarIa(item.nome).includes(alvo));
        if (!topico) return { ok: false, message: 'Tópico não encontrado.' };
        topico.concluido = true; renderizarCiclo();
        return resultadoFerramentaIa(`Tópico ${topico.nome} concluído em ${materia.subject}.`, { section: 'planejamento', toast: '✓ Tópico concluído' });
    }

    if (nome === 'agendar_estudo') {
        const materia = encontrarMateriaIa(texto('materia'));
        const subject = materia?.subject || texto('materia');
        const date = /^\d{4}-\d{2}-\d{2}$/.test(args.data || '') ? args.data : dataDoComandoIa(args.data || 'amanhã');
        const time = /^([01]\d|2[0-3]):[0-5]\d$/.test(args.hora || '') ? args.hora : '18:00';
        appData.agendamentoItems.push({ id: Date.now() + Math.floor(Math.random() * 1000), title: texto('titulo') || `Estudar ${subject}`, date, time, type: 'Estudo', description: texto('descricao') || 'Planejado pelo Gemini do QG', completed: false });
        renderizarAgendamento();
        return resultadoFerramentaIa(`${subject} agendada para ${dataBonitaIa(date)} às ${time}.`, { section: 'agendamento', toast: '✓ Estudo agendado pelo Gemini' });
    }

    if (nome === 'criar_revisao') {
        const materia = encontrarMateriaIa(texto('materia'));
        if (!materia) return { ok: false, message: 'Matéria não encontrada.' };
        const assunto = texto('assunto');
        const dataAlvo = /^\d{4}-\d{2}-\d{2}$/.test(args.data || '') ? args.data : dataDoComandoIa(args.data || 'amanhã');
        appData.revisoesItems.push({ id: Date.now() + Math.floor(Math.random() * 1000), materia: String(materia.id), assunto, dataEstudo: '', dataAlvo, origem: 'gemini-qg', tags: [], atualizadoEm: Date.now(), status: 'pendente', criadoEm: Date.now() });
        renderizarRevisoes();
        return resultadoFerramentaIa(`Revisão de ${assunto} criada em ${materia.subject} para ${dataBonitaIa(dataAlvo)}.`, { section: 'revisoes', toast: '✓ Revisão criada pelo Gemini' });
    }

    if (nome === 'preparar_cronometro') {
        const materia = encontrarMateriaIa(texto('materia'));
        if (!materia) return { ok: false, message: 'Matéria não encontrada.' };
        const minutos = Math.max(1, Math.min(600, Number(args.minutos) || 25));
        setMode('estudo');
        document.getElementById('inputHours').value = Math.floor(minutos / 60);
        document.getElementById('inputMinutes').value = minutos % 60;
        document.getElementById('inputSeconds').value = 0;
        atualizarSeletorDeMaterias(); document.getElementById('activeSubjectSelect').value = materia.id; sincronizarTempo();
        return resultadoFerramentaIa(`Cronômetro de ${minutos} minutos preparado para ${materia.subject}.`, { section: 'dashboard', toast: '▶ Sessão preparada pelo Gemini' });
    }

    if (nome === 'definir_meta_diaria') {
        const minutos = Math.max(5, Math.min(1440, Number(args.minutos) || 60)); appData.dailyGoalMinutes = minutos;
        return resultadoFerramentaIa(`Meta diária alterada para ${minutos} minutos.`, { toast: '✓ Meta diária atualizada' });
    }

    if (nome === 'atualizar_perfil') {
        if (args.nome) appData.profileName = limparTextoIa(args.nome, 32);
        if (typeof args.bio === 'string') appData.profileBio = limparTextoIa(args.bio, 190);
        aplicarIdentidadePerfil();
        return resultadoFerramentaIa('Perfil atualizado.', { section: 'perfil', toast: '✓ Perfil atualizado pelo Gemini' });
    }

    if (nome === 'alterar_visual') {
        if (['classic', 'futuristic'].includes(args.visual)) { appData.visualMode = args.visual; document.documentElement.dataset.visual = args.visual; syncVisualModeControl(); }
        if (['aura', 'militar'].includes(args.carreira)) { appData.rankVisualMode = args.carreira; sincronizarModoPatente(); renderizarAtalhosXpTeste(); renderGamificacao(true); }
        const cor = normalizarIa(args.cor || '');
        if (CORES_IA[cor]) { appData.themeColor = CORES_IA[cor][0]; appData.themeColorRgb = CORES_IA[cor][1]; document.documentElement.style.setProperty('--accent-color', CORES_IA[cor][0]); document.documentElement.style.setProperty('--accent-rgb', CORES_IA[cor][1]); syncSettingsUI(); }
        return resultadoFerramentaIa('Visual do King Master atualizado.', { section: 'perfil', toast: '✦ Visual atualizado pelo Gemini' });
    }

    if (nome === 'abrir_area') {
        const chave = normalizarIa(args.area || 'painel');
        const rota = ROTAS_IA[chave] || Object.entries(ROTAS_IA).find(([apelido]) => chave.includes(apelido))?.[1] || 'dashboard';
        return resultadoFerramentaIa(`Área ${args.area || 'Painel'} aberta.`, { section: rota });
    }

    if (nome === 'solicitar_exclusao_materia') {
        const materia = encontrarMateriaIa(texto('materia'));
        if (!materia) return { ok: false, message: 'Matéria não encontrada.' };
        estadoIaQg.pendente = { type: 'delete-subject', id: materia.id, label: materia.subject };
        return resultadoFerramentaIa(`A exclusão de ${materia.subject} aguarda confirmação explícita do usuário.`, { requiresConfirmation: true });
    }

    return { ok: false, message: `Ferramenta desconhecida: ${nome}.` };
}

window.KingMasterAI = {
    getContext: contextoGeminiIa,
    executeTool: executarFerramentaGeminiIa
};

function encontrarMateriaIa(termo) {
    const alvo = normalizarIa(limparTextoIa(termo, 80).replace(/^(a|o|de)\s+/, ''));
    if (!alvo) return null;
    return appData.cycleItems.find(item => normalizarIa(item.subject) === alvo)
        || appData.cycleItems.find(item => normalizarIa(item.subject).includes(alvo) || alvo.includes(normalizarIa(item.subject)));
}

function corDoComandoIa(comando, fallback = '#007aff') {
    const normal = normalizarIa(comando);
    const nome = Object.keys(CORES_IA).find(cor => new RegExp(`\\b${cor}\\b`).test(normal));
    return nome ? CORES_IA[nome][0] : fallback;
}

function tipoDoComandoIa(comando) {
    const normal = normalizarIa(comando);
    if (normal.includes('teorica e pratica') || normal.includes('mista')) return 'Teórica e Prática';
    if (normal.includes('pratica')) return 'Prática';
    if (normal.includes('revisao')) return 'Revisão';
    if (normal.includes('livre')) return 'Livre';
    return 'Teórica';
}

function dataDoComandoIa(texto = '') {
    const normal = normalizarIa(texto);
    const data = new Date();
    data.setHours(12, 0, 0, 0);
    if (normal.includes('depois de amanha')) data.setDate(data.getDate() + 2);
    else if (normal.includes('amanha')) data.setDate(data.getDate() + 1);
    else if (!normal.includes('hoje')) {
        const encontrada = texto.match(/\b(\d{1,2})[\/-](\d{1,2})(?:[\/-](\d{2,4}))?\b/);
        if (encontrada) {
            let ano = encontrada[3] ? Number(encontrada[3]) : data.getFullYear();
            if (ano < 100) ano += 2000;
            data.setFullYear(ano, Number(encontrada[2]) - 1, Number(encontrada[1]));
        } else {
            const dias = { domingo: 0, segunda: 1, terca: 2, quarta: 3, quinta: 4, sexta: 5, sabado: 6 };
            const diaNome = Object.keys(dias).find(nome => normal.includes(nome));
            if (diaNome) {
                let diferenca = (dias[diaNome] - data.getDay() + 7) % 7;
                if (diferenca === 0) diferenca = 7;
                data.setDate(data.getDate() + diferenca);
            }
        }
    }
    return dataLocalISO(data);
}

function dataBonitaIa(iso) {
    return new Date(`${iso}T12:00:00`).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long' });
}

function extrairHoraIa(texto) {
    const encontrada = texto.match(/(?:às|as|pelas?)\s*(\d{1,2})(?::(\d{2}))?\s*(?:h|horas?)?/i);
    if (!encontrada) return '18:00';
    const hora = Math.max(0, Math.min(23, Number(encontrada[1])));
    const minuto = Math.max(0, Math.min(59, Number(encontrada[2] || 0)));
    return `${String(hora).padStart(2, '0')}:${String(minuto).padStart(2, '0')}`;
}

function resumoProgressoIa() {
    const dados = calcularGamificacao();
    const totalMin = Math.round((appData.totalStudySeconds || 0) / 60);
    const questoes = appData.cycleItems.reduce((soma, item) => soma + (item.acertos || 0) + (item.erros || 0), 0);
    const acertos = appData.cycleItems.reduce((soma, item) => soma + (item.acertos || 0), 0);
    const taxa = questoes ? Math.round(acertos / questoes * 100) : 0;
    const pendentes = appData.revisoesItems.filter(item => item.status !== 'revisado').length;
    return `Você está no nível ${dados.nivel}, com ${formatarNumero(dados.xpTotal)} XP e sequência de ${dados.sequencia} dia(s). Já acumulou ${Math.floor(totalMin / 60)}h${String(totalMin % 60).padStart(2, '0')}m de estudo, tem ${appData.cycleItems.length} matéria(s), ${pendentes} revisão(ões) pendente(s) e ${taxa}% de acerto nas questões registradas.`;
}

function recomendacaoEstudoIa() {
    if (!appData.cycleItems.length) return 'Você ainda não cadastrou matérias. Diga “Adicione a matéria Matemática” e eu preparo o seu hub.';
    const ordenadas = [...appData.cycleItems].sort((a, b) => {
        const totalA = (a.acertos || 0) + (a.erros || 0);
        const totalB = (b.acertos || 0) + (b.erros || 0);
        const notaA = totalA ? (a.acertos || 0) / totalA : .35 + Math.min(1, (a.executedMin || 0) / 600) * .3;
        const notaB = totalB ? (b.acertos || 0) / totalB : .35 + Math.min(1, (b.executedMin || 0) / 600) * .3;
        return notaA - notaB;
    });
    const alvo = ordenadas[0];
    const topico = (alvo.topicos || []).find(item => !item.concluido);
    return `Minha prioridade para agora é ${alvo.subject}${topico ? `, começando por “${topico.nome}”` : ''}. Faça um bloco de 25 minutos e depois registre 10 questões para eu recalcular sua prioridade.`;
}

function respostaAjudaIa() {
    return 'Posso executar ações como:\n• adicionar matérias e tópicos;\n• criar revisões e compromissos;\n• iniciar um cronômetro por matéria;\n• mudar nome, bio, cor, visual e modo de patente;\n• alterar a meta diária;\n• abrir qualquer área;\n• analisar progresso e sugerir o próximo estudo;\n• excluir matérias com confirmação.\n\nVocê pode escrever de forma natural. Exemplo: “Agende estudar Física amanhã às 16:30”.';
}

function interpretarComandoIa(texto) {
    const normal = normalizarIa(texto);

    if (estadoIaQg.pendente) {
        if (/^(confirmar|confirmo|sim|pode apagar|pode excluir)$/.test(normal)) return executarAcaoPendenteIa(true);
        if (/^(cancelar|cancela|nao|não)$/.test(normal)) return executarAcaoPendenteIa(false);
        return { text: 'Há uma exclusão aguardando confirmação. Use os botões ou responda “confirmar” ou “cancelar”.' };
    }

    if (/\b(ajuda|o que voce pode|o que consegue|comandos)\b/.test(normal)) return { text: respostaAjudaIa() };
    if (/\b(como estou|meu progresso|resumo do meu progresso|meus dados)\b/.test(normal)) return { text: resumoProgressoIa(), section: 'perfil' };
    if (/\b(o que devo estudar|o que estudar|proxima materia|proximo estudo|plano agora)\b/.test(normal)) return { text: recomendacaoEstudoIa(), section: 'dashboard' };
    if (/\b(quais|liste|mostre).*(materias|disciplinas)\b/.test(normal)) {
        const lista = appData.cycleItems.length ? appData.cycleItems.map(item => item.subject).join(', ') : 'nenhuma ainda';
        return { text: `Suas matérias cadastradas: ${lista}.`, section: 'planejamento' };
    }

    const navegacao = normal.match(/^(?:abra|abrir|mostre|mostrar|va para|ir para|acesse)\s+(?:meu|minha|meus|minhas|o|a|as|os)?\s*(.+)$/);
    if (navegacao) {
        const alvo = normalizarIa(navegacao[1]);
        const chave = Object.keys(ROTAS_IA).find(item => alvo.includes(item));
        if (chave) return { text: `Certo. Abri ${navegacao[1].replace(/[.!?]+$/, '')} para você.`, section: ROTAS_IA[chave] };
    }

    if (/\b(?:modo|visual)\s+classico\b/.test(normal)) {
        appData.visualMode = 'classic'; document.documentElement.dataset.visual = 'classic'; syncVisualModeControl();
        return { text: 'Visual Clássico ativado. A interface ficou mais neutra e sem os efeitos intensos.', changed: true };
    }
    if (/\b(?:modo|visual)\s+futurista\b/.test(normal)) {
        appData.visualMode = 'futuristic'; document.documentElement.dataset.visual = 'futuristic'; syncVisualModeControl();
        return { text: 'Visual Futurista ativado. Os efeitos de evolução voltaram.', changed: true };
    }
    if (/\bmodo\s+aura\b/.test(normal)) {
        appData.rankVisualMode = 'aura'; sincronizarModoPatente(); renderizarAtalhosXpTeste(); renderGamificacao(true);
        return { text: 'Modo Aura ativado. Títulos e molduras de anime estão em uso.', changed: true, section: 'perfil' };
    }
    if (/\bmodo\s+militar\b/.test(normal)) {
        appData.rankVisualMode = 'militar'; sincronizarModoPatente(); renderizarAtalhosXpTeste(); renderGamificacao(true);
        return { text: 'Modo Militar ativado. A carreira do Exército voltou ao perfil.', changed: true, section: 'perfil' };
    }

    const corSistema = normal.match(/(?:mude|troque|altere|use).*(?:cor|tema).*\b(azul|verde|laranja|roxo|vermelho|amarelo|rosa|ciano)\b/);
    if (corSistema) {
        const [hex, rgb] = CORES_IA[corSistema[1]];
        appData.themeColor = hex; appData.themeColorRgb = rgb;
        document.documentElement.style.setProperty('--accent-color', hex);
        document.documentElement.style.setProperty('--accent-rgb', rgb);
        syncSettingsUI();
        return { text: `A cor do King Master agora é ${corSistema[1]}.`, changed: true };
    }

    const nomePerfil = texto.match(/(?:mude|troque|altere|defina)\s+(?:o\s+)?meu\s+(?:nome|nome de usu[aá]rio)\s+(?:para|como)\s+(.+)/i);
    if (nomePerfil) {
        const nome = limparTextoIa(nomePerfil[1], 32);
        if (nome.length < 2) return { text: 'Preciso de um nome com pelo menos 2 caracteres.', error: true };
        appData.profileName = nome; aplicarIdentidadePerfil();
        return { text: `Pronto. Seu nome de usuário agora é ${nome}.`, changed: true, section: 'perfil' };
    }
    const bioPerfil = texto.match(/(?:mude|troque|altere|defina|coloque)\s+(?:a\s+)?minha\s+bio\s+(?:para|como)\s+(.+)/i);
    if (bioPerfil) {
        appData.profileBio = limparTextoIa(bioPerfil[1], 190); aplicarIdentidadePerfil();
        return { text: 'Bio atualizada e preparada para o salvamento automático.', changed: true, section: 'perfil' };
    }

    const meta = normal.match(/(?:defina|mude|altere|coloque)?\s*(?:minha\s+)?meta\s+diaria\s+(?:para|de)?\s*(\d+(?:[.,]\d+)?)\s*(horas?|h|minutos?|min)?/);
    if (meta) {
        const valor = Number(meta[1].replace(',', '.'));
        const minutos = meta[2]?.startsWith('h') ? Math.round(valor * 60) : Math.round(valor);
        if (minutos < 5 || minutos > 1440) return { text: 'A meta diária precisa ficar entre 5 minutos e 24 horas.', error: true };
        appData.dailyGoalMinutes = minutos;
        return { text: `Meta diária definida para ${minutos >= 60 ? `${Math.floor(minutos / 60)}h${minutos % 60 ? ` ${minutos % 60}min` : ''}` : `${minutos} minutos`}.`, changed: true };
    }

    const topicoConcluido = texto.match(/(?:marque|marcar)\s+(?:o\s+)?(?:t[oó]pico|assunto)?\s*["“]?(.+?)["”]?\s+como\s+conclu[ií]do\s+(?:em|na)\s+(?:mat[eé]ria\s+)?(.+)/i);
    if (topicoConcluido) {
        const materia = encontrarMateriaIa(topicoConcluido[2]);
        if (!materia) return { text: `Não encontrei a matéria “${limparTextoIa(topicoConcluido[2])}”.`, error: true };
        const nomeTopico = normalizarIa(limparTextoIa(topicoConcluido[1]));
        const topico = (materia.topicos || []).find(item => normalizarIa(item.nome) === nomeTopico || normalizarIa(item.nome).includes(nomeTopico));
        if (!topico) return { text: `Não encontrei esse tópico em ${materia.subject}.`, error: true };
        topico.concluido = true;
        return { text: `Tópico “${topico.nome}” marcado como concluído em ${materia.subject}.`, changed: true, section: 'planejamento' };
    }

    const novoTopico = texto.match(/^(?:adicione|crie|coloque|cadastre)\s+(?:o\s+|um\s+)?(?:t[oó]pico|assunto)\s+["“]?(.+?)["”]?\s+(?:na|em|para\s+a)\s+(?:mat[eé]ria\s+)?["“]?(.+?)["”]?[.!?]*$/i);
    if (novoTopico) {
        const materia = encontrarMateriaIa(novoTopico[2]);
        if (!materia) return { text: `Não encontrei a matéria “${limparTextoIa(novoTopico[2])}”. Posso criá-la primeiro se você pedir.`, error: true };
        const nome = limparTextoIa(novoTopico[1], 100);
        if ((materia.topicos || []).some(item => normalizarIa(item.nome) === normalizarIa(nome))) return { text: `O tópico “${nome}” já existe em ${materia.subject}.` };
        if (!Array.isArray(materia.topicos)) materia.topicos = [];
        materia.topicos.push({ nome, concluido: false });
        renderizarCiclo();
        return { text: `Adicionei o tópico “${nome}” à matéria ${materia.subject}.`, changed: true, section: 'planejamento', toast: '✓ Tópico criado pela IA' };
    }

    const revisao = texto.match(/^(?:crie|adicione|agende|marque)\s+(?:uma\s+)?revis[aã]o\s+(?:de|sobre)\s+(.+)$/i);
    if (revisao) {
        let corpo = revisao[1].replace(/[.!?]+$/, '');
        const dataTrecho = corpo.match(/\s+para\s+(hoje|amanh[aã]|depois de amanh[aã]|\d{1,2}[\/-]\d{1,2}(?:[\/-]\d{2,4})?)$/i);
        const dataAlvo = dataDoComandoIa(dataTrecho?.[1] || 'amanhã');
        if (dataTrecho) corpo = corpo.slice(0, dataTrecho.index);
        const partes = corpo.match(/^(.+?)\s+(?:em|na\s+mat[eé]ria|de\s+mat[eé]ria)\s+(.+)$/i);
        if (!partes) return { text: 'Diga o assunto e a matéria. Exemplo: “Crie uma revisão de Cinemática em Física para amanhã”.', error: true };
        const materia = encontrarMateriaIa(partes[2]);
        if (!materia) return { text: `Não encontrei a matéria “${limparTextoIa(partes[2])}”.`, error: true };
        const assunto = limparTextoIa(partes[1], 100);
        appData.revisoesItems.push({ id: Date.now(), materia: String(materia.id), assunto, dataEstudo: '', dataAlvo, origem: 'ia-qg', tags: [], atualizadoEm: Date.now(), status: 'pendente', criadoEm: Date.now() });
        renderizarRevisoes();
        return { text: `Revisão de “${assunto}” em ${materia.subject} marcada para ${dataBonitaIa(dataAlvo)}.`, changed: true, section: 'revisoes', toast: '✓ Revisão criada pela IA' };
    }

    const agendamento = texto.match(/^(?:agende|marque|programe)\s+(?:um\s+)?(?:estudo|sess[aã]o)?\s*(?:para\s+)?(?:estudar\s+)?(.+?)\s+(hoje|amanh[aã]|depois de amanh[aã]|segunda(?:-feira)?|ter[cç]a(?:-feira)?|quarta(?:-feira)?|quinta(?:-feira)?|sexta(?:-feira)?|s[aá]bado|domingo|\d{1,2}[\/-]\d{1,2}(?:[\/-]\d{2,4})?)(?:\s+(?:às|as|pelas?)\s*\d{1,2}(?::\d{2})?\s*(?:h|horas?)?)?[.!?]*$/i);
    if (agendamento) {
        const materia = encontrarMateriaIa(agendamento[1]);
        const nome = materia?.subject || limparTextoIa(agendamento[1], 80);
        const data = dataDoComandoIa(agendamento[2]);
        const time = extrairHoraIa(texto);
        appData.agendamentoItems.push({ id: Date.now(), title: `Estudar ${nome}`, date: data, time, type: 'Estudo', description: 'Planejado pela IA do QG', completed: false });
        renderizarAgendamento();
        return { text: `Agendei ${nome} para ${dataBonitaIa(data)} às ${time}.`, changed: true, section: 'agendamento', toast: '✓ Estudo agendado pela IA' };
    }

    const cronometro = texto.match(/^(?:inicie|comece|prepare|configure)\s+(?:um\s+)?(?:cron[oô]metro|bloco|sess[aã]o)\s+(?:de\s+)?(\d+)\s*(?:minutos?|min)\s+(?:para|de|em)\s+(.+?)[.!?]*$/i);
    if (cronometro) {
        const minutos = Math.max(1, Math.min(600, Number(cronometro[1])));
        const materia = encontrarMateriaIa(cronometro[2]);
        if (!materia) return { text: `Não encontrei a matéria “${limparTextoIa(cronometro[2])}”.`, error: true };
        setMode('estudo');
        document.getElementById('inputHours').value = Math.floor(minutos / 60);
        document.getElementById('inputMinutes').value = minutos % 60;
        document.getElementById('inputSeconds').value = 0;
        document.getElementById('activeSubjectSelect').value = materia.id;
        atualizarSeletorDeMaterias(); sincronizarTempo();
        if (!isRunning && /^(?:inicie|comece)/i.test(texto.trim())) toggleTimer();
        return { text: `${isRunning ? 'Cronômetro iniciado' : 'Cronômetro preparado'}: ${minutos} minutos de ${materia.subject}.`, section: 'dashboard', changed: true, toast: '▶ Sessão preparada pela IA' };
    }

    const excluirMateria = texto.match(/^(?:apague|exclua|delete|remova)\s+(?:a\s+)?(?:mat[eé]ria|disciplina)\s+(.+?)[.!?]*$/i);
    if (excluirMateria) {
        const materia = encontrarMateriaIa(excluirMateria[1]);
        if (!materia) return { text: `Não encontrei a matéria “${limparTextoIa(excluirMateria[1])}”.`, error: true };
        estadoIaQg.pendente = { type: 'delete-subject', id: materia.id, label: materia.subject };
        return { text: `A matéria ${materia.subject} e seus tópicos serão excluídos. Confirme a exclusão ou cancele.` };
    }

    if (/\b(?:adicione|crie|registre|abra).*(?:simulado)\b/.test(normal)) {
        showSection('simulados'); abrirModalSimulado();
        return { text: 'Abri o registro de simulado. Preencha resultados e anexo; eu atualizarei suas análises depois que você guardar.', section: 'simulados' };
    }
    if (/\b(?:adicione|crie|registre|abra).*(?:redacao)\b/.test(normal)) {
        showSection('redacao'); abrirModalRedacao();
        return { text: 'Abri o laboratório para registrar uma redação com as cinco competências do ENEM.', section: 'redacao' };
    }

    const novaMateria = texto.match(/^(?:adicione|adicionar|crie|cadastre|coloque)\s+(?:a\s+|uma\s+)?(?:mat[eé]ria|disciplina)\s+(?:de\s+)?(.+?)(?=\s+e\s+(?:adicione|crie|coloque|cadastre)\b|$)/i)
        || texto.match(/^(?:adicione|crie|cadastre)\s+(.+?)(?=\s+e\s+(?:adicione|crie|coloque|cadastre)\b|$)/i);
    if (novaMateria) {
        let nome = limparTextoIa(novaMateria[1].split(/\s+(?:com\s+)?cor\s+/i)[0].split(/\s+(?:do\s+)?tipo\s+/i)[0], 60);
        if (/^(uma|a)?\s*(materia|disciplina)?$/i.test(normalizarIa(nome)) || nome.length < 2) {
            abrirModalCiclo();
            return { text: 'Abri o cadastro de matéria. Diga o nome no comando ou preencha o formulário.', section: 'planejamento' };
        }
        const existente = encontrarMateriaIa(nome);
        if (existente && normalizarIa(existente.subject) === normalizarIa(nome)) return { text: `A matéria ${existente.subject} já está cadastrada.`, section: 'planejamento' };
        const materia = { id: Date.now(), color: corDoComandoIa(texto), subject: nome, type: tipoDoComandoIa(texto), targetMin: 0, executedMin: 0, topicos: [], questoes: 0, acertos: 0, erros: 0 };
        const encadeado = texto.match(/\s+e\s+(?:adicione|crie|coloque|cadastre)\s+(?:o\s+|um\s+)?(?:t[oó]pico|assunto)\s+(.+?)[.!?]*$/i);
        if (encadeado) materia.topicos.push({ nome: limparTextoIa(encadeado[1], 100), concluido: false });
        appData.cycleItems.push(materia);
        renderizarCiclo(); renderizarRevisoes();
        return { text: `Matéria ${nome} adicionada como ${materia.type}${encadeado ? `, com o tópico “${materia.topicos[0].nome}”` : ''}.`, changed: true, section: 'planejamento', toast: '✓ Matéria criada pela IA' };
    }

    return { text: 'Ainda não reconheci esse pedido com segurança. Tente ser mais direto, por exemplo: “Adicione a matéria Química”, “Agende Química amanhã às 14:00” ou “Ajuda” para ver tudo que consigo executar.', error: true };
}

function executarAcaoPendenteIa(confirmado) {
    const acao = estadoIaQg.pendente;
    estadoIaQg.pendente = null;
    if (!confirmado) return { text: 'Exclusão cancelada. Nenhum dado foi alterado.' };
    if (acao?.type === 'delete-subject') {
        const materia = appData.cycleItems.find(item => item.id === acao.id);
        if (!materia) return { text: 'Essa matéria já não existe.' };
        appData.cycleItems = appData.cycleItems.filter(item => item.id !== acao.id);
        renderizarCiclo(); renderizarRevisoes();
        return { text: `Matéria ${acao.label} excluída com confirmação.`, changed: true, section: 'planejamento', toast: '✓ Matéria excluída pela IA' };
    }
    return { text: 'Não encontrei a ação que aguardava confirmação.', error: true };
}

function confirmarAcaoIa(confirmado) {
    processarEntradaIa(confirmado ? 'confirmar' : 'cancelar');
}

function ouvirComandoIa() {
    const Reconhecimento = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!Reconhecimento) {
        registrarMensagemIa('assistant', 'O reconhecimento de voz não está disponível neste navegador. Você ainda pode digitar o comando normalmente.');
        saveAppData();
        return;
    }
    if (estadoIaQg.ouvindo) return;
    const botao = document.getElementById('aiQgVoice');
    const reconhecimento = new Reconhecimento();
    reconhecimento.lang = 'pt-BR'; reconhecimento.interimResults = false; reconhecimento.maxAlternatives = 1;
    estadoIaQg.ouvindo = true; botao?.classList.add('listening');
    reconhecimento.onresult = event => {
        const texto = event.results?.[0]?.[0]?.transcript || '';
        const input = document.getElementById('aiQgInput');
        if (input) input.value = texto;
        if (texto) processarEntradaIa(texto);
    };
    reconhecimento.onerror = () => registrarMensagemIa('assistant', 'Não consegui ouvir com clareza. Tente novamente ou escreva o comando.');
    reconhecimento.onend = () => { estadoIaQg.ouvindo = false; botao?.classList.remove('listening'); };
    reconhecimento.start();
}

document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && document.getElementById('aiQgPanel')?.classList.contains('open')) toggleIaQg(false);
    if ((event.ctrlKey || event.metaKey) && event.key.toLocaleLowerCase('pt-BR') === 'k') {
        event.preventDefault(); toggleIaQg(true);
    }
});

garantirMemoriaIa();
renderizarConversaIa();
