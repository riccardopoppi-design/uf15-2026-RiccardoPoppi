# 📘 SIO Backend - API Reference Manual

- **Versione:** 1.0.2
- **Base URL:** `http://localhost:3000`
- **Protocollo:** HTTP/1.1 REST
- **Encoding:** JSON (`application/json`)

---

## 1. Standard di Comunicazione

Tutte le interazioni con l'API seguono standard di formattazione per garantire prevedibilità e robustezza lato client.

### 1.1 Envelope della Risposta (JSend Pattern)

Ogni risposta HTTP (sia successo che errore) è avvolta in un oggetto standard. Il Frontend non deve **mai** aspettarsi
un array o un dato grezzo alla radice del JSON.

**Struttura Base:**

```json
{
  "status": "success | fail | error",
  "data": {
    ...
  },
  // Payload della risposta (oggetto o null)
  "results": 5,
  // Opzionale: numero di elementi (solo per liste)
  "message": "...",
  // Opzionale: descrizione errore o conferma
  "code": 404
  // Opzionale: codice errore esplicito
}
```

### 1.2 Gestione degli Errori

Gli errori sono gestiti centralmente e restituiscono sempre un JSON strutturato.

* **`fail` (4xx):** Errori imputabili al client (validazione, dati mancanti, risorse non trovate).
* **`error` (5xx):** Errori interni del server (database offline, eccezioni non gestite).

**Esempio di Errore:**

```json
{
  "status": "fail",
  "code": 404,
  "message": "Accesso non trovato con ID specificato"
}

```

### 1.3 Naming Convention

* **JSON Response:** `camelCase` (es. `codiceFiscale`, `dataNascita`).
* **Query Parameters:** `camelCase`.
* **Date:** Formato [ISO 8601](https://www.iso.org/iso-8601-date-and-time-format.html) UTC (es.
  `2024-01-22T14:30:00.000Z`).

---

## 2. Autenticazione

L'autenticazione è gestita tramite **JWT (JSON Web Token)**.
> Il token ha una validità di **1 ora**.

**Header Richiesto (per rotte protette):**
`Authorization: Bearer <tuo_token_jwt>`

### 🔐 Login

Ottiene il token di sessione.

* **Endpoint:** `POST /auth/login`
* **Sicurezza:** Pubblica
* **Ruoli Utente:**

| Username         | Password |
|------------------|----------|
| `medico`         | 1234     |
| `infermiere`     | 1234     |
| `amministrativo` | 1234     |

**Request Body:**

```json
{
  "username": "medico",
  "password": "1234"
}
```

**Response (200 OK):**

```json
{
  "status": "success",
  "data": {
    "token": "eyJhbGciOiJIUzI1...",
    "user": {
      "username": "medico",
      "role": "DOC"
    }
  }
}
```

**Errori:**

* `401 Unauthorized` se le credenziali sono errate.

```json
{
  "status": "fail",
  "code": 401,
  "message": "Credenziali non valide"
}
```

---

## 3. Risorse (Dizionari)

Endpoint per popolare i menu a tendina (Select/Dropdown) nel Frontend.

### 🎨 3.1 Elenco Colori Triage

Recupera la configurazione dei codici colore, ordinati per priorità.

* **Endpoint:** `GET /resources/triage-colors`
* **Response (200 OK):**

```json
{
  "status": "success",
  "results": 5,
  "data": [
    {
      "code": "ROSSO",
      "displayName": "Emergenza",
      "priority": 1,
      "hexValue": "#FF4E4A"
    },
    {
      "code": "ARANCIONE",
      "displayName": "Urgenza",
      "priority": 2,
      "hexValue": "#FF8C42"
    }
    // ...
  ]
}
```

**Tabella Dati (Contenuto DB):**

| Code (PK)   | Display Name        | Priority | Hex Value |
|-------------|---------------------|----------|-----------|
| `ROSSO`     | Emergenza           | 1        | `#FF4E4A` |
| `ARANCIONE` | Urgenza             | 2        | `#FF8C42` |
| `AZZURRO`   | Urgenza Differibile | 3        | `#42A5F5` |
| `VERDE`     | Urgenza Minore      | 4        | `#66BB6A` |
| `BIANCO`    | Non Urgenza         | 5        | `#BDBDBD` |

### 🩺 3.2 Elenco Patologie

