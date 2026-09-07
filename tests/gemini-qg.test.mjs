import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFile } from 'node:fs/promises';

const uiSource = await readFile(new URL('../ai-assistant.js', import.meta.url), 'utf8');
const cloudSource = await readFile(new URL('../cloud-sync.js', import.meta.url), 'utf8');

function element(tag = 'div') {
    const el = { tagName: tag.toUpperCase(), nodeType: tag === '#text' ? 3 : 1, children: [], style: {}, dataset: {}, attributes: {},
        classList: { add() {}, remove() {}, contains() { return false; }, toggle() {} },
        setAttribute(name, value) { this.attributes[name] = value; }, remove() {},
        append(...items) { this.children.push(...items); }, appendChild(item) { this.children.push(item); },
        replaceChildren(...items) { this.children = [...items]; this.ownText = ''; },
        querySelector(selector) {
            const matches = node => selector.startsWith('.') ? node.className === selector.slice(1) : node.tagName?.toLowerCase() === selector;
            return this.children.find(matches) || this.children.map(node => node.querySelector?.(selector)).find(Boolean) || null;
        },
        ownText: '', get textContent() { return this.ownText + this.children.map(node => node.textContent).join(''); },
        set textContent(value) { this.ownText = String(value); this.children = []; },
        set innerHTML(_value) { throw new Error('Do not interpret HTML in AI messages'); }
    };
    return el;
}

