const policyFor = require('../policy');
const { querySync } = require('../../services/query');
const { subject } = require('@casl/ability');
const appError = require('../utils/appError');
const { body, check } = require('express-validator');
const moment = require('moment');

const examService = require('../exam/service');

async function singleExmAnswerAuthor(req, res, next){
	
	const id_exm_ans = parseInt(req.params.id_exm_ans) || undefined;
	try{
		//authorize
		let sql = {
			text: `SELECT ea.*, to_jsonb(e.*) exam, to_jsonb(c.*) class FROM exam_answers ea 
			INNER JOIN exams e ON ea.id_exm=e.id_exm 
			INNER JOIN classes c ON e.code_class=c.code_class 
			WHERE ea.id_exm_ans=$1`,
			values: [id_exm_ans]
		}
		let { rows: examAnsData } = await querySync(sql);
		
		const policy = policyFor(req.user);
		let subjectExam = subject('Exam_answer',{user_id: examAnsData[0]?.class.teacher});
		
		if(!policy.can('readsingle',subjectExam)){
			
			subjectExam = subject('Exam_answer',{user_id: examAnsData[0]?.user_id});
			
			if(!policy.can('readsingle',subjectExam)){
				return res.json({
					error: 1,
					message: "You're not allowed to get this exam answer"
				})
			}
		}
		
		req.data = examAnsData;
		next();
		
	}catch(err){
		next(err)
	}
}

const isIntMessage = "Input must be a integer";
const noEmptyMsg = 'This field must be filled';
const lengthMsg = "mustn't be more than 3 digits ";
const floatMsg = "mustn't be less than 100";

const addValid = [
	body('id_exm').notEmpty().bail().withMessage(noEmptyMsg).isInt().bail().withMessage(isIntMessage).custom(isMine),
	body('content').notEmpty().bail().withMessage(noEmptyMsg)
]
const rateValid = [
	body('score').notEmpty().bail().withMessage(noEmptyMsg).isFloat({max: 100}).withMessage(floatMsg)
]

module.exports = {
	addValid,
	rateValid,
	singleExmAnswerAuthor
}

async function isMine(id_exm, { req }){
	
	// is it mine? and checking deadline
	const sql = {
		text: ' SELECT e.* FROM exams e WHERE id_exm = $1 AND EXISTS (SELECT * FROM class_students cs WHERE cs.class = e.code_class AND user_id = $2)',
		values: [id_exm, req.user.user_id]
	}
	
	const { rows: examData, rowCount } = await querySync(sql);
	
	if(rowCount){
		
		const duration = parseInt(examData[0].duration);
		
		if(duration){
			
			//convert the raw duration value to current time
			const deadline = (new Date(examData[0].schedule)).getTime() + duration;
			
			if(Date.now() > deadline){
				//this code is to send a error to the ctrler and thrown there. if thrown here, will be error field, i won't wan that way to happen
				req.errorFromBody = {
					message: "You can't answer the exam since the time enters the deadline",
					status: 200
				}
			}
		}
		
		return true
	}
	
	return Promise.reject("Id exam isn't found");
	
}