Recupera il dizionario delle patologie disponibili.

* **Endpoint:** `GET /resources/pathologies`
* **Response (200 OK):**

```json
{
  "status": "success",
  "results": 6,
  "data": [
    {
      "code": "C01",
      "description": "Traumatica"
    },
    {
      "code": "C02",
      "description": "Cardiocircolatoria"
    }
    // ...
  ]
}
```

**Tabella Dati (Contenuto DB):**

| Code (PK) | Description        |
|-----------|--------------------|
| `C01`     | Traumatica         |
| `C02`     | Cardiocircolatoria |
| `C03`     | Respiratoria       |
| `C04`     | Neurologica        |
| `C05`     | Psichiatrica       |
| `C19`     | Altra Patologia    |

### 🚑 3.3 Elenco Modalità Arrivo

Recupera le modalità di arrivo ammesse.

* **Endpoint:** `GET /resources/arrival-modes`
* **Response (200 OK):**

```json
{
  "status": "success",
  "results": 4,
  "data": [
    {
      "code": "AMB",
      "description": "Ambulanza 118"
    },
    {
      "code": "AUT",
      "description": "Autonomo"
    }
    // ...
  ]
}
```

**Tabella Dati (Contenuto DB):**

| Code (PK) | Description   |
|-----------|---------------|
| `AUT`     | Autonomo      |
| `AMB`     | Ambulanza 118 |
| `ELI`     | Elisoccorso   |

---

## 4. Gestione Accessi (Admissions)

Core business logic dell'applicazione. Gestisce il flusso dei pazienti.

### 📋 4.1 Lista Accessi Attivi

Recupera tutti i pazienti in carico (Stato ≠ `DIM` e ≠ `RIC`).
I dati sono appiattiti (flattened) per facilitare la visualizzazione in tabella.

* **Endpoint:** `GET /admissions`
* **Response (200 OK):**

```json
{
  "status": "success",
  "results": 1,
  "data": [
    {
      "id": 12,
      "braccialetto": "2024-0045",
      "dataOraIngresso": "2024-01-22T09:15:00.000Z",
      "stato": "ATT",
      "noteTriage": "Dolore toracico diffuso",
      "nome": "Mario",
      "cognome": "Rossi",
      "dataNascita": "1980-05-20",
      "codiceFiscale": "RSSMRA80E20H501U",
      "sex": "M",
      "patologiaCode": "C02",
      "patologiaDescrizione": "Cardiocircolatoria",
      "coloreCode": "ROSSO",
      "coloreHex": "#FF4E4A",
      "coloreNome": "Emergenza",
      "modalitaArrivoCode": "AMB",
      "modalitaArrivoDescrizione": "Ambulanza 118"
    }
  ]
}
```

### ➕ 4.2 Dettaglio Accesso (Triage)

Recupera il singolo accesso per ID.

* **Endpoint:** `GET /admissions/:id`
* **Response (200 OK):**

```json
{
  "status": "success",
  "data": {
    "id": 12,
    "braccialetto": "2024-0045",
    "dataOraIngresso": "2024-01-22T09:15:00.000Z",
    "stato": "ATT",
    "noteTriage": "Dolore toracico diffuso",
    "nome": "Mario",
    "cognome": "Rossi",
    "dataNascita": "1980-05-20",
    "codiceFiscale": "RSSMRA80E20H501U",
    "sex": "M",
    "patologiaCode": "C02",
    "patologiaDescrizione": "Cardiocircolatoria",
    "coloreCode": "ROSSO",
    "coloreHex": "#FF4E4A",
    "coloreNome": "Emergenza",
    "modalitaArrivoCode": "AMB",
    "modalitaArrivoDescrizione": "Ambulanza 118"
  }
}
```

* **Errori:** `404 Not Found` se l'ID non esiste.

```json
{
  "status": "fail",
  "code": 404,
  "message": "Accesso non trovato con questo ID"
}
```

### ➕ 4.3 Nuovo Accesso (Triage)

Registra un nuovo paziente e crea un accesso.
Se il paziente esiste già (check su Codice Fiscale), aggiorna i dati anagrafici.

* **Endpoint:** `POST /admissions`
* **Vincoli:** I campi `...Code` devono corrispondere a codici esistenti nei dizionari (Resources).

**Request Body:**

