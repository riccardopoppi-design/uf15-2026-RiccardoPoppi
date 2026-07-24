# UF15 - Sviluppi HIS-AFP

## 1. Scopo del documento

Questa relazione descrive in modo completo gli sviluppi realizzati per l'esame UF15 sul progetto HIS-AFP.

Obiettivi della relazione:

1. mappare i requisiti delle Task 1, 2 e 3 con le implementazioni reali;
2. evidenziare le scelte tecniche adottate (frontend e integrazione backend);
3. fornire una procedura di test ripetibile con esito atteso;
4. documentare limiti noti e possibili evoluzioni.

## 2. Stack e contesto tecnico

Componenti principali:

- Frontend: Angular (standalone components, Signals, Reactive Forms)
- UI: PrimeNG
- Backend: Node.js + Express
- Database: PostgreSQL

Pattern utilizzati:

1. separazione per feature folder;
2. stato locale con Signals;
3. accesso API centralizzato nei service core;
4. validazioni sincrone/asincrone in Reactive Forms.

## 3. Architettura funzionale (prima/dopo)

### 3.1 Situazione iniziale

1. flusso accettazione non ottimizzato per pazienti storici;
2. assenza pagina report dimessi dedicata;
3. gestione personale non completa rispetto ai requisiti di validazione realtime;
4. alcune azioni operative richiedevano passaggi ridondanti.

### 3.2 Situazione finale

1. gestione personale con elenco, creazione, modifica e validazione username asincrona;
2. workflow accettazione guidato da ricerca paziente (2 modalita) e form condizionale;
3. report dimessi ultime 24h su pagina dedicata, con ordinamento temporale;
4. integrazione operativa lista pazienti -> dimissione -> report.

## 4. Routing applicativo

Rotte rilevanti implementate/validate:

1. `/gestione-personale`
2. `/lista-pz`
3. `/accettazione-pz`
4. `/modifica-pz/:patientId`
5. `/stato-servizi`
6. `/report`

File di riferimento:

- `his-afp/src/app/app.routes.ts`

## 5. Task 1 - Gestione personale

### 5.1 Requisiti richiesti

1. pagina dedicata staff;
2. inserimento nuovo operatore (username, password, ruolo);
3. modifica dati operatore esistente (cambio ruolo);
4. validazione username realtime prima del submit;
5. stato dati gestito tramite Signals.

### 5.2 Implementazione realizzata

1. feature dedicata con tabella staff, dialog creazione/modifica e azioni;
2. form reattiva con validazioni campi obbligatori;
3. validatore asincrono username collegato all'endpoint di check disponibilita;
4. stato `staffList`, `isLoading`, `isDialogVisible`, `isEditMode`, `selectedUserId` via Signals;
5. operazioni CRUD su servizio dedicato staff.

### 5.3 Evidenze tecniche (file)

- `his-afp/src/app/features/gestione-personale/gestione-personale.ts`
- `his-afp/src/app/features/gestione-personale/gestione-personale.html`
- `his-afp/src/app/features/gestione-personale/username.validator.ts`
- `his-afp/src/app/core/Staff/staff.service.ts`
- `backend/server.js`

### 5.4 Copertura requisiti Task 1

1. pagina dedicata: soddisfatto
2. inserimento utente: soddisfatto
3. modifica ruolo: soddisfatto
4. validazione username async realtime: soddisfatto
5. stato via Signals: soddisfatto

## 6. Task 2 - Workflow ricerca e accettazione avanzata

### 6.1 Requisiti richiesti

1. flusso che parte da ricerca paziente;
2. modalita ricerca:
   - codice fiscale esatto;
   - nome + cognome + data di nascita;
3. precompilazione form su paziente trovato;
4. gestione nuovo paziente da zero;
5. separazione in due componenti (ricerca e form);
6. uso `signal`, `input`, `patchValue`.

### 6.2 Implementazione realizzata

1. orchestratore `accettazione-pz` con stato `showForm` e `selectedPatient`;
2. componente `patient-search` con logica query e risultati;
3. componente `accettazione-form` con prefill tramite `patchValue`;
4. sezione anagrafica/residenza bloccata per paziente storico, sezione sanitaria editabile;
5. form mostrato solo dopo ricerca e selezione o scelta "Nuovo paziente";
6. allineamento vincolo modalita 2: senza CF sono obbligatori nome, cognome e data di nascita.

### 6.3 Evidenze tecniche (file)

- `his-afp/src/app/features/accettazione-pz/accettazione-pz.ts`
- `his-afp/src/app/features/accettazione-pz/accettazione-pz.html`
- `his-afp/src/app/features/accettazione-pz/patient-search.ts`
- `his-afp/src/app/features/accettazione-pz/accettazione-form.ts`
- `his-afp/src/app/features/accettazione-pz/accettazione-form.html`
- `his-afp/src/app/core/Pazienti/patient-manager.ts`
- `backend/services/patients.js`

### 6.4 Flusso operativo (sintesi)

