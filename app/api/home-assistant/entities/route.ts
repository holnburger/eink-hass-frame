import { NextResponse } from "next/server";

import {
  widgetSupportsHomeAssistant,
  type HomeAssistantWidgetType,
} from "@/lib/home-assistant";
import { searchHomeAssistantEntities } from "@/lib/server/home-assistant";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RequestPayload = {
  url?: string;
  token?: string;
  query?: string;
  widgetType?: string;
  domains?: string[];
  limit?: number;
};

export async function POST(request: Request) {
  const payload = ((await request.json().catch(() => ({}))) ??
    {}) as RequestPayload;

  if (!payload.url?.trim() || !payload.token?.trim()) {
    return NextResponse.json(
      { ok: false, error: "Home Assistant URL and token are required." },
      { status: 400 },
    );
  }

  try {
    let widgetType: HomeAssistantWidgetType | undefined;
    if (widgetSupportsHomeAssistant(payload.widgetType ?? "")) {
      widgetType = payload.widgetType as HomeAssistantWidgetType;
    }
    const result = await searchHomeAssistantEntities({
      url: payload.url,
      token: payload.token,
      query: payload.query,
      widgetType,
      domains: Array.isArray(payload.domains)
        ? payload.domains.filter((domain) => typeof domain === "string")
        : undefined,
      limit: payload.limit,
    });

    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : "Unable to query Home Assistant.",
      },
      { status: 500 },
    );
  }
}
