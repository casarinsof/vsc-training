import { athletes } from "@vsc-training/shared";
import { AthletesInvitePanel, type AthleteInviteItem } from "@/components/AthletesInvitePanel";
import { CoachShell } from "@/components/CoachShell";
import { CoachProfileSettings } from "@/components/CoachProfileSettings";
import { ProgramEditor } from "@/components/ProgramEditor";
import { getServerSupabaseClient, hasSupabaseAuthConfig } from "@/lib/supabase-auth-server";
import { loadProgramsForEditor } from "@/lib/program-repository";
import { BarChart3, ChevronRight, Dumbbell, Plus, TrendingUp } from "lucide-react";
import { redirect } from "next/navigation";
import Link from "next/link";

const sectionData: Record<string, { title: string; description: string }> = {
  atleti: { title: "Atleti", description: "Gestisci profili, obiettivi e andamento dei tuoi atleti." },
  programmi: { title: "Programmi", description: "Crea, duplica e assegna i tuoi programmi di allenamento." },
  esercizi: { title: "Libreria esercizi", description: "Organizza esercizi, video e indicazioni tecniche." },
  calendario: { title: "Calendario", description: "Pianifica allenamenti, check-in e appuntamenti." },
  messaggi: { title: "Messaggi", description: "Resta in contatto con gli atleti e rispondi ai feedback." },
  impostazioni: { title: "Impostazioni", description: "Personalizza account, team e preferenze di VSC Training." }
};

function Dashboard() {
  return (
    <>
      <header className="page-header">
        <div><p className="eyebrow">LUNEDÌ, 7 SETTEMBRE</p><h1>Bentornato, Coach.</h1><p>La tua squadra è sulla buona strada. Ecco cosa succede oggi.</p></div>
        <button className="primary-button"><Plus size={18} /> Crea programma</button>
      </header>
      <section className="metrics">
        <article><span>ATLETI ATTIVI</span><strong>24</strong><small className="positive"><TrendingUp size={14} /> +3 questo mese</small></article>
        <article><span>ALLENAMENTI OGGI</span><strong>18</strong><small>12 già completati</small></article>
        <article><span>ADERENZA MEDIA</span><strong>88%</strong><small className="positive"><TrendingUp size={14} /> +4,2%</small></article>
        <article><span>DA CONTROLLARE</span><strong>5</strong><small>Feedback e check-in</small></article>
      </section>
      <div className="dashboard-grid">
        <section className="panel athletes-panel">
          <div className="panel-title"><div><h2>Panoramica atleti</h2><p>Attività e aderenza della squadra</p></div><Link href="/atleti">Vedi tutti <ChevronRight size={16} /></Link></div>
          <div className="athlete-list">
            {athletes.map((athlete) => (
              <div className="athlete-row" key={athlete.id}>
                <span className="avatar">{athlete.initials}</span>
                <div className="athlete-name"><strong>{athlete.name}</strong><small>{athlete.goal}</small></div>
                <div className="progress"><span><i style={{ width: `${athlete.adherence}%` }} /></span><small>{athlete.adherence}%</small></div>
                <span className={`status ${athlete.status}`}>{athlete.status}</span>
                <small className="next">{athlete.nextWorkout}</small>
              </div>
            ))}
          </div>
        </section>
        <aside className="side-stack">
          <section className="panel activity">
            <div className="panel-title"><div><h2>Attività recente</h2><p>Ultimi aggiornamenti</p></div></div>
            <div><i className="activity-dot done" /><p><strong>Elena ha completato</strong><br />Upper Body Power · 52 min</p><small>12 min fa</small></div>
            <div><i className="activity-dot message" /><p><strong>Nuovo feedback da Marco</strong><br />“Carico impegnativo ma gestibile”</p><small>34 min fa</small></div>
            <div><i className="activity-dot record" /><p><strong>Nuovo record personale</strong><br />Giulia · Squat 92,5 kg</p><small>1 ora fa</small></div>
          </section>
          <section className="panel weekly">
            <div className="panel-title"><div><h2>Volume settimanale</h2><p>Allenamenti completati</p></div><BarChart3 size={20} /></div>
            <div className="bars">{[48, 70, 55, 90, 78, 35, 18].map((height, index) => <span key={index}><i style={{ height: `${height}%` }} /><small>{["L", "M", "M", "G", "V", "S", "D"][index]}</small></span>)}</div>
          </section>
        </aside>
      </div>
    </>
  );
}

