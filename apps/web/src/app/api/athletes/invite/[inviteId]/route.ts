import { NextResponse } from "next/server";
import { getServerSupabaseClient, hasSupabaseAuthConfig } from "@/lib/supabase-auth-server";

interface RouteContext {
  params: Promise<{ inviteId: string }>;
}

export async function DELETE(_request: Request, context: RouteContext) {
  if (!hasSupabaseAuthConfig) {
    return NextResponse.json({ ok: false, error: "Auth non configurata" }, { status: 503 });
  }

  const supabase = await getServerSupabaseClient();
  if (!supabase) {
    return NextResponse.json({ ok: false, error: "Client auth non disponibile" }, { status: 503 });
  }

  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ ok: false, error: "Sessione richiesta" }, { status: 401 });
  }

  const { inviteId } = await context.params;
  if (!inviteId) {
    return NextResponse.json({ ok: false, error: "Invito non valido" }, { status: 400 });
  }

  const { error } = await supabase
    .from("athlete_invites")
    .delete()
    .eq("id", inviteId)
    .eq("coach_id", user.id)
    .eq("status", "pending");

  if (error) {
    return NextResponse.json({ ok: false, error: "Revoca invito non riuscita" }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
