import { verifyKey, readJsonBody, forward, OPTIONS as preflight } from '../lib/proxy.js';

export const OPTIONS = preflight;

export async function POST(request) {
  const denied = verifyKey(request);
  if (denied) return denied;
  const { value, error } = await readJsonBody(request);
  if (error) return error;
  return forward(request, 'POST', '/api/common/upload/sign-object', value);
}
