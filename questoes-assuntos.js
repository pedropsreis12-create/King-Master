/* Árvore de assuntos do banco de questões: disciplina → tema → subtema, com palavras típicas de cada subtema.
   Serve para classificar questões do ENEM e de vestibulares e para os filtros da aba Questões.
   As palavras são comparadas sem acento e em minúsculas, pelo começo da palavra ("genetic" acha "genética"). */
(function (raiz) {
    'use strict';
    const T = (nome, subs) => ({ nome, subs });
    const DISCIPLINAS = {
        portugues: { nome: 'Português', area: 'linguagens', temas: {
            interpretacao: T('Interpretação de texto', {
                tese: ['Tese e argumentação', 'tese argument ponto de vista posicionamento opiniao defende persuas'],
                inferencia: ['Inferência e pressupostos', 'inferir infere pressupost subentend implicit sugere depreende'],
                intertexto: ['Intertextualidade', 'intertext parodia parafrase alusao citacao dialoga com'],
            }),
            generos: T('Gêneros textuais', {
                jornalisticos: ['Notícia, reportagem e opinião', 'noticia reportagem editorial artigo de opiniao entrevista jornal manchete'],
                publicidade: ['Publicidade e propaganda', 'anuncio propaganda publicitari campanha slogan consumidor marca'],
                quadrinhos: ['Charge, tirinha e quadrinhos', 'charge tirinha quadrinho cartum meme'],
                digitais: ['Gêneros digitais e internet', 'internet rede social redes sociais blog post digital tuite hashtag aplicativo'],
                instrucionais: ['Gêneros do cotidiano', 'receita manual bula verbete carta oficio requerimento curriculo'],
            }),
            variacao: T('Variação linguística', {
                regional: ['Variação regional e social', 'regional dialet sotaque giria variacao linguistic variedade'],
                norma: ['Norma-padrão e preconceito linguístico', 'norma padrao norma culta preconceito linguistic coloquial informal formal'],
            }),
            funcoes: T('Funções da linguagem', {
                funcoes: ['Funções da linguagem', 'funcao da linguagem metalinguag conativ apelativ referencial poetica fatic emotiv expressiva'],
            }),
            gramatica: T('Gramática', {
                classes: ['Classes de palavras', 'substantivo adjetivo adverbio pronome preposicao artigo numeral interjeicao'],
                verbos: ['Verbos', 'verbo verbal tempo verbal modo subjuntivo imperativo gerundio infinitivo'],
                sintaxe: ['Sintaxe, concordância e regência', 'sujeito predicado oracao concordancia regencia crase sintatic subordinad coordenad'],
                coesao: ['Coesão e conectivos', 'coesao coesivo conectivo conjuncao referenciacao anafor retomada'],
                semantica: ['Semântica e figuras de linguagem', 'metafora metonimia ironia hiperbole antitese figura de linguagem polissemia ambiguidade sinonim conotativ denotativ eufemismo'],
                ortografia: ['Pontuação e ortografia', 'pontuacao virgula ortografi acentuacao hifen'],
            }),
        } },
        literatura: { nome: 'Literatura', area: 'linguagens', temas: {
            colonial: T('Literatura colonial', {
                quinhentismo: ['Quinhentismo', 'quinhentism carta de caminha caminha jesuit anchieta catequese'],
                barroco: ['Barroco', 'barroco barroca gregorio de matos padre vieira vieira cultismo conceptismo'],
                arcadismo: ['Arcadismo', 'arcadismo arcade bucolic tomas antonio gonzaga claudio manuel basilio da gama marilia de dirceu'],
            }),
            xix: T('Século XIX', {
                romantismo: ['Romantismo', 'romantismo romantic indianismo ultrarromant jose de alencar alencar goncalves dias alvares de azevedo castro alves'],
                realismo: ['Realismo e Naturalismo', 'realismo realista naturalismo naturalista machado de assis machado aluisio azevedo eca de queiros dom casmurro bras cubas'],
                parnasianismo: ['Parnasianismo e Simbolismo', 'parnasian olavo bilac simbolismo simbolista cruz e sousa alphonsus'],
            }),
            xx: T('Século XX e contemporânea', {
                premodernismo: ['Pré-modernismo', 'pre-modernismo euclides da cunha os sertoes lima barreto monteiro lobato augusto dos anjos'],
                modernismo: ['Modernismo de 1922', 'semana de arte moderna 1922 oswald de andrade mario de andrade antropofag macunaima manifesto'],
                geracao30: ['Geração de 30', 'graciliano rachel de queiroz jorge amado drummond cecilia meireles vinicius regionalismo vidas secas'],
                geracao45: ['Geração de 45 e pós', 'guimaraes rosa clarice lispector joao cabral grande sertao'],
                contemporanea: ['Literatura contemporânea', 'contemporane conceicao evaristo poesia marginal slam carolina maria de jesus'],
            }),
            generos: T('Gêneros literários', {
                poesia: ['Poesia', 'poema poeta poesia verso versos estrofe rima soneto lirico eu lirico'],
                prosa: ['Prosa e narrativa', 'romance conto novela narrador personagem enredo foco narrativo'],
                cronica: ['Crônica', 'cronica cronista'],
                teatro: ['Teatro', 'teatro dramaturg peca teatral'],
            }),
        } },
        ingles: { nome: 'Inglês', area: 'linguagens', temas: {
            leitura: T('Leitura em inglês', {
                compreensao: ['Compreensão de texto', 'texto text according author autor objetivo purpose main idea informa'],
                vocabulario: ['Vocabulário e expressões', 'significa meaning refers word palavra expressao termo vocabul traduz'],
                generos: ['Gêneros em inglês', 'cartoon comic tirinha poem poema lyrics cancao song anuncio advertisement'],
            }),
        } },
        espanhol: { nome: 'Espanhol', area: 'linguagens', temas: {
            leitura: T('Leitura em espanhol', {
                compreensao: ['Compreensão de texto', 'texto autor objetivo informa segun articulo'],
                vocabulario: ['Vocabulário e expressões', 'significa palabra palavra expresion expressao termo vocabul'],
                generos: ['Gêneros em espanhol', 'vineta tirinha poema cancion cancao anuncio'],
            }),
        } },
        artes: { nome: 'Artes', area: 'linguagens', temas: {
            visuais: T('Artes visuais', {
                vanguardas: ['Vanguardas e arte moderna', 'cubismo surrealismo expressionismo impressionismo futurismo dadaismo vanguarda abstracionismo picasso'],
                contemporanea: ['Arte contemporânea e urbana', 'performance instalacao grafite arte urbana arte contemporanea intervencao'],
                brasileira: ['Arte brasileira', 'tarsila portinari anita malfatti di cavalcanti aleijadinho hélio oiticica oiticica lygia clark'],
                patrimonio: ['Patrimônio e cultura popular', 'patrimonio folclore artesanato cultura popular arte indigena afro-brasileira'],
            }),
            musica: T('Música', {
                musica: ['Música', 'musica musical cancao samba bossa nova tropicalia rap funk compositor melodia'],
            }),
            cenicas: T('Teatro, dança e cinema', {
                teatro: ['Teatro e dança', 'teatro danca coreograf espetaculo'],
                cinema: ['Cinema e fotografia', 'cinema filme fotografia audiovisual'],
            }),
        } },
        educacaoFisica: { nome: 'Educação Física', area: 'linguagens', temas: {
            praticas: T('Práticas corporais', {
                esportes: ['Esportes', 'esporte esportiv atleta olimpi futebol competicao paralimpi'],
                lutas: ['Lutas e danças', 'capoeira luta lutas danca judo'],
                jogos: ['Jogos e brincadeiras', 'jogo jogos brincadeira ludic'],
            }),
            saude: T('Corpo e saúde', {
                saude: ['Atividade física e saúde', 'atividade fisica exercicio sedentar obesidade condicionamento treinamento saude'],
                corpo: ['Corpo, mídia e padrões', 'padrao de beleza corpo ideal doping anabolizante imagem corporal'],
            }),
        } },
        historia: { nome: 'História', area: 'humanas', temas: {
            antiguidade: T('Antiguidade', {
                prehistoria: ['Pré-história', 'pre-historia paleolitico neolitico revolucao agricola'],
                oriente: ['Egito e Mesopotâmia', 'egito egipci mesopotamia hamurabi fenici hebreu persa'],
                grecia: ['Grécia antiga', 'grecia grego gregos atenas esparta polis democracia atenien helenis'],
                roma: ['Roma antiga', 'roma romano romanos romana patricio plebeu'],
            }),
            medieval: T('Idade Média', {
                feudalismo: ['Feudalismo', 'feudal feudalismo feudo senhor servo vassal suserano'],
                igreja: ['Igreja medieval e Cruzadas', 'igreja catolica cruzada inquisicao papa clero medieval'],
                islam: ['Islã e Bizâncio', 'isla islamismo muculman arabe bizanti constantinopla'],
                baixa: ['Baixa Idade Média', 'burgo burguesia comercial peste negra renascimento comercial'],
            }),
            moderna: T('Idade Moderna', {
                navegacoes: ['Grandes navegações', 'navegacoes expansao maritima descobrimento colombo cabral'],
                renascimento: ['Renascimento', 'renascimento renascentista humanismo da vinci'],
                reformas: ['Reformas religiosas', 'reforma protestante lutero calvino contrarreforma'],
                absolutismo: ['Absolutismo e mercantilismo', 'absolutismo absolutista mercantilismo luis xiv'],
                iluminismo: ['Iluminismo', 'iluminismo iluminista voltaire montesquieu enciclopedia despotismo esclarecido'],
            }),
            contemporanea: T('Idade Contemporânea', {
                revfrancesa: ['Revolução Francesa e Napoleão', 'revolucao francesa jacobin girondin bastilha napoleao napoleonic'],
                revindustrial: ['Revolução Industrial', 'revolucao industrial maquinofatura ludismo cartismo fabrica operario'],
                imperialismo: ['Imperialismo e neocolonialismo', 'imperialismo neocolonialismo partilha da africa conferencia de berlim'],
                primeiraguerra: ['Primeira Guerra Mundial', 'primeira guerra mundial 1914 tratado de versalhes triplice'],
                revrussa: ['Revolução Russa e socialismo', 'revolucao russa bolchevique lenin stalin socialismo sovietic urss'],
                totalitarismos: ['Crise de 1929 e totalitarismos', 'crise de 1929 grande depressao nazismo nazista fascismo fascista hitler mussolini totalitar'],
                segundaguerra: ['Segunda Guerra Mundial', 'segunda guerra mundial holocausto 1939 1945 bomba atomica'],
                guerrafria: ['Guerra Fria', 'guerra fria bipolar corrida armamentista muro de berlim cortina de ferro cuba vietna'],
                descolonizacao: ['Descolonização da África e Ásia', 'descolonizacao independencia da india apartheid gandhi mandela'],
                atual: ['Mundo atual', 'globalizacao neoliberal terrorismo 11 de setembro primavera arabe'],
            }),
            america: T('História da América', {
                precolombianos: ['Povos pré-colombianos', 'asteca maia inca pre-colombian'],
                colonizacao: ['Colonização espanhola e inglesa', 'colonizacao espanhola encomienda mita treze colonias'],
                independencias: ['Independências e EUA', 'independencia dos estados unidos bolivar haiti secessao doutrina monroe'],
                latina: ['América Latina no século XX', 'revolucao cubana revolucao mexicana peronismo pinochet ditaduras latino'],
            }),
            colonia: T('Brasil Colônia', {
                indigenas: ['Povos indígenas', 'indigena indios tupi aldeamento'],
                economia: ['Economia colonial', 'acucar engenho pau-brasil ouro mineracao ciclo do ouro capitania sesmaria'],
                escravidao: ['Escravidão e resistência', 'escravid escravizad escravo quilombo palmares trafico negreiro africanos'],
                revoltas: ['Revoltas coloniais', 'inconfidencia conjuracao emboabas beckman mascates tiradentes revolta revoltas'],
            }),
            imperio: T('Brasil Império', {
                independencia: ['Independência do Brasil', 'independencia do brasil 1822 grito do ipiranga pedro i'],
                regencia: ['Primeiro Reinado e Regência', 'primeiro reinado regencia regencial cabanagem farroupilha balaiada sabinada males'],
                segundoreinado: ['Segundo Reinado', 'segundo reinado pedro ii cafe cafeicultura guerra do paraguai'],
                abolicao: ['Abolição', 'abolicao abolicionis lei aurea ventre livre sexagenario eusebio de queiros'],
            }),
            republica: T('Brasil República', {
                velha: ['República Velha', 'republica velha primeira republica oligarquia cafe com leite coronelismo canudos contestado revolta da vacina tenentismo'],
                vargas: ['Era Vargas', 'vargas getulio estado novo revolucao de 1930 clt'],
                democratica: ['República Democrática (1945–1964)', 'juscelino kubitschek jango goulart janio quadros populismo brasilia'],
                ditadura: ['Ditadura Militar', 'ditadura militar golpe de 1964 ai-5 regime militar censura diretas ja milagre economico'],
                novarepublica: ['Nova República', 'redemocratiz constituicao de 1988 collor impeachment plano real constituinte'],
            }),
        } },
        geografia: { nome: 'Geografia', area: 'humanas', temas: {
            cartografia: T('Cartografia', {
                escala: ['Escala, coordenadas e fusos', 'escala latitude longitude coordenada fuso horario meridiano'],
                projecoes: ['Mapas e projeções', 'projecao cartograf mapa cartograma mercator peters anamorfose'],
                geotecnologias: ['Geotecnologias', 'gps sensoriamento satelite georreferenc imagem de satelite'],
            }),
            fisica: T('Geografia física', {
                relevo: ['Relevo e geologia', 'relevo placa tecton vulcao terremoto rocha intemperismo planalto planicie'],
                clima: ['Clima', 'clima climatic massa de ar el nino chuva precipitac temperatura umidade frente fria'],
                hidrografia: ['Hidrografia', 'rio rios bacia hidrograf aquifero agua doce oceano'],
                biomas: ['Biomas e vegetação', 'bioma cerrado caatinga amazonia mata atlantica pampa pantanal vegetacao floresta'],
                solos: ['Solos', 'solo solos laterizacao assoreamento erosao voçoroca'],
            }),
            ambiente: T('Meio ambiente', {
                problemas: ['Problemas ambientais', 'desmatamento queimada poluicao lixo residuo contaminacao'],
                clima: ['Mudanças climáticas', 'aquecimento global mudanca climatica efeito estufa carbono acordo de paris protocolo de kyoto'],
                conservacao: ['Conservação e sustentabilidade', 'unidade de conservacao sustentab preservacao desenvolvimento sustentavel'],
            }),
            humana: T('População e cidades', {
                populacao: ['População e demografia', 'demograf natalidade mortalidade envelhecimento piramide etaria populacao'],
                migracoes: ['Migrações', 'migracao migrante migratori refugiad exodo xenofob'],
                urbanizacao: ['Urbanização', 'urbaniz metropole favela segregacao mobilidade urbana cidade periferia'],
            }),
            agrario: T('Espaço agrário', {
                agro: ['Agronegócio e agricultura', 'agricultura agronegocio agropecuar monocultura commodit soja transgenic'],
                questao: ['Questão agrária', 'latifundio reforma agraria sem-terra conflito no campo estrutura fundiaria'],
            }),
            economia: T('Economia e globalização', {
                industria: ['Indústria', 'industria industrializ fordismo toyotismo fabrica'],
                energia: ['Energia', 'energia petroleo hidreletrica matriz energetica renovavel eolica solar pre-sal'],
                transportes: ['Transportes e comunicação', 'transporte rodovia ferrovia hidrovia logistica'],
                globalizacao: ['Globalização e comércio', 'globalizacao multinacional comercio bloco economico mercosul uniao europeia omc'],
            }),
            geopolitica: T('Geopolítica', {
                conflitos: ['Conflitos atuais', 'conflito guerra terrorismo israel palestina oriente medio ucrania'],
                ordem: ['Ordem mundial', 'ordem mundial bipolar multipolar onu otan brics g20'],
            }),
            regional: T('Brasil regional', {
                regioes: ['Regiões brasileiras', 'nordeste centro-oeste sudeste regiao norte regiao sul regiao geoeconomica amazonia legal'],
            }),
        } },
        filosofia: { nome: 'Filosofia', area: 'humanas', temas: {
            antiga: T('Filosofia antiga', {
                presocraticos: ['Pré-socráticos e sofistas', 'pre-socratic heraclito parmenides sofista tales de mileto'],
                platao: ['Sócrates e Platão', 'socrates socratic platao platonic mito da caverna'],
                aristoteles: ['Aristóteles', 'aristoteles aristotelic'],
                helenistica: ['Filosofia helenística', 'estoic epicur ceticism'],
            }),
            medieval: T('Filosofia medieval', {
                medieval: ['Agostinho e Tomás de Aquino', 'agostinho tomas de aquino escolastic patristic fe e razao'],
            }),
            moderna: T('Filosofia moderna', {
                racionalismo: ['Racionalismo e empirismo', 'descartes cartesian racionalis empiris bacon hume locke'],
                contratualistas: ['Contratualistas', 'hobbes rousseau contrato social estado de natureza leviata'],
                maquiavel: ['Maquiavel e o poder', 'maquiavel principe'],
                kant: ['Iluminismo e Kant', 'kant imperativo categorico esclarecimento'],
            }),
            contemporanea: T('Filosofia contemporânea', {
                marx: ['Marx e a crítica social', 'marx alienacao mais-valia materialismo historico'],
                nietzsche: ['Nietzsche', 'nietzsche super-homem niilismo'],
                existencialismo: ['Existencialismo', 'sartre existencialis kierkegaard beauvoir'],
                frankfurt: ['Escola de Frankfurt', 'adorno horkheimer benjamin industria cultural habermas'],
                poder: ['Foucault, Arendt e o poder', 'foucault arendt biopoder disciplinar banalidade do mal'],
            }),
            temas: T('Temas da filosofia', {
                etica: ['Ética e moral', 'etica moral virtude dever utilitaris'],
                conhecimento: ['Teoria do conhecimento e ciência', 'epistemolog conhecimento verdade ciencia popper kuhn metodo cientifico'],
                estetica: ['Estética', 'estetica belo arte e beleza'],
                politica: ['Filosofia política', 'politica poder estado democracia cidadania justica'],
            }),
        } },
        sociologia: { nome: 'Sociologia', area: 'humanas', temas: {
            classicos: T('Clássicos da sociologia', {
                durkheim: ['Durkheim', 'durkheim fato social anomia solidariedade mecanica solidariedade organica'],
                weber: ['Weber', 'weber acao social burocracia tipo ideal dominacao'],
                marx: ['Marx', 'marx luta de classes burguesia proletariado mais-valia'],
            }),
            trabalho: T('Trabalho e sociedade', {
                trabalho: ['Mundo do trabalho', 'trabalho emprego desemprego precarizacao uberizacao terceirizacao fordismo'],
            }),
            cultura: T('Cultura e identidade', {
                cultura: ['Cultura e diversidade', 'cultura etnocentrismo relativismo cultural diversidade identidade'],
                consumo: ['Indústria cultural e consumo', 'industria cultural consumo consumismo massa'],
            }),
            desigualdade: T('Desigualdades', {
                racial: ['Racismo e questão racial', 'racismo racial negro preconceito discriminacao'],
                genero: ['Gênero e feminismo', 'genero feminismo machismo mulher mulheres lgbt'],
                social: ['Desigualdade social', 'desigualdade pobreza exclusao renda'],
            }),
            politica: T('Política e cidadania', {
                cidadania: ['Cidadania e direitos', 'cidadania direitos humanos democracia participacao'],
                movimentos: ['Movimentos sociais', 'movimentos sociais movimento social sindicato protesto'],
                midia: ['Mídia, tecnologia e sociedade', 'midia internet redes sociais fake news tecnologia'],
                violencia: ['Violência', 'violencia criminalidade seguranca publica'],
            }),
        } },
        biologia: { nome: 'Biologia', area: 'natureza', temas: {
            celula: T('Célula', {
                bioquimica: ['Bioquímica', 'proteina carboidrato lipidio vitamina enzima aminoacido sais minerais'],
                citologia: ['Citologia', 'celula celular membrana organela mitocondri ribossom nucleo citoplasm lisossom'],
                divisao: ['Divisão celular', 'mitose meiose divisao celular'],
                metabolismo: ['Metabolismo energético', 'fotossintese respiracao celular fermentacao atp glicolise'],
            }),
            genetica: T('Genética', {
                mendel: ['Genética mendeliana', 'mendel alelo dominante recessivo heredograma genotipo fenotipo grupo sanguineo heranca'],
                dna: ['DNA e biotecnologia', 'dna rna gene genes mutacao cromossom transcricao traducao codigo genetico clonagem transgenic crispr pcr terapia genica'],
            }),
            evolucao: T('Evolução', {
                evolucao: ['Teorias evolutivas', 'darwin lamarck selecao natural especiacao adaptacao fossil evolucao evolutiv'],
            }),
            ecologia: T('Ecologia', {
                cadeias: ['Cadeias alimentares e energia', 'cadeia alimentar teia alimentar nivel trofico produtor consumidor decompositor'],
                relacoes: ['Relações ecológicas', 'predacao parasitismo mutualismo competicao comensalismo simbiose'],
                ciclos: ['Ciclos biogeoquímicos', 'ciclo do carbono ciclo do nitrogenio ciclo da agua biogeoquim'],
                impactos: ['Impactos ambientais', 'poluicao eutrofizacao desmatamento bioacumulacao especie invasora aquecimento global'],
                populacoes: ['Populações e sucessão', 'populacao comunidade sucessao ecologica biodiversidade nicho habitat'],
            }),
            seres: T('Seres vivos', {
                botanica: ['Botânica', 'planta plantas flor semente raiz folha xilema floema angiosperma gimnosperma briofita pteridofita'],
                zoologia: ['Zoologia', 'invertebrado vertebrado artropode inseto anfibio reptil aves mamifero peixe'],
                microbiologia: ['Vírus, bactérias e fungos', 'bacteria virus fungo protozoario microrganismo'],
            }),
            humano: T('Corpo humano e saúde', {
                fisiologia: ['Fisiologia humana', 'digestao circulacao coracao pulmao rim excrecao sistema nervoso hormonio endocrin'],
                imunologia: ['Imunologia e vacinas', 'vacina anticorpo antigeno imunidade imunologic soro'],
                doencas: ['Doenças e saúde pública', 'doenca dengue malaria chagas epidemia pandemia verminose infeccao parasita'],
                reproducao: ['Reprodução e embriologia', 'reproducao gameta fecundacao embriao anticoncepcional gravidez'],
            }),
        } },
        quimica: { nome: 'Química', area: 'natureza', temas: {
            geral: T('Química geral', {
                atomistica: ['Atomística', 'atomo atomic modelo atomico rutherford bohr eletron proton neutron isotopo'],
                tabela: ['Tabela periódica', 'tabela periodica eletronegatividade raio atomico familia'],
                ligacoes: ['Ligações e interações', 'ligacao ionica covalente metalica polaridade polar geometria molecular forcas intermoleculares ponte de hidrogenio'],
                misturas: ['Substâncias e misturas', 'destilacao filtracao decantacao mistura homogenea heterogenea separacao de misturas'],
            }),
            inorganica: T('Química inorgânica', {
                funcoes: ['Ácidos, bases, sais e óxidos', 'acido base sal oxido ph neutraliz indicador'],
                reacoes: ['Reações químicas', 'reacao quimica balanceamento precipitado'],
            }),
            fisicoquimica: T('Físico-química', {
                estequiometria: ['Estequiometria', 'mol mols massa molar estequiom rendimento pureza avogadro'],
                solucoes: ['Soluções', 'solucao solucoes concentracao solubilidade diluicao ppm'],
                coligativas: ['Propriedades coligativas', 'ebulioscop crioscop osmose pressao de vapor tonoscop'],
                termoquimica: ['Termoquímica', 'entalpia endoterm exoterm calor de reacao combustao'],
                cinetica: ['Cinética química', 'velocidade de reacao catalisador energia de ativacao'],
                equilibrio: ['Equilíbrio químico', 'equilibrio quimico le chatelier constante de equilibrio kps tampao'],
                eletroquimica: ['Eletroquímica', 'pilha eletrolise oxidacao reducao potencial de reducao corrosao galvaniz bateria'],
                radioatividade: ['Radioatividade', 'radioativ meia-vida fissao fusao nuclear decaimento'],
            }),
            organica: T('Química orgânica', {
                funcoes: ['Funções orgânicas', 'alcool aldeido cetona ester eter amina amida acido carboxilico hidrocarboneto organic'],
                isomeria: ['Isomeria', 'isomero isomeria quiral'],
                reacoes: ['Reações orgânicas', 'esterificacao saponificacao polimerizacao reacao de adicao reacao de substituicao'],
                polimeros: ['Polímeros', 'polimero plastico borracha polietileno'],
            }),
            ambiental: T('Química ambiental', {
                ambiental: ['Química e meio ambiente', 'chuva acida camada de ozonio tratamento de agua poluente biocombustivel efeito estufa'],
            }),
        } },
        fisica: { nome: 'Física', area: 'natureza', temas: {
            mecanica: T('Mecânica', {
                cinematica: ['Cinemática', 'velocidade aceleracao movimento uniforme queda livre lancamento trajetoria deslocamento'],
                dinamica: ['Leis de Newton', 'forca newton atrito peso normal plano inclinado tracao'],
                energia: ['Energia e trabalho', 'energia cinetica energia potencial trabalho potencia conservacao da energia'],
                impulso: ['Impulso e colisões', 'impulso quantidade de movimento colisao'],
                gravitacao: ['Gravitação', 'gravitacao kepler orbita satelite'],
                hidrostatica: ['Estática e hidrostática', 'torque alavanca pressao empuxo densidade pascal arquimedes stevin'],
            }),
            termo: T('Termologia', {
                calorimetria: ['Calor e temperatura', 'temperatura calor calor especifico calor latente mudanca de estado termometr'],
                dilatacao: ['Dilatação térmica', 'dilatacao'],
                termodinamica: ['Termodinâmica', 'gas ideal transformacao gasosa maquina termica entropia rendimento termodinam'],
            }),
            optica: T('Óptica', {
                geometrica: ['Óptica geométrica', 'reflexao refracao espelho lente olho miopia indice de refracao'],
                luz: ['Luz e cores', 'luz cor cores prisma dispersao'],
            }),
            ondas: T('Ondulatória', {
                ondas: ['Ondas', 'onda ondas frequencia comprimento de onda periodo interferencia difracao'],
                acustica: ['Acústica e som', 'som sonor eco doppler ressonancia decibel'],
            }),
            eletricidade: T('Eletricidade', {
                eletrostatica: ['Eletrostática', 'carga eletrica eletrizacao campo eletrico coulomb potencial eletrico para-raios'],
                eletrodinamica: ['Circuitos elétricos', 'corrente eletrica resistencia resistor circuito tensao voltagem potencia eletrica consumo kwh chuveiro lampada'],
                magnetismo: ['Magnetismo e indução', 'ima campo magnetico inducao faraday motor eletrico gerador transformador'],
            }),
            moderna: T('Física moderna', {
                moderna: ['Física moderna', 'relatividade foton efeito fotoeletrico quantic raio x laser'],
            }),
        } },
        matematica: { nome: 'Matemática', area: 'matematica', temas: {
            aritmetica: T('Aritmética', {
                porcentagem: ['Porcentagem e juros', 'porcentagem percentual desconto aumento juros lucro taxa reajuste parcela parcelas prestacao financiamento rendimento investimento'],
                razao: ['Razão, proporção e regra de três', 'razao proporcao proporcional regra de tres grandeza diretamente inversamente escala maquete'],
                medidas: ['Unidades de medida', 'unidade de medida conversao litro litros mililitro metro metros cubico quilometro quilometros centimetro centimetros milimetro grama gramas quilograma tonelada horas minutos'],
                numeros: ['Números e operações', 'multiplo divisor mdc mmc primo fracao fracoes decimal notacao cientifica potencia numero numeros inteiro inteiros soma produto divisao algarismo'],
            }),
            algebra: T('Álgebra', {
                equacoes: ['Equações e inequações', 'equacao sistema de equacoes inequacao'],
                funcoes: ['Funções', 'funcao afim funcao linear funcao quadratica parabola vertice funcao exponencial grafico da funcao'],
                logaritmos: ['Logaritmos e exponenciais', 'logaritmo exponencial'],
                sequencias: ['Progressões', 'progressao aritmetica progressao geometrica sequencia termo geral'],
                matrizes: ['Matrizes e sistemas lineares', 'matriz determinante sistema linear'],
            }),
            contagem: T('Contagem e lógica', {
                combinatoria: ['Análise combinatória', 'combinatoria arranjo permutacao combinacao anagrama principio fundamental da contagem'],
                logica: ['Lógica', 'logica proposicao'],
            }),
        } },
        geometria: { nome: 'Geometria', area: 'matematica', temas: {
            plana: T('Geometria plana', {
                areas: ['Áreas e perímetros', 'area perimetro triangulo quadrado retangulo losango trapezio poligono'],
                angulos: ['Ângulos, semelhança e Pitágoras', 'angulo semelhanca tales pitagoras congruencia'],
                circulo: ['Círculo e circunferência', 'circulo circunferencia diametro arco setor'],
                simetria: ['Simetria e transformações', 'simetria rotacao translacao homotetia ladrilhamento'],
            }),
            espacial: T('Geometria espacial', {
                volumes: ['Volumes e sólidos', 'volume cubo paralelepipedo prisma cilindro cone piramide esfera solido'],
                vistas: ['Vistas e planificações', 'planificacao vista superior vista frontal projecao ortogonal'],
            }),
            trigonometria: T('Trigonometria', {
                trigonometria: ['Trigonometria', 'seno cosseno tangente trigonometr'],
            }),
            analitica: T('Geometria analítica', {
                analitica: ['Plano cartesiano', 'plano cartesiano coordenada distancia entre pontos equacao da reta'],
            }),
        } },
        estatistica: { nome: 'Estatística e probabilidade', area: 'matematica', temas: {
            estatistica: T('Estatística', {
                medidas: ['Média, mediana e moda', 'media mediana moda media aritmetica media ponderada'],
                dispersao: ['Desvio padrão e variância', 'desvio padrao variancia amplitude dispersao'],
                graficos: ['Gráficos e tabelas', 'grafico tabela histograma infografico'],
            }),
            probabilidade: T('Probabilidade', {
                probabilidade: ['Probabilidade', 'probabilidade chance sorteio evento espaco amostral aleatori'],
            }),
        } },
    };
    // Palavras genéricas de frases como "regra de três" não contam (aparecem em qualquer texto).
    const GENERICAS = new Set(['de', 'da', 'do', 'dos', 'das', 'e', 'a', 'o', 'com', 'entre', 'tres', 'segundo', 'sistema', 'obra', 'plano', 'pontos', 'termo', 'padrao', 'campo', 'base', 'carga', 'social', 'texto', 'regiao', 'reacao', 'quimica', 'mundial', 'guerra', 'revolucao', 'geral', 'grafico', 'funcao', 'media', 'energia', 'imagem', 'vista', 'teoria', 'idade', 'alta', 'baixa', 'brasil']);
    const norm = v => String(v || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
    const escapar = p => p.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    function regex(palavras) {
        const termos = norm(palavras).trim().split(/\s+/).filter(p => p.length >= 2 && !GENERICAS.has(p));
        return termos.length ? new RegExp(`\\b(?:${termos.map(escapar).join('|')})`, 'g') : null;
    }
    const REGEX = {};      // "disc.tema.sub" -> regex
    const REGEX_DISC = {}; // disc -> regex de todas as palavras
    for (const [d, disc] of Object.entries(DISCIPLINAS)) {
        const todas = [];
        // Palavra que aparece em mais de um subtema da disciplina não decide sozinha (ex.: "república").
        const usos = new Map();
        const subs = Object.entries(disc.temas).flatMap(([t, tema]) => Object.entries(tema.subs).map(([s, [, p]]) => [t, s, p]));
        for (const [, , p] of subs) new Set(norm(p).split(/\s+/)).forEach(w => usos.set(w, (usos.get(w) || 0) + 1));
        for (const [t, s, p] of subs) {
            REGEX[`${d}.${t}.${s}`] = regex(norm(p).split(/\s+/).filter(w => usos.get(w) === 1).join(' '));
            todas.push(p);
        }
        REGEX_DISC[d] = regex(todas.join(' '));
    }
    const VAGAS_TEMA = new Set(['brasil', 'idade', 'historia', 'geografia', 'literatura', 'seculo', 'xix', 'xx', 'contemporanea', 'leitura', 'em', 'temas', 'filosofia', 'quimica', 'fisica']);
    const REGEX_TEMA = {}; // disc -> { tema: regex do nome }
    for (const [d, disc] of Object.entries(DISCIPLINAS)) {
        REGEX_TEMA[d] = {};
        for (const [t, tema] of Object.entries(disc.temas)) {
            const termos = norm(tema.nome).split(/[^a-z0-9-]+/).filter(p => p.length >= 3 && !GENERICAS.has(p) && !VAGAS_TEMA.has(p));
            if (termos.length) REGEX_TEMA[d][t] = new RegExp(`\\b(?:${termos.map(escapar).join('|')})`, 'g');
        }
    }
    const contar = (texto, re) => re ? (texto.match(re) || []).length : 0;
    const discDaArea = area => Object.keys(DISCIPLINAS).filter(d => DISCIPLINAS[d].area === area);

    // Melhor subtema de uma disciplina para um texto. Devolve "tema.sub" ou "".
    // Nomes de tema usados nas tags dos vestibulares.
    const APELIDOS_TEMA = {
        historia: { antiguidade: ['idade antiga', 'antiguidade'], medieval: ['idade media'], moderna: ['idade moderna'], contemporanea: ['idade contemporanea'],
            america: ['historia da america', 'america'], colonia: ['periodo colonial', 'brasil colonia'], imperio: ['brasil imperio', 'imperio (1822', 'periodo imperial', 'imperio'], republica: ['republica (1889', 'brasil republica', 'republica'] },
        geografia: { fisica: ['fisico', 'geografia fisica'], cartografia: ['cartografia'], ambiente: ['meio ambiente'], economia: ['economia'], geopolitica: ['geopolitica'],
            humana: ['populacao', 'sociedade', 'urbanizacao'], agrario: ['agrario', 'agricultura', 'campo'], regional: ['geografia regional', 'regiao'] },
    };
    const temNome = (t, nome) => t.includes(norm(nome));
    function subtema(disc, texto, minimo = 1) {
        const t = norm(texto);
        let melhor = '', pontos = 0;
        for (const [tId, tema] of Object.entries(DISCIPLINAS[disc]?.temas || {})) for (const [sId, [nome]] of Object.entries(tema.subs)) {
            const chave = `${disc}.${tId}.${sId}`;
            // O nome exato do subtema (ex.: "Segundo Reinado") vale mais que palavras soltas.
            const n = contar(t, REGEX[chave]) + (temNome(t, nome) ? 5 : 0);
            if (n > pontos) { melhor = `${tId}.${sId}`; pontos = n; }
        }
        if (pontos >= minimo) return melhor;
        // Sem subtema: tenta ao menos o tema, pelo nome ou apelido ("Idade Média" -> "medieval.").
        const apelidos = APELIDOS_TEMA[disc] || {};
        for (const [tId, tema] of Object.entries(DISCIPLINAS[disc]?.temas || {})) if (temNome(t, tema.nome) || (apelidos[tId] || []).some(a => t.includes(a))) return `${tId}.`;
        let tema = '', melhorTema = 0;
        for (const [id, re] of Object.entries(REGEX_TEMA[disc] || {})) {
            const n = contar(t, re);
            if (n > melhorTema) { tema = id; melhorTema = n; }
        }
        return tema ? `${tema}.` : '';
    }
    // Melhor disciplina dentro de uma área (ou entre as dadas) para um texto.
    function disciplina(texto, candidatas) {
        const t = norm(texto);
        let melhor = '', pontos = 0;
        for (const d of candidatas) {
            const n = contar(t, REGEX_DISC[d]);
            if (n > pontos) { melhor = d; pontos = n; }
        }
        return { disc: melhor, pontos };
    }
    const nomeSub = (disc, chave) => { const [t, s] = String(chave || '').split('.'); return DISCIPLINAS[disc]?.temas[t]?.subs[s]?.[0] || ''; };
    const nomeTema = (disc, chave) => DISCIPLINAS[disc]?.temas[String(chave || '').split('.')[0]]?.nome || '';

    raiz.KingQuestoesAssuntos = Object.freeze({ DISCIPLINAS, norm, subtema, disciplina, discDaArea, nomeSub, nomeTema });
})(typeof window !== 'undefined' ? window : globalThis);