```json
{
  "nome": "Luigi",
  "cognome": "Verdi",
  "dataNascita": "1990-01-01",
  "codiceFiscale": "VRDLGU90A01H501K",
  "sex": "M",
  "patologiaCode": "C01",
  // Deve esistere in /resources/pathologies
  "codiceColore": "AZZURRO",
  // Deve esistere in /resources/triage-colors
  "modalitaArrivoCode": "AUT",
  // Deve esistere in /resources/arrival-modes
  "noteTriage": "Trauma lieve alla caviglia"
}
```

**Response (201 Created):**

```json
{
  "status": "success",
  "message": "Accesso creato con successo",
  "data": {
    "id": 45,
    "braccialetto": "2024-0046"
  }
}
```

* **Errori:**
    * `400 Bad Request` se mancano campi obbligatori o se i codici non corrispondono ai dizionari.

```json
{
  "status": "fail",
  "code": 400,
  "message": "Dati anagrafici incompleti"
}
```

### 🔄 4.4 Cambio Stato

Aggiorna lo stato di avanzamento del paziente.

* **Endpoint:** `PATCH /admissions/:id/status`
* **Stati Ammessi (Enum):**
    * `ATT` (Attesa)
    * `VIS` (Visita)
    * `OBI` (Osservazione Breve)
    * `RIC` (Ricovero - Esce dalla lista)
    * `DIM` (Dimissione - Esce dalla lista)

**Request Body:**

```json
{
  "nuovoStato": "VIS"
}
```

**Response (200 OK):**

```json
{
  "status": "success",
  "message": "Stato aggiornato con successo",
  "data": {
    "id": 12,
    "stato": "VIS"
  }
}
```

**Errori:**

* `400 Bad Request` se lo stato non è valido.

```json
{
  "status": "fail",
  "code": 400,
  "message": "Stato non valido. Ammessi: ATT, VIS, OBI, RIC, DIM"
}
```

* `404 Not Found` se l'ID non esiste.

```json
{
  "status": "fail",
  "code": 404,
  "message": "Ammissione non trovata"
}
```

## 5. Gestione personale sanitario (Utenti)

Gestione anagrafica operatori e validazione asincrona.

### 5.1 Lista Operatori Sanitari

Recupera la lista di tutto lo staff attivo e disabilitato.

* **Endpoint:** `GET /users`

* **Risposta (200):**

```json
{
  "status": "success",
  "results": 12,
  "data": [
    {
      "id": 1,
      "username": "mrossi",
      "role": "DOC",
      "isActive": true
    },
    {
      "id": 2,
      "username": "bbianchi",
      "role": "INF",
      "isActive": true
    }
  ]
}
```

### 5.2 Verifica Disponibilità Username

Verifica se uno username è già utilizzato.

* **Endpoint**: `GET /users/check/:username`
    * **Parametro**: `username` (Nome Utente da verificare)

**Risposta (200):**

```json
{
  "status": "success",
  "data": {
    "available": true
  }
}
```

| available | Significato                                   |
|-----------|-----------------------------------------------|
| `true`    | Nome utente disponibile per essere utilizzato |
| `false`   | Nome utente non utilizzabile                  |

### 5.3 Creazione e Gestione Utenti

Crea un nuovo operatore sanitario.
> L'operatore viene creato con `isActive: true` di default. Per disattivarlo, utilizzare l'endpoint di disattivazione.

* **Endpoint**: `POST /users`

**Body:**

```json
{
  "username": "mario.rossi",
  "password": "1234",
  "role": "DOC"
}
```

* **Risposta (201):**

```json
{
  "status": "success",
  "data": {
    "id": 4,
    "username": "mario.rossi",
    "role": "DOC"
  }
}
```

Ruoli disponibili:

| Role  | Descrizione    |
|-------|----------------|
| `DOC` | Medico         |
| `INF` | Infermiere     |
| `AMM` | Amministrativo |

### 5.4 Disattivazione Utente

Disattivazione logica di un utente.
Viene impostato il campo `isActive` a `false` senza eliminare fisicamente il record.

