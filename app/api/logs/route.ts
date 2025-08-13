import { NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';

export async function GET(request: Request) {
  try {
    if (!process.env.DATABASE_URL) {
      return NextResponse.json({ error: 'DATABASE_URL missing' }, { status: 500 });
    }
    const { searchParams } = new URL(request.url);
    const provider = searchParams.get('provider');
    const limitParam = searchParams.get('limit');
    const limit = Math.min(Math.max(Number(limitParam) || 500, 1), 2000);

    const sql = neon(`${process.env.DATABASE_URL}`);

    if (provider) {
      const rows = await sql`
        SELECT event, status, provider, session_id, query, result_count, duration_ms, timestamp
        FROM search_logs
        WHERE provider = ${provider}
        ORDER BY timestamp DESC
        LIMIT ${limit}
      `;
      return NextResponse.json(rows);
    }

    const rows = await sql`
      SELECT event, status, provider, session_id, query, result_count, duration_ms, timestamp
      FROM search_logs
      ORDER BY timestamp DESC
      LIMIT ${limit}
    `;
    return NextResponse.json(rows);
  } catch (error: unknown) {
    return NextResponse.json({ error: error instanceof Error ? error.message : String(error) }, { status: 500 });
  }
}


