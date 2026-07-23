import express from 'express';
import cors from 'cors';
import responseTime from "response-time";
import {authenticateTokenFn, loginFn} from "./services/auth.js";
import {retrieveHealthStatusFn} from "./services/health.js";
import {retrieveArrivalModesFn, retrievePathologiesFn, retrieveTriageColorsFn} from "./services/resources.js";
import {
	changeAdmissionsStatusByIDFn,
	deleteAdmissionByIDFn,
	deletePatientByIdFn,
	insertNewAdmissionFn,
	retrieveActiveAdmissionsFn,
	retrieveAdmissionByIDFn,
	retrieveDischargedAdmissionsFn,
	searchPatientsFn,
	updatePatientInformationFn
} from "./services/patients.js";
import {logger} from "./services/logger.js";
import {AppError, globalErrorHandler} from "./utils/errorHandler.js";
import {getContentType, getMetrics, httpRequestDurationMicroseconds} from "./services/metrics.js";
import {
	activateUserFn,
	checkUsernameAvailabilityFn,
	createUserFn,
	deactivateUserFn,
	deleteUserFn,
	editUserRoleFn,
	retrieveAllStaffFn
} from "./services/staff.js";

// --- CONFIGURAZIONE SERVER EXPRESS ---
const app = express();
const port = 3000;

// --- MIDDLEWARE GLOBALI ---
app.use(cors());
app.use(express.json());

// Middleware Metriche (Tempi di risposta)
app.use(responseTime((req, res, time) => {
	if (req.path === '/metrics') return; // Non tracciamo le chiamate a /metrics

	httpRequestDurationMicroseconds.labels(
		req.method,
		req.path,
		res.statusCode
	).observe(time / 1000);
}));

// --- ENDPOINTS ---

// Metriche per Prometheus
app.get('/metrics', async (req, res) => {
	res.set('Content-Type', getContentType());
	res.send(await getMetrics());
});

// --- HEALTH CHECK ---
app.get('/health', retrieveHealthStatusFn);

// --- API ENDPOINTS ---
// 1. LOGIN
app.post('/auth/login', loginFn);

// 2. CONFIGURAZIONI / RISORSE
app.get('/resources/triage-colors', authenticateTokenFn, retrieveTriageColorsFn);
app.get('/resources/pathologies', authenticateTokenFn, retrievePathologiesFn);
app.get('/resources/arrival-modes', authenticateTokenFn, retrieveArrivalModesFn);

// 3. GESTIONE PAZIENTI / ACCESSI
app.get('/admissions', authenticateTokenFn, retrieveActiveAdmissionsFn);
app.get('/admissions/:id', authenticateTokenFn, retrieveAdmissionByIDFn);
app.get('/admissions/reports/discharged', authenticateTokenFn, retrieveDischargedAdmissionsFn)
app.get('/patients/search', authenticateTokenFn, searchPatientsFn);
app.post('/admissions', authenticateTokenFn, insertNewAdmissionFn);
app.patch('/admissions/:id/status', authenticateTokenFn, changeAdmissionsStatusByIDFn);
app.delete('/admissions/:id', authenticateTokenFn, deleteAdmissionByIDFn);
app.patch('/patients/:id', authenticateTokenFn, updatePatientInformationFn);
app.delete('/patients/:id', authenticateTokenFn, deletePatientByIdFn);

// 4. STAFF ENDPOINTS
app.get('/users', authenticateTokenFn, retrieveAllStaffFn);
app.get('/users/check/:username', authenticateTokenFn, checkUsernameAvailabilityFn);
app.post('/users', authenticateTokenFn, createUserFn);
app.patch('/users/:id/deactivate', authenticateTokenFn, deactivateUserFn);
app.patch('/users/:id/activate', authenticateTokenFn, activateUserFn);
app.patch('/users/:id/editrole', authenticateTokenFn, editUserRoleFn);
app.delete('/users/:id', authenticateTokenFn, deleteUserFn);

// --- ROTTA NON TROVATA ---
app.all(/(.*)/, (req, res, next) => {
	next(new AppError(`Impossibile trovare ${req.originalUrl} su questo server`, 404));
});

// --- GLOBAL ERROR HANDLER ---
app.use(globalErrorHandler);

// Avvio Server
app.listen(port, () => {
	logger.info(`SIO Backend in ascolto sulla porta ${port}`);
});
