"use client";

import { useEffect, useMemo, useState } from "react";
import { getBrowserSupabaseClient } from "@/lib/supabase-auth-browser";

type SetupStatus = "loading" | "ready" | "saving" | "done" | "error";

export default function AthleteSetupPage() {
  const [status, setStatus] = useState<SetupStatus>("loading");
  const [message, setMessage] = useState("");
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const canSubmit = useMemo(
    () => status === "ready" && password.length >= 8 && password === confirmPassword,
    [status, password, confirmPassword]
  );

  useEffect(() => {
    const supabase = getBrowserSupabaseClient();
    if (!supabase) {
      setStatus("error");
      setMessage("Configurazione Supabase mancante.");
      return;
    }

    void supabase.auth.getUser().then(({ data, error }) => {
      if (error || !data.user) {
        setStatus("error");
        setMessage("Link invito non valido o scaduto. Richiedi un nuovo invito al coach.");
        return;
      }

      setEmail(data.user.email ?? "");
      const meta = data.user.user_metadata as { full_name?: string } | null;
      setFullName(meta?.full_name?.trim() ?? "");
      setStatus("ready");
    });
  }, []);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canSubmit) return;

    const supabase = getBrowserSupabaseClient();
    if (!supabase) {
      setStatus("error");
      setMessage("Configurazione Supabase mancante.");
      return;
    }

    setStatus("saving");
    setMessage("");

    const updates: { password: string; data?: { full_name: string } } = { password };
    if (fullName.trim()) {
      updates.data = { full_name: fullName.trim() };
    }

    const { error } = await supabase.auth.updateUser(updates);
    if (error) {
      setStatus("error");
      setMessage(error.message);
      return;
    }

    setStatus("done");
    setMessage("Password impostata con successo. Ora puoi accedere dall'app atleta.");
  }

  return (
    <main className="content" style={{ maxWidth: 620, paddingTop: 64 }}>
      <section className="panel" style={{ padding: 24, display: "grid", gap: 12 }}>
        <p className="eyebrow">VSC TRAINING</p>
        <h1 style={{ margin: 0 }}>Completa il tuo accesso atleta</h1>
        <p className="muted" style={{ lineHeight: 1.6 }}>
          Imposta una password per il tuo account atleta e poi accedi dall'app mobile.
        </p>

        <form onSubmit={handleSubmit} className="profile-form" style={{ marginTop: 8 }}>
          <label>
            Email
            <input type="email" value={email} disabled />
          </label>

          <label>
            Nome e cognome (opzionale)
            <input
              value={fullName}
              onChange={(event) => setFullName(event.target.value)}
              placeholder="Nome e cognome"
              disabled={status === "saving" || status === "done"}
            />
          </label>

          <label>
            Nuova password
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Almeno 8 caratteri"
              minLength={8}
              required
              disabled={status === "saving" || status === "done"}
            />
          </label>

          <label>
            Conferma password
            <input
              type="password"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              placeholder="Ripeti la password"
              minLength={8}
              required
              disabled={status === "saving" || status === "done"}
            />
          </label>

          <button type="submit" className="primary-button" disabled={!canSubmit || status === "saving" || status === "done"}>
            {status === "saving" ? "Salvataggio..." : status === "done" ? "Completato" : "Imposta password"}
          </button>
        </form>

        {message ? (
          <p className="muted" style={{ color: status === "error" ? "#ff8f8f" : "#7de2a9", margin: 0 }}>
            {message}
          </p>
        ) : null}
      </section>
    </main>
  );
}
