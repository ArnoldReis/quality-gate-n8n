/**
 * Public, original reference implementation for a PR quality gate.
 * Uses synthetic fields and no company rules, secrets, URLs or live integrations.
 * This is NOT an export of the production n8n workflow.
 */
export function evaluateQualityGate(input) {
  const pr = input?.pr ?? {};
  const repo = String(pr.repo ?? '');
  const number = Number(pr.number);
  const sha = String(pr.sha ?? '');
  if (!/^[a-z0-9_.-]+\/[a-z0-9_.-]+$/i.test(repo) ||
      !Number.isSafeInteger(number) || number < 1 ||
      !/^[a-f0-9]{40}$/i.test(sha)) {
    throw new Error('Invalid PR identity: cannot evaluate or persist');
  }

  const errors = [], pending = [], passed = [];
  const taskMatch = [pr.title, pr.branch, pr.body].join(' ').match(/\bTASK-[0-9]+\b/i);
  const taskKey = taskMatch?.[0]?.toUpperCase() ?? null;
  if (!taskKey) errors.push('A linked task identifier is required');
  else if (String(input?.task?.id ?? '').toUpperCase() !== taskKey)
    pending.push('Linked task could not be verified');
  else passed.push('Linked task verified');

  if (pr.state !== 'open') pending.push('PR is not open');
  if (pr.draft === true) pending.push('PR is still a draft');

  const files = Array.isArray(input?.files) ? input.files : [];
  const declaredFiles = Number(pr.changedFiles ?? 0);
  if (!files.length || !Number.isSafeInteger(declaredFiles) ||
      declaredFiles !== files.length || declaredFiles < 1) {
    pending.push('Changed-file list is missing or incomplete');
  } else {
    passed.push('Changed-file list is complete');
    const sourceChanged = files.some(f => /^src\//.test(f) &&
      !/\.(test|spec)\.[cm]?[jt]sx?$/.test(f));
    const releaseNote = files.some(f => /^docs\/release-notes\/.*\.md$/.test(f));
    const waiver = /\bno-release-note:\s*\S.{8,}/i.test(String(pr.body ?? ''));
    if (sourceChanged && !releaseNote && !waiver)
      errors.push('Source change requires a release note or justified waiver');
    else passed.push('Release-note policy satisfied');
  }

  const requiredSteps = pr.base === 'main'
    ? ['lint', 'tests', 'build', 'coverage']
    : pr.base === 'develop' ? ['lint', 'tests', 'build'] : null;
  if (!requiredSteps) pending.push('Target branch has no defined policy');
  else {
    const runs = Array.isArray(input?.runs) ? input.runs : [];
    const run = runs.find(r => r.name === 'CI' && r.sha === sha);
    if (!run) pending.push('No CI run found for the exact commit');
    else if (run.status !== 'completed') pending.push('CI has not completed');
    else {
      const jobs = Array.isArray(run.jobs) ? run.jobs : [];
      const steps = jobs.flatMap(j => Array.isArray(j.steps) ? j.steps : []);
      if (!jobs.length || !steps.length) pending.push('CI lacks executed jobs or steps');
      for (const name of requiredSteps) {
        const step = steps.find(s => s.name === name);
        if (!step) pending.push('Required CI step missing: ' + name);
        else if (step.status === 'completed' && step.conclusion === 'failure')
          errors.push('Verified CI failure: ' + name);
        else if (step.status !== 'completed' || step.conclusion !== 'success')
          pending.push('Required CI step inconclusive: ' + name);
        else passed.push('CI step passed: ' + name);
      }
      if (run.conclusion !== 'success' && !errors.some(e => e.startsWith('Verified CI failure')))
        pending.push('CI result inconclusive; inspect runner and logs');
    }
  }

  return {
    status: errors.length ? 'REPROVADO' : pending.length ? 'PENDENTE' : 'APROVADO',
    auditKey: repo + '#' + number + '@' + sha.toLowerCase(),
    errors, pending, passed,
    reviewRequired: pending.length > 0
  };
}