function GenericSection({ section }: { section: string }) {
  const content = sectionData[section] ?? sectionData.atleti;
  return (
    <>
      <header className="page-header"><div><p className="eyebrow">VSC TRAINING</p><h1>{content.title}</h1><p>{content.description}</p></div><button className="primary-button"><Plus size={18} /> Nuovo elemento</button></header>
      <section className="panel empty-state"><Dumbbell size={42} /><h2>Area {content.title.toLowerCase()}</h2><p>La struttura è pronta per collegare i dati Supabase. Nell’MVP puoi già esplorare il flusso e il design.</p><button className="secondary-button">Configura sezione</button></section>
    </>
  );
}

export default async function Page({ params }: { params: Promise<{ section?: string[] }> }) {
  const route = (await params).section?.[0] ?? "dashboard";
  const protectedRoutes = new Set(["atleti", "programmi", "impostazioni"]);
  let initialPrograms = undefined;
  let initialInvites: AthleteInviteItem[] = [];
  let syncEnabled = false;
  let coachName = "Francesco Coach";
  let coachEmail = "";
  let coachAvatarUrl = "";

  if (!hasSupabaseAuthConfig) {
    if (route === "programmi") {
      initialPrograms = await loadProgramsForEditor();
    }
  } else {
    const supabase = await getServerSupabaseClient();
    if (!supabase) {
      if (route === "programmi") {
        initialPrograms = await loadProgramsForEditor();
      }
    } else {
      const {
        data: { user }
      } = await supabase.auth.getUser();

      if (!user && protectedRoutes.has(route)) {
        redirect(`/login?next=/${route}`);
      }

      if (user) {
        coachEmail = user.email ?? "";
        const { data: profile } = await supabase
          .from("profiles")
          .select("full_name,avatar_url")
          .eq("id", user.id)
          .maybeSingle<{ full_name: string; avatar_url: string | null }>();
        if (profile?.full_name) {
          coachName = profile.full_name;
        }
        if (profile?.avatar_url) {
          coachAvatarUrl = profile.avatar_url;
        }

        if (route === "atleti") {
          const { data: invites } = await supabase
            .from("athlete_invites")
            .select("id,athlete_email,athlete_name,status,created_at")
            .eq("coach_id", user.id)
            .order("created_at", { ascending: false })
            .limit(20)
            .returns<AthleteInviteItem[]>();
          initialInvites = invites ?? [];
        }
      }

      if (route === "programmi") {
        if (!user) {
          redirect("/login?next=/programmi");
        }
        initialPrograms = await loadProgramsForEditor({ supabase, coachId: user.id });
        syncEnabled = true;
      }
    }
  }

  return (
    <CoachShell
      route={route}
      wide={route === "programmi"}
      coachName={coachName}
      coachEmail={coachEmail}
      coachAvatarUrl={coachAvatarUrl}
    >
      {route === "dashboard" && <Dashboard />}
      {route === "atleti" && (
        <>
          <header className="page-header">
            <div>
              <p className="eyebrow">VSC TRAINING</p>
              <h1>Atleti</h1>
              <p>Invita nuovi atleti con link automatico e monitora gli inviti inviati.</p>
            </div>
          </header>
          <AthletesInvitePanel initialInvites={initialInvites} />
        </>
      )}
      {route === "programmi" && (
        <ProgramEditor initialPrograms={initialPrograms} syncEnabled={syncEnabled} />
      )}
      {route === "impostazioni" && (
        <>
          <header className="page-header">
            <div>
              <p className="eyebrow">VSC TRAINING</p>
              <h1>Impostazioni</h1>
              <p>Gestisci profilo, preferenze e configurazione account.</p>
            </div>
          </header>
          <CoachProfileSettings
            initialFullName={coachName}
            initialEmail={coachEmail}
            initialAvatarUrl={coachAvatarUrl}
          />
        </>
      )}
      {route !== "dashboard" && route !== "programmi" && route !== "impostazioni" && route !== "atleti" && (
        <GenericSection section={route} />
      )}
    </CoachShell>
  );
}