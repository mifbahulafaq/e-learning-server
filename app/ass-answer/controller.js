const { validationResult } = require('express-validator');
const path = require('path');
const policyFor = require('../policy');
const { subject } = require('@casl/ability');
const searchFileOfArrays = require('../utils/searchFileOfArrays');
const toSqlArray = require('../utils/toSqlArray');
const appError = require('../utils/appError');
const config = require('../../config');
const fs = require('fs');

const { querySync } = require('../../services/query');
const ass_answers = require('../../services/table')('ass_answers');

module.exports = {
	/*-----------------get-------------------------*/
	async getByAss(req, res, next){
		
		try{
			
			const id_matt_ass = parseInt(req.params.id_matt_ass)
			const policy = policyFor(req.user);
			
			let sql = {
				text: 'SELECT c.teacher FROM matt_ass ma INNER JOIN matters m ON ma.id_matt = m.id_matter INNER JOIN classes c ON m.class = c.code_class WHERE ma.id_matt_ass=$1',
				values: [id_matt_ass || undefined]
			}
			const { rows: teacherAss } = await querySync(sql);
			
			let subjectAssAns = subject('Assignment_answer',{user_id: teacherAss[0]?.teacher})
			
			if(!policy.can('read', subjectAssAns)){//teacher auth
			
				sql = {
					text: `SELECT ma.*, m.schedule matter_schedule
						FROM matt_ass ma
						INNER JOIN matters m ON ma.id_matt=m.id_matter
						WHERE ma.id_matt_ass = $1 AND m.class IN (SELECT class FROM class_students WHERE "user" = $2)`,
					values: [id_matt_ass || undefined, req.user.user_id]
				}
				const { rows: userAss } = await querySync(sql);
				
				subjectAssAns = subject('Assignment_answer',{user_id: userAss.length? req.user.user_id: undefined})
				
				if(!policy.can('read', subjectAssAns)){//student auth
					return res.json({
						error: 1,
						message: "You're not allowed to perform this assignment answer"
					})
				}

				const scheduleOfMatter = userAss[0]?.matter_schedule? new Date(userAss[0]?.matter_schedule): undefined;
				
				if(new Date() < scheduleOfMatter){
					return res.json({
						error: 1,
						message: "You can only get the data when the time enters the schedule of the matter " + scheduleOfMatter.toLocaleString("en-US")
					})
				}
				
				sql = {
					text: `SELECT 
						aa.*, jsonb_build_object('name',u.name, 'email', u.email, 'gender', u.gender, 'photo', u.photo) "user", jsonb_build_object('id_matt_ass',ma.id_matt_ass, 'duration', ma.duration, 'text', ma.text, 'date', ma.date, 'attachment', ma.attachment, 'matter', m.*, 'title', ma.title) assignmentmatter FROM ass_answers aa 
						INNER JOIN "users" u ON aa.user_id=u.user_id
						INNER JOIN matt_ass ma ON aa.id_matt_ass=ma.id_matt_ass
						INNER JOIN matters m ON ma.id_matt=m.id_matter
						WHERE aa.id_matt_ass = $1 AND aa.user_id = $2`,
					values: [id_matt_ass || undefined, req.user.user_id]
				}
				const { rows: userData} = await querySync(sql);
				
				return res.json({data: userData})
			}
			
			sql = {
				text: `SELECT 
						aa.*, jsonb_build_object('name',u.name, 'email', u.email, 'gender', u.gender, 'photo', u.photo) "user", jsonb_build_object('id_matt_ass',ma.id_matt_ass, 'duration', ma.duration, 'text', ma.text, 'date', ma.date, 'attachment', ma.attachment, 'matter', m.*, 'title', ma.title) assignmentmatter FROM ass_answers aa 
						INNER JOIN "users" u ON aa.user_id=u.user_id
						INNER JOIN matt_ass ma ON aa.id_matt_ass=ma.id_matt_ass
						INNER JOIN matters m ON ma.id_matt=m.id_matter
						WHERE aa.id_matt_ass = $1`,
				values: [id_matt_ass || undefined]
			}
			
			const { rows: teacherData } = await querySync(sql);
			res.json({data: teacherData})
			
		}catch(err){
			next(err);
		}
	},
	
	/*-----------------get single-------------------------*/
	async getSingle(req, res, next){
		
		res.json({data: req.data});
		
	},
	
	/*-----------------add-------------------------*/
	async addAnswer(req, res, next){
		
		try{
			
			const { user, errorFromField, file, body} = req;
			
			let policy = policyFor(user);
			
			if(!policy.can('create', 'Assignment_answer')) throw appError('You have no access to add a assignment answer', 200);
			
			const errInsert = validationResult(req);
			
			if(!errInsert.isEmpty()){
				
				const err = appError('Insert', 200);
				err.field = errInsert.mapped();

				throw err;
			}
			//get error from field
			if(errorFromField) throw appError(errorFromField.message, errorFromField.status);
			
			let { id_matt_ass } = body;
			let content = [
				file.filename,
				file.originalname
			]
			
			content = toSqlArray([content])
			
			//checking the user's answers
			const where = {user_id:  user?.user_id, id_matt_ass}
			const getUser = await ass_answers.find(where).execute();
			
			if(getUser.rowCount){//update
				
				let sql = {
					text: 'UPDATE ass_answers SET content = content || $1 WHERE id_ass_answer = $2 RETURNING *',
					values: [ content, getUser.rows[0].id_ass_answer ]
				}
				const updateData = await querySync(sql);
				return res.json({
					data: updateData.rows
				})
			}
			
			//inserting..
			const data = {content, id_matt_ass, user_id: user?.user_id}
			const insertData = await ass_answers.insert(data);
			
			res.json({
				data: insertData.rows
			})
			
		}catch(err){
			
			next(err)
		}
	},
	/*-----------------remove-------------------------*/
	/*async remove(req, res, next){
		
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
				let removedFiles = [{path: path.join(config.rootPath,`public/document/${resultDelete.rows[0]?.attachment[0]}`)}];
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
	*/
	async getAttachment(req, res, next){
		
		try{
			
			await searchFileOfArrays(req.data?.[0]?.content, req.params.filename)
			
			res.json({
				path: `/private/document/${req.user.user_id}/${req.params.filename}`
			})
			
		}catch(err){
			next(err)
		}
		
	}
}