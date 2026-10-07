import test from 'node:test';
import assert from 'node:assert/strict';
import '../caderno-library-core.js';
const core = globalThis.KingLibraryCore;

const data = () => ({ cycleItems: [{ id: 1, subject: 'Matemática', temas: [{ id: 'a', nome: 'Álgebra' }], topicos: [{ id: 't', nome: 'Regra de três', temaId: 'a', notas: 'Anotação antiga', caderno: { paginas: [{ id: 'p', titulo: 'Resumo', texto: '**proporção**', criadoEm: 1 }] } }] }] });

test('reúne as páginas existentes sem alterar a organização por matéria e assunto', () => {
    const entries = core.collect(data());
    assert.equal(entries.length, 1);
    assert.equal(entries[0].subject.subject, 'Matemática');
    assert.equal(entries[0].theme, 'Álgebra');
    assert.equal(entries[0].topic.nome, 'Regra de três');
});

test('migra a anotação antiga apenas uma vez', () => {
    const state = data();
    assert.equal(core.migrateLegacy(state, () => 'legacy'), 1);
    assert.equal(core.migrateLegacy(state, () => 'legacy2'), 0);
    assert.equal(state.cycleItems[0].topicos[0].caderno.paginas.length, 2);
});

test('mantém versões limitadas e permite restaurar sem apagar o estado atual', () => {
    const page = { titulo: 'Atual', texto: 'Novo', versoes: [] };
    core.snapshot(page, 'v1', 1);
    page.texto = 'Mais novo';
    assert.equal(core.restore(page, 'v1', 'backup', 2), true);
    assert.equal(page.texto, 'Novo');
    assert.equal(page.versoes[0].texto, 'Mais novo');
    for (let i = 0; i < 15; i++) { page.texto = `Edição ${i}`; core.snapshot(page, `v${i}`, i + 3); }
    assert.equal(page.versoes.length, 8);
});

test('renderiza Markdown simples sem executar HTML fornecido pelo usuário', () => {
    const html = core.markdown('# Aula\n<script>alert(1)</script>\n**importante**');
    assert.match(html, /<h1>Aula<\/h1>/);
    assert.match(html, /&lt;script&gt;/);
    assert.doesNotMatch(html, /<script>/);
    assert.match(html, /<strong>importante<\/strong>/);
});