* **Endpoint:** `PATCH /users/:id/deactivate`
    * **Parametro:** `id` (ID dell'utente da disattivare)

* **Risposta (200):**

```json
{
  "status": "success",
  "message": "Operatore disattivato correttamente"
}
```

* **Errori:**
    * `404 Not Found` se l'ID non esiste.

```json
{
  "status": "fail",
  "code": 404,
  "message": "Operatore non trovato"
}
```

### 5.5 Abilitazione Utente

Riattivazione di un utente disattivato.
Viene impostato il campo `isActive` a `true`.

* **Endpoint:** `PATCH /users/:id/activate`
    * **Parametro:** `id` (ID dell'utente da attivare)

* **Risposta (200):**

```json
{
  "status": "success",
  "message": "Operatore attivato correttamente"
}
```

* **Errori:**
    * `404 Not Found` se l'ID non esiste.

```json
{
  "status": "fail",
  "code": 404,
  "message": "Operatore non trovato"
}
```

### 5.5 Cambio ruolo utente

Cambia il ruolo di un operatore sanitario.

* **Endpoint:** `PATCH /users/:id/editrole`
* **Parametro:** `id` (ID dell'utente da modificare)
* **Body:**

```json
{
  "role": "INF"
}
```

* **Risposta (200):**

```json
{
  "status": "success",
  "data": {
    "id": 4,
    "username": "mario.rossi",
    "role": "INF"
  }
}
```

> Se il ruolo è uguale a quello attuale, la risposta sarà comunque `200 OK` senza modifiche.

---

## 6. Osservabilità & System

* **Health Check:** `GET /health`
* Restituisce lo stato del servizio e la connessione DB.

### **Response (200 OK):**

Caso in cui il servizio è operativo e il database è connesso.

```json
{
  "status": "success",
  "data": {
    "service": "UP",
    "database": "CONNECTED",
    "uptime": 719.583665512
  }
}
```

Caso in cui il database è offline o non raggiungibile.

```json
{
  "status": "success",
  "data": {
    "service": "UP",
    "database": "DISCONNECTED",
    "uptime": 719.583665512
  }
}
```

> Se non si ottiene nessuna risposta o si riceve un errore di timeout, è probabile che il server non sia avviato o che
> ci siano problemi di rete.

* **Metriche:** `GET /metrics`
* Espone metriche in formato Prometheus per scraping (Errori, Tempi di risposta).

---

## 7. Frontend Integration (Angular)

Copiare le seguenti interfacce nel progetto Angular (percorso suggerito: `src/app/core/models`).

### `api-response.interface.ts`

```typescript
export interface ApiResponse<T = any> {
    status: 'success' | 'fail' | 'error';
    data?: T;
    results?: number;
    code?: number;
    message?: string;
}
```

### `enums.ts`

```typescript
export type AdmissionStatus = 'ATT' | 'VIS' | 'OBI' | 'RIC' | 'DIM';
export type UserRole = 'DOC' | 'INF' | 'AMM';

export const AdmissionStatusLabel: Record<AdmissionStatus, string> = {
    ATT: 'In Attesa',
    VIS: 'In Visita',
    OBI: 'Osservazione',
    RIC: 'Ricoverato',
    DIM: 'Dimesso'
};
```

### `resources.interfaces.ts`

```typescript
export interface TriageColor {
    code: string;
    displayName: string;
    priority: number;
    hexValue: string;
}

export interface Pathology {
    code: string;
    description: string;
}

export interface ArrivalMode {
    code: string;
    description: string;
}
```

### `admission.interface.ts`

```typescript
import {AdmissionStatus} from './enums';

// Modello di LETTURA (usato nelle tabelle e dettagli)
export interface Admission {
    id: number;
    braccialetto: string;
    dataOraIngresso: string; // ISO String
    stato: AdmissionStatus;
    noteTriage: string | null;

    // Dati Anagrafici
    nome: string;
    cognome: string;
    dataNascita: string;
    codiceFiscale: string;

    // Dati Clinici (Flattened)
    patologiaCode: string;
    patologiaDescrizione: string;
    coloreCode: string;
    coloreHex: string;
    coloreNome: string;
    modalitaArrivoCode: string;
    modalitaArrivoDescrizione: string;
}

// Modello di SCRITTURA (usato nei form)
export interface CreateAdmissionRequest {
    nome: string;
    cognome: string;
    dataNascita: string;
    codiceFiscale: string;

    patologiaCode: string;
    codiceColore: string;
    modalitaArrivoCode: string;
    noteTriage?: string;
}
```
