const { querySync } = require('../../database');
const { validationResult } = require('express-validator');
const moment = require('moment');
const fs = require('fs');
const path = require('path');
const policyFor = require('../policy');
const { subject } = require('@casl/ability');
const removeFiles = require('../utils/removeFiles');
const sqlUpdate = require('../utils/sqlUpdate');
const config = require('../../config');

module.exports = {
	/*-----------------get-------------------------*/
	async getByClass(req, res, next){
		
		const code_class = parseInt(req.params.code_class) || undefined ;
		let qs = req.query; 
		const policy = policyFor(req.user);
		const sqlFunc = function(teacherRole){
			
			const additionalSql = {
					text: !teacherRole? "AND user_id = $2": "",
					values: !teacherRole? [code_class, req.user?.user_id]: [code_class]
			}
			
			const csSql = 'AND schedule > NOW() ORDER BY schedule ASC LIMIT 1'
			// const latestSql = `
				// ORDER BY
				// CASE WHEN schedule < NOW() THEN ROW_NUMBER() OVER() + COUNT(*) OVER()
					
					 // ELSE ROW_NUMBER() OVER()
				// END
				// ASC`
			
			const latestSql = `
				ORDER BY
				CASE WHEN schedule < NOW() THEN CAST(CEIL(EXTRACT(EPOCH FROM NOW())) || '0' AS NUMERIC) - CEIL(EXTRACT(EPOCH FROM schedule))
					
					 ELSE CEIL(EXTRACT(EPOCH FROM schedule))
				END
				ASC`
			
			if(parseInt(qs.cs)) delete qs.latest //cs (coming soon)
			return {
				text: `SELECT e.*, c.class_name, c.description class_description, c.teacher, t.name teacher_name, t.email teacher_email, t.gender teacher_gender, t.photo teacher_photo, (SELECT count(*) FROM exam_answers WHERE id_exm = e.id_exm ${additionalSql.text}) total_answers FROM exams e INNER JOIN classes c ON e.code_class=c.code_class INNER JOIN users t ON c.teacher = t.user_id WHERE e.code_class = $1 ${parseInt(qs.cs)? csSql: ''} ${ parseInt(qs.latest)?latestSql:''}`,
				values: additionalSql.values
			}
		}
		
		try{
			
			let sqlGetClass = {
				text: 'SELECT teacher FROM classes WHERE code_class=$1',
				values: [code_class]
			}
			const { rows: classData } = await querySync(sqlGetClass);
			const subjectExam = subject('Exam',{user_id: classData[0]?.teacher})
			
			if(!policy.can('read', subjectExam)){
				
				let sqlGetStudent = {
					text: 'SELECT * FROM class_students WHERE class=$1 AND "user"=$2',
					values: [code_class, req.user?.user_id]
				}
				
				const { rows: studentData } = await querySync(sqlGetStudent);
				const subjectExam2 = subject('Exam',{user_id: studentData[0]?.user});
				
				if(!policy.can('read', subjectExam2)){
					return res.json({
						error: 1,
						message: "You're not allowed to get exam data"
					})
					
				}
				
				const { rows: examData } = await querySync(sqlFunc(false));
				return res.json({data: examData})
				
			}
			
			const { rows: examData } = await querySync(sqlFunc(true));
			res.json({data: examData})
			
		}catch(err){
			next(err);
		}
	},
	
	/*-----------------get single-------------------------*/
	async getSingle(req, res, next){
		
		const id_exm = parseInt(req.params.id_exm);
		try{
			//get the main data and authorize
			const query = {
				text: 'SELECT e.*, c.class_name, c.description class_description, c.teacher, t.name teacher_name, t.email teacher_email, t.gender teacher_gender, t.photo teacher_photo FROM exams e INNER JOIN classes c ON e.code_class=c.code_class INNER JOIN users t ON c.teacher = t.user_id WHERE id_exm = $1',
				values: [id_exm || undefined]
			}
			const { rows: examData } = await querySync(query);
			
			//authorize
			let sqlGetStudent = {
				text: 'SELECT * FROM class_students WHERE class=$1 AND "user"=$2',
				values: [examData[0]?.code_class, req.user?.user_id]
			}
			const { rows: studentData} = await querySync(sqlGetStudent);
			
			const policy = policyFor(req.user);
			const subjectExam = subject('Exam',{user_id: examData[0]?.teacher});
			const subjectExam2 = subject('Exam',{user_id: studentData[0]?.user});
			
			if(!policy.can('readsingle',subjectExam)){
				if(!policy.can('readsingle',subjectExam2)){
					return res.json({
						error: 1,
						message: "You're not allowed to get a single exam data"
					})
				}
			}
			res.json({data: examData})
			
		}catch(err){
			console.log(err)
			next(err);
		}
		
	},
	
	/*-----------------add-------------------------*/
	async create(req, res, next){
		
		let policy = policyFor(req.user);
		if(!policy.can('create', 'Exam')){
			
			removeFiles([req.file]);
			
			return res.json({
				error: 1,
				message: 'You have no access to create a exam'
			})
		}
		
		const errInsert = validationResult(req);
		let { schedule, text, duration = 0, code_class } = req.body;
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
		
		attachment = attachment.length? JSON.stringify(attachment).replace('[', '{').replace(']', '}'): undefined
		const query = {
			text: 'INSERT INTO exams(schedule, text, duration, attachment, code_class) VALUES($1, $2, $3, $4, $5) RETURNING *',
			values: [ schedule, text, duration, attachment, code_class ]
		}
		
		try{
			const result = await querySync(query);
			res.json({
				data: result.rows
			})
		}catch(err){
			
			removeFiles([req.file]);
			
			next(err)
		}
	},
	
	/*-----------------edit-------------------------*/
	async edit(req, res, next){
		
		try{
			const id_exm = parseInt(req.params.id_exm) || undefined;
			let sql ={
				text: 'SELECT c.teacher FROM exams m INNER JOIN classes c ON m.code_class = c.code_class  WHERE id_exm=$1',
				values: [id_exm]
			} 
			
			const { rows } = await querySync(sql);
			const subjectExam = subject('Exam', {user_id: rows[0]?.teacher})
			let policy = policyFor(req.user);
			
			if(!policy.can('update', subjectExam)){
				
				removeFiles([req.file]);
				
				return res.json({
					error: 1,
					message: 'You have no access to edit this exam'
				})
			}
			
			const errInsert = validationResult(req);
			if(req.file?.filename) req.body.attachment = req.file?.filename;
			
			if(!errInsert.isEmpty()){
				removeFiles([req.file]);
				return res.json({
					error: 1,
					field: errInsert.mapped()
				})
			}
			
			//get single data for deleting the attachment
			let getSql = {
				text: 'SELECT attachment FROM exams WHERE id_exm=$1',
				values: [ id_exm ]
			}
			let { rows : getSingle } = await querySync(getSql);
			let removedAttachment = getSingle[0]?.attachment[0] || undefined;
			
			//updating the data
			const { schedule, name, duration, description, attachment, code_class} = req.body;
			const updateData = { schedule, name, duration, description, attachment, code_class};
			
			sql = sqlUpdate({ id_exm }, 'exams', updateData)
			
			let resultUpdate = await querySync(sql);
			
			if(resultUpdate.rowCount && req.file){
				if(removedAttachment){
					let removedFile = [{path: path.join(config.rootPath,`public/document/${removedAttachment}`)}];
					removeFiles(removedFile)
				}
			}
			
			res.json({
				data: resultUpdate.rows
			})
			
		}catch(err){
			removeFiles([req.file]);
			next(err)
		}
	},	
	/*-----------------remove-------------------------*/
	async remove(req, res, next){
		
		try{
			const id_exm = parseInt(req.params.id_exm)|| undefined;
			let sql ={
				text: 'SELECT c.teacher FROM exams e INNER JOIN classes c ON e.code_class = c.code_class  WHERE id_exm=$1',
				values: [id_exm ]
			} 
			
			const {rows} = await querySync(sql);
			const subjectMatter = subject('Exam', {user_id: rows[0]?.teacher})
			let policy = policyFor(req.user);
			
			if(!policy.can('delete', subjectMatter)){
				
				return res.json({
					error: 1,
					message: 'You have no access to delete this exam'
				})
			}
			
			let deleteSql = {
				text: 'DELETE FROM Exams WHERE id_exm=$1 RETURNING *',
				values: [id_exm ]
			}
			let resultDelete = await querySync(deleteSql);
			
			if(resultDelete.rowCount) {
				let removedFiles = [{path: path.join(config.rootPath,`public/document/${resultDelete.rows[0]?.attachment[0]}`)}];
				removeFiles(removedFiles);
			}
			
			return res.json({
				message: 'The exam data is successfully deleted',
				data: resultDelete.rows
			})
			
		}catch(err){
			console.log(err)
			next(err)
		}
	}
}