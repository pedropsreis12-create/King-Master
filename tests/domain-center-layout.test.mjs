import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const [html, styles] = await Promise.all([
  readFile(new URL('../index.html', import.meta.url), 'utf8'),
  readFile(new URL('../domain-center.css', import.meta.url), 'utf8')
]);

test('mastery center uses full-width sections instead of mismatched tall columns', () => {
  assert.match(styles, /\.domain-center-layout\s*\{[^}]*grid-template-columns:\s*minmax\(0,\s*1fr\)/);
  assert.match(styles, /#domainPriorityList\s*\{[^}]*grid-template-columns:\s*repeat\(3,/);
  assert.match(styles, /#mapaContainer\s*\{[^}]*grid-template-columns:\s*repeat\(3,/);
  assert.match(html, /class="domain-center-legend"/);
});

test('priority and subject cards remain legible on narrow screens', () => {
  assert.match(styles, /\.domain-center-priority \.domain-center-action\s*\{[^}]*border-radius:\s*15px/);
  assert.match(styles, /\.domain-center-subject\s*\{[^}]*border-left:\s*3px solid var\(--subject-color\)/);
  assert.match(styles, /@media \(max-width: 680px\)[^{]*\{[^}]*#domainPriorityList, #mapaContainer\s*\{\s*grid-template-columns:\s*1fr/);
});
