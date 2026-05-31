import { NextResponse } from "next/server";

import { resolveAppPath } from "@/lib/app-path";
import { detectIngressPathFromHeaders } from "@/lib/server/ingress";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const ingressInfo = detectIngressPathFromHeaders(request.headers, request.url);
  const artifactPath = (path: string) =>
    resolveAppPath(path, ingressInfo.path);

  return NextResponse.json(
    {
      name: "M5PaperS3 FastEPD Firmware",
      version: "0.9.2",
      improv: true,
      new_install_improv_wait_time: 30,
      // removed because it is currently only added via mqtt and not an official home assistant integration
      // home_assistant_domain: "m5paper-eink",
      builds: [
        {
          chipFamily: "ESP32-S3",
          parts: [
            {
              path: artifactPath("/api/firmware/artifacts/bootloader.bin"),
              offset: 0,
            },
            {
              path: artifactPath("/api/firmware/artifacts/partitions.bin"),
              offset: 32768,
            },
            {
              path: artifactPath("/api/firmware/artifacts/firmware.bin"),
              offset: 65536,
            },
          ],
        },
      ],
    },
    {
      headers: { "Cache-Control": "no-store" },
    },
  );
}
