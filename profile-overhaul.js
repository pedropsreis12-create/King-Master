(() => {
    'use strict';

    const VERSION = '2.0.0';
    const PROFILE_ID = 'perfil';
    const DATA_KEY = 'qg_pedro_data';
    const ACHIEVEMENTS_VISIBILITY_KEY = 'king-master-profile-achievements-hidden';
    const DAY_LABELS = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];
    const state = {
        root: null,
        observer: null,
        refreshFrame: 0,
        achievementFilter: 'all',
        achievementTier: 'all',
        boardLoading: false,
        boardLoadedAt: 0,
        boardStop: null,
        boardSearchTimer: 0,
        boardSyncTimer: 0,
        selectedSearchUid: null,
        profileView: 'profile',
        lastSummary: null,
        destroyed: false
    };

    const asArray = value => Array.isArray(value) ? value : [];
    const number = value => Number.isFinite(Number(value)) ? Number(value) : 0;
    const clamp = (value, min = 0, max = 100) => Math.min(max, Math.max(min, number(value)));
    const plural = (value, one, many) => `${value} ${value === 1 ? one : many}`;
    const formatNumber = value => Math.round(number(value)).toLocaleString('pt-BR');
    const formatPercent = value => `${Math.round(clamp(value))}%`;
    const formatDuration = seconds => {
        const safe = Math.max(0, Math.round(number(seconds)));
        const hours = Math.floor(safe / 3600);
        const minutes = Math.floor((safe % 3600) / 60);
        if (hours) return `${hours}h ${String(minutes).padStart(2, '0')}min`;
        return `${minutes}min`;
    };
    const formatDivision = value => {
        const raw = String(value ?? '').trim();
        if (!raw) return '';
        const match = raw.match(/^(?:divis[aã]o\s*)?([1-4])$/i);
        if (!match) return raw;
        return ({ 1: 'I', 2: 'II', 3: 'III', 4: 'IV' })[Number(match[1])];
    };

    function element(tag, className, text, attributes = {}) {
        const node = document.createElement(tag);
        if (className) node.className = className;
        if (text !== undefined && text !== null) node.textContent = String(text);
        Object.entries(attributes).forEach(([name, value]) => {
            if (value === false || value === null || value === undefined) return;
            if (name === 'hidden') node.hidden = Boolean(value);
            else node.setAttribute(name, String(value));
        });
        return node;
    }

    function text(id, value) {
        const target = document.getElementById(id);
        const next = value === undefined || value === null ? '' : String(value);
        if (target && target.textContent !== next) target.textContent = next;
    }

    function readAppData() {
        try {
            if (typeof appData !== 'undefined' && appData && typeof appData === 'object') return appData;
        } catch { /* O armazenamento local continua sendo um fallback somente de leitura. */ }
        try {
            const parsed = JSON.parse(localStorage.getItem(DATA_KEY) || '{}');
            return parsed && typeof parsed === 'object' ? parsed : {};
        } catch {
            return {};
        }
    }

    function safeGlobalCall(name, ...args) {
        try {
            return typeof window[name] === 'function' ? window[name](...args) : null;
        } catch {
            return null;
        }
    }

    function readRankV2(data) {
        const api = window.KingRankV2;
        if (!api || typeof api.snapshot !== 'function') return null;
        try {
            const snapshot = api.snapshot(data, { readOnly: true, source: 'profile-overhaul' });
            return snapshot && typeof snapshot === 'object' ? snapshot : null;
        } catch {
            return null;
        }
    }

    function dateKey(value) {
        if (typeof value === 'string') {
            const direct = value.match(/^\d{4}-\d{2}-\d{2}/)?.[0];
            if (direct) return direct;
        }
        const parsed = new Date(value);
        if (Number.isNaN(parsed.getTime())) return '';
        return `${parsed.getFullYear()}-${String(parsed.getMonth() + 1).padStart(2, '0')}-${String(parsed.getDate()).padStart(2, '0')}`;
    }

    function historyDate(item) {
        if (!item || typeof item !== 'object') return '';
        const direct = dateKey(item.dataISO || item.date || item.createdAt || item.completedAt);
        if (direct) return direct;
        const legacy = String(item.dataChave || '').match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
        if (legacy) {
            const parsed = new Date(Number(legacy[1]), Number(legacy[2]), Number(legacy[3]));
            return dateKey(parsed);
        }
        return dateKey(number(item.id));
    }

    function isReviewDone(item) {
        const status = String(item?.status || item?.estado || '').toLowerCase();
        return Boolean(item?.concluida || item?.concluido || item?.completed || item?.done || ['done', 'completed', 'concluida', 'concluído', 'concluido'].includes(status));
    }

    function fallbackMetrics(data) {
        const history = asArray(data.historyItems);
        const subjects = asArray(data.cycleItems);
        const simulations = asArray(data.simuladosItems);
        const essays = asArray(data.redacaoItems);
        const reviews = asArray(data.revisoesItems);
        const errors = asArray(data.cadernoErrosItems);
        const sessions = history.filter(item => number(item?.tempoSegundos) > 0);
        const studyDays = new Set(sessions.map(historyDate).filter(Boolean));
        const topics = subjects.flatMap(subject => asArray(subject?.topicos));
        const masteredTopics = topics.filter(topic => topic?.concluido || number(topic?.nivelDominio) >= 3).length;
        const reviewed = reviews.filter(isReviewDone).length;
        const dueReviews = reviews.length - reviewed;
        const timeFromHistory = sessions.reduce((total, item) => total + number(item.tempoSegundos), 0);
        const totalSeconds = Math.max(number(data.totalStudySeconds), timeFromHistory);

        let hits = 0;
        let attempts = 0;
        subjects.forEach(subject => {
            hits += number(subject?.acertos);
            attempts += number(subject?.acertos) + number(subject?.erros);
        });
        simulations.forEach(simulation => {
            const simulationHits = number(simulation?.acertos);
            hits += simulationHits;
            attempts += number(simulation?.total) || simulationHits + number(simulation?.erros);
        });
        const accuracy = attempts ? Math.round((hits / attempts) * 100) : 0;
        const weekly = asArray(data.weeklyChart).slice(0, 7);
        while (weekly.length < 7) weekly.push(0);

        return {
            sessions: sessions.length,
            studyDays: studyDays.size,
            topics: topics.length,
            masteredTopics,
            totalSeconds,
            totalHours: totalSeconds / 3600,
            hits,
            attempts,
            accuracy,
            simulations: simulations.length,
            essays: essays.length,
            reviews: reviews.length,
            reviewed,
            dueReviews: Math.max(0, dueReviews),
            errors: errors.length,
            weekly,
            weekSeconds: weekly.reduce((sum, value) => sum + number(value), 0),
            activeWeekDays: weekly.filter(value => number(value) > 0).length
        };
    }

    function parseLegacyRank(data) {
        const computed = safeGlobalCall('calcularGamificacao');
        const levelText = document.getElementById('profileLevelTitle')?.textContent || '';
        const nextText = document.getElementById('profileNextLevel')?.textContent || '';
        const xpText = document.getElementById('profileXpText')?.textContent || '';
        const percentText = document.getElementById('profileXpPercent')?.textContent || '';
        const level = number(computed?.nivel) || number(levelText.match(/\d+/)?.[0]) || 1;
        const percent = clamp(number(String(percentText).replace(',', '.').match(/[\d.]+/)?.[0]));
        const xpTotal = number(computed?.xpTotal);
        const title = String(computed?.titulo || levelText.replace(/^Lvl\s*\d+\s*[•·-]?\s*/i, '') || 'Em evolução');
        const league = String(computed?.liga?.nome || document.getElementById('profileLeagueName')?.textContent || 'Liga inicial');
        const streak = number(computed?.sequencia) || number(document.getElementById('profileStreak')?.textContent?.match(/\d+/)?.[0]);
        const multiplier = number(computed?.multiplicador) || 1;
        return {
            source: 'legacy',
            level,
            title,
            xpTotal,
            progress: percent,
            remainingText: nextText || 'Continue estudando para avançar',
            xpText: xpText || `${formatNumber(xpTotal)} XP acumulados`,
            streak,
            multiplier,
            league,
            division: '',
            seasonXp: 0,
            seasonScore: 0,
            seasonProgress: percent,
            seasonEndAt: null,
            seasonLabel: 'Temporada local',
            achievements: [],
            missions: null,
            recentHistory: []
        };
    }

    function normalizeV2Rank(snapshot, fallback) {
        if (!snapshot) return fallback;
        const lifetime = snapshot.lifetime && typeof snapshot.lifetime === 'object' ? snapshot.lifetime : {};
        const season = snapshot.season && typeof snapshot.season === 'object' ? snapshot.season : {};
        const leagueValue = season.league;
        const league = typeof leagueValue === 'object'
            ? String(leagueValue.name || leagueValue.label || leagueValue.title || fallback.league)
            : String(leagueValue || fallback.league);
        const divisionValue = season.division ?? (typeof leagueValue === 'object' ? leagueValue.division : '');
        const division = formatDivision(typeof divisionValue === 'object'
            ? String(divisionValue.name || divisionValue.label || divisionValue.title || '')
            : String(divisionValue || ''));
        const rawLifetimeProgress = lifetime.progressPercent ?? lifetime.progress;
        const rawSeasonProgress = (typeof leagueValue === 'object' ? leagueValue.progressPercent : undefined) ?? season.progressPercent ?? season.progress;
        const hasLifetimeProgress = rawLifetimeProgress !== undefined && rawLifetimeProgress !== null;
        const hasSeasonProgress = rawSeasonProgress !== undefined && rawSeasonProgress !== null;
        const lifetimeProgress = typeof rawLifetimeProgress === 'object'
            ? number(rawLifetimeProgress.percent ?? rawLifetimeProgress.value)
            : number(rawLifetimeProgress);
        const seasonProgress = typeof rawSeasonProgress === 'object'
            ? number(rawSeasonProgress.percent ?? rawSeasonProgress.value)
            : number(rawSeasonProgress);
        const remaining = number(lifetime.toNextLevel ?? lifetime.remainingXp ?? lifetime.progress?.remaining);
        return {
            ...fallback,
            source: 'v2',
            level: number(lifetime.level) || fallback.level,
            title: String(lifetime.title || fallback.title),
            xpTotal: number(lifetime.xp ?? lifetime.totalXp) || fallback.xpTotal,
            progress: clamp(hasLifetimeProgress ? lifetimeProgress : fallback.progress),
            remainingText: remaining > 0 ? `Faltam ${formatNumber(remaining)} XP para o próximo nível` : fallback.remainingText,
            xpText: lifetime.xp !== undefined || lifetime.totalXp !== undefined ? `${formatNumber(lifetime.xp ?? lifetime.totalXp)} XP vitalícios` : fallback.xpText,
            streak: number(snapshot.streak?.current ?? snapshot.streak) || fallback.streak,
            league,
            division,
            leagueRemaining: typeof leagueValue === 'object' ? number(leagueValue.remaining) : 0,
            leagueIsTop: typeof leagueValue === 'object' && Boolean(leagueValue.isTop),
            seasonXp: number(season.xp),
            seasonScore: number(season.score),
            seasonProgress: clamp(hasSeasonProgress ? seasonProgress : fallback.progress),
            seasonEndAt: season.endAt || null,
            seasonLabel: String(season.label || 'Temporada atual'),
            achievements: asArray(snapshot.achievements?.items ?? snapshot.achievements),
            missions: snapshot.missions && typeof snapshot.missions === 'object' ? snapshot.missions : null,
            recentHistory: asArray(snapshot.recentHistory)
        };
    }

    function buildSummary() {
        const data = readAppData();
        const metrics = fallbackMetrics(data);
        const rank = normalizeV2Rank(readRankV2(data), parseLegacyRank(data));
        return { data, metrics, rank };
    }

    function normalizeExternalAchievement(item, index) {
        if (!item || typeof item !== 'object') return null;
        const id = String(item.id || item.key || `rank-v2-${index}`);
        const target = Math.max(1, number(item.target ?? item.goal ?? item.progress?.target) || 1);
        const current = Math.max(0, number(item.current ?? item.value ?? item.progress?.current));
        const rawProgress = item.progressPercent ?? (typeof item.progress === 'object' ? item.progress.percent : item.progress);
        const unlocked = Boolean(item.unlocked || item.unlockedAt || item.status === 'unlocked' || item.status === 'claimed');
        const rarityTone = { 'comum': 'blue', 'rara': 'cyan', 'épica': 'violet', 'epica': 'violet', 'lendária': 'gold', 'lendaria': 'gold', 'mítica': 'pink', 'mitica': 'pink' };
        return {
            id: `v2-${id}`,
            icon: String(item.icon || 'workspace_premium').replace(/[^a-z_]/g, '').slice(0, 40),
            tier: String(item.tier || 'normal').replace(/[^a-z_]/g, ''),
            tierLabel: String(item.tierLabel || 'Normal').slice(0, 24),
            name: String(item.name || item.title || 'Conquista').slice(0, 70),
            description: String(item.description || item.subtitle || 'Marco especial da sua jornada.').slice(0, 180),
            current,
            target,
            progress: unlocked ? 100 : item.secondaryRequirement && item.secondaryRequirement.value < item.secondaryRequirement.goal
                ? Math.min(95, clamp(number(rawProgress) || (current / target) * 100))
                : clamp(number(rawProgress) || (current / target) * 100),
            unlocked,
            label: String(item.secondaryRequirement && item.secondaryRequirement.value < item.secondaryRequirement.goal
                ? `${formatNumber(item.secondaryRequirement.value)} de ${formatNumber(item.secondaryRequirement.goal)} questões`
                : item.progressLabel || item.label || (unlocked ? 'Conquistada' : `${formatNumber(current)} de ${formatNumber(target)}`)).slice(0, 80),
            tone: String(item.tone || rarityTone[String(item.rarity || '').toLowerCase()] || 'violet').replace(/[^a-z-]/gi, '') || 'violet',
            unlockedAt: item.unlockedAt || null
        };
    }

    function achievementList(summary) {
        const external = summary.rank.achievements.map(normalizeExternalAchievement).filter(Boolean);
        return external;
    }

    function createNavigation(root) {
        if (document.getElementById('kmProfileNav')) return;
        const nav = element('nav', 'km-profile-nav km-profile-v2-owned', null, { id: 'kmProfileNav', 'aria-label': 'Atalhos do perfil' });
        nav.append(element('span', 'km-profile-nav__label', 'Explorar perfil'));
        const links = element('div', 'km-profile-nav__links');
        [
            ['perfil-identidade', 'Identidade'],
            ['perfil-classificacao', 'Classificação'],
            ['perfil-temporada', 'Temporada'],
            ['perfil-progresso', 'Progresso'],
            ['perfil-conquistas', 'Conquistas'],
            ['perfil-molduras', 'Molduras']
        ].forEach(([target, label], index) => {
            const button = element('button', index === 0 ? 'is-current' : '', label, { type: 'button', 'data-profile-jump': target });
            button.addEventListener('click', () => jumpTo(target, button));
            links.append(button);
        });
        nav.append(links);
        root.querySelector('.profile-heading')?.insertAdjacentElement('afterend', nav);
    }

    function jumpTo(id, button) {
        const target = document.getElementById(id);
        if (!target) return;
        document.querySelectorAll('#kmProfileNav [data-profile-jump]').forEach(item => item.classList.toggle('is-current', item === button));
        const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches || ['reduced', 'off'].includes(document.documentElement.dataset.motionLevel);
        target.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'start' });
        if (!target.hasAttribute('tabindex')) target.setAttribute('tabindex', '-1');
        window.setTimeout(() => target.focus({ preventScroll: true }), reduced ? 0 : 420);
    }

    function enhanceIdentity() {
        const card = state.root?.querySelector('.profile-identity-card');
        if (!card) return;
        card.id ||= 'perfil-identidade';
        card.setAttribute('aria-labelledby', 'profileDisplayName');
        const copy = card.querySelector('.profile-identity-copy');
        if (copy && !copy.querySelector('.km-identity-signals')) {
            const signals = element('div', 'km-identity-signals km-profile-v2-owned', null, { 'aria-label': 'Resumo do perfil' });
            [
                ['kmIdentityLevel', 'Nível 1'],
                ['kmIdentityLeague', 'Liga inicial'],
                ['kmIdentitySessions', 'Nenhuma sessão']
            ].forEach(([id, label]) => signals.append(element('span', '', label, { id })));
            copy.append(signals);
        }
    }

    function createRankBrief(root) {
        if (document.getElementById('perfil-classificacao')) return;
        const identity = root.querySelector('.profile-identity-card');
        if (!identity) return;
        const section = element('section', 'km-rank-brief km-profile-v2-owned', null, {
            id: 'perfil-classificacao',
            'aria-labelledby': 'kmRankBriefTitle',
            tabindex: '-1'
        });
        const crest = element('div', 'km-rank-brief__crest', null, { 'aria-hidden': 'true' });
        crest.append(element('span', 'material-symbols-rounded', 'workspace_premium'), element('i'));
        const copy = element('div', 'km-rank-brief__copy');
        copy.append(
            element('span', 'km-profile-kicker', 'SUA CLASSIFICAÇÃO'),
            element('h2', '', 'Liga Bronze', { id: 'kmRankBriefTitle' }),
            element('p', '', 'Classificação pessoal por XP da temporada.', { id: 'kmRankBriefSubtitle' })
        );
        const progress = element('div', 'km-rank-brief__progress');
        const progressHead = element('div');
        progressHead.append(element('span', '', 'Rumo à próxima classificação', { id: 'kmRankBriefProgressLabel' }), element('strong', '', '0%', { id: 'kmRankBriefPercent' }));
        const track = element('div', 'km-rank-brief__track', null, {
            id: 'kmRankBriefTrack', role: 'progressbar', 'aria-label': 'Progresso da classificação',
            'aria-valuemin': '0', 'aria-valuemax': '100', 'aria-valuenow': '0'
        });
        track.append(element('span', '', null, { id: 'kmRankBriefBar' }));
        progress.append(progressHead, track, element('small', '', 'Seu progresso aparece aqui.', { id: 'kmRankBriefHint' }));
        const catalog = element('details', 'km-league-catalog');
        catalog.append(element('summary', '', 'Ver todas as 22 classificações'), element('div', 'km-league-catalog__grid', null, { id: 'kmLeagueCatalog' }));
        section.append(crest, copy, progress, catalog);
        identity.insertAdjacentElement('afterend', section);
    }

    function setProfileView(view) {
        state.profileView = ['profile', 'ranking', 'search'].includes(view) ? view : 'profile';
        state.root.dataset.profileView = state.profileView;
        state.root.querySelectorAll('[data-profile-view]').forEach(button => {
            const selected = button.dataset.profileView === state.profileView;
            button.classList.toggle('is-current', selected);
            button.setAttribute('aria-current', selected ? 'page' : 'false');
        });
        if (state.profileView !== 'profile') {
            startPublicBoard();
            state.root.querySelector('.profile-heading')?.scrollIntoView({ block: 'start' });
        } else {
            stopPublicBoard();
            state.root.querySelector('.profile-heading')?.scrollIntoView({ block: 'start' });
        }
    }

    function createProfileTabs(root) {
        if (document.getElementById('kmProfileTabs')) return;
        const tabs = element('nav', 'km-profile-tabs km-profile-v2-owned', null, { id: 'kmProfileTabs', 'aria-label': 'Áreas do perfil' });
        [['profile', 'Meu perfil'], ['ranking', 'Placar'], ['search', 'Pesquisar usuário']].forEach(([view, label]) => {
            const button = element('button', view === 'profile' ? 'is-current' : '', label, {
                type: 'button', 'data-profile-view': view, 'aria-current': view === 'profile' ? 'page' : 'false'
            });
            button.addEventListener('click', () => setProfileView(view));
            tabs.append(button);
        });
        root.querySelector('.profile-heading')?.insertAdjacentElement('afterend', tabs);
    }

    function createPublicBoard(root) {
        if (document.getElementById('perfil-placar')) return;
        const publicBoard = element('section', 'km-public-board km-profile-v2-owned', null, {
            id: 'perfil-placar', 'aria-labelledby': 'kmPublicBoardTitle', tabindex: '-1'
        });
        const title = element('header', 'km-public-board__title');
        const titleCopy = element('div');
        titleCopy.append(
            element('span', 'km-profile-kicker', 'TEMPORADA ATUAL'),
            element('h2', '', 'Placar dos estudantes', { id: 'kmPublicBoardTitle' }),
            element('p', '', 'Acompanhe sua liga e encontre outros estudantes que escolheram participar.')
        );
        title.append(titleCopy, element('span', 'km-public-board__live', 'Atualização ao vivo'));
        const boardBody = element('div', 'km-public-board__body');
        const boardHeader = element('div', 'km-public-board__header');
        boardHeader.append(
            element('p', '', 'Participação opcional: apenas apelido, nível, liga e XP da temporada aparecem. Pontuações não são verificadas por servidor.'),
            element('button', '', 'Participar', { id: 'kmPublicBoardJoin', type: 'button' })
        );
        const status = element('p', 'km-public-board__status', 'Abra o placar para acompanhar a temporada.', { id: 'kmPublicBoardStatus', role: 'status' });
        boardBody.append(boardHeader, status, element('div', 'km-public-board__self', null, { id: 'kmPublicBoardSelf', hidden: true }), element('ol', 'km-public-board__list', null, { id: 'kmPublicBoardList' }));
        publicBoard.append(title, boardBody);
        boardHeader.querySelector('button').addEventListener('click', changePublicBoardMembership);
        root.append(publicBoard);
    }

    function createUserSearch(root) {
        if (document.getElementById('perfil-busca')) return;
        const panel = element('section', 'km-public-board km-user-search km-profile-v2-owned', null, {
            id: 'perfil-busca', 'aria-labelledby': 'kmUserSearchTitle', tabindex: '-1'
        });
        const title = element('header', 'km-public-board__title');
        const copy = element('div');
        copy.append(
            element('span', 'km-profile-kicker', 'COMUNIDADE KING MASTER'),
            element('h2', '', 'Pesquisar usuário', { id: 'kmUserSearchTitle' }),
            element('p', '', 'Encontre pelo apelido pessoas que escolheram participar do placar público.')
        );
        title.append(copy);
        const search = element('label', 'km-public-board__search');
        search.append(element('span', 'material-symbols-rounded', 'search', { 'aria-hidden': 'true' }));
        const input = element('input', '', null, {
            id: 'kmPublicBoardSearch', type: 'search', autocomplete: 'off', maxlength: '32',
            placeholder: 'Ex.: Gustav encontra Gustavo121', 'aria-label': 'Pesquisar usuários pelo início do apelido',
            'aria-controls': 'kmUserSearchList', 'aria-autocomplete': 'list'
        });
        input.addEventListener('input', () => {
            window.clearTimeout(state.boardSearchTimer);
            state.selectedSearchUid = null;
            document.getElementById('kmUserSearchSelection')?.replaceChildren();
            state.boardSearchTimer = window.setTimeout(startPublicBoard, 300);
        });
        search.append(input);
        panel.append(title, search,
            element('p', 'km-public-board__status', 'Digite um nome para pesquisar.', { id: 'kmUserSearchStatus', role: 'status' }),
            element('ol', 'km-public-board__list', null, { id: 'kmUserSearchList' }),
            element('section', 'km-user-search__selection', null, { id: 'kmUserSearchSelection', 'aria-live': 'polite' }));
        root.append(panel);
    }

    function leagueMascot(rank) {
        const key = rank?.key || 'bronze';
        const mascot = element('span', `km-rank-mascot km-rank-mascot--${key}`, null, { 'aria-hidden': 'true' });
        mascot.style.setProperty('--mascot-color', rank?.color || '#b7794b');
        mascot.append(
            element('span', 'km-rank-mascot__ears'),
            element('span', 'km-rank-mascot__head', null, { 'aria-hidden': 'true' }),
            element('span', 'km-rank-mascot__crest'),
            element('span', 'km-rank-mascot__division', rank?.division ? ['', 'I', 'II', 'III'][rank.division] : '★')
        );
        return mascot;
    }

    function renderSearchSelection(entry) {
        const selection = document.getElementById('kmUserSearchSelection');
        if (!selection) return;
        selection.replaceChildren();
        if (!entry) return;
        const rank = window.KingRankV2?.leagueForScore(entry.score);
        const details = element('div', 'km-user-search__selection-copy');
        details.append(
            element('small', '', 'PARTICIPANTE SELECIONADO'),
            element('h3', '', entry.displayName),
            element('p', '', `${rank?.label || 'Liga Bronze'} · Nível ${entry.level} · ${formatNumber(entry.score)} XP nesta temporada`)
        );
        selection.append(leagueMascot(rank), details);
    }

    function stopPublicBoard() {
        window.clearTimeout(state.boardSearchTimer);
        state.boardStop?.();
        state.boardStop = null;
        window.clearInterval(state.boardSyncTimer);
        state.boardSyncTimer = 0;
    }

    function renderPublicBoard(board) {
        const searching = state.profileView === 'search';
        const list = document.getElementById(searching ? 'kmUserSearchList' : 'kmPublicBoardList');
        list?.replaceChildren();
        board.entries.forEach((entry, index) => {
            const rank = window.KingRankV2?.leagueForScore(entry.score);
            const row = element('li', `km-public-board__entry${entry.uid === board.uid ? ' is-mine' : ''}${!searching && index < 3 ? ' is-podium' : ''}`);
            if (rank) row.style.setProperty('--entry-color', rank.color);
            const identity = element('div', 'km-public-board__identity');
            identity.append(element('strong', '', entry.uid === board.uid ? `${entry.displayName} · você` : entry.displayName), element('small', '', `Nível ${entry.level}`));
            const league = element('span', 'km-public-board__league', rank?.label || 'Liga Bronze');
            const content = searching ? element('button', 'km-user-search__choice', null, {
                type: 'button', 'aria-label': `Ver ${entry.displayName}, ${rank?.label || 'Liga Bronze'}`,
                'aria-pressed': state.selectedSearchUid === entry.uid ? 'true' : 'false'
            }) : row;
            content.append(element('span', 'km-public-board__place', searching ? '›' : String(index + 1).padStart(2, '0')), leagueMascot(rank), identity, league, element('b', 'km-public-board__score', `${formatNumber(entry.score)} XP`));
            if (searching) {
                content.addEventListener('click', () => {
                    state.selectedSearchUid = entry.uid;
                    list?.querySelectorAll('.km-user-search__choice').forEach(button => button.setAttribute('aria-pressed', String(button === content)));
                    renderSearchSelection(entry);
                });
                row.append(content);
            }
            list?.append(row);
        });
        if (searching) renderSearchSelection(board.entries.find(entry => entry.uid === state.selectedSearchUid));
        if (list && !list.children.length) list.append(element('li', 'km-public-board__empty', searching ? 'Nenhuma pessoa encontrada. Tente outro nome.' : 'Ainda não há participantes nesta temporada.'));
        const self = document.getElementById('kmPublicBoardSelf');
        if (self) {
            self.hidden = !board.joined;
            if (board.joined) {
                const rank = window.KingRankV2?.leagueForScore(board.ownScore);
                self.textContent = `Sua liga: ${rank?.label || 'Bronze'} · ${formatNumber(board.ownScore)} XP na temporada`;
            }
        }
        const membership = document.getElementById('kmPublicBoardJoin');
        if (membership) membership.textContent = board.joined ? 'Sair do placar' : 'Participar';
        if (searching) text('kmUserSearchStatus', board.entries.length
            ? `${board.entries.length} ${board.entries.length === 1 ? 'opção encontrada' : 'opções encontradas'} · escolha uma pessoa para ver a liga`
            : 'Nenhum apelido começa assim entre os participantes públicos.');
        else text('kmPublicBoardStatus', `Temporada ${board.seasonId} · até 30 primeiros participantes · atualização ao vivo`);
        state.boardLoadedAt = Date.now();
    }

    function startPublicBoard() {
        if (state.profileView === 'profile') return;
        stopPublicBoard();
        const api = window.KingPublicRanking;
        const searching = state.profileView === 'search';
        const statusId = searching ? 'kmUserSearchStatus' : 'kmPublicBoardStatus';
        if (!api) {
            text(statusId, 'Preparando conexão com o placar…');
            return;
        }
        const name = searching ? (document.getElementById('kmPublicBoardSearch')?.value || '') : '';
        if (searching && name.trim().length < 2) {
            document.getElementById('kmUserSearchList')?.replaceChildren();
            text(statusId, 'Digite pelo menos duas letras para pesquisar.');
            return;
        }
        text(statusId, searching ? 'Pesquisando participantes…' : 'Carregando classificação…');
        try {
            state.boardStop = api.watch(name, renderPublicBoard, error => {
                console.warn('Placar público indisponível:', error);
                const unavailable = /permission-denied|failed-precondition/i.test(String(error?.code || ''));
                text(statusId, unavailable
                    ? 'O placar ainda está sendo preparado. Tente novamente em instantes.'
                    : 'A conexão ao vivo caiu. Volte ao perfil e abra o placar novamente.');
            });
            state.boardSyncTimer = window.setInterval(() => api.syncIfJoined().catch(() => {}), 60_000);
        } catch (error) {
            console.warn('Placar público indisponível:', error);
            text(statusId, /entre na sua conta/i.test(String(error?.message || ''))
                ? 'Entre na sua conta para consultar ou participar do placar público.'
                : 'Não foi possível carregar o placar agora. Tente novamente.');
        }
    }

    async function changePublicBoardMembership() {
        const button = document.getElementById('kmPublicBoardJoin');
        const api = window.KingPublicRanking;
        if (!button || !api || button.disabled) return;
        button.disabled = true;
        const leaving = button.textContent === 'Sair do placar';
        text('kmPublicBoardStatus', leaving ? 'Removendo seu perfil público…' : 'Publicando somente apelido, nível e XP sazonal…');
        try {
            if (leaving) await api.leave();
            else await api.join();
            text('kmPublicBoardStatus', leaving ? 'Você saiu do placar.' : 'Você entrou no placar. Sua classificação será atualizada ao vivo.');
        } catch (error) {
            text('kmPublicBoardStatus', /permission-denied|failed-precondition/i.test(String(error?.code || ''))
                ? 'O placar ainda não está disponível no banco de dados.'
                : 'A alteração não foi salva. Tente novamente.');
        } finally {
            button.disabled = false;
        }
    }

    function createSeasonHub(root) {
        if (document.getElementById('perfil-temporada')) return;
        const rankBrief = document.getElementById('perfil-classificacao');
        if (!rankBrief) return;
        const section = element('section', 'km-season-hub widget km-profile-v2-owned', null, {
            id: 'perfil-temporada', 'aria-labelledby': 'kmSeasonTitle', tabindex: '-1'
        });
        const heading = element('header', 'km-season-hub__heading');
        const copy = element('div');
        copy.append(
            element('span', 'km-profile-kicker', 'CENTRO DA TEMPORADA'),
            element('h2', '', 'Temporada atual', { id: 'kmSeasonTitle' }),
            element('p', '', 'Complete missões reais, resgate o XP e acompanhe cada avanço registrado.')
        );
        const status = element('div', 'km-season-hub__status');
        status.append(
            element('span', '', 'Liga pessoal', { id: 'kmSeasonCycle' }),
            element('strong', '', 'Preparando classificação', { id: 'kmSeasonCountdown' })
        );
        heading.append(copy, status);

        const layout = element('div', 'km-season-hub__layout');
        const missions = element('div', 'km-season-missions');
        const missionsHeading = element('div', 'km-season-panel-heading');
        const missionsCopy = element('div');
        missionsCopy.append(element('span', '', 'MISSÕES'), element('h3', '', 'Ordens do ciclo'));
        missionsHeading.append(missionsCopy, element('span', 'km-season-claimable', '0 para resgatar', { id: 'kmMissionClaimable' }));
        const dailyHeading = element('div', 'km-mission-group-heading');
        dailyHeading.append(element('strong', '', 'Hoje'), element('span', '', 'Reinicia diariamente'));
        const weeklyHeading = element('div', 'km-mission-group-heading');
        weeklyHeading.append(element('strong', '', 'Esta semana'), element('span', '', 'Objetivos de campanha'));
        missions.append(
            missionsHeading,
            dailyHeading,
            element('div', 'km-mission-list', null, { id: 'kmDailyMissions', 'aria-label': 'Missões diárias' }),
            weeklyHeading,
            element('div', 'km-mission-list', null, { id: 'kmWeeklyMissions', 'aria-label': 'Missões semanais' })
        );

        const history = element('aside', 'km-rank-history', null, { 'aria-labelledby': 'kmRankHistoryTitle' });
        const historyHeading = element('div', 'km-season-panel-heading');
        const historyCopy = element('div');
        historyCopy.append(element('span', '', 'REGISTRO VERIFICÁVEL'), element('h3', '', 'Atividade recente', { id: 'kmRankHistoryTitle' }));
        historyHeading.append(historyCopy, element('span', 'km-rank-history__badge', 'Local e privado'));
        history.append(historyHeading, element('ol', 'km-rank-history__list', null, { id: 'kmRankHistoryList' }));

        layout.append(missions, history);
        section.append(heading, layout, element('div', 'km-season-live', '', { id: 'kmSeasonLive', role: 'status', 'aria-live': 'polite' }));
        rankBrief.insertAdjacentElement('afterend', section);
    }

    function createWeeklyPulse() {
        const panel = state.root?.querySelector('.profile-stats-panel');
        if (!panel || panel.querySelector('.km-weekly-pulse')) return;
        const section = element('section', 'km-weekly-pulse km-profile-v2-owned', null, { 'aria-labelledby': 'kmWeeklyPulseTitle' });
        const heading = element('div', 'km-weekly-pulse__heading');
        const copy = element('div');
        copy.append(element('span', 'km-profile-kicker', 'RITMO DA SEMANA'), element('h4', '', 'Cadência de foco', { id: 'kmWeeklyPulseTitle' }));
        heading.append(copy, element('strong', '', '0min', { id: 'kmWeekTotal' }));
        section.append(heading, element('div', 'km-weekly-pulse__bars', null, { id: 'kmWeeklyBars', role: 'list', 'aria-label': 'Tempo de estudo por dia nesta semana' }));
        panel.append(section);
    }

    function createAchievements(root) {
        if (document.getElementById('perfil-conquistas')) return;
        const xpLab = root.querySelector('.xp-test-panel');
        const overview = root.querySelector('.profile-overview-grid');
        const section = element('section', 'km-achievements widget km-profile-v2-owned', null, {
            id: 'perfil-conquistas', 'aria-labelledby': 'kmAchievementsTitle', tabindex: '-1'
        });
        const top = element('div', 'km-achievements__top');
        const copy = element('div', 'km-achievements__copy');
        copy.append(
            element('span', 'km-profile-kicker', 'MARCOS DA JORNADA'),
            element('h2', '', 'Conquistas', { id: 'kmAchievementsTitle' }),
            element('p', '', '50 marcos reais em cinco níveis de dificuldade.')
        );
        const summary = element('div', 'km-achievements__summary');
        const ring = element('div', 'km-achievements__ring', null, { id: 'kmAchievementRing', role: 'img', 'aria-label': 'Nenhuma conquista desbloqueada' });
        ring.append(element('strong', '', '0', { id: 'kmAchievementUnlocked' }), element('span', '', 'de 0'));
        const summaryCopy = element('div');
        summaryCopy.append(element('strong', '', 'Sua coleção está começando'), element('span', '', 'A próxima conquista aparecerá aqui.', { id: 'kmAchievementNext' }));
        summary.append(ring, summaryCopy);
        const toggle = element('button', 'km-achievements__toggle', 'Esconder conquistas', {
            id: 'kmAchievementsToggle', type: 'button',
            'aria-controls': 'kmAchievementsBody kmAchievementSummary', 'aria-expanded': 'true'
        });
        summary.id = 'kmAchievementSummary';
        const actions = element('div', 'km-achievements__actions');
        const expand = element('button', 'km-achievements__expand material-symbols-rounded', 'open_in_full', {
            id: 'kmAchievementsExpand', type: 'button', title: 'Ver conquistas em tela cheia',
            'aria-label': 'Ver conquistas em tela cheia', 'aria-pressed': 'false'
        });
        expand.addEventListener('click', () => toggleAchievementsFullscreen());
        actions.append(summary, expand, toggle);
        top.append(copy, actions);
        toggle.addEventListener('click', () => {
            const hidden = toggle.getAttribute('aria-expanded') === 'true';
            applyAchievementsVisibility(hidden);
            try { localStorage.setItem(ACHIEVEMENTS_VISIBILITY_KEY, String(hidden)); } catch { /* A opção continua funcionando nesta visita. */ }
        });

        const toolbar = element('div', 'km-achievements__toolbar');
        const filters = element('div', 'km-achievements__filters', null, { role: 'group', 'aria-label': 'Filtrar conquistas' });
        [['all', 'Todas'], ['unlocked', 'Conquistadas'], ['locked', 'Em progresso']].forEach(([filter, label], index) => {
            const button = element('button', index === 0 ? 'is-active' : '', label, { type: 'button', 'data-achievement-filter': filter, 'aria-pressed': String(index === 0) });
            button.addEventListener('click', () => setAchievementFilter(filter));
            filters.append(button);
        });
        filters.addEventListener('keydown', event => {
            if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
            const buttons = [...filters.querySelectorAll('button')];
            const current = buttons.indexOf(document.activeElement);
            if (current < 0) return;
            event.preventDefault();
            let next = event.key === 'Home' ? 0 : event.key === 'End' ? buttons.length - 1 : (current + (event.key === 'ArrowRight' ? 1 : -1) + buttons.length) % buttons.length;
            buttons[next].focus();
            buttons[next].click();
        });
        const tier = element('select', 'km-achievements__tier', null, { id: 'kmAchievementTier', 'aria-label': 'Filtrar por dificuldade' });
        [['all', 'Todas as dificuldades'], ['facil', 'Fácil'], ['normal', 'Normal'], ['media', 'Média'], ['dificil', 'Difícil'], ['muito_dificil', 'Muito difícil']].forEach(([value, label]) => tier.append(element('option', '', label, { value })));
        tier.addEventListener('change', () => { state.achievementTier = tier.value; if (state.lastSummary) renderAchievements(state.lastSummary); });
        toolbar.append(filters, tier, element('span', 'km-achievements__count', '0 conquistas', { id: 'kmAchievementCount', 'aria-live': 'polite' }));
        const empty = element('div', 'km-achievements__empty', null, { id: 'kmAchievementEmpty', hidden: true });
        empty.append(element('span', '', '◇', { 'aria-hidden': 'true' }), element('strong', '', 'Nenhuma conquista neste filtro'), element('p', '', 'Mude o filtro para acompanhar os outros marcos da sua jornada.'));
        const body = element('div', 'km-achievements__body', null, { id: 'kmAchievementsBody' });
        body.append(toolbar, element('div', 'km-achievements__grid', null, { id: 'kmAchievementGrid', tabindex: '0', 'aria-label': 'Lista rolável de conquistas' }), empty);
        section.append(top, body);
        (xpLab || overview)?.insertAdjacentElement(xpLab ? 'beforebegin' : 'afterend', section);
        try { applyAchievementsVisibility(localStorage.getItem(ACHIEVEMENTS_VISIBILITY_KEY) === 'true'); } catch { applyAchievementsVisibility(false); }
    }

    function toggleAchievementsFullscreen(force) {
        const section = document.getElementById('perfil-conquistas');
        const button = document.getElementById('kmAchievementsExpand');
        if (!section || !button) return;
        const expanded = typeof force === 'boolean' ? force : !section.classList.contains('is-fullscreen');
        section.classList.toggle('is-fullscreen', expanded);
        document.body.classList.toggle('km-achievements-open', expanded);
        button.textContent = expanded ? 'close_fullscreen' : 'open_in_full';
        button.setAttribute('aria-pressed', String(expanded));
        button.setAttribute('aria-label', expanded ? 'Sair da tela cheia' : 'Ver conquistas em tela cheia');
        button.title = expanded ? 'Sair da tela cheia' : 'Ver conquistas em tela cheia';
        if (!expanded) button.focus();
    }

    function applyAchievementsVisibility(hidden) {
        const toggle = document.getElementById('kmAchievementsToggle');
        if (!toggle) return;
        toggle.textContent = hidden ? 'Mostrar conquistas' : 'Esconder conquistas';
        toggle.setAttribute('aria-expanded', String(!hidden));
        ['kmAchievementsBody', 'kmAchievementSummary'].forEach(id => {
            const target = document.getElementById(id);
            if (target) target.hidden = hidden;
        });
    }

    function enhanceFrameVault() {
        const vault = state.root?.querySelector('.frame-vault');
        if (!vault) return;
        vault.id ||= 'perfil-molduras';
        vault.setAttribute('tabindex', '-1');
        const body = vault.querySelector('.frame-vault-body');
        if (body && !body.querySelector('.km-frame-collection')) {
            const intro = element('div', 'km-frame-collection km-profile-v2-owned');
            const copy = element('div');
            copy.append(element('span', 'km-profile-kicker', 'COLEÇÃO PESSOAL'), element('strong', '', 'Seu visual acompanha a sua história'));
            intro.append(copy, element('p', '', 'Molduras bloqueadas continuam visíveis para mostrar o próximo marco. Equipar uma moldura nunca altera seu XP.'));
            body.insertBefore(intro, body.firstChild);
        }
    }

    function applySemantics() {
        const xpTrack = document.querySelector('#perfil .profile-xp-track');
        const percent = clamp(number(document.getElementById('profileXpPercent')?.textContent?.replace(',', '.').match(/[\d.]+/)?.[0]));
        if (xpTrack) {
            xpTrack.setAttribute('role', 'progressbar');
            xpTrack.setAttribute('aria-label', 'Progresso para o próximo nível');
            xpTrack.setAttribute('aria-valuemin', '0');
            xpTrack.setAttribute('aria-valuemax', '100');
            xpTrack.setAttribute('aria-valuenow', String(Math.round(percent)));
        }
        const cover = document.getElementById('profileIdentityCover');
        const banner = document.querySelector('.profile-banner-edit');
        if (cover && banner) banner.setAttribute('title', 'Escolher imagem do banner do perfil');
        state.root?.querySelectorAll('.profile-stat-icon').forEach(icon => icon.setAttribute('aria-hidden', 'true'));
    }

    function renderIdentity(summary) {
        text('kmIdentityLevel', `Nível ${summary.rank.level}`);
        text('kmIdentityLeague', summary.rank.division ? `${summary.rank.league} · ${summary.rank.division}` : summary.rank.league);
        text('kmIdentitySessions', summary.metrics.sessions ? plural(summary.metrics.sessions, 'sessão', 'sessões') : 'Nenhuma sessão');
    }

    function renderRankBrief(summary) {
        const { rank } = summary;
        const title = rank.division ? `${rank.league} · ${rank.division}` : rank.league;
        const seasonMode = rank.source === 'v2';
        const progress = seasonMode ? rank.seasonProgress : rank.progress;
        const classificationHint = rank.leagueIsTop
            ? 'Você alcançou a classificação máxima desta temporada'
            : rank.leagueRemaining > 0
                ? `Faltam ${formatNumber(rank.leagueRemaining)} pontos para avançar`
                : rank.remainingText;
        text('kmRankBriefTitle', title);
        text('kmRankBriefSubtitle', 'Classificação pessoal por XP da temporada.');
        text('kmRankBriefProgressLabel', seasonMode ? (rank.leagueIsTop ? 'Classificação máxima' : 'Rumo à próxima classificação') : 'Rumo ao próximo nível');
        text('kmRankBriefPercent', formatPercent(progress));
        text('kmRankBriefHint', seasonMode ? classificationHint : rank.remainingText);
        text('profileLeagueName', /^liga\s/i.test(title) ? title : `Liga ${title}`);
        text('kmRankScore', formatNumber(seasonMode ? rank.seasonScore : rank.xpTotal));
        text('kmRankStreak', plural(rank.streak, 'dia', 'dias'));
        text('kmRankMultiplier', `${String(rank.multiplier.toFixed(2)).replace(/\.00$/, '').replace('.', ',')}x`);
        const bar = document.getElementById('kmRankBriefBar');
        const track = document.getElementById('kmRankBriefTrack');
        if (bar) bar.style.setProperty('--km-progress', `${progress}%`);
        if (track) {
            track.setAttribute('aria-valuenow', String(Math.round(progress)));
            track.setAttribute('aria-valuetext', `${formatPercent(progress)}; ${seasonMode ? classificationHint : rank.remainingText}`);
        }
        const catalog = document.getElementById('kmLeagueCatalog');
        const leagues = window.KingRankV2?.LEAGUES || [];
        if (catalog && leagues.length) {
            catalog.replaceChildren();
            const score = number(rank.seasonScore);
            const current = window.KingRankV2.leagueForScore(score);
            leagues.forEach(league => {
                const divisions = league.divisions > 1 ? league.divisions : 1;
                for (let division = 1; division <= divisions; division += 1) {
                    const threshold = Math.round(league.start + (division - 1) * (league.span || 0) / divisions);
                    const isCurrent = current.key === league.key && (current.division || 1) === division;
                    const row = element('div', `km-league-item${isCurrent ? ' is-current' : ''}${score >= threshold && !isCurrent ? ' is-passed' : ''}`);
                    row.style.setProperty('--league-color', league.color);
                    const numeral = divisions === 1 ? '★' : ['', 'I', 'II', 'III'][division];
                    row.append(
                        leagueMascot({ key: league.key, color: league.color, division: divisions === 1 ? null : division }),
                        element('strong', '', `${league.name}${divisions === 1 ? '' : ` ${numeral}`}`),
                        element('small', '', isCurrent ? 'Sua classificação' : `${formatNumber(threshold)} XP`)
                    );
                    catalog.append(row);
                }
            });
        }
        state.root?.toggleAttribute('data-rank-v2', seasonMode);
    }

    function missionProgress(mission) {
        const goal = Math.max(1, number(mission?.goal));
        const current = Math.max(0, number(mission?.progress));
        const progress = mission?.progressPercent !== undefined ? number(mission.progressPercent) : (current / goal) * 100;
        return { goal, current, percent: clamp(progress) };
    }

    function requestMissionClaim(mission, button) {
        if (!mission?.id || mission.claimed || !mission.completed || button.disabled) return;
        button.disabled = true;
        button.setAttribute('aria-busy', 'true');
        button.textContent = 'Resgatando…';
        text('kmSeasonLive', `Solicitando resgate da missão ${mission.title || ''}.`);
        window.dispatchEvent(new CustomEvent('king-rank-mission-claim', {
            detail: { missionId: String(mission.id), source: 'profile-overhaul', requestedAt: Date.now() }
        }));
        window.setTimeout(() => {
            if (button.isConnected && button.getAttribute('aria-busy') === 'true') {
                button.removeAttribute('aria-busy');
                button.disabled = false;
                button.textContent = `Resgatar +${formatNumber(mission.rewardXp)} XP`;
                text('kmSeasonLive', 'Se a recompensa não apareceu, tente novamente.');
            }
            scheduleRender();
        }, 3500);
    }

    function renderMissionGroup(containerId, items, emptyLabel) {
        const container = document.getElementById(containerId);
        if (!container) return;
        container.replaceChildren();
        if (!items.length) {
            const empty = element('div', 'km-mission-empty');
            empty.append(element('span', '', '◇', { 'aria-hidden': 'true' }), element('p', '', emptyLabel));
            container.append(empty);
            return;
        }
        items.forEach(mission => {
            const progress = missionProgress(mission);
            const card = element('article', `km-mission-card${mission.claimed ? ' is-claimed' : mission.completed ? ' is-complete' : ''}`);
            const top = element('div', 'km-mission-card__top');
            const marker = element('span', 'km-mission-card__marker', mission.period === 'weekly' ? 'W' : 'D', { 'aria-hidden': 'true' });
            const copy = element('div', 'km-mission-card__copy');
            copy.append(element('h4', '', String(mission.title || 'Missão')), element('p', '', String(mission.description || 'Objetivo da temporada')));
            const reward = element('span', 'km-mission-card__reward', `+${formatNumber(mission.rewardXp)} XP`);
            top.append(marker, copy, reward);
            const progressCopy = element('div', 'km-mission-card__numbers');
            progressCopy.append(
                element('span', '', `${formatNumber(Math.min(progress.current, progress.goal))} / ${formatNumber(progress.goal)}`),
                element('strong', '', formatPercent(progress.percent))
            );
            const track = element('div', 'km-mission-card__track', null, {
                role: 'progressbar', 'aria-label': `Progresso de ${mission.title || 'missão'}`,
                'aria-valuemin': '0', 'aria-valuemax': String(progress.goal),
                'aria-valuenow': String(Math.min(progress.current, progress.goal)),
                'aria-valuetext': `${formatPercent(progress.percent)} concluído`
            });
            const fill = element('span');
            fill.style.setProperty('--km-mission-progress', `${progress.percent}%`);
            track.append(fill);
            const footer = element('div', 'km-mission-card__footer');
            const status = mission.claimed ? 'Recompensa resgatada' : mission.completed ? 'Missão concluída' : 'Em andamento';
            footer.append(element('span', '', status));
            const button = element('button', '', mission.claimed ? 'Resgatada' : mission.completed ? `Resgatar +${formatNumber(mission.rewardXp)} XP` : 'Continue avançando', {
                type: 'button', disabled: mission.claimed || !mission.completed, 'aria-label': mission.claimed
                    ? `${mission.title}: recompensa já resgatada`
                    : mission.completed
                        ? `Resgatar ${formatNumber(mission.rewardXp)} XP da missão ${mission.title}`
                        : `${mission.title}: ${formatPercent(progress.percent)} concluído`
            });
            if (mission.claimed || !mission.completed) button.disabled = true;
            else button.addEventListener('click', () => requestMissionClaim(mission, button));
            footer.append(button);
            card.append(top, progressCopy, track, footer);
            container.append(card);
        });
    }

    function historyIcon(type) {
        const normalized = String(type || '').toLowerCase();
        if (normalized.includes('mission')) return '✓';
        if (normalized.includes('question')) return '◎';
        if (normalized.includes('review') || normalized.includes('flashcard')) return '↻';
        if (normalized.includes('essay')) return '✎';
        if (normalized.includes('mock')) return '◆';
        if (normalized.includes('error')) return '◇';
        return '↑';
    }

    function formatHistoryDate(value) {
        const date = new Date(number(value) || value);
        if (Number.isNaN(date.getTime())) return 'Registro recente';
        const today = new Date();
        const sameDay = date.toDateString() === today.toDateString();
        return new Intl.DateTimeFormat('pt-BR', sameDay
            ? { hour: '2-digit', minute: '2-digit' }
            : { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }
        ).format(date).replace('.', '');
    }

    function renderRankHistory(items) {
        const list = document.getElementById('kmRankHistoryList');
        if (!list) return;
        list.replaceChildren();
        if (!items.length) {
            const empty = element('li', 'km-rank-history__empty');
            empty.append(element('span', '', '◇', { 'aria-hidden': 'true' }), element('strong', '', 'O histórico começa com atividade real'), element('p', '', 'Sessões, questões, missões e outros avanços aparecerão aqui.'));
            list.append(empty);
            return;
        }
        items.slice(0, 7).forEach(item => {
            const row = element('li', 'km-rank-history__item');
            const icon = element('span', 'km-rank-history__icon', historyIcon(item?.type), { 'aria-hidden': 'true' });
            const copy = element('div');
            const eventDate = new Date(number(item?.occurredAt) || item?.occurredAt);
            const datetime = Number.isNaN(eventDate.getTime()) ? null : eventDate.toISOString();
            copy.append(
                element('strong', '', String(item?.label || 'Progresso registrado').slice(0, 100)),
                element('time', '', formatHistoryDate(item?.occurredAt), { datetime })
            );
            const xp = number(item?.xp ?? item?.seasonXp);
            row.append(icon, copy, element('b', '', xp > 0 ? `+${formatNumber(xp)} XP` : 'Registrado'));
            list.append(row);
        });
    }

    function seasonCountdown(endAt) {
        const remaining = number(endAt) - Date.now();
        if (remaining <= 0) return 'Encerramento em processamento';
        const days = Math.floor(remaining / 86400000);
        const hours = Math.floor((remaining % 86400000) / 3600000);
        if (days > 0) return `${plural(days, 'dia', 'dias')} e ${hours}h restantes`;
        const minutes = Math.max(1, Math.floor((remaining % 3600000) / 60000));
        return `${hours}h ${minutes}min restantes`;
    }

    function renderSeasonHub(summary) {
        const missions = summary.rank.missions;
        text('kmSeasonTitle', summary.rank.seasonLabel || 'Temporada atual');
        text('kmSeasonCycle', summary.rank.division ? `${summary.rank.league} · ${summary.rank.division}` : summary.rank.league);
        text('kmSeasonCountdown', summary.rank.source === 'v2' ? seasonCountdown(summary.rank.seasonEndAt) : 'Ative a classificação avançada para acompanhar sua liga');
        const daily = asArray(missions?.daily);
        const weekly = asArray(missions?.weekly);
        renderMissionGroup('kmDailyMissions', daily, summary.rank.source === 'v2' ? 'As missões diárias serão renovadas no próximo ciclo.' : 'O novo motor de ranking está preparando suas missões.');
        renderMissionGroup('kmWeeklyMissions', weekly, summary.rank.source === 'v2' ? 'As missões semanais serão renovadas no próximo ciclo.' : 'As campanhas semanais aparecerão após a ativação do ranking.');
        text('kmMissionClaimable', missions ? `${number(missions.claimable)} para resgatar` : 'Aguardando ranking');
        const claimable = document.getElementById('kmMissionClaimable');
        claimable?.classList.toggle('has-reward', number(missions?.claimable) > 0);
        renderRankHistory(summary.rank.recentHistory);
    }

    function renderLegacyStatCards(summary) {
        const cards = state.root?.querySelectorAll('.profile-stat-card');
        if (!cards?.length) return;
        const descriptions = [
            summary.rank.streak ? 'Dias consecutivos de estudo válido' : 'Comece hoje para abrir sua sequência',
            summary.metrics.totalSeconds ? `${summary.metrics.sessions} sessões registradas` : 'Seu tempo aparecerá após a primeira sessão',
            summary.metrics.topics ? `${summary.metrics.masteredTopics} de ${summary.metrics.topics} tópicos` : 'Adicione tópicos às suas matérias',
            summary.metrics.attempts ? `${summary.metrics.hits} acertos em ${summary.metrics.attempts} questões` : 'Registre questões para medir precisão'
        ];
        cards.forEach((card, index) => {
            let hint = card.querySelector('.km-profile-stat-hint');
            if (!hint) {
                hint = element('small', 'km-profile-stat-hint km-profile-v2-owned');
                card.append(hint);
            }
            hint.textContent = descriptions[index] || '';
        });
    }

    function renderWeekly(summary) {
        text('kmWeekTotal', formatDuration(summary.metrics.weekSeconds));
        const bars = document.getElementById('kmWeeklyBars');
        if (!bars) return;
        bars.replaceChildren();
        const maximum = Math.max(...summary.metrics.weekly.map(number), 3600);
        const todayIndex = (new Date().getDay() + 6) % 7;
        summary.metrics.weekly.forEach((seconds, index) => {
            const safeSeconds = Math.max(0, number(seconds));
            const height = safeSeconds ? Math.max(9, Math.round((safeSeconds / maximum) * 100)) : 3;
            const item = element('div', `km-weekly-pulse__day${index === todayIndex ? ' is-today' : ''}${safeSeconds ? ' has-data' : ''}`, null, {
                role: 'listitem', 'aria-label': `${DAY_LABELS[index]}: ${formatDuration(safeSeconds)} de estudo`
            });
            const track = element('span', 'km-weekly-pulse__bar', null, { 'aria-hidden': 'true' });
            track.style.setProperty('--km-bar-height', `${height}%`);
            item.append(element('small', '', safeSeconds ? formatDuration(safeSeconds).replace('min', 'm') : '—'), track, element('b', '', DAY_LABELS[index]));
            bars.append(item);
        });
    }

    function renderAchievements(summary) {
        const all = achievementList(summary);
        const unlocked = all.filter(item => item.unlocked);
        const filtered = all.filter(item => (state.achievementFilter === 'all' || (state.achievementFilter === 'unlocked' ? item.unlocked : !item.unlocked))
            && (state.achievementTier === 'all' || item.tier === state.achievementTier));
        const grid = document.getElementById('kmAchievementGrid');
        const empty = document.getElementById('kmAchievementEmpty');
        if (!grid) return;
        const overall = all.length ? Math.round((unlocked.length / all.length) * 100) : 0;
        const ring = document.getElementById('kmAchievementRing');
        if (ring) {
            ring.style.setProperty('--km-ring-progress', `${overall * 3.6}deg`);
            ring.setAttribute('aria-label', `${unlocked.length} de ${all.length} conquistas desbloqueadas`);
        }
        text('kmAchievementUnlocked', unlocked.length);
        if (ring?.lastElementChild) ring.lastElementChild.textContent = `de ${all.length}`;
        const next = all.filter(item => !item.unlocked).sort((a, b) => b.progress - a.progress)[0];
        text('kmAchievementNext', next ? `Mais próxima: ${next.name} · ${formatPercent(next.progress)}` : 'Todas as conquistas disponíveis foram concluídas.');
        text('kmAchievementCount', plural(filtered.length, 'conquista', 'conquistas'));
        grid.replaceChildren();
        filtered.forEach((achievement, index) => {
            const card = element('article', `km-achievement-card is-${achievement.tone}${achievement.unlocked ? ' is-unlocked' : ' is-locked'}`, null, {
                'aria-labelledby': `km-achievement-name-${index}`
            });
            const top = element('div', 'km-achievement-card__top');
            top.append(
                element('span', 'km-achievement-card__icon material-symbols-rounded', achievement.icon, { 'aria-hidden': 'true' }),
                element('span', 'km-achievement-card__state', achievement.tierLabel)
            );
            const copy = element('div', 'km-achievement-card__copy');
            copy.append(element('h3', '', achievement.name, { id: `km-achievement-name-${index}` }), element('p', '', achievement.description));
            const progress = element('div', 'km-achievement-card__progress');
            const progressCopy = element('div');
            progressCopy.append(element('span', '', achievement.unlocked ? 'Conquistada' : achievement.label), element('strong', '', formatPercent(achievement.progress)));
            const track = element('div', '', null, {
                role: 'progressbar', 'aria-label': `Progresso de ${achievement.name}`,
                'aria-valuemin': '0', 'aria-valuemax': '100', 'aria-valuenow': String(Math.round(achievement.progress))
            });
            const fill = element('span');
            fill.style.setProperty('--km-achievement-progress', `${achievement.progress}%`);
            track.append(fill);
            progress.append(progressCopy, track);
            card.append(top, copy, progress);
            grid.append(card);
        });
        if (empty) empty.hidden = filtered.length > 0;
    }

    function setAchievementFilter(filter) {
        if (!['all', 'unlocked', 'locked'].includes(filter)) return;
        state.achievementFilter = filter;
        document.querySelectorAll('[data-achievement-filter]').forEach(button => {
            const active = button.dataset.achievementFilter === filter;
            button.classList.toggle('is-active', active);
            button.setAttribute('aria-pressed', String(active));
        });
        if (state.lastSummary) renderAchievements(state.lastSummary);
    }

    function renderFrameState() {
        const count = document.getElementById('frameVaultCount')?.textContent?.trim();
        const heading = state.root?.querySelector('.frame-vault-heading h3');
        if (heading && count) heading.setAttribute('aria-description', count);
        const grid = document.getElementById('frameVaultGrid');
        if (!grid) return;
        const currentEmpty = grid.parentElement?.querySelector('.km-frame-empty');
        if (grid.children.length) {
            currentEmpty?.remove();
            return;
        }
        if (currentEmpty) return;
        const empty = element('div', 'km-frame-empty km-profile-v2-owned');
        empty.append(element('span', '', '◇', { 'aria-hidden': 'true' }), element('strong', '', 'A coleção ainda está sendo preparada'), element('p', '', 'Seus visuais aparecerão aqui assim que o sistema de evolução terminar de carregar.'));
        grid.insertAdjacentElement('afterend', empty);
    }

    function render() {
        if (state.destroyed || !state.root?.isConnected) return;
        const summary = buildSummary();
        state.lastSummary = summary;
        renderIdentity(summary);
        renderRankBrief(summary);
        renderSeasonHub(summary);
        renderLegacyStatCards(summary);
        renderWeekly(summary);
        renderAchievements(summary);
        renderFrameState();
        if (state.boardLoadedAt) window.KingPublicRanking?.syncIfJoined().catch(() => {});
        applySemantics();
        state.root.dataset.profileOverhaulReady = 'true';
    }

    function scheduleRender() {
        if (state.refreshFrame || state.destroyed) return;
        state.refreshFrame = window.requestAnimationFrame(() => {
            state.refreshFrame = 0;
            render();
        });
    }

    function mutationNeedsRefresh(mutation) {
        const target = mutation.target instanceof Element ? mutation.target : mutation.target.parentElement;
        if (!target || target.closest('.km-profile-v2-owned')) return false;
        return Boolean(target.closest([
            '#profileLeagueName', '#profileLevelTitle', '#profileNextLevel', '#profileXpText', '#profileXpPercent',
            '#profileStreak', '#profileTotalTime', '#profileTopics', '#profileAccuracy', '#profileDisplayName',
            '#profileDisplayBio', '#frameVaultGrid', '#frameVaultCount', '.profile-hero', '.profile-stats-grid'
        ].join(',')));
    }

    function connectObserver() {
        if (!state.root || state.observer) return;
        state.observer = new MutationObserver(mutations => {
            if (mutations.some(mutationNeedsRefresh)) scheduleRender();
        });
        state.observer.observe(state.root, { subtree: true, childList: true, characterData: true });
    }

    function prepare(root) {
        state.root = root;
        root.classList.add('km-profile-v2');
        root.dataset.profileOverhaul = VERSION;
        root.querySelector('.profile-overview-grid')?.setAttribute('id', 'perfil-progresso');
        root.querySelector('.profile-overview-grid')?.setAttribute('tabindex', '-1');
        document.getElementById('kmProfileNav')?.remove();
        createProfileTabs(root);
        enhanceIdentity();
        createRankBrief(root);
        createPublicBoard(root);
        createUserSearch(root);
        createSeasonHub(root);
        createWeeklyPulse();
        createAchievements(root);
        enhanceFrameVault();
        window.addEventListener('king-public-ranking-ready', startPublicBoard);
        window.addEventListener('king-public-ranking-auth-changed', startPublicBoard);
        window.addEventListener('king-master-auth-ready', () => { state.boardLoadedAt = 0; startPublicBoard(); });
        document.addEventListener('keydown', event => {
            if (event.key === 'Escape' && document.getElementById('perfil-conquistas')?.classList.contains('is-fullscreen')) toggleAchievementsFullscreen(false);
        });
        connectObserver();
        render();
    }

    function init() {
        if (state.root || state.destroyed) return;
        const root = document.getElementById(PROFILE_ID);
        if (!root) return;
        prepare(root);
        window.addEventListener('king-master-data-changed', scheduleRender);
        window.addEventListener('king-rank-v2-ready', scheduleRender);
        window.addEventListener('king-rank-v2-updated', scheduleRender);
        window.addEventListener('king-rank-v2-change', scheduleRender);
        window.addEventListener('storage', event => {
            if (!event.key || event.key === DATA_KEY) scheduleRender();
            if (!event.key || event.key === ACHIEVEMENTS_VISIBILITY_KEY) {
                try { applyAchievementsVisibility(localStorage.getItem(ACHIEVEMENTS_VISIBILITY_KEY) === 'true'); } catch { /* Mantém o estado atual. */ }
            }
        });
        document.addEventListener('visibilitychange', () => { if (!document.hidden) scheduleRender(); });
        [600, 1800, 5000].forEach(delay => window.setTimeout(scheduleRender, delay));
    }

    function destroy() {
        state.destroyed = true;
        stopPublicBoard();
        state.observer?.disconnect();
        if (state.refreshFrame) cancelAnimationFrame(state.refreshFrame);
        window.removeEventListener('king-master-data-changed', scheduleRender);
        window.removeEventListener('king-rank-v2-ready', scheduleRender);
        window.removeEventListener('king-rank-v2-updated', scheduleRender);
        window.removeEventListener('king-rank-v2-change', scheduleRender);
        state.root?.classList.remove('km-profile-v2');
        state.root?.querySelectorAll('.km-profile-v2-owned').forEach(node => node.remove());
        state.root = null;
    }

    window.KingProfileOverhaul = Object.freeze({
        VERSION,
        init,
        refresh: scheduleRender,
        destroy,
        getSummary: () => state.lastSummary ? { metrics: { ...state.lastSummary.metrics }, rank: { ...state.lastSummary.rank } } : null
    });

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
    else init();
})();
