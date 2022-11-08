const { querySync } = require('../../database');
const { validationResult } = require('express-validator');
const policyFor = require('../policy');
const { subject } = require('@casl/ability');

module.exports = {
	/*-----------------get-------------------------*/
	async getClassDiscuss(req, res, next){
		
		try{
			
			const policy = policyFor(req.user);
			let query = {
				text: 'SELECT teacher FROM classes WHERE code_class = $1',
				values: [req.params.code_class]
			}
			
			let result = await querySync(query);
			const subjectClassDiscuss = subject('Class_discussion', {user_id: result.rows[0]?.teacher})
			
			if(!policy.can('read', subjectClassDiscuss)){
				return res.json({
					error: 1,
					message: "You're not allowed to perform this action"
				})
			}
			
			query = {
				text: 'SELECT class_discussions.*, classes.*, users.name , email, gender, photo  FROM class_discussions INNER JOIN users ON "user" = user_id INNER JOIN classes ON class = code_class WHERE class = $1 ORDER BY date',
				values: [req.params.code_class]
			}
			
			result = await querySync(query);
			res.json({data: result.rows})
			
		}catch(err){
			console.log(err)
			next(err);
		}
	},
	
	/*-----------------delete-------------------------*/
	/*async deleteClass(req, res, next){
		
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
		
	},*/
	
	/*-----------------add-------------------------*/
	async addClassDiscuss(req, res, next){
		
		let policy = policyFor(req.user);
		if(!policy.can('create', 'Class_discussion')){
			return res.json({
				error: 1,
				message: 'You have no access to add a discussion'
			})
		}
		
		const errInsert = validationResult(req);
		let { date, text, code_class } = req.body;
		
		if(!errInsert.isEmpty()){
			return res.json({
				error: 1,
				field: errInsert.mapped()
			})
		}
		
		const query = {
			text: 'INSERT INTO class_discussions(date, text, class, "user") VALUES($1, $2, $3, $4) RETURNING *',
			values: [date, text, code_class, req.user?.user_id]
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
	
}