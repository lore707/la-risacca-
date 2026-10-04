# Regole di sviluppo — La Risacca 2

## Obiettivo e limiti

- Costruire un MVP indipendente dal sito pubblico: booking e dashboard nella stessa applicazione React + Vite + TypeScript, con Supabase condiviso.
- Procedere nell'ordine: pagina `/prenota`, UX, validazione, schema database, persistenza, test reale form → database; solo dopo dashboard, gestione stati e autenticazione admin.
- Non modificare o ricostruire il sito pubblico. Niente automazioni, pagamenti, microservizi o funzionalità future non richieste.
- Non mostrare successo senza salvataggio reale. Non esporre dati delle prenotazioni o operazioni admin a utenti non autorizzati.

## Prima di ogni modifica

1. Leggere il README e le istruzioni applicabili; controllare `git status` e le modifiche esistenti dell'utente.
2. Cercare con `rg` l'implementazione attuale, gli import, i chiamanti, le route e i test interessati. Leggere il codice prima di modificarlo.
3. Indicare brevemente cosa cambia e quali file sono coinvolti. Scegliere la modifica più semplice che risolve la richiesta.
4. Riutilizzare o modificare l'implementazione esistente prima di crearne una nuova. Preservare il lavoro dell'utente estraneo alla richiesta.

## Dove mettere il codice

Questa è la struttura prevista: creare cartelle solo quando contengono codice necessario alla fase corrente.

| Percorso | Responsabilità |
| --- | --- |
| `src/pages/` | Pagine associate alle route: booking, login e dashboard. |
| `src/components/` | Componenti visivi riutilizzati o sezioni che rendono una pagina più leggibile. |
| `src/lib/` | Client Supabase, operazioni sui dati e validazioni indipendenti dalla UI. |
| `src/types/` | Tipi condivisi; i tipi usati solo da un modulo restano nel modulo. |
| `src/App.tsx` | Composizione delle route e protezione dell'area admin. |
| `src/main.tsx` | Avvio dell'applicazione. |
| `src/styles.css` | Stili comuni; mantenere una sola definizione per ciascuna regola condivisa. |
| `src/assets/` | Immagini e altre risorse importate dall'app, quando necessarie. |
| `supabase/migrations/` | Schema SQL, vincoli e regole di accesso al database. |
| `supabase/tests/` | Test di schema, vincoli e permessi su PostgreSQL locale di test. |
| Radice | Configurazioni degli strumenti, package e documentazione del progetto. |

- Non aggiungere strutture parallele come `apps/`, `shared/`, `services/` o una seconda cartella di componenti per la stessa responsabilità.
- Un nuovo file deve avere uno scopo concreto e una collocazione coerente. Non creare cartelle vuote, file segnaposto o astrazioni per esigenze ipotetiche.
- Se una nuova responsabilità richiede una cartella diversa, spiegarne il motivo e aggiornare questa mappa nella stessa modifica.
- Non accedere a Supabase separatamente da ogni componente: mantenere le operazioni sui dati in `src/lib/`.

## Pulizia obbligatoria a ogni iterazione

- Quando un'implementazione viene sostituita, eliminare quella superata nella stessa modifica dopo aver verificato tutti i riferimenti e gli utilizzi.
- Rimuovere import, variabili, funzioni, componenti, route, stili, asset e dipendenze diventati inutili per effetto della modifica.
- Non conservare codice commentato, copie `old`, `backup`, `v2`, schermate duplicate o percorsi alternativi non utilizzati. La cronologia appartiene a Git.
- Aggiornare i test del comportamento cambiato; eliminare quelli relativi a funzionalità effettivamente rimosse, senza cancellare test per nascondere errori.
- Non cancellare un file solo perché non ha import: controllare anche route, configurazioni, script, asset pubblici e riferimenti dinamici.
- Non fare pulizie o refactor estesi estranei alla richiesta.
- Per rimuovere dipendenze usare il gestore di pacchetti, aggiornando anche il lockfile.
- Non cancellare dati reali o riscrivere migrazioni già applicate per ripulire il codice: evolvere il database con nuove migrazioni.

## Verifica prima di concludere

- Controllare il diff: solo modifiche pertinenti, nessun duplicato, residuo o credenziale.
- Quando l'app sarà configurata, eseguire i controlli di TypeScript, lint e build disponibili in `package.json`; non inventare comandi o dichiarare controlli non eseguiti.
- Verificare il comportamento modificato e quelli direttamente collegati. Per il booking controllare anche mobile, errori, invio in corso e prevenzione dei doppi invii.
- Aggiungere test mirati per validazioni, persistenza, permessi o altri comportamenti critici; evitare test che ripetono semplicemente l'implementazione.
- Se manca Supabase o un altro requisito esterno, completare il lavoro indipendente e dichiarare esattamente cosa non è stato verificato. Non sostituire la persistenza con un falso successo.
- Aggiornare il README quando cambiano struttura, configurazione, comandi o stato del progetto.
- Riportare cosa è cambiato, quali residui sono stati rimossi, quali verifiche sono passate e quali limiti restano.

## Configurazione

- Usare npm e mantenere `package-lock.json` sincronizzato.
- Non aggiungere librerie senza un bisogno concreto; preferire le dipendenze già presenti quando adeguate.
- Non inserire segreti nel repository o chiavi amministrative Supabase nel browser. `.env.example` contiene solo valori di esempio.
