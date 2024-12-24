const { querySync } = require('../../services/query');
const exam_answers = require('../../services/table')('exam_answers');
const { validationResult } = require('express-validator');
const path = require('path');
const policyFor = require('../policy');
const { subject } = require('@casl/ability');
const toSqlArray = require('../utils/toSqlArray');
const appError = require('../utils/appError');
const config = require('../../config');
const fs = require('fs')
const searchFileOfArrays = require('../utils/searchFileOfArrays');

module.exports = {
	/*-----------------get-------------------------*/
	async getByExam(req, res, next){
		
		const idExm = parseInt(req.params.id_exm) || undefined
		const policy = policyFor(req.user);
		
		try{
			
			let sql = {
				text: 'SELECT * FROM exams e INNER JOIN classes c ON e.code_class = c.code_class WHERE id_exm=$1',
				values: [idExm]
			}
			const { rows: classData } = await querySync(sql);
			
			let subjectExamAns = subject('Exam_answer',{user_id: classData[0]?.teacher})
			
			if(!policy.can('read', subjectExamAns)){
				
				sql = {
					text: 'SELECT * FROM exams WHERE id_exm=$1',
					values: [idExm || undefined]
				}
				const { rows: examData } = await querySync(sql);
				
				sql = {
					text: 'SELECT * FROM class_students WHERE class=$1 AND "user"=$2',
					values: [ examData[0]?.code_class, req.user.user_id]
				}
				const { rows: studentData } = await querySync(sql);
				subjectExamAns = subject('Exam_answer',{user_id: studentData[0]?.user})
				
				if(!policy.can('read', subjectExamAns)){
					return res.json({
						error: 1,
						message: "You're not allowed to get exam answers"
					})
				}
				
				sql = {
					text: `SELECT 
						ea.*, 
						(SELECT count(*) FROM exam_answer_comments WHERE id_exm_ans = ea.id_exm_ans) total_comments,
						to_jsonb(e.*) exam, 
						to_jsonb(c.*) class 
						FROM exam_answers ea 
						INNER JOIN exams e ON ea.id_exm=e.id_exm 
						INNER JOIN classes c ON e.code_class=c.code_class 
						WHERE ea.id_exm = $1 AND ea.user_id = $2`,
					values: [idExm || undefined, req.user.user_id]
				}
				
				const { rows: userData } = await querySync(sql);
				return res.json({data: userData})
				
			}
			
			sql = {
				text: `SELECT ea.*, (SELECT count(*) FROM exam_answer_comments WHERE id_exm_ans = ea.id_exm_ans) total_comments, jsonb_build_object('name', u.name, 'email', u.email, 'gender', u.gender, 'photo', u.photo) "user" FROM exam_answers ea
					   INNER JOIN users u ON ea.user_id=u.user_id
					   WHERE ea.id_exm = $1`,
				values: [idExm || undefined]
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
		
		res.json({data: req.data})
		
	},
	
	/*-----------------add-------------------------*/
	async addAnswer(req, res, next){
		
		try{
			
			const { errorFromField, body, file, user } = req;
			
			const errInsert = validationResult(req);
			
			if(!errInsert.isEmpty()){
				
				const err = appError('Insert', 200);
				err.field = errInsert.mapped();
				
				throw err;
			}
			
			//get error from field
			if(errorFromField) throw appError(errorFromField.message, errorFromField.status);
		
			let { id_exm } = body;
			let content = [];
			if(file){
				content[0] = file.filename
				content[1] = file.originalname
			}
			
			//checking the user's answers
			const where = {
				user_id: user?.user_id,
				id_exm: id_exm
			}
			const getUser = await exam_answers.find(where).execute();
			
			content = toSqlArray(content)
			
			if(getUser.rowCount){
				throw appError('The answer has been added', 200);
			}
			
			sql = {
				text: 'INSERT INTO exam_answers(content, id_exm, user_id) VALUES($1, $2, $3) RETURNING *',
				values: [ content, id_exm, user?.user_id ]
			}
			
			//insert
			const insertData = await querySync(sql);
			
			res.json({
				data: insertData.rows
			})
			
		}catch(err){
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
					message: "you're not allowed to add a score"
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
				text: 'UPDATE exam_answers SET score = $1, rated = true WHERE id_exm_ans = $2 RETURNING *',
				values: [ req.body.score, id_exm_ans ]
			}
			
			//updating the data
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
	async getAttachment(req, res, next){
		
		try{
			
			const data = req.data?.[0]?.content? [req.data?.[0]?.content]: [];
			
			await searchFileOfArrays(data, req.params.filename)
			
			res.json({
				path: `/private/document/${req.user.user_id}/${req.params.filename}`
			})
		}catch(err){
			next(err)
		}
		
		
	}
}