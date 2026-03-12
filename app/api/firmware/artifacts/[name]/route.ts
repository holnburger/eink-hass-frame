import { readFile } from "node:fs/promises";
import path from "node:path";

import { NextResponse } from "next/server";

import { FIRMWARE_ARTIFACTS, getArtifactsDir } from "@/lib/server/firmware-artifacts";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ name: string }> },
) {
  const { name } = await params;

  if (!FIRMWARE_ARTIFACTS.includes(name as (typeof FIRMWARE_ARTIFACTS)[number])) {
    return NextResponse.json({ ok: false, error: "Unsupported artifact." }, { status: 404 });
  }

  const filePath = path.join(getArtifactsDir(), name);

  try {
    const file = await readFile(filePath);
    return new NextResponse(file, {
      status: 200,
      headers: {
        "Content-Type": "application/octet-stream",
        "Cache-Control": "no-store",
      },
    });
  } catch {
    return NextResponse.json({ ok: false, error: "Artifact not found." }, { status: 404 });
  }
}
