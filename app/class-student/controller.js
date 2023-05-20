const { querySync } = require('../../database');
const { validationResult } = require('express-validator');
const policyFor = require('../policy');
const { subject } = require('@casl/ability');

module.exports = {
	/*-----------------get-------------------------*/
	async getStudents(req, res, next){
		
		try{
			
			const policy = policyFor(req.user);
			
			if(!policy.can('readAll', 'Class_student')){
				return res.json({
					error: 1,
					message: "You're not allowed to get class students"
				})
			}
			
			query = {
				text: 'SELECT cs.id_class_student, c.*, u.user_id uId, u.name uName, u.email uEmail, u.gender uGender, u.photo uPhoto, t.user_id tId, t.name tName, t.email tEmail, t.gender tGender, t.photo tPhoto FROM class_students cs INNER JOIN classes c ON class = code_class INNER JOIN users u ON cs.user = u.user_id INNER JOIN users t ON c.teacher = t.user_id WHERE "user" = $1',
				values: [req.user?.user_id]
			}
			
			result = await querySync(query);
			res.json({data: result.rows})
			
		}catch(err){
			console.log(err)
			next(err);
		}
	},
	/*-----------------getByClass-------------------------*/
	async getByClass(req, res, next){
		
		try{
			
			const policy = policyFor(req.user);
			const code_class = parseInt(req.params.code_class) || undefined
			
			let teacherSql = {
				text: 'SELECT teacher FROM classes WHERE code_class = $1',
				values: [code_class]
			}
			let studentSql = {
				text: 'SELECT * FROM class_students WHERE class = $1 AND "user" = $2',
				values: [code_class, req.user?.user_id]
			}
			
			let teacherResult = await querySync(teacherSql);
			let subjectStudent = subject('Class_student', {user_id: teacherResult.rows[0]?.teacher})
			
			//teacher authorization
			if(!policy.can('read', subjectStudent)){
				
				let studentResult = await querySync(studentSql);
				subjectStudent = subject('Class_student', {user_id: studentResult.rows[0]?.user})
				
				if(!policy.can('read', subjectStudent)){
					return res.json({
						error: 1,
						message: "You're not allowed to get class students"
					})
				}
				
				let sqlResult = {
					text: 'SELECT class_students.*, classes.*, users.name , email, gender, photo  FROM class_students INNER JOIN users ON "user" = user_id INNER JOIN classes ON class = code_class WHERE class = $1 AND "user" != $2',
					values: [code_class, req.user?.user_id]
				}
				
				let result = await querySync(sqlResult);
				return res.json({data: result.rows})
			}
			
			let sqlResult2 = {
				text: 'SELECT class_students.*, classes.*, users.name , email, gender, photo  FROM class_students INNER JOIN users ON "user" = user_id INNER JOIN classes ON class = code_class WHERE class = $1',
				values: [code_class]
			}
			
			let result2 = await querySync(sqlResult2);
			res.json({data: result2.rows})
			
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
			
			if(!policy.can('create', 'Class_student')){
				return res.json({
					error: 1,
					message: "You aren't allowed to add a class student"
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
				text: 'INSERT INTO class_students(class, "user") VALUES($1, $2) RETURNING *',
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
			
			if(!policy.can('create', 'Class_student')){
				return res.json({
					error: 1,
					message: "You aren't allowed to join a class"
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
				text: 'INSERT INTO class_students(class, "user") VALUES($1, $2) RETURNING *',
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
	
	
	/*-----------------join class-------------------------*/
	async unenrol(req, res, next){
		
		const id_class_student = parseInt(req.params.id_class_student) || undefined
		let policy = policyFor(req.user);
		
		try{
			
			const teacherSql = {
				text: `SELECT c.teacher FROM class_students cs
					   INNER JOIN classes c ON cs.class = c.code_class WHERE id_class_student = $1`,
				values: [id_class_student]
			}
			const { rows: teacherData} = await querySync(teacherSql)
			let subjectStudent = subject('Class_student', { user_id: teacherData[0]?.teacher})
			
			//teacher authorization
			if(!policy.can('delete', subjectStudent)){
				
				//student authorization
				const studentSql = {
				text: `SELECT u.user_id FROM class_students cs
					   INNER JOIN users u ON cs.user = u.user_id WHERE id_class_student = $1`,
				values: [id_class_student]
				}
				
				const { rows: studentData} = await querySync(studentSql)
				subjectStudent = subject('Class_student', { user_id: studentData[0]?.user_id})
				
				if(!policy.can('delete', subjectStudent)){
					
					return res.json({
						error: 1,
						message: "You aren't allowed to unenrol"
					})
				}
				
			}
			
			const unenrolSql = {
				text: 'DELETE FROM class_students WHERE id_class_student = $1',
				values: [id_class_student]
			}
			
			const unenrolResult = await querySync(unenrolSql);
			
			res.json({
				message: "Unenrolling successfully"
			})
			
		}catch(err){
			next(err)
		}
	},
	
}