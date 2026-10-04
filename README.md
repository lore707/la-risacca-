# La Risacca 2 — Booking e dashboard

Applicazione React + Vite + TypeScript indipendente dal sito pubblico, con Supabase condiviso.

## Accesso e avvio

- Booking pubblico: https://la-risacca.onrender.com/prenota
- Dashboard senza login: https://la-risacca.onrender.com/admin
- Archivio: `/admin/prenotazioni`; configurazione informativa: `/admin/configurazione`.
- I precedenti `/admin/login` e `/admin/password` reindirizzano alla dashboard.

L'accesso pubblico è stato richiesto esplicitamente dall'utente: chiunque può leggere prenotazioni, contatti e note e confermare/rifiutare le richieste. Non è limitato al proprietario.

Il codice è su https://github.com/lore707/la-risacca-, pubblico per scelta dell'utente. `.env`, node_modules e dist sono esclusi da Git. Render usa `npm ci && npm run build`, directory `dist`, regola Rewrite `/* → /index.html`, e le due variabili VITE Supabase durante la compilazione.

Richiede Node.js 22.12+ (oppure 20.19+) e npm:

```powershell
npm ci
npm run dev
```

Localmente usare http://127.0.0.1:5173/prenota e http://127.0.0.1:5173/admin.

## Flusso e dati

Il booking pubblico conserva quattro passaggi, validazioni Europe/Rome, stato di invio, blocco dei doppi clic e UUID idempotente. La ricevuta compare solo dopo il salvataggio reale via create_reservation. Le richieste nascono pending/website. Gli errori conservano i dati in memoria; il ricaricamento li cancella.

La dashboard mostra pending di tutte le date, ordine più vecchie prima e tempo di attesa aggiornato ogni minuto. Giorno e Pranzo/Cena filtrano il riepilogo e le confermate: pranzo prima delle 17:00, cena dalle 17:00. È una classificazione per consultazione, non un vincolo del booking.

KPI per giorno/servizio: prenotazioni di tutti gli stati, pending, coperti pending+confirmed, cancelled. Le rejected non sono cancellazioni. Nessuna capienza inventata. Conferma salva pending→confirmed senza tavolo; Rifiuta richiede un dialogo e salva pending→rejected. Dettagli mostra contatti, fonte, note e ricezione. Nessun messaggio automatico: il contatto col cliente è personale. Dopo una decisione i dati si aggiornano; nuove richieste da altre sessioni richiedono Aggiorna.

Archivio con oggi, domani, prossimi sette giorni inclusi oggi, tutte le date, stato, nome/telefono e pagine da 50. Filtri e conteggi sono eseguiti sul database completo. Vedi tutte conserva giorno e stato. Nuova prenotazione manuale è disabilitata; nessun CRM. Configurazione è informativa: orari/chiusure/limiti modificabili richiedono implementazione futura.

## Struttura e design

- `src/pages/Prenota.tsx`: booking; `Dashboard.tsx`: coda/riepilogo; `Reservations.tsx`: archivio.
- `src/components/AdminArea.tsx`: navigazione e configurazione senza guardia Auth.
- `src/components/ReservationList.tsx`: dettagli, conferma e rifiuto.
- `Brand.tsx`, `BookingField.tsx`, `BookingSummary.tsx`: componenti comuni/pubblici.
- `src/lib/supabase.ts`: unico client; `reservations.ts`: creazione; `admin.ts`: RPC dashboard; `bookingValidation.ts`: validazioni; `reservationDisplay.ts`: date/etichette.
- `src/types/reservation.ts`: contratti; `src/styles.css`: unico stile.
- `supabase/migrations/`: cronologia applicata; `supabase/tests/`: PostgreSQL locale PGlite.

Logo originale locale `src/assets/logo.webp`, navy #0d1b2e, crema #f5efe3, oro #b8975a, Cormorant Garamond/Jost con fallback. Sito pubblico invariato. KPI 2×2 mobile, colonne impilate, azioni ampie e dialoghi nativi. Booking mantiene i suoi breakpoint.

Rimossi piantina/tavoli/disponibilità/permanenza/telefoniche, tipi e stili dedicati. In questa iterazione rimossi login, recupero password, guardia/logout, codice Auth non più usato e relativi test/stili. Nessuna copia alternativa. Account Supabase, abilitazione admin, migrazioni applicate e dati storici sono preservati.

## Configurazione Supabase

Copiare `.env.example` in `.env`:

```dotenv
VITE_SUPABASE_URL=https://TUO-PROGETTO.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_VALORE_DEL_PROGETTO
```

Le VITE sono pubbliche: mai Secret, service_role o password nel browser/repository. Riavviare Vite dopo modifiche locali; su Render ricompilare.

RLS e restrizioni sulle tabelle rimangono attive: anon/authenticated non accedono direttamente a reservations o tabelle private. La migrazione `202610040005_public_dashboard.sql` consente soltanto search_reservations, reservation_overview e decide_reservation ai ruoli anon/authenticated, senza controllo admin. Restano validazioni, decisioni atomiche solo sulle pending, errori di conflitto e timestamp server. Le vecchie RPC sala restano bloccate.

Le migrazioni 001–005 sono già applicate al progetto Supabase: non rieseguirle né modificarle. Su un progetto nuovo applicare 001–005 in ordine. Nessuna migrazione cancella o modifica prenotazioni esistenti.

Per ripristinare il login servono guardia nella UI e una nuova migrazione che reintroduca la verifica admin nelle tre RPC e revochi execute ad anon. Nascondere la pagina non protegge le RPC. Gli utenti Supabase e private.reservation_admins esistenti restano disponibili; non si cancellano né ricreano.

## Verifiche

```powershell
npm run lint
npm test -- --maxWorkers=2
npm run build
```

Build comprende TypeScript. Due processi evitano esaurimento memoria durante PGlite. Test coprono booking, validazioni, idempotenza, accesso dashboard senza sessione, RPC anonime, filtri, decisioni/conflitti, errori e restrizioni sulle tabelle private. Il test cloud booking è opt-in:

Verifica del 4 ottobre 2026: 35 test superati, un test cloud opt-in non eseguito; TypeScript, lint e build superati. Su Supabase reale verificati lettura, riepilogo, conferma e rifiuto con ruolo anon: richieste temporanee annullate tramite rollback, dati esistenti preservati.

```powershell
$env:RUN_SUPABASE_LIVE_TEST = '1'
try { npm exec vitest run src/pages/Prenota.supabase.test.tsx }
finally { Remove-Item Env:RUN_SUPABASE_LIVE_TEST }
```

Il test cloud crea una richiesta tecnica persistente con contatti fittizi, senza cancellarla. Il precedente record `7f3b0405-2a54-4531-8429-5e2aa4fa370f` è stato creato e confermato il 4 ottobre 2026: 11 ottobre alle 20:30, due persone, website, senza tavolo. Cinque ulteriori prenotazioni DEMO del 4 ottobre sono presenti: contatti fittizi, non contattare.

La sessione non espone un browser controllabile: restano verifica visiva desktop/mobile, zoom 200%, dialoghi e demo completa in browser. I test DOM/HTTP non sostituiscono questi controlli. Informativa privacy, giorni/orari prenotabili e protezione dagli invii abusivi sono da completare. Automazioni non implementate.
