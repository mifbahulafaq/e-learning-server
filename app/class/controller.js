const { querySync } = require('../../database');
const { validationResult } = require('express-validator');
const moment = require('moment');
const policyFor = require('../policy');
const { subject } = require('@casl/ability');

module.exports = {
	/*-----------------get-------------------------*/
	async getclasses(req, res, next){
		
		const policy = policyFor(req.user);
		if(!policy.can('read', 'Class')){
			return res.end({
				error: 1,
				message: "You're not allowed to perform this action"
			})
		}
		
		const query = {
			text: 'SELECT * FROM classes WHERE user_id=$1',
			values: [req.user.user_id]
		}
		
		try{
			const result = await querySync(query);
			res.json({data: result.rows})
		}catch(err){
			next(err);
		}
	},
	
	/*-----------------get single-------------------------*/
	async getSingle(req, res, next){
		
		const query = {
			text: 'SELECT classes.*, email, gender, photo, users.name AS userName FROM classes JOIN users ON classes.user_id = users.user_id WHERE code_class = $1',
			values: [req.params.code_class]
		}
		
		try{
			
			const result = await querySync(query);
			const policy = policyFor(req.user);
			const subjectClass = subject('Class',{user_id: result.rows[0]?.user_id});
			
			if(!policy.can('readsingle',subjectClass)){
				return res.json({
					error: 1,
					message: "You're not allowed to perform this action"
				})
			}
			res.json({data: result.rows[0]})
			
		}catch(err){
			next(err);
		}
		
	},
	
	/*-----------------delete-------------------------*/
	async deleteClass(req, res, next){
		
		const get = {
			text: 'SELECT user_id FROM classes WHERE code_class = $1',
			values: [req.params.code_class]
		}
		
		try{
			
			let result = await querySync(get);
			
			const policy = policyFor(req.user);
			const subjectClass = subject('Class', {user_id: result.rows[0]?.user_id});
			
			if(!policy.can('delete', subjectClass)){
				return res.json({
					error: 1,
					message: "You can't delete this data"
				})
			}
			
			const remove = {
				text: 'DELETE FROM classes WHERE code_class = $1 RETURNING *',
				values: [req.params.code_class]
			}
			
			result = await querySync(remove);
			return res.json({
				message: 'Data is successfully deleted',
				data: result.rows[0]
			})
			
		}catch(err){
			next(err);
		}
		
	},
	
	/*-----------------add-------------------------*/
	async addClass(req, res, next){
		
		let policy = policyFor(req.user);
		if(!policy.can('create', 'Class')){
			return res.json({
				error: 1,
				message: 'You have no access to create a class'
			})
		}
		
		const errInsert = validationResult(req);
		let { name, description, user_id, schedule, cobatime } = req.body;
		
		if(!errInsert.isEmpty()){
			return res.json({
				error: 1,
				field: errInsert.mapped()
			})
		}
		
		if(schedule){
			schedule = JSON.stringify(schedule)
			.replace('[','{')
			.replace(']','}');
		}
		
		const query = {
			text: 'INSERT INTO classes(name, description, user_id, schedule) VALUES($1, $2, $3, $4) RETURNING *',
			values: [name, description, req.user.user_id, schedule]
		}
		try{
			const result = await querySync(query);
			res.json({
				data: result.rows
			})
		}catch(err){
			next(err)
		}
	},
	
	/*-----------------edit-------------------------*/
	async editClass(req, res, next){
		
		try{
			
			const errUpdate = validationResult(req);
			if(!errUpdate.isEmpty()){
				return res.json({
					error: 1,
					message: errUpdate.mapped()
				})
			}
			
			return res.send(req.body);
			
			let get = {
				text: 'SELECT user_id FROM classes WHERE code_class = $1',
				values: [req.params.code_class]
			}
			
			let result = await querySync(get);
			const policy = policyFor(req.user);
			const subjectClass = subject('Class', {user_id: result.rows[0]?.user_id});
			
			if(!policy.can('update', subjectClass)){
				return res.json({
					error: 1,
					message: "You can't update this data"
				})
			}
			
			return res.send(result.rows[0]?.user_id)
			
			
			
		}catch(err){
			next(err)
		}
		
	}
}