const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL || 'https://www.thesimplifiedcharts.in';

export async function submitToIndexNow(urls: string[]) {
  const key = process.env.INDEXNOW_API_KEY;

  if (!key || urls.length === 0) {
    return { submitted: 0, skipped: true };
  }

  const uniqueUrls = [...new Set(urls)];

  try {
    const response = await fetch('https://api.indexnow.org/indexnow', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
      },
      body: JSON.stringify({
        host: new URL(SITE_URL).host,
        key,
        keyLocation: `${SITE_URL}/indexnow-key`,
        urlList: uniqueUrls,
      }),
    });

    return {
      submitted: response.ok ? uniqueUrls.length : 0,
      skipped: false,
    };
  } catch {
    return {
      submitted: 0,
      skipped: false,
    };
  }
}