1. utente apre accettazione;
2. esegue ricerca per CF o per triade anagrafica;
3. se paziente trovato: selezione risultato e prefill form;
4. se paziente assente: avvio inserimento nuovo paziente;
5. invio accesso e chiusura form al successo.

### 6.5 Copertura requisiti Task 2

1. ricerca iniziale obbligata: soddisfatto
2. doppia modalita ricerca: soddisfatto
3. precompilazione form paziente trovato: soddisfatto
4. creazione nuovo paziente: soddisfatto
5. split componenti ricerca/form: soddisfatto
6. `signal` + `input` + `patchValue`: soddisfatto

## 7. Task 3 - Monitor dimessi (ultime 24h)

### 7.1 Requisiti richiesti

1. nuova dashboard report di sola consultazione;
2. mostrare solo pazienti dimessi ultime 24h;
3. tabella con braccialetto, dati paziente, ora dimissione;
4. ordinamento per orario dimissione.

### 7.2 Implementazione realizzata

1. creata pagina dedicata `report` con rotta `/report`;
2. caricamento dati da endpoint report dimessi;
3. filtro record su stato `DIM`;
4. ordinamento ascendente/discendente per `dataOraDimissione`;
5. gestione stati UI: loading, errore, nessun risultato;
6. integrazione con lista pazienti tramite azione "Dimetti" che aggiorna stato accesso.

### 7.3 Evidenze tecniche (file)

- `his-afp/src/app/features/report/report.ts`
- `his-afp/src/app/features/report/report.html`
- `his-afp/src/app/core/Pazienti/patient-manager.ts`
- `his-afp/src/app/ui/card-pz/card-pz.ts`
- `his-afp/src/app/pattern/tabella-pz/tabella-pz.ts`
- `backend/server.js`
- `backend/services/patients.js`

### 7.4 Copertura requisiti Task 3

1. dashboard report dedicata: soddisfatto
2. filtro dimessi: soddisfatto
3. contenuto tabella richiesto: soddisfatto
4. ordinamento temporale: soddisfatto

## 8. Scelte tecniche trasversali

### 8.1 Tipizzazione e sicurezza TypeScript

1. utilizzo di interfacce/tipi dedicati lato frontend;
2. assenza della keyword `any` nel codice applicativo delle feature coinvolte;
3. normalizzazione dati API (snake_case/camelCase) per robustezza UI.

### 8.2 UX e operativita

1. form accettazione in dialog modale;
2. feedback errore e stati intermedi espliciti;
3. semplificazione azioni operative (dimetti direttamente da lista pazienti);
4. allineamento temi e leggibilita anche in dark mode.

### 8.3 Coerenza API

1. frontend configurato su base `/api` (passaggio gateway);
2. endpoint report dimessi e cambio stato integrati in `patient-manager`;
3. gestione errori lato subscribe per evitare fallimenti silenti.

## 9. Piano test di validazione (ripetibile)

Precondizioni:

1. stack applicativo avviato;
2. accesso frontend su porta gateway ambiente desiderato.

### 9.1 Test Task 1

1. Aprire `/gestione-personale`.
2. Inserire username gia esistente.
   - atteso: errore validazione async senza submit.
3. Inserire nuovo utente valido e salvare.
   - atteso: utente visibile in tabella.
4. Modificare ruolo utente esistente.
   - atteso: ruolo aggiornato in tabella.

### 9.2 Test Task 2

1. Aprire `/accettazione-pz`.
2. Ricerca per CF esatto.
   - atteso: risultato coerente.
3. Ricerca senza CF con nome o cognome p data.
   
4. Selezionare paziente storico.
   - atteso: prefill anagrafica/residenza e blocco sezioni storiche.
5. Eseguire nuovo accesso e invio.
   - atteso: conferma operazione e chiusura form.

### 9.3 Test Task 3

1. Aprire `/lista-pz` e usare "Dimetti" su un paziente.
   - atteso: paziente rimosso dalla lista attiva.
2. Aprire `/report`.
   - atteso: paziente dimesso presente nel report (stato DIM).
3. Cambiare ordinamento data/ora.
   - atteso: inversione ordinamento tabella.
4. Usare refresh report.
   - atteso: ricarica dati senza errori.

## 10. Requisiti soddisfatti (sintesi finale)

1. Task 1: completata
2. Task 2: completata
3. Task 3: completata

Esito complessivo UF15:

1. requisiti funzionali implementati;
2. vincoli strutturali rispettati (componentizzazione, servizi, tipizzazione);
3. validazioni principali coperte da test funzionali manuali.

## 11. Limiti noti e miglioramenti proposti

1. introdurre test end-to-end automatici per regressioni cross-feature;
2. consolidare monitoraggio errori API con notifica unificata;
3. migliorare audit trail backend per operazioni sensibili;
4. estendere suite test component per scenari limite (dati incompleti, timeout API).

## 12. Tracciabilita consegna

Branch di riferimento consigliati:

1. `feature/task-1`
2. `feature/task-2`
3. `feature/task-3`

Per il form di consegna riportare, per ciascun branch, hash dell'ultimo commit e link al repository pubblico.
