import { defaultDealService } from '@/server/services/deal-service';

export const POST = async (request: Request): Promise<Response> => {
  const configuredSecret = process.env.CRON_SECRET?.trim();

  if (configuredSecret) {
    const authHeader = request.headers.get('authorization');

    if (authHeader !== `Bearer ${configuredSecret}`) {
      return Response.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
    }
  }

  const summary = await defaultDealService.pollActiveWatches();

  return Response.json({
    ok: true,
    ...summary,
    polledAt: new Date().toISOString(),
  });
};

