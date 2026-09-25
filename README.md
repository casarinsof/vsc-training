# VSC Training

MVP italiano per coaching sportivo con dashboard web per il coach e app iOS/Android per l’atleta. Il tema **Performance Dark** usa design tokens centralizzati, quindi colori, spaziature e raggi possono essere modificati senza riscrivere le interfacce.

## Applicazioni

- `apps/web`: dashboard coach responsive in Next.js con App Router e Tailwind CSS.
- `apps/mobile`: app atleta Expo/React Native con navigazione a tab.
- `packages/shared`: tipi, dati mock e logica condivisa con test.
- `packages/design-tokens`: palette e fondamenta del tema Performance Dark.
- `supabase/migrations`: schema PostgreSQL iniziale con indici e prime policy RLS.

L’MVP usa dati mock e funziona senza account o servizi esterni.

## Prerequisiti

- Node.js 20.19 o successivo
- npm 10 o successivo
- Expo Go su dispositivo, oppure Xcode/Android Studio per un simulatore

## Installazione

```bash
npm install
```

## Sviluppo

Dashboard coach:

```bash
npm run dev:web
```

App atleta:

```bash
npm run dev:mobile
```

Entrambe le applicazioni:

```bash
npm run dev
```

Expo mostrerà un QR code per Expo Go e i comandi per aprire simulatori iOS/Android.

## Controlli qualità

```bash
npm test
npm run typecheck
npm run lint
npm run build
```

## Configurazione futura di Supabase

1. Crea un progetto Supabase e applica `supabase/migrations/202609070001_initial_schema.sql`.
2. Copia `.env.example` in `.env.local` e inserisci URL e chiavi pubbliche del progetto.
3. Aggiungi i client Supabase alle due app e sostituisci i mock di `@vsc-training/shared`.
4. Completa e verifica tutte le policy RLS prima di usare dati reali.

Non inserire mai la service-role key in variabili esposte al browser o all’app mobile.

## Ambienti consigliati (dev / staging / prod)

Per evitare rework mentre il prodotto evolve, prepara subito le fondamenta di deploy:

1. **Dev locale**: usa `.env`/`.env.local` per sviluppo.
2. **Staging online**: pubblica una versione web con URL pubblico (es. Vercel) e database Supabase dedicato o schema separato.
3. **Produzione**: attiva solo dopo freeze funzionale minimo e smoke test.

Variabili chiave:

- `APP_URL`: URL canonico server-side (es. `https://staging.vsc-training.it` o `https://app.vsc-training.it`).
- `NEXT_PUBLIC_APP_URL`: fallback client/public se necessario.
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` (solo server)

Per gli inviti atleta, il backend usa `APP_URL`/`NEXT_PUBLIC_APP_URL` per costruire i link di callback in modo coerente con il dominio reale.

## Checklist pre go-live web (senza store mobile)

1. Deploy `staging` funzionante con login, callback e inviti end-to-end.
2. Redirect URL configurati in Supabase (`/auth/callback` su staging e prod).
3. Policy RLS verificate su tutte le tabelle con dati reali.
4. Rotazione chiavi e segreti, nessun segreto in repository o log.
5. Typecheck, lint e build verdi su CI.
6. Monitoring errori (es. Sentry) e piano rollback documentato.
7. Backup database testato con restore di prova.

## Architettura

I workspace npm condividono tipi e design tokens direttamente dai sorgenti TypeScript. Next.js transpila i package locali; Metro/Expo risolve gli stessi workspace. Questa struttura mantiene coerenti modello dati e identità visiva tra web, iOS e Android.

## Stato MVP

- Dashboard coach con metriche, atleti, attività e navigazione completa.
- App atleta con allenamento del giorno e sezioni Programma, Progressi, Messaggi e Profilo.
- Tema Performance Dark centralizzato e sostituibile.
- Schema dati per utenti, coaching, esercizi, programmi, log, misure e chat.
- Integrazione Supabase, autenticazione, notifiche e pagamenti previste nelle iterazioni successive.