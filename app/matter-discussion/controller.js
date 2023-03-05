const { querySync } = require('../../database');
const { validationResult } = require('express-validator');
const policyFor = require('../policy');
const { subject } = require('@casl/ability');

module.exports = {
	/*-----------------get-------------------------*/
	async getMattDiscuss(req, res, next){
		
		try{
			
			//authorization
			const policy = policyFor(req.user);
			let sql_get_teacher = {
				text: 'SELECT teacher FROM matters INNER JOIN classes ON class = code_class WHERE id_matter = $1',
				values: [req.params.id_matt]
			}
			let result = await querySync(sql_get_teacher);
			
			let subjectMatterDiscuss = subject('Matter_discussion', {user_id: result.rows[0]?.teacher})
			
			if(!policy.can('read', subjectMatterDiscuss)){
				
				
				let sql_get_class = {
					text: 'SELECT class FROM matters WHERE id_matter = $1',
					values: [req.params.id_matt]
				}
				result = await querySync(sql_get_class);
				
				let sql_get_student = {
					text: 'SELECT "user" FROM class_students WHERE class = $1 AND "user" = $2' ,
					values: [result.rows[0]?.class, req.user?.user_id]
				}
				result = await querySync(sql_get_student);
				
				subjectMatterDiscuss = subject('Matter_discussion', {user_id: result.rows[0]?.user})
				
				if(!policy.can('read', subjectMatterDiscuss)){
					return res.json({
						error: 1,
						message: "You're not allowed to perform this action"
					})
				}
			}
			
			let sql_get_mattdiscuss = {
				text: 'SELECT matter_discussions.*, u.name , email, gender, photo  FROM matter_discussions INNER JOIN users u ON "user" = user_id WHERE matt = $1 ORDER BY date',
				values: [req.params.id_matt]
			}
			
			result = await querySync(sql_get_mattdiscuss);
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
	async addMattDiscuss(req, res, next){
		
		let policy = policyFor(req.user);
		if(!policy.can('create', 'Matter_discussion')){
			return res.json({
				error: 1,
				message: 'You have no access to add a matter discussion'
			})
		}
		
		const errInsert = validationResult(req);
		let { date, text, matt } = req.body;
		
		if(!errInsert.isEmpty()){
			return res.json({
				error: 1,
				field: errInsert.mapped()
			})
		}
		
		const query = {
			text: 'INSERT INTO matter_discussions(date, text, matt, "user") VALUES($1, $2, $3, $4) RETURNING *',
			values: [date, text, matt, req.user?.user_id]
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