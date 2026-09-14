import { getSiteUrl } from '@/lib/supabase';

const INDEXNOW_ENDPOINT = 'https://api.indexnow.org/indexnow';
const BATCH_SIZE = 100;

export type IndexNowResult = {
  attempted: number;
  submitted: number;
  failed: number;
  skipped: boolean;
  statuses: Array<{ status: number; count: number }>;
  errors: string[];
};

export async function submitToIndexNow(
  urls: string[]
): Promise<IndexNowResult> {
  const key = process.env.INDEXNOW_API_KEY;
  const uniqueUrls = [...new Set(urls.filter(Boolean))];

  if (!key || uniqueUrls.length === 0) {
    console.info('[IndexNow] Skipped', {
      reason: !key ? 'missing INDEXNOW_API_KEY' : 'no URLs',
      attempted: uniqueUrls.length,
    });

    return {
      attempted: uniqueUrls.length,
      submitted: 0,
      failed: 0,
      skipped: true,
      statuses: [],
      errors: [],
    };
  }

  const siteUrl = getSiteUrl();
  const host = new URL(siteUrl).host;

  let submitted = 0;
  let failed = 0;

  const statuses: Array<{ status: number; count: number }> = [];
  const errors: string[] = [];

  for (let i = 0; i < uniqueUrls.length; i += BATCH_SIZE) {
    const batch = uniqueUrls.slice(i, i + BATCH_SIZE);

    try {
      console.info('[IndexNow] Submitting batch', {
        batchNumber: Math.floor(i / BATCH_SIZE) + 1,
        batchSize: batch.length,
        host,
        urls: batch,
      });

      const response = await fetch(INDEXNOW_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json; charset=utf-8',
        },
        body: JSON.stringify({
          host,
          key,
          keyLocation: `${siteUrl}/indexnow-key`,
          urlList: batch,
        }),
      });

      let responseBody = '';

      try {
        responseBody = await response.text();
      } catch {
        responseBody = '';
      }

      statuses.push({
        status: response.status,
        count: batch.length,
      });

      if (response.ok) {
        submitted += batch.length;
      } else {
        failed += batch.length;

        if (errors.length < 10) {
          errors.push(
            `HTTP ${response.status}${
              responseBody
                ? `: ${responseBody.slice(0, 300)}`
                : ''
            }`
          );
        }
      }

      console.info('[IndexNow] Batch response', {
        status: response.status,
        ok: response.ok,
        submitted: response.ok ? batch.length : 0,
        failed: response.ok ? 0 : batch.length,
        response: responseBody.slice(0, 500),
      });

      if (response.status === 429) {
        console.warn(
          '[IndexNow] Rate limit reached; stopping remaining batches.',
          {
            remaining:
              uniqueUrls.length - (i + batch.length),
          }
        );
        break;
      }
    } catch (error) {
      failed += batch.length;

      const message =
        error instanceof Error
          ? error.message
          : 'Unknown request error.';

      if (errors.length < 10) {
        errors.push(message);
      }

      console.error('[IndexNow] Request failed', {
        message,
        batchSize: batch.length,
      });
    }
  }

  const result: IndexNowResult = {
    attempted: uniqueUrls.length,
    submitted,
    failed,
    skipped: false,
    statuses,
    errors,
  };

  console.info('[IndexNow] Submission complete', result);

  return result;
}
