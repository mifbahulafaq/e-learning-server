const { querySync } = require('../../database');
const { validationResult } = require('express-validator');
const moment = require('moment');
const fs = require('fs');
const path = require('path');
const policyFor = require('../policy');
const { subject } = require('@casl/ability');
const removeFiles = require('../utils/removeFiles');
const updateData = require('../utils/updateData');
const config = require('../config');

module.exports = {
	/*-----------------get-------------------------*/
	async getByClass(req, res, next){
		
		const code_class = parseInt(req.params.code_class);
		const { latest } = req.query; 
		const policy = policyFor(req.user);
		
		try{
			
			let sqlGetClass = {
				text: 'SELECT teacher FROM classes WHERE code_class=$1',
				values: [code_class || undefined]
			}
			const { rows: classData } = await querySync(sqlGetClass);
			const subjectExam = subject('Exam',{user_id: classData[0]?.teacher})
			
			if(!policy.can('read', subjectExam)){
				
				let sqlGetStudent = {
					text: 'SELECT * FROM students WHERE class=$1 AND "user"=$2',
					values: [code_class || undefined, req.user?.user_id]
				}
				
				const { rows: studentData } = await querySync(sqlGetStudent);
				const subjectExam2 = subject('Exam',{user_id: studentData[0]?.user});
				
				if(!policy.can('read', subjectExam2)){
					return res.json({
						error: 1,
						message: "You're not allowed to perform this action"
					})
					
				}
			}
			
			const query = {
				text: `SELECT e.*, c.class_name, c.description class_description, c.teacher, t.name teacher_name, t.email teacher_email, t.gender teacher_gender, t.photo teacher_photo FROM exams e INNER JOIN classes c ON e.code_class=c.code_class INNER JOIN users t ON c.teacher = t.user_id WHERE e.code_class = $1 ${ parseInt(latest)?'ORDER BY id_exm DESC LIMIT 1':''}`,
				values: [code_class || undefined]
			}
			
			const { rows: examData } = await querySync(query);
			res.json({data: examData})
			
		}catch(err){
			console.log(err)
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
				text: 'SELECT * FROM students WHERE class=$1 AND "user"=$2',
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
						message: "You're not allowed to read this data"
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
		let { schedule, name, duration, description, code_class } = req.body;
		let attachment = req.file?.filename || null;
		
		if(!errInsert.isEmpty()){
			
			removeFiles([req.file]);
			
			return res.json({
				error: 1,
				field: errInsert.mapped()
			})
		}
		
		const query = {
			text: 'INSERT INTO exams(schedule, name, duration, description, attachment, code_class) VALUES($1, $2, $3, $4, $5, $6) RETURNING *',
			values: [ schedule, name, duration, description, attachment, code_class ]
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
			const id_exm = parseInt(req.params.id_exm);
			let sql ={
				text: 'SELECT c.teacher FROM exams m INNER JOIN classes c ON m.code_class = c.code_class  WHERE id_exm=$1',
				values: [id_exm || undefined]
			} 
			
			const { rows } = await querySync(sql);
			const subjectExam = subject('Exam', {user_id: rows[0]?.teacher})
			let policy = policyFor(req.user);
			
			if(!policy.can('update', subjectExam)){
				
				removeFiles([req.file]);
				
				return res.json({
					error: 1,
					message: 'You have no access to edit this data'
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
			let removedAttachment = getSingle[0].attachment || undefined;
			
			//updating the data
			const columns = ['schedule',  'name',  'duration', 'description', 'attachment', 'code_class'];
			let resultUpdate = await updateData(req, 'exams', columns);
			
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
			const id_exm = parseInt(req.params.id_exm);
			let sql ={
				text: 'SELECT c.teacher FROM exams e INNER JOIN classes c ON e.code_class = c.code_class  WHERE id_exm=$1',
				values: [id_exm || undefined]
			} 
			
			const {rows} = await querySync(sql);
			const subjectMatter = subject('Exam', {user_id: rows[0]?.teacher})
			let policy = policyFor(req.user);
			
			if(!policy.can('delete', subjectMatter)){
				
				return res.json({
					error: 1,
					message: 'You have no access to delete this data'
				})
			}
			
			let deleteSql = {
				text: 'DELETE FROM Exams WHERE id_exm=$1 RETURNING *',
				values: [id_exm || undefined]
			}
			let resultDelete = await querySync(deleteSql);
			
			if(resultDelete.rowCount) {
				let removedFiles = [{path: path.join(config.rootPath,`public/document/${resultDelete.rows[0]?.attachment}`)}];
				removeFiles(removedFiles);
			}
			
			return res.json({
				message: 'The data is successfully deleted',
				data: resultDelete.rows
			})
			
		}catch(err){
			console.log(err)
			next(err)
		}
	}
}