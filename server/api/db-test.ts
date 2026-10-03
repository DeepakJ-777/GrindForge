export default defineEventHandler(async (event) => {
  const env = event.context.cloudflare?.env

  if (!env?.placement_db) {
    setResponseStatus(event, 500)
    return { ok: false, error: 'D1 binding "placement_db" not available' }
  }

  try {
    const result = await env.placement_db
      .prepare('SELECT * FROM test_table')
      .all<{ id: string; message: string }>()

    return {
      ok: true,
      database: 'placement_db',
      rows: result.results,
      count: result.results.length,
    }
  }
  catch (error) {
    setResponseStatus(event, 500)
    return {
      ok: false,
      error: error instanceof Error ? error.message : 'Database query failed',
    }
  }
})
