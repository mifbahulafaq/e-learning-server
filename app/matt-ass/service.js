const { validationResult } = require('express-validator');
const path = require('path');
const fs = require('fs');
const config = require('../../config');

const matt_ass = require('../../services/table')('matt_ass');
const matters = require('../../services/table')('matters');
const fileService = require('../../services/file');
const { querySync } = require('../../services/query');
const singleAuthorization = require('../../services/singleAuthorization');

const filterData = require('../utils/filterData');
const toSqlArray = require('../utils/toSqlArray');
const appError = require('../utils/appError');
const validateBody = require('../utils/validateBody');

const mattAssColNames = ['duration', 'title', 'text', 'id_matt', 'attachment'];

async function teacherAuthor(id_matt_ass, req, cb){
	
	let sql ={
			
		text: 'SELECT c.teacher FROM matt_ass ma INNER JOIN matters m ON ma.id_matt = m.id_matter INNER JOIN classes c ON m.class = c.code_class WHERE ma.id_matt_ass = $1',
		values: [id_matt_ass]
	} 

	const { rows: teacherData } =  await querySync(sql);
	
	return singleAuthorization('Matt_ass', req.user, teacherData[0] || {}, cb);
	
}

async function studentAuthor(id_matt_ass, req, cb){
	
	let sql = {
		text: 'SELECT cs.* FROM matt_ass ma INNER JOIN matters m ON ma.id_matt = m.id_matter INNER JOIN class_students cs ON m.class = cs.class WHERE ma.id_matt_ass = $1 AND cs.user_id = $2',
		values: [id_matt_ass, req.user?.user_id]
	}
	
	const { rows: studentData } =  await querySync(sql);
	
	return singleAuthorization('Matt_ass', req.user, studentData[0] || {}, cb);
}

