const { querySync } = require('../../services/query');
const { validationResult } = require('express-validator');
const classes = require('../../services/table')('classes');
const class_students = require('../../services/table')('class_students');
const appError = require('../utils/appError');
const path = require('path');
const config = require('../../config');
const { removeFiles } = require('../../services/file');
const singleAuthorization = require('../../services/singleAuthorization');
const filterData = require('../utils/filterData');
const classColumns = ['class_name', 'description', 'color', 'teacher'];

async function teacherAuthor(code_class, req, cb){
	
	let { rows: teacherData } = await classes.find({ code_class }).select('teacher').execute();
	
	return singleAuthorization('Class', req.user, teacherData[0] || {}, cb);
	
}

async function studentAuthor(code_class, req, cb){
	
	const user_id = req.user?.user_id
	
	const { rows: studentData } = await class_students.find({ class: code_class, user_id }).execute();
	
	return singleAuthorization('Class', req.user, studentData[0] || {}, cb);
}

async function get(user_id){
	
	let sql_by_teacher = {
		text: `SELECT c.*, jsonb_build_object('name', u.name, 'email', u.email, 'gender', u.gender, 'photo', u.photo) teacher FROM classes c
			   INNER JOIN users u ON c.teacher = u.user_id
			   WHERE c.teacher = $1`,
		values: [user_id]
	}
	
	return querySync(sql_by_teacher)
	
}

async function getSingle(code_class){
	
	const classSql = {
		text: 'SELECT classes.*, user_id, users.name AS userName, email, gender, photo FROM classes JOIN users ON teacher = user_id WHERE code_class = $1',
		values: [code_class]
	}
	return querySync(classSql)
	
}

async function deleteSingle(code_class){
	
	const getFilesSql = {
		text: `SELECT unnest(string_to_array(attachment[1], '')) FROM exams WHERE code_class = $1
			   UNION
			   SELECT unnest(content[1:][1]) FROM exam_answers ea INNER JOIN exams e ON ea.id_exm = e.id_exm WHERE e.code_class = $1
			   UNION
			   SELECT unnest(attachment[1:][1]) FROM matters WHERE class = $1
			   UNION
			   SELECT unnest(string_to_array(ma.attachment[1], '')) FROM matt_ass ma INNER JOIN matters m ON ma.id_matt = m.id_matter WHERE m.class = $1
			   UNION
			   SELECT unnest(aa.content[1:][1]) FROM ass_answers aa INNER JOIN matt_ass ma ON aa.id_matt_ass = ma.id_matt_ass INNER JOIN matters m ON ma.id_matt = m.id_matter WHERE m.class = $1`,
		values: [code_class]
	}
	
	//getting the documents related to the class and the descendants of the class before deletting the class
	let { rows: filesOfClass } = await querySync(getFilesSql)
	filesOfClass = filesOfClass.map(e=>({path: path.join(config.rootPath, `public/document/${e.unnest}`)}));
	
	//deleting the class...
	result = await classes.delete({ code_class });
	
	//revoming the documents after deleting the class successfully..
	removeFiles(filesOfClass) //removing documents of class
	
	return result
	
}
async function add(req){
	
	const errInsert = validationResult(req);
	let { class_name, description, color } = req.body;
	
	//validating..
	if(!errInsert.isEmpty()){
		
		const err = appError('insert', 200);
		err.field = errInsert.mapped()
		
		throw err;
	}
	
	//inserting new data..
	const payload = filterData(classColumns, {...req.body, teacher: req.user.user_id});
			
	return await classes.insert(payload)
}

async function editSingle(req, code_class){
	
	const errUpdate = validationResult(req);
			
	//validating..
	if(!errUpdate.isEmpty()){
		
		const err = appError('update', 200);
		err.field = errUpdate.mapped()
		
		throw err;
	}
	
	if(!Object.keys(filterData(['description', 'class_name'], req.body)).length){
		throw appError('No data to be upadted', 200)
	}
	// updating data..
	return await classes.update(filterData(['description', 'class_name'], req.body), { code_class }).execute();
}
module.exports = {
	teacherAuthor,
	studentAuthor,
	get,
	getSingle,
	deleteSingle,
	add,
	editSingle,
}