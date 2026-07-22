import {pool} from "./dbSession.js";
import {AppError, catchAsync} from "../utils/errorHandler.js";
import {logger} from "./logger.js";

/**
 * GET /admissions
 * Recupera accessi attivi con JOIN sulle tabelle di lookup.
 */
export const retrieveActiveAdmissionsFn = catchAsync(async (req, res) => {
	const query = `
        SELECT a.id,
               a.braccialetto,
               a.data_ora_ingresso AS "dataOraIngresso",
               a.stato,
               a.note_triage       AS "noteTriage",
               a.patologia_code    AS "patologiaCode",

               -- Oggetto Paziente appiattito o strutturato (qui uso prefissi per chiarezza)
               p.nome,
               p.cognome,
               p.data_nascita      AS "dataNascita",
               p.codice_fiscale    AS "codiceFiscale",
               p.sex,

               -- Dati Patologia
               path.code           AS "patologiaCode",
               path.description    AS "patologiaDescrizione",

               -- Dati Colore
               tc.code             AS "coloreCode",
               tc.hex_value        AS "coloreHex",
               tc.display_name     AS "coloreNome",

               -- Dati Modalità Arrivo
               am.code             AS "modalitaArrivoCode",
               am.description      AS "modalitaArrivoDescrizione"

        FROM admissions a
                 JOIN patients p ON a.patient_id = p.id
                 LEFT JOIN triage_colors tc ON a.codice_colore = tc.code
                 LEFT JOIN pathologies path ON a.patologia_code = path.code
                 LEFT JOIN arrival_modes am ON a.modalita_arrivo_code = am.code
        WHERE a.stato NOT IN ('DIM', 'RIC')
        ORDER BY tc.priority, a.data_ora_ingresso DESC
	`;

	const result = await pool.query(query);

	res.status(200).json({
		status: 'success',
		results: result.rowCount,
		data: result.rows
	});
});

/**
 * GET /admissions/:id
 */
export const retrieveAdmissionByIDFn = catchAsync(async (req, res, next) => {
	const {id} = req.params;
	const query = `
        SELECT a.id,
               a.braccialetto,
               a.data_ora_ingresso   AS "dataOraIngresso",
               a.stato,
               a.note_triage         AS "noteTriage",
               p.nome,
               p.cognome,
               p.data_nascita        AS "dataNascita",
               p.codice_fiscale      AS "codiceFiscale",
               p.sex,
               p.indirizzo_via       as "indirizzoVia",
               p.indirizzo_civico    AS "indirizzoCivico",
               p.comune,
               p.provincia,
               path.code             AS "patologiaCode",
               path.description      AS "patologiaDescrizione",
               tc.code               AS "coloreCode",
               tc.hex_value          AS "coloreHex",
               tc.display_name       AS "coloreNome",
               am.code               AS "modalitaArrivoCode",
               am.description        AS "modalitaArrivoDescrizione",
               a.data_ora_dimissione AS "dataOraDimissione"
        FROM admissions a
                 JOIN patients p ON a.patient_id = p.id
                 LEFT JOIN triage_colors tc ON a.codice_colore = tc.code
                 LEFT JOIN pathologies path ON a.patologia_code = path.code
                 LEFT JOIN arrival_modes am ON a.modalita_arrivo_code = am.code
        WHERE a.id = $1
	`;

	const result = await pool.query(query, [id]);
	if (result.rows.length === 0) {
		return next(new AppError("Accesso non trovato con questo ID", 404));
	}

	res.status(200).json({
		status: 'success',
		data: result.rows[0]
	});
});

/**
 * POST /admissions
 * Crea un nuovo accesso. Gestisce Paziente e Admission in transazione.
 */
export const insertNewAdmissionFn = catchAsync(async (req, res, next) => {
	const {
		nome, cognome, dataNascita, sesso, codiceFiscale, // Dati Paziente
	} = req.body.anagrafica;
	const {
		patologia, codiceColore, modArrivo, noteTriage // Dati Accesso (Notare i suffix 'Code')
	} = req.body.sanitaria;

	if (!nome || !cognome || !dataNascita || !sesso || !codiceFiscale) {
		return next(new AppError("Dati anagrafici incompleti", 400));
	}
	if (!patologia || !codiceColore || !modArrivo) {
		return next(new AppError("Dati sanitari incompleti", 400));
	}

	const client = await pool.connect();

	await client.query('BEGIN');

	// 1. Upsert Paziente
	let patientRes = await client.query(
		`INSERT INTO patients (nome, cognome, data_nascita, sex, codice_fiscale)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (codice_fiscale) DO UPDATE SET nome    = EXCLUDED.nome,
                                                    cognome = EXCLUDED.cognome
         RETURNING id`,
		[nome, cognome, dataNascita, sesso, codiceFiscale]
	);
	const patientId = patientRes.rows[0].id;

	// 2. Generazione Braccialetto
	const year = new Date().getFullYear();
	const countRes = await client.query(`SELECT COUNT(*)
                                         FROM admissions
                                         WHERE braccialetto LIKE $1`, [`${year}-%`]);
	const nextNum = Number.parseInt(countRes.rows[0].count) + 1;
	const braccialetto = `${year}-${String(nextNum).padStart(4, '0')}`;

	// 3. Insert Accesso
	const insertQuery = `
        INSERT INTO admissions
        (patient_id, braccialetto, stato, patologia_code, codice_colore, modalita_arrivo_code, note_triage)
        VALUES ($1, $2, 'ATT', $3, $4, $5, $6)
        RETURNING id, braccialetto
	`;

	const insertAdm = await client.query(insertQuery, [
		patientId, braccialetto, patologia, codiceColore, modArrivo, noteTriage
	]);

	await client.query('COMMIT');

	// Restituisco l'ID creato così il frontend può navigare al dettaglio
	res
		.status(201)
		.setHeader('Location', `/admissions/${insertAdm.rows[0].id}`)
		.json({
			status: 'success',
			message: "Accesso creato con successo",
			data: {
				id: insertAdm.rows[0].id,
				braccialetto: insertAdm.rows[0].braccialetto
			}
		});
});

