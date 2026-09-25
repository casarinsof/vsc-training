import { NextResponse } from "next/server";
import { getServerSupabaseClient, hasSupabaseAuthConfig } from "@/lib/supabase-auth-server";

interface AccountPayload {
  email?: string;
  password?: string;
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

  const payload = (await request.json()) as AccountPayload;

  const nextEmail = payload.email?.trim();
  const nextPassword = payload.password?.trim();

  if (!nextEmail && !nextPassword) {
    return NextResponse.json({ ok: false, error: "Nessuna modifica richiesta" }, { status: 400 });
  }

  if (nextPassword && nextPassword.length < 8) {
    return NextResponse.json(
      { ok: false, error: "La password deve avere almeno 8 caratteri" },
      { status: 400 }
    );
  }

  const updatePayload: { email?: string; password?: string } = {};
  if (nextEmail && nextEmail !== user.email) {
    updatePayload.email = nextEmail;
  }
  if (nextPassword) {
    updatePayload.password = nextPassword;
  }

  if (!updatePayload.email && !updatePayload.password) {
    return NextResponse.json({ ok: true, message: "Nessuna variazione" });
  }

  const { error } = await supabase.auth.updateUser(updatePayload);

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 400 });
  }

  return NextResponse.json({
    ok: true,
    message: updatePayload.email
      ? "Richiesta inviata. Controlla la nuova email per confermare la modifica."
      : "Password aggiornata."
  });
}