function uiHarness() {
    const appData = { aiConversation: [], cycleItems: [], revisoesItems: [], agendamentoItems: [], historyItems: [], weeklyChart: [0, 0, 0, 0, 0, 0, 0], simuladosItems: [] };
    let saves = 0;
    const window = {};
    const context = vm.createContext({ appData, window, console, Date, Intl, DOMException, AbortController, setTimeout, clearTimeout,
        document: { createElement: element, createTextNode(text) { const node = element('#text'); node.textContent = text; return node; }, getElementById() { return null; }, querySelector() { return null; }, addEventListener() {}, documentElement: { dataset: {}, style: { setProperty() {} } } },
        requestAnimationFrame(fn) { fn(); },
        calcularGamificacao() { return { nivel: 1, xpTotal: 0, sequencia: 0 }; },
        dataLocalISO(date) { return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`; },
        dataHistoricoISO(item) { return item.dataISO; },
        renderizarCiclo() {}, renderizarRevisoes() {}, renderizarAgendamento() {}, aplicarIdentidadePerfil() {}, showSection() {}, showToast() {},
        formatarNumero: String, saveAppData() { saves += 1; }
    });
    vm.runInContext(uiSource, context);
    return { context, appData, window, get saves() { return saves; } };
}

function modelResponse({ text = '', calls = [], parts } = {}) {
    const contentParts = parts || [...(text ? [{ text }] : []), ...calls.map(functionCall => ({ functionCall }))];
    return { text: () => text, functionCalls: () => contentParts.filter(part => part.functionCall).map(part => part.functionCall), candidates: [{ content: { role: 'model', parts: contentParts } }] };
}

async function cloudHarness(replies, executeTool = () => ({ ok: true, message: 'Salvo.' }), persistChanges = () => {}) {
    const records = { starts: [], requests: [], tools: [], saves: 0, warnings: [] };
    const schema = new Proxy({}, { get: (_, key) => value => ({ type: key, ...value }) });
    const sdk = {
        'firebase-app': { initializeApp() { return {}; } },
        'firebase-auth': { getAuth() { return {}; }, GoogleAuthProvider: class {}, setPersistence: async () => {}, getRedirectResult: async () => {}, onAuthStateChanged() {} },
        'firebase-firestore': { getFirestore() { return {}; } },
        'firebase-app-check': { initializeAppCheck() { return {}; }, ReCaptchaEnterpriseProvider: class {}, getToken: async () => ({ token: 'fixture-token' }) },
        'firebase-ai': { Schema: schema, ThinkingLevel: { LOW: 'LOW', MEDIUM: 'MEDIUM' }, getAI() { return {}; }, GoogleAIBackend: class {},
            getGenerativeModel(_ai, config) {
                return { async generateContentStream(request, requestOptions) {
                    records.requests.push({ config, request: JSON.parse(JSON.stringify(request)), requestOptions });
                    const reply = replies.shift();
                    if (reply instanceof Error) throw reply;
                    if (typeof reply === 'function') return reply(requestOptions);
                    const response = modelResponse(reply);
                    return { response: Promise.resolve(response), stream: (async function* () {
                        if (reply?.text) { yield modelResponse({ text: reply.text.slice(0, 5) }); yield modelResponse({ text: reply.text.slice(5) }); }
                    })() };
                } };
            }
        }
    };
    const window = { KING_MASTER_FIREBASE_CONFIG: { apiKey: 'fixture', authDomain: 'fixture', projectId: 'fixture', appId: 'fixture' },
        location: { search: '' }, addEventListener() {}, KingMasterAI: {
            executeTool(name, args) { records.tools.push({ name, args }); return executeTool(name, args); },
            persistChanges() { records.saves += 1; persistChanges(); }
        }
    };
    const context = vm.createContext({ window, self: window, console: { ...console, warn(...items) { records.warnings.push(items); } }, Date, JSON, Set, Map, Promise, URLSearchParams, AbortController, DOMException, setTimeout, clearTimeout,
        document: { getElementById() { return null; } }, localStorage: { getItem() { return null; }, setItem() {} }, __sdk: sdk });
    const source = cloudSource.replace(/import\('https:\/\/www\.gstatic\.com\/firebasejs\/[^/]+\/(firebase-[\w-]+)\.js'\)/g, 'Promise.resolve(__sdk["$1"])');
    await vm.runInContext(`(async () => { ${source}\n})()`, context);
    return { gemini: window.kingGemini, records };
}

test('preserves long tutor answers and sends current data with local date', () => {
    const h = uiHarness();
    h.context.registrarMensagemIa('assistant', 'a'.repeat(5000));
    assert.equal(h.appData.aiConversation[0].text.length, 5000);
    const data = h.window.KingMasterAI.getContext();
    assert.match(data.dataLocal, /^\d{4}-\d{2}-\d{2}$/);
    assert.equal(data.progresso.minutosHoje, 0);
    assert.match(data.recorte, /ausência de avaliação/);
});

test('bulk topics are added together, without duplicates; ambiguous subject is rejected', () => {
    const h = uiHarness();
    h.appData.cycleItems.push({ id: 1, subject: 'Física', topicos: [{ nome: 'Cinemática' }] }, { id: 2, subject: 'Física moderna', topicos: [] });
    const response = h.window.KingMasterAI.executeTool('adicionar_topicos', { materia: 'Física', topicos: ['Cinemática', 'Dinâmica', 'Ondas'] });
    assert.equal(response.ok, true);
    assert.equal(h.appData.cycleItems[0].topicos.length, 3);
    assert.equal(h.window.KingMasterAI.executeTool('adicionar_topico', { materia: 'Fís', topico: 'Novo' }).ok, false);
    assert.equal(h.window.KingMasterAI.executeTool('concluir_topico', { materia: 'Física', topico: '' }).ok, false);
});

test('invalid dates and numeric values do not silently create another action', () => {
    const h = uiHarness();
    assert.equal(h.window.KingMasterAI.executeTool('agendar_estudo', { materia: 'Física', data: '2026-02-31', hora: '14:00' }).ok, false);
    assert.equal(h.window.KingMasterAI.executeTool('definir_meta_diaria', { minutos: '???' }).ok, false);
    assert.equal(h.appData.agendamentoItems.length, 0);
});

test('pending deletion is confirmed locally even while Gemini is available', async () => {
    const h = uiHarness();
    h.appData.cycleItems.push({ id: 1, subject: 'Matéria fixture', topicos: [] });
    h.window.kingGemini = { available: true, send() { throw new Error('Gemini must not interpret confirmation'); } };
    h.window.KingMasterAI.executeTool('solicitar_exclusao_materia', { materia: 'Matéria fixture' });
    await h.context.processarEntradaIa('confirmar');
    assert.equal(h.appData.cycleItems.length, 0);
    assert.match(h.appData.aiConversation.at(-1).text, /excluída com confirmação/);
});

test('cloud failure never executes a local substitute', async () => {
    const h = uiHarness();
    h.window.kingGemini = { available: true, async send() { throw new Error('network unavailable'); } };
    await h.context.processarEntradaIa('Adicione a matéria Física');
    assert.equal(h.appData.cycleItems.length, 0);
    assert.match(h.appData.aiConversation.at(-1).text, /Nenhuma ação foi executada/);
});

test('restores conversation, streams text and bounds history without repeated context', async () => {
    const h = await cloudHarness([{ text: 'Uma explicação de teste.' }, { text: 'Continuação.' }]);
    const history = Array.from({ length: 30 }, (_, index) => ({ role: index % 2 ? 'assistant' : 'user', text: `Mensagem ${index}` }));
    const chunks = [];
    const first = await h.gemini.send('Explique frações', { marker: 'current-context' }, { history, onText: text => chunks.push(text) });
    assert.equal(first.text, 'Uma explicação de teste.');
    assert.equal(chunks.length, 2);
    assert.equal(h.records.requests[0].request.contents.length, 17);
    assert.equal(h.records.requests[0].config.generationConfig.thinkingConfig.thinkingLevel, 'MEDIUM');
    await h.gemini.send('Agora simplifique', { marker: 'updated-context' }, { history: [{ role: 'user', text: 'Explique frações' }, { role: 'assistant', text: first.text }] });
    assert.equal(h.records.requests.length, 2);
    assert.equal(JSON.stringify(h.records.requests[1].request.contents).includes('current-context'), false);
    assert.equal(h.records.requests[1].request.contents.at(-1).parts[0].text.includes('updated-context'), true);
});

test('tool successes survive final response failure and repeated calls execute once', async () => {
    const call = { name: 'adicionar_materia', args: { nome: 'Física' } };
    const h = await cloudHarness([{ calls: [call, call] }, new Error('network failure')]);
    const result = await h.gemini.send('Adicione Física', {});
    assert.equal(h.records.tools.length, 1);
    assert.equal(h.records.saves, 1);
    assert.equal(result.actions.length, 1);
    assert.match(result.text, /Salvo/);
    assert.match(result.text, /já foram salvas/);
});

test('abort prevents a late response from executing any tool', async () => {
    let release;
    let requestStarted;
    const started = new Promise(resolve => { requestStarted = resolve; });
    const delayed = new Promise(resolve => { release = resolve; });
    const h = await cloudHarness([async () => { requestStarted(); return delayed; }]);
    const controller = new AbortController();
    const sent = h.gemini.send('Adicione Física', {}, { signal: controller.signal });
    await started;
    controller.abort();
    await assert.rejects(sent, { name: 'AbortError' });
    release({ response: Promise.resolve(modelResponse({ calls: [{ name: 'adicionar_materia', args: { nome: 'Física' } }] })), stream: (async function* () {})() });
    await new Promise(resolve => setTimeout(resolve, 0));
    assert.equal(h.records.tools.length, 0);
    assert.equal(h.records.saves, 0);
});

test('a failed tool can be retried after a dependency is created', async () => {
    const topics = { name: 'adicionar_topicos', args: { materia: 'Física', topicos: ['Ondas'] } };
    let hasSubject = false;
    const h = await cloudHarness([{ calls: [topics] }, { calls: [{ name: 'adicionar_materia', args: { nome: 'Física' } }] }, { calls: [topics] }, { text: 'Matéria e tópico adicionados.' }], name => {
        if (name === 'adicionar_materia') hasSubject = true;
        return hasSubject ? { ok: true, message: 'Criado.' } : { ok: false, message: 'Matéria não encontrada.' };
    });
    const result = await h.gemini.send('Adicione Física e Ondas', {});
    assert.equal(h.records.tools.length, 3);
    assert.equal(h.records.saves, 2);
    assert.equal(result.actions.at(-1).ok, true);
});

test('read-only tools refresh results after a mutation', async () => {
    const query = { name: 'listar_materias', args: {} };
    const h = await cloudHarness([{ calls: [query] }, { calls: [{ name: 'adicionar_materia', args: { nome: 'Física' } }] }, { calls: [query] }, { text: 'Lista atualizada.' }]);
    await h.gemini.send('Adicione Física e confira a lista', {});
    assert.equal(h.records.tools.filter(item => item.name === 'listar_materias').length, 2);
    assert.equal(h.records.saves, 1);
});

test('storage failure is reported without claiming changes were saved', async () => {
    const h = await cloudHarness([{ calls: [{ name: 'adicionar_materia', args: { nome: 'Física' } }] }], () => ({ ok: true, message: 'Matéria criada.' }), () => { throw new Error('QuotaExceededError'); });
    const result = await h.gemini.send('Adicione Física', {});
    assert.equal(result.error, true);
    assert.equal(result.actions[0].saved, false);
    assert.match(result.text, /não foi possível salvá-la/);
    assert.equal(h.records.requests.length, 1);
});

test('a second deletion cannot silently replace the pending confirmation', () => {
    const h = uiHarness();
    h.appData.cycleItems.push({ id: 1, subject: 'Física', topicos: [] }, { id: 2, subject: 'Química', topicos: [] });
    assert.equal(h.window.KingMasterAI.executeTool('solicitar_exclusao_materia', { materia: 'Física' }).ok, true);
    assert.equal(h.window.KingMasterAI.executeTool('solicitar_exclusao_materia', { materia: 'Química' }).ok, false);
    h.context.executarAcaoPendenteIa(true);
    assert.equal(h.appData.cycleItems[0].subject, 'Química');
});

test('assistant markdown creates compact headings, paragraphs, lists, bold and inline code', () => {
    const h = uiHarness();
    const article = h.context.criarMensagemVisualIa('assistant', '### Ligações químicas\n\nUm **exemplo** com `NaCl`.\n\n- Doação\n- Recepção\n\n1. Observe\n2. Compare', Date.now());
    const body = article.querySelector('.ai-qg-message-copy');
    assert.deepEqual(body.children.map(node => node.tagName), ['H4', 'P', 'UL', 'OL']);
    assert.equal(body.querySelector('h4').textContent, 'Ligações químicas');
    assert.equal(body.querySelector('strong').textContent, 'exemplo');
    assert.equal(body.querySelector('code').textContent, 'NaCl');
    assert.equal(body.querySelector('ul').children.length, 2);
    assert.equal(body.querySelector('ol').children.length, 2);
});

test('HTML, script, event attributes and javascript links stay inert text', () => {
    const h = uiHarness();
    const attack = '<img src=x onerror=alert(1)>\n\n**<svg onload=alert(2)>**\n\n[abrir](javascript:alert(3))\n\n`<script>alert(4)</script>`';
    const article = h.context.criarMensagemVisualIa('assistant', attack, Date.now());
    const body = article.querySelector('.ai-qg-message-copy');
    const allNodes = node => [node, ...node.children.flatMap(allNodes)];
    for (const node of allNodes(body)) {
        assert.ok(['DIV', 'P', 'STRONG', 'CODE', '#TEXT'].includes(node.tagName));
        assert.equal(Object.keys(node.attributes).length, 0);
    }
    assert.match(body.textContent, /<img src=x onerror=alert\(1\)>/);
    assert.match(body.textContent, /javascript:alert\(3\)/);
    assert.equal(article.querySelector('img'), null);
    assert.equal(article.querySelector('script'), null);
    assert.equal(article.querySelector('a'), null);
});

test('stream updates safely replace incomplete markdown and fenced code remains text', () => {
    const h = uiHarness();
    const body = element();
    h.context.renderizarConteudoIa(body, '**Ligação');
    assert.equal(body.textContent, '**Ligação');
    h.context.renderizarConteudoIa(body, '**Ligação iônica**\n\n```html\n<img onerror=alert(1)>');
    assert.equal(body.querySelector('strong').textContent, 'Ligação iônica');
    assert.equal(body.querySelector('pre').textContent, '<img onerror=alert(1)>');
    assert.equal(body.querySelector('img'), null);
    h.context.renderizarConteudoIa(body, 'Pronto.');
    assert.equal(body.children.length, 1);
    assert.equal(body.textContent, 'Pronto.');
});

test('user messages keep their exact plain text', () => {
    const h = uiHarness();
    const article = h.context.criarMensagemVisualIa('user', '**meu texto** <svg>', Date.now());
    assert.equal(article.querySelector('p').textContent, '**meu texto** <svg>');
    assert.equal(article.querySelector('strong'), null);
});

test('function responses preserve the exact call IDs for continuation', async () => {
    const h = await cloudHarness([{ calls: [{ name: 'abrir_area', id: 'function-call-fixture-1', args: { area: 'matérias' } }] }, { text: 'Hub aberto.' }]);
    const result = await h.gemini.send('Abra o hub', {});
    assert.equal(result.text, 'Hub aberto.');
    assert.equal(h.records.requests[1].request.contents.at(-1).parts[0].functionResponse.id, 'function-call-fixture-1');
    assert.equal(h.records.requests[1].request.contents.at(-1).parts[0].functionResponse.name, 'abrir_area');
});

test('diagnostic logs strip URLs, API keys, tokens and thought signatures', async () => {
    const err = Object.assign(new Error('Request https://example.invalid/path?key=secret failed apiKey: AIza123456789012345678901234567890 access_token: secret-token thoughtSignature: private-signature Bearer private-bearer'), { code: 'ai/fetch-error' });
    const h = await cloudHarness([err]);
    await assert.rejects(h.gemini.send('Teste', {}));
    const diagnostic = JSON.stringify(h.records.warnings);
    assert.match(diagnostic, /ai\/fetch-error/);
    for (const secret of ['example.invalid', 'AIza123', 'secret-token', 'private-signature', 'private-bearer']) assert.equal(diagnostic.includes(secret), false);
});

test('tool continuation uses user role and preserves complete model parts and signatures', async () => {
    const parts = [
        { text: '', thoughtSignature: 'fixture-signature-carrier' },
        { functionCall: { id: 'fixture-open-call', name: 'abrir_area', args: { area: 'matérias' } }, thoughtSignature: 'fixture-call-signature' },
        { text: 'Vou consultar seu hub.' }
    ];
    const h = await cloudHarness([{ parts }, { text: 'Hub aberto; você tem 3 matérias cadastradas.' }]);
    const result = await h.gemini.send('Abra o hub e conte minhas matérias', { totalMaterias: 3 });
    assert.match(result.text, /3 matérias/);
    const sent = h.records.requests[1].request.contents;
    assert.deepEqual(sent.map(content => content.role), ['user', 'model', 'user']);
    assert.deepEqual(sent[1].parts, parts);
    assert.equal(sent[2].parts[0].functionResponse.id, 'fixture-open-call');
    assert.equal(sent.some(content => content.role === 'function'), false);
    assert.equal(h.records.requests[0].request.contents.length, 1);
});
