import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { neon } from "@neondatabase/serverless";

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  const cookie = request.cookies.get("search_session_id");
  const isNewSession = !cookie;
  const sessionId = cookie?.value ?? randomUUID();

  try {
    if (!process.env.DATABASE_URL) {
      return NextResponse.json({ ok: false, error: "DATABASE_URL missing" }, { status: 500 });
    }
    const sql = neon(`${process.env.DATABASE_URL}`);
    const body = await request.json();
    const provider = body?.provider ?? "unknown";
    const query = body?.query ?? "";
    const result_count = typeof body?.result_count === "number" ? body.result_count : 0;
    const duration_ms = typeof body?.duration_ms === "number" ? body.duration_ms : 0;

    await sql`
      INSERT INTO search_logs (
        event, status, provider, session_id, query, result_count, duration_ms, timestamp
      ) VALUES (
        ${'search_request'}, ${'ok'}, ${provider}, ${sessionId}, ${query}, ${result_count}, ${duration_ms}, NOW()
      )
    `;

    const response = NextResponse.json({ ok: true });
    if (isNewSession) {
      response.cookies.set("search_session_id", sessionId, { path: "/", sameSite: "lax" });
    }
    return response;
  } catch (error: unknown) {
    console.error("/api/log error:", error);
    const response = NextResponse.json({ ok: false, error: error instanceof Error ? error.message : String(error) }, { status: 500 });
    if (isNewSession) {
      response.cookies.set("search_session_id", sessionId, { path: "/", sameSite: "lax" });
    }
    try {
      if (process.env.DATABASE_URL) {
        const sql = neon(`${process.env.DATABASE_URL}`);
        await sql`
          INSERT INTO search_logs (
            event, status, provider, session_id, query, result_count, duration_ms, timestamp
          ) VALUES (
            ${'search_request'}, ${'error'}, ${'unknown'}, ${sessionId}, ${''}, ${0}, ${Date.now() - startTime}, NOW()
          )
        `;
      }
    } catch {}
    return response;
  }
}


