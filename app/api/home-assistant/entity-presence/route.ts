import { NextResponse } from "next/server";

import { findExistingHomeAssistantEntityIds } from "@/lib/server/home-assistant";
import { resolveServerHomeAssistantConnection } from "@/lib/server/home-assistant-runtime";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RequestPayload = {
  url?: string;
  token?: string;
  entityIds?: string[];
};

export async function POST(request: Request) {
  const payload = ((await request.json().catch(() => ({}))) ??
    {}) as RequestPayload;

  try {
    const connection = resolveServerHomeAssistantConnection(payload);
    const existingEntityIds = await findExistingHomeAssistantEntityIds({
      url: connection.url,
      token: connection.token,
      entityIds: Array.isArray(payload.entityIds) ? payload.entityIds : [],
    });

    return NextResponse.json({ ok: true, existingEntityIds });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : "Unable to validate Home Assistant entity names.",
      },
      { status: 500 },
    );
  }
}
