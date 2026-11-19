import "server-only";

/**
 * Email notifications to the iZone team (new trade-in enquiries, reservations,
 * questions, contact messages). Uses the Resend email API when configured:
 *   RESEND_API_KEY, NOTIFY_EMAIL_TO (comma separated), NOTIFY_EMAIL_FROM (verified sender).
 * When not configured, nothing is sent and the dashboard badges remain the alert.
 */
export function notificationsEnabled(): boolean {
  return Boolean(process.env.RESEND_API_KEY && process.env.NOTIFY_EMAIL_TO);
}

export async function notifyTeam(subject: string, lines: string[]): Promise<boolean> {
  if (!notificationsEnabled()) return false;
  const base = (process.env.RESEND_API_URL ?? "https://api.resend.com").replace(/\/$/, "");
  try {
    const res = await fetch(`${base}/emails`, {
      method: "POST",
      headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: process.env.NOTIFY_EMAIL_FROM ?? "iZone <onboarding@resend.dev>",
        to: process.env.NOTIFY_EMAIL_TO!.split(",").map((s) => s.trim()).filter(Boolean),
        subject,
        text: lines.filter(Boolean).join("\n"),
      }),
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) {
      console.error("Notification email failed", res.status, await res.text().catch(() => ""));
      return false;
    }
    return true;
  } catch (error) {
    console.error("Notification email failed", error);
    return false;
  }
}
