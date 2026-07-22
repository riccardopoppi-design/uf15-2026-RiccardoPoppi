import {pool} from "./dbSession.js";
import {AppError, catchAsync} from "../utils/errorHandler.js";
import bcrypt from 'bcryptjs';

export const retrieveAllStaffFn = catchAsync(async (req, res) => {
	const query = `SELECT id, username, role, is_active as "isActive"
                   FROM users
                   ORDER BY username ASC`;
	const result = await pool.query(query);
	res.status(200).json({status: 'success', results: result.rowCount, data: result.rows});
});

export const checkUsernameAvailabilityFn = catchAsync(async (req, res) => {
	const {username} = req.params;
	const query = `SELECT id
                   FROM users
                   WHERE username = $1`;
	const result = await pool.query(query, [username]);
	res.status(200).json({status: 'success', data: {available: result.rowCount === 0}});
});

export const createUserFn = catchAsync(async (req, res, next) => {
	const {username, password, role} = req.body;
	const hashedPassword = await bcrypt.hash(password, 12);
	const query = `INSERT INTO users (username, password, role)
                   VALUES ($1, $2, $3)
                   RETURNING id, username, role`;
	const result = await pool.query(query, [username, hashedPassword, role]);
	res.status(201).json({status: 'success', data: result.rows[0]});
});

export const deactivateUserFn = catchAsync(async (req, res, next) => {
	const {id} = req.params;
	const result = await pool.query(`UPDATE users
                                     SET is_active = false
                                     WHERE id = $1
                                     RETURNING id`, [id]);
	if (result.rowCount === 0) return next(new AppError('Operatore non trovato', 404));
	res.status(200).json({status: 'success', message: 'Operatore disattivato correttamente'});
});

export const activateUserFn = catchAsync(async (req, res, next) => {
	const {id} = req.params;
	const result = await pool.query(`UPDATE users
                                     SET is_active = true
                                     WHERE id = $1
                                     RETURNING id`, [id]);
	if (result.rowCount === 0) return next(new AppError('Operatore non trovato', 404));
	res.status(200).json({status: 'success', message: 'Operatore attivato correttamente'});
});

export const editUserRoleFn = catchAsync(async (req, res, next) => {
	const {id} = req.params;
	const {role} = req.body;
	const result = await pool.query(`UPDATE users
                                     SET role = $1
                                     WHERE id = $2
                                     RETURNING id, username, role`, [role, id]);
	if (result.rowCount === 0) return next(new AppError('Operatore non trovato', 404));
	res.status(200).json({status: 'success', data: result.rows[0]});
});

export const deleteUserFn = catchAsync(async (req, res, next) => {
	const {id} = req.params;
	const result = await pool.query(`DELETE FROM users
                                     WHERE id = $1
                                     RETURNING id`, [id]);
	if (result.rowCount === 0) return next(new AppError('Operatore non trovato', 404));
	res.status(200).json({status: 'success', message: 'Operatore eliminato correttamente'});
});
