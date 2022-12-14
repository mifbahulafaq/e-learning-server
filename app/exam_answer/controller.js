const { querySync } = require('../../database');
const { validationResult } = require('express-validator');
const path = require('path');
const policyFor = require('../policy');
const { subject } = require('@casl/ability');
const removeFiles = require('../utils/removeFiles');
const config = require('../config');

module.exports = {
	/*-----------------get-------------------------*/
	async getByExam(req, res, next){
		
		const idExm = parseInt(req.params.id_exm)
		const policy = policyFor(req.user);
		
		try{
			
			let sql = {
				text: 'SELECT * FROM exams e INNER JOIN classes c ON e.code_class = c .code_class WHERE id_exm=$1',
				values: [idExm || undefined]
			}
			const { rows: classData } = await querySync(sql);
			
			const subjectExamAns = subject('Exam_answer',{user_id: classData[0]?.teacher})
			
			if(!policy.can('read', subjectExamAns)){
				
				return res.json({
					error: 1,
					message: "You're not allowed to perform this action"
				})
			}
			
			sql = {
				text: 'SELECT ea.*, to_jsonb(e.*) exam, to_jsonb(c.*) class FROM exam_answers ea INNER JOIN exams e ON ea.id_exm=e.id_exm INNER JOIN classes c ON e.code_class=c.code_class WHERE ea.id_exm = $1',
				values: [idExm || undefined]
			}
			
			const { rows: examAnsData } = await querySync(sql);
			res.json({data: examAnsData})
			
		}catch(err){
			console.log(err)
			next(err);
		}
	},
	
	/*-----------------get single-------------------------*/
	async getSingle(req, res, next){
		
		const id_exm_ans = parseInt(req.params.id_exm_ans);
		try{
			//authorize
			let sql = {
				text: 'SELECT c.teacher FROM exam_answers ea INNER JOIN exams e ON ea.id_exm=e.id_exm INNER JOIN classes c ON e.code_class=c.code_class WHERE ea.id_exm_ans=$1',
				values: [id_exm_ans || undefined]
			}
			let { rows: examAnsData } = await querySync(sql);
			
			const policy = policyFor(req.user);
			const subjectExam = subject('Exam_answer',{user_id: examAnsData[0]?.teacher});
			
			if(!policy.can('readsingle',subjectExam)){
				
				sql = {
					text: 'SELECT * FROM exam_answers WHERE id_exm_ans = $1',
					values: [id_exm_ans || undefined]
				}
				let { rows: examAnsData2 } = await querySync(sql)
				
				const subjectExam2 = subject('Exam_answer',{user_id: examAnsData2[0]?.user_id});
				
				if(!policy.can('readsingle',subjectExam2)){
					return res.json({
						error: 1,
						message: "You're not allowed to read this data"
					})
				}
			}
			
			sql = {
				text: 'SELECT ea.*, to_jsonb(e.*) exam, to_jsonb(c.*) class FROM exam_answers ea INNER JOIN exams e ON ea.id_exm=e.id_exm INNER JOIN classes c ON e.code_class=c.code_class WHERE ea.id_exm_ans=$1',
				values: [id_exm_ans || undefined]
			}
			let { rows: examAnsData3 } = await querySync(sql);
			res.json({data: examAnsData3})
			
		}catch(err){
			console.log(err)
			next(err);
		}
		
	},
	
	/*-----------------add-------------------------*/
	async addAnswer(req, res, next){
		
		let policy = policyFor(req.user);
		if(!policy.can('create', 'Exam_answer')){
			
			removeFiles([req.file]);
			
			return res.json({
				error: 1,
				message: 'You have no access to a exam answer'
			})
		}
		
		const errInsert = validationResult(req);
		
		let { id_exm } = req.body;
		let content = []
		if(req.file){
			content[0] = req.file.filename
			content[1] = req.file.originalname
		}
		
		if(!errInsert.isEmpty()){
			
			removeFiles([req.file]);
			
			return res.json({
				error: 1,
				field: errInsert.mapped()
			})
		}
		
		try{
			//checking the user's answers
			let sql = {
				text: 'SELECT * FROM exam_answers WHERE user_id=$1',
				values: [req.user?.user_id]
			}
			const getUser = await querySync(sql)
			
			if(getUser.rowCount){//update
				
				content = content.length? `{${JSON.stringify(content).replace('[', '{').replace(']', '}')}}`: undefined
				sql = {
					text: 'UPDATE exam_answers SET content = content || $1 WHERE user_id=$2 RETURNING *',
					values: [ content, req.user?.user_id ]
				}
				const updateData = await querySync(sql);
				return res.json({
					data: updateData.rows
				})
			}
			
			//insert
			content = content.length? `{${JSON.stringify(content).replace('[', '{').replace(']', '}')}}`: undefined
			sql = {
				text: 'INSERT INTO exam_answers(content, id_exm, user_id) VALUES($1, $2, $3) RETURNING *',
				values: [ content, id_exm, req.user?.user_id ]
			}
			const insertData = await querySync(sql);
			
			res.json({
				data: insertData.rows
			})
			
		}catch(err){
			
			removeFiles([req.file]);
			
			next(err)
		}
	},
	
	/*-----------------edit-------------------------*/
	async rate(req, res, next){
		
		try{
		
			const id_exm_ans = parseInt(req.params.id_exm_ans);
			const policy = policyFor(req.user)
			let sql = {
				text: "SELECT c.teacher FROM exam_answers ea INNER JOIN exams e ON ea.id_exm=e.id_exm INNER JOIN classes c ON e.code_class=c.code_class WHERE ea.id_exm_ans=$1",
				values: [id_exm_ans || undefined]
			}
			
			const cekTeacher = await querySync(sql)
			const subjectExamAns = subject("Exam_answer", { user_id: cekTeacher.rows[0]?.teacher })
			
			if(!policy.can('update', subjectExamAns)){
				return res.json({
					error: 1,
					message: "you're not allowed to perform this action"
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
				text: 'UPDATE exam_answers SET score = $1 WHERE id_exm_ans = $2 RETURNING *',
				values: [ req.body.score, id_exm_ans ]
			}
			
			//updating the data
			const columns = ['schedule',  'name',  'duration', 'description', 'attachment', 'code_class'];
			let updateSCore = await querySync(sql);
			
			res.json({
				data: updateSCore.rows
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
	*/
}