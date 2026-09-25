import { NextResponse } from "next/server";
import { getServerSupabaseClient } from "@/lib/supabase-auth-server";
import { getSupabaseAdminClient } from "@/lib/supabase-admin";
import type { EmailOtpType } from "@supabase/supabase-js";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const tokenHash = url.searchParams.get("token_hash");
  const type = url.searchParams.get("type") as EmailOtpType | null;
  const nextParam = url.searchParams.get("next") ?? "/programmi";
  let nextPath = nextParam.startsWith("/") ? nextParam : "/programmi";

  const supabase = await getServerSupabaseClient();
  if (supabase) {
    if (code) {
      await supabase.auth.exchangeCodeForSession(code);
    } else if (tokenHash && type) {
      await supabase.auth.verifyOtp({ type, token_hash: tokenHash });
    }

    const {
      data: { user }
    } = await supabase.auth.getUser();

    const admin = getSupabaseAdminClient();
    if (user && admin) {
      const metadata = user.user_metadata as {
        invited_by_coach_id?: string;
        invite_id?: string;
        full_name?: string;
      };

      const coachId = metadata?.invited_by_coach_id?.trim();
      if (coachId) {
        nextPath = "/athlete-setup";
        const profileName = metadata?.full_name?.trim() || user.email?.split("@")[0] || "Atleta";

        await admin.from("profiles").upsert(
          {
            id: user.id,
            role: "atleta",
            full_name: profileName,
            timezone: "Europe/Rome"
          },
          { onConflict: "id" }
        );

        await admin.from("coach_athletes").upsert(
          {
            coach_id: coachId,
            athlete_id: user.id,
            status: "attivo"
          },
          { onConflict: "coach_id,athlete_id" }
        );

        if (metadata?.invite_id) {
          await admin
            .from("athlete_invites")
            .update({ status: "accepted", athlete_id: user.id, accepted_at: new Date().toISOString() })
            .eq("id", metadata.invite_id)
            .eq("coach_id", coachId);
        } else if (user.email) {
          await admin
            .from("athlete_invites")
            .update({ status: "accepted", athlete_id: user.id, accepted_at: new Date().toISOString() })
            .eq("coach_id", coachId)
            .eq("athlete_email", user.email.toLowerCase())
            .eq("status", "pending");
        }
      }
    }
  }

  return NextResponse.redirect(new URL(nextPath, url.origin));
}
