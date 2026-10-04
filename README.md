# La Risacca 2 — Booking e dashboard

Applicazione React + Vite + TypeScript indipendente dal sito pubblico, con booking e amministrazione sullo stesso progetto Supabase.

## Avvio

Richiede Node.js 22.12+ (oppure 20.19+) e npm.

```powershell
npm ci
npm run dev
```

- Booking: http://127.0.0.1:5173/prenota
- Dashboard: http://127.0.0.1:5173/admin
- Archivio: http://127.0.0.1:5173/admin/prenotazioni
- Accesso: `/admin/login`, email/password Supabase Auth. Nessuna registrazione pubblica.

Il repository è inizializzato con Git e il remote `origin` punta a `https://github.com/lore707/la-risacca-.git`, pubblico per scelta dell'utente. `.env`, dipendenze e build sono esclusi dal caricamento. La pubblicazione su Render non è ancora configurata.

## Funzionamento

Il cliente compila il booking in quattro passaggi. Validazioni, blocco dei doppi invii e UUID idempotente evitano richieste incomplete o reinvii accidentali. La ricevuta appare solo dopo il salvataggio reale; in caso di errore i dati restano nel form. Non persistono dopo un ricaricamento. Ogni richiesta online nasce `pending` con fonte `website`.

La dashboard mostra richieste in attesa di **tutte le date**, ordinate dalla più vecchia, conteggio globale e tempo trascorso aggiornato ogni minuto. Giorno e Pranzo/Cena filtrano il riepilogo e le confermate, non la coda globale. Pranzo significa orari prima delle 17:00; Cena dalle 17:00. Questa è una classificazione per consultazione, non un vincolo del booking.

I KPI riguardano giorno e servizio selezionati: prenotazioni di tutti gli stati, pending, coperti delle pending + confirmed e cancellazioni con stato cancelled. Le rifiutate non sono cancellazioni. Non viene mostrata una capienza inventata.

Conferma salva `pending → confirmed` senza assegnazione. Rifiuta richiede un dialogo e salva `pending → rejected`. Dettagli mostra contatti, note, fonte, stato e data di ricezione, con link telefonico. Nessun messaggio viene inviato automaticamente: lo staff contatta personalmente il cliente. Dopo la decisione i dati vengono riletti automaticamente. Per nuove richieste provenienti da altre sessioni usare **Aggiorna**: non è un monitoraggio realtime.

L'archivio filtra oggi, domani, prossimi sette giorni inclusi oggi e tutte le date, stato e nome/telefono. Filtri, ordinamento, conteggi e paginazione da 50 righe vengono eseguiti nel database, sull'intero insieme dei dati. Vedi tutte conserva giorno e stato confirmed.

Nuova prenotazione manuale è esplicitamente disabilitata. Clienti è omesso: nessun CRM. Configurazione descrive i vincoli effettivi del booking; non simula impostazioni modificabili. Orari, chiusure e limite di persone richiedono una futura implementazione.

## Design e mobile

Logo originale locale `src/assets/logo.webp`, palette navy `#0d1b2e`, crema `#f5efe3`, oro `#b8975a`, Cormorant Garamond per titoli e Jost per dati, coerenti al sito di riferimento. Font Google Fonts con fallback di sistema. Il sito pubblico non viene modificato.

Dashboard con alert, controlli giorno, quattro KPI, richieste dominanti e confermate cronologiche. Su smartphone KPI 2×2, colonne impilate, azioni ampie e dettagli in dialogo accessibile con Escape e gestione del focus nativa. Booking conserva i breakpoint e gli stati di errore/invio/ricevuta esistenti.

## Struttura

- `src/pages/Prenota.tsx`: booking pubblico.
- `src/pages/Login.tsx`: autenticazione.
- `src/pages/Dashboard.tsx`: coda globale, riepilogo e confermate.
- `src/pages/Reservations.tsx`: archivio filtrato e paginato.
- `src/components/AdminArea.tsx`: protezione di tutte le route admin, header e configurazione informativa.
- `src/components/ReservationList.tsx`: richieste, dettagli e decisioni.
- `src/components/Brand.tsx`, `BookingField.tsx`, `BookingSummary.tsx`: componenti condivisi/pubblici.
- `src/lib/supabase.ts`: unico client; `reservations.ts`: creazione; `admin.ts`: operazioni admin; `bookingValidation.ts`: validazioni; `reservationDisplay.ts`: etichette/date.
- `src/types/reservation.ts`: contratti dati.
- `src/styles.css`: stile comune e responsive.
- `supabase/migrations/`: cronologia SQL; `supabase/tests/`: test PostgreSQL locale PGlite.

