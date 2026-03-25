import { NextResponse } from "next/server";

import { getAppRuntimeInfo } from "@/lib/server/home-assistant-runtime";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({
    ok: true,
    runtime: getAppRuntimeInfo(),
  });
}
