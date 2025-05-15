const policyFor = require('../policy');
const { querySync } = require('../../services/query');
const { subject } = require('@casl/ability');
const { body } = require('express-validator');
const matt_ass = require('../../services/table')('matt_ass');

const mattAssService = require('../matt-ass/service');

async function singleAssAnswerAuthor(req, res, next){
	
	const id_ass_ans = parseInt(req.params.id_ass_ans) || undefined;
	
	try{
		//authorize
		let sql = {
			text: `SELECT aa.*, to_jsonb(u.*) user, to_jsonb(ma.*) assignment, c.teacher, m.schedule FROM ass_answers aa 
					INNER JOIN  "users" u ON aa.user_id = u.user_id
					INNER JOIN matt_ass ma ON aa.id_matt_ass = ma.id_matt_ass 
					INNER JOIN matters m ON ma.id_matt = m.id_matter 
					INNER JOIN classes c ON m.class = c.code_class 
					WHERE aa.id_ass_answer=$1`,
			values: [id_ass_ans]
		}
		let { rows: assAnswerData } = await querySync(sql);
		
		const policy = policyFor(req.user);
		let subjectAssAns = subject('Assignment_answer',{user_id: assAnswerData[0]?.teacher});
		
		//checking teacher
		if(!policy.can('readsingle',subjectAssAns)){
			
			subjectAssAns = subject('Assignment_answer',{user_id: assAnswerData[0]?.user_id});
			
			if(!policy.can('readsingle',subjectAssAns)){
				return res.json({
					error: 1,
					message: "You're not allowed to read this single assignment answer"
				})
			}
			
			const scheduleOfMatter = assAnswerData[0]?.schedule? new Date(assAnswerData[0]?.schedule): undefined;
			
			if(new Date() < scheduleOfMatter){
				return res.json({
					error: 1,
					message: "You can only get the data when the time enters the schedule of the material " + scheduleOfMatter.toLocaleString("en-US")
				})
			}
		}
		
		req.data = assAnswerData;
		next();

	}catch(err){
	
		next(err)
	}
}

const isIntMessage = "Input must be a integer";
const noEmptyMsg = 'This field must be filled';

const addValid = [
	body('id_matt_ass').notEmpty().bail().withMessage(noEmptyMsg).isInt().bail().withMessage(isIntMessage).custom(isMine),
	body('content').notEmpty().bail().withMessage(noEmptyMsg)
]

module.exports = {
	singleAssAnswerAuthor,
	addValid
}

async function isMine(id_matt_ass, { req }){
	
	return await mattAssService.studentAuthor(id_matt_ass, req, (studentData, err)=>{
		
		if(err) return Promise.reject("Id assignment isn't found");
		
		req.studentData = studentData;
		return true
			
	});
	
}