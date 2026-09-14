export async function GET() {
  const key = process.env.INDEXNOW_API_KEY

  if (!key) {
    return new Response("IndexNow API key is not configured", {
      status: 500,
    })
  }

  return new Response(key, {
    status: 200,
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
    },
  })
}
