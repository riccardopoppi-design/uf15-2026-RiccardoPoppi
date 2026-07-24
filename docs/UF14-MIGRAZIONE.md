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

Nel file `gateway/default.conf` e stato introdotto un upstream chiamato `backend_api`.

Default:

```nginx
upstream backend_api {
	server sio-backend-blue:3000;
	# server sio-backend-green:3000;
}
```

Tutte le location `/api/` dei tre ambienti puntano a:

```nginx
proxy_pass http://backend_api;
```

### Procedura di switch Blue -> Green

1. Avviare entrambe le istanze backend:

```bash
docker compose up -d --build backend-blue backend-green gateway
```

2. Modificare l'upstream in `gateway/default.conf` sostituendo:

```nginx
server sio-backend-blue:3000;
```

con:

```nginx
server sio-backend-green:3000;
```

3. Ricaricare il gateway senza down completo:

```bash
docker compose restart gateway
```

### Procedura di rollback Green -> Blue

Rollback istantaneo:
1. ripristinare `server sio-backend-blue:3000;` nell'upstream
2. `docker compose restart gateway`

Il frontend continua a funzionare perche l'endpoint esterno non cambia: cambia solo il target interno del proxy.

### Riflessione sul dato condiviso

Se la versione Green scrive dati nel DB e poi facciamo rollback a Blue:
- il dato rimane nel database, perche il DB e condiviso
- il rollback cambia solo chi serve le richieste API, non annulla transazioni gia commitate
- servono quindi compatibilita schema/migrazione e strategie di rollback applicativo (feature flag, migrazioni backward-compatible)

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
- `README.md`
- `docs/UF14-MIGRAZIONE.md`
