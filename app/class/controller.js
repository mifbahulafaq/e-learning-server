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
			return res.json({
				error: 1,
				message: "You're not allowed to perform this action"
			})
		}
		console.log(req.user)
		const query = {
			text: 'SELECT classes.*, user_id, users.name AS userName, email, gender, photo FROM classes JOIN users ON teacher = user_id WHERE teacher = $1',
			values: [req.user?.user_id]
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
		
		const codeClass = parseInt(req.params.code_class);
		const query = {
			text: 'SELECT classes.*, user_id, users.name AS userName, email, gender, photo FROM classes JOIN users ON teacher = user_id WHERE code_class = $1',
			values: [codeClass? codeClass : undefined]
		}
		
		try{
			
			const result = await querySync(query);
			const policy = policyFor(req.user);
			const subjectClass = subject('Class',{user_id: result.rows[0]?.teacher});
			
			if(!policy.can('readsingle',subjectClass)){
				return res.json({
					error: 1,
					message: "You're not allowed to perform this action"
				})
			}
			res.json({data: result.rows})
			
		}catch(err){
			console.log(err)
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
				data: result.rows
			})
			
		}catch(err){
			next(err);
		}
		
	},
	
	/*-----------------add-------------------------*/
	async addClass(req, res, next){
		console.log('req.body')
		console.log(req.body)
		let policy = policyFor(req.user);
		if(!policy.can('create', 'Class')){
			return res.json({
				error: 1,
				message: 'You have no access to create a class'
			})
		}
		
		const errInsert = validationResult(req);
		let { class_name, description } = req.body;
		
		if(!errInsert.isEmpty()){
			return res.json({
				error: 1,
				field: errInsert.mapped()
			})
		}
		
		const query = {
			text: 'INSERT INTO classes(class_name, description, teacher) VALUES($1, $2, $3) RETURNING *',
			values: [class_name, description, req.user.user_id]
		}
		try{
			const result = await querySync(query);
			res.json({
				data: result.rows
			})
		}catch(err){
			console.log(err)
			next(err)
		}
	},
	
	/*-----------------edit-------------------------*/
	async editClass(req, res, next){
		
		try{
			
			let get = {
				text: 'SELECT user_id FROM classes WHERE code_class = $1',
				values: [req.params.code_class]
			}
			
			let result = await querySync(get);
			
			const policy = policyFor(req.user);
			const subjectClass = subject('Class', {user_id: result.rows[0]?.user_id});
			
			//authorization
			if(!policy.can('update', subjectClass)){
				return res.json({
					error: 1,
					message: "You can't update this data"
				})
			}
			
			const errUpdate = validationResult(req);
			
			// body validation
			if(!errUpdate.isEmpty()){
				return res.json({
					error: 1,
					message: errUpdate.mapped()
				})
			}
			
			//update data
			const { name, description } = req.body;
			const update = {
				text: "UPDATE classes SET name = $1, description = $2 WHERE code_class = $4 RETURNING *",
				values: [name, description, req.params.code_class]
			}
			
			result = await querySync(update);
			
			return res.json({
				data: result.rows
			})
			
		}catch(err){
			next(err)
		}
		
	}
}