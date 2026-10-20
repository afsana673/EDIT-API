export function GET() {
  return Response.json({
    name: 'ImgUpscaler API Proxy',
    version: '1.0.0',
    routes: [
      'POST /api/upload-sign',
      'POST /api/create-job',
      'GET /api/job-status?jobId=YOUR_JOB_ID',
      'GET /api/task-config?task=remove_object|enhance|remove_background'
    ],
    authentication: 'X-API-Key',
    note: 'No local credit checker or quota; upstream access rules still apply.'
  }, { headers: { 'cache-control': 'no-store' } });
}
