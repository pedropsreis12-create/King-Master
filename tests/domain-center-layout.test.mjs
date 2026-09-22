import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const [html, styles] = await Promise.all([
  readFile(new URL('../index.html', import.meta.url), 'utf8'),
  readFile(new URL('../domain-center.css', import.meta.url), 'utf8')
]);

test('mastery center focuses on full-width subject cards without the suggested-topics panel', () => {
  assert.doesNotMatch(html, /id="domainPriorityList"|class="domain-center-priority widget"/);
  assert.doesNotMatch(styles, /#domainPriorityList|\.domain-center-priority/);
  assert.match(styles, /#mapaContainer\s*\{[^}]*grid-template-columns:\s*repeat\(3,/);
  assert.match(html, /class="domain-center-legend"/);
});

test('subject cards remain legible on narrow screens', () => {
  assert.match(styles, /\.domain-center-subject\s*\{[^}]*border-left:\s*3px solid var\(--subject-color\)/);
  assert.match(styles, /@media \(max-width: 680px\)[^{]*\{[^}]*#mapaContainer\s*\{\s*grid-template-columns:\s*1fr/);
});
