/**
 * KingRankV2 — motor puro de progressão, ligas, temporadas, missões e conquistas.
 *
 * INTEGRAÇÃO (este arquivo não altera appData nem a interface sozinho):
 * 1. Carregue este script antes de script.js. A API fica em window.KingRankV2.
 * 2. Depois de carregar appData, execute:
 *      const result = KingRankV2.migrate(appData, {
 *        now: Date.now(),
 *        utcOffsetMinutes: -new Date().getTimezoneOffset()
 *      });
 *      appData = result.appData;
 *    Persista appData quando result.report.changed for true.
 * 3. Só registre XP depois que a ação real for salva. Use um id estável ligado ao
 *    registro de origem para impedir duplicidade, por exemplo:
 *      const result = KingRankV2.record(appData, {
 *        id: `history:${historyItem.id}:minutes`,
 *        type: 'study_minutes', quantity: 50, occurredAt: historyItem.id,
 *        dateKey: historyItem.dataISO, source: 'history'
 *      }, { now: Date.now(), utcOffsetMinutes: -new Date().getTimezoneOffset() });
 *      appData = result.appData;
 * 4. Antes de renderizar conquistas, chame syncAchievements e persista o retorno.
 *    snapshot(appData, options) fornece um modelo pronto para UI, sem inventar
 *    adversários: o ranking é local até existir um placar autenticado no servidor.
 *
 * Todas as funções públicas são puras: recebem dados e devolvem novos objetos.
 * O cliente aplica limites, deduplicação e validação para evitar erros/acidentes,
 * mas não é uma autoridade antifraude. Um ranking público exige validação no backend.
 */
