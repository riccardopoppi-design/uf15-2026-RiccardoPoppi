# UF14 - Migrazione architetturale HIS-AFP

## Obiettivo

Questa relazione descrive la migrazione infrastrutturale richiesta da UF14:
- separazione in architettura multi-tier
- isolamento dei frontend dal database
- gateway come unico punto di ingresso
- gestione opzionale Blue/Green per il backend API

## Architettura prima della migrazione

Caratteristiche principali:
- rete piatta implicita (tutti i servizi nello stesso dominio di rete)
- database esposto verso host sulla porta 5432
- comunicazione tra container senza segmentazione per livello

Rischio principale:
- un frontend compromesso poteva risolvere e raggiungere servizi interni sensibili (incluso DB).

## Architettura dopo la migrazione

Sono state create due reti Docker dedicate:
- `frontend-net`: solo `fe-prod`, `fe-test`, `fe-sio`
- `backend-net`: solo `backend`, `db`

Il `gateway` e l'unico servizio ponte presente su entrambe le reti:
- riceve traffico dall'host
- instrada il frontend verso i container FE
- instrada `/api` verso i backend API

Misure applicate:
- rimozione esposizione porta DB verso host (niente mapping `5432:5432`)
- nessuna porta esposta da frontend, backend, database
- porte esposte solo dal gateway (`80`, `8080`, `8999`)

## Task 2 opzionale - Blue/Green API

### Configurazione

Nel file `docker-compose.yml` sono state definite due istanze backend:
- `backend-blue` (`sio-backend-blue`)
- `backend-green` (`sio-backend-green`)

Entrambe usano lo stesso database `db` sulla rete `backend-net`.

Nel file `gateway/default.conf` il proxy API e configurato in modo dinamico:
- default su Blue
- override su Green con header `X-Backend-Target: green` (utile per test/canary)

Tutte le location `/api/` dei tre ambienti puntano a:

```nginx
proxy_pass $backend_api;
```

### Procedura di switch Blue -> Green

1. Avviare entrambe le istanze backend:

```bash
docker compose up -d --build backend-blue backend-green gateway
```

2. Testare Green senza impattare tutti gli utenti (canary):

```bash
curl -s -H "X-Backend-Target: green" http://localhost:8999/api/health
```

3. Se i test sono OK, fare switch globale aggiornando il mapping `default` in `gateway/default.conf`
da Blue a Green e ricaricare NGINX senza restart del container:

```bash
docker compose exec gateway nginx -s reload
```

### Procedura di rollback Green -> Blue

Rollback istantaneo:
1. ripristinare Blue come `default` nel mapping
2. `docker compose exec gateway nginx -s reload`

Il frontend continua a funzionare perche l'endpoint esterno non cambia: cambia solo il target interno del proxy.

### Riflessione sul dato condiviso

Se la versione Green scrive dati nel DB e poi facciamo rollback a Blue:
- il dato rimane nel database, perche il DB e condiviso
- il rollback cambia solo chi serve le richieste API, non annulla transazioni gia commitate
- servono quindi compatibilita schema/migrazione e strategie di rollback applicativo (feature flag, migrazioni backward-compatible)

## Task 3 opzionale - Zero-Downtime Backend & Database Migration

### Obiettivo

Garantire aggiornamento backend senza interrompere il servizio API e senza rompere la compatibilita del database tra
versione Blue e Green.

### Architettura operativa

1. due backend attivi contemporaneamente (`sio-backend-blue` e `sio-backend-green`)
2. gateway come punto unico di instradamento API
3. database unico condiviso da entrambe le versioni

### Routing zero-downtime

Approccio adottato:
1. Blue resta default per tutti gli utenti
2. Green viene verificato tramite header dedicato (`X-Backend-Target: green`)
3. switch globale con reload NGINX (`nginx -s reload`), evitando restart del container
4. rollback immediato ripristinando default Blue e reload NGINX

In questo modo il frontend non cambia URL e il passaggio e trasparente.

### Dilemma Database: strategia consigliata

Per non rompere Blue mentre Green introduce cambi schema, usare migrazioni additive (`expand -> migrate -> contract`):

1. **Expand (compatibile)**
	- aggiungere nuove colonne come nullable o con default
	- non rimuovere/rinominare colonne usate da Blue

2. **Migrate (doppia compatibilita)**
	- Green legge/scrive il nuovo campo
	- Blue continua a funzionare sui campi vecchi
	- eventuale backfill dati per popolare nuove colonne

3. **Contract (post-cutover stabile)**
	- solo dopo switch definitivo e verifica, rimuovere il vecchio schema

Esempio pratico:
- richiesta Green: nuova colonna obbligatoria `source_system`
- rollout sicuro:
  - `ALTER TABLE ... ADD COLUMN source_system TEXT NULL;`
  - Green inizia a valorizzarla
  - backfill su record storici
  - quando Blue non serve piu: `ALTER TABLE ... ALTER COLUMN source_system SET NOT NULL;`

### Impatto frontend e sessioni JWT

- Il frontend non richiede reload obbligatorio durante switch Blue/Green se i contratti API restano compatibili.
- Le sessioni JWT restano valide durante il passaggio se Blue e Green condividono stesso `JWT_SECRET` e stessa logica
  di validazione.
