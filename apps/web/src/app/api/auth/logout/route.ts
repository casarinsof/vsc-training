import { NextResponse } from "next/server";
import { getServerSupabaseClient } from "@/lib/supabase-auth-server";

export async function POST(request: Request) {
  const origin = new URL(request.url).origin;
  const supabase = await getServerSupabaseClient();

  if (supabase) {
    await supabase.auth.signOut();
  }

  return NextResponse.redirect(new URL("/login", origin), { status: 303 });
}
