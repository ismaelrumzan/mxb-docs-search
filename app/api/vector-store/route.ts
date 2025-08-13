import { NextRequest, NextResponse } from "next/server";
import { mxbai } from "@/lib/mxbai";
import {
  ScoredAudioURLInputChunk,
  ScoredImageURLInputChunk,
  ScoredTextInputChunk,
  ScoredVideoURLInputChunk,
} from "@mixedbread/sdk/resources/vector-stores";
import { randomUUID } from "node:crypto";
import { neon } from "@neondatabase/serverless";

interface SearchMetadata {
  title?: string;
  path?: string;
  source_url?: string;
  [key: string]: any;
}

export async function GET(request: NextRequest) {
  const startTime = Date.now();
  let query: string | null = null;

  const cookie = request.cookies.get("search_session_id");
  const isNewSession = !cookie;
  const sessionId = cookie?.value ?? randomUUID();

  async function appendSessionLog(record: {
    event: string;
    status: 'ok' | 'error';
    provider: 'mixedbread';
    session_id: string;
    query: string | null;
    result_count: number;
    duration_ms: number;
  }) {
    try {
      if (!process.env.DATABASE_URL) return;
      const sql = neon(`${process.env.DATABASE_URL}`);
      await sql`
        INSERT INTO search_logs (
          event, status, provider, session_id, query, result_count, duration_ms, timestamp
        ) VALUES (
          ${record.event}, ${record.status}, ${record.provider}, ${record.session_id}, ${record.query ?? ''}, ${record.result_count}, ${record.duration_ms}, NOW()
        )
      `;
    } catch (err: unknown) {
      console.error(
        JSON.stringify({
          event: "search_log_write_error",
          session_id: sessionId,
          error: err instanceof Error ? err.message : String(err),
          timestamp: new Date().toISOString(),
        })
      );
    }
  }

  if (!process.env.MXBAI_API_KEY || !process.env.VECTOR_STORE_ID) {
    const durationMs = Date.now() - startTime;
    const logRecord = {
      event: "search_request",
      status: "error" as const,
      reason: "env_missing",
      session_id: sessionId,
      provider: "mixedbread" as const,
      query,
      result_count: 0,
      duration_ms: durationMs,
      timestamp: new Date().toISOString(),
    };
    console.log(JSON.stringify(logRecord));
    await appendSessionLog(logRecord);
    const response = NextResponse.json(
      { error: "Environment setup failed" },
      { status: 500 }
    );
    if (isNewSession) {
      response.cookies.set("search_session_id", sessionId, {
        path: "/",
        sameSite: "lax",
      });
    }
    return response;
  }

  const { searchParams } = new URL(request.url);
  query = searchParams.get("query");

  if (!query) {
    const durationMs = Date.now() - startTime;
    const logRecord = {
      event: "search_request",
      status: "error" as const,
      reason: "missing_query",
      session_id: sessionId,
      provider: "mixedbread" as const,
      query,
      result_count: 0,
      duration_ms: durationMs,
      timestamp: new Date().toISOString(),
    };
    console.log(JSON.stringify(logRecord));
    await appendSessionLog(logRecord);
    const response = NextResponse.json(
      { error: "Query is required" },
      { status: 400 }
    );
    if (isNewSession) {
      response.cookies.set("search_session_id", sessionId, {
        path: "/",
        sameSite: "lax",
      });
    }
    return response;
  }

  try {
    const res = await mxbai.vectorStores.search({
      query,
      vector_store_identifiers: [process.env.VECTOR_STORE_ID],
      top_k: 10,
      search_options: {
        return_metadata: true,
        rerank: true,
      },
    });

    // Deduplicate results based on file_id
    const uniqueResults = res.data.reduce((acc, item) => {
      if (!acc.some((existing) => existing.file_id === item.file_id)) {
        acc.push(item);
      }
      return acc;
    }, [] as (ScoredTextInputChunk | ScoredImageURLInputChunk | ScoredAudioURLInputChunk | ScoredVideoURLInputChunk)[]);

    const fumaStructuredResponse = uniqueResults.flatMap(
      (
        item:
          | ScoredTextInputChunk
          | ScoredImageURLInputChunk
          | ScoredAudioURLInputChunk
          | ScoredVideoURLInputChunk,
        index: number
      ) => {
        const metadata = item.generated_metadata as SearchMetadata;
        const url = metadata?.source_url || "";
        const description = metadata?.path || "";
        const title = metadata?.title || "Untitled";

        return [
          {
            id: `result-${index}-page`,
            url: url,
            type: "page",
            content: title,
          },
          {
            id: `result-${index}-text`,
            url: url,
            type: "text",
            content: description,
          },
        ];
      }
    );

    const durationMs = Date.now() - startTime;
    const logRecord = {
      event: "search_request",
      status: "ok" as const,
      session_id: sessionId,
      provider: "mixedbread" as const,
      query,
      result_count: uniqueResults.length,
      returned_items_count: fumaStructuredResponse.length,
      duration_ms: durationMs,
      timestamp: new Date().toISOString(),
    };
    console.log(JSON.stringify(logRecord));
    await appendSessionLog(logRecord);

    const response = NextResponse.json(fumaStructuredResponse);
    if (isNewSession) {
      response.cookies.set("search_session_id", sessionId, {
        path: "/",
        sameSite: "lax",
      });
    }
    return response;
  } catch (error: unknown) {
    const durationMs = Date.now() - startTime;
    const logRecord = {
      event: "search_request",
      status: "error" as const,
      reason: "exception",
      session_id: sessionId,
      provider: "mixedbread" as const,
      query,
      result_count: 0,
      duration_ms: durationMs,
      error: error instanceof Error ? error.message : String(error),
      timestamp: new Date().toISOString(),
    };
    console.log(JSON.stringify(logRecord));
    await appendSessionLog(logRecord);
    const response = NextResponse.json(
      { error: "Search failed" },
      { status: 500 }
    );
    if (isNewSession) {
      response.cookies.set("search_session_id", sessionId, {
        path: "/",
        sameSite: "lax",
      });
    }
    return response;
  }
}
