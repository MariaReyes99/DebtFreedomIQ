/**
 * GET /api/usage
 *
 * How many questions this visitor has left today, and whether they can sign
 * in or upgrade. Reads the counter without using a question.
 */
import { getUsage } from '@/research/lib/entitlements';
import { PLANS } from '@/research/lib/plans';
import { getViewer } from '@/research/lib/viewer';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const viewer = await getViewer(req);
  const usage = await getUsage(viewer.key, viewer.plan, Boolean(viewer.userId));
  return Response.json(
    {
      ...usage,
      plan: viewer.plan,
      planLabel: PLANS[viewer.plan].label,
      signedIn: Boolean(viewer.userId),
    },
    { headers: { 'Cache-Control': 'no-store' } },
  );
}