async function get(qs, user_id){
	
		let { by, status, class: aClass = "", skip, limit = 10} = qs
		
		let filter = {
			status: "",
			class: ""
		}
		
		//set sql filter
		//filter aClass
		filter.class = parseInt(aClass)?`AND m.class = ${parseInt(aClass)}`:""
		//filter statuts
		switch(status){
			case "none":
				filter.status = "AND ma.id_matt_ass NOT IN (SELECT id_matt_ass FROM ass_answers WHERE user_id = $1) AND ( now() <= ma.date + concat(ma.duration, ' M')::interval OR ma.duration = 0 )"
				break;
			case "done":
				filter.status = "AND ma.id_matt_ass IN (SELECT id_matt_ass FROM ass_answers WHERE user_id = $1)"
				break;
			case "expired":
				filter.status = "AND ma.id_matt_ass NOT IN (SELECT id_matt_ass FROM ass_answers WHERE user_id = $1) AND ma.duration != 0 AND now() > ma.date + concat(ma.duration, ' M')::interval"
			break;
		}
		
		const number_of_answers = '(SELECT count(*) FROM ass_answers WHERE id_matt_ass = ma.id_matt_ass)'
		//get the main data and authorize
		let sql_by_student = {
			text: `SELECT ma.*, to_jsonb(m.*) matter, to_jsonb(c.*) class FROM matt_ass ma
				   INNER JOIN matters m ON ma.id_matt = m.id_matter AND m.schedule <= now()
				   INNER JOIN classes c ON m.class = c.code_class
				   WHERE c.code_class IN (SELECT class FROM class_students WHERE "user" = $1) ${filter.status} ${filter.class}
				   ORDER BY ma.date DESC LIMIT $2 OFFSET $3`,
			values: [user_id, limit, skip]
		}
		let sql_student_count = {
			text: `SELECT * FROM matt_ass ma
				   INNER JOIN matters m ON ma.id_matt = m.id_matter AND m.schedule <= now()
				   INNER JOIN classes c ON m.class = c.code_class
				   WHERE c.code_class IN (SELECT class FROM class_students WHERE "user" = $1) ${filter.status} ${filter.class}`,
			values: [user_id]
		}
		
		let sql_by_teacher = {
			text: `SELECT ma.*, to_jsonb(m.*) matter, to_jsonb(c.*) class, ${number_of_answers} total_answers FROM matt_ass ma
				   INNER JOIN matters m ON ma.id_matt = m.id_matter
				   INNER JOIN classes c ON m.class = c.code_class
				   WHERE c.teacher = $1 ${filter.class}
				   ORDER BY ma.date DESC LIMIT $2 OFFSET $3`,
			values: [user_id, limit, skip]
		}
		let sql_teacher_count = {
			text: `SELECT * FROM matt_ass ma
				   INNER JOIN matters m ON ma.id_matt = m.id_matter
				   INNER JOIN classes c ON m.class = c.code_class
				   WHERE c.teacher = $1 ${filter.class}`,
			values: [user_id]
		}
		
		let resultByStudent = {}
		let byStudentCount = {}
		let resultByTeacher = {}
		let byTeacherCount = {}
		
		switch(by){
			case "student":
			
				resultByStudent = await querySync(sql_by_student)
				byStudentCount = await querySync(sql_student_count)
				
				return {
					data: resultByStudent.rows,
					rowCount: byStudentCount.rowCount 
				}
			
			case "teacher":
			
				resultByTeacher = await querySync(sql_by_teacher)
				byTeacherCount = await querySync(sql_teacher_count)
				return {
					data: resultByTeacher.rows,
					rowCount: byTeacherCount.rowCount 
				}
			default:
				resultByStudent = await querySync(sql_by_student)
				byStudentCount = await querySync(sql_student_count)
				resultByTeacher = await querySync(sql_by_teacher)
				byTeacherCount = await querySync(sql_teacher_count)
				
				return {
					data: {
						received_assignments: {
							data: resultByStudent.rows,
							count: byStudentCount.rowCount
						},
						created_assignments: {
							data: resultByTeacher.rows,
							count: byTeacherCount.rowCount
						}
					}
				}
				
		}
}
async function findByMatter(req, teacherRole, id_class_student){
	
	const id_matt = parseInt(req.params.id_matt) || undefined;
	const { no_answer } = req.query;
		
	const sqlMattAssGetting = function(){
				
		if(parseInt(no_answer)){
			
			const additionalSql = {
				text: !teacherRole? "WHERE user_id = $2": "",
				values: !teacherRole? [id_matt, id_class_student]: [id_matt]
			}
			return {
				text: `SELECT * FROM matt_ass 
					   WHERE id_matt = $1 AND id_matt_ass NOT IN (SELECT id_matt_ass FROM ass_answers ${additionalSql.text}) AND ( now() <= (date + concat(duration, ' M')::interval) OR duration = 0)
					   ORDER BY date DESC`,
				values: additionalSql.values
			}
		}else{
			
			const additionalSql = {
				text: !teacherRole? "AND user_id = $2": "",
				values: !teacherRole? [id_matt, id_class_student]: [id_matt]
			}
			return {
				text: `SELECT ma.*, (SELECT count(*) FROM ass_answers WHERE id_matt_ass = ma.id_matt_ass ${additionalSql.text}) total_answers FROM matt_ass ma WHERE id_matt = $1
				ORDER BY date DESC`,
				values: additionalSql.values
			}
		}
	}
	
	//getting the schedule of single matter
	const singleMattData = await matters.find({ id_matter: id_matt }).select('schedule').execute();
	const scheduleOfMatter = singleMattData.rows[0]?.schedule? new Date(singleMattData.rows[0]?.schedule): undefined;
	const errMsg = "You can only get the data when the time enters the schedule of the matter " + scheduleOfMatter.toLocaleString("en-US")
	
	//validating schedule...
	if(new Date() < scheduleOfMatter) throw appError(errMsg, 200);
	
	return await querySync(sqlMattAssGetting())
}

async function create(req){
	
	//validating..
	validateBody(req, 'Insert');
	
	let { body, file } = req;
	
	if(file){
		
		let attachment = []
		
		attachment[0] = file.filename
		attachment[1] = file.originalname
		
		body.attachment = toSqlArray(attachment)
	}
	
	const payload = filterData(mattAssColNames, body);
	
	return await matt_ass.insert(payload)
	
}

