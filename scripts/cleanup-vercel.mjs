import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

const PROJECT = 'prj_CCRONHpk7J6ewOYcIPb2aAZWYDr8';
const TEAM = 'team_XV0yqENlDJuiiWHigYHgtr51';
const idOf = d => d.uid ?? d.id;
const stateOf = d => d.readyState ?? d.state;
const timeOf = d => d.createdAt ?? d.created;

export function selectRemovals(deployments, currentId, cutoff) {
  if (!currentId || !Number.isFinite(cutoff)) throw new Error('Missing production identity or cutoff');
  const production = deployments.filter(d => d.target === 'production' && stateOf(d) === 'READY')
    .sort((a, b) => timeOf(b) - timeOf(a));
  const keep = new Set([currentId, ...production.slice(0, 3).map(idOf)]);
  return deployments.filter(d => d.projectId === PROJECT && !keep.has(idOf(d)) &&
    Number.isFinite(timeOf(d)) && timeOf(d) < cutoff &&
    ['READY', 'ERROR', 'CANCELED'].includes(stateOf(d)) &&
    (d.target === 'production' || d.target == null || d.target === 'preview'));
}

export async function cleanup({ token, event = {}, dryRun = true, request = fetch }) {
  if (!token) throw new Error('VERCEL_CLEANUP_TOKEN is missing');
  async function api(path, method = 'GET') {
    const url = new URL(path, 'https://api.vercel.com');
    url.searchParams.set('teamId', TEAM);
    const r = await request(url, { method, headers: { Authorization: `Bearer ${token}` } });
    if (!r.ok) throw new Error(`Vercel ${method} ${url.pathname}: HTTP ${r.status}`);
    return r.status === 204 ? {} : r.json();
  }
  let project = await api(`/v9/projects/${PROJECT}`);
  if (project.id !== PROJECT || project.name !== 'shadow-game') throw new Error('Wrong project');
  const current = project.targets?.production;
  if (!current?.id || stateOf(current) !== 'READY') throw new Error('No healthy current production');
  let cutoff = Date.now();
  if (event.deployment_status) {
    if (event.deployment_status.state !== 'success' || event.deployment?.environment !== 'Production') {
      throw new Error('Cleanup requires a successful Production event');
    }
    const raw = event.deployment_status.environment_url ?? event.deployment_status.target_url;
    const url = new URL(raw);
    if (url.protocol !== 'https:' || !url.hostname.endsWith('.vercel.app')) throw new Error('Invalid deployment URL');
    const trigger = await api(`/v13/deployments/${encodeURIComponent(url.hostname)}`);
    if (trigger.projectId !== PROJECT || trigger.target !== 'production' || stateOf(trigger) !== 'READY' ||
        trigger.meta?.githubCommitSha !== event.deployment.sha || trigger.id !== current.id) {
      throw new Error('Event does not match the current successful production');
    }
    cutoff = timeOf(trigger);
  }
  const all = []; const cursors = new Set(); let until;
  do {
    const q = new URLSearchParams({ projectId: PROJECT, limit: '100' });
    if (until) q.set('until', String(until));
    const page = await api(`/v6/deployments?${q}`);
    all.push(...page.deployments);
    until = page.pagination?.next;
    if (until && cursors.has(until)) throw new Error('Repeated pagination cursor');
    cursors.add(until);
  } while (until);
  const candidates = selectRemovals(all, current.id, cutoff);
  console.log(`Found ${all.length} deployments; ${candidates.length} cleanup candidates; dryRun=${dryRun}`);
  let removed = 0;
  for (const d of candidates) {
    // Recheck before every deletion in case production moved or was rolled back.
    project = await api(`/v9/projects/${PROJECT}`);
    if (project.targets?.production?.id !== current.id) throw new Error('Production changed; stopping cleanup');
    const detail = await api(`/v13/deployments/${idOf(d)}`);
    if (detail.projectId !== PROJECT || !['READY', 'ERROR', 'CANCELED'].includes(stateOf(detail))) continue;
    if (d.target === 'production') {
      const aliases = await api(`/v2/deployments/${idOf(d)}/aliases`);
      if (aliases.aliases?.length) { console.log(`Keep aliased production ${idOf(d)}`); continue; }
    }
    console.log(`${dryRun ? 'Would delete' : 'Deleting'} ${idOf(d)} (${d.target ?? 'preview'}, ${stateOf(d)})`);
    if (!dryRun) { await api(`/v13/deployments/${idOf(d)}`, 'DELETE'); removed++; }
  }
  console.log(`Cleanup complete: ${removed} deleted`);
  return { candidates: candidates.length, removed };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const event = process.env.GITHUB_EVENT_PATH ? JSON.parse(readFileSync(process.env.GITHUB_EVENT_PATH, 'utf8')) : {};
  cleanup({ token: process.env.VERCEL_CLEANUP_TOKEN, event, dryRun: process.env.CLEANUP_DRY_RUN !== 'false' })
    .catch(error => { console.error(error.message); process.exitCode = 1; });
}
