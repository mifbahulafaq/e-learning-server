const { querySync } = require('../../database');
const { validationResult } = require('express-validator');
const path = require('path');
const policyFor = require('../policy');
const { subject } = require('@casl/ability');
const removeFiles = require('../utils/removeFiles');
const config = require('../../config');

module.exports = {
	/*-----------------get-------------------------*/
	async getMattAss(req, res, next){
		
		let { by, status, class: aClass = "", skip, limit = 10} = req.query
		
		let filter = {
			status: "",
			class: ""
		}
		
		const policy = policyFor(req.user)
		if(!policy.can('readall', 'Matt_ass')){
			return res.json({
				error: 1,
				message: "You aren't allowed to access this resource"
			})
		}
		
		//set sql filter
		//filter aClass
		filter.class = parseInt(aClass)?`AND m.class = ${parseInt(aClass)}`:""
		//filter statuts
		switch(status){
			case "none":
				filter.status = "AND ma.id_matt_ass NOT IN (SELECT id_matt_ass FROM ass_answers WHERE user_id = $1) AND ( now() <= ma.date + concat(ma.duration / 1000, ' S')::interval OR ma.duration = 0 )"
				break;
			case "done":
				filter.status = "AND ma.id_matt_ass IN (SELECT id_matt_ass FROM ass_answers WHERE user_id = $1)"
				break;
			case "expired":
				filter.status = "AND ma.id_matt_ass NOT IN (SELECT id_matt_ass FROM ass_answers WHERE user_id = $1) AND ma.duration != 0 AND now() > ma.date + concat(ma.duration / 1000, ' S')::interval"
			break;
		}
		
		const number_of_answers = '(SELECT count(*) FROM ass_answers WHERE id_matt_ass = ma.id_matt_ass)'
		try{
			//get the main data and authorize
			let sql_by_student = {
				text: `SELECT ma.*, to_jsonb(m.*) matter, to_jsonb(c.*) class FROM matt_ass ma
					   INNER JOIN matters m ON ma.id_matt = m.id_matter
					   INNER JOIN classes c ON m.class = c.code_class
					   WHERE c.code_class IN (SELECT class FROM class_students WHERE "user" = $1) ${filter.status} ${filter.class}
					   LIMIT $2 OFFSET $3`,
				values: [req.user.user_id, limit, skip]
			}
			let sql_student_count = {
				text: `SELECT * FROM matt_ass ma
					   INNER JOIN matters m ON ma.id_matt = m.id_matter
					   INNER JOIN classes c ON m.class = c.code_class
					   WHERE c.code_class IN (SELECT class FROM class_students WHERE "user" = $1) ${filter.status} ${filter.class}`,
				values: [req.user.user_id]
			}
			
			let sql_by_teacher = {
				text: `SELECT ma.*, to_jsonb(m.*) matter, to_jsonb(c.*) class, ${number_of_answers} total_answers FROM matt_ass ma
					   INNER JOIN matters m ON ma.id_matt = m.id_matter
					   INNER JOIN classes c ON m.class = c.code_class
					   WHERE c.teacher = $1 ${filter.class}
					   LIMIT $2 OFFSET $3`,
				values: [req.user.user_id, limit, skip]
			}
			let sql_teacher_count = {
				text: `SELECT * FROM matt_ass ma
					   INNER JOIN matters m ON ma.id_matt = m.id_matter
					   INNER JOIN classes c ON m.class = c.code_class
					   WHERE c.teacher = $1 ${filter.class}`,
				values: [req.user.user_id]
			}
			
			let resultByStudent = {}
			let byStudentCount = {}
			let resultByTeacher = {}
			let byTeacherCount = {}
			
			switch(by){
				case "student":
				
					resultByStudent = await querySync(sql_by_student)
					byStudentCount = await querySync(sql_student_count)
				console.log(req.user.user_id)
					return res.json({
						data: resultByStudent.rows,
						rowCount: byStudentCount.rowCount 
					})
				
				case "teacher":
				
					resultByTeacher = await querySync(sql_by_teacher)
					byTeacherCount = await querySync(sql_teacher_count)
					return res.json({
						data: resultByTeacher.rows,
						rowCount: byTeacherCount.rowCount 
					})
				default:
					resultByStudent = await querySync(sql_by_student)
					byStudentCount = await querySync(sql_student_count)
					resultByTeacher = await querySync(sql_by_teacher)
					byTeacherCount = await querySync(sql_teacher_count)
					
					return res.json({
						data: {
							received_assignments: {
								data: resultByStudent.rows,
								count: byStudentCount.rowCount
							},
							created_assignments: {
								data: resultByTeacher.rows,
								count: byTeacherCount.rowCount
							}
						}
					})
					
			}
			
			
		}catch(err){
			console.log(err)
			next(err);
		}
		
	},
	/*-----------------get by matter-------------------------*/
	async getByMatter(req, res, next){
		
		const id_matt = parseInt(req.params.id_matt);
		const { no_answer } = req.query //no answers or must be done
		const sqlFunc = function(teacherRole, noAnswer){
			
			if(parseInt(no_answer)){
				
				const additionalSql = {
					text: !teacherRole? "WHERE user_id = $2": "",
					values: !teacherRole? [id_matt, req.user?.user_id]: [id_matt]
				}
				return {
					text: `SELECT * FROM matt_ass 
						   WHERE id_matt = $1 AND id_matt_ass NOT IN (SELECT id_matt_ass FROM ass_answers ${additionalSql.text}) AND ( now() <= date + concat(duration / 1000, ' S')::interval OR duration = 0)`,
					values: additionalSql.values
				}
			}else{
				
				const additionalSql = {
					text: !teacherRole? "AND user_id = $2": "",
					values: !teacherRole? [id_matt, req.user?.user_id]: [id_matt]
				}
				return {
					text: `SELECT ma.*, (SELECT count(*) FROM ass_answers WHERE id_matt_ass = ma.id_matt_ass ${additionalSql.text}) total_answers FROM matt_ass ma WHERE id_matt = $1`,
					values: additionalSql.values
				}
			}
		}
		
		try{
			//get the main data and authorize
			
			let sql = {
				text: "SELECT class FROM matters WHERE id_matter = $1",
				values: [id_matt]
			}
			const singleMatter = await querySync(sql)
			sql = {
				text: "SELECT * FROM classes WHERE code_class = $1 AND teacher = $2",
				values: [singleMatter.rows[0]?.class, req.user?.user_id]
			}
			const { rows: classData} = await querySync(sql)
			
			const policy = policyFor(req.user);
			const subjectMattAss = subject('Matt_ass',{user_id: classData[0]?.teacher});
			
			if(!policy.can('read',subjectMattAss)){
				
				let sqlGetStudent = {
					text: 'SELECT * FROM class_students WHERE class=$1 AND "user"=$2',
					values: [singleMatter.rows[0]?.class, req.user?.user_id]
				}
				const { rows: studentData} = await querySync(sqlGetStudent);
				const subjectMattAss2 = subject('Matt_ass',{user_id: studentData[0]?.user});
				
				if(!policy.can('read',subjectMattAss2)){
					return res.json({
						error: 1,
						message: "You're not allowed to read this data"
					})
				}
				
				const { rows: mattAssData } = await querySync(sqlFunc(false, parseInt(no_answer)))
				return res.json({
					data: mattAssData
				})
			}
			
			const { rows: mattAssData } = await querySync(sqlFunc(true, parseInt(no_answer)))
			return res.json({
				data: mattAssData
			})
			
		}catch(err){
			
			next(err);
		}
		
	},
	async singleMattAss(req, res, next){
	
		try{
			const id_matt_ass = parseInt(req.params.id_matt_ass) || undefined;
			let policy = policyFor(req.user);
			let additionalSql = {
				text: "",
				values: [id_matt_ass]
			}
			
			sql ={
				text: 'SELECT class FROM matt_ass ma INNER JOIN matters m ON ma.id_matt = m.id_matter WHERE ma.id_matt_ass = $1',
				values: [id_matt_ass]
			} 
			let { rows: mattAssData } = await querySync(sql);
			
			sql ={
				text: 'SELECT teacher FROM classes WHERE code_class = $1 AND teacher = $2',
				values: [mattAssData[0]?.class, req.user?.user_id]
			} 
			let { rows: classData } = await querySync(sql);
			let subjectMattAss = subject('Matt_ass', {user_id: classData[0]?.teacher})
			
			//teacher authorize
			if(!policy.can('readsingle', subjectMattAss)){
				
				let sql_get_student = {
					text: 'SELECT "user" FROM class_students WHERE class = $1 AND "user" = $2' ,
					values: [mattAssData[0]?.class, req.user?.user_id]
				}
				const { rows: studentData } = await querySync(sql_get_student);
				subjectMattAss = subject('Matt_ass', {user_id: studentData[0]?.user})
				
				//student authorize
				if(!policy.can('readsingle', subjectMattAss)){
					return res.json({
						error: 1,
						message: 'You have no access to read this data'
					})
				}
				
				additionalSql.text = "AND user_id = $2" 
				additionalSql.values = [id_matt_ass, req.user?.user_id]
			}
			
			let singleReadSql = {
				text: `SELECT ma.*, json_build_object('user_id', u.user_id, 'email', u.email, 'gender', u.gender, 'name', u.name, 'photo', u.photo) teacher,
				(SELECT count(*) FROM ass_answers WHERE id_matt_ass = $1 ${additionalSql.text}) total_answers
				FROM matt_ass ma 
					   INNER JOIN matters m ON ma.id_matt = m.id_matter
					   INNER JOIN classes c ON m.class = c.code_class
					   INNER JOIN users u ON c.teacher = u.user_id 
					   WHERE id_matt_ass = $1`,
				values: additionalSql.values
			}
			let { rows: singleData } = await querySync(singleReadSql);
			
			return res.json({
				data: singleData
			})
			
		}catch(err){
			console.log(err)
			next(err)
		}
	},
	
	/*-----------------add-------------------------*/
	async addMattAss(req, res, next){
		
		let policy = policyFor(req.user);
		if(!policy.can('create', 'Matt_ass')){
			
			removeFiles([req.file]);
			
			return res.json({
				error: 1,
				message: 'You have no access to create a assignment'
			})
		}
		
		const errInsert = validationResult(req);
		let { duration = 0, text, id_matt, title } = req.body;
		let attachment = []
		if(req.file){
			attachment[0] = req.file.filename
			attachment[1] = req.file.originalname
		}
		
		if(!errInsert.isEmpty()){
			
			removeFiles([req.file]);
			
			return res.json({
				error: 1,
				field: errInsert.mapped()
			})
		}
		
		attachment = attachment.length ? JSON.stringify(attachment).replace(/\[/g,'{').replace(/\]/g,'}'): undefined;
		
		const query = {
			text: 'INSERT INTO matt_ass(duration, text, attachment, id_matt, title) VALUES($1, $2, $3, $4, $5) RETURNING *',
			values: [ duration, text, attachment, id_matt, title ]
		}
		
		try{
			const result = await querySync(query);
			res.json({
				data: result.rows
			})
		}catch(err){
			removeFiles([req.file]);
			console.log(err)
			next(err)
		}
	},
	/*-----------------edit-------------------------*/
	async deleteMattAss(req, res, next){
		
		try{
			const id_matt_ass = parseInt(req.params.id_matt_ass);
			let sql ={
				text: 'SELECT teacher FROM matt_ass ma INNER JOIN matters m ON ma.id_matt = m.id_matter INNER JOIN classes c ON m.class = c.code_class WHERE ma.id_matt_ass = $1 AND c.teacher = $2',
				values: [id_matt_ass, req.user?.user_id]
			} 
			
			let { rows: mattAssData } = await querySync(sql);
			
			let policy = policyFor(req.user);
			let subjectMattAss = subject('Matt_ass', {user_id: mattAssData[0]?.teacher})
			
			if(!policy.can('delete', subjectMattAss)){
				return res.json({
					error: 1,
					message: 'You have no access to delete this data'
				})
			}
			
			let deleteSql = {
				text: 'DELETE FROM matt_ass WHERE id_matt_ass = $1 RETURNING *',
				values: [id_matt_ass]
			}
			let resultDeleting = await querySync(deleteSql);
			
			if(resultDeleting.rowCount) {
				let filePath = {
					path: path.join(config.rootPath,`public/document/${resultDeleting.rows[0]?.attachment[0]}`)
				}
				
				removeFiles([filePath]);
			}
			
			return res.json({
				message: 'The data is successfully deleted',
				data: resultDeleting.rows
			})
			
		}catch(err){
			console.log(err)
			next(err)
		}
	}
}