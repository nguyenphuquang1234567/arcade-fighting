import assert from 'node:assert/strict';
import { selectRemovals, cleanup } from './cleanup-vercel.mjs';
const projectId = 'prj_CCRONHpk7J6ewOYcIPb2aAZWYDr8';
const d = (uid, created, target = 'production', state = 'READY') => ({ uid, created, target, state, projectId });
const rows = [d('p1', 100), d('p2', 90), d('p3', 80), d('old', 70), d('preview', 60, null),
  d('error', 50, 'production', 'ERROR'), d('building', 40, 'production', 'BUILDING'),
  d('future', 110, null), { ...d('other', 20), projectId: 'other' }];
assert.deepEqual(selectRemovals(rows, 'p1', 100).map(x => x.uid), ['old', 'preview', 'error']);
assert(!selectRemovals(rows, 'old', 100).some(x => x.uid === 'old'));
assert.throws(() => selectRemovals(rows, null, 100));
const project = { id: projectId, name: 'shadow-game', targets: { production: { id: 'p1', readyState: 'READY' } } };
const reply = data => ({ ok: true, status: 200, json: async () => data });
let calls = 0;
await assert.rejects(cleanup({ token: 'test', event: { deployment_status: { state: 'failure' }, deployment: { environment: 'Production' } },
  request: async () => { calls++; return reply(project); } }), /successful Production/);
assert.equal(calls, 1);
let deletes = []; let pages = 0;
const result = await cleanup({ token: 'test', dryRun: false, request: async (url, options) => {
  if (options.method === 'DELETE') { deletes.push(url.pathname.split('/').at(-1)); return reply({}); }
  if (url.pathname.startsWith('/v9/projects')) return reply(project);
  if (url.pathname === '/v6/deployments') {
    pages++;
    return reply(pages === 1 ? { deployments: rows.slice(0, 4), pagination: { next: 69 } } :
      { deployments: rows.slice(4), pagination: { next: null } });
  }
  if (url.pathname.endsWith('/aliases')) return reply({ aliases: url.pathname.includes('/old/') ? [{ alias: 'keep.example.com' }] : [] });
  const id = url.pathname.split('/').at(-1);
  return reply(rows.find(x => x.uid === id));
} });
assert.equal(pages, 2);
assert.deepEqual(deletes, ['preview', 'error', 'future']); // Old aliased production remains protected.
assert.equal(result.removed, 3);
await assert.rejects(cleanup({ token: 'test', dryRun: false, request: async url => {
  if (url.pathname.startsWith('/v9/projects')) return reply(project);
  if (url.pathname === '/v6/deployments') return reply({ deployments: rows, pagination: {} });
  return { ok: false, status: 403 };
} }), /HTTP 403/);
console.log('Cleanup safety checks passed.');
