import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const [html, script, cloud, styles] = await Promise.all([
  readFile(new URL('../index.html', import.meta.url), 'utf8'),
  readFile(new URL('../script.js', import.meta.url), 'utf8'),
  readFile(new URL('../cloud-sync.js', import.meta.url), 'utf8'),
  readFile(new URL('../chapter-refresh.css', import.meta.url), 'utf8')
]);

test('chapter browser focuses one subject and offers search, filters and paging', () => {
  assert.match(script, /document\.querySelector\('\.domain-center-subjects'\)\.hidden = true/);
  assert.match(script, /function fecharCadernosDominio\(\)[\s\S]*?\.hidden = false/);
  assert.match(html, /data-chapter-filter="revisar"/);
  assert.match(html, /id="chapterLoadMore"/);
  assert.match(script, /topicos\.slice\(0, cadernoCapituloAtual\.limite\)/);
  assert.match(styles, /\.domain-center-subjects\[hidden\]/);
});

test('Gemini summary is read-only until confirmed as a new notebook page', () => {
  assert.match(cloud, /const modeloResumoCaderno = aiSdk\.getGenerativeModel/);
  assert.match(cloud, /async summarizeText\(payload = \{\}\)/);
  assert.doesNotMatch(cloud.match(/const modeloResumoCaderno = [\s\S]*?\}, \{ timeout: 40000 \}\);/)?.[0] || '', /tools:/);
  assert.match(html, /id="chapterSummaryPreview" hidden/);
  assert.match(html, /onclick="salvarResumoNoCaderno\(\)"/);
  assert.match(script, /topico\.caderno\.paginas\.push\(pagina\)/);
  assert.match(script, /if \(!topico \|\| !document\.getElementById\('chapterSummaryModal'\)\.classList\.contains\('active'\)\) return/);
});

test('profile places compact rank panel beside existing statistics', () => {
  assert.match(html, /class="profile-overview-grid"/);
  assert.match(html, /class="profile-stats-panel"/);
  assert.match(styles, /\.profile-overview-grid \{ display: grid; grid-template-columns:/);
  assert.match(styles, /@media \(max-width: 950px\)/);
});
