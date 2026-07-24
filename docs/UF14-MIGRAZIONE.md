# UF14 - Migrazione architetturale HIS-AFP

## Obiettivo

Questa relazione descrive la migrazione infrastrutturale richiesta da UF14 Task 1:
- separazione in architettura multi-tier
- isolamento dei frontend dal database
- gateway come unico punto di ingresso

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
- instrada `/api` verso `backend`

Misure applicate:
- rimozione esposizione porta DB verso host (niente mapping `5432:5432`)
- nessuna porta esposta da frontend, backend, database
- porte esposte solo dal gateway (`80`, `8080`, `8999`)

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
- `README.md`
- `docs/UF14-MIGRAZIONE.md`
