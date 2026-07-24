# HIS AFP Management System

Un sistema completo per la gestione del triage e dell'accesso al pronto soccorso. Questo progetto verrà usato come base
per il l'Unità Formativa 15 (Sviluppo Frontend) e Unità Formativa 14 (Architettura Applicativa) del corso di Alta
Formazione Professionale dell'istituto G.Marconi di Rovereto.

# Panoramica del Progetto

Il sistema simula il flusso di lavoro di un Pronto Soccorso, consentendo la gestione dei pazienti dall'ammissione alla
dimissione.
Il progetto è suddiviso in due aree di competenza tecnica:

* **UF15 (Sviluppo Frontend):** Sviluppo di una SPA responsive con **Angular**.
* **UF14 (Architettura Applicativa):** Containerizzazione, orchestrazione e configurazione di rete con **Docker** e *
  *NGINX**.

# Cosa troverete già pronto nel progetto

* **Backend:** Server applicativo con **Node.js** ed **Express** per gestire le API e la logica di business.
* **Database:** Database relazionale PostgreSQL per la memorizzazione dei dati dei pazienti e delle operazioni di
  triage.

# Cosa dovrete sviluppare

* **Frontend (UF15):** Sviluppo di una Single Page Application (SPA) con **Angular** per l'interfaccia utente.
* **Containerizzazione (UF14):**
    * Creazione di Dockerfile, configurazione di Docker Compose e NGINX per il deploy dell'applicazione.
    * Impostazione del monitoraggio e logging dei container.
    * Test e documentazione del sistema.

# Struttura del Progetto

Di seguito la struttura logica del repository e il ruolo delle cartelle principali.

- `backend/`: Server applicativo JavaScript. Espone le API per triage, gestione pazienti e accesso al DB.
- `db/`: Script SQL per schema e dati di esempio `init.sql`.
- `docs/`: Documentazione aggiuntiva, diagrammi e note architetturali.

```
his-afp
├── backend
│   ├── api_request
│   │   ├── Auth.http
│   │   ├── CodiciColori.http
│   │   ├── getAdmissions.http
│   │   └── HealthCheck.http
│   ├── Dockerfile
│   ├── package.json
│   ├── package-lock.json
│   └── server.js
├── db
│   └── init.sql
├── docker-compose.yml
├── docs
│   ├── API.md
│   └── DATABASE.md
├── LICENSE
└── README.md
```

# Requisiti

- Docker e Docker Compose
- Node.js e npm (per sviluppo locale)
- Programma per accesso al DB PostgreSQL (es. pgAdmin, DBeaver)
- Programma per testare API REST (es. Postman, Insomnia)

# Utilizzo del repository

1. **Eseguire in fork del progetto su GitHub**
2. Clonare il repository: `git clone <url-del-repo>`
3. Spostarsi nella cartella del progetto: `cd his-afp`
4. Creare un nuovo branch per le modifiche: `git checkout -b uf15-2026/nome-cognome`
5. Avviare i container Docker: `docker-compose up -d --build`
6. Accedere all'applicazione passando dal Gateway (`http://localhost`, `http://localhost:8080`, `http://localhost:8999`)

# Avvio dei servizi

Per avviare i servizi, eseguire il comando:

```bash
docker-compose up -d --build
```

Questo comando costruisce e avvia i container definiti nel file `docker-compose.yml`.

Per fermare i servizi, eseguire:

```bash
docker-compose down -v
```

L'opzione `-v` rimuove anche i volumi associati, in modo da avere un ambiente pulito al successivo avvio.

Per ricompilare un singolo servizio (es. backend), eseguire:

```bash
docker-compose up -d --build --no-deps backend
```

# Accessi

- **Gateway (Produzione):** `http://localhost`
- **Gateway (Test):** `http://localhost:8080`
- **Gateway (Sviluppo):** `http://localhost:8999`
- **Tunnel Database via Gateway:** `localhost:5432` (user: `sio_user`, password: `sio_password`, database: `sio_db`)

Nota: per vincolo UF14 l'unico container che espone porte verso host e il Gateway. Backend e Database non sono
raggiungibili direttamente dall'host.

# Test delle API

Per testare le API sono disponibili le collection Postman nella cartella `postman/collection`.

> Le collection sono suddivise in base ai capitoli della documentazione relativa alle API, presente nel file
`docs/API.md`.

# Documentazione

Allinterno della cartella `docs/` sono presenti documenti dettagliati riguardanti:

- Documentazione delle API: [docs/API.md](docs/API.md)
- Struttura del Database: [docs/DATABASE.md](docs/DATABASE.md)
- Migrazione architetturale UF14: [docs/UF14-MIGRAZIONE.md](docs/UF14-MIGRAZIONE.md)

# Contribuire

- Aprire issue per bug o feature
- Creare branch per la feature: `git checkout -b feat/nome-feature`
- Inviare pull request con descrizione e test

# Licenza

Questo progetto è concesso in licenza sotto la Licenza MIT - vedere il file [LICENSE](LICENSE) per i dettagli.
