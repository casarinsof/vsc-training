import { NextResponse } from "next/server";
import { getServerSupabaseClient, hasSupabaseAuthConfig } from "@/lib/supabase-auth-server";
import { getSupabaseAdminClient, hasSupabaseAdminConfig } from "@/lib/supabase-admin";

interface InvitePayload {
  email?: string;
  fullName?: string;
}

interface InviteRow {
  id: string;
  coach_id: string;
  athlete_email: string;
  athlete_name: string | null;
  status: string;
  created_at: string;
}

function isDuplicateInviteError(code?: string | null, message?: string | null) {
  return code === "23505" || /duplicate key|unique/i.test(message ?? "");
}

function resolveAppOrigin(requestUrl: string) {
  const configuredUrl = process.env.APP_URL?.trim() || process.env.NEXT_PUBLIC_APP_URL?.trim() || "";

  if (!configuredUrl) {
    return new URL(requestUrl).origin;
  }

  try {
    return new URL(configuredUrl).origin;
  } catch {
    return null;
  }
}

export async function POST(request: Request) {
  if (!hasSupabaseAuthConfig || !hasSupabaseAdminConfig) {
    return NextResponse.json({ ok: false, error: "Configurazione Supabase incompleta" }, { status: 503 });
  }

  const supabase = await getServerSupabaseClient();
  const admin = getSupabaseAdminClient();
  if (!supabase || !admin) {
    return NextResponse.json({ ok: false, error: "Client Supabase non disponibile" }, { status: 503 });
  }

  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ ok: false, error: "Sessione richiesta" }, { status: 401 });
  }

  const payload = (await request.json()) as InvitePayload;
  const email = payload.email?.trim().toLowerCase() ?? "";
  const fullName = payload.fullName?.trim() ?? "";

  if (!email) {
    return NextResponse.json({ ok: false, error: "Email atleta obbligatoria" }, { status: 400 });
  }

  const coachName =
    (user.user_metadata as { full_name?: string } | null)?.full_name?.trim() ||
    user.email?.split("@")[0] ||
    "Coach";

  const { error: coachProfileError } = await admin.from("profiles").upsert(
    {
      id: user.id,
      role: "coach",
      full_name: coachName,
      timezone: "Europe/Rome"
    },
    { onConflict: "id" }
  );

  if (coachProfileError) {
    return NextResponse.json(
      { ok: false, error: "Profilo coach non disponibile" },
      { status: 500 }
    );
  }

  const { data: existingPendingInvite } = await admin
    .from("athlete_invites")
    .select("id,coach_id,athlete_email,athlete_name,status,created_at")
    .eq("coach_id", user.id)
    .eq("athlete_email", email)
    .eq("status", "pending")
    .maybeSingle<InviteRow>();

  let invite = existingPendingInvite ?? null;
  let createdInvite = false;

  if (!invite) {
    const { data: insertedInvite, error: inviteError } = await admin
      .from("athlete_invites")
      .insert({
        coach_id: user.id,
        athlete_email: email,
        athlete_name: fullName || null,
        status: "pending"
      })
      .select("id,coach_id,athlete_email,athlete_name,status,created_at")
      .single<InviteRow>();

    if (inviteError || !insertedInvite) {
      if (isDuplicateInviteError(inviteError?.code, inviteError?.message)) {
        const { data: fallbackInvite } = await admin
          .from("athlete_invites")
          .select("id,coach_id,athlete_email,athlete_name,status,created_at")
          .eq("coach_id", user.id)
          .eq("athlete_email", email)
          .eq("status", "pending")
          .maybeSingle<InviteRow>();
        invite = fallbackInvite ?? null;
      }

      if (!invite) {
        return NextResponse.json(
          { ok: false, error: "Invito non salvabile" },
          { status: 400 }
        );
      }
    } else {
      invite = insertedInvite;
      createdInvite = true;
    }
  }

  if (!invite) {
    return NextResponse.json({ ok: false, error: "Invito non disponibile" }, { status: 500 });
  }

  const appOrigin = resolveAppOrigin(request.url);
  if (!appOrigin) {
    if (createdInvite) {
      await admin.from("athlete_invites").delete().eq("id", invite.id);
    }
    return NextResponse.json(
      { ok: false, error: "Variabile APP_URL non valida" },
      { status: 503 }
    );
  }

  const redirectTo = `${appOrigin}/auth/callback?next=/atleti`;

  const { error: authError } = await admin.auth.admin.inviteUserByEmail(email, {
    redirectTo,
    data: {
      role: "atleta",
      invited_by_coach_id: user.id,
      invite_id: invite.id,
      full_name: fullName || null
    }
  });

  if (authError) {
    const message = authError.message.toLowerCase();
    const alreadyKnownUser =
      message.includes("already") || message.includes("registered") || message.includes("exists");

    if (alreadyKnownUser) {
      return NextResponse.json({ ok: true, invite, warning: authError.message }, { status: 200 });
    }

    if (createdInvite) {
      await admin.from("athlete_invites").delete().eq("id", invite.id);
    }
    return NextResponse.json({ ok: false, error: authError.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true, invite });
}
