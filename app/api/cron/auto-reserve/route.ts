import { NextRequest, NextResponse } from "next/server";
import { executeAutoReservation } from "@/lib/auto-reserve";
import type { AutoReserveOptions } from "@/types";

export const dynamic = "force-dynamic";

function verifySecret(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    // If no secret configured, allow (or warn)
    return true;
  }

  // Check Authorization header: Bearer <secret>
  const authHeader = req.headers.get("authorization");
  if (authHeader && authHeader.replace(/^Bearer\s+/i, "").trim() === secret) {
    return true;
  }

  // Check URL query param ?secret=<secret>
  const url = new URL(req.url);
  if (url.searchParams.get("secret") === secret) {
    return true;
  }

  return false;
}

export async function GET(req: NextRequest) {
  if (!verifySecret(req)) {
    return NextResponse.json(
      { error: "Unauthorized: Invalid or missing secret." },
      { status: 401 }
    );
  }

  try {
    const url = new URL(req.url);
    const targetWeekOffset = url.searchParams.get("weekOffset")
      ? Number(url.searchParams.get("weekOffset"))
      : 1;

    const report = await executeAutoReservation({
      targetWeekOffset,
    });

    return NextResponse.json(report, { status: 200 });
  } catch (err: unknown) {
    const errorMsg =
      err instanceof Error ? err.message : "خطای ناشناخته در اجرای رزرو خودکار";
    return NextResponse.json({ error: errorMsg }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  if (!verifySecret(req)) {
    return NextResponse.json(
      { error: "Unauthorized: Invalid or missing secret." },
      { status: 401 }
    );
  }

  try {
    const body: AutoReserveOptions = await req.json().catch(() => ({}));
    const report = await executeAutoReservation(body);

    return NextResponse.json(report, { status: 200 });
  } catch (err: unknown) {
    const errorMsg =
      err instanceof Error ? err.message : "خطای ناشناخته در اجرای رزرو خودکار";
    return NextResponse.json({ error: errorMsg }, { status: 500 });
  }
}
