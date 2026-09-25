"use client";

import { useState } from "react";
import { getBrowserSupabaseClient } from "@/lib/supabase-auth-browser";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [message, setMessage] = useState<string>("");

  async function handleLogin(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("sending");
    setMessage("");

    const supabase = getBrowserSupabaseClient();
    if (!supabase) {
      setStatus("error");
      setMessage("Configurazione Supabase mancante: verifica le variabili env.");
      return;
    }

    const redirectTo = `${window.location.origin}/auth/callback?next=/programmi`;
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: redirectTo }
    });

    if (error) {
      setStatus("error");
      setMessage("Invio link non riuscito. Controlla l'email e riprova.");
      return;
    }

    setStatus("sent");
    setMessage("Link inviato. Apri la tua email per completare l'accesso.");
  }

  return (
    <main className="content" style={{ maxWidth: 560, paddingTop: 80 }}>
      <section className="panel" style={{ padding: 24 }}>
        <p className="eyebrow">VSC TRAINING</p>
        <h1 style={{ marginTop: 8 }}>Accesso Coach</h1>
        <p className="muted" style={{ marginTop: 6 }}>
          Ricevi un link di accesso rapido via email.
        </p>

        <form onSubmit={handleLogin} style={{ marginTop: 18, display: "grid", gap: 10 }}>
          <input
            type="email"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="coach@esempio.com"
            className="program-desc-input"
            style={{ borderColor: "var(--border)", background: "var(--surface)", padding: "10px 12px" }}
          />
          <button type="submit" className="primary-button" disabled={status === "sending"}>
            {status === "sending" ? "Invio..." : "Invia link di accesso"}
          </button>
        </form>

        {message ? (
          <p className="muted" style={{ marginTop: 12, color: status === "error" ? "#ff8f8f" : undefined }}>
            {message}
          </p>
        ) : null}
      </section>
    </main>
  );
}
