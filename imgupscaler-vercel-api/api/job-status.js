import { verifyKey, json, forward, OPTIONS as preflight } from '../lib/proxy.js';

export const OPTIONS = preflight;

export async function GET(request) {
  const denied = verifyKey(request);
  if (denied) return denied;
  const id = new URL(request.url).searchParams.get('jobId');
  if (!id || !/^[a-zA-Z0-9_-]{1,128}$/.test(id)) {
    return json(request, 400, { error: 'Provide a valid jobId query parameter.' });
  }
  return forward(request, 'GET', `/api/runtime/jobs/${encodeURIComponent(id)}`);
}
