const { querySync } = require('../../database');
const { validationResult } = require('express-validator');
const policyFor = require('../policy');
const { subject } = require('@casl/ability');

module.exports = {
	/*-----------------get-------------------------*/
	async getByAns(req, res, next){
		
		try{
			
			//authorization
			const policy = policyFor(req.user);
			const id_exm_ans = parseInt(req.params.id_exm_ans)
			
			let sql_get_teacher = {
					text: `SELECT * FROM exam_answers ea
						   INNER JOIN exams e ON ea.id_exm = e.id_exm
						   INNER JOIN classes c ON e.code_class = c.code_class 
						   WHERE id_exm_ans = $1`,
					values: [ id_exm_ans || undefined ]
				}
				
			const getTeacher = await querySync(sql_get_teacher);
			
			let subjectExmAnsComments = subject('Exam_answer_comment', {user_id: getTeacher.rows[0]?.teacher})
			
			if(!policy.can('read', subjectExmAnsComments)){
				
				let sql_get_student = {
					text: 'SELECT * FROM exam_answers WHERE id_exm_ans = $1',
					values: [id_exm_ans || undefined]
				}
				
				const getStudent = await querySync(sql_get_student)
				
				subjectExmAnsComments = subject('Exam_answer_comment', {user_id: getStudent.rows[0]?.user_id})
				
				if(!policy.can('read', subjectExmAnsComments)){
					return res.json({
						error: 1,
						message: "You're not allowed to perform this action"
					})
				}
			}
			
			let readSql = {
				text: `SELECT ac.*, jsonb_build_object('name', u.name, 'email', u.email, 'gender', u.gender, 'photo', u.photo) "user", to_jsonb(ea.*) exam_answer FROM exam_answer_comments ac
					   INNER JOIN "users" u ON ac.user_id = u.user_id 
					   INNER JOIN exam_answers ea ON ac.id_exm_ans = ea.id_exm_ans WHERE ac.id_exm_ans = $1`,
				values: [id_exm_ans || undefined]
			}
			
			const result = await querySync(readSql);
			res.json({data: result.rows})
			
		}catch(err){
			console.log(err)
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
	async add(req, res, next){
		
		let policy = policyFor(req.user);
		if(!policy.can('create', 'Exam_answer_comment')){
			return res.json({
				error: 1,
				message: 'You have no access to add a matter discussion'
			})
		}
		
		const errInsert = validationResult(req);
		if(!errInsert.isEmpty()){
			return res.json({
				error: 1,
				field: errInsert.mapped()
			})
		}
		
		let { text, id_exm_ans } = req.body;
		const insertSql = {
			text: 'INSERT INTO exam_answer_comments (text, id_exm_ans, user_id) VALUES($1, $2, $3) RETURNING *',
			values: [text, id_exm_ans, req.user?.user_id]
		}
		const update_total_comms = {
			text: 'UPDATE exam_answers SET total_comments = total_comments + 1 WHERE id_exm_ans = $1',
			values: [id_exm_ans]
		}
		try{
			const result = await querySync(insertSql);
			const updateTotalComment = await querySync(update_total_comms);
			
			res.json({
				data: result.rows
			})
		}catch(err){
			console.log(err)
			next(err)
		}
	},
	
}