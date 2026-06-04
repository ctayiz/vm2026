import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { runScheduledSync } from "@/lib/auto-sync";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Nutzungsgesteuerter Auto-Sync (vom Browser eingeloggter Nutzer).
 * Im Live-Fenster pollt der Client alle 60s; die echte Drosselung passiert
 * in runScheduledSync().
 */
export async function POST() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  const { did, live } = await runScheduledSync();
  return NextResponse.json({ ok: true, did, live });
}
