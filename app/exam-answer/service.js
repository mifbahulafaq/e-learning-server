const { querySync } = require('../../services/query');
const exam_answers = require('../../services/table')('exam_answers');
const singleAuthorization = require('../../services/singleAuthorization');

const filterData = require('../utils/filterData');
const toSqlArray = require('../utils/toSqlArray');
const searchFileOfArrays = require('../utils/searchFileOfArrays');
const validateBody = require('../utils/validateBody');
const appError = require('../utils/appError');

async function teacherAuthor(id_exm_ans, req, cb){
	
	const sql = {
		text: 'SELECT teacher FROM exam_answers ea INNER JOIN exams e ON ea.id_exm = e.id_exm INNER JOIN classes c ON e.code_class = c.code_class WHERE ea.id_exm_ans = $1',
		values: [id_exm_ans]
	}
	
	let { rows: teacherData } = await querySync(sql);
	
	return singleAuthorization('Exam', req.user, teacherData[0] || {}, cb);
	
}

async function studentAuthor(id_exm_ans, req, cb){
	
	let { rows: studentData } = await exam_answers.find({ id_exm_ans }).select('user_id').execute();
	
	return singleAuthorization('Exam_answer', req.user, studentData[0] || {}, cb);
}

async function getByExam(req, teacherRole){
	
	const idExm = parseInt(req.params.id_exm) || undefined;
	
	let sql = {
		text: `SELECT ea.*, (SELECT count(*) FROM exam_answer_comments WHERE id_exm_ans = ea.id_exm_ans) total_comments, jsonb_build_object('name', u.name, 'email', u.email, 'gender', u.gender, 'photo', u.photo) "user" FROM exam_answers ea
			   INNER JOIN users u ON ea.user_id=u.user_id
			   WHERE ea.id_exm = $1`,
		values: [idExm || undefined]
	}
	
	if(!teacherRole){
		
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
		
	}
	
	return await querySync(sql);
		
}

async function insert(req){
	
	//validating...
	validateBody(req, 'insert');
	
	if(req.errorFromBody){
		const { message, status } = req.errorFromBody;
		throw appError( message, status );
	}
	
	const { body, file, user } = req;
			
	let { id_exm } = body;
	
	//checking the user's answers
	const where = {
		user_id: user?.user_id,
		id_exm: id_exm
	}
	const getUser = await exam_answers.find(where).execute();
	
	//answer validating..
	if(getUser.rowCount){
		throw appError('The answer has been added', 200);
	}
	
	//preparing inserted data..
	let content = [];
	if(file){
		content[0] = file.filename
		content[1] = file.originalname
	}
	content = toSqlArray(content)
	const data = { content, id_exm, user_id: user?.user_id }
	
	//inserting
	return exam_answers.insert(data);
	
}

async function getSingle(id_exm_ans){
	
	let sql = {
		text: `SELECT ea.*, to_jsonb(e.*) exam, to_jsonb(c.*) class FROM exam_answers ea 
		INNER JOIN exams e ON ea.id_exm=e.id_exm 
		INNER JOIN classes c ON e.code_class=c.code_class 
		WHERE ea.id_exm_ans=$1`,
		values: [id_exm_ans]
	}
	
	return await querySync(sql);
	
}

async function getSingleAttachment(req){
	
	const id_exm_ans = parseInt(req.params.id_exm_ans) || undefined;
	const user_id = req.user.user_id;
	const filename = req.params.filename;
	
	const { rows: singleData } = await this.getSingle(id_exm_ans);
	
	const content = singleData?.[0]?.content? [singleData?.[0]?.content]: null;
	
	await searchFileOfArrays(content, filename);
	
	return `/private/document/${user_id}/${filename}`;
	
}

async function rate(req){
		
	const id_exm_ans = parseInt(req.params.id_exm_ans);
	
	//validating...
	validateBody(req, 'update');
	
	// updating data..
	req.body.rated = true;
	return await exam_answers.update(filterData(['score', 'rated'], req.body), { id_exm_ans }).execute();
	
}

module.exports = {
	getSingleAttachment,
	teacherAuthor,
	studentAuthor,
	getSingle,
	getByExam,
	insert,
	rate
}