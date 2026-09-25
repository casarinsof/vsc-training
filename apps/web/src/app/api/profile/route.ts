import { NextResponse } from "next/server";
import { getServerSupabaseClient, hasSupabaseAuthConfig } from "@/lib/supabase-auth-server";

interface ProfilePayload {
  fullName?: string;
  avatarUrl?: string;
}

export async function POST(request: Request) {
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

  const payload = (await request.json()) as ProfilePayload;

  const fullName = payload.fullName?.trim() ?? "";
  const avatarUrl = payload.avatarUrl?.trim() ?? "";

  if (!fullName) {
    return NextResponse.json({ ok: false, error: "Nome obbligatorio" }, { status: 400 });
  }

  const { error } = await supabase
    .from("profiles")
    .update({ full_name: fullName, avatar_url: avatarUrl || null })
    .eq("id", user.id);

  if (error) {
    return NextResponse.json({ ok: false, error: "Aggiornamento profilo non riuscito" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
