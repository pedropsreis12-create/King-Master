import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const codigo = fs.readFileSync(new URL('../subject-icons.js', import.meta.url), 'utf8');
const contexto = { window: {} };
vm.runInNewContext(codigo, contexto);
const Icons = contexto.window.KingSubjectIcons;

test('cada matéria do ENEM ganha o seu próprio ícone', () => {
    const casos = {
        'Matemática': 'matematica', 'Geometria plana': 'geometria', 'Estatística': 'estatistica',
        'Física': 'fisica', 'Química': 'quimica', 'Biologia': 'biologia',
        'História': 'historia', 'Geografia': 'geografia', 'Filosofia': 'filosofia', 'Sociologia': 'sociologia',
        'Português': 'portugues', 'Gramática': 'portugues', 'Literatura': 'literatura', 'Inglês': 'idiomas',
        'Língua Estrangeira': 'idiomas', 'Artes': 'artes', 'Educação Física': 'educacaoFisica',
        'Redação': 'redacao', 'Interpretação de texto': 'interpretacao', 'Atualidades': 'atualidades',
    };
    for (const [nome, esperado] of Object.entries(casos)) assert.equal(Icons.chave(nome), esperado, nome);
    const usados = new Set(Object.values(casos));
    for (const id of usados) assert.ok(Icons.ICONES[id], `ícone ${id} existe`);
});

test('matéria desconhecida usa o ícone da área ou fica sem ícone próprio', () => {
    assert.equal(Icons.chave('Revisão geral', 'natureza'), 'biologia');
    assert.equal(Icons.chave('Revisão geral', 'outra'), '');
    assert.equal(Icons.paraMateria('Revisão geral', 'outra'), '');
    assert.match(Icons.paraMateria('Física'), /^<svg class="subject-icon-svg"/);
});