async function update(id_matter, alldatas){
	
	let { body, files } = alldatas;
	
	if(body.attachment !== undefined){
		
		await fileService.notExistAndRemove(
			'matters',
			{id_matter}, 
			( body.attachment || []).map(e=>e.filename)
		);
	}
	
	/*start setting input data attachment*/
	//body.attachment backup
	let bodyAttachmentBU = body.attachment && (body.attachment || []).map(e=>[e.filename, e.originalname]);
	files = files || [];
	
	body.attachment = body.attachment || [];
	// grouping bodyAttachmenth and files
	const allAttachments = [...body.attachment, ...files].map(e=>[e.filename, e.originalname]);
	/*end setting input data attachment*/
	
	//the beginning of setting matter update
	delete body.attachment;
	const matterUpdate = matters.update(filterData(matterColNames, body), { id_matter });
	
	if(bodyAttachmentBU === undefined){
		matterUpdate.setData(`attachment = attachment || $${matterUpdate.values.length+1}`, toSqlArray(allAttachments));
	}else{
		
		if(files.length){
			matterUpdate.setData(`attachment = $${matterUpdate.values.length+1}`, toSqlArray(allAttachments))
		}else{
			matterUpdate.setData(`attachment = $${matterUpdate.values.length+1}`, toSqlArray(bodyAttachmentBU))
		}
	}
	
	// updating data..
	let resultUpdate = await matterUpdate.execute();
	
	return resultUpdate;
}
async function getSingle(req, isTeacher){
	
	const id_matt_ass = parseInt(req.params.id_matt_ass) || undefined;
	
	let additionalSql = {
		text: "",
		values: [id_matt_ass]
	}
	
	if(!isTeacher){
		additionalSql.text = "AND user_id = $2" 
		additionalSql.values = [id_matt_ass, req.user?.user_id]
	}
	
	let singleReadSql = {
		text: `SELECT m.schedule schedule_of_matter, ma.*, json_build_object('user_id', u.user_id, 'email', u.email, 'gender', u.gender, 'name', u.name, 'photo', u.photo) teacher,
		(SELECT count(*) FROM ass_answers WHERE id_matt_ass = $1 ${additionalSql.text}) total_answers
		FROM matt_ass ma 
			   INNER JOIN matters m ON ma.id_matt = m.id_matter
			   INNER JOIN classes c ON m.class = c.code_class
			   INNER JOIN users u ON c.teacher = u.user_id 
			   WHERE id_matt_ass = $1`,
		values: additionalSql.values
	}
	
	const { rows: data } =  await querySync(singleReadSql);
	
	const scheduleOfMatter = data[0]?.schedule_of_matter? new Date(data[0]?.schedule_of_matter): undefined;
			
	if(new Date() < scheduleOfMatter) {
		throw appError(
			"You can only get the data when the time enters the schedule of the matterial " + scheduleOfMatter.toLocaleString("en-US"), 
			200
		);
	}
			
	return data
	
}

async function getSingleAttachment(req){
	
	
	const id_matt_ass = parseInt(req.params.id_matt_ass) || undefined;
	
	let sql = {
		text: 'SELECT m.schedule schedule_of_matter, ma.* FROM matt_ass ma INNER JOIN matters m ON m.id_matter = ma.id_matt WHERE ma.id_matt_ass = $1 AND $2 = ANY(ma.attachment)',
		values: [id_matt_ass, req.params.filename]
	}
	let { rows: data } = await querySync(sql);
	
	if(data.length){
		
		const scheduleOfMatter = data[0]?.schedule_of_matter? new Date(data[0]?.schedule_of_matter): undefined;
		
		if(new Date() < scheduleOfMatter) {
			throw appError(
				"You can only get the data when the time enters the schedule of the matterial " + scheduleOfMatter.toLocaleString("en-US"), 
				200
			);
		}
		
		const filePath = path.join(config.rootPath, `public/document/${req.params.filename}`);
		
		if(fs.existsSync(filePath)) return `/private/document/${req.user.user_id}/${req.params.filename}`
	}
	
	throw appError("File's not found", 200);
}

async function remove(id_matt_ass){
	
	let resultDeleting = await matt_ass.delete({ id_matt_ass });
	
	if(resultDeleting.rowCount) {
		let filePath = {
			path: path.join(config.rootPath,`public/document/${resultDeleting.rows[0]?.attachment[0]}`)
		}
		
		
		fileService.removeFiles([filePath]);
	}
	
	return resultDeleting;
}

module.exports = {
	teacherAuthor,
	studentAuthor,
	get,
	findByMatter,
	create,
	update,
	getSingle,
	remove,
	getSingleAttachment
}