import { NextResponse } from "next/server";

import { artifactExists, FIRMWARE_ARTIFACTS } from "@/lib/server/firmware-artifacts";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const entries = await Promise.all(
    FIRMWARE_ARTIFACTS.map(async (file) => ({
      file,
      exists: await artifactExists(file),
    })),
  );

  const missing = entries.filter((entry) => !entry.exists).map((entry) => entry.file);

  return NextResponse.json(
    {
      ok: true,
      artifactsReady: missing.length === 0,
      missing,
      files: entries,
    },
    {
      headers: { "Cache-Control": "no-store" },
    },
  );
}
