import { NextResponse } from "next/server";

import { fetchSelectedHomeAssistantStates } from "@/lib/server/home-assistant";
import { resolveServerHomeAssistantConnection } from "@/lib/server/home-assistant-runtime";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RequestPayload = {
  url?: string;
  token?: string;
  entityIds?: string[];
  thermostatHistoryEntityIds?: string[];
};

export async function POST(request: Request) {
  const payload = ((await request.json().catch(() => ({}))) ??
    {}) as RequestPayload;

  try {
    const connection = resolveServerHomeAssistantConnection(payload);
    const entities = await fetchSelectedHomeAssistantStates({
      url: connection.url,
      token: connection.token,
      entityIds: Array.isArray(payload.entityIds) ? payload.entityIds : [],
      thermostatHistoryEntityIds: Array.isArray(
        payload.thermostatHistoryEntityIds,
      )
        ? payload.thermostatHistoryEntityIds
        : [],
    });
    return NextResponse.json({ ok: true, entities });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : "Unable to fetch Home Assistant states.",
      },
      { status: 500 },
    );
  }
}
