const { querySync } = require('../../services/query');
const exam_answer_comments = require('../../services/table')('exam_answer_comments');
const singleAuthorization = require('../../services/singleAuthorization');

//utils
const validateBody = require('../utils/validateBody');

async function getByAns(id_exm_ans){
	
	let readSql = {
		text: `SELECT ac.*, jsonb_build_object('name', u.name, 'email', u.email, 'gender', u.gender, 'photo', u.photo) "user", to_jsonb(ea.*) exam_answer FROM exam_answer_comments ac
			   INNER JOIN "users" u ON ac.user_id = u.user_id 
			   INNER JOIN exam_answers ea ON ac.id_exm_ans = ea.id_exm_ans WHERE ac.id_exm_ans = $1 ORDER BY ac.date`,
		values: [id_exm_ans || undefined]
	}
	
	return querySync(readSql);
	
}

async function add(req){

	//validating...
	validateBody(req, 'insert');
	
	let { text, id_exm_ans } = req.body;
	
	const data = { text, id_exm_ans, user_id: req.user.user_id }
	
	//inserting
	return exam_answer_comments.insert(data);
}

module.exports = {
	getByAns,
	add
}