const path = require('path');
const config = require('../../config');
const { querySync } = require('../../services/query');

const fileService = require('../../services/file');
const exams = require('../../services/table')('exams');
const singleAuthorization = require('../../services/singleAuthorization');

const filterData = require('../utils/filterData');
const toSqlArray = require('../utils/toSqlArray');
const searchFileOfArrays = require('../utils/searchFileOfArrays');
const validateBody = require('../utils/validateBody')

const examColNames = ['code_class', 'text', 'duration', 'schedule', 'attachment'];

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

async function getByClass(req, teacherRole){
	
	const code_class = parseInt(req.params.code_class) || undefined ;
	let qs = req.query;
		
	const additionalSql = {
			text: !teacherRole? "AND user_id = $2": "",
			values: !teacherRole? [code_class, req.user?.user_id]: [code_class]
	}
	
	const csSql = 'AND schedule > NOW() ORDER BY schedule ASC LIMIT 1'
	// const latestSql = `
		// ORDER BY
		// CASE WHEN schedule < NOW() THEN ROW_NUMBER() OVER() + COUNT(*) OVER()
			
			 // ELSE ROW_NUMBER() OVER()
		// END
		// ASC`
	
	const latestSql = `
		ORDER BY
		CASE WHEN schedule < NOW() THEN CAST(CEIL(EXTRACT(EPOCH FROM NOW())) || '0' AS NUMERIC) - CEIL(EXTRACT(EPOCH FROM schedule))
			
			 ELSE CEIL(EXTRACT(EPOCH FROM schedule))
		END
		ASC`
	
	if(parseInt(qs.cs)) delete qs.latest //cs (coming soon / latest data)
	const sql = {
		text: `SELECT e.*, c.class_name, c.description class_description, c.teacher, t.name teacher_name, t.email teacher_email, t.gender teacher_gender, t.photo teacher_photo, (SELECT count(*) FROM exam_answers WHERE id_exm = e.id_exm ${additionalSql.text}) total_answers FROM exams e INNER JOIN classes c ON e.code_class=c.code_class INNER JOIN users t ON c.teacher = t.user_id WHERE e.code_class = $1 ${parseInt(qs.cs)? csSql: ''} ${ parseInt(qs.latest)?latestSql:''}`,
		values: additionalSql.values
	}
	
	return querySync(sql);
		
}

async function update(id_exm, req){
	
	//validating...
	validateBody(req, 'update');
	
	let { file, body } = req;
	
	if(file){
		
		body.attachment = toSqlArray([
			file.filename,
			file.originalname
		]);
		
	}else if(body.attachment !== null){
		delete body.attachment;
	}
	
	if(body.attachment !== undefined){
		const removedFiles = await fileService.notExistAndRemove(
			'exams', 
			{id_exm}
		); 
	}
	
	const updatedCols = [...examColNames];
	updatedCols.shift()//sift method, to remove first index. in this case, code_class
	
	const updatedDatas = filterData(updatedCols, body);
	//updating data
	return exams.update(updatedDatas, { id_exm }).execute();
	
}

async function insert(req){
	
	//validating...
	validateBody(req, 'insert');
	
	const { file, body } = req;
	
	if(file){
		body.attachment = toSqlArray([
			file.filename,
			file.originalname
		])
	}
	
	const inputData = filterData(examColNames, body);
	
	return exams.insert(inputData);
	
}

async function getSingle(id_exm){
	
	const query = {
		text: 'SELECT e.*, c.class_name, c.description class_description, c.teacher, t.name teacher_name, t.email teacher_email, t.gender teacher_gender, t.photo teacher_photo FROM exams e INNER JOIN classes c ON e.code_class=c.code_class INNER JOIN users t ON c.teacher = t.user_id WHERE id_exm = $1',
		values: [id_exm]
	}
	return querySync(query);
	
}

async function getSingleAttachment(req){
	
	const id_exm = parseInt(req.params.id_exm) || undefined;
	const user_id = req.user.user_id;
	const filename = req.params.filename;
	
	const { rows: singleExam } = await this.getSingle(id_exm);
	
	const attachment = singleExam?.[0]?.attachment? [singleExam?.[0]?.attachment]: null;
	
	await searchFileOfArrays(attachment, filename);
	
	return `/private/document/${user_id}/${filename}`;
	
}

async function remove(id_exm){
	
	//deleting..
	let resultDelete = await exams.delete({ id_exm });
	
	if(resultDelete.rowCount) {
		let removedFiles = [{path: path.join(config.rootPath,`public/document/${resultDelete.rows[0]?.attachment[0]}`)}];
		fileService.removeFiles(removedFiles);
	}
			
	return resultDelete;
}

module.exports = {
	getSingleAttachment,
	teacherAuthor,
	studentAuthor,
	getSingle,
	getByClass,
	update,
	insert,
	remove
}