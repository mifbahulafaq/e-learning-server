const { validationResult } = require('express-validator');
const moment = require('moment');
const fs = require('fs');
const path = require('path');
const policyFor = require('../policy');
const { subject } = require('@casl/ability');
const config = require('../../config');
const examColNames = ['text', 'code_class', 'duration', 'schedule', 'attachment'];

const toSqlArray = require('../utils/toSqlArray');
const filterData = require('../utils/filterData');
const appError = require('../utils/appError');
const searchFileOfArrays = require('../utils/searchFileOfArrays');

const examServices = require('./service');
const { querySync } = require('../../services/query');
const fileService = require('../../services/file');


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
			
			if(parseInt(qs.cs)) delete qs.latest //cs (coming soon / latest data)
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
				
				if(!policy.can('read', subjectExam2)) throw appError("You're not allowed to get exam data", 200)
				
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
		res.json({data: req.data})
	},
	
	async getAttachment(req, res, next){
		try{
			
			const data = req.data?.[0]?.attachment? [req.data?.[0]?.attachment]: [];
			
			await searchFileOfArrays( data, req.params.filename)
			
			res.json({
				path: `/private/document/${req.user.user_id}/${req.params.filename}`
			})
		}catch(err){
			next(err)
		}
	},
	
	/*-----------------add-------------------------*/
	async create(req, res, next){
		
		try{
			let policy = policyFor(req.user);
			if(!policy.can('create', 'Exam')) throw appError('You have no access to create a exam', 200);
			
			const errInsert = validationResult(req);
			
			if(!errInsert.isEmpty()){
				
				const err = appError('Insert', 200);
				err.field = errInsert.mapped();
				
				throw err
			}
			
			//inserting...
			const { file, body } = req;
			const result = await examServices.insert({ body, file });
			
			res.json({
				data: result.rows
			})
		}catch(err){
			next(err)
		}
	},
	
	/*-----------------edit-------------------------*/
	async put(req, res, next){
		
		const { file, body, params, user } = req;
			// console.log()
		try{
			
			const id_exm = parseInt(params.id_exm) || undefined;
			let sql ={
				text: 'SELECT c.teacher FROM exams m INNER JOIN classes c ON m.code_class = c.code_class  WHERE id_exm=$1',
				values: [id_exm]
			} 
			
			const { rows } = await querySync(sql);
			const subjectExam = subject('Exam', {user_id: rows[0]?.teacher})
			let policy = policyFor(user);
			
			if(!policy.can('update', subjectExam)) throw appError('You have no access to edit this exam', 200);
			
			const errInsert = validationResult(req);
			
			if(!errInsert.isEmpty()){
				
				const err = appError('insert', 200);
				err.field = errInsert.mapped()
				
				throw err;
			}
			//updating..
			const resultUpdate = await examServices.update(id_exm, { file, body})
			
			res.json({
				data: resultUpdate.rows
			})
			
		}catch(err){
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
			
			if(!policy.can('delete', subjectMatter)) throw appError('You have no access to delete this exam', 200)
			
			let deleteSql = {
				text: 'DELETE FROM Exams WHERE id_exm=$1 RETURNING *',
				values: [id_exm ]
			}
			let resultDelete = await querySync(deleteSql);
			
			if(resultDelete.rowCount) {
				let removedFiles = [{path: path.join(config.rootPath,`public/document/${resultDelete.rows[0]?.attachment[0]}`)}];
				fileService.removeFiles(removedFiles);
			}
			
			return res.json({
				message: 'The exam data is successfully deleted',
				data: resultDelete.rows
			})
			
		}catch(err){
			next(err)
		}
	}
}