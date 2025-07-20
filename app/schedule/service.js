const { querySync } = require('../../services/query');
const { validationResult } = require('express-validator');
const policyFor = require('../policy');
const { subject } = require('@casl/ability');

//utils
const validateBody = require('../utils/validateBody');
const isDate = require('../utils/isDate');

async function teacherAuthor(id_exm, req, cb){
	
	const sql = {
		text: 'SELECT teacher FROM exams e INNER JOIN classes c ON e.code_class = c.code_class WHERE e.id_exm = $1',
		values: [id_exm]
	}
	
	let { rows: teacherData } = await querySync(sql);
	
	return singleAuthorization('Exam', req.user, teacherData[0] || {}, cb);
	
}

async function studentAuthor(id_exm, req, cb){
	
	const user_id = req.user.user_id
	
	const sql = {
		text: 'SELECT cs.* FROM exams e INNER JOIN class_students cs ON e.code_class = cs.class WHERE e.id_exm = $1 AND cs.user_id = $2',
		values: [id_exm, user_id]
	}
	
	const { rows: studentData } = await querySync(sql);
	
	return singleAuthorization('Exam', req.user, studentData[0] || {}, cb);
}

async function add(){
	
	const { schedules, code_class} = req.body;
		
	//validating..
	validateBody(req, 'Insert');
	
	//set multiple insert
	let length = 3;
	let strVal = '($1, $2, $3)';
	schedules.forEach((e,iP)=>{
		if(iP>0){
			strVal += `, ($${length+1}, $${length+2}, $${length+3})`;
			length += 3;
		}
	})
	
	let sql = {
		text : `INSERT INTO schedules(day, time, code_class) VALUES${strVal} ON CONFLICT ON CONSTRAINT unique_schedules DO NOTHING RETURNING *`,
		values : []
	}
	schedules.forEach(e=>sql.values = [...sql.values, e.day, e.time, code_class]);
	
	const result = await querySync(sql);
}

module.exports = {
	getSingleAttachment,
	teacherAuthor,
	studentAuthor,
	add,