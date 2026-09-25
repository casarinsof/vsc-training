"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  Bell,
  CalendarDays,
  ChevronRight,
  CircleUserRound,
  Dumbbell,
  LayoutDashboard,
  Library,
  MessageSquare,
  PanelLeftClose,
  PanelLeftOpen,
  Search,
  Settings,
  UsersRound
} from "lucide-react";

const navigation = [
  { slug: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { slug: "atleti", label: "Atleti", icon: UsersRound },
  { slug: "programmi", label: "Programmi", icon: Dumbbell },
  { slug: "esercizi", label: "Libreria esercizi", icon: Library },
  { slug: "calendario", label: "Calendario", icon: CalendarDays },
  { slug: "messaggi", label: "Messaggi", icon: MessageSquare },
  { slug: "impostazioni", label: "Impostazioni", icon: Settings }
] as const;

const minWidth = 190;
const maxWidth = 380;
const storageKey = "vsc:sidebar";

interface CoachShellProps {
  route: string;
  wide: boolean;
  coachName?: string;
  coachEmail?: string;
  coachAvatarUrl?: string;
  children: ReactNode;
}

/** Shell con barra laterale ridimensionabile e richiudibile. */
export function CoachShell({
  route,
  wide,
  coachName,
  coachEmail,
  coachAvatarUrl,
  children
}: CoachShellProps) {
  const [width, setWidth] = useState(245);
  const [collapsed, setCollapsed] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const resizing = useRef(false);
  const profileMenuRef = useRef<HTMLDivElement | null>(null);
  const coachCardMenuRef = useRef<HTMLDivElement | null>(null);

  const displayName = coachName?.trim() || "Coach";
  const displayEmail = coachEmail?.trim() || "";
  const initials = displayName
    .split(" ")
    .filter((chunk) => chunk.length > 0)
    .slice(0, 2)
    .map((chunk) => chunk[0]?.toUpperCase())
    .join("") || "C";

  useEffect(() => {
    const saved = window.localStorage.getItem(storageKey);
    if (!saved) return;
    try {
      const state = JSON.parse(saved) as { width?: number; collapsed?: boolean };
      if (typeof state.width === "number") setWidth(state.width);
      if (typeof state.collapsed === "boolean") setCollapsed(state.collapsed);
    } catch {
      // Preferenza illeggibile: si riparte dai valori predefiniti.
    }
  }, []);

  useEffect(() => {
    window.localStorage.setItem(storageKey, JSON.stringify({ width, collapsed }));
  }, [width, collapsed]);

  const startResize = useCallback(() => {
    resizing.current = true;
    document.body.classList.add("resizing");
  }, []);

  useEffect(() => {
    function onMove(event: MouseEvent) {
      if (!resizing.current) return;
      setWidth(Math.min(maxWidth, Math.max(minWidth, event.clientX)));
    }
    function onUp() {
      resizing.current = false;
      document.body.classList.remove("resizing");
    }
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, []);

  useEffect(() => {
    function onPointerDown(event: MouseEvent) {
      if (profileMenuRef.current?.contains(event.target as Node)) return;
      if (coachCardMenuRef.current?.contains(event.target as Node)) return;
      setProfileOpen(false);
    }
    window.addEventListener("mousedown", onPointerDown);
    return () => window.removeEventListener("mousedown", onPointerDown);
  }, []);

  return (
    <div
      className={`app-shell${collapsed ? " collapsed" : ""}`}
      style={{ ["--sidebar-width" as string]: `${collapsed ? 68 : width}px` }}
    >
      <aside className="sidebar">
        <div className="logo">
          <span>VSC</span>
          {collapsed ? null : <strong>TRAINING</strong>}
        </div>
        <nav>
          {navigation.map(({ slug, label, icon: Icon }) => (
            <Link
              className={route === slug ? "active" : ""}
              href={`/${slug}`}
              key={slug}
              title={collapsed ? label : undefined}
            >
              <Icon size={19} />
              {collapsed ? null : <span>{label}</span>}
              {slug === "messaggi" && !collapsed ? <b>3</b> : null}
            </Link>
          ))}
        </nav>
        <div className="coach-card-wrap" ref={coachCardMenuRef}>
          <button
            type="button"
            className="coach-card coach-card-button"
            title="Profilo coach"
            aria-expanded={profileOpen}
            onClick={() => setProfileOpen((value) => !value)}
          >
            {coachAvatarUrl ? (
              <span className="avatar avatar-photo">
                <Image
                  src={coachAvatarUrl}
                  alt={displayName}
                  className="avatar-img"
                  width={36}
                  height={36}
                />
              </span>
            ) : (
              <span className="avatar">{initials}</span>
            )}
            {collapsed ? null : (
              <>
                <div>
                  <strong>{displayName}</strong>
                  <small>Account Pro</small>
                </div>
                <ChevronRight size={16} />
              </>
            )}
          </button>
          {profileOpen && !collapsed ? (
            <div className="coach-popover">
              <strong>{displayName}</strong>
              {displayEmail ? <small>{displayEmail}</small> : null}
              <Link href="/impostazioni" className="profile-link" onClick={() => setProfileOpen(false)}>
                Apri impostazioni
              </Link>
              <form action="/api/auth/logout" method="post">
                <button type="submit" className="profile-logout">
                  Esci
                </button>
              </form>
            </div>
          ) : null}
        </div>

        {collapsed ? null : (
          <div
            className="sidebar-grip"
            role="separator"
            aria-orientation="vertical"
            aria-label="Ridimensiona menu"
            onMouseDown={startResize}
            onDoubleClick={() => setWidth(245)}
          />
        )}
      </aside>

      <main>
        <div className="topbar">
          <button
            className="panel-toggle"
            aria-label={collapsed ? "Espandi menu" : "Riduci menu"}
            title={collapsed ? "Espandi menu" : "Riduci menu"}
            onClick={() => setCollapsed((value) => !value)}
          >
            {collapsed ? <PanelLeftOpen size={19} /> : <PanelLeftClose size={19} />}
          </button>
          <div className="search">
            <Search size={18} />
            <span>Cerca atleta, programma...</span>
            <kbd>⌘ K</kbd>
          </div>
          <button aria-label="Notifiche">
            <Bell size={20} />
            <i />
          </button>
          <div className="profile-menu" ref={profileMenuRef}>
            <button
              type="button"
              className="profile-button"
              aria-label="Profilo"
              title="Profilo"
              onClick={() => setProfileOpen((value) => !value)}
            >
              <CircleUserRound size={28} />
            </button>
            {profileOpen ? (
              <div className="profile-popover">
                <strong>{displayName}</strong>
                {displayEmail ? <small>{displayEmail}</small> : null}
                <Link href="/impostazioni" className="profile-link" onClick={() => setProfileOpen(false)}>
                  Apri impostazioni
                </Link>
                <form action="/api/auth/logout" method="post">
                  <button type="submit" className="profile-logout">
                    Esci
                  </button>
                </form>
              </div>
            ) : null}
          </div>
        </div>
        <div className={wide ? "content wide" : "content"}>{children}</div>
      </main>
    </div>
  );
}
