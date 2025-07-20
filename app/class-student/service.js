const class_students = require('../../services/table')('class_students');

const { querySync } = require('../../services/query');
const validateBody = require('../utils/validateBody');
const filterData = require('../utils/filterData');

const singleAuthorization = require('../../services/singleAuthorization');

const studentColNames = ['class', 'user_id'];


async function teacherAuthor(id_class_student, req, cb){
	
	const sql = {
		text: `SELECT c.teacher FROM class_students cs
				INNER JOIN classes c ON cs.class = c.code_class 
				WHERE cs.id_class_student = $1`,
		values: [id_class_student]
	}
	
	let { rows: teacherData } = await querySync(sql);
	
	return singleAuthorization('Student', req.user, teacherData[0] || {}, cb);
}

async function teacherAuthor(id_class_student, req, cb){
	
	const sql = {
		text: `SELECT * FROM class_students cs
				INNER JOIN users u ON cs.user_id = u.user_id 
				WHERE cs.id_class_student = $1`,
		values: [id_class_student]
	}
	
	const { rows: studentData } = await querySync(sql);
	
	return singleAuthorization('Student', req.user, studentData[0] || {}, cb);
}

async function add(req){
	
	//validating body..
	validateBody(req, 'Insert');
	
	req.body.user_id = req.user?.user_id;
	
	const inputData = filterData(studentColNames, req.body);
	
	return await class_students.insert(inputData);
	
}

function get(user_id){
	
	query = {
		text: 'SELECT cs.id_class_student, c.*, u.user_id uId, u.name uName, u.email uEmail, u.gender uGender, u.photo uPhoto, t.user_id tId, t.name tName, t.email tEmail, t.gender tGender, t.photo tPhoto FROM class_students cs INNER JOIN classes c ON class = code_class INNER JOIN users u ON cs.user_id = u.user_id INNER JOIN users t ON c.teacher = t.user_id WHERE cs.user_id = $1',
		values: [user_id]
	}
	
	return querySync(query);
}

async function getByClass(req, isTeacher){
	
		const code_class = parseInt(req.params.code_class) || undefined
		
		let sqlResult = {
			text: 'SELECT class_students.*, classes.*, users.name , email, gender, photo  FROM class_students INNER JOIN users ON user_id INNER JOIN classes ON class = code_class WHERE class = $1',
			values: [code_class]
		}
		
		if(!isTeacher){
			sqlResult.text += 'AND cs.user_id != $2';
			sqlResult.values.push(req.user.user_id)
		}
		
		return await querySync(sqlResult);
			
}

async function unenroll(id_class_student){
		
	const sql = {
		text: 'DELETE FROM class_students WHERE id_class_student = $1',
		values: [id_class_student]
	}
	
	return await querySync(sql);
}

module.exports = { add, get, getByClass, unenroll };
