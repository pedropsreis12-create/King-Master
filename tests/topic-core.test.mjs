import test from 'node:test';
import assert from 'node:assert/strict';
import '../topic-core.js';
const Core = globalThis.KingTopicCore;

test('migração dá ids estáveis a assuntos e liga registros legados sem perder dados', () => {
    const data = {
        cycleItems: [{ id: 1, subject: 'Matemática', topicos: [{ nome: 'Porcentagem', caderno: { paginas: [{ id: 'p1', texto: 'Exemplo' }] } }] }],
        historyItems: [{ materia: 'Matemática', assunto: 'Porcentagem' }],
        revisoesItems: [{ materia: 'Matemática', assunto: 'porcentagem' }],
        cadernoErrosItems: [{ materia: 'Matemática', assunto: 'PORCENTAGEM' }],
        practiceSessions: [{ subjectId: 1, topic: 'Porcentagem' }],
        flashcards: { decks: [{ subjectId: '1', topic: 'Porcentagem' }] }
    };
    assert.ok(Core.migrate(data) > 0);
    const topic = data.cycleItems[0].topicos[0];
    assert.match(topic.id, /^assunto-/);
    for (const item of [data.historyItems[0], data.revisoesItems[0], data.cadernoErrosItems[0], data.practiceSessions[0], data.flashcards.decks[0]]) assert.equal(item.topicId, topic.id);
    assert.equal(Core.migrate(data), 0);
    assert.equal(topic.caderno.paginas[0].texto, 'Exemplo');
});

test('renomear por id preserva revisões concluídas, erros e histórico', () => {
    const subject = { id: 1, subject: 'Matemática', topicos: [{ id: 'assunto-1', nome: 'Porcentagem' }] };
    const data = { cycleItems: [subject], historyItems: [{ materia: 'Matemática', assunto: 'Porcentagem' }], revisoesItems: [{ status: 'revisado', topicId: 'assunto-1', assunto: 'Porcentagem' }], cadernoErrosItems: [{ topicId: 'assunto-1', assunto: 'Porcentagem' }] };
    Core.renameLinked(data, subject, subject.topicos[0], 'Porcentagem', 'Porcentagem e juros');
    assert.equal(data.historyItems[0].topicId, 'assunto-1');
    assert.equal(data.historyItems[0].assunto, 'Porcentagem e juros');
    assert.equal(data.revisoesItems[0].assunto, 'Porcentagem e juros');
    assert.equal(data.cadernoErrosItems[0].assunto, 'Porcentagem e juros');
});

test('tema é criado pela sintaxe do cadastro sem apagar assunto antigo', () => {
    const subject = { id: 1, subject: 'Matemática', topicos: [{ nome: 'MMC' }] };
    Core.ensureIds({ cycleItems: [subject] });
    const item = Core.parseTopicInput(subject, 'Geometria: Volume de prismas');
    assert.equal(item.nome, 'Volume de prismas');
    assert.equal(subject.temas[0].nome, 'Geometria');
    assert.equal(item.temaId, subject.temas[0].id);
    assert.equal(subject.topicos[0].nome, 'MMC');
    assert.equal(Core.parseTopicInput(subject, 'Geometria: Área').temaId, item.temaId);
});
