import { source } from '@/lib/source';
import { createFromSource } from 'fumadocs-core/search/server';
import { NextResponse } from 'next/server';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';

const { GET: baseGET } = createFromSource(source);

export const GET = async (request: Request) => {
  const startTime = Date.now();
  const url = new URL(request.url);
  const query = url.searchParams.get('q') ?? '';

  // Session
  const cookieHeader = request.headers.get('cookie') ?? '';
  const match = cookieHeader.match(/search_session_id=([^;]+)/);
  const isNewSession = !match;
  const sessionId = match?.[1] ?? randomUUID();

  async function appendSessionLog(record: Record<string, unknown>) {
    try {
      const logDir = path.join(process.cwd(), 'log');
      await fs.mkdir(logDir, { recursive: true });
      const filePath = path.join(logDir, `${sessionId}.jsonl`);
      await fs.appendFile(filePath, JSON.stringify(record) + '\n', 'utf8');
    } catch {}
  }

  try {
    const response = await baseGET(request as any);
    const cloned = response.clone();
    let resultsCount = 0;
    try {
      const data = await cloned.json();
      if (Array.isArray(data)) resultsCount = data.length;
    } catch {}

    const logRecord = {
      event: 'search_request',
      status: 'ok' as const,
      provider: 'algolia' as const,
      session_id: sessionId,
      query,
      result_count: resultsCount,
      duration_ms: Date.now() - startTime,
      timestamp: new Date().toISOString(),
    };
    await appendSessionLog(logRecord);

    // Set cookie if new session
    if (isNewSession) {
      const headers = new Headers(response.headers);
      headers.append('Set-Cookie', `search_session_id=${sessionId}; Path=/; SameSite=Lax`);
      return new NextResponse(response.body, { status: response.status, headers });
    }
    return response;
  } catch (error) {
    const logRecord = {
      event: 'search_request',
      status: 'error' as const,
      provider: 'algolia' as const,
      session_id: sessionId,
      query,
      result_count: 0,
      duration_ms: Date.now() - startTime,
      error: error instanceof Error ? error.message : String(error),
      timestamp: new Date().toISOString(),
    };
    await appendSessionLog(logRecord);
    throw error;
  }
};
