"use client";

import { useState } from "react";
import { Save } from "lucide-react";

interface CoachProfileSettingsProps {
  initialFullName: string;
  initialEmail: string;
  initialAvatarUrl: string;
}

export function CoachProfileSettings({
  initialFullName,
  initialEmail,
  initialAvatarUrl
}: CoachProfileSettingsProps) {
  const [fullName, setFullName] = useState(initialFullName);
  const [avatarUrl, setAvatarUrl] = useState(initialAvatarUrl);
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [error, setError] = useState("");
  const [accountEmail, setAccountEmail] = useState(initialEmail);
  const [newPassword, setNewPassword] = useState("");
  const [accountStatus, setAccountStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [accountMessage, setAccountMessage] = useState("");
  const [needsRelogin, setNeedsRelogin] = useState(false);

  async function handleSave(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("saving");
    setError("");

    try {
      const response = await fetch("/api/profile", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ fullName, avatarUrl })
      });

      if (!response.ok) {
        const body = (await response.json()) as { error?: string };
        throw new Error(body.error ?? "Errore salvataggio");
      }

      setStatus("saved");
      window.setTimeout(() => setStatus("idle"), 1800);
    } catch (saveError) {
      setStatus("error");
      setError(saveError instanceof Error ? saveError.message : "Errore salvataggio");
    }
  }

  async function handleSecuritySave(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setAccountStatus("saving");
    setAccountMessage("");

    const wantsEmailChange = accountEmail.trim() !== initialEmail.trim();
    const wantsPasswordChange = newPassword.trim().length > 0;

    try {
      const response = await fetch("/api/account", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email: accountEmail, password: newPassword })
      });

      const body = (await response.json()) as { ok?: boolean; error?: string; message?: string };

      if (!response.ok || !body.ok) {
        throw new Error(body.error ?? "Errore aggiornamento account");
      }

      setAccountStatus("saved");
      setAccountMessage(body.message ?? "Account aggiornato.");
      setNeedsRelogin(wantsEmailChange || wantsPasswordChange);
      setNewPassword("");
      window.setTimeout(() => setAccountStatus("idle"), 2600);
    } catch (saveError) {
      setAccountStatus("error");
      setAccountMessage(
        saveError instanceof Error ? saveError.message : "Errore aggiornamento account"
      );
    }
  }

  return (
    <section className="panel profile-settings">
      <div className="panel-title">
        <div>
          <h2>Profilo coach</h2>
          <p>Aggiorna nome e avatar visibili nella sidebar.</p>
        </div>
      </div>

      <form className="profile-form" onSubmit={handleSave}>
        <label>
          Email account
          <input value={initialEmail} disabled />
        </label>

        <label>
          Nome visualizzato
          <input
            value={fullName}
            onChange={(event) => setFullName(event.target.value)}
            placeholder="Nome e cognome"
            required
          />
        </label>

        <label>
          URL avatar (opzionale)
          <input
            value={avatarUrl}
            onChange={(event) => setAvatarUrl(event.target.value)}
            placeholder="https://..."
          />
        </label>

        <button type="submit" className="primary-button" disabled={status === "saving"}>
          <Save size={16} />
          {status === "saving" ? "Salvataggio..." : "Salva profilo"}
        </button>

        {status === "saved" ? <p className="form-ok">Profilo aggiornato.</p> : null}
        {status === "error" ? <p className="form-error">{error}</p> : null}
      </form>

      <hr className="settings-separator" />

      <form className="profile-form" onSubmit={handleSecuritySave}>
        <label>
          Email accesso
          <input
            type="email"
            value={accountEmail}
            onChange={(event) => setAccountEmail(event.target.value)}
            placeholder="nome@dominio.com"
          />
        </label>

        <label>
          Nuova password
          <input
            type="password"
            value={newPassword}
            onChange={(event) => setNewPassword(event.target.value)}
            placeholder="Almeno 8 caratteri"
          />
        </label>

        <button type="submit" className="secondary-button" disabled={accountStatus === "saving"}>
          {accountStatus === "saving" ? "Aggiornamento..." : "Aggiorna account"}
        </button>

        {accountStatus === "saved" ? <p className="form-ok">{accountMessage}</p> : null}
        {accountStatus === "error" ? <p className="form-error">{accountMessage}</p> : null}

        {needsRelogin ? (
          <div className="security-next-step">
            <p>
              Modifiche account applicate. Per sicurezza ti consigliamo di uscire e rientrare con
              le nuove credenziali.
            </p>
            <form action="/api/auth/logout" method="post">
              <button type="submit" className="secondary-button">
                Esci ora
              </button>
            </form>
          </div>
        ) : null}
      </form>
    </section>
  );
}
