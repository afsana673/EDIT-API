import { verifyKey, json, forward, OPTIONS as preflight } from '../lib/proxy.js';

export const OPTIONS = preflight;

const TASK_KEYS = Object.freeze({
  remove_object: 'router_free.me_remove_object_v1',
  enhance: 'router_free.image_enhance_v1',
  remove_background: 'router_free.me_remove_background_v1'
});

export async function GET(request) {
  const denied = verifyKey(request);
  if (denied) return denied;
  const task = new URL(request.url).searchParams.get('task');
  const fullKey = Object.hasOwn(TASK_KEYS, task ?? '') ? TASK_KEYS[task] : null;
  if (!fullKey) {
    return json(request, 400, {
      error: 'Invalid task. Use remove_object, enhance, or remove_background.'
    });
  }
  return forward(request, 'GET', `/api/runtime/system-parameters?full_key=${encodeURIComponent(fullKey)}`);
}