La vecchia gestione sala è stata rimossa dal codice: piantina, tavoli, disponibilità, assegnazione, permanenza e inserimenti telefonici associati, con tipi, utility, stili e test dedicati. Le migrazioni già applicate e i dati storici restano conservati nel database.

## Supabase e sicurezza

Copiare `.env.example` in `.env` e compilare URL del progetto e chiave Publishable. `.env` è escluso da Git; riavviare Vite dopo le modifiche.

```dotenv
VITE_SUPABASE_URL=https://TUO-PROGETTO.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_VALORE_DEL_PROGETTO
```

Le variabili VITE sono pubbliche: mai chiavi Secret, service_role o password del database. RLS attiva e nessuna lettura/scrittura diretta di reservations da anon/authenticated. `create_reservation` valida, forza pending/website e restituisce solo UUID. Le RPC admin verificano a ogni chiamata `private.reservation_admins` tramite auth.uid; un utente non può autoabilitarsi. Decisioni atomiche aggiornano solo pending e segnalano conflitti tra operatori. Timestamp gestiti dal server.

Sul progetto collegato la migrazione booking e le migrazioni admin/sala sono già applicate: **non rieseguirle**. La nuova `202610040004_simple_dashboard.sql` è stata applicata tramite MCP il 4 ottobre 2026: ripristina decisioni senza tavolo, aggiunge `search_reservations` e `reservation_overview` e revoca ai client le vecchie RPC sala. Conserva schema, colonne, configurazione storica, assegnazioni e tutte le prenotazioni. Per un progetto nuovo applicare i quattro file nell'ordine, una sola volta.

### Abilitare un admin

Creare privatamente l'utente in Supabase → Authentication → Users → Add user, con email confermata e password. Abilitarne l'UUID da SQL Editor:

```sql
insert into private.reservation_admins (user_id)
select id from auth.users where lower(email) = lower('EMAIL-ADMIN-DA-SOSTITUIRE')
on conflict (user_id) do nothing;
```

L'account richiesto dall'utente è già abilitato. Per revocare l'accesso eliminare soltanto l'abilitazione privata, non l'account/prenotazioni. Login con password reale ancora da verificare nel browser.

## Verifiche

```powershell
npm run lint
npm test
npm run build
```

Build comprende TypeScript. Test ordinari coprono booking, idempotenza, auth, decisioni, conflitti, filtri, paginazione, errori, permessi e PostgreSQL locale. Il test cloud è opt-in e crea una richiesta tecnica persistente con contatti fittizi, senza cancellarla:

```powershell
$env:RUN_SUPABASE_LIVE_TEST = '1'
try { npm exec vitest run src/pages/Prenota.supabase.test.tsx }
finally { Remove-Item Env:RUN_SUPABASE_LIVE_TEST }
```

Il 4 ottobre 2026 il componente pubblico reale ha salvato la richiesta tecnica `7f3b0405-2a54-4531-8429-5e2aa4fa370f`, 11 ottobre ore 20:30, due persone. Verificati pending/website, reinvio idempotente e lettura anonima negata. La RPC admin è stata eseguita tramite MCP con ruolo authenticated e UUID dell'admin: richiesta confermata senza tavolo e visibile nell'elenco confirmed. Il record è conservato e marcato TEST; non contattare. Le altre richieste non sono state modificate.

Questa verifica usa il componente in un DOM di test e le RPC reali: non equivale al login e al flusso completo nel browser. La sessione non espone browser controllabili. Restano verifica visiva a 320/375/390/640/768/1024/1440 px, zoom 200%, focus/dialoghi, login reale e demo manuale booking → dashboard → conferma. Nella demo selezionare la data della richiesta per vederla nelle confermate.

Prima dell'uso con clienti reali definire orari/chiusure, privacy e protezione dagli invii abusivi. Automazioni e canali esterni non sono implementati.