/**
 * PATCH /admissions/:id/status
 * Aggiorna lo stato e, se 'DIM', imposta la data di dimissione.
 */
export const changeAdmissionsStatusByIDFn = catchAsync(async (req, res, next) => {
	const {id} = req.params;
	const {nuovoStato} = req.body;

	const allowed = ['ATT', 'VIS', 'OBI', 'RIC', 'DIM'];
	if (!allowed.includes(nuovoStato)) {
		return next(new AppError("Stato non valido. Ammessi: ATT, VIS, OBI, RIC, DIM", 400));
	}

	// Se lo stato è DIM, aggiorniamo anche data_ora_dimissione
	let query;
	let params;

	if (nuovoStato === 'DIM') {
		query = `
            UPDATE admissions
            SET stato               = $1,
                data_ora_dimissione = NOW()
            WHERE id = $2
            RETURNING id, stato, data_ora_dimissione AS "dataOraDimissione"
		`;
		params = [nuovoStato, id];
	} else {
		query = `
            UPDATE admissions
            SET stato = $1
            WHERE id = $2
            RETURNING id, stato
		`;
		params = [nuovoStato, id];
	}

	const result = await pool.query(query, params);

	if (result.rowCount === 0) {
		return next(new AppError("Ammissione non trovata", 404));
	}

	res.status(200).json({
		status: 'success',
		data: result.rows[0],
		message: `Stato aggiornato a ${nuovoStato}`
	});
});

/**
 * GET /admissions/reports/discharged
 * Recupera i pazienti dimessi nelle ultime 24 ore.
 */
export const retrieveDischargedAdmissionsFn = catchAsync(async (req, res) => {
	const query = `
        SELECT a.braccialetto,
               p.nome,
               p.cognome,
               a.data_ora_ingresso   AS "dataOraIngresso",
               a.data_ora_dimissione AS "dataOraDimissione"
        FROM admissions a
                 JOIN patients p ON a.patient_id = p.id
        WHERE a.stato = 'DIM'
          AND a.data_ora_dimissione >= NOW() - INTERVAL '24 hours'
        ORDER BY a.data_ora_dimissione DESC
	`;
	const result = await pool.query(query);

	res.status(200).json({
		status: 'success',
		results: result.rowCount,
		data: result.rows
	});
});

/**
 * PATCH /patients/:id
 * Aggiorna i dati anagrafici (indirizzo) di un paziente.
 */
export const updatePatientInformationFn = catchAsync(async (req, res, next) => {
	const {id} = req.params;
	const {
		via,
		civico,
		comune,
		provincia,
	} = req.body;

	// Validazione di base per assicurarsi che almeno un campo sia fornito
	if (!via && !via && !comune && !provincia) {
		return next(new AppError("Nessun dato da aggiornare fornito.", 400));
	}

	const result = await pool.query(
		`UPDATE patients
         SET indirizzo_via    = $1,
             indirizzo_civico = $2,
             comune           = $3,
             provincia        = $4
         WHERE id = $5
         RETURNING id, nome, cognome, indirizzo_via, indirizzo_civico, comune, provincia`,
		[via, civico, comune, provincia, id]
	);

	if (result.rows.length === 0) {
		return next(new AppError("Paziente non trovato con questo ID", 404));
	}

	res.status(200).json({
		status: 'success',
		message: 'Dati del paziente aggiornati con successo.',
		data: result.rows[0]
	});
});

// GET /patients/search - Ricerca avanzata (Fuzzy)
export const searchPatientsFn = catchAsync(async (req, res) => {
	const { cf, nome, cognome, data_nascita } = req.query;
	let query = `SELECT * FROM patients`;
	const params = [];
	const clauses = [];

	logger.info(`Ricerca pazienti con parametri: cf=${cf}, nome=${nome}, cognome=${cognome}, data_nascita=${data_nascita}`);

	if (!cf && !nome && !cognome && !data_nascita) {
		return res.status(400).json({ status: 'fail', message: "Almeno un parametro di ricerca è richiesto" });
	}

	if (cf) {
		// codice fiscale = ricerca esatta
		clauses.push(`codice_fiscale = $${params.length + 1}`);
		params.push(String(cf).toUpperCase());
	} else {
		// costruisco clausole dinamiche per nome/cognome/data
		if (nome) {
			clauses.push(`nome ILIKE $${params.length + 1}`);
			params.push(`%${String(nome)}%`);
		}
		if (cognome) {
			clauses.push(`cognome ILIKE $${params.length + 1}`);
			params.push(`%${String(cognome)}%`);
		}
		if (data_nascita) {
			clauses.push(`data_nascita = $${params.length + 1}`);
			params.push(String(data_nascita));
		}
		if (clauses.length === 0) {
			return res.status(400).json({ status: 'fail', message: "Specificare almeno nome o cognome o data di nascita." });
		}
	}

	if (clauses.length > 0) {
		query += ' WHERE ' + clauses.join(' AND ');
	}

	logger.info(`Esecuzione query di ricerca pazienti: ${query} con parametri ${JSON.stringify(params)}`);

	const result = await pool.query(query, params);
	res.status(200).json({ status: 'success', results: result.rowCount, data: result.rows });
});
