CREATE SCHEMA IF NOT EXISTS sio;
SET search_path TO sio;

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 1. Creazione Tipi Enumerati
DO
$$
    BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
            CREATE TYPE user_role AS ENUM ('DOC', 'INF', 'AMM');
        END IF;
    END
$$;

DO
$$
    BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'admission_status') THEN
            CREATE TYPE admission_status AS ENUM ('ATT', 'VIS', 'OBI', 'RIC', 'DIM');
        END IF;
    END
$$;

DO
$$
    BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'patient_sex') THEN
            CREATE TYPE patient_sex AS ENUM ('M', 'F');
        END IF;
    END
$$;

-- 2. Tabelle di Lookup (Dizionari)

-- A. Colori Triage
CREATE TABLE IF NOT EXISTS triage_colors
(
    code         VARCHAR(20) PRIMARY KEY,
    display_name VARCHAR(50) NOT NULL,
    priority     INTEGER     NOT NULL,
    hex_value    VARCHAR(7)  NOT NULL,
    created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- B. Patologie (Nuova)
CREATE TABLE IF NOT EXISTS pathologies
(
    code        VARCHAR(10) PRIMARY KEY, -- es. 'C01'
    description VARCHAR(100) NOT NULL,   -- es. 'Traumatica'
    created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- C. Modalità Arrivo (Nuova)
CREATE TABLE IF NOT EXISTS arrival_modes
(
    code        VARCHAR(10) PRIMARY KEY, -- es. 'AMB'
    description VARCHAR(50) NOT NULL,    -- es. 'Ambulanza 118'
    created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3. Utenti e Pazienti
CREATE TABLE IF NOT EXISTS users
(
    id         SERIAL PRIMARY KEY,
    username   VARCHAR(50) UNIQUE NOT NULL,
    password   VARCHAR(255)       NOT NULL,
    role       user_role          NOT NULL,
    created_at TIMESTAMP                   DEFAULT CURRENT_TIMESTAMP,
    is_active  BOOLEAN            NOT NULL DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS patients
(
    id               SERIAL PRIMARY KEY,
    codice_fiscale   VARCHAR(16) UNIQUE NOT NULL,
    nome             VARCHAR(100)       NOT NULL,
    cognome          VARCHAR(100)       NOT NULL,
    data_nascita     DATE               NOT NULL,
    sex              patient_sex        NOT NULL DEFAULT 'M',
    indirizzo_via    VARCHAR(255),
    indirizzo_civico VARCHAR(20),
    comune           VARCHAR(100),
    provincia        VARCHAR(5),
    created_at       TIMESTAMP                   DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_patients_cf ON patients (codice_fiscale);

-- 4. Tabella Accessi (Admissions)
CREATE TABLE IF NOT EXISTS admissions
(
    id                   SERIAL PRIMARY KEY,
    patient_id           INTEGER REFERENCES patients (id) ON DELETE RESTRICT,
    braccialetto         VARCHAR(20) UNIQUE NOT NULL,
    data_ora_ingresso    TIMESTAMP                   DEFAULT CURRENT_TIMESTAMP,
    stato                admission_status   NOT NULL DEFAULT 'ATT',

    -- Foreign Keys aggiornate
    patologia_code       VARCHAR(10) REFERENCES pathologies (code) ON DELETE RESTRICT,
    codice_colore        VARCHAR(20)        REFERENCES triage_colors (code) ON DELETE SET NULL,
    modalita_arrivo_code VARCHAR(10) REFERENCES arrival_modes (code) ON DELETE RESTRICT,

    note_triage          TEXT,
    updated_at           TIMESTAMP                   DEFAULT CURRENT_TIMESTAMP,
    data_ora_dimissione  TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_admissions_braccialetto ON admissions (braccialetto);

-- --- SEEDING ---

-- Colori
INSERT INTO triage_colors (code, display_name, priority, hex_value)
VALUES ('ROSSO', 'Emergenza', 1, '#FF4E4A'),
       ('ARANCIONE', 'Urgenza Indifferibile', 2, '#FFB053'),
       ('AZZURRO', 'Urgenza Differibile', 3, '#61AFEF'),
       ('VERDE', 'Urgenza Minore', 4, '#A5ED72'),
       ('BIANCO', 'Non Urgente', 5, '#DCDFE4')
ON CONFLICT (code) DO UPDATE SET hex_value = EXCLUDED.hex_value;

-- Patologie (Esempi base)
INSERT INTO pathologies (code, description)
VALUES ('C01', 'Traumatica'),
       ('C02', 'Cardiocircolatoria'),
       ('C03', 'Respiratoria'),
       ('C04', 'Neurologica'),
       ('C05', 'Psichiatrica'),
       ('C19', 'Altra Patologia')
ON CONFLICT (code) DO NOTHING;

-- Modalità Arrivo
INSERT INTO arrival_modes (code, description)
VALUES ('AUT', 'Autonomo'),
       ('AMB', 'Ambulanza 118'),
       ('ELI', 'Elisoccorso')
ON CONFLICT (code) DO NOTHING;

-- Utenti
INSERT INTO users (username, password, role)
VALUES ('utente1', crypt('1234', gen_salt('bf', 10)), 'DOC'),
       ('utente2', crypt('1234', gen_salt('bf', 10)), 'INF'),
       ('utente3', crypt('1234', gen_salt('bf', 10)), 'AMM')
ON CONFLICT (username) DO NOTHING;

-- Paziente Demo
INSERT INTO patients (nome, cognome, data_nascita, sex, codice_fiscale, indirizzo_via, indirizzo_civico, comune,
                      provincia)
VALUES ('Mario', 'Rossi', '1980-05-20', 'M', 'RSSMRA80E20H501U', 'Via Roma', '10', 'Milano', 'MI')
ON CONFLICT (codice_fiscale) DO NOTHING;

INSERT INTO patients (nome, cognome, data_nascita, sex, codice_fiscale, indirizzo_via, indirizzo_civico, comune,
                      provincia)
VALUES ('Luigi', 'Verdi', '1970-12-20', 'M', 'LUGVRDA70F234KK3', 'Via Molinari', '23', 'Trento', 'TN')
ON CONFLICT (codice_fiscale) DO NOTHING;

INSERT INTO patients (nome, cognome, data_nascita, sex, codice_fiscale, indirizzo_via, indirizzo_civico, comune,
                      provincia)
VALUES ('Anna', 'Bianchi', '1990-03-15', 'F', 'BNCNNA90C55H501A', 'Via Garibaldi', '5', 'Roma', 'RM')
ON CONFLICT (codice_fiscale) DO NOTHING;

INSERT INTO patients (nome, cognome, data_nascita, sex, codice_fiscale, indirizzo_via, indirizzo_civico, comune,
                      provincia)
VALUES ('Giovanni', 'Neri', '1955-11-30', 'M', 'NREGNN55S30F205Z', 'Corso Umberto', '12', 'Napoli', 'NA')
ON CONFLICT (codice_fiscale) DO NOTHING;

INSERT INTO patients (nome, cognome, data_nascita, sex, codice_fiscale, indirizzo_via, indirizzo_civico, comune,
                      provincia)
VALUES ('Francesca', 'Romani', '1985-07-22', 'F', 'RMNFNC85L62L219K', 'Via Po', '45', 'Torino', 'TO')
ON CONFLICT (codice_fiscale) DO NOTHING;

INSERT INTO patients (nome, cognome, data_nascita, sex, codice_fiscale, indirizzo_via, indirizzo_civico, comune,
                      provincia)
VALUES ('Marco', 'Esposito', '2000-01-10', 'M', 'SPSMRC00A10F839V', 'Piazza Trieste', '8', 'Venezia', 'VE')
ON CONFLICT (codice_fiscale) DO NOTHING;

INSERT INTO patients (nome, cognome, data_nascita, sex, codice_fiscale, indirizzo_via, indirizzo_civico, comune,
                      provincia)
VALUES ('Elena', 'Ferrari', '1975-09-05', 'F', 'FRRLNE75P45D612J', 'Viale dei Pini', '33', 'Firenze', 'FI')
ON CONFLICT (codice_fiscale) DO NOTHING;

-- Accesso Demo
INSERT INTO admissions (patient_id, braccialetto, stato, patologia_code, codice_colore, modalita_arrivo_code,
                        note_triage)
SELECT id,
       TO_CHAR(CURRENT_DATE, 'YYYY') || '-0001',
       'ATT',
       'C02',
       'ROSSO',
       'AMB',
       'Difficoltà respiratoria con dolore mandibolare irradiato all''arto sup. sx. di 9'
FROM patients
WHERE codice_fiscale = 'RSSMRA80E20H501U'
ON CONFLICT (braccialetto) DO NOTHING;

INSERT INTO admissions (patient_id, braccialetto, stato, patologia_code, codice_colore, modalita_arrivo_code,
                        note_triage)
SELECT id,
       TO_CHAR(CURRENT_DATE, 'YYYY') || '-0002',
       'ATT',
       'C01',
       'AZZURRO',
       'AMB',
       'Trauma lieve alla caviglia'
FROM patients
WHERE codice_fiscale = 'LUGVRDA70F234KK3'
ON CONFLICT (braccialetto) DO NOTHING;

-- Accessi Nuovi Pazienti
INSERT INTO admissions (patient_id, braccialetto, stato, patologia_code, codice_colore, modalita_arrivo_code,
                        note_triage)
SELECT id,
       TO_CHAR(CURRENT_DATE, 'YYYY') || '-0003',
       'ATT',
       'C03',
       'VERDE',
       'AUT',
       'Tosse persistente da 3 giorni'
FROM patients
WHERE codice_fiscale = 'BNCNNA90C55H501A'
ON CONFLICT (braccialetto) DO NOTHING;

INSERT INTO admissions (patient_id, braccialetto, stato, patologia_code, codice_colore, modalita_arrivo_code,
                        note_triage)
SELECT id,
       TO_CHAR(CURRENT_DATE, 'YYYY') || '-0004',
       'VIS',
       'C02',
       'ARANCIONE',
       'AMB',
       'Dolore toracico oppressivo'
FROM patients
WHERE codice_fiscale = 'NREGNN55S30F205Z'
ON CONFLICT (braccialetto) DO NOTHING;

INSERT INTO admissions (patient_id, braccialetto, stato, patologia_code, codice_colore, modalita_arrivo_code,
                        note_triage)
SELECT id,
       TO_CHAR(CURRENT_DATE, 'YYYY') || '-0005',
       'RIC',
       'C04',
       'ROSSO',
       'ELI',
       'Perdita di coscienza prolungata'
FROM patients
WHERE codice_fiscale = 'RMNFNC85L62L219K'
ON CONFLICT (braccialetto) DO NOTHING;

INSERT INTO admissions (patient_id, braccialetto, stato, patologia_code, codice_colore, modalita_arrivo_code,
                        note_triage)
SELECT id,
       TO_CHAR(CURRENT_DATE, 'YYYY') || '-0006',
       'OBI',
       'C05',
       'BIANCO',
       'AUT',
       'Stato ansioso lieve'
FROM patients
WHERE codice_fiscale = 'SPSMRC00A10F839V'
ON CONFLICT (braccialetto) DO NOTHING;

INSERT INTO admissions (patient_id, braccialetto, stato, patologia_code, codice_colore, modalita_arrivo_code,
                        note_triage, data_ora_dimissione)
SELECT id,
       TO_CHAR(CURRENT_DATE, 'YYYY') || '-0007',
       'DIM',
       'C19',
       'AZZURRO',
       'AMB',
       'Febbre alta e dolori articolari',
       NOW()
FROM patients
WHERE codice_fiscale = 'FRRLNE75P45D612J'
ON CONFLICT (braccialetto) DO NOTHING;