(function (root, factory) {
    const api = factory();
    if (typeof module !== 'undefined' && module.exports) module.exports = api;
    root.KingRankV2 = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
    'use strict';

    const VERSION = 2;
    const STATE_KEY = 'rankV2';
    const DAY = 86400000;
    const MAX_LEVEL = 100;
    const MAX_LIFETIME_XP = 100000000;
    const MAX_HISTORY = 360;
    const MAX_EVENT_IDS = 6000;
    const MAX_BUCKET_DAYS = 150;
    const MAX_SEASONS = 24;
    const MAX_CLAIMS = 1000;
    const MAX_BACKDATE_DAYS = 31;
    const LEGACY_XP_CAP = 1000000;

    const ACTIONS = {
        study_minutes: { label: 'Minutos de foco', xpPerUnit: 7, maxPerEvent: 240, dailyCapUnits: 600, qualifiesDay: true },
        study_session: { label: 'Sessão concluída', xpPerUnit: 40, maxPerEvent: 1, dailyCapUnits: 8, qualifiesDay: true },
        questions_answered: { label: 'Questões respondidas', xpPerUnit: 3, maxPerEvent: 250, dailyCapUnits: 250 },
        questions_correct: { label: 'Questões corretas', xpPerUnit: 7, maxPerEvent: 200, dailyCapUnits: 200 },
        review_completed: { label: 'Revisão concluída', xpPerUnit: 60, maxPerEvent: 1, dailyCapUnits: 30, qualifiesDay: true },
        flashcard_reviewed: { label: 'Flashcard revisado', xpPerUnit: 12, maxPerEvent: 120, dailyCapUnits: 120 },
        error_logged: { label: 'Erro diagnosticado', xpPerUnit: 50, maxPerEvent: 1, dailyCapUnits: 10 },
        error_mastered: { label: 'Erro dominado', xpPerUnit: 180, maxPerEvent: 1, dailyCapUnits: 5 },
        essay_completed: { label: 'Redação concluída', xpPerUnit: 1000, maxPerEvent: 1, dailyCapUnits: 2, qualifiesDay: true },
        mock_exam_completed: { label: 'Simulado concluído', xpPerUnit: 300, maxPerEvent: 1, dailyCapUnits: 2, qualifiesDay: true },
        topic_mastered: { label: 'Tópico dominado', xpPerUnit: 200, maxPerEvent: 1, dailyCapUnits: 20 },
        schedule_block_completed: { label: 'Bloco do cronograma concluído', xpPerUnit: 80, maxPerEvent: 1, dailyCapUnits: 12, qualifiesDay: true },
        daily_login: { label: 'Presença diária', xpPerUnit: 100, maxPerEvent: 1, dailyCapUnits: 1 }
    };

    const LEAGUES = [
        { key: 'bronze', name: 'Bronze', start: 0, span: 800, divisions: 4, color: '#b7794b' },
        { key: 'copper', name: 'Cobre', start: 800, span: 1000, divisions: 4, color: '#d47a45' },
        { key: 'silver', name: 'Prata', start: 1800, span: 1400, divisions: 4, color: '#aab7c4' },
        { key: 'gold', name: 'Ouro', start: 3200, span: 1800, divisions: 4, color: '#f3ba3e' },
        { key: 'platinum', name: 'Platina', start: 5000, span: 2200, divisions: 4, color: '#56d6c5' },
        { key: 'diamond', name: 'Diamante', start: 7200, span: 2800, divisions: 4, color: '#78b7ff' },
        { key: 'master', name: 'Mestre', start: 10000, span: 4000, divisions: 4, color: '#b478ff' },
        { key: 'legend', name: 'Lenda', start: 14000, span: null, divisions: 1, color: '#ff657a' }
    ];

    const LEGACY_LEVEL_MARKS = [
        { level: 1, xp: 0 }, { level: 3, xp: 4500 }, { level: 6, xp: 9000 },
        { level: 9, xp: 15000 }, { level: 12, xp: 25000 }, { level: 16, xp: 40000 },
        { level: 20, xp: 60000 }, { level: 24, xp: 85000 }, { level: 28, xp: 115000 },
        { level: 32, xp: 155000 }, { level: 37, xp: 210000 }, { level: 42, xp: 280000 },
        { level: 47, xp: 370000 }, { level: 52, xp: 480000 }, { level: 58, xp: 610000 },
        { level: 64, xp: 750000 }, { level: 70, xp: 1000000 }
    ];

    const TITLES = {
        militar: [
            [1, 'Soldado do Foco'], [3, 'Cabo da Constância'], [6, 'Terceiro-Sargento da Rotina'],
            [9, 'Segundo-Sargento da Tática'], [12, 'Primeiro-Sargento da Estratégia'],
            [16, 'Subtenente da Persistência'], [20, 'Aspirante-a-Oficial'],
            [24, 'Segundo-Tenente da Execução'], [28, 'Primeiro-Tenente da Precisão'],
            [32, 'Capitão do Cronograma'], [37, 'Major da Evolução'], [42, 'Tenente-Coronel da Operação'],
            [47, 'Coronel da Excelência'], [52, 'General de Brigada do Saber'],
            [58, 'General de Divisão da Mestria'], [64, 'General de Exército do Saber'],
            [70, 'Marechal Supremo do ENEM'], [80, 'Comandante da Alta Performance'],
            [90, 'Estrategista Lendário'], [100, 'Guardião Supremo do Conhecimento']
        ],
        aura: [
            [1, 'Genin do Foco'], [3, 'Chunin'], [6, 'Caçador de Oni'], [9, 'Gear Second'],
            [12, 'Kaioken'], [16, 'Super Saiyajin'], [20, 'Bankai'], [24, 'Expansão de Domínio'],
            [28, 'Modo Sábio'], [32, 'Oito Portões Internos'], [37, 'Sol da Libertação'],
            [42, 'Monarca das Sombras'], [47, 'Instinto Superior'], [52, 'Titã Fundador'],
            [58, 'Deus da Destruição'], [64, 'Haki do Rei Supremo'],
            [70, 'Entidade Absoluta do ENEM'], [80, 'Arquiteto do Infinito'],
            [90, 'Soberano das Dimensões'], [100, 'Consciência Suprema']
        ]
    };

    // Metas são cumulativas e derivadas de registros reais; cada faixa tem exatamente dez marcos.
    // O campo icon usa nomes do catálogo Material Symbols Rounded.
    const ACHIEVEMENT_TIERS = [
        ['facil', 'Fácil', [
            ['focus-5h', 'Primeira base', 'Acumule 5 horas de estudo.', 'studyMinutes', 300, 'timer'],
            ['questions-50', 'Primeiro lote', 'Registre 50 questões respondidas.', 'questionsAnswered', 50, 'quiz'],
            ['reviews-10', 'Voltar para fixar', 'Conclua 10 revisões.', 'reviewsCompleted', 10, 'history_edu'],
            ['cards-30', 'Memória em treino', 'Revise 30 flashcards.', 'flashcardsReviewed', 30, 'style'],
            ['logged-errors-10', 'Olhar crítico', 'Registre 10 erros para estudar.', 'errorsLogged', 10, 'troubleshoot'],
            ['mastered-errors-3', 'Correção de rota', 'Domine 3 erros registrados.', 'errorsMastered', 3, 'verified'],
            ['essays-2', 'Primeiras versões', 'Registre 2 redações.', 'essays', 2, 'edit_note'],
            ['mocks-2', 'Ensaio de prova', 'Conclua 2 simulados.', 'mockExams', 2, 'fact_check'],
            ['topics-5', 'Cinco pilares', 'Domine 5 assuntos.', 'topicsMastered', 5, 'menu_book'],
            ['days-5', 'Cinco dias reais', 'Estude em 5 dias diferentes.', 'activeDays', 5, 'calendar_month']
        ]],
        ['normal', 'Normal', [
            ['focus-15h', 'Ritmo estabelecido', 'Acumule 15 horas de estudo.', 'studyMinutes', 900, 'timer'],
            ['questions-150', 'Caderno de treino', 'Registre 150 questões.', 'questionsAnswered', 150, 'quiz'],
            ['reviews-30', 'Memória constante', 'Conclua 30 revisões.', 'reviewsCompleted', 30, 'history_edu'],
            ['cards-100', 'Baralho tático', 'Revise 100 flashcards.', 'flashcardsReviewed', 100, 'style'],
            ['logged-errors-25', 'Mapa dos tropeços', 'Registre 25 erros.', 'errorsLogged', 25, 'troubleshoot'],
            ['mastered-errors-10', 'Padrões vencidos', 'Domine 10 erros registrados.', 'errorsMastered', 10, 'verified'],
            ['essays-5', 'Voz em formação', 'Registre 5 redações.', 'essays', 5, 'edit_note'],
            ['mocks-5', 'Veterano de prova', 'Conclua 5 simulados.', 'mockExams', 5, 'fact_check'],
            ['topics-15', 'Território conhecido', 'Domine 15 assuntos.', 'topicsMastered', 15, 'menu_book'],
            ['streak-7', 'Semana de disciplina', 'Alcance 7 dias seguidos de estudo.', 'bestStreak', 7, 'local_fire_department']
        ]],
        ['media', 'Média', [
            ['focus-50h', 'Zona de profundidade', 'Acumule 50 horas de estudo.', 'studyMinutes', 3000, 'timer'],
            ['questions-500', 'Campo de provas', 'Registre 500 questões.', 'questionsAnswered', 500, 'quiz'],
            ['reviews-100', 'Retenção sólida', 'Conclua 100 revisões.', 'reviewsCompleted', 100, 'history_edu'],
            ['cards-300', 'Arquivo ativo', 'Revise 300 flashcards.', 'flashcardsReviewed', 300, 'style'],
            ['logged-errors-60', 'Diagnóstico profundo', 'Registre 60 erros.', 'errorsLogged', 60, 'troubleshoot'],
            ['mastered-errors-25', 'Ajuste fino', 'Domine 25 erros registrados.', 'errorsMastered', 25, 'verified'],
            ['essays-12', 'Escrita consistente', 'Registre 12 redações.', 'essays', 12, 'edit_note'],
            ['mocks-12', 'Simulação frequente', 'Conclua 12 simulados.', 'mockExams', 12, 'fact_check'],
            ['topics-40', 'Mapa expandido', 'Domine 40 assuntos.', 'topicsMastered', 40, 'menu_book'],
            ['accuracy-80-300', 'Precisão sustentada', 'Tenha 80% de acerto após 300 questões.', 'accuracy', 80, 'target', ['questionsAnswered', 300]]
        ]],
        ['dificil', 'Difícil', [
            ['focus-150h', 'Centurião do foco', 'Acumule 150 horas de estudo.', 'studyMinutes', 9000, 'timer'],
            ['questions-1500', 'Treino de elite', 'Registre 1.500 questões.', 'questionsAnswered', 1500, 'quiz'],
            ['reviews-300', 'Memória blindada', 'Conclua 300 revisões.', 'reviewsCompleted', 300, 'history_edu'],
            ['cards-1000', 'Mil cartões', 'Revise 1.000 flashcards.', 'flashcardsReviewed', 1000, 'style'],
            ['logged-errors-150', 'Auditoria pessoal', 'Registre 150 erros.', 'errorsLogged', 150, 'troubleshoot'],
            ['mastered-errors-60', 'Erros superados', 'Domine 60 erros registrados.', 'errorsMastered', 60, 'verified'],
            ['essays-30', 'Autor disciplinado', 'Registre 30 redações.', 'essays', 30, 'edit_note'],
            ['mocks-25', 'Resistência de prova', 'Conclua 25 simulados.', 'mockExams', 25, 'fact_check'],
            ['topics-100', 'Cem assuntos', 'Domine 100 assuntos.', 'topicsMastered', 100, 'menu_book'],
            ['streak-30', 'Mês de constância', 'Alcance 30 dias seguidos de estudo.', 'bestStreak', 30, 'local_fire_department']
        ]],
        ['muito_dificil', 'Muito difícil', [
            ['focus-400h', 'Maratona do conhecimento', 'Acumule 400 horas de estudo.', 'studyMinutes', 24000, 'timer'],
            ['questions-4000', 'Quatro mil decisões', 'Registre 4.000 questões.', 'questionsAnswered', 4000, 'quiz'],
            ['reviews-800', 'Memória de longo prazo', 'Conclua 800 revisões.', 'reviewsCompleted', 800, 'history_edu'],
            ['cards-2500', 'Arquivista da memória', 'Revise 2.500 flashcards.', 'flashcardsReviewed', 2500, 'style'],
            ['league-legend', 'Lenda da temporada', 'Alcance a Liga Lenda em uma temporada.', 'bestLeagueIndex', 7, 'workspace_premium'],
            ['mastered-errors-150', 'Padrões dominados', 'Domine 150 erros registrados.', 'errorsMastered', 150, 'verified'],
            ['essays-60', 'Oficina de escrita', 'Registre 60 redações.', 'essays', 60, 'edit_note'],
            ['mocks-50', 'Ritmo de competição', 'Conclua 50 simulados.', 'mockExams', 50, 'fact_check'],
            ['topics-250', 'Atlas completo', 'Domine 250 assuntos.', 'topicsMastered', 250, 'menu_book'],
            ['accuracy-90', 'Precisão extraordinária', 'Tenha 90% de acerto após 1.000 questões.', 'accuracy', 90, 'target', ['questionsAnswered', 1000]]
        ]]
    ];
    const ACHIEVEMENTS = ACHIEVEMENT_TIERS.flatMap(([tier, tierLabel, items]) => items.map(([id, title, description, metric, goal, icon, minMetric]) => ({
        id, title, description, metric, goal, icon, minMetric, tier, tierLabel
    })));

    const DAILY_MISSION_POOL = [
        { key: 'questions', title: 'Campo de questões', description: goal => `Responder ${goal} questões`, type: 'questions_answered', goals: [10, 15, 25], rewards: [55, 75, 110] },
        { key: 'reviews', title: 'Memória em dia', description: goal => `Concluir ${goal} ${goal === 1 ? 'revisão' : 'revisões'}`, type: 'review_completed', goals: [1, 2, 3], rewards: [60, 90, 120] },
        { key: 'cards', title: 'Rajada de flashcards', description: goal => `Revisar ${goal} flashcards`, type: 'flashcard_reviewed', goals: [10, 15, 25], rewards: [55, 75, 110] },
        { key: 'errors', title: 'Aprender com o erro', description: () => 'Diagnosticar um erro real', type: 'error_logged', goals: [1], rewards: [70] },
        { key: 'blocks', title: 'Plano em execução', description: goal => `Concluir ${goal} blocos planejados`, type: 'schedule_block_completed', goals: [1, 2, 3], rewards: [60, 90, 120] },
        { key: 'sessions', title: 'Ritmo de operação', description: goal => `Concluir ${goal} ${goal === 1 ? 'sessão' : 'sessões'}`, type: 'study_session', goals: [1, 2, 3], rewards: [55, 85, 115] }
    ];

    const WEEKLY_MISSION_POOL = [
        { key: 'focus', title: 'Campanha de foco', description: goal => `Estudar ${Math.round(goal / 60)} horas na semana`, type: 'study_minutes', goals: [240, 360, 480], rewards: [220, 300, 400] },
        { key: 'questions', title: 'Ofensiva de questões', description: goal => `Responder ${goal} questões na semana`, type: 'questions_answered', goals: [75, 100, 150], rewards: [220, 300, 400] },
        { key: 'reviews', title: 'Linha de retenção', description: goal => `Concluir ${goal} revisões na semana`, type: 'review_completed', goals: [7, 10, 15], rewards: [200, 270, 360] },
        { key: 'cards', title: 'Arquivo de memória', description: goal => `Revisar ${goal} flashcards na semana`, type: 'flashcard_reviewed', goals: [50, 75, 100], rewards: [200, 270, 360] },
        { key: 'blocks', title: 'Semana sob comando', description: goal => `Concluir ${goal} blocos planejados`, type: 'schedule_block_completed', goals: [8, 12, 16], rewards: [220, 300, 400] }
    ];

    const isObject = value => Boolean(value) && typeof value === 'object' && !Array.isArray(value);
    const finite = (value, fallback = 0) => Number.isFinite(Number(value)) ? Number(value) : fallback;
    const integer = (value, fallback = 0) => Math.round(finite(value, fallback));
    const clamp = (value, min, max) => Math.max(min, Math.min(max, finite(value, min)));
    const validDateKey = value => /^\d{4}-(0[1-9]|1[0-2])-([0-2]\d|3[01])$/.test(String(value || '')) && !Number.isNaN(Date.parse(`${value}T00:00:00Z`));
    const clone = value => value === undefined ? undefined : JSON.parse(JSON.stringify(value));
    const nowValue = options => Math.max(0, integer(options?.now, Date.now()));
    const offsetValue = options => clamp(integer(options?.utcOffsetMinutes, 0), -840, 840);

    function deepFreeze(value) {
        if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
        Object.freeze(value);
        Object.values(value).forEach(deepFreeze);
        return value;
    }

    function hash(input) {
        let value = 2166136261;
        const text = String(input ?? '');
        for (let index = 0; index < text.length; index++) {
            value ^= text.charCodeAt(index);
            value = Math.imul(value, 16777619);
        }
        return (value >>> 0).toString(36);
    }

    function dateKeyFromTimestamp(timestamp, utcOffsetMinutes = 0) {
        const date = new Date(finite(timestamp, 0) + finite(utcOffsetMinutes, 0) * 60000);
        if (Number.isNaN(date.getTime())) return '';
        return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}-${String(date.getUTCDate()).padStart(2, '0')}`;
    }

    function timestampFromDateKey(dateKey) {
        if (!validDateKey(dateKey)) return NaN;
        return Date.parse(`${dateKey}T00:00:00Z`);
    }

    function addDays(dateKey, amount) {
        const timestamp = timestampFromDateKey(dateKey);
        return Number.isFinite(timestamp) ? dateKeyFromTimestamp(timestamp + integer(amount) * DAY, 0) : '';
    }

    function dayOfWeek(dateKey) {
        const timestamp = timestampFromDateKey(dateKey);
        return Number.isFinite(timestamp) ? new Date(timestamp).getUTCDay() : -1;
    }

    function seasonFor(timestamp = Date.now(), options = {}) {
        const offset = offsetValue(options);
        const local = new Date(finite(timestamp, Date.now()) + offset * 60000);
        const year = local.getUTCFullYear();
        const month = local.getUTCMonth();
        const startAt = Date.UTC(year, month, 1) - offset * 60000;
        const endAt = Date.UTC(year, month + 1, 1) - offset * 60000;
        const id = `${year}-${String(month + 1).padStart(2, '0')}`;
        return {
            id,
            label: new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(new Date(Date.UTC(year, month, 1))),
            startAt,
            endAt,
            utcOffsetMinutes: offset
        };
    }

    function weekStart(dateKey) {
        const weekday = dayOfWeek(dateKey);
        if (weekday < 0) return '';
        const delta = weekday === 0 ? -6 : 1 - weekday;
        return addDays(dateKey, delta);
    }

    function buildLevelThresholds() {
        const thresholds = Array(MAX_LEVEL + 1).fill(0);
        for (let index = 0; index < LEGACY_LEVEL_MARKS.length - 1; index++) {
            const current = LEGACY_LEVEL_MARKS[index];
            const next = LEGACY_LEVEL_MARKS[index + 1];
            for (let level = current.level; level <= next.level; level++) {
                const progress = (level - current.level) / (next.level - current.level);
                thresholds[level] = Math.round(current.xp + (next.xp - current.xp) * progress);
            }
        }
        for (let level = 71; level <= MAX_LEVEL; level++) {
            const step = level - 70;
            const increment = 35000 + Math.round(Math.pow(step, 1.18) * 2500);
            thresholds[level] = thresholds[level - 1] + increment;
        }
        return thresholds;
    }

    const LEVEL_THRESHOLDS = buildLevelThresholds();

    function xpForLevel(level) {
        return LEVEL_THRESHOLDS[Math.max(1, Math.min(MAX_LEVEL, integer(level, 1)))];
    }

    function levelForXp(xp) {
        const safeXp = clamp(xp, 0, MAX_LIFETIME_XP);
        let low = 1;
        let high = MAX_LEVEL;
        while (low < high) {
            const middle = Math.ceil((low + high) / 2);
            if (safeXp >= LEVEL_THRESHOLDS[middle]) low = middle;
            else high = middle - 1;
        }
        return low;
    }

    function titleForLevel(level, mode = 'militar') {
        const track = TITLES[mode === 'aura' ? 'aura' : 'militar'];
        return [...track].reverse().find(item => level >= item[0])?.[1] || track[0][1];
    }

    function leagueForScore(score) {
        const safeScore = Math.max(0, integer(score));
        let leagueIndex = LEAGUES.findIndex((item, index) => {
            const next = LEAGUES[index + 1];
            return !next || safeScore < next.start;
        });
        if (leagueIndex < 0) leagueIndex = 0;
        const league = LEAGUES[leagueIndex];
        if (league.divisions === 1 || league.span === null) {
            return { ...league, index: leagueIndex, division: null, divisionIndex: 0, label: `Liga ${league.name}`, threshold: league.start, nextThreshold: null, progressPercent: 100, remaining: 0, isTop: true };
        }
        const divisionSpan = league.span / league.divisions;
        const withinLeague = safeScore - league.start;
        const completedDivisions = Math.min(league.divisions - 1, Math.floor(withinLeague / divisionSpan));
        const division = league.divisions - completedDivisions;
        const threshold = Math.round(league.start + completedDivisions * divisionSpan);
        const nextThreshold = Math.round(league.start + (completedDivisions + 1) * divisionSpan);
        const progressPercent = clamp(((safeScore - threshold) / Math.max(1, nextThreshold - threshold)) * 100, 0, 100);
        return {
            ...league,
            index: leagueIndex,
            division,
            divisionIndex: completedDivisions,
            label: `Liga ${league.name} ${['', 'I', 'II', 'III', 'IV'][division]}`,
            threshold,
            nextThreshold,
            progressPercent,
            remaining: Math.max(0, nextThreshold - safeScore),
            isTop: false
        };
    }

    function normalizedLegacyDate(item) {
        if (validDateKey(item?.dataISO)) return item.dataISO;
        const legacy = String(item?.dataChave || '').match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
        if (legacy) {
            const migrated = new Date(Date.UTC(Number(legacy[1]), Number(legacy[2]), Number(legacy[3])));
            return Number.isNaN(migrated.getTime()) ? '' : dateKeyFromTimestamp(migrated.getTime(), 0);
        }
        const timestamp = finite(item?.id, NaN);
        return Number.isFinite(timestamp) && timestamp > 0 ? dateKeyFromTimestamp(timestamp, 0) : '';
    }

    function legacyStreakMap(studyDates, todayKey) {
        const sorted = [...studyDates].filter(validDateKey).sort();
        if (!sorted.length) return {};
        const map = {};
        let cursor = sorted[0];
        const limit = [todayKey, sorted[sorted.length - 1]].filter(validDateKey).sort().pop();
        let streak = 0;
        let safety = 0;
        while (cursor && cursor <= limit && safety++ < 5000) {
            const studied = studyDates.has(cursor);
            const weekday = dayOfWeek(cursor);
            if (weekday === 0) {
                // Domingo é neutro, como no sistema anterior.
            } else if (weekday === 6) {
                if (studied) streak++;
            } else if (studied) streak++;
            else if (cursor !== todayKey) streak = 0;
            map[cursor] = streak;
            cursor = addDays(cursor, 1);
        }
        return map;
    }

    function streakMultiplier(days) {
        if (days >= 30) return 2;
        if (days >= 15) return 1.5;
        if (days >= 7) return 1.25;
        if (days >= 3) return 1.1;
        return 1;
    }

    function deriveLegacyEvidence(appData, options = {}) {
        const source = isObject(appData) ? appData : {};
        const now = nowValue(options);
        const offset = offsetValue(options);
        const todayKey = options.dateKey && validDateKey(options.dateKey) ? options.dateKey : dateKeyFromTimestamp(now, offset);
        const xpByDate = {};
        const studyDates = new Set();
        const fingerprints = [];
        const add = (dateKey, xp, token) => {
            if (!validDateKey(dateKey) || !Number.isFinite(xp) || xp <= 0) return;
            xpByDate[dateKey] = (xpByDate[dateKey] || 0) + xp;
            fingerprints.push(`${token}:${dateKey}:${Math.round(xp * 1000)}`);
        };

        const history = Array.isArray(source.historyItems) ? source.historyItems : [];
        history.forEach((item, index) => {
            const seconds = Math.max(0, finite(item?.tempoSegundos));
            const dateKey = normalizedLegacyDate(item);
            if (seconds > 0 && validDateKey(dateKey)) studyDates.add(dateKey);
            add(dateKey, seconds / 60 * 7, `h:${String(item?.id ?? index)}`);
        });
        const mocks = Array.isArray(source.simuladosItems) ? source.simuladosItems : [];
        mocks.forEach((item, index) => add(item?.date, Math.max(0, finite(item?.acertos)) * 30, `s:${String(item?.id ?? index)}`));
        const essays = Array.isArray(source.redacaoItems) ? source.redacaoItems : [];
        essays.forEach((item, index) => add(item?.date, 1000, `r:${String(item?.id ?? index)}`));
        const logins = Array.isArray(source.xpLoginDates) ? [...new Set(source.xpLoginDates.filter(validDateKey))] : [];
        logins.forEach(dateKey => add(dateKey, 150, `l:${dateKey}`));

        const streaks = legacyStreakMap(studyDates, todayKey);
        const awardedByDate = {};
        Object.entries(xpByDate).forEach(([dateKey, base]) => {
            awardedByDate[dateKey] = Math.round(base * streakMultiplier(streaks[dateKey] || 0));
        });
        const grossXp = Object.values(awardedByDate).reduce((sum, xp) => sum + xp, 0);
        const resetOffset = Math.max(0, finite(source.xpResetOffset));
        const totalXp = Math.min(LEGACY_XP_CAP, Math.max(0, Math.round(grossXp - resetOffset)));
        const season = seasonFor(now, { utcOffsetMinutes: offset });
        const monthXp = Object.entries(awardedByDate).filter(([dateKey]) => dateKey.startsWith(`${season.id}-`)).reduce((sum, [, xp]) => sum + xp, 0);
        const seasonXp = Math.min(totalXp, Math.max(0, Math.round(monthXp)));
        fingerprints.sort();
        const fingerprint = hash(`${fingerprints.join('|')}|offset:${Math.round(resetOffset)}|xp:${totalXp}`);
        return {
            totalXp,
            seasonXp,
            fingerprint,
            evidence: { history: history.length, mockExams: mocks.length, essays: essays.length, loginDays: logins.length, studyDays: studyDates.size },
            source: 'legacy-app-data'
        };
    }

    function createState(appData, options = {}) {
        const now = nowValue(options);
        const offset = offsetValue(options);
        const legacy = deriveLegacyEvidence(appData, { ...options, now, utcOffsetMinutes: offset });
        const season = seasonFor(now, { utcOffsetMinutes: offset });
        const league = leagueForScore(legacy.seasonXp);
        const level = levelForXp(legacy.totalXp);
        const history = legacy.totalXp > 0 ? [{
            id: `migration:${legacy.fingerprint}`,
            type: 'legacy_migration',
            label: 'Progresso anterior preservado',
            occurredAt: now,
            dateKey: dateKeyFromTimestamp(now, offset),
            quantity: 1,
            acceptedUnits: 1,
            xp: legacy.totalXp,
            seasonXp: legacy.seasonXp,
            seasonId: season.id,
            source: 'migration',
            status: 'accepted'
        }] : [];
        return {
            version: VERSION,
            createdAt: now,
            updatedAt: now,
            lifetimeXp: legacy.totalXp,
            highestLevel: level,
            legacy: { migratedAt: now, xpImported: legacy.totalXp, seasonXpImported: legacy.seasonXp, fingerprint: legacy.fingerprint, evidence: legacy.evidence },
            season: {
                current: { ...season, xp: legacy.seasonXp, score: legacy.seasonXp, startedAt: now },
                archive: [],
                bestLeagueIndex: league.index
            },
            dailyBuckets: {},
            processedEvents: {},
            history,
            missions: { claimed: {} },
            achievements: { unlocked: {} },
            integrity: { repairCount: 0, lastRepairAt: null }
        };
    }

    function normalizeBucket(bucket) {
        const units = {};
        if (isObject(bucket?.units)) {
            Object.entries(bucket.units).forEach(([type, amount]) => {
                if (ACTIONS[type] || type === 'mission_reward') units[type] = Math.max(0, integer(amount));
            });
        }
        return {
            xp: Math.max(0, integer(bucket?.xp)),
            events: Math.max(0, integer(bucket?.events)),
            units,
            qualified: bucket?.qualified === true
        };
    }

    function normalizedState(raw, options = {}) {
        const now = nowValue(options);
        const offset = offsetValue(options);
        const source = isObject(raw) ? clone(raw) : {};
        const lifetimeXp = clamp(source.lifetimeXp ?? source.xpTotal ?? source.lifetime?.xp, 0, MAX_LIFETIME_XP);
        const computedLevel = levelForXp(lifetimeXp);
        const highestLevel = Math.max(computedLevel, Math.min(MAX_LEVEL, integer(source.highestLevel ?? source.level, computedLevel)));
        const fallbackSeason = seasonFor(now, { utcOffsetMinutes: offset });
        const currentRaw = isObject(source.season?.current) ? source.season.current : {};
        const current = {
            id: /^\d{4}-\d{2}$/.test(String(currentRaw.id || '')) ? currentRaw.id : fallbackSeason.id,
            label: String(currentRaw.label || fallbackSeason.label).slice(0, 80),
            startAt: Math.max(0, integer(currentRaw.startAt, fallbackSeason.startAt)),
            endAt: Math.max(0, integer(currentRaw.endAt, fallbackSeason.endAt)),
            utcOffsetMinutes: clamp(integer(currentRaw.utcOffsetMinutes, offset), -840, 840),
            xp: Math.max(0, integer(currentRaw.xp)),
            score: Math.max(0, integer(currentRaw.score ?? currentRaw.xp)),
            startedAt: Math.max(0, integer(currentRaw.startedAt, source.createdAt || now))
        };
        const archive = (Array.isArray(source.season?.archive) ? source.season.archive : []).filter(isObject).map(item => ({
            id: String(item.id || '').slice(0, 20),
            label: String(item.label || '').slice(0, 80),
            startAt: Math.max(0, integer(item.startAt)),
            endAt: Math.max(0, integer(item.endAt)),
            xp: Math.max(0, integer(item.xp)),
            score: Math.max(0, integer(item.score ?? item.xp)),
            leagueKey: String(item.leagueKey || leagueForScore(item.score ?? item.xp).key).slice(0, 30),
            leagueLabel: String(item.leagueLabel || leagueForScore(item.score ?? item.xp).label).slice(0, 80),
            archivedAt: Math.max(0, integer(item.archivedAt, now))
        })).filter(item => /^\d{4}-\d{2}$/.test(item.id)).slice(-MAX_SEASONS);

        const dailyBuckets = {};
        if (isObject(source.dailyBuckets)) Object.entries(source.dailyBuckets).filter(([key]) => validDateKey(key)).sort(([a], [b]) => a.localeCompare(b)).slice(-MAX_BUCKET_DAYS).forEach(([key, bucket]) => { dailyBuckets[key] = normalizeBucket(bucket); });

        const processedEvents = {};
        if (isObject(source.processedEvents)) Object.entries(source.processedEvents).filter(([id, item]) => id && isObject(item)).sort((a, b) => finite(a[1].recordedAt) - finite(b[1].recordedAt)).slice(-MAX_EVENT_IDS).forEach(([id, item]) => {
            processedEvents[String(id).slice(0, 180)] = { type: String(item.type || '').slice(0, 60), occurredAt: Math.max(0, integer(item.occurredAt)), recordedAt: Math.max(0, integer(item.recordedAt)), xp: Math.max(0, integer(item.xp)), status: String(item.status || 'accepted').slice(0, 30) };
        });

        const history = (Array.isArray(source.history) ? source.history : []).filter(isObject).slice(-MAX_HISTORY).map(item => ({
            id: String(item.id || '').slice(0, 180), type: String(item.type || '').slice(0, 60), label: String(item.label || '').slice(0, 120),
            occurredAt: Math.max(0, integer(item.occurredAt)), dateKey: validDateKey(item.dateKey) ? item.dateKey : '',
            quantity: Math.max(0, integer(item.quantity)), acceptedUnits: Math.max(0, integer(item.acceptedUnits)),
            xp: Math.max(0, integer(item.xp)), seasonXp: Math.max(0, integer(item.seasonXp ?? item.xp)),
            seasonId: String(item.seasonId || '').slice(0, 20), source: String(item.source || '').slice(0, 60), status: String(item.status || 'accepted').slice(0, 30),
            ...(isObject(item.meta) ? { meta: sanitizeEventMeta({ meta: item.meta }) } : {})
        }));

        const claimed = {};
        if (isObject(source.missions?.claimed)) Object.entries(source.missions.claimed).filter(([id, item]) => id && isObject(item)).sort((a, b) => finite(a[1].claimedAt) - finite(b[1].claimedAt)).slice(-MAX_CLAIMS).forEach(([id, item]) => {
            claimed[String(id).slice(0, 220)] = { claimedAt: Math.max(0, integer(item.claimedAt)), rewardXp: Math.max(0, integer(item.rewardXp)), period: String(item.period || '').slice(0, 20) };
        });

        const unlocked = {};
        if (isObject(source.achievements?.unlocked)) Object.entries(source.achievements.unlocked).filter(([id, item]) => ACHIEVEMENTS.some(definition => definition.id === id) && isObject(item)).forEach(([id, item]) => {
            unlocked[id] = { unlockedAt: Math.max(0, integer(item.unlockedAt, now)), metricValue: Math.max(0, finite(item.metricValue)) };
        });

        return {
            version: VERSION,
            createdAt: Math.max(0, integer(source.createdAt, now)),
            updatedAt: Math.max(0, integer(source.updatedAt, now)),
            lifetimeXp,
            highestLevel,
            legacy: isObject(source.legacy) ? {
                migratedAt: Math.max(0, integer(source.legacy.migratedAt, source.createdAt || now)),
                xpImported: Math.max(0, integer(source.legacy.xpImported)),
                seasonXpImported: Math.max(0, integer(source.legacy.seasonXpImported)),
                fingerprint: String(source.legacy.fingerprint || '').slice(0, 100),
                evidence: isObject(source.legacy.evidence) ? clone(source.legacy.evidence) : {}
            } : { migratedAt: now, xpImported: 0, seasonXpImported: 0, fingerprint: '', evidence: {} },
            season: { current, archive, bestLeagueIndex: clamp(integer(source.season?.bestLeagueIndex, leagueForScore(current.score).index), 0, LEAGUES.length - 1) },
            dailyBuckets,
            processedEvents,
            history,
            missions: { claimed },
            achievements: { unlocked },
            integrity: {
                repairCount: Math.max(0, integer(source.integrity?.repairCount)),
                lastRepairAt: source.integrity?.lastRepairAt ? Math.max(0, integer(source.integrity.lastRepairAt)) : null
            }
        };
    }

    function rollSeason(state, options = {}) {
        const now = nowValue(options);
        const descriptor = seasonFor(now, { utcOffsetMinutes: offsetValue(options) });
        const next = clone(state);
        const current = next.season.current;
        let changed = false;
        if (current.id !== descriptor.id) {
            const finalLeague = leagueForScore(current.score);
            if (!next.season.archive.some(item => item.id === current.id)) {
                next.season.archive.push({
                    id: current.id, label: current.label, startAt: current.startAt, endAt: current.endAt,
                    xp: current.xp, score: current.score, leagueKey: finalLeague.key,
                    leagueLabel: finalLeague.label, archivedAt: now
                });
            }
            next.season.archive = next.season.archive.slice(-MAX_SEASONS);
            next.season.bestLeagueIndex = Math.max(next.season.bestLeagueIndex, finalLeague.index);
            next.season.current = { ...descriptor, xp: 0, score: 0, startedAt: now };
            next.updatedAt = now;
            changed = true;
        } else {
            next.season.current = { ...current, ...descriptor, xp: current.xp, score: current.score, startedAt: current.startedAt };
        }
        return { state: next, changed };
    }

    function validate(input, options = {}) {
        const raw = isObject(input?.[STATE_KEY]) ? input[STATE_KEY] : input;
        const errors = [];
        const warnings = [];
        if (!isObject(raw)) errors.push('Estado de ranking ausente ou inválido.');
        if (isObject(raw) && finite(raw.version, 0) > VERSION) errors.push(`Versão ${raw.version} ainda não é suportada.`);
        if (isObject(raw) && (!Number.isFinite(Number(raw.lifetimeXp ?? raw.xpTotal)) || Number(raw.lifetimeXp ?? raw.xpTotal) < 0)) warnings.push('XP vitalício inválido foi reparado.');
        if (isObject(raw) && Number(raw.highestLevel) < levelForXp(raw.lifetimeXp ?? raw.xpTotal ?? 0)) warnings.push('O maior nível estava abaixo do nível calculado e foi reparado.');
        if (isObject(raw) && raw.processedEvents !== undefined && !isObject(raw.processedEvents)) warnings.push('Índice de eventos inválido foi reconstruído.');
        if (isObject(raw) && raw.dailyBuckets !== undefined && !isObject(raw.dailyBuckets)) warnings.push('Limites diários inválidos foram reconstruídos.');
        if (isObject(raw) && Array.isArray(raw.history) && raw.history.length > MAX_HISTORY) warnings.push('Histórico recente foi compactado sem alterar o XP.');
        const state = normalizedState(raw, options);
        return { valid: errors.length === 0, errors, warnings, state };
    }

    function migrate(appData, options = {}) {
        const source = isObject(appData) ? appData : {};
        const existing = source[STATE_KEY];
        if (!isObject(existing)) {
            const state = createState(source, options);
            return {
                appData: { ...source, [STATE_KEY]: state }, state,
                report: { changed: true, created: true, migratedFrom: 'legacy', legacyXpImported: state.legacy.xpImported, seasonXpImported: state.legacy.seasonXpImported, warnings: [] }
            };
        }
        const checked = validate(existing, options);
        const rolled = rollSeason(checked.state, options);
        const state = rolled.state;
        const changed = rolled.changed || finite(existing.version, 0) !== VERSION || checked.warnings.length > 0 || JSON.stringify(existing) !== JSON.stringify(state);
        if (checked.warnings.length) {
            state.integrity.repairCount += 1;
            state.integrity.lastRepairAt = nowValue(options);
            state.updatedAt = nowValue(options);
        }
        return {
            appData: { ...source, [STATE_KEY]: state }, state,
            report: { changed, created: false, migratedFrom: finite(existing.version, 1), legacyXpImported: state.legacy.xpImported, seasonXpImported: state.legacy.seasonXpImported, warnings: checked.warnings, errors: checked.errors }
        };
    }

    function sanitizeEventMeta(event) {
        const meta = {};
        const source = isObject(event?.meta) ? event.meta : {};
        for (const key of ['subjectId', 'subject', 'topic', 'result', 'scheduleBlockId']) {
            if (source[key] !== undefined) meta[key] = String(source[key]).slice(0, 120);
        }
        return meta;
    }

    function pruneState(state) {
        const next = state;
        const buckets = Object.entries(next.dailyBuckets).sort(([a], [b]) => a.localeCompare(b)).slice(-MAX_BUCKET_DAYS);
        next.dailyBuckets = Object.fromEntries(buckets);
        const events = Object.entries(next.processedEvents).sort((a, b) => finite(a[1].recordedAt) - finite(b[1].recordedAt)).slice(-MAX_EVENT_IDS);
        next.processedEvents = Object.fromEntries(events);
        next.history = next.history.slice(-MAX_HISTORY);
        const claims = Object.entries(next.missions.claimed).sort((a, b) => finite(a[1].claimedAt) - finite(b[1].claimedAt)).slice(-MAX_CLAIMS);
        next.missions.claimed = Object.fromEntries(claims);
        return next;
    }

    function rejectedRecord(migrated, reason, event = {}) {
        return {
            appData: migrated.appData,
            state: migrated.state,
            receipt: { ok: false, status: 'rejected', reason, eventId: String(event.id || ''), type: String(event.type || ''), acceptedUnits: 0, rejectedUnits: Math.max(0, integer(event.quantity)), xp: 0, seasonXp: 0 }
        };
    }

    function record(appData, event, options = {}) {
        const migrated = migrate(appData, options);
        if (!isObject(event)) return rejectedRecord(migrated, 'Evento ausente.');
        const action = ACTIONS[event.type];
        if (!action) return rejectedRecord(migrated, 'Tipo de ação desconhecido.', event);
        const eventId = String(event.id || '').trim();
        if (!/^[\w:.-]{3,180}$/u.test(eventId)) return rejectedRecord(migrated, 'Use um id estável de 3 a 180 caracteres.', event);
        if (migrated.state.processedEvents[eventId]) {
            const previous = migrated.state.processedEvents[eventId];
            return { appData: migrated.appData, state: migrated.state, receipt: { ok: true, status: 'duplicate', reason: 'Este evento já foi processado.', eventId, type: event.type, acceptedUnits: 0, rejectedUnits: 0, xp: 0, seasonXp: 0, previous: clone(previous) } };
        }
        const now = nowValue(options);
        const occurredAt = Math.max(0, integer(event.occurredAt, now));
        if (!occurredAt) return rejectedRecord(migrated, 'Data do evento inválida.', event);
        if (occurredAt > now + 5 * 60000) return rejectedRecord(migrated, 'Eventos futuros não geram XP.', event);
        if (options.allowHistorical !== true && occurredAt < now - MAX_BACKDATE_DAYS * DAY) return rejectedRecord(migrated, `Eventos com mais de ${MAX_BACKDATE_DAYS} dias precisam de migração explícita.`, event);
        const quantity = Math.max(0, integer(event.quantity, 1));
        if (!quantity) return rejectedRecord(migrated, 'A quantidade precisa ser positiva.', event);
        const offset = offsetValue(options);
        const expectedDateKey = dateKeyFromTimestamp(occurredAt, offset);
        const dateKey = validDateKey(event.dateKey) ? event.dateKey : expectedDateKey;
        if (!validDateKey(dateKey)) return rejectedRecord(migrated, 'Data local inválida.', event);
        if (dateKey !== expectedDateKey) return rejectedRecord(migrated, 'A data local não corresponde ao horário do evento.', event);

        const state = clone(migrated.state);
        const bucket = normalizeBucket(state.dailyBuckets[dateKey]);
        const used = Math.max(0, integer(bucket.units[event.type]));
        const requestedWithinEvent = Math.min(quantity, action.maxPerEvent);
        const availableToday = Math.max(0, action.dailyCapUnits - used);
        const acceptedUnits = Math.min(requestedWithinEvent, availableToday);
        const rejectedUnits = Math.max(0, quantity - acceptedUnits);
        const xp = Math.max(0, integer(acceptedUnits * action.xpPerUnit));
        const eventSeason = seasonFor(occurredAt, { utcOffsetMinutes: offset });
        const seasonXp = eventSeason.id === state.season.current.id ? xp : 0;
        const status = acceptedUnits === 0 ? 'capped' : rejectedUnits > 0 ? 'partial' : 'accepted';

        bucket.units[event.type] = used + acceptedUnits;
        bucket.xp += xp;
        bucket.events += 1;
        if (action.qualifiesDay && acceptedUnits > 0) bucket.qualified = true;
        state.dailyBuckets[dateKey] = bucket;
        state.lifetimeXp = clamp(state.lifetimeXp + xp, 0, MAX_LIFETIME_XP);
        state.highestLevel = Math.max(state.highestLevel, levelForXp(state.lifetimeXp));
        if (seasonXp) {
            state.season.current.xp += seasonXp;
            state.season.current.score += seasonXp;
        }
        const currentLeague = leagueForScore(state.season.current.score);
        state.season.bestLeagueIndex = Math.max(state.season.bestLeagueIndex, currentLeague.index);
        state.processedEvents[eventId] = { type: event.type, occurredAt, recordedAt: now, xp, status };
        state.history.push({
            id: eventId, type: event.type, label: action.label, occurredAt, dateKey,
            quantity, acceptedUnits, xp, seasonXp, seasonId: seasonXp ? state.season.current.id : eventSeason.id,
            source: String(event.source || 'app').slice(0, 60), status, meta: sanitizeEventMeta(event)
        });
        state.updatedAt = now;
        pruneState(state);
        const nextAppData = { ...migrated.appData, [STATE_KEY]: state };
        return {
            appData: nextAppData,
            state,
            receipt: {
                ok: true, status, eventId, type: event.type, dateKey, quantity, acceptedUnits, rejectedUnits,
                xp, seasonXp, cap: { perEvent: action.maxPerEvent, daily: action.dailyCapUnits, usedToday: bucket.units[event.type] },
                level: state.highestLevel, league: currentLeague
            }
        };
    }

    function recordBatch(appData, events, options = {}) {
        let current = migrate(appData, options).appData;
        const receipts = [];
        for (const event of Array.isArray(events) ? events : []) {
            const result = record(current, event, options);
            current = result.appData;
            receipts.push(result.receipt);
        }
        return { appData: current, state: current[STATE_KEY], receipts };
    }

    function resolveState(input, options = {}) {
        if (isObject(input?.[STATE_KEY])) return migrate(input, options).state;
        if (isObject(input) && finite(input.version) <= VERSION && ('lifetimeXp' in input || 'xpTotal' in input)) return rollSeason(normalizedState(input, options), options).state;
        return migrate(isObject(input) ? input : {}, options).state;
    }

    function sumUnits(state, startKey, endKey, type) {
        return Object.entries(state.dailyBuckets).filter(([key]) => key >= startKey && key <= endKey).reduce((sum, [, bucket]) => sum + Math.max(0, integer(bucket.units?.[type])), 0);
    }

    function selectMission(template, seed, period, periodKey, state, startKey, endKey, index) {
        const goalIndex = Math.abs(seed + index * 17) % template.goals.length;
        const goal = template.goals[goalIndex];
        const rewardXp = template.rewards[goalIndex];
        const progress = sumUnits(state, startKey, endKey, template.type);
        const id = `${period}:${periodKey}:${template.key}:${goal}`;
        const claimedInfo = state.missions.claimed[id] || null;
        return {
            id, period, periodKey, key: template.key, title: template.title, description: template.description(goal),
            actionType: template.type, progress, goal, progressPercent: clamp(progress / Math.max(1, goal) * 100, 0, 100),
            rewardXp, completed: progress >= goal, claimed: Boolean(claimedInfo), claimedAt: claimedInfo?.claimedAt || null
        };
    }

    function getMissions(input, options = {}) {
        const state = resolveState(input, options);
        const now = nowValue(options);
        const offset = offsetValue(options);
        const today = options.dateKey && validDateKey(options.dateKey) ? options.dateKey : dateKeyFromTimestamp(now, offset);
        const dailySeed = parseInt(hash(`daily:${today}`), 36) || 0;
        const dailyFocusGoal = [25, 40, 60][dailySeed % 3];
        const dailyFocusRewards = { 25: 60, 40: 85, 60: 120 };
        const focusTemplate = { key: 'focus', title: 'Operação de foco', description: goal => `Estudar ${goal} minutos`, type: 'study_minutes', goals: [dailyFocusGoal], rewards: [dailyFocusRewards[dailyFocusGoal]] };
        const rotatedDaily = DAILY_MISSION_POOL.map((item, index) => ({ item, rank: parseInt(hash(`${today}:${item.key}:${index}`), 36) || 0 })).sort((a, b) => a.rank - b.rank).slice(0, 2).map(entry => entry.item);
        const daily = [focusTemplate, ...rotatedDaily].map((template, index) => selectMission(template, dailySeed, 'daily', today, state, today, today, index));

        const monday = weekStart(today);
        const sunday = addDays(monday, 6);
        const weeklySeed = parseInt(hash(`weekly:${monday}`), 36) || 0;
        const rotatedWeekly = WEEKLY_MISSION_POOL.map((item, index) => ({ item, rank: parseInt(hash(`${monday}:${item.key}:${index}`), 36) || 0 })).sort((a, b) => a.rank - b.rank).slice(0, 3).map(entry => entry.item);
        const weekly = rotatedWeekly.map((template, index) => selectMission(template, weeklySeed, 'weekly', monday, state, monday, sunday, index));
        const all = [...daily, ...weekly];
        return {
            dateKey: today, weekKey: monday, daily, weekly, all,
            completed: all.filter(item => item.completed).length,
            claimed: all.filter(item => item.claimed).length,
            claimable: all.filter(item => item.completed && !item.claimed).length,
            nextDailyResetAt: timestampFromDateKey(addDays(today, 1)) - offset * 60000,
            nextWeeklyResetAt: timestampFromDateKey(addDays(monday, 7)) - offset * 60000
        };
    }

    function claimMission(appData, missionId, options = {}) {
        const migrated = migrate(appData, options);
        const missions = getMissions(migrated.appData, options);
        const mission = missions.all.find(item => item.id === String(missionId || ''));
        if (!mission) return { appData: migrated.appData, state: migrated.state, receipt: { ok: false, status: 'rejected', reason: 'Missão não pertence ao período atual.', missionId: String(missionId || ''), xp: 0 } };
        if (migrated.state.missions.claimed[mission.id]) return { appData: migrated.appData, state: migrated.state, receipt: { ok: true, status: 'duplicate', reason: 'Recompensa já resgatada.', missionId: mission.id, xp: 0 } };
        if (!mission.completed) return { appData: migrated.appData, state: migrated.state, receipt: { ok: false, status: 'incomplete', reason: 'A missão ainda não foi concluída.', missionId: mission.id, progress: mission.progress, goal: mission.goal, xp: 0 } };

        const now = nowValue(options);
        const offset = offsetValue(options);
        const today = options.dateKey && validDateKey(options.dateKey) ? options.dateKey : dateKeyFromTimestamp(now, offset);
        const state = clone(migrated.state);
        state.missions.claimed[mission.id] = { claimedAt: now, rewardXp: mission.rewardXp, period: mission.period };
        state.lifetimeXp = clamp(state.lifetimeXp + mission.rewardXp, 0, MAX_LIFETIME_XP);
        state.highestLevel = Math.max(state.highestLevel, levelForXp(state.lifetimeXp));
        state.season.current.xp += mission.rewardXp;
        state.season.current.score += mission.rewardXp;
        state.season.bestLeagueIndex = Math.max(state.season.bestLeagueIndex, leagueForScore(state.season.current.score).index);
        const bucket = normalizeBucket(state.dailyBuckets[today]);
        bucket.units.mission_reward = Math.max(0, integer(bucket.units.mission_reward)) + mission.rewardXp;
        bucket.xp += mission.rewardXp;
        bucket.events += 1;
        state.dailyBuckets[today] = bucket;
        const eventId = `mission:${mission.id}`;
        state.processedEvents[eventId] = { type: 'mission_reward', occurredAt: now, recordedAt: now, xp: mission.rewardXp, status: 'accepted' };
        state.history.push({ id: eventId, type: 'mission_reward', label: `Missão: ${mission.title}`, occurredAt: now, dateKey: today, quantity: 1, acceptedUnits: 1, xp: mission.rewardXp, seasonXp: mission.rewardXp, seasonId: state.season.current.id, source: 'mission', status: 'accepted' });
        state.updatedAt = now;
        pruneState(state);
        return { appData: { ...migrated.appData, [STATE_KEY]: state }, state, receipt: { ok: true, status: 'accepted', missionId: mission.id, xp: mission.rewardXp, level: state.highestLevel, league: leagueForScore(state.season.current.score) } };
    }

    function uniqueItems(items) {
        const seen = new Set();
        return (Array.isArray(items) ? items : []).filter((item, index) => {
            const key = item?.id !== undefined && item?.id !== null ? `id:${String(item.id)}` : `index:${index}`;
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
        });
    }

    function streakStats(dateKeys, todayKey) {
        const dates = [...new Set([...dateKeys].filter(validDateKey))].sort();
        if (!dates.length) return { current: 0, best: 0, activeDays: 0 };
        const set = new Set(dates);
        let cursor = dates[0];
        const last = [todayKey, dates[dates.length - 1]].filter(validDateKey).sort().pop();
        let running = 0;
        let best = 0;
        let current = 0;
        let safety = 0;
        while (cursor <= last && safety++ < 5000) {
            const studied = set.has(cursor);
            const weekday = dayOfWeek(cursor);
            if (weekday === 0) {
                // Neutro.
            } else if (weekday === 6) {
                if (studied) running++;
            } else if (studied) running++;
            else if (cursor !== todayKey) running = 0;
            if (running > best) best = running;
            if (cursor === todayKey) current = running;
            cursor = addDays(cursor, 1);
        }
        if (current === 0 && !set.has(todayKey)) {
            const yesterday = addDays(todayKey, -1);
            if (set.has(yesterday) || [0, 6].includes(dayOfWeek(yesterday))) {
                // Recalcula até ontem sem considerar o dia corrente ainda aberto.
                const previous = streakStats(set, yesterday);
                current = previous.current;
            }
        }
        return { current, best, activeDays: set.size };
    }

    function metricsFrom(appData, state, options = {}) {
        const source = isObject(appData) ? appData : {};
        const history = uniqueItems(source.historyItems);
        const studySeconds = history.reduce((sum, item) => sum + Math.max(0, finite(item?.tempoSegundos)), 0);
        const answeredFromHistory = history.reduce((sum, item) => {
            const explicit = Math.max(0, finite(item?.questoes));
            const components = Math.max(0, finite(item?.acertos)) + Math.max(0, finite(item?.erros)) + Math.max(0, finite(item?.brancos));
            return sum + Math.max(explicit, components);
        }, 0);
        const correctFromHistory = history.reduce((sum, item) => sum + Math.max(0, finite(item?.acertos)), 0);
        const ledgerStudy = Object.values(state.dailyBuckets).reduce((sum, bucket) => sum + Math.max(0, integer(bucket.units?.study_minutes)), 0);
        const ledgerAnswered = Object.values(state.dailyBuckets).reduce((sum, bucket) => sum + Math.max(0, integer(bucket.units?.questions_answered)), 0);
        const ledgerCorrect = Object.values(state.dailyBuckets).reduce((sum, bucket) => sum + Math.max(0, integer(bucket.units?.questions_correct)), 0);
        const questionsAnswered = Math.max(Math.round(answeredFromHistory), ledgerAnswered);
        const questionsCorrect = Math.min(questionsAnswered, Math.max(Math.round(correctFromHistory), ledgerCorrect));
        const flashReviews = uniqueItems(source.flashcards?.reviews).length;
        const reviewsCompleted = uniqueItems(source.revisoesItems).filter(item => item?.status === 'revisado' || finite(item?.revisadoEm) > 0).length;
        const errors = uniqueItems(source.cadernoErrosItems);
        const topics = (Array.isArray(source.cycleItems) ? source.cycleItems : []).flatMap(item => Array.isArray(item?.topicos) ? item.topicos : []);
        const studyDates = new Set(history.filter(item => finite(item?.tempoSegundos) > 0).map(normalizedLegacyDate).filter(validDateKey));
        Object.entries(state.dailyBuckets).forEach(([dateKey, bucket]) => { if (bucket.qualified) studyDates.add(dateKey); });
        const today = options.dateKey && validDateKey(options.dateKey) ? options.dateKey : dateKeyFromTimestamp(nowValue(options), offsetValue(options));
        const streak = streakStats(studyDates, today);
        const level = Math.max(state.highestLevel, levelForXp(state.lifetimeXp));
        return {
            studyMinutes: Math.max(Math.floor(studySeconds / 60), ledgerStudy),
            questionsAnswered,
            questionsCorrect,
            accuracy: questionsAnswered ? Math.round(questionsCorrect / questionsAnswered * 100) : 0,
            reviewsCompleted: Math.max(reviewsCompleted, Object.values(state.dailyBuckets).reduce((sum, bucket) => sum + integer(bucket.units?.review_completed), 0)),
            flashcardsReviewed: Math.max(flashReviews, Object.values(state.dailyBuckets).reduce((sum, bucket) => sum + integer(bucket.units?.flashcard_reviewed), 0)),
            errorsLogged: Math.max(errors.length, Object.values(state.dailyBuckets).reduce((sum, bucket) => sum + integer(bucket.units?.error_logged), 0)),
            errorsMastered: Math.max(errors.filter(item => item?.status === 'dominado').length, Object.values(state.dailyBuckets).reduce((sum, bucket) => sum + integer(bucket.units?.error_mastered), 0)),
            essays: Math.max(uniqueItems(source.redacaoItems).length, Object.values(state.dailyBuckets).reduce((sum, bucket) => sum + integer(bucket.units?.essay_completed), 0)),
            mockExams: Math.max(uniqueItems(source.simuladosItems).length, Object.values(state.dailyBuckets).reduce((sum, bucket) => sum + integer(bucket.units?.mock_exam_completed), 0)),
            topicsMastered: Math.max(topics.filter(item => item?.concluido === true || finite(item?.nivelDominio) >= 3).length, Object.values(state.dailyBuckets).reduce((sum, bucket) => sum + integer(bucket.units?.topic_mastered), 0)),
            activeDays: streak.activeDays,
            currentStreak: streak.current,
            bestStreak: streak.best,
            level,
            bestLeagueIndex: Math.max(state.season.bestLeagueIndex, leagueForScore(state.season.current.score).index),
            lifetimeXp: state.lifetimeXp
        };
    }

    function achievementView(state, metrics) {
        return ACHIEVEMENTS.map(definition => {
            const value = Math.max(0, finite(metrics[definition.metric]));
            const secondaryReady = !definition.minMetric || finite(metrics[definition.minMetric[0]]) >= definition.minMetric[1];
            const eligible = value >= definition.goal && secondaryReady;
            const unlock = state.achievements.unlocked[definition.id] || null;
            return {
                ...definition,
                value,
                progressPercent: clamp(value / Math.max(1, definition.goal) * 100, 0, 100),
                eligible,
                unlocked: Boolean(unlock),
                unlockedAt: unlock?.unlockedAt || null,
                secondaryRequirement: definition.minMetric ? { metric: definition.minMetric[0], goal: definition.minMetric[1], value: finite(metrics[definition.minMetric[0]]) } : null
            };
        });
    }

    function syncAchievements(appData, options = {}) {
        const migrated = migrate(appData, options);
        const state = clone(migrated.state);
        const metrics = metricsFrom(migrated.appData, state, options);
        const views = achievementView(state, metrics);
        const now = nowValue(options);
        const dateKey = options.dateKey && validDateKey(options.dateKey) ? options.dateKey : dateKeyFromTimestamp(now, offsetValue(options));
        const newUnlocks = [];
        views.forEach(item => {
            if (!item.eligible || state.achievements.unlocked[item.id]) return;
            state.achievements.unlocked[item.id] = { unlockedAt: now, metricValue: item.value };
            state.history.push({ id: `achievement:${item.id}`, type: 'achievement_unlocked', label: `Conquista: ${item.title}`, occurredAt: now, dateKey, quantity: 1, acceptedUnits: 1, xp: 0, seasonXp: 0, seasonId: state.season.current.id, source: 'achievement', status: 'accepted' });
            newUnlocks.push({ id: item.id, title: item.title, icon: item.icon, rarity: item.rarity, unlockedAt: now });
        });
        if (newUnlocks.length) state.updatedAt = now;
        pruneState(state);
        return { appData: { ...migrated.appData, [STATE_KEY]: state }, state, newUnlocks, metrics, achievements: achievementView(state, metrics) };
    }

    function getHistory(input, options = {}) {
        const state = resolveState(input, options);
        const type = options.type ? String(options.type) : '';
        const seasonId = options.seasonId ? String(options.seasonId) : '';
        const limit = Math.max(1, Math.min(200, integer(options.limit, 30)));
        return state.history.filter(item => (!type || item.type === type) && (!seasonId || item.seasonId === seasonId)).sort((a, b) => b.occurredAt - a.occurredAt).slice(0, limit).map(clone);
    }

    function progressionFor(state, mode) {
        const level = Math.max(state.highestLevel, levelForXp(state.lifetimeXp));
        const startXp = xpForLevel(level);
        const nextXp = level >= MAX_LEVEL ? startXp : xpForLevel(level + 1);
        const earned = Math.max(0, state.lifetimeXp - startXp);
        const needed = Math.max(0, nextXp - startXp);
        return {
            xp: state.lifetimeXp,
            level,
            highestLevel: state.highestLevel,
            maxLevel: MAX_LEVEL,
            title: titleForLevel(level, mode),
            startXp,
            nextXp: level >= MAX_LEVEL ? null : nextXp,
            earnedInLevel: level >= MAX_LEVEL ? needed : Math.min(needed, earned),
            neededInLevel: needed,
            remainingXp: level >= MAX_LEVEL ? 0 : Math.max(0, nextXp - state.lifetimeXp),
            progressPercent: level >= MAX_LEVEL ? 100 : clamp(earned / Math.max(1, needed) * 100, 0, 100),
            isMaxLevel: level >= MAX_LEVEL
        };
    }

    function snapshot(appData, options = {}) {
        const migrated = migrate(appData, options);
        const state = migrated.state;
        const mode = appData?.rankVisualMode === 'aura' ? 'aura' : 'militar';
        const metrics = metricsFrom(migrated.appData, state, options);
        const missions = getMissions(state, options);
        const achievementItems = achievementView(state, metrics);
        const currentLeague = leagueForScore(state.season.current.score);
        const bestLeague = LEAGUES[Math.max(0, Math.min(LEAGUES.length - 1, state.season.bestLeagueIndex))];
        const now = nowValue(options);
        const checked = validate(state, options);
        return {
            version: VERSION,
            generatedAt: now,
            profileName: String(appData?.profileName || 'Estudante').trim().slice(0, 32),
            mode,
            lifetime: progressionFor(state, mode),
            season: {
                ...clone(state.season.current),
                league: currentLeague,
                bestLeague: { key: bestLeague.key, name: bestLeague.name, index: state.season.bestLeagueIndex, color: bestLeague.color },
                remainingMs: Math.max(0, state.season.current.endAt - now),
                archiveCount: state.season.archive.length
            },
            streak: { current: metrics.currentStreak, best: metrics.bestStreak, activeDays: metrics.activeDays },
            missions,
            achievements: {
                unlocked: achievementItems.filter(item => item.unlocked).length,
                total: achievementItems.length,
                completionPercent: Math.round(achievementItems.filter(item => item.unlocked).length / achievementItems.length * 100),
                claimableUnlocks: achievementItems.filter(item => item.eligible && !item.unlocked).length,
                recent: achievementItems.filter(item => item.unlocked).sort((a, b) => b.unlockedAt - a.unlockedAt).slice(0, 5),
                items: achievementItems
            },
            metrics,
            recentHistory: getHistory(state, { ...options, limit: options.historyLimit || 12 }),
            ranking: {
                mode: 'local',
                verified: false,
                leaderboard: null,
                note: 'Ligas usam o progresso deste perfil. O placar público opcional mostra pontuações autodeclaradas, não verificadas no servidor.'
            },
            integrity: {
                valid: checked.valid,
                warnings: [...checked.warnings, ...(migrated.report.errors || [])],
                migrationPending: migrated.report.changed,
                antiAbuse: { dailyCaps: true, eventDeduplication: true, serverVerified: false }
            }
        };
    }

    const CONFIG = deepFreeze({
        version: VERSION,
        stateKey: STATE_KEY,
        maxLevel: MAX_LEVEL,
        maxLifetimeXp: MAX_LIFETIME_XP,
        maxBackdateDays: MAX_BACKDATE_DAYS,
        actions: clone(ACTIONS),
        leagues: clone(LEAGUES),
        levelThresholds: [...LEVEL_THRESHOLDS],
        clientTrustNote: 'Limites no frontend evitam duplicações acidentais; competição pública precisa de backend autenticado.'
    });

    return Object.freeze({
        VERSION,
        STATE_KEY,
        CONFIG,
        ACTIONS: CONFIG.actions,
        LEAGUES: CONFIG.leagues,
        ACHIEVEMENTS: deepFreeze(clone(ACHIEVEMENTS)),
        migrate,
        validate,
        record,
        recordBatch,
        snapshot,
        getMissions,
        claimMission,
        syncAchievements,
        getHistory,
        levelForXp,
        xpForLevel,
        titleForLevel,
        leagueForScore,
        seasonFor,
        dateKeyFromTimestamp,
        deriveLegacyEvidence
    });
});
