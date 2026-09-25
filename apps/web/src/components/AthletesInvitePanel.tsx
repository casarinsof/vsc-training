"use client";

import { useState } from "react";
import { MailPlus } from "lucide-react";

export interface AthleteInviteItem {
  id: string;
  athlete_email: string;
  athlete_name: string | null;
  status: string;
  created_at: string;
}

interface AthletesInvitePanelProps {
  initialInvites: AthleteInviteItem[];
}

export function AthletesInvitePanel({ initialInvites }: AthletesInvitePanelProps) {
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [invites, setInvites] = useState(initialInvites);
  const [status, setStatus] = useState<"idle" | "sending" | "error" | "ok">("idle");
  const [message, setMessage] = useState("");

  async function handleInvite(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("sending");
    setMessage("");

    try {
      const response = await fetch("/api/athletes/invite", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email, fullName })
      });

      const body = (await response.json()) as {
        ok?: boolean;
        error?: string;
        invite?: AthleteInviteItem;
      };

      if (!response.ok || !body.ok || !body.invite) {
        throw new Error(body.error ?? "Invio invito non riuscito");
      }

      const createdInvite = body.invite;
      setInvites((current) => [createdInvite, ...current]);
      setEmail("");
      setFullName("");
      setStatus("ok");
      setMessage("Invito inviato. L’atleta riceverà un link di accesso.");
      window.setTimeout(() => setStatus("idle"), 2200);
    } catch (submitError) {
      setStatus("error");
      setMessage(submitError instanceof Error ? submitError.message : "Errore invio invito");
    }
  }

  return (
    <section className="panel invite-athlete-panel">
      <div className="panel-title">
        <div>
          <h2>Invita nuovo atleta</h2>
          <p>Invia link automatico di accesso all’app atleta.</p>
        </div>
      </div>

      <form className="invite-form" onSubmit={handleInvite}>
        <label>
          Nome atleta (opzionale)
          <input
            value={fullName}
            onChange={(event) => setFullName(event.target.value)}
            placeholder="Nome e cognome"
          />
        </label>

        <label>
          Email atleta
          <input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="atleta@email.com"
            required
          />
        </label>

        <button type="submit" className="primary-button" disabled={status === "sending"}>
          <MailPlus size={16} />
          {status === "sending" ? "Invio..." : "Invia invito"}
        </button>

        {status === "ok" ? <p className="form-ok">{message}</p> : null}
        {status === "error" ? <p className="form-error">{message}</p> : null}
      </form>

      <hr className="settings-separator" />

      <div className="invite-list">
        <h3>Inviti recenti</h3>
        {invites.length === 0 ? (
          <p className="muted">Nessun invito inviato.</p>
        ) : (
          <ul>
            {invites.map((invite) => (
              <li key={invite.id}>
                <div>
                  <strong>{invite.athlete_name || invite.athlete_email}</strong>
                  {invite.athlete_name ? <small>{invite.athlete_email}</small> : null}
                </div>
                <span className={`invite-status ${invite.status}`}>{invite.status}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
