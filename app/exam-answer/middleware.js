const policyFor = require('../policy');
const { querySync } = require('../../services/query');
const { subject } = require('@casl/ability');

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

module.exports = {
	singleExmAnswerAuthor
}