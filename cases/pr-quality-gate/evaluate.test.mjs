import test from 'node:test';
import assert from 'node:assert/strict';
import { evaluateQualityGate } from './evaluate.mjs';

const SHA = '0123456789abcdef0123456789abcdef01234567';
const sample = {
  pr: {
    repo: 'demo/sample-repo', number: 42, sha: SHA, state: 'open',
    draft: false, base: 'develop', branch: 'feature/TASK-123',
    title: 'TASK-123 add example endpoint',
    body: '', changedFiles: 2
  },
  task: { id: 'TASK-123' },
  files: ['src/api.js', 'docs/release-notes/v0.1.md'],
  runs: [{
    name: 'CI', sha: SHA, status: 'completed', conclusion: 'success',
    jobs: [{ name: 'ci', steps: ['lint', 'tests', 'build'].map(name =>
      ({ name, status: 'completed', conclusion: 'success' })) }]
  }]
};
const deep = x => structuredClone(x);

test('approves only with positive evidence', () => {
  const result = evaluateQualityGate(deep(sample));
  assert.equal(result.status, 'APROVADO');
  assert.equal(result.pending.length, 0);
  assert.equal(result.errors.length, 0);
});

test('missing CI is pending, not approved', () => {
  const x = deep(sample); x.runs = [];
  assert.equal(evaluateQualityGate(x).status, 'PENDENTE');
});

test('running CI is pending, never a code failure', () => {
  const x = deep(sample); x.runs[0].status = 'queued';
  assert.equal(evaluateQualityGate(x).status, 'PENDENTE');
});

test('a proven lint failure rejects the PR', () => {
  const x = deep(sample);
  x.runs[0].conclusion = 'failure';
  x.runs[0].jobs[0].steps[0].conclusion = 'failure';
  const result = evaluateQualityGate(x);
  assert.equal(result.status, 'REPROVADO');
  assert.match(result.errors.join(' '), /lint/);
});

test('missing mandatory step is pending even with a green run', () => {
  const x = deep(sample);
  x.runs[0].jobs[0].steps = [];
  assert.equal(evaluateQualityGate(x).status, 'PENDENTE');
});

test('main requires coverage, develop does not', () => {
  const x = deep(sample); x.pr.base = 'main';
  assert.equal(evaluateQualityGate(x).status, 'PENDENTE');
  x.runs[0].jobs[0].steps.push({name:'coverage',status:'completed',conclusion:'success'});
  assert.equal(evaluateQualityGate(x).status, 'APROVADO');
});

test('release-note omission is rejected for source changes', () => {
  const x = deep(sample);
  x.files = ['src/api.js', 'src/helper.js'];
  assert.equal(evaluateQualityGate(x).status, 'REPROVADO');
});

test('the same PR and SHA yield a stable audit key', () => {
  const first = evaluateQualityGate(deep(sample));
  const second = evaluateQualityGate(deep(sample));
  assert.equal(first.auditKey, second.auditKey);
});

test('invalid PR identity is never persisted as a valid audit key', () => {
  const x = deep(sample); x.pr.sha = 'not-a-sha';
  assert.throws(() => evaluateQualityGate(x), /Invalid PR identity/);
});
