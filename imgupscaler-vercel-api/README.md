# ImgUpscaler Vercel API Proxy

GitHub/Vercel-ready Node.js API for the **specific upstream paths provided**.
No local credit-check endpoint, database, subscription system, or request-count limiter is implemented.
This does **not** bypass ImgUpscaler's own credits, account access, rate limits or terms, nor Vercel platform limits.

## Deploy
1. Upload the files to a GitHub repository (keep the `api/` and `lib/` folders).
2. On Vercel select **Add New > Project > Import Git Repository**.
3. Set the Framework Preset to **Other** and Node.js version to **22.x or 24.x** (whichever Vercel supports for your project).
4. Under **Environment Variables**, add:
   - `PROXY_API_KEY`: a strong secret chosen by you (required).
   - `IMGUPSCALER_AUTHORIZATION`: your *legitimately issued* authorization value, if needed by upstream. Include any required `Bearer ` prefix.
   - `IMGUPSCALER_COOKIE`: your own authenticated session cookie, only if needed/authorized; note that browser session cookies may expire.
   - `ALLOWED_ORIGIN`: optional exact trusted browser origin (e.g. `https://your-frontend.example`). Keep empty for server-to-server access.
5. Deploy. `/api` lists the available routes without revealing secrets.
6. The endpoint paths/JSON schema were supplied by the requester; they have **not** been verified against an official ImgUpscaler developer API contract. Use the upstream service's real request schema. A 400/401/403/404/429 response will be forwarded as-is.

## API Routes

All operational routes require `X-API-Key: <your PROXY_API_KEY>`.

| Your API | Method | Upstream |
| --- | --- | --- |
| `/api/upload-sign` | POST JSON | `/api/common/upload/sign-object` |
| `/api/create-job` | POST JSON | `/api/runtime/jobs/create-job` |
| `/api/job-status?jobId=123456` | GET | `/api/runtime/jobs/123456` |
| `/api/task-config?task=remove_object` | GET | `/api/runtime/system-parameters?full_key=router_free.me_remove_object_v1` |
| `/api/task-config?task=enhance` | GET | `/api/runtime/system-parameters?full_key=router_free.image_enhance_v1` |
| `/api/task-config?task=remove_background` | GET | `/api/runtime/system-parameters?full_key=router_free.me_remove_background_v1` |

### Request examples

```bash
# Get supported configuration (provider must actually support this endpoint):
curl "https://YOUR-PROJECT.vercel.app/api/task-config?task=enhance" \
  -H "X-API-Key: YOUR_PROXY_API_KEY"

# Request a signed upload URL. Replace the body with the real payload
# required by ImgUpscaler, which is NOT publicly verified here.
curl -X POST "https://YOUR-PROJECT.vercel.app/api/upload-sign" \
  -H "Content-Type: application/json" \
  -H "X-API-Key: YOUR_PROXY_API_KEY" \
  -d '{"replace_with":"the exact upstream sign-object fields"}'

# Start an editing job; forward the exact provider-documented JSON:
curl -X POST "https://YOUR-PROJECT.vercel.app/api/create-job" \
  -H "Content-Type: application/json" \
  -H "X-API-Key: YOUR_PROXY_API_KEY" \
  -d '{"replace_with":"the exact upstream create-job fields"}'

# Poll status using the REAL returned job ID:
curl "https://YOUR-PROJECT.vercel.app/api/job-status?jobId=123456" \
  -H "X-API-Key: YOUR_PROXY_API_KEY"
```

### Images: signed upload flow

1. Call `/api/upload-sign` with upstream's required metadata JSON.
2. Parse upstream's reply for its signed object-upload URL **and prescribed method/headers**.
3. Upload the actual image bytes directly to that signed URL using exactly its required method and headers (commonly `PUT`, but not guaranteed). **Do not send a signed storage URL back through this proxy.**
4. Call `/api/create-job` with the upstream-required reference to the uploaded file and chosen task.
5. Poll `/api/job-status?jobId=...` until processing completes or fails.

**Do not expose PROXY_API_KEY, IMGUPSCALER_AUTHORIZATION or IMGUPSCALER_COOKIE in a public browser app or repository.** Use server-to-server access for a public site. Public client access needs its own authenticated backend and abuse controls. No credit or quota system is implemented here.

## Local check

```bash
npm test
```

## Notes

- 4 task operations are offered as 3 config variants + 2 POST operations + job status. There is **no** `free-credits-config` route.
- No tracking APIs are included.
- Node 22+ is required; no third-party packages are required.
