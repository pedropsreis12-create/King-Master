import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';

const source = readFileSync(new URL('../agenda-workspace.js', import.meta.url), 'utf8');
const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const script = readFileSync(new URL('../script.js', import.meta.url), 'utf8');
const cloud = readFileSync(new URL('../cloud-sync.js', import.meta.url), 'utf8');

function harness(items = []) {
    const appData = { agendaCategories: null, agendamentoItems: items };
    const window = {};
    let saved = 0;
    const inputs = {
        agendaCategoryForm: { reset() {} },
        agendaCategoryEditId: { value: '' },
        agendaCategoryName: { value: '', focus() {} },
        agendaCategoryColor: { value: '#123456' },
        agendaCategorySaveButton: { textContent: '' },
        agendamentoTypeInput: { value: '', dataset: {}, options: [], replaceChildren(...options) { this.options = options; } }
    };
    runInNewContext(source, {
        appData, window, document: { getElementById: id => inputs[id] || null },
        renderizarAgendamento() {}, saveAppData() { saved++; }, dataLocalISO: () => '2026-10-04',
        showToast() {}, fecharModal() {}, Date, Set, String, Math, JSON,
        Option: class { constructor(name, id) { this.textContent = name; this.value = id; } }
    });
    return { agenda: window.KingAgenda, appData, inputs, get saved() { return saved; } };
}

test('categorias antigas permanecem disponíveis sem mudar compromissos', () => {
    const h = harness([{ id: 1, type: 'Treino Físico', title: 'Correr', date: '2026-10-04', time: '15:00' }]);
    assert.equal(h.agenda.categoryForItem(h.appData.agendamentoItems[0]).name, 'Treino Físico');
    assert.equal(h.appData.agendamentoItems[0].type, 'Treino Físico');
    assert.equal(h.agenda.getCategory('sem-categoria').name, 'Sem categoria');
});

test('validação rejeita datas impossíveis e reconhece duplicatas', () => {
    const h = harness();
    assert.equal(h.agenda.validDate('2026-02-30'), false);
    assert.equal(h.agenda.validDate('2028-02-29'), true);
    assert.equal(h.agenda.keyFor({ title: ' Prova ', date: '2026-10-04', time: '14:00' }), 'prova|2026-10-04|14:00');
});

test('renomear e excluir categoria mantém compromissos sem perder dados', () => {
    const h = harness([{ id: 1, title: 'Consulta', type: 'Pessoal', date: '2026-10-04', time: '' }]);
    h.inputs.agendaCategoryEditId.value = 'pessoal';
    h.inputs.agendaCategoryName.value = 'Vida pessoal';
    h.agenda.saveCategory({ preventDefault() {} });
    assert.equal(h.appData.agendamentoItems[0].type, 'Vida pessoal');
    assert.equal(h.appData.agendamentoItems[0].categoryId, 'pessoal');
    h.agenda.deleteCategory('pessoal');
    assert.equal(h.appData.agendamentoItems[0].type, 'Sem categoria');
    assert.equal(h.appData.agendamentoItems[0].title, 'Consulta');
    assert.equal(h.appData.agendamentoItems[0].date, '2026-10-04');
    assert.equal(h.saved, 2);
});

test('categoria nova fica disponível e selecionada no compromisso', () => {
    const h = harness();
    h.inputs.agendaCategoryName.value = 'Saúde';
    h.agenda.saveCategory({ preventDefault() {} });
    const category = h.appData.agendaCategories.find(item => item.name === 'Saúde');
    assert.ok(category);
    assert.equal(h.inputs.agendamentoTypeInput.value, category.id);
    assert.equal(h.saved, 1);
});

test('interface da Agenda permite importar, revisar, editar categorias e omite duração', () => {
    assert.match(html, /id="agendaImportModal"/);
    assert.match(html, /id="agendaImportPreview"/);
    assert.match(html, /id="agendaCategoriesModal"/);
    assert.doesNotMatch(html, /id="agendamentoDurationInput"/);
    assert.match(script, /categoryId: category\.id/);
    assert.match(cloud, /analyzeAgendaDocument/);
    assert.match(cloud, /start: \{ date: item\.date \}/);
});

test('se a IA expirar, datas legíveis do PDF viram sugestões revisáveis, não registros automáticos', () => {
    const h = harness();
    const items = h.agenda.localCandidates('Página 1:\n12/10/2026 14:30 Prova de História\n15/10/2026 Entrega da redação\n31/02/2026 Data inválida');
    assert.equal(items.length, 2);
    assert.equal(items[0].date, '2026-10-12');
    assert.equal(items[0].time, '14:30');
    assert.equal(items[0].title, 'Prova de História');
    assert.equal(items[0].needsReview, true);
    assert.equal(items[1].date, '2026-10-15');
    assert.equal(h.appData.agendamentoItems.length, 0);
});

test('datas sem ano ficam vazias para conferência, sem inventar o ano', () => {
    const h = harness();
    const items = h.agenda.localCandidates('Página 1:\n12/10 Reunião escolar');
    assert.equal(items.length, 1);
    assert.equal(items[0].date, '');
    assert.equal(items[0].needsReview, true);
});
