import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import { POST as sign } from '../api/upload-sign.js';
import { POST as job } from '../api/create-job.js';
import { GET as status } from '../api/job-status.js';
import { GET as config } from '../api/task-config.js';

const originalFetch = globalThis.fetch;
const originalKey = process.env.PROXY_API_KEY;
const originalAuth = process.env.IMGUPSCALER_AUTHORIZATION;
process.env.PROXY_API_KEY = 'sample-test-secret';
process.env.IMGUPSCALER_AUTHORIZATION = 'Bearer provider-test';
const calls = [];

globalThis.fetch = async (url, options) => {
  calls.push({ url, ...options });
  return Response.json({ ok: true, url, body: options.body ?? null }, { status: 201 });
};

after(() => {
  globalThis.fetch = originalFetch;
  if (originalKey === undefined) delete process.env.PROXY_API_KEY;
  else process.env.PROXY_API_KEY = originalKey;
  if (originalAuth === undefined) delete process.env.IMGUPSCALER_AUTHORIZATION;
  else process.env.IMGUPSCALER_AUTHORIZATION = originalAuth;
});

function request(path, method = 'GET', body, key = 'sample-test-secret') {
  return new Request(`https://localhost${path}`, {
    method,
    headers: {
      'x-api-key': key,
      ...(body === undefined ? {} : { 'content-type': 'application/json' })
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) })
  });
}

test('sign URL request forwards payload to fixed upstream', async () => {
  const res = await sign(request('/api/upload-sign', 'POST', { filename: 'test.png' }));
  assert.equal(res.status, 201);
  assert.equal(calls.at(-1).url, 'https://api-v2.imgupscaler.ai/api/common/upload/sign-object');
  assert.equal(calls.at(-1).body, '{"filename":"test.png"}');
  assert.equal(calls.at(-1).headers.authorization, 'Bearer provider-test');
});

test('create-job request forwards payload', async () => {
  const res = await job(request('/api/create-job', 'POST', { test: 1 }));
  assert.equal(res.status, 201);
  assert.equal(calls.at(-1).url, 'https://api-v2.imgupscaler.ai/api/runtime/jobs/create-job');
});

test('job status protects id path', async () => {
  const bad = await status(request('/api/job-status?jobId=../secret'));
  assert.equal(bad.status, 400);
  const good = await status(request('/api/job-status?jobId=abc_123'));
  assert.equal(good.status, 201);
  assert.equal(calls.at(-1).url, 'https://api-v2.imgupscaler.ai/api/runtime/jobs/abc_123');
});

test('task keys are whitelisted', async () => {
  const valid = await config(request('/api/task-config?task=remove_background'));
  assert.equal(valid.status, 201);
  assert.ok(calls.at(-1).url.endsWith('full_key=router_free.me_remove_background_v1'));
  const invalid = await config(request('/api/task-config?task=extra'));
  assert.equal(invalid.status, 400);
});

test('API secret required', async () => {
  const res = await job(request('/api/create-job', 'POST', { test: 1 }, 'incorrect'));
  assert.equal(res.status, 401);
});
