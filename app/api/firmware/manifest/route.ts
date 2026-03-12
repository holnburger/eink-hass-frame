import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json(
    {
      name: "M5PaperS3 FastEPD Firmware",
      version: "0.1.0",
      improv: true,
      new_install_improv_wait_time: 30,
      home_assistant_domain: "m5paper-eink",
      builds: [
        {
          chipFamily: "ESP32-S3",
          parts: [
            {
              path: "/api/firmware/artifacts/bootloader.bin",
              offset: 0,
            },
            {
              path: "/api/firmware/artifacts/partitions.bin",
              offset: 32768,
            },
            {
              path: "/api/firmware/artifacts/firmware.bin",
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