- Se cambia il formato delle claim JWT, serve fase di transizione backward-compatible.

### Orchestrazione Docker e conflitti di porta

- Nessun conflitto: backend Blue e Green non espongono porte host, usano solo rete interna Docker.
- Entrambi parlano con lo stesso DB su `backend-net`.
- Unica esposizione esterna resta il gateway.

### Guida test Task 3

1. Avviare stack:

```bash
docker compose up -d --build
```

2. Verificare default Blue:

```bash
curl -s http://localhost:8999/api/health
```

3. Verificare canary Green:

```bash
curl -s -H "X-Backend-Target: green" http://localhost:8999/api/health
```

4. Simulare switch globale:
	- impostare Green come default nel mapping `backend_api`
	- `docker compose exec gateway nginx -s reload`

5. Simulare rollback:
	- ripristinare Blue come default
	- `docker compose exec gateway nginx -s reload`

## Task 4 opzionale - Tunnel Database via Gateway

### Obiettivo

Consentire al team Data Analysis di collegarsi a PostgreSQL senza esporre direttamente la porta del container `db`.
Il gateway diventa l'unico punto di accesso TCP anche per il traffico database.

### Scelta tecnica: modulo stream NGINX

Il protocollo PostgreSQL non e HTTP, quindi non puo essere configurato nei blocchi `server` del contesto `http`.
Per questo e stato usato il contesto `stream` di NGINX.

Configurazione applicata:
1. Nuovo file principale `gateway/nginx.conf` con inclusione di:
	- `http { include /etc/nginx/conf.d/*.conf; }`
	- `stream { include /etc/nginx/stream.d/*.conf; }`
2. Nuovo file `gateway/stream.conf` con tunnel TCP:

```nginx
server {
	 listen 5432;
	 proxy_pass db:5432;
}
```

3. Nel `docker-compose.yml`:
	- la porta `5432` e pubblicata solo dal servizio `gateway`
	- il servizio `db` resta senza mapping `ports`

### Implicazioni di sicurezza

- Il DB non e esposto direttamente all'host.
- Se si deve interrompere l'accesso analyst, basta rimuovere/disabilitare la regola stream sul gateway.
- Accesso e auditing centralizzati sui log stream NGINX.

### Guida test Task 4

1. Riavviare i servizi per applicare la nuova config gateway:

```bash
docker compose up -d --build gateway
```

2. Verificare che solo il gateway esponga la porta 5432 verso host:

```bash
docker ps --format "table {{.Names}}\t{{.Ports}}"
```

Atteso:
- `sio-gateway` espone `0.0.0.0:5432->5432/tcp`
- `sio-postgres` mostra solo `5432/tcp` interno (non pubblicato)

3. Verificare sintassi NGINX:

```bash
docker compose exec gateway nginx -t
```

4. Test connessione DB tramite gateway (esempio con psql):

```bash
psql -h localhost -p 5432 -U sio_user -d sio_db
```

5. Verificare log tunnel nel gateway:

```bash
docker compose exec gateway sh -c "tail -n 50 /var/log/nginx/stream-access.log"
```

## Motivazione della migrazione

Perche eseguirla:
- riduce la superficie di attacco
- separa chiaramente zona pubblica (frontend) e zona protetta (backend+db)
- soddisfa il vincolo di audit: il database non deve essere visibile dai frontend

## Validazione tecnica

### 1) Avvio stack

```bash
docker compose down -v
docker compose up -d --build
```

### 2) Verifica porte esposte (solo gateway)

```bash
docker ps --format "table {{.Names}}\t{{.Ports}}"
```

Risultato atteso:
- `sio-gateway` con porte pubblicate
- `sio-backend`, `sio-postgres`, `sio-fe-*` senza porte pubblicate verso host

### 3) Verifica isolamento DNS da frontend verso DB

Comando richiesto dalla consegna:

```bash
docker exec -it sio-fe-prod getent hosts db
```

Risultato atteso:
- nessun output o errore di risoluzione (il nome `db` non esiste in `frontend-net`)

Controllo equivalente con ping:

```bash
docker exec -it sio-fe-prod ping -c 1 db
```

Risultato atteso:
- fallimento risoluzione nome host `db`

### 4) Verifica raggiungibilita API tramite gateway

```bash
curl -s http://localhost:8999/api/health
```

Risultato atteso:
- risposta JSON valida dal backend, transitando unicamente dal gateway

## Limiti osservati e possibili evoluzioni

Possibili miglioramenti futuri:
1. orchestrazione con Kubernetes (namespace, network policies, secret management)
2. ingress controller dedicato (es. Traefik o NGINX Ingress) con TLS centralizzato
3. policy di sicurezza runtime (read-only FS, utenti non-root, capability drop)
4. feature flags dinamici lato frontend/backend invece di sola iniezione a startup

## File modificati per la migrazione

- `docker-compose.yml`
- `gateway/default.conf`
- `gateway/nginx.conf`
- `gateway/stream.conf`
- `README.md`
- `docs/UF14-MIGRAZIONE.md`
