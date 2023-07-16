const { querySync } = require('../../database');
const { validationResult } = require('express-validator');
const path = require('path');
const policyFor = require('../policy');
const { subject } = require('@casl/ability');
const removeFiles = require('../utils/removeFiles');
const config = require('../../config');
const fs = require('fs')

module.exports = {
	/*-----------------get-------------------------*/
	async getByAss(req, res, next){
		
		const id_matt_ass = parseInt(req.params.id_matt_ass)
		const policy = policyFor(req.user);
		
		try{
			
			let sql = {
				text: 'SELECT c.teacher FROM matt_ass ma INNER JOIN matters m ON ma.id_matt = m.id_matter INNER JOIN classes c ON m.class = c.code_class WHERE ma.id_matt_ass=$1',
				values: [id_matt_ass || undefined]
			}
			const { rows: teacherAss } = await querySync(sql);
			
			let subjectAssAns = subject('Assignment_answer',{user_id: teacherAss[0]?.teacher})
			
			if(!policy.can('read', subjectAssAns)){//teacher auth
			
				sql = {
					text: `SELECT *
						FROM matt_ass ma
						INNER JOIN matters m ON ma.id_matt=m.id_matter
						WHERE ma.id_matt_ass = $1 AND m.class IN (SELECT class FROM class_students WHERE "user" = $2)`,
					values: [id_matt_ass || undefined, req.user.user_id]
				}
				const { rows: userAss } = await querySync(sql)
				
				subjectAssAns = subject('Assignment_answer',{user_id: userAss.length? req.user.user_id: undefined})
				
				if(!policy.can('read', subjectAssAns)){//student auth
					return res.json({
						error: 1,
						message: "You're not allowed to perform this assignment answer"
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
			console.log(err)
			next(err);
		}
	},
	
	/*-----------------get single-------------------------*/
	async getSingle(req, res, next){
		
		const id_ass_ans = parseInt(req.params.id_ass_ans);
		try{
			//authorize
			let sql = {
				text: 'SELECT c.teacher FROM ass_answers aa INNER JOIN matt_ass ma ON aa.id_matt_ass=ma.id_matt_ass INNER JOIN matters m ON ma.id_matt=m.id_matter INNER JOIN classes c ON m.class=c.code_class WHERE aa.id_ass_answer=$1',
				values: [id_ass_ans || undefined]
			}
			let { rows: assAnswerData } = await querySync(sql);
			
			const policy = policyFor(req.user);
			const subjectAssAns = subject('Assignment_answer',{user_id: assAnswerData[0]?.teacher});
			
			//checking teacher
			if(!policy.can('readsingle',subjectAssAns)){
				
				sql = {
					text: 'SELECT * FROM ass_answers WHERE id_ass_answer = $1',
					values: [id_ass_ans || undefined]
				}
				let { rows: assAnswerData2 } = await querySync(sql)
				
				const subjectAssAns2 = subject('Assignment_answer',{user_id: assAnswerData2[0]?.user_id});
				
				if(!policy.can('readsingle',subjectAssAns2)){
					return res.json({
						error: 1,
						message: "You're not allowed to read this single assignment answer"
					})
				}
			}
			
			sql = {
				text: `SELECT aa.*, to_jsonb(u.*) user, to_jsonb(ma.*) assignment FROM ass_answers aa
						INNER JOIN  "users" u ON aa.user_id =u.user_id 
						INNER JOIN matt_ass ma ON aa.id_matt_ass=ma.id_matt_ass WHERE aa.id_ass_answer=$1`,
				values: [id_ass_ans || undefined]
			}
			let { rows: assAnswerData3 } = await querySync(sql);
			res.json({data: assAnswerData3})
			
		}catch(err){
			console.log(err)
			next(err);
		}
		
	},
	
	/*-----------------add-------------------------*/
	async addAnswer(req, res, next){
		
		let policy = policyFor(req.user);
		if(!policy.can('create', 'Assignment_answer')){
			
			removeFiles([req.file]);
			
			return res.json({
				error: 1,
				message: 'You have no access to add a assignment answer'
			})
		}
		
		const errInsert = validationResult(req);
		
		if(!errInsert.isEmpty()){
			
			removeFiles([req.file]);
			
			return res.json({
				error: 1,
				field: errInsert.mapped()
			})
		}
		
		try{
		
			let { id_matt_ass } = req.body;
			let content = [
				req.file.filename,
				req.file.originalname
			]
			content = `{${JSON.stringify(content).replace('[', '{').replace(']', '}')}}`
			
			//checking the user's answers
			let sql = {
				text: 'SELECT * FROM ass_answers WHERE user_id=$1 AND id_matt_ass = $2',
				values: [req.user?.user_id, id_matt_ass]
			}
			const getUser = await querySync(sql)
			
			if(getUser.rowCount){//update
				
				sql = {
					text: 'UPDATE ass_answers SET content = content || $1 WHERE id_ass_answer = $2 RETURNING *',
					values: [ content, getUser.rows[0].id_ass_answer ]
				}
				const updateData = await querySync(sql);
				return res.json({
					data: updateData.rows
				})
			}
			
			sql = {
				text: 'INSERT INTO ass_answers(content, id_matt_ass, user_id) VALUES($1, $2, $3) RETURNING *',
				values: [ content, id_matt_ass, req.user?.user_id ]
			}
			
			//insert
			const insertData = await querySync(sql);
			
			res.json({
				data: insertData.rows
			})
			
		}catch(err){
			
			removeFiles([req.file]);
			
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
			const policy = policyFor(req.user)
			const id_ass_ans = parseInt(req.params.id_ass_ans)
			const filename = req.params.filename
			
			//student auth
			let sql = {
				text: "SELECT user_id FROM ass_answers WHERE id_ass_answer = $1",
				values: [id_ass_ans || undefined]
			}
			const { rows: studentData } = await querySync(sql)
			let subjectExamAns = subject('Assignment_answer', { user_id: studentData[0]?.user_id})
			
			if(!policy.can('readsingle', subjectExamAns)){
				
				//teacher auth
				sql = {
					text: `SELECT c.teacher FROM ass_answers aa 
						   INNER JOIN matt_ass ma ON aa.id_matt_ass = ma.id_matt_ass
						   INNER JOIN matters m ON ma.id_matt = m.id_matter
						   INNER JOIN classes c ON m.class = c.code_class
						   WHERE aa.id_ass_answer = $1`,
					values: [id_ass_ans || undefined]
				}
				const { rows: teacherData } = await querySync(sql)
				subjectExamAns = subject('Assignment_answer', { user_id: teacherData[0]?.teacher})
				
				if(!policy.can('readsingle', subjectExamAns)){
					return res.json({
						error: 1,
						message: "You're not allowed to read this attachment"
					})
				}
				
			}
			
			sql = {
				text: 'SELECT content FROM ass_answers WHERE id_ass_answer = $1 AND $2 = ANY(content)',
				values: [id_ass_ans || undefined, filename]
			} 
			const fileData = await querySync(sql)
			
			if(fileData.rowCount){
			
				const filePath = path.join(config.rootPath, `/public/document/${filename}`)
				if(fs.existsSync(filePath)){
					
					return res.sendFile(filePath,{
						headers: {
							'Content-Disosition': `inline; filename=${filename}`
						}
					})
				}
			}
			
			res.json({
				error: 1,
				message: "File not found"
			})
			
		}catch(err){
			next(err)
		}
		
	}
}