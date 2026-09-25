import { NextResponse } from "next/server";
import { saveProgramFromEditor } from "@/lib/program-repository";
import { getServerSupabaseClient, hasSupabaseAuthConfig } from "@/lib/supabase-auth-server";
import type { TrainingProgram } from "@vsc-training/shared";

interface RouteContext {
  params: Promise<{ programId: string }>;
}

export async function POST(request: Request, context: RouteContext) {
  if (!hasSupabaseAuthConfig) {
    return NextResponse.json({ ok: false, error: "Supabase non configurato" }, { status: 503 });
  }

  const supabase = await getServerSupabaseClient();
  if (!supabase) {
    return NextResponse.json({ ok: false, error: "Client Supabase non disponibile" }, { status: 503 });
  }

  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ ok: false, error: "Sessione richiesta" }, { status: 401 });
  }

  const { programId } = await context.params;

  try {
    const body = (await request.json()) as { program?: TrainingProgram };
    const program = body.program;

    if (!program || program.id !== programId) {
      return NextResponse.json({ ok: false, error: "Programma non valido" }, { status: 400 });
    }

    await saveProgramFromEditor(program, { supabase, coachId: user.id });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false, error: "Errore di sincronizzazione" }, { status: 500 });
  }
}
