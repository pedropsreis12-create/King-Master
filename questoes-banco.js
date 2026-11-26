/* Banco de questões da aba Questões.
   - Explorar: lista de questões com filtros profundos (área → disciplina → assunto, anos, dia, prova, origem, nível, imagem, situação).
     Questões reais do ENEM (2009–2023) vêm da API aberta enem.dev; questões no estilo de vestibulares são criadas pela IA e guardadas.
   - Minhas questões: desempenho por disciplina e assunto, caderno de erros, questões salvas e atividade recente.
   Cada resposta conta no histórico e na matéria do aluno. */
(() => {
    'use strict';
    const API = 'https://api.enem.dev/v1';
    const OPENVERSE = 'https://api.openverse.org/v1/images/';
    const ANOS = Array.from({ length: 15 }, (_, i) => 2023 - i);
    const AREAS = {
        linguagens: { nome: 'Linguagens', api: 'linguagens', offset: 0, dia: '1' },
        humanas: { nome: 'Humanas', api: 'ciencias-humanas', offset: 45, dia: '1' },
        natureza: { nome: 'Natureza', api: 'ciencias-natureza', offset: 90, dia: '2' },
        matematica: { nome: 'Matemática', api: 'matematica', offset: 135, dia: '2' },
    };
    const AREA_POR_API = Object.fromEntries(Object.entries(AREAS).map(([id, a]) => [a.api, id]));
    const BANCAS = ['ENEM', 'FUVEST', 'UNICAMP', 'UNESP', 'UERJ'];
    const NIVEIS = { basico: 'Fácil', medio: 'Médio', dificil: 'Difícil' };
    const LETRAS = 'ABCDE';
    const POR_PAGINA = 10;
    const MAX_GERADAS = 80;

    // Disciplinas e assuntos, com palavras típicas para reconhecer cada questão do ENEM.
    const DISCIPLINAS = {
        portugues: { nome: 'Português', area: 'linguagens', assuntos: {
            interpretacao: ['Interpretação de texto', 'sentido tese argument leitura inferir infere'],
            generos: ['Gêneros textuais', 'genero textual cronica noticia reportagem anuncio propaganda publicitari charge tirinha cartum campanha'],
            variacao: ['Variação linguística', 'variacao linguistic norma padrao regional coloquial dialet preconceito linguistic'],
            gramatica: ['Gramática e coesão', 'verbo conjuncao pronome coesao concordancia sintax gramatic pontuacao'],
            funcoes: ['Funções da linguagem', 'funcao da linguagem metalinguag conativ referencial poetica fatic emotiv'],
        } },
        literatura: { nome: 'Literatura', area: 'linguagens', assuntos: {
            escolas: ['Escolas literárias', 'modernismo modernista romantismo romantic barroco realismo naturalismo parnasian simbolismo arcadismo'],
            poesia: ['Poesia', 'poema poeta poesia verso versos estrofe rima soneto lirico'],
            prosa: ['Prosa e narrativa', 'romance conto narrador personagem enredo cronista'],
        } },
        artes: { nome: 'Artes', area: 'linguagens', assuntos: {
            visuais: ['Artes visuais', 'pintura pintor escultura obra de arte artista museu exposicao tela grafite'],
            musica: ['Música', 'musica musical cancao compositor samba ritmo'],
            cenicas: ['Teatro, dança e cinema', 'teatro danca performance cinema filme espetaculo'],
        } },
        educacaoFisica: { nome: 'Educação Física', area: 'linguagens', assuntos: {
            esporte: ['Esporte e jogos', 'esporte esportes jogo jogos atleta olimpi futebol competicao'],
            corpo: ['Corpo e saúde', 'atividade fisica exercicio corporal ginastica sedentar treinamento saude'],
        } },
        idiomas: { nome: 'Língua estrangeira', area: 'linguagens', assuntos: {} },
        historia: { nome: 'História', area: 'humanas', assuntos: {
            antiga: ['Antiguidade', 'grecia grego gregos roma romano antiguidade egito mesopotamia atenas esparta'],
            medieval: ['Idade Média', 'medieval feudal feudalismo cruzada senhor servo'],
            moderna: ['Idade Moderna', 'renascimento reforma protestante absolutismo mercantil iluminismo navegacoes'],
            contemporanea: ['Idade Contemporânea', 'revolucao industrial revolucao francesa guerra mundial nazis fascis guerra fria socialismo imperialismo'],
            colonia: ['Brasil Colônia', 'colonia colonial engenho bandeirante capitania jesuita escravid escravo indigena'],
            imperio: ['Brasil Império', 'imperio imperador regencia abolicao monarquia segundo reinado'],
            republica: ['Brasil República', 'republica vargas ditadura militar redemocratiz constituicao golpe oligarquia populismo'],
        } },
        geografia: { nome: 'Geografia', area: 'humanas', assuntos: {
            urbana: ['Geografia urbana', 'urbanizacao urbano urbana cidade cidades metropole favela periferia'],
            agraria: ['Espaço agrário', 'agricultura agricola agronegocio rural fundiari latifundio campones'],
            ambiental: ['Meio ambiente e clima', 'clima climatic aquecimento desmatamento bioma vegetacao erosao solo ambiental queimada'],
            populacao: ['População e migração', 'populac migracao migrante demograf natalidade envelhecimento refugiad'],
            economia: ['Globalização e economia', 'globalizacao industria industrial comercio economia mercado multinaciona'],
            cartografia: ['Cartografia', 'mapa cartograf escala latitude longitude projecao fuso'],
            geopolitica: ['Geopolítica', 'geopolit fronteira territorio conflito nacao blocos'],
            fisica: ['Geografia física', 'relevo rocha hidrograf rio rios bacia geolog placa tecton'],
        } },
        filosofia: { nome: 'Filosofia', area: 'humanas', assuntos: {
            antiga: ['Filosofia antiga', 'platao aristoteles socrates sofista pre-socratic'],
            moderna: ['Filosofia moderna', 'descartes kant hume locke hobbes rousseau espinosa bacon'],
            contemporanea: ['Filosofia contemporânea', 'nietzsche sartre hegel foucault arendt adorno habermas'],
            etica: ['Ética e moral', 'etica moral virtude dever felicidade'],
            politica: ['Filosofia política', 'poder maquiavel contrato social soberania'],
        } },
        sociologia: { nome: 'Sociologia', area: 'humanas', assuntos: {
            classicos: ['Clássicos da sociologia', 'durkheim weber marx'],
            trabalho: ['Trabalho e sociedade', 'trabalho trabalhador trabalhadores emprego capitalismo'],
            cultura: ['Cultura e identidade', 'cultura cultural identidade industria cultural consumo midia'],
            desigualdade: ['Desigualdade e preconceito', 'desigualdade racismo preconceito genero discrimin exclusao'],
            cidadania: ['Cidadania e movimentos sociais', 'cidadania direitos movimentos sociais democracia participacao'],
        } },
        biologia: { nome: 'Biologia', area: 'natureza', assuntos: {
            citologia: ['Citologia', 'celula celular celulas membrana organela mitocond ribossom citoplasm'],
            genetica: ['Genética', 'dna rna gene genes genetic cromossom hereditar mutacao alelo heranca clonagem transgenic'],
            ecologia: ['Ecologia', 'ecossistema cadeia alimentar teia populac comunidade habitat nicho biodiversidade poluicao sustentab'],
            evolucao: ['Evolução', 'evolucao evolutiv selecao natural darwin lamarck adaptacao especiacao fossil'],
            fisiologia: ['Fisiologia humana', 'sangue hormonio coracao rim digest pulmao sistema nervoso neuronio imun'],
            microbiologia: ['Microbiologia e saúde', 'bacteria virus fungo protozoar doenca vacina infeccao parasit epidemia'],
            botanica: ['Botânica', 'planta plantas vegetal vegetais fotossintese flor semente raiz folha'],
        } },
        quimica: { nome: 'Química', area: 'natureza', assuntos: {
            organica: ['Química orgânica', 'organic hidrocarbon alcool ester cetona polimer isomer aldeido acido carboxilic'],
            fisicoquimica: ['Termoquímica, cinética e equilíbrio', 'entalpia termoquimic cinetica equilibrio quimico catalis endotermic exotermic'],
            eletroquimica: ['Eletroquímica', 'pilha eletrolise oxidacao reducao eletrodo bateria corrosao'],
            solucoes: ['Soluções', 'solucao solucoes concentracao solubilidade diluicao molar'],
            estequiometria: ['Estequiometria', 'mol mols massa molar estequiom rendimento'],
            atomistica: ['Átomo e tabela periódica', 'atomo atomic eletron tabela periodica ligacao isotopo radioativ'],
            ambiental: ['Química ambiental', 'chuva acida efeito estufa poluente tratamento de agua combust'],
            acidobase: ['Ácidos e bases', 'acido acida base basic ph neutraliza'],
        } },
        fisica: { nome: 'Física', area: 'natureza', assuntos: {
            mecanica: ['Mecânica', 'velocidade aceleracao forca movimento newton atrito inercia trajetoria queda'],
            energia: ['Energia e trabalho', 'energia cinetic potencial trabalho potencia conservacao usina'],
            termologia: ['Termologia', 'calor temperatura termodinam dilatacao caloria termic'],
            optica: ['Óptica', 'luz lente espelho refracao reflexao optic'],
            ondulatoria: ['Ondas e som', 'onda ondas frequencia som acustic ressonancia'],
            eletricidade: ['Eletricidade', 'corrente eletric tensao resistor circuito volt ohm watt carga'],
            magnetismo: ['Magnetismo', 'magnetic ima campo inducao motor gerador'],
            hidrostatica: ['Hidrostática', 'pressao empuxo densidade fluido hidraulic'],
        } },
        matematica: { nome: 'Matemática', area: 'matematica', assuntos: {
            porcentagem: ['Porcentagem e juros', 'porcentagem percentual juros desconto lucro aumento'],
            razao: ['Razão, proporção e escala', 'razao proporcao proporcional regra de tres escala grandeza'],
            funcoes: ['Funções', 'funcao grafico linear quadratic exponencial logaritm'],
            algebra: ['Equações e álgebra', 'equacao equacoes sistema inequacao polinom'],
            sequencias: ['Sequências e progressões', 'progressao sequencia termo'],
            combinatoria: ['Análise combinatória', 'combinatoria arranjo permutacao combinac maneiras'],
        } },
        geometria: { nome: 'Geometria', area: 'matematica', assuntos: {
            plana: ['Geometria plana', 'area areas perimetro triangulo quadrado retangulo circulo circunferencia poligono angulo'],
            espacial: ['Geometria espacial', 'volume cilindro cubo esfera piramide cone prisma paralelepiped'],
            trigonometria: ['Trigonometria', 'seno cosseno tangente trigonometr'],
            analitica: ['Geometria analítica', 'plano cartesiano coordenada distancia entre pontos'],
        } },
        estatistica: { nome: 'Estatística e probabilidade', area: 'matematica', assuntos: {
            medidas: ['Média, mediana e moda', 'media mediana moda desvio padrao'],
            probabilidade: ['Probabilidade', 'probabilidade chance sorteio aleatori'],
            graficos: ['Gráficos e tabelas', 'grafico tabela frequencia'],
        } },
    };
    const PADRAO_AREA = { linguagens: 'portugues', matematica: 'matematica' };
    const norm = v => String(v || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
    // Palavras genéricas de frases como "regra de três" não contam (aparecem em qualquer texto).
    const GENERICAS = new Set(['de', 'da', 'do', 'entre', 'tres', 'segundo', 'sistema', 'obra', 'plano', 'pontos', 'termo', 'padrao', 'campo', 'base', 'carga', 'social']);
    const regex = palavras => new RegExp(`\\b(?:${palavras.trim().split(/\s+/).filter(p => p.length >= 2 && !GENERICAS.has(p)).join('|')})`, 'g');
    const REGEX_ASSUNTO = {};
    const REGEX_DISC = {};
    for (const [id, d] of Object.entries(DISCIPLINAS)) {
        const todas = Object.entries(d.assuntos).map(([a, [, p]]) => { REGEX_ASSUNTO[`${id}.${a}`] = regex(p); return p; }).join(' ');
        if (todas.trim()) REGEX_DISC[id] = regex(todas);
    }
    const discDaArea = area => Object.keys(DISCIPLINAS).filter(id => DISCIPLINAS[id].area === area);

    const esc = t => String(t ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    const urlImagem = u => /^https:\/\/enem\.dev\/[^\s"'<>)]+$/.test(String(u || '')) && !/broken-image/.test(u) ? String(u) : '';
    const urlSegura = u => /^https:\/\/[^\s"'<>]+$/.test(String(u || '')) ? String(u) : '';
    const dados = () => (typeof appData !== 'undefined' ? appData : {});
    const toast = (m, e) => window.showToast?.(m, e);
    const hash = s => { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; };
    const dataCurta = ms => new Date(ms).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });

    // Markdown simples das questões do ENEM: negrito, itálico, imagens e parágrafos (sempre escapado).
    function markdown(texto) {
        return String(texto || '').split(/\n{2,}/).map(bloco => {
            let p = esc(bloco.trim());
            if (!p) return '';
            p = p.replace(/!\[[^\]]*\]\(([^)\s]+)\)/g, (_, u) => { const url = urlImagem(u.replace(/&amp;/g, '&')); return url ? `<img src="${esc(url)}" alt="Imagem da questão" loading="lazy">` : ''; });
            p = p.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>').replace(/(^|[\s(])\*([^*\n]+)\*/g, '$1<em>$2</em>');
            p = p.replace(/ {2,}\n/g, ' ').replace(/\n/g, ' ');
            return p.startsWith('<img') && !/<img[^>]*>.+/.test(p) ? p : `<p>${p}</p>`;
        }).join('');
    }

    // Texto simples da IA em parágrafos e listas, sempre escapado.
    function textoIa(texto) {
        const linhas = String(texto || '').split(/\n+/).map(l => l.trim()).filter(Boolean);
        let html = '', lista = false;
        for (const l of linhas) {
            const item = /^[-•*]\s+/.test(l);
            if (item && !lista) { html += '<ul>'; lista = true; }
            if (!item && lista) { html += '</ul>'; lista = false; }
            const t = esc(l.replace(/^[-•*]\s+/, '')).replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
            html += item ? `<li>${t}</li>` : `<p>${t}</p>`;
        }
        return html + (lista ? '</ul>' : '');
    }

    const contar = (texto, re) => (texto.match(re) || []).length;
    // Disciplina e assunto de uma questão do ENEM, pelas palavras do enunciado.
    function classificar(q) {
        if (q.area === 'linguagens' && q.lingua) return { disc: 'idiomas', assunto: '' };
        const texto = norm(`${q.contexto} ${q.introducao} ${q.alternativas.map(a => a.texto).join(' ')}`);
        let disc = '', pontos = 0;
        for (const id of discDaArea(q.area)) {
            if (!REGEX_DISC[id]) continue;
            const n = contar(texto, REGEX_DISC[id]);
            if (n > pontos) { disc = id; pontos = n; }
        }
        if (pontos < 2) disc = PADRAO_AREA[q.area] || disc;
        let assunto = '', melhor = 0;
        for (const a of Object.keys(DISCIPLINAS[disc]?.assuntos || {})) {
            const n = contar(texto, REGEX_ASSUNTO[`${disc}.${a}`]);
            if (n > melhor) { assunto = a; melhor = n; }
        }
        return { disc, assunto };
    }

    // Converte uma questão da API enem.dev para o formato do banco.
    function normalizarEnem(q) {
        const area = AREA_POR_API[q?.discipline];
        const alternativas = (Array.isArray(q?.alternatives) ? q.alternatives : []).map(a => ({ letra: String(a.letter || ''), texto: String(a.text || ''), imagem: urlImagem(a.file) }));
        const correta = LETRAS.indexOf(String(q?.correctAlternative || '').toUpperCase());
        if (!area || alternativas.length !== 5 || correta < 0) return null;
        const contexto = String(q.context || '');
        // Figuras da questão que não aparecem dentro do texto.
        const arquivos = (Array.isArray(q.files) ? q.files : []).map(urlImagem).filter(u => u && !contexto.includes(u));
        const item = {
            id: `enem-${q.year}-${q.index}${q.language ? `-${q.language}` : ''}`, fonte: 'enem', banca: 'ENEM', ano: Number(q.year), numero: Number(q.index), area,
            lingua: q.language || '', contexto, introducao: String(q.alternativesIntroduction || ''), alternativas, correta, arquivos,
            temImagem: /!\[/.test(contexto) || arquivos.length > 0 || alternativas.some(a => a.imagem),
        };
        Object.assign(item, classificar(item));
        return item;
    }

    function normalizarIa(q, extra, i) {
        return {
            id: `ia-${Date.now().toString(36)}-${i}`, fonte: 'ia', banca: extra.banca, nivel: extra.nivel, area: extra.area || '', discs: extra.discs || [],
            disc: extra.discs?.length === 1 ? extra.discs[0] : '', materiaId: extra.materiaId, materiaNome: q.subject,
            assuntoNome: String(q.topic || extra.assunto || '').slice(0, 100), contexto: String(q.stem || ''), introducao: '', busca: String(q.busca || '').slice(0, 60),
            alternativas: q.choices.map((texto, k) => ({ letra: LETRAS[k], texto: String(texto), imagem: '' })), correta: q.correctIndex, explicacao: String(q.explanation || ''), em: Date.now(),
        };
    }

    // ----- Matérias do aluno -> disciplinas do banco -----
    const chaveMateria = m => window.KingSubjectIcons?.chave?.(m?.subject, m?.area) || '';
    function discDaMateria(m) {
        if (!m) return [];
        const k = chaveMateria(m);
        if (k === 'redacao') return [];
        if (k === 'matematica') return ['matematica', 'geometria', 'estatistica'];
        if (k === 'interpretacao') return ['portugues', 'literatura'];
        if (k === 'atualidades') return discDaArea('humanas');
        if (DISCIPLINAS[k]) return [k];
        return AREAS[m.area] ? discDaArea(m.area) : [];
    }
    const discsDaQuestao = q => q.fonte === 'ia' ? (q.discs?.length ? q.discs : [q.disc].filter(Boolean)) : [q.disc].filter(Boolean);

    const PALAVRAS_VAZIAS = ['dos', 'das', 'com', 'para', 'por', 'uma', 'que', 'nos', 'nas', 'aos'];
    function casaTexto(q, busca) {
        const palavras = norm(busca).split(/[^a-z0-9]+/).filter(p => p.length >= 3 && !PALAVRAS_VAZIAS.includes(p));
        if (!palavras.length) return true;
        const texto = norm(`${q.assuntoNome || ''} ${q.contexto} ${q.introducao} ${q.alternativas.map(a => a.texto).join(' ')}`);
        return palavras.every(p => new RegExp(`\\b${p.slice(0, Math.max(4, p.length - 2))}`).test(texto));
    }

    // Aplica os filtros a uma lista de questões. b = { respondidas, salvas }.
    function filtrar(questoes, f, b = {}) {
        const respondidas = b.respondidas || {}, salvas = b.salvas || {};
        const discs = new Set(f.disc || []);
        const assuntos = new Set(f.assuntos || []);
        const ids = new Set(f.ids || []);
        const lista = questoes.filter(q => {
            if (ids.size) return ids.has(q.id);
            if (f.banca && q.banca !== f.banca) return false;
            if (f.origem === 'reais' && q.fonte !== 'enem') return false;
            if (f.origem === 'ia' && q.fonte !== 'ia') return false;
            if ((f.anoDe || f.anoAte) && q.fonte !== 'enem') return false;
            if (f.anoDe && q.ano < Number(f.anoDe)) return false;
            if (f.anoAte && q.ano > Number(f.anoAte)) return false;
            if (f.dia && (q.fonte !== 'enem' || (q.numero <= 90 ? '1' : '2') !== f.dia)) return false;
            if (f.nivel && q.nivel !== f.nivel) return false;
            if (f.imagem === 'com' && !q.temImagem) return false;
            if (f.imagem === 'sem' && q.temImagem) return false;
            const qd = discsDaQuestao(q);
            if (discs.size && !qd.some(d => discs.has(d))) return false;
            if (assuntos.size) {
                const doFiltro = [...assuntos].filter(a => qd.includes(a.split('.')[0]));
                // Só filtra assunto nas disciplinas em que algum assunto foi marcado.
                const marcouNaDisc = qd.some(d => [...assuntos].some(a => a.startsWith(`${d}.`)));
                if (marcouNaDisc) {
                    const ok = q.fonte === 'enem' ? doFiltro.includes(`${q.disc}.${q.assunto}`)
                        : doFiltro.some(a => { const [d, s] = a.split('.'); return casaTexto(q, DISCIPLINAS[d].assuntos[s][0]); });
                    if (!ok) return false;
                }
            }
            if (f.busca && !casaTexto(q, f.busca)) return false;
            const r = respondidas[q.id];
            if (f.situacao === 'nao' && r) return false;
            if (f.situacao === 'acertei' && !r?.ok) return false;
            if (f.situacao === 'errei' && (!r || r.ok)) return false;
            if (f.situacao === 'salvas' && !salvas[q.id]) return false;
            return true;
        });
        if (f.ordem === 'aleatoria') return lista.sort((a, b2) => hash(a.id + f.semente) - hash(b2.id + f.semente));
        if (f.ordem === 'antigas') return lista.sort((a, b2) => (a.ano || 9999) - (b2.ano || 9999) || (a.numero || 0) - (b2.numero || 0));
        return lista.sort((a, b2) => (b2.fonte === 'ia') - (a.fonte === 'ia') || (b2.em || 0) - (a.em || 0) || (b2.ano || 0) - (a.ano || 0) || (a.numero || 0) - (b2.numero || 0));
    }

    // De onde vem uma questão do ENEM pelo id (ano, área e língua), para buscar só a prova certa.
    function origemDoId(id) {
        const m = /^enem-(\d{4})-(\d+)(?:-(ingles|espanhol))?$/.exec(String(id));
        if (!m) return null;
        return { ano: Number(m[1]), numero: Number(m[2]), lingua: m[3] || '' };
    }

    // Resumo do desempenho por disciplina e assunto a partir das respostas guardadas.
    function desempenho(respondidas, geradas = []) {
        const porDisc = {}, porAssunto = {};
        for (const [id, r] of Object.entries(respondidas || {})) {
            let disc = r.d, assunto = r.s;
            if (!disc && id.startsWith('ia-')) disc = geradas.find(q => q.id === id)?.disc || '';
            if (!disc) disc = 'outras';
            const linha = porDisc[disc] ||= { total: 0, acertos: 0, erradas: 0 };
            linha.total++; if (r.ok) linha.acertos++; else linha.erradas++;
            if (assunto && DISCIPLINAS[disc]?.assuntos[assunto]) {
                const chave = `${disc}.${assunto}`;
                const la = porAssunto[chave] ||= { total: 0, acertos: 0 };
                la.total++; if (r.ok) la.acertos++;
            }
        }
        const fracos = Object.entries(porAssunto).filter(([, v]) => v.total >= 3).map(([k, v]) => ({ chave: k, ...v, pct: Math.round(v.acertos / v.total * 100) })).sort((a, b) => a.pct - b.pct || b.total - a.total).slice(0, 6);
        return { porDisc, porAssunto, fracos };
    }

    // ----- Estado -----
    const banco = () => {
        const d = dados();
        if (!d.bancoQuestoes || typeof d.bancoQuestoes !== 'object') d.bancoQuestoes = {};
        const b = d.bancoQuestoes;
        if (!b.respondidas || typeof b.respondidas !== 'object') b.respondidas = {};
        if (!b.salvas || typeof b.salvas !== 'object') b.salvas = {};
        if (!Array.isArray(b.geradas)) b.geradas = [];
        return b;
    };
    const FILTROS_PADRAO = { disc: [], assuntos: [], ids: [], anoDe: '', anoAte: '', dia: '', banca: '', origem: '', nivel: '', imagem: '', situacao: '', busca: '', lingua: 'ingles', ordem: 'recentes' };
    const novoFiltro = (base = {}) => ({ ...FILTROS_PADRAO, disc: [], assuntos: [], ids: [], semente: String(Math.random()), ...base });
    const estado = { vista: 'explorar', f: novoFiltro(), limite: POR_PAGINA, carregando: false, erro: '', gerando: false, gerador: false, geradorQtd: 5, geradorNivel: 'medio', geradorBanca: 'ENEM', geradorMateria: '', filtrosAbertos: false, areasAbertas: {} };
    const cartoes = new Map(); // id -> { escolha, respondida, resolucao, dica, carregando }
    const provas = new Map(); // "ano:lingua" -> questões da prova inteira
    let carga = 0;

    // Cada prova (ano) é baixada inteira, em 4 partes: a ordem das áreas mudou em 2017, então a área vem de cada questão.
    function areasNecessarias() {
        const f = estado.f;
        return f.disc.length ? Object.keys(AREAS).filter(a => f.disc.some(d => DISCIPLINAS[d]?.area === a)) : Object.keys(AREAS);
    }
    function provasNecessarias() {
        const f = estado.f;
        const chave = ano => ({ ano, chave: `${ano}:${f.lingua}` });
        const porIds = ids => [...new Set(ids.map(origemDoId).filter(Boolean).map(o => o.ano))].sort((a, b) => b - a).map(chave);
        if (f.ids.length) return porIds(f.ids);
        if (f.origem === 'ia' || (f.banca && f.banca !== 'ENEM') || f.nivel) return [];
        const b = banco();
        const anos = ANOS.filter(a => (!f.anoDe || a >= Number(f.anoDe)) && (!f.anoAte || a <= Number(f.anoAte)));
        if (['errei', 'acertei', 'salvas'].includes(f.situacao)) {
            const ids = f.situacao === 'salvas' ? Object.keys(b.salvas) : Object.entries(b.respondidas).filter(([, r]) => f.situacao === 'acertei' ? r.ok : !r.ok).map(([id]) => id);
            return porIds(ids).filter(p => anos.includes(p.ano));
        }
        return anos.map(chave);
    }

    async function buscarParte(ano, offset, lingua) {
        const url = `${API}/exams/${ano}/questions?limit=50&offset=${offset}`;
        let resposta = await fetch(`${url}&language=${encodeURIComponent(lingua)}`);
        // Algumas provas antigas não aceitam o filtro de língua: busca sem ele.
        if (resposta.status === 400) resposta = await fetch(url);
        if (resposta.status === 429) throw new Error('O banco do ENEM pediu uma pausa. Espere alguns segundos e tente de novo.');
        if (!resposta.ok) return [];
        const corpo = await resposta.json();
        return Array.isArray(corpo?.questions) ? corpo.questions : [];
    }
    async function buscarProva(p) {
        const partes = await Promise.all([0, 50, 100, 150].map(offset => buscarParte(p.ano, offset, estado.f.lingua)));
        const vistas = new Set();
        return partes.flat().map(normalizarEnem).filter(q => q && !vistas.has(q.id) && vistas.add(q.id));
    }

    function todasQuestoes() {
        const areas = new Set(areasNecessarias());
        const lingua = estado.f.lingua;
        const vistas = new Set();
        const enem = [];
        for (const p of provasNecessarias()) for (const q of provas.get(p.chave) || []) {
            if (vistas.has(q.id) || !areas.has(q.area) || (q.lingua && q.lingua !== lingua)) continue;
            vistas.add(q.id); enem.push(q);
        }
        return [...banco().geradas, ...enem];
    }
    const resultado = () => filtrar(todasQuestoes(), estado.f, banco());
    const acharQuestao = id => banco().geradas.find(q => q.id === id) || [...provas.values()].flat().find(q => q.id === id);

    // Baixa uma prova por vez até ter questões suficientes para a página atual.
    async function garantir() {
        if (estado.vista !== 'explorar') return;
        const id = ++carga;
        estado.erro = '';
        while (id === carga) {
            const faltam = provasNecessarias().filter(p => !provas.has(p.chave));
            if (!faltam.length || resultado().length >= estado.limite) break;
            estado.carregando = true; renderLista();
            try {
                provas.set(faltam[0].chave, await buscarProva(faltam[0]));
            } catch (error) {
                if (id === carga) estado.erro = error?.message || 'Não foi possível carregar as questões.';
                break;
            }
        }
        if (id === carga) { estado.carregando = false; renderLista(); }
    }

    // ----- Registro das respostas -----
    function materiaDaQuestao(q) {
        const materias = dados().cycleItems || [];
        if (q.fonte === 'ia') { const m = materias.find(x => String(x.id) === String(q.materiaId)); if (m) return m; }
        const qd = discsDaQuestao(q);
        const candidatas = materias.filter(m => discDaMateria(m).some(d => qd.includes(d)));
        // Prefere a matéria mais específica (ex.: "Geometria" antes de "Matemática").
        return candidatas.sort((a, b) => discDaMateria(a).length - discDaMateria(b).length)[0] || null;
    }

    function registrar(q, escolha) {
        const ok = escolha === q.correta;
        const b = banco();
        const antes = b.respondidas[q.id];
        b.respondidas[q.id] = { ok, em: Date.now(), d: q.disc || discsDaQuestao(q)[0] || '', s: q.assunto || '', n: (Number(antes?.n) || (antes ? 1 : 0)) + 1 };
        const d = dados();
        const materia = materiaDaQuestao(q);
        const campo = ok ? 'acertos' : 'erros';
        if (materia) {
            materia.questoes = (Number(materia.questoes) || 0) + 1;
            materia[campo] = (Number(materia[campo]) || 0) + 1;
        }
        // Um registro por dia e por matéria no histórico, somando as questões do banco.
        if (typeof criarItemHistoricoRegistro === 'function' && Array.isArray(d.historyItems)) {
            const nome = materia ? materia.subject : (DISCIPLINAS[q.disc]?.nome || q.materiaNome || 'Questões');
            const novo = criarItemHistoricoRegistro({ segundos: 0, materia: nome, assunto: 'Banco de questões', cor: materia?.color || '#2563eb', tipo: 'Estudo', comentario: '', atividade: 'estudo' });
            let item = d.historyItems.find(h => h.origem === 'banco-questoes' && h.dataISO === novo.dataISO && h.materia === nome);
            if (!item) { item = Object.assign(novo, { questoes: 0, acertos: 0, erros: 0, subjectId: materia?.id || '', origem: 'banco-questoes' }); d.historyItems.push(item); }
            item.questoes = (Number(item.questoes) || 0) + 1;
            item[campo] = (Number(item[campo]) || 0) + 1;
            item.comentario = `${item.acertos} de ${item.questoes} acertos no banco de questões.`;
        }
        window.saveAppData?.();
        if (typeof renderizarCiclo === 'function') try { renderizarCiclo(); } catch { /* a tela de matérias se atualiza depois */ }
    }

    function alternarSalva(id) {
        const b = banco();
        if (b.salvas[id]) delete b.salvas[id]; else b.salvas[id] = Date.now();
        window.saveAppData?.();
    }

    // Resoluções e dicas das questões ficam só neste aparelho (não pesam na nuvem).
    const CHAVE_IA = 'qg_qb_resolucoes';
    const lerIa = () => { try { return JSON.parse(localStorage.getItem(CHAVE_IA) || '{}') || {}; } catch { return {}; } };
    function guardarIa(chave, texto) {
        try {
            const todas = lerIa();
            todas[chave] = texto;
            const chaves = Object.keys(todas);
            chaves.slice(0, Math.max(0, chaves.length - 150)).forEach(k => delete todas[k]);
            localStorage.setItem(CHAVE_IA, JSON.stringify(todas));
        } catch { /* sem espaço: o texto fica só na tela */ }
    }

    async function pedirIa(q, modo) {
        const c = cartao(q.id);
        if (c.carregando) return;
        const chave = modo === 'dica' ? `dica:${q.id}` : q.id;
        const salva = lerIa()[chave];
        if (salva) { c[modo === 'dica' ? 'dica' : 'resolucao'] = salva; renderCard(q.id); return; }
        c.carregando = modo; renderCard(q.id);
        try {
            await window.kingGeminiReady;
            if (!window.kingGemini?.explainQuestion) throw new Error('A IA não está disponível agora. Entre na sua conta e tente de novo.');
            const texto = await window.kingGemini.explainQuestion({
                mode: modo, question: `${q.contexto.replace(/!\[[^\]]*\]\([^)]*\)/g, '[imagem]')}\n\n${q.introducao}`,
                alternatives: q.alternativas.map(a => a.imagem ? '[alternativa em imagem]' : a.texto),
                correct: LETRAS[q.correta], chosen: c.respondida && c.escolha !== null ? LETRAS[c.escolha] : '', hasImage: !!q.temImagem, exam: q.fonte === 'enem' ? `ENEM ${q.ano}` : `estilo ${q.banca}`,
            });
            c[modo === 'dica' ? 'dica' : 'resolucao'] = texto;
            guardarIa(chave, texto);
        } catch (error) {
            toast(error?.message || 'Não foi possível falar com a IA agora.', true);
        } finally {
            c.carregando = ''; renderCard(q.id);
        }
    }

    // Foto ilustrativa do Openverse (licença livre) para as questões criadas pela IA.
    async function fotoIlustrativa(busca) {
        if (!busca) return null;
        try {
            const resposta = await fetch(`${OPENVERSE}?q=${encodeURIComponent(busca)}&page_size=10&mature=false`);
            if (!resposta.ok) return null;
            const corpo = await resposta.json();
            const f = (Array.isArray(corpo?.results) ? corpo.results : []).find(x => urlSegura(x?.url) && Number(x.width) >= 480 && !/\.(svg|gif)(\?|$)/i.test(x.url));
            return f ? { src: urlSegura(f.url), autor: String(f.creator || '').slice(0, 60), licenca: String(f.license || '').toUpperCase().slice(0, 12), pagina: urlSegura(f.foreign_landing_url) } : null;
        } catch { return null; }
    }

    async function gerarComIa() {
        if (estado.gerando) return;
        const materia = (dados().cycleItems || []).find(m => String(m.id) === String(estado.geradorMateria));
        if (!materia) { toast('Escolha a matéria para a IA criar as questões.', true); return; }
        estado.gerando = true; renderGerador();
        try {
            await window.kingGeminiReady;
            if (!window.kingGemini?.generateMockQuestions) throw new Error('A IA não está disponível agora. Entre na sua conta e tente de novo.');
            const assunto = assuntoDoGerador();
            const ja = banco().geradas.filter(q => String(q.materiaId) === String(materia.id)).slice(0, 15).map(q => q.contexto.slice(0, 160));
            const lista = await window.kingGemini.generateMockQuestions({ subjects: [materia.subject], topics: assunto ? [assunto] : [], count: estado.geradorQtd, level: estado.geradorNivel, banca: estado.geradorBanca, banco: true, avoid: ja });
            if (!lista.length) throw new Error('A IA não trouxe questões válidas. Tente de novo ou mude o assunto.');
            const discs = discDaMateria(materia);
            const novas = lista.map((q, i) => normalizarIa(q, { banca: estado.geradorBanca, nivel: estado.geradorNivel, materiaId: materia.id, discs, area: DISCIPLINAS[discs[0]]?.area || '', assunto }, i));
            const b = banco();
            b.geradas = [...novas, ...b.geradas].slice(0, MAX_GERADAS);
            window.saveAppData?.();
            estado.f = novoFiltro({ lingua: estado.f.lingua, origem: 'ia', disc: discs.slice() });
            estado.gerador = false; estado.limite = POR_PAGINA;
            toast(`${novas.length} questões novas no banco.`);
            // Fotos ilustrativas, uma de cada vez, sem travar a tela.
            (async () => {
                for (const q of novas) {
                    const foto = await fotoIlustrativa(q.busca || q.assuntoNome);
                    if (!foto) continue;
                    const salva = banco().geradas.find(x => x.id === q.id);
                    if (salva) { salva.imagem = foto; renderCard(q.id); }
                }
                window.saveAppData?.();
            })();
        } catch (error) {
            toast(error?.message || 'Não foi possível criar as questões agora.', true);
        } finally {
            estado.gerando = false; render(); garantir();
        }
    }

    function assuntoDoGerador() {
        if (estado.f.busca) return estado.f.busca;
        const marcado = estado.f.assuntos[0];
        if (marcado) { const [d, s] = marcado.split('.'); return DISCIPLINAS[d]?.assuntos[s]?.[0] || ''; }
        return '';
    }

    function excluirGerada(id) {
        const b = banco();
        b.geradas = b.geradas.filter(q => q.id !== id);
        window.saveAppData?.();
        renderLista();
    }

    // ----- Interface -----
    const cartao = id => { if (!cartoes.has(id)) cartoes.set(id, { escolha: null, respondida: false, resolucao: '', dica: '', carregando: '' }); return cartoes.get(id); };
    const chips = (campo, lista, atual) => lista.map(([valor, rotulo]) => `<button type="button" class="qb-chip" data-qb-set="${campo}" data-qb-valor="${esc(valor)}" aria-pressed="${String(valor) === String(atual)}">${esc(rotulo)}</button>`).join('');
    const mesmoConjunto = (a, b) => a.length === b.length && a.every(x => b.includes(x));

    function estatisticas() {
        const b = banco();
        const resp = Object.values(b.respondidas);
        const ok = resp.filter(r => r.ok).length;
        const hoje = new Date(); hoje.setHours(0, 0, 0, 0);
        return { feitas: resp.length, percentual: resp.length ? Math.round(ok / resp.length * 100) : 0, hoje: resp.filter(r => r.em >= hoje.getTime()).length, erradas: resp.length - ok, salvas: Object.keys(b.salvas).length };
    }

    function htmlFiltros() {
        const f = estado.f;
        const materias = (dados().cycleItems || []).filter(m => discDaMateria(m).length);
        const ativos = ['disc', 'assuntos'].reduce((n, k) => n + (f[k].length ? 1 : 0), 0) + ['anoDe', 'anoAte', 'dia', 'banca', 'origem', 'nivel', 'imagem', 'situacao', 'busca'].filter(k => f[k]).length;
        const arvore = Object.entries(AREAS).map(([area, a]) => {
            const discs = discDaArea(area);
            const marcadas = discs.filter(d => f.disc.includes(d)).length;
            const aberta = estado.areasAbertas[area] ?? marcadas > 0;
            return `<div class="qb-tree-area${aberta ? ' is-open' : ''}">
                <button type="button" class="qb-tree-title" data-qb-area-toggle="${area}" aria-expanded="${aberta}"><span>${a.nome}</span>${marcadas ? `<span class="qb-badge">${marcadas}</span>` : ''}</button>
                <div class="qb-tree-body">${discs.map(d => {
                    const marcada = f.disc.includes(d);
                    const assuntos = Object.entries(DISCIPLINAS[d].assuntos);
                    return `<label class="qb-check"><input type="checkbox" data-qb-disc="${d}"${marcada ? ' checked' : ''}><span>${esc(DISCIPLINAS[d].nome)}</span></label>
                        ${marcada && assuntos.length ? `<div class="qb-tree-sub">${assuntos.map(([s, [nome]]) => `<label class="qb-check is-sub"><input type="checkbox" data-qb-assunto="${d}.${s}"${f.assuntos.includes(`${d}.${s}`) ? ' checked' : ''}><span>${esc(nome)}</span></label>`).join('')}</div>` : ''}`;
                }).join('')}</div>
            </div>`;
        }).join('');
        return `<aside class="widget qb-filters${estado.filtrosAbertos ? ' is-open' : ''}" aria-label="Filtros">
            <button type="button" class="qb-filters-toggle" data-qb-toggle-filtros aria-expanded="${estado.filtrosAbertos}">Filtros${ativos ? ` <span class="qb-badge">${ativos}</span>` : ''}</button>
            <div class="qb-filters-body">
                <div class="qb-filters-head"><h3>Filtros</h3>${ativos ? '<button type="button" class="qb-link" data-qb-limpar>Limpar tudo</button>' : ''}</div>
                <label class="qb-field"><span class="qb-label">Palavra no enunciado</span><input class="cycle-input" type="search" data-qb-busca maxlength="80" placeholder="Ex.: fotossíntese, juros" value="${esc(f.busca)}"></label>
                ${materias.length ? `<div class="qb-field"><span class="qb-label">Suas matérias</span><div class="qb-chips">${materias.map(m => `<button type="button" class="qb-chip is-small" data-qb-materia="${esc(m.id)}" aria-pressed="${mesmoConjunto(discDaMateria(m), f.disc)}">${esc(m.subject)}</button>`).join('')}</div></div>` : ''}
                <div class="qb-field"><span class="qb-label">Disciplinas e assuntos</span><div class="qb-tree">${arvore}</div></div>
                <div class="qb-field"><span class="qb-label">Anos</span><div class="qb-row">
                    <select class="cycle-input" data-qb-f="anoDe" aria-label="Ano inicial"><option value="">De 2009</option>${ANOS.slice().reverse().map(a => `<option value="${a}"${String(a) === String(f.anoDe) ? ' selected' : ''}>De ${a}</option>`).join('')}</select>
                    <select class="cycle-input" data-qb-f="anoAte" aria-label="Ano final"><option value="">Até 2023</option>${ANOS.map(a => `<option value="${a}"${String(a) === String(f.anoAte) ? ' selected' : ''}>Até ${a}</option>`).join('')}</select>
                </div></div>
                <div class="qb-field"><span class="qb-label">Dia da prova</span><div class="qb-segment">${chips('dia', [['', 'Os dois'], ['1', '1º dia'], ['2', '2º dia']], f.dia)}</div></div>
                <div class="qb-field"><span class="qb-label">Prova</span><div class="qb-chips">${chips('banca', [['', 'Todas'], ...BANCAS.map(b => [b, b])], f.banca)}</div></div>
                <div class="qb-field"><span class="qb-label">Origem</span><div class="qb-segment">${chips('origem', [['', 'Todas'], ['reais', 'Provas reais'], ['ia', 'Criadas pela IA']], f.origem)}</div></div>
                <div class="qb-field"><span class="qb-label">Nível <small>questões da IA</small></span><div class="qb-segment">${chips('nivel', [['', 'Todos'], ...Object.entries(NIVEIS)], f.nivel)}</div></div>
                <div class="qb-field"><span class="qb-label">Imagens</span><div class="qb-segment">${chips('imagem', [['', 'Tanto faz'], ['com', 'Com imagem'], ['sem', 'Só texto']], f.imagem)}</div></div>
                <div class="qb-field"><span class="qb-label">Situação</span><div class="qb-segment">${chips('situacao', [['', 'Todas'], ['nao', 'Não fiz'], ['errei', 'Errei'], ['acertei', 'Acertei'], ['salvas', '★ Salvas']], f.situacao)}</div></div>
                <label class="qb-field"><span class="qb-label">Língua estrangeira</span><select class="cycle-input" data-qb-f="lingua"><option value="ingles"${f.lingua === 'ingles' ? ' selected' : ''}>Inglês</option><option value="espanhol"${f.lingua === 'espanhol' ? ' selected' : ''}>Espanhol</option></select></label>
            </div>
        </aside>`;
    }

    function htmlGerador() {
        const materias = (dados().cycleItems || []).filter(m => discDaMateria(m).length);
        if (!estado.geradorMateria) {
            const pelaDisc = materias.find(m => estado.f.disc.length && discDaMateria(m).some(d => estado.f.disc.includes(d)));
            estado.geradorMateria = String((pelaDisc || materias[0])?.id || '');
        }
        const assunto = assuntoDoGerador();
        if (!estado.gerador) return `<button type="button" class="qb-gen-open" data-qb-gerador><span class="qb-gen-icon" aria-hidden="true">✦</span><span><strong>Gerar questões com IA</strong><small>Crie questões novas no estilo ENEM, FUVEST, UNICAMP, UNESP ou UERJ, com resolução e imagem ilustrativa</small></span></button>`;
        return `<section class="widget qb-gen" aria-label="Gerar questões com IA">
            <div class="qb-gen-head"><strong>Gerar questões com IA</strong><button type="button" class="qb-link" data-qb-gerador>Fechar</button></div>
            <div class="qb-gen-row">
                <label class="qb-field"><span class="qb-label">Matéria</span><select class="cycle-input" data-qb-gen-materia>${materias.map(m => `<option value="${esc(m.id)}"${String(m.id) === String(estado.geradorMateria) ? ' selected' : ''}>${esc(m.subject)}</option>`).join('')}</select></label>
                <div class="qb-field"><span class="qb-label">Assunto</span><span class="qb-hint">${assunto ? esc(assunto) : 'Todos (marque um assunto ou escreva uma palavra nos filtros)'}</span></div>
            </div>
            <div class="qb-field"><span class="qb-label">Estilo de prova</span><div class="qb-chips">${BANCAS.map(b => `<button type="button" class="qb-chip" data-qb-gen="geradorBanca" data-qb-valor="${b}" aria-pressed="${estado.geradorBanca === b}">${b}</button>`).join('')}</div></div>
            <div class="qb-gen-row">
                <div class="qb-field"><span class="qb-label">Nível</span><div class="qb-segment">${Object.entries(NIVEIS).map(([v, r]) => `<button type="button" class="qb-chip" data-qb-gen="geradorNivel" data-qb-valor="${v}" aria-pressed="${estado.geradorNivel === v}">${r}</button>`).join('')}</div></div>
                <div class="qb-field"><span class="qb-label">Quantidade</span><div class="qb-segment">${[3, 5, 8, 10].map(n => `<button type="button" class="qb-chip" data-qb-gen="geradorQtd" data-qb-valor="${n}" aria-pressed="${estado.geradorQtd === n}">${n}</button>`).join('')}</div></div>
            </div>
            <div class="qb-gen-foot"><small>Questões originais com resolução. Não são questões reais dessas provas.</small><button type="button" class="cycle-btn primary" data-qb-gerar${estado.gerando || !materias.length ? ' disabled' : ''}>${estado.gerando ? 'Criando questões…' : 'Gerar'}</button></div>
        </section>`;
    }

    function htmlCartao(q, n) {
        const c = cartao(q.id);
        const b = banco();
        const anterior = b.respondidas[q.id];
        const salva = !!b.salvas[q.id];
        const disc = DISCIPLINAS[q.disc];
        const tags = q.fonte === 'enem'
            ? [`<span class="qb-tag is-exam">ENEM ${q.ano}</span>`, `<span>Questão ${q.numero}</span>`, `<span>${esc(disc?.nome || AREAS[q.area]?.nome || '')}${disc?.assuntos[q.assunto] ? ` · ${esc(disc.assuntos[q.assunto][0])}` : ''}</span>`]
            : [`<span class="qb-tag is-ai">IA · estilo ${esc(q.banca)}</span>`, `<span>${esc(q.materiaNome || '')}${q.assuntoNome ? ` · ${esc(q.assuntoNome)}` : ''}</span>`, `<span class="qb-level is-${esc(q.nivel)}">${NIVEIS[q.nivel] || ''}</span>`];
        const status = c.respondida || !anterior ? '' : `<span class="qb-done ${anterior.ok ? 'ok' : 'bad'}">${anterior.ok ? 'Acertou' : 'Errou'} em ${dataCurta(anterior.em)}${anterior.n > 1 ? ` · ${anterior.n} tentativas` : ''}</span>`;
        const figuras = q.fonte === 'enem'
            ? (q.arquivos || []).map(u => `<img src="${esc(u)}" alt="Figura da questão" loading="lazy">`).join('')
            : q.imagem?.src ? `<figure class="qb-figure"><img src="${esc(q.imagem.src)}" alt="Imagem ilustrativa: ${esc(q.assuntoNome || '')}" loading="lazy" referrerpolicy="no-referrer" data-qb-foto><figcaption>Imagem ilustrativa${q.imagem.autor ? ` · ${q.imagem.pagina ? `<a href="${esc(q.imagem.pagina)}" target="_blank" rel="noopener">${esc(q.imagem.autor)}</a>` : esc(q.imagem.autor)}` : ''}${q.imagem.licenca ? ` · ${esc(q.imagem.licenca)}` : ''}</figcaption></figure>` : '';
        const corpo = q.fonte === 'enem' ? markdown(q.contexto) : textoIa(q.contexto);
        const alternativas = q.alternativas.map((a, k) => {
            const classes = ['qb-alt'];
            if (c.respondida) { if (k === q.correta) classes.push('is-correct'); else if (k === c.escolha) classes.push('is-wrong'); }
            else if (k === c.escolha) classes.push('is-selected');
            const conteudo = a.imagem ? `<img src="${esc(a.imagem)}" alt="Alternativa ${a.letra}" loading="lazy">` : esc(a.texto);
            return `<button type="button" class="${classes.join(' ')}" data-qb-alt="${k}"${c.respondida ? ' disabled' : ''}><span class="qb-letter">${a.letra}</span><span class="qb-alt-text">${conteudo}</span></button>`;
        }).join('');
        const dica = c.dica ? `<div class="qb-hintbox"><span class="qb-label">💡 Dica</span>${textoIa(c.dica)}</div>` : '';
        let rodape;
        if (!c.respondida) {
            rodape = `${dica}<div class="qb-item-actions">${c.dica ? '' : `<button type="button" class="cycle-btn" data-qb-dica${c.carregando ? ' disabled' : ''}>${c.carregando === 'dica' ? 'Pensando…' : '💡 Me ajude'}</button>`}<button type="button" class="cycle-btn primary" data-qb-responder${c.escolha === null ? ' disabled' : ''}>Responder</button></div>`;
        } else {
            const acertou = c.escolha === q.correta;
            const resolucao = q.fonte === 'ia' ? q.explicacao : c.resolucao;
            const botaoResolucao = q.fonte === 'enem' && !c.resolucao ? `<button type="button" class="cycle-btn" data-qb-resolver${c.carregando ? ' disabled' : ''}>${c.carregando === 'resolucao' ? 'Resolvendo…' : 'Ver resolução'}</button>` : '';
            rodape = `<div class="qb-feedback ${acertou ? 'ok' : 'bad'}"><strong>${acertou ? '✓ Você acertou!' : `✗ Resposta certa: ${LETRAS[q.correta]}`}</strong>${q.fonte === 'enem' ? '<span>Gabarito oficial do Inep</span>' : ''}</div>
                ${resolucao ? `<div class="qb-resolution"><span class="qb-label">Resolução${q.fonte === 'enem' ? ' · explicada pela IA' : ''}</span>${textoIa(resolucao)}</div>` : ''}
                <div class="qb-item-actions">${botaoResolucao}<button type="button" class="cycle-btn" data-qb-refazer>Refazer</button></div>`;
        }
        return `<article class="widget qb-item" data-qb-id="${esc(q.id)}">
            <header class="qb-item-head"><span class="qb-num">${n}</span>${tags.join('')}${status}<span class="qb-item-tools"><button type="button" class="qb-icon-btn${salva ? ' is-on' : ''}" data-qb-salvar aria-pressed="${salva}" title="${salva ? 'Tirar das salvas' : 'Salvar questão'}" aria-label="${salva ? 'Tirar das salvas' : 'Salvar questão'}">${salva ? '★' : '☆'}</button>${q.fonte === 'ia' ? '<button type="button" class="qb-icon-btn" data-qb-excluir title="Tirar do banco" aria-label="Tirar esta questão do banco">×</button>' : ''}</span></header>
            <div class="qb-question">${q.fonte === 'ia' ? figuras : ''}${corpo}${q.fonte === 'enem' ? figuras : ''}${q.introducao ? `<p class="qb-intro">${esc(q.introducao)}</p>` : ''}</div>
            <div class="qb-alts" role="group" aria-label="Alternativas">${alternativas}</div>
            <footer class="qb-item-foot">${rodape}</footer>
        </article>`;
    }

    function htmlVazio(lista) {
        const f = estado.f;
        if (estado.carregando && !lista.length) return '<div class="qb-empty"><span class="qb-spinner" aria-hidden="true"></span><p>Buscando questões nas provas do ENEM…</p></div>';
        if (lista.length || estado.erro) return '';
        const outraBanca = f.banca && f.banca !== 'ENEM';
        const soIa = f.origem === 'ia' || outraBanca || f.nivel;
        const msg = f.situacao === 'salvas' ? 'Nenhuma questão salva com esses filtros. Toque na ☆ de uma questão para guardá-la aqui.'
            : f.situacao === 'errei' ? 'Nenhuma questão errada com esses filtros. Bom sinal!'
            : soIa ? `Ainda não há questões ${outraBanca ? `no estilo ${esc(f.banca)}` : 'criadas pela IA'} com esses filtros.${outraBanca ? ' As provas reais disponíveis são do ENEM.' : ''} Gere algumas com a IA acima.`
            : 'Nenhuma questão com esses filtros. Tire um assunto, amplie os anos ou limpe os filtros.';
        return `<div class="qb-empty"><p>${msg}</p></div>`;
    }

    function htmlResumoFiltros() {
        const f = estado.f;
        const partes = [];
        if (f.ids.length) partes.push(['ids', '', f.ids.length === 1 ? 'Questão escolhida' : `${f.ids.length} questões escolhidas`]);
        f.disc.forEach(d => partes.push(['disc', d, DISCIPLINAS[d].nome]));
        f.assuntos.forEach(a => { const [d, s] = a.split('.'); partes.push(['assuntos', a, DISCIPLINAS[d]?.assuntos[s]?.[0] || a]); });
        if (f.busca) partes.push(['busca', '', `“${f.busca}”`]);
        if (f.anoDe || f.anoAte) partes.push(['anos', '', `${f.anoDe || 2009}–${f.anoAte || 2023}`]);
        if (f.dia) partes.push(['dia', '', `${f.dia}º dia`]);
        if (f.banca) partes.push(['banca', '', f.banca]);
        if (f.origem) partes.push(['origem', '', f.origem === 'ia' ? 'Criadas pela IA' : 'Provas reais']);
        if (f.nivel) partes.push(['nivel', '', NIVEIS[f.nivel]]);
        if (f.imagem) partes.push(['imagem', '', f.imagem === 'com' ? 'Com imagem' : 'Só texto']);
        if (f.situacao) partes.push(['situacao', '', { nao: 'Não fiz', errei: 'Errei', acertei: 'Acertei', salvas: 'Salvas' }[f.situacao]]);
        if (!partes.length) return '';
        return `<div class="qb-active">${partes.map(([campo, valor, rotulo]) => `<button type="button" class="qb-active-chip" data-qb-tirar="${campo}" data-qb-valor="${esc(valor)}" aria-label="Tirar filtro ${esc(rotulo)}">${esc(rotulo)} <span aria-hidden="true">×</span></button>`).join('')}</div>`;
    }

    function htmlLista() {
        const lista = resultado();
        const visiveis = lista.slice(0, estado.limite);
        const necessarias = provasNecessarias();
        const faltam = necessarias.filter(p => !provas.has(p.chave)).length;
        const temMais = lista.length > estado.limite || faltam > 0;
        const contagem = lista.length ? `${lista.length}${faltam ? '+' : ''} ${lista.length === 1 && !faltam ? 'questão' : 'questões'}` : '';
        return `${htmlResumoFiltros()}<div class="qb-list-head"><span>${contagem}${faltam && necessarias.length > 1 ? ` <small>· ${necessarias.length - faltam} de ${necessarias.length} provas lidas</small>` : ''}</span>
                <label class="qb-order">Ordem <select class="cycle-input" data-qb-f="ordem"><option value="recentes"${estado.f.ordem === 'recentes' ? ' selected' : ''}>Mais recentes</option><option value="antigas"${estado.f.ordem === 'antigas' ? ' selected' : ''}>Mais antigas</option><option value="aleatoria"${estado.f.ordem === 'aleatoria' ? ' selected' : ''}>Misturar</option></select></label></div>
            ${estado.erro ? `<div class="qb-error"><span>${esc(estado.erro)}</span><button type="button" class="qb-link" data-qb-mais>Tentar de novo</button></div>` : ''}
            <div class="qb-items">${visiveis.map((q, i) => htmlCartao(q, i + 1)).join('')}</div>
            ${htmlVazio(lista)}
            ${visiveis.length && temMais ? `<div class="qb-more"><button type="button" class="cycle-btn" data-qb-mais${estado.carregando ? ' disabled' : ''}>${estado.carregando ? 'Carregando…' : 'Carregar mais questões'}</button></div>` : ''}`;
    }

    // ----- Minhas questões -----
    function rotuloResposta(id) {
        const o = origemDoId(id);
        if (o) return `ENEM ${o.ano} · questão ${o.numero}`;
        const q = banco().geradas.find(x => x.id === id);
        return q ? `IA · ${q.materiaNome || ''}${q.assuntoNome ? ` · ${q.assuntoNome}` : ''}` : 'Questão criada pela IA (apagada)';
    }

    function htmlMinhas() {
        const b = banco();
        const st = estatisticas();
        if (!st.feitas && !st.salvas) return `<section class="widget qb-mine-empty"><h3>Você ainda não resolveu questões do banco</h3><p>As questões que você responder aparecem aqui, com seu desempenho por disciplina e assunto, o caderno de erros e as questões salvas.</p><button type="button" class="cycle-btn primary" data-qb-vista="explorar">Explorar questões</button></section>`;
        const { porDisc, fracos } = desempenho(b.respondidas, b.geradas);
        const linhas = Object.entries(porDisc).sort((a, b2) => b2[1].total - a[1].total).map(([d, v]) => {
            const pct = Math.round(v.acertos / v.total * 100);
            return `<tr><th scope="row">${esc(DISCIPLINAS[d]?.nome || 'Outras')}</th><td>${v.total}</td><td><span class="qb-bar"><span style="width:${pct}%" class="${pct >= 70 ? 'ok' : pct >= 50 ? 'mid' : 'bad'}"></span></span><strong>${pct}%</strong></td><td>${v.erradas && DISCIPLINAS[d] ? `<button type="button" class="qb-link" data-qb-rever-disc="${d}">Refazer ${v.erradas === 1 ? 'a errada' : `${v.erradas} erradas`}</button>` : ''}</td></tr>`;
        }).join('');
        const recentes = Object.entries(b.respondidas).sort((a, b2) => b2[1].em - a[1].em).slice(0, 12);
        return `<div class="qb-mine">
            <div class="qb-mine-cards">
                <button type="button" class="widget qb-mine-card" data-qb-ir="errei"><span>Caderno de erros</span><strong>${st.erradas}</strong><small>Questões que você errou na última tentativa</small></button>
                <button type="button" class="widget qb-mine-card" data-qb-ir="salvas"><span>★ Salvas</span><strong>${st.salvas}</strong><small>Questões que você guardou para rever</small></button>
                <button type="button" class="widget qb-mine-card" data-qb-ir="acertei"><span>Acertadas</span><strong>${st.feitas - st.erradas}</strong><small>${st.percentual}% de acerto no banco</small></button>
            </div>
            <section class="widget qb-mine-block"><h3>Desempenho por disciplina</h3>
                <table class="qb-table"><thead><tr><th scope="col">Disciplina</th><th scope="col">Feitas</th><th scope="col">Acerto</th><th scope="col"><span class="sr-only">Ações</span></th></tr></thead><tbody>${linhas}</tbody></table>
            </section>
            ${fracos.length ? `<section class="widget qb-mine-block"><h3>Assuntos para reforçar</h3><p class="qb-hint">Assuntos com pelo menos 3 questões feitas, do menor acerto para o maior.</p><ul class="qb-weak">${fracos.map(x => { const [d, s] = x.chave.split('.'); return `<li><span>${esc(DISCIPLINAS[d].assuntos[s][0])} <small>${esc(DISCIPLINAS[d].nome)}</small></span><strong class="${x.pct >= 70 ? 'ok' : x.pct >= 50 ? 'mid' : 'bad'}">${x.pct}%</strong><small>${x.acertos}/${x.total}</small><button type="button" class="qb-link" data-qb-treinar="${x.chave}">Treinar</button></li>`; }).join('')}</ul></section>` : ''}
            <section class="widget qb-mine-block"><h3>Atividade recente</h3><ul class="qb-recent">${recentes.map(([id, r]) => `<li><span class="qb-dot ${r.ok ? 'ok' : 'bad'}" aria-hidden="true"></span><span>${esc(rotuloResposta(id))}${DISCIPLINAS[r.d] ? ` <small>${esc(DISCIPLINAS[r.d].nome)}${DISCIPLINAS[r.d].assuntos[r.s] ? ` · ${esc(DISCIPLINAS[r.d].assuntos[r.s][0])}` : ''}</small>` : ''}</span><small>${r.ok ? 'Acertou' : 'Errou'} · ${dataCurta(r.em)}</small><button type="button" class="qb-link" data-qb-abrir="${esc(id)}">Abrir</button></li>`).join('')}</ul></section>
        </div>`;
    }

    function render() {
        const box = document.getElementById('questoesBanco');
        if (!box) return;
        const rolagem = box.querySelector('.qb-filters')?.scrollTop || 0;
        const st = estatisticas();
        const abas = `<div class="qb-views" role="tablist" aria-label="Banco de questões"><button type="button" role="tab" data-qb-vista="explorar" aria-selected="${estado.vista === 'explorar'}">Explorar</button><button type="button" role="tab" data-qb-vista="minhas" aria-selected="${estado.vista === 'minhas'}">Minhas questões${st.feitas ? ` <span class="qb-badge">${st.feitas}</span>` : ''}</button></div>`;
        box.innerHTML = `<div class="qb-top">
                <div><span class="workspace-kicker">BANCO DE QUESTÕES</span><h2>Questões do ENEM e de vestibulares</h2><p>Filtre por disciplina e assunto, responda direto em cada questão e acompanhe seus erros.</p></div>
                <dl class="qb-stats"><div><dt>Resolvidas</dt><dd>${st.feitas}</dd></div><div><dt>Acerto</dt><dd>${st.feitas ? `${st.percentual}%` : '—'}</dd></div><div><dt>Hoje</dt><dd>${st.hoje}</dd></div></dl>
            </div>${abas}
            ${estado.vista === 'minhas' ? htmlMinhas() : `<div class="qb-layout">${htmlFiltros()}<div class="qb-main"><div id="qbGerador">${htmlGerador()}</div><div id="qbLista">${htmlLista()}</div></div></div>`}`;
        const filtros = box.querySelector('.qb-filters');
        if (filtros) filtros.scrollTop = rolagem;
    }
    function renderLista() { const el = document.getElementById('qbLista'); if (el) el.innerHTML = htmlLista(); }
    function renderGerador() { const el = document.getElementById('qbGerador'); if (el) el.innerHTML = htmlGerador(); }
    function renderCard(id) {
        const el = [...document.querySelectorAll('#questoesBanco .qb-item')].find(x => x.dataset.qbId === id);
        const q = el && acharQuestao(id);
        if (q) el.outerHTML = htmlCartao(q, Number(el.querySelector('.qb-num')?.textContent) || 1);
    }
    function atualizarEstatisticas() {
        const st = estatisticas();
        const dd = document.querySelectorAll('#questoesBanco .qb-stats dd');
        if (dd.length === 3) { dd[0].textContent = st.feitas; dd[1].textContent = st.feitas ? `${st.percentual}%` : '—'; dd[2].textContent = st.hoje; }
    }

    function aplicar(mudanca) {
        mudanca(estado.f);
        estado.limite = POR_PAGINA;
        render();
        garantir();
    }
    const alternar = (lista, valor) => lista.includes(valor) ? lista.filter(x => x !== valor) : [...lista, valor];
    function irPara(base) { estado.vista = 'explorar'; estado.f = novoFiltro({ lingua: estado.f.lingua, ...base }); estado.limite = POR_PAGINA; render(); garantir(); window.scrollTo?.({ top: document.getElementById('questoesBanco')?.offsetTop || 0, behavior: 'smooth' }); }

    // Abas da seção Questões: Banco de questões | Tempo por questão.
    function montar() {
        const secao = document.getElementById('question-timer');
        if (!secao || document.getElementById('questoesBanco')) return;
        const heading = secao.querySelector('.workspace-heading');
        if (heading) {
            const kicker = heading.querySelector('.workspace-kicker'); if (kicker) kicker.textContent = 'TREINO DE PROVA';
            const h1 = heading.querySelector('h1'); if (h1) h1.textContent = 'Questões';
            const p = heading.querySelector('p'); if (p) p.textContent = 'Um banco de questões reais do ENEM e de vestibulares criadas pela IA, filtrado por disciplina e assunto.';
        }
        const abas = document.createElement('div');
        abas.className = 'plan-tabs qb-tabs';
        abas.setAttribute('role', 'tablist'); abas.setAttribute('aria-label', 'Questões');
        abas.innerHTML = '<button type="button" role="tab" data-qb-aba="banco" aria-selected="true">Banco de questões</button><button type="button" role="tab" data-qb-aba="tempo" aria-selected="false">Tempo por questão</button>';
        const box = document.createElement('div');
        box.id = 'questoesBanco';
        box.className = 'qb-root';
        const layout = secao.querySelector('.question-pace-layout');
        (heading || secao.firstElementChild)?.insertAdjacentElement('afterend', abas);
        abas.insertAdjacentElement('afterend', box);
        if (layout) layout.hidden = true;
        render();
    }

    function mostrarAba(aba) {
        const secao = document.getElementById('question-timer');
        if (!secao) return;
        secao.querySelectorAll('[data-qb-aba]').forEach(b => b.setAttribute('aria-selected', String(b.dataset.qbAba === aba)));
        const layout = secao.querySelector('.question-pace-layout');
        if (layout) layout.hidden = aba !== 'tempo';
        document.getElementById('questoesBanco').hidden = aba !== 'banco';
        if (aba === 'banco') { render(); garantir(); }
    }

    document.addEventListener('click', event => {
        const alvo = event.target.closest('button');
        if (!alvo || !alvo.closest('#question-timer')) return;
        const d = alvo.dataset;
        if (d.qbAba) return mostrarAba(d.qbAba);
        if (!alvo.closest('#questoesBanco')) return;
        if (d.qbVista) { estado.vista = d.qbVista; render(); return garantir(); }
        if (d.qbSet) return aplicar(f => { f[d.qbSet] = d.qbValor; f.ids = []; if (d.qbSet === 'ordem' && d.qbValor === 'aleatoria') f.semente = String(Math.random()); });
        if (d.qbTirar) return aplicar(f => {
            if (d.qbTirar === 'disc') { f.disc = f.disc.filter(x => x !== d.qbValor); f.assuntos = f.assuntos.filter(a => !a.startsWith(`${d.qbValor}.`)); }
            else if (d.qbTirar === 'assuntos') f.assuntos = f.assuntos.filter(x => x !== d.qbValor);
            else if (d.qbTirar === 'ids') f.ids = [];
            else if (d.qbTirar === 'anos') { f.anoDe = ''; f.anoAte = ''; }
            else f[d.qbTirar] = '';
        });
        if (d.qbMateria) {
            const m = (dados().cycleItems || []).find(x => String(x.id) === d.qbMateria);
            const discs = discDaMateria(m);
            estado.geradorMateria = d.qbMateria;
            discs.forEach(x => { estado.areasAbertas[DISCIPLINAS[x].area] = true; });
            return aplicar(f => { const igual = mesmoConjunto(discs, f.disc); f.disc = igual ? [] : discs.slice(); f.assuntos = []; f.ids = []; });
        }
        if (d.qbAreaToggle) { const area = d.qbAreaToggle; const aberta = alvo.getAttribute('aria-expanded') === 'true'; estado.areasAbertas[area] = !aberta; alvo.closest('.qb-tree-area')?.classList.toggle('is-open', !aberta); alvo.setAttribute('aria-expanded', String(!aberta)); return; }
        if (d.qbGen) { estado[d.qbGen] = d.qbGen === 'geradorQtd' ? Number(d.qbValor) : d.qbValor; return renderGerador(); }
        if (alvo.hasAttribute('data-qb-gerador')) { estado.gerador = !estado.gerador; return renderGerador(); }
        if (alvo.hasAttribute('data-qb-gerar')) return gerarComIa();
        if (alvo.hasAttribute('data-qb-limpar')) return aplicar(f => Object.assign(f, novoFiltro({ lingua: f.lingua, ordem: f.ordem, semente: f.semente })));
        if (alvo.hasAttribute('data-qb-toggle-filtros')) { estado.filtrosAbertos = !estado.filtrosAbertos; alvo.closest('.qb-filters')?.classList.toggle('is-open', estado.filtrosAbertos); alvo.setAttribute('aria-expanded', String(estado.filtrosAbertos)); return; }
        if (alvo.hasAttribute('data-qb-mais')) { if (!estado.erro) estado.limite += POR_PAGINA; renderLista(); return garantir(); }
        if (d.qbIr) return irPara({ situacao: d.qbIr });
        if (d.qbReverDisc) return irPara({ situacao: 'errei', disc: [d.qbReverDisc] });
        if (d.qbTreinar) { const [disc] = d.qbTreinar.split('.'); estado.areasAbertas[DISCIPLINAS[disc].area] = true; return irPara({ disc: [disc], assuntos: [d.qbTreinar] }); }
        if (d.qbAbrir) return irPara({ ids: [d.qbAbrir] });
        const item = alvo.closest('.qb-item');
        if (!item) return;
        const q = acharQuestao(item.dataset.qbId);
        if (!q) return;
        const c = cartao(q.id);
        if (d.qbAlt !== undefined) { if (!c.respondida) { c.escolha = Number(d.qbAlt); renderCard(q.id); } }
        else if (alvo.hasAttribute('data-qb-responder')) { if (c.escolha === null || c.respondida) return; c.respondida = true; registrar(q, c.escolha); renderCard(q.id); atualizarEstatisticas(); }
        else if (alvo.hasAttribute('data-qb-refazer')) { c.escolha = null; c.respondida = false; renderCard(q.id); }
        else if (alvo.hasAttribute('data-qb-resolver')) pedirIa(q, 'resolucao');
        else if (alvo.hasAttribute('data-qb-dica')) pedirIa(q, 'dica');
        else if (alvo.hasAttribute('data-qb-salvar')) { alternarSalva(q.id); renderCard(q.id); }
        else if (alvo.hasAttribute('data-qb-excluir')) { if (window.confirm('Tirar esta questão criada pela IA do seu banco?')) excluirGerada(q.id); }
    });
    document.addEventListener('change', event => {
        const t = event.target;
        if (!t.closest?.('#questoesBanco')) return;
        if (t.matches('[data-qb-disc]')) return aplicar(f => { f.disc = alternar(f.disc, t.dataset.qbDisc); if (!t.checked) f.assuntos = f.assuntos.filter(a => !a.startsWith(`${t.dataset.qbDisc}.`)); f.ids = []; });
        if (t.matches('[data-qb-assunto]')) return aplicar(f => { f.assuntos = alternar(f.assuntos, t.dataset.qbAssunto); f.ids = []; });
        if (t.matches('[data-qb-gen-materia]')) { estado.geradorMateria = t.value; return; }
        if (t.matches('select[data-qb-f]')) aplicar(f => { f[t.dataset.qbF] = t.value; if (t.dataset.qbF === 'ordem' && t.value === 'aleatoria') f.semente = String(Math.random()); if (t.dataset.qbF !== 'ordem') f.ids = []; });
    });
    let esperaBusca = null;
    document.addEventListener('input', event => {
        const t = event.target;
        if (!t.matches?.('#questoesBanco input[data-qb-busca]')) return;
        clearTimeout(esperaBusca);
        esperaBusca = setTimeout(() => { estado.f.busca = t.value.trim().slice(0, 80); estado.f.ids = []; estado.limite = POR_PAGINA; renderLista(); renderGerador(); garantir(); }, 350);
    });
    // Foto ilustrativa que não carregou: some do cartão.
    document.addEventListener('error', event => { if (event.target?.matches?.('#questoesBanco img[data-qb-foto]')) event.target.closest('.qb-figure')?.remove(); }, true);
    window.addEventListener('king-master-section', event => { if (event.detail === 'question-timer') { montar(); render(); garantir(); } });
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', montar, { once: true }); else montar();

    window.KingQuestoesBanco = Object.freeze({ markdown, textoIa, normalizarEnem, classificar, filtrar, discDaMateria, casaTexto, origemDoId, desempenho, mostrarAba, AREAS, DISCIPLINAS });
})();
