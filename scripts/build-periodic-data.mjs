import { writeFile } from 'node:fs/promises';

// Source: PubChem (U.S. National Library of Medicine), downloaded for offline use.
// https://pubchem.ncbi.nlm.nih.gov/rest/pug/periodictable/JSON
const source = 'https://pubchem.ncbi.nlm.nih.gov/rest/pug/periodictable/JSON';
const namesPt = `Hidrogênio;Hélio;Lítio;Berílio;Boro;Carbono;Nitrogênio;Oxigênio;Flúor;Neônio;Sódio;Magnésio;Alumínio;Silício;Fósforo;Enxofre;Cloro;Argônio;Potássio;Cálcio;Escândio;Titânio;Vanádio;Cromo;Manganês;Ferro;Cobalto;Níquel;Cobre;Zinco;Gálio;Germânio;Arsênio;Selênio;Bromo;Criptônio;Rubídio;Estrôncio;Ítrio;Zircônio;Nióbio;Molibdênio;Tecnécio;Rutênio;Ródio;Paládio;Prata;Cádmio;Índio;Estanho;Antimônio;Telúrio;Iodo;Xenônio;Césio;Bário;Lantânio;Cério;Praseodímio;Neodímio;Promécio;Samário;Európio;Gadolínio;Térbio;Disprósio;Hólmio;Érbio;Túlio;Itérbio;Lutécio;Háfnio;Tântalo;Tungstênio;Rênio;Ósmio;Irídio;Platina;Ouro;Mercúrio;Tálio;Chumbo;Bismuto;Polônio;Astato;Radônio;Frâncio;Rádio;Actínio;Tório;Protactínio;Urânio;Netúnio;Plutônio;Amerício;Cúrio;Berquélio;Califórnio;Einstênio;Férmio;Mendelévio;Nobélio;Laurêncio;Rutherfórdio;Dúbnio;Seabórgio;Bóhrio;Hássio;Meitnério;Darmstádio;Roentgênio;Copernício;Nihônio;Fleróvio;Moscóvio;Livermório;Tenesso;Oganessônio`.split(';');

const response = await fetch(source);
if (!response.ok) throw new Error(`PubChem: HTTP ${response.status}`);
const raw = await response.json();
const elements = raw?.Table?.Row?.map(({ Cell: cell }) => ({
    number: Number(cell[0]),
    symbol: cell[1],
    name: namesPt[Number(cell[0]) - 1],
    englishName: cell[2],
    mass: cell[3],
    configuration: cell[5],
    state: cell[11],
    category: cell[15]
}));

if (elements?.length !== 118 || namesPt.length !== 118 || elements[0]?.symbol !== 'H' || elements[117]?.symbol !== 'Og') {
    throw new Error('A resposta da fonte não contém os 118 elementos esperados.');
}
if (elements.some((element, index) => element.number !== index + 1 || !element.name)) {
    throw new Error('A ordem ou a tradução dos elementos precisa ser conferida.');
}

const header = `// Fonte: ${source}\n// Dados da PubChem armazenados localmente; nomes exibidos em português do Brasil.\n`;
await writeFile(new URL('../periodic-table-data.js', import.meta.url), `${header}globalThis.KingPeriodicData = Object.freeze(${JSON.stringify(elements, null, 2)});\n`, 'utf8');
