import { NextResponse } from "next/server";

import { detectIngressPathFromHeaders } from "@/lib/server/ingress";
import { getAppRuntimeInfo } from "@/lib/server/home-assistant-runtime";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const ingressInfo = detectIngressPathFromHeaders(request.headers, request.url);
  const runtime = await getAppRuntimeInfo({
    ingressPath: ingressInfo.path,
  });

  return NextResponse.json({
    ok: true,
    runtime,
  });
}
