import { timingSafeEqual } from 'node:crypto';

const BASE = 'https://api-v2.imgupscaler.ai';

function corsHeaders(request) {
  const origin = request.headers.get('origin');
  const allowed = process.env.ALLOWED_ORIGIN?.trim();
  if (!origin || !allowed || origin !== allowed) return {};
  return {
    'access-control-allow-origin': allowed,
    'access-control-allow-methods': 'GET, POST, OPTIONS',
    'access-control-allow-headers': 'Content-Type, X-API-Key',
    'access-control-max-age': '600',
    vary: 'Origin'
  };
}

export function json(request, status, value) {
  return new Response(JSON.stringify(value), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
      ...corsHeaders(request)
    }
  });
}

export function OPTIONS(request) {
  const origin = request.headers.get('origin');
  const allowed = process.env.ALLOWED_ORIGIN?.trim();
  if (origin && origin !== allowed) {
    return json(request, 403, { error: 'Origin not allowed' });
  }
  return new Response(null, { status: 204, headers: corsHeaders(request) });
}

export function verifyKey(request) {
  const expected = process.env.PROXY_API_KEY;
  if (!expected) return json(request, 503, {
    error: 'Server setup incomplete: set PROXY_API_KEY in Vercel environment variables.'
  });
  const actual = request.headers.get('x-api-key') ?? '';
  const a = Buffer.from(actual);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    return json(request, 401, { error: 'Invalid or missing X-API-Key' });
  }
  const origin = request.headers.get('origin');
  const allowed = process.env.ALLOWED_ORIGIN?.trim();
  if (origin && origin !== allowed) {
    return json(request, 403, { error: 'Origin not allowed' });
  }
  return null;
}

export async function readJsonBody(request) {
  try {
    const value = await request.json();
    if (value === null || Array.isArray(value) || typeof value !== 'object') {
      throw new Error('Body must be a JSON object');
    }
    return { value };
  } catch {
    return { error: json(request, 400, { error: 'Send a valid JSON object as the request body.' }) };
  }
}

export async function forward(request, method, pathname, jsonBody) {
  // The caller cannot choose a host or an arbitrary upstream endpoint.
  const headers = { accept: 'application/json' };
  if (method === 'POST') headers['content-type'] = 'application/json';

  const authorization = process.env.IMGUPSCALER_AUTHORIZATION?.trim();
  const cookie = process.env.IMGUPSCALER_COOKIE?.trim();
  if (authorization) headers.authorization = authorization;
  if (cookie) headers.cookie = cookie;

  try {
    const response = await fetch(`${BASE}${pathname}`, {
      method,
      headers,
      body: method === 'POST' ? JSON.stringify(jsonBody) : undefined,
      redirect: 'manual',
      signal: AbortSignal.timeout(25_000)
    });

    if (response.status >= 300 && response.status < 400) {
      return json(request, 502, { error: 'Unexpected upstream redirect' });
    }

    const replyHeaders = {
      'content-type': response.headers.get('content-type') ?? 'application/json; charset=utf-8',
      'cache-control': 'no-store',
      ...corsHeaders(request)
    };
    const retryAfter = response.headers.get('retry-after');
    if (retryAfter) replyHeaders['retry-after'] = retryAfter;

    // Pass upstream status and body through, including credit/rate-limit failures.
    return new Response(response.body, { status: response.status, headers: replyHeaders });
  } catch (err) {
    return json(request, err?.name === 'TimeoutError' ? 504 : 502, {
      error: 'ImgUpscaler upstream request failed or timed out.'
    });
  }
}
