const { querySync } = require('../../database');
const { validationResult } = require('express-validator');
const moment = require('moment');
const path = require('path')
const config = require('../config')
const policyFor = require('../policy');
const { subject } = require('@casl/ability');
const removeFiles = require('../utils/removeFiles')

module.exports = {
	/*-----------------get-------------------------*/
	async getclasses(req, res, next){
		
		const policy = policyFor(req.user)
			
		if(!policy.can('read', 'Class')){
			return res.json({
				error: 1,
				message: "You're not allowed to get this class data"
			})
		}
		
		try{
			let sql_by_teacher = {
				text: `SELECT c.*, jsonb_build_object('name', u.name, 'email', u.email, 'gender', u.gender, 'photo', u.photo) teacher FROM classes c
					   INNER JOIN users u ON c.teacher = u.user_id
					   WHERE c.teacher = $1`,
				values: [req.user.user_id]
			}
			
			const result = await querySync(sql_by_teacher)
			
			return res.json({
				data: result.rows,
				count: result.rowCount
			})
		}catch(err){
			console.log(err)
			next(err);
		}
	},
	
	/*-----------------get single-------------------------*/
	async getSingle(req, res, next){
		
		const codeClass = parseInt(req.params.code_class)
		const { user_id } = req.user || {}
		const policy = policyFor(req.user);
		
		// authorization student sql
		const studentSql = {
			text : `SELECT c.*, user_id, u.name AS userName, email, gender, photo FROM class_students cs 
					INNER JOIN classes c ON c.code_class = cs.class
					INNER JOIN users u ON c.teacher = u.user_id
					WHERE "user" = $1 AND class = $2`,
			values : [ user_id, codeClass || undefined]
		}
		// teacher student sql
		const teacherSql = {
			text: 'SELECT classes.*, user_id, users.name AS userName, email, gender, photo FROM classes JOIN users ON teacher = user_id WHERE code_class = $1',
			values: [codeClass || undefined]
		}
		
		try{
			
			const resultStudent = await querySync(studentSql)
			let subjectClass = subject('Class',{user_id: resultStudent.rowCount? user_id: undefined});
			
			//student authorization
			if(!policy.can('readsingle', subjectClass)){
				
				const resultTeacher = await querySync(teacherSql);
				subjectClass = subject('Class',{user_id: resultTeacher.rows[0]?.teacher});
				
				//teacher authorization
				if(!policy.can('readsingle',subjectClass)){
					return res.json({
						error: 1,
						message: "You're not allowed to get this single class"
					})
				}
				res.json({data: resultTeacher.rows[0]})
				
			}
			
			return res.json({ data: resultStudent.rows[0]})
			
		}catch(err){
			console.log(err)
			next(err);
		}
		
	},
	
	/*-----------------delete-------------------------*/
	async deleteClass(req, res, next){
		
		const codeClass = parseInt(req.params.code_class) || undefined
		const sqlGetClass = {
			text: 'SELECT teacher FROM classes WHERE code_class = $1',
			values: [codeClass]
		}
		
		try{
			
			let result = await querySync(sqlGetClass);
			
			const policy = policyFor(req.user);
			const subjectClass = subject('Class', {user_id: result.rows[0]?.teacher});
			
			if(!policy.can('delete', subjectClass)){
				return res.json({
					error: 1,
					message: 'You cannot delete this class'
				})
			}
			const getFilesSql = {
				text: `SELECT unnest(string_to_array(attachment[1], '')) FROM exams WHERE code_class = $1
					   UNION
					   SELECT unnest(content[1:][1]) FROM exam_answers ea INNER JOIN exams e ON ea.id_exm = e.id_exm WHERE e.code_class = $1
					   UNION
					   SELECT unnest(attachment[1:][1]) FROM matters WHERE class = $1
					   UNION
					   SELECT unnest(string_to_array(ma.attachment[1], '')) FROM matt_ass ma INNER JOIN matters m ON ma.id_matt = m.id_matter WHERE m.class = $1
					   UNION
					   SELECT unnest(aa.content[1:][1]) FROM ass_answers aa INNER JOIN matt_ass ma ON aa.id_matt_ass = ma.id_matt_ass INNER JOIN matters m ON ma.id_matt = m.id_matter WHERE m.class = $1`,
				values: [codeClass]
			}
			
			let { rows: filesOfClass } = await querySync(getFilesSql)
			filesOfClass = filesOfClass.map(e=>({path: path.join(config.rootPath, `public/document/${e.unnest}`)}))
			
			const remove = {
				text: 'DELETE FROM classes WHERE code_class = $1 RETURNING *',
				values: [codeClass]
			}
			result = await querySync(remove);
			removeFiles(filesOfClass) //removing documents of class
			
			return res.json({
				message: 'Class data is successfully deleted',
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
		let { class_name, description, color } = req.body;
		
		if(!errInsert.isEmpty()){
			return res.json({
				error: 1,
				field: errInsert.mapped()
			})
		}
		
		const query = {
			text: 'INSERT INTO classes(class_name, description, color, teacher) VALUES($1, $2, $3, $4) RETURNING *',
			values: [class_name, description, color, req.user.user_id]
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
					message: "You can't update this class data"
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