const { querySync } = require('../../database');
const { validationResult } = require('express-validator');
const policyFor = require('../policy');
const { subject } = require('@casl/ability');

module.exports = {
	/*-----------------get-------------------------*/
	async getStudents(req, res, next){
		
		try{
			
			const policy = policyFor(req.user);
			
			if(!policy.can('readAll', 'Student')){
				return res.json({
					error: 1,
					message: "You're not allowed to perform this action"
				})
			}
			
			query = {
				text: 'SELECT s.id_student, c.*, u.user_id uId, u.name uName, u.email uEmail, u.gender uGender, u.photo uPhoto, t.user_id tId, t.name tName, t.email tEmail, t.gender tGender, t.photo tPhoto FROM students s INNER JOIN classes c ON class = code_class INNER JOIN users u ON s.user = u.user_id INNER JOIN users t ON c.teacher = t.user_id WHERE "user" = $1',
				values: [req.user?.user_id]
			}
			
			result = await querySync(query);
			res.json({data: result.rows})
			
		}catch(err){
			next(err);
		}
	},
	/*-----------------getByClass-------------------------*/
	async getByClass(req, res, next){
		
		try{
			
			const policy = policyFor(req.user);
			let query = {
				text: 'SELECT teacher FROM classes WHERE code_class = $1',
				values: [req.params.code_class]
			}
			
			let result = await querySync(query);
			const subjectStudent = subject('Student', {user_id: result.rows[0]?.teacher})
			
			if(!policy.can('read', subjectStudent)){
				return res.json({
					error: 1,
					message: "You're not allowed to perform this action"
				})
			}
			
			query = {
				text: 'SELECT students.*, classes.*, users.name , email, gender, photo  FROM students INNER JOIN users ON "user" = user_id INNER JOIN classes ON class = code_class WHERE class = $1',
				values: [req.params.code_class]
			}
			
			result = await querySync(query);
			res.json({data: result.rows})
			
		}catch(err){
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
	async addStudent(req, res, next){
		
		let policy = policyFor(req.user);
		let { class : classes, user } = req.body;
		
		try{
			
			if(!policy.can('create', 'Student')){
				return res.json({
					error: 1,
					message: "You aren't allowed to perform this action"
				})
			}
			
			const errInsert = validationResult(req);
			if(!errInsert.isEmpty()){
				return res.json({
					error: 1,
					field: errInsert.mapped()
				})
			}
			
			//check existing data
			sql = {
				text: 'SELECT * FROM students WHERE class=$1 AND "user"=$2',
				values: [classes, user]
			}
			result = await querySync(sql);
			
			if(result.rowCount){
				return res.json({
					error: 1,
					message: "The user have already joined this class"
				})
			}
			
			sql = {
				text: 'INSERT INTO students(class, "user") VALUES($1, $2) RETURNING *',
				values: [classes, user]
			}
			result = await querySync(sql);
			
			res.json({
				data: result.rows
			})
		}catch(err){
			next(err)
		}
	},
	
	
	/*-----------------join class-------------------------*/
	async joinClass(req, res, next){
		
		let policy = policyFor(req.user);
		let { class : classes } = req.body;
		
		try{
			
			if(!policy.can('create', 'Student')){
				return res.json({
					error: 1,
					message: "You aren't allowed to perform this action"
				})
			}
			
			const errInsert = validationResult(req);
			if(!errInsert.isEmpty()){
				return res.json({
					error: 1,
					field: errInsert.mapped()
				})
			}
			
			sql = {
				text: 'INSERT INTO students(class, "user") VALUES($1, $2) RETURNING *',
				values: [classes, req.user?.user_id]
			}
			result = await querySync(sql);
			
			res.json({
				data: result.rows
			})
		}catch(err){
			next(err)
		}
	},
	
